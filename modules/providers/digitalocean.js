var fs = require('fs');
var querystring = require('querystring');
var _ = require('lodash');
var cp = require('child_process');
var crypto = require('crypto');
var utils = require('../utils');
var instanceCommand = require('../commands/instance');

var API_URL = 'https://api.digitalocean.com/';

var EVENT_TIMEOUT = 1000 * 60 * 10;
var EVENT_TIMEOUT_NAME = 'ten minutes';

exports.debug = false;

exports.getKeys = function (callback) {
  // GET https://api.digitalocean.com/ssh_keys

  exports.request({
    endpoint: 'ssh_keys',
    callback: function (result) {
      if (result && result.ssh_keys) {
        callback(result.ssh_keys);
      }
    }
  });
};

exports.getHashedKeyName = function (pubKey) {
  pubKey = (pubKey || fs.readFileSync(utils.CONFIG_DIR + '/keys/overcast.key.pub', 'utf8')) + '';
  return 'overcast.' + crypto.createHash('md5').update(pubKey).digest('hex');
};

exports.createKey = function (callback) {
  // GET https://api.digitalocean.com/ssh_keys/new
  //   name=[ssh_key_name]
  //   ssh_pub_key=[ssh_public_key]

  var pubKey = fs.readFileSync(utils.CONFIG_DIR + '/keys/overcast.key.pub', 'utf8');
  var hash = crypto.createHash('md5').update(pubKey).digest('hex');

  exports.request({
    endpoint: 'ssh_keys/new',
    query: {
      name: exports.getHashedKeyName(pubKey),
      ssh_pub_key: pubKey + ''
    },
    callback: function (result) {
      if (result && result.ssh_key) {
        utils.grey('Setting DIGITALOCEAN_OVERCAST_KEY_ID to ' + result.ssh_key.id + ' in variables.json.');
        var variables = utils.getVariables();
        variables.DIGITALOCEAN_OVERCAST_KEY_ID = result.ssh_key.id;
        utils.saveVariables(variables);
        callback(result.ssh_key);
      }
    }
  });
};

exports.getImages = function (callback) {
  exports.request({
    endpoint: 'images',
    callback: function (result) {
      if (result && result.images) {
        callback(result.images);
      }
    }
  });
};

exports.getRegions = function (callback) {
  exports.request({
    endpoint: 'regions',
    callback: function (result) {
      if (result && result.regions) {
        callback(result.regions);
      }
    }
  });
};

exports.getSizes = function (callback) {
  exports.request({
    endpoint: 'sizes',
    callback: function (result) {
      if (result && result.sizes) {
        callback(result.sizes);
      }
    }
  });
};

exports.getSnapshots = function (callback) {
  exports.request({
    endpoint: 'images',
    query: { filter: 'my_images' },
    callback: function (result) {
      if (result && result.images) {
        callback(result.images);
      }
    }
  });
};

exports.getDroplet = function (id, callback) {
  // GET https://api.digitalocean.com/droplets/[droplet_id]

  exports.request({
    endpoint: 'droplets/' + id,
    callback: function (result) {
      if (result && result.droplet) {
        callback(result.droplet);
      }
    }
  });
};

exports.getDroplets = function (callback) {
  exports.request({
    endpoint: 'droplets',
    callback: function (result) {
      if (result && result.droplets) {
        callback(result.droplets);
      }
    }
  });
};

exports.create = function (options) {
  // GET https://api.digitalocean.com/droplets/new
  //   name=[droplet_name]
  //   size_slug=[size_slug]
  //   image_slug=[image_slug]
  //   region_slug=[region_slug]
  //   ssh_key_ids=[ssh_key_id1]

  if (options['image-name']) {
    return exports.getImages(function (images) {
      var foundImage = _.find(images, { name: options['image-name'] });
      if (foundImage) {
        delete options['image-name'];
        options['image-id'] = foundImage.id;
        exports.create(options);
      } else {
        utils.die('Image with name "' + options['image-name'] + '" not found, no action taken.');
      }
    });
  }

  if (!options.name) {
    options.name = options.instance;
  }

  var instance = {
    name: options.name || 'overcast.instance.' + _.now(),
    ip: '127.0.0.1',
    ssh_key: options['ssh-key'] || utils.CONFIG_DIR + '/keys/overcast.key',
    ssh_port: options['ssh-port'] || 22,
    user: 'root'
  };

  var clusters = utils.getClusters();
  clusters[options.cluster] = clusters[options.cluster] || { instances: {} };
  clusters[options.cluster].instances[options.name] = instance;
  utils.saveClusters(clusters);

  exports.getOrCreateOvercastKeyID(function (keyID) {
    var query = {
      name: instance.name,
      ssh_key_ids: keyID
    };

    _.each(['size-slug', 'size-id', 'image-slug', 'image-id', 'region-slug', 'region-id'], function (key) {
      if (options[key]) {
        query[key.replace('-', '_')] = options[key];
      }
    });

    _.each({
      size: '512mb',
      image: 'ubuntu-12-04-x64',
      region: 'nyc2'
    }, function (defaultSlug, type) {
      if (!query[type + '_id'] && !query[type + '_slug']) {
        query[type + '_slug'] = defaultSlug;
      }
    });

    exports.request({
      endpoint: 'droplets/new',
      query: query,
      callback: function (result) {
        if (result && result.droplet && result.droplet.event_id) {
          handleCreateResponse(result.droplet);
        }
      }
    });
  });
};

exports.getOrCreateOvercastKeyID = function (callback) {
  var variables = utils.getVariables();

  if (variables.DIGITALOCEAN_OVERCAST_KEY_ID) {
    callback(variables.DIGITALOCEAN_OVERCAST_KEY_ID);
  } else {
    exports.getKeys(function (keys) {
      var key = _.find(keys, {
        name: exports.getHashedKeyName()
      });
      if (key) {
        callback(key.id);
      } else {
        exports.createKey(function (key) {
          callback(key.id);
        });
      }
    });
  }
};

function handleCreateResponse(droplet) {
  utils.grey('Creating droplet ' + droplet.id + ' on DigitalOcean, please wait...');
  waitForEventToFinish(droplet.event_id, function () {
    utils.success('Droplet created!');
    utils.waitForBoot(function () {
      exports.getDroplet(droplet.id, function (droplet) {
        exports.updateInstanceWithDropletInfo(droplet.name, droplet);
        utils.success('Instance "' + droplet.name + '" (' + droplet.ip_address + ') saved.');
      });
    });
  });
}

exports.getDropletInfoByInstanceName = function (name, callback) {
  exports.getDroplets(function (droplets) {
    var foundDroplet = _.find(droplets, { name: name });
    if (foundDroplet && _.isFunction(callback)) {
      callback(foundDroplet);
    } else {
      utils.die('No droplet with name "' + name + '" found. Please check your ' +
        'instance names in your DigitalOcean account');
    }
  });
};

exports.updateInstanceWithDropletInfo = function (name, droplet) {
  utils.updateInstance(droplet.name, {
    ip: droplet.ip_address,
    digitalocean: droplet
  });
};

exports.powerOn = function (instance, callback) {
  // GET https://api.digitalocean.com/droplets/[droplet_id]/power_on

  utils.grey('Powering on "' + instance.name + '", please wait...');
  exports.eventedRequest({
    endpoint: 'droplets/' + instance.digitalocean.id + '/power_on',
    callback: function (eventResult) {
      utils.success('Instance "' + instance.name + '" powered on.');
      utils.waitForBoot(callback);
    }
  });
};

exports.snapshot = function (instance, name, callback) {
  // GET https://api.digitalocean.com/droplets/[droplet_id]/snapshot
  //   name=[snapshot_name]

  exports.shutdown(instance, function () {
    utils.grey('Creating new snapshot "' + name + '" of instance "' + instance.name + '", please wait...');
    exports.eventedRequest({
      endpoint: 'droplets/' + instance.digitalocean.id + '/snapshot',
      query: { name: name },
      callback: function (eventResult) {
        utils.success('Snapshot "' + name + '" created.');
        utils.waitForBoot(callback);
      }
    });
  });
};

exports.rebuild = function (instance, args, callback) {
  // GET https://api.digitalocean.com/droplets/[droplet_id]/rebuild
  //   image_id=[image_id]

  // Handle missing droplet id.
  if (!instance.digitalocean || !instance.digitalocean.id) {
    return exports.getDropletInfoByInstanceName(instance.name, function (droplet) {
      exports.updateInstanceWithDropletInfo(instance.name, droplet);
      instance.digitalocean = droplet;
      exports.rebuild(instance, args, callback);
    });
  }

  // Handle missing image id.
  if (!args['image-id']) {
    return exports.getImages(function (images) {
      var foundImage = args['image-name'] ?
        _.find(images, { name: args['image-name'] }) :
        _.find(images, { slug: args['image-slug'] });

      if (foundImage) {
        args['image-id'] = foundImage.id;
        exports.rebuild(instance, args, callback);
      } else {
        if (args['image-name']) {
          utils.die('Image with name "' + args['image-name'] + '" not found, no action taken.');
        } else if (args['image-slug']) {
          utils.die('Image with slug "' + args['image-slug'] + '" not found, no action taken.');
        }
      }
    });
  }

  utils.grey('Rebuilding "' + instance.name + '" using image "' + args['image-id'] + '", please wait...');
  exports.eventedRequest({
    endpoint: 'droplets/' + instance.digitalocean.id + '/rebuild',
    query: { image_id: args['image-id'] },
    callback: function (eventResult) {
      utils.success('Instance "' + instance.name + '" rebuilt.');
      utils.waitForBoot(callback);
    }
  });
};

exports.reboot = function (instance, callback) {
  // GET https://api.digitalocean.com/droplets/[droplet_id]/reboot

  utils.grey('Rebooting "' + instance.name + '", please wait...');
  exports.eventedRequest({
    endpoint: 'droplets/' + instance.digitalocean.id + '/reboot',
    callback: function (eventResult) {
      utils.success('Instance "' + instance.name + '" rebooted.');
      utils.waitForBoot(callback);
    }
  });
};

exports.resize = function (instance, args, callback) {
  // GET https://api.digitalocean.com/droplets/[droplet_id]/resize/
  //   size_id=[size_id]

  var query = {};
  if (args['size-id']) {
    query.size_id = args['size-id'];
  } else if (args['size-slug']) {
    query.size_slug = args['size-slug'];
  }

  exports.shutdown(instance, function () {
    utils.grey('Resizing "' + instance.name + '", please wait...');
    exports.eventedRequest({
      endpoint: 'droplets/' + instance.digitalocean.id + '/resize',
      query: query,
      callback: function (eventResult) {
        utils.success('Instance "' + instance.name + '" resized.');
        if (args.skipBoot) {
          utils.grey('Skipping droplet boot since --skipBoot flag was used.');
          (callback || _.noop)();
        } else {
          exports.powerOn(instance, callback);
        }
      }
    });
  });
};

exports.shutdown = function (instance, callback) {
  // GET https://api.digitalocean.com/droplets/[droplet_id]/power_off

  utils.grey('Shutting down instance "' + instance.name + '", please wait...');
  exports.eventedRequest({
    endpoint: 'droplets/' + instance.digitalocean.id + '/power_off',
    callback: function (eventResult) {
      utils.success('Instance "' + instance.name + '" has been shut down.');
      (callback || _.noop)();
    }
  });
};

exports.destroy = function (instance, callback) {
  // GET https://api.digitalocean.com/droplets/[droplet_id]/destroy

  utils.grey('Destroying instance "' + instance.name + '", please wait...');
  exports.eventedRequest({
    endpoint: 'droplets/' + instance.digitalocean.id + '/destroy',
    query: {
      scrub_data: false
    },
    callback: function (eventResult) {
      utils.success('Instance "' + instance.name + '" has been destroyed.');
      instanceCommand.run({
        '_': [ 'remove', instance.name ]
      });
      (callback || _.noop)();
    }
  });
};

function waitForEventToFinish(event_id, callback) {
  var percentage = 0;
  var response = {};

  var eventTimeout = setTimeout(function () {
    utils.red('This event has not finished in ' + EVENT_TIMEOUT_NAME + ', assuming it finished successfully...');
    percentage = 100;
  }, EVENT_TIMEOUT);

  utils.progressBar(function () {
    return percentage;
  }, function () {
    clearTimeout(eventTimeout);
    (callback || _.noop)(response);
  });

  var requestLoop = function () {
    exports.request({
      endpoint: 'events/' + event_id,
      callback: function (result) {
        if (result && result.event) {
          percentage = result.event.percentage;
          response = result.event;

          if (result.event.action_status !== 'done') {
            setTimeout(requestLoop, 3000);
          }
        }
      }
    });
  };

  requestLoop();
}

exports.eventedRequest = function (options) {
  exports.request({
    endpoint: options.endpoint,
    query: options.query,
    callback: function (result) {
      if (result && result.event_id) {
        waitForEventToFinish(result.event_id, options.callback);
      }
    }
  });
};

// request({
//   endpoint: 'droplets/new',
//   type: 'GET',
//   query: { client_id: 'abc123', api_key: 'abc123', ... },
//   data: {},
//   callback: function (stderr, stdout) {}
// });
exports.request = function (options) {
  var variables = utils.getVariables();
  options.query = options.query || {};
  options.query.client_id = variables.DIGITALOCEAN_CLIENT_ID;
  options.query.api_key = variables.DIGITALOCEAN_API_KEY;

  if (!variables.DIGITALOCEAN_CLIENT_ID || !variables.DIGITALOCEAN_API_KEY) {
    utils.red('Missing DIGITALOCEAN_CLIENT_ID and DIGITALOCEAN_API_KEY values.');
    utils.red('Please add them to ' + utils.VARIABLES_JSON);
    process.exit(1);
  }

  var args = constructCurlArgs(options);

  if (exports.debug) {
    console.log('curl ' + args.join(' '));
  }

  var curl = cp.spawn('curl', args);
  var stderr = null;
  var stdout = '';

  curl.stdout.on('data', function (data) {
    stdout += data;
  });

  curl.stderr.on('data', function (data) {
    stderr += data;
  });

  curl.on('close', function (code) {
    if (code !== 0) {
      utils.die('Got a non-zero exit code from DigitalOcean API (' + code + ').');
    }

    try {
      stdout = JSON.parse(stdout);
    } catch (e) {
      utils.die('Exception thrown while parsing DigitalOcean API output: ' + stdout);
    }

    if (exports.debug) {
      console.log(JSON.stringify(stdout, null, 4));
    }

    if (_.isFunction(options.callback)) {
      if (stdout && stdout.status && stdout.status === 'ERROR') {
        utils.die('Error response from API: ' + stdout.error_message);
      } else if (stdout && stdout.status === 'OK') {
        options.callback(stdout);
      } else {
        utils.die('Error response from API: ' + stderr);
      }
    }
  });
};

function constructCurlArgs(options) {
  var url = API_URL + options.endpoint + '?' + querystring.stringify(options.query || {});
  var args = ['-s', '-X', options.type || 'GET'];

  if (options.data) {
    args.push('-d', JSON.stringify(options.data));
  }
  args.push(url);

  return args;
}
