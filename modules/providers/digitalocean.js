var fs = require('fs');
var querystring = require('querystring');
var cp = require('child_process');
var _ = require('lodash');
var utils = require('../utils');

var API_URL = 'https://api.digitalocean.com/';
var EVENT_TIMEOUT = 1000 * 60 * 10;
var EVENT_TIMEOUT_NAME = 'ten minutes';

exports.DEBUG = false;
exports.id = 'digitalocean';
exports.name = 'DigitalOcean';

// Provider interface

exports.create = (args, callback) => {
  args['ssh-pub-key'] = utils.normalizeKeyPath(args['ssh-pub-key'], 'overcast.key.pub');

  exports.normalizeAndFindPropertiesForCreate(args, () => {
    exports.getOrCreateOvercastKeyID(args['ssh-pub-key'], keyID => {
      var query = {
        backups_enabled: utils.argIsTruthy(args['backups-enabled']),
        name: args.name,
        private_networking: utils.argIsTruthy(args['private-networking']),
        ssh_key_ids: keyID,
        image_id: args['image-id'],
        size_id: args['size-id'],
        region_id: args['region-id']
      };

      exports.createRequest(args, query, callback);
    });
  });
};

exports.createRequest = (args, query, callback) => {
  exports.request({
    endpoint: 'droplets/new',
    query: query,
    callback: function (result) {
      if (result && result.droplet && result.droplet.event_id) {
        waitForEventToFinish(result.droplet.event_id, () => {
          exports.getInstance(result.droplet.id, droplet => {
            var response = {
              name: droplet.name,
              ip: droplet.ip_address,
              ssh_key: args['ssh-key'] || 'overcast.key',
              ssh_port: args['ssh-port'] || '22',
              user: 'root',
              digitalocean: droplet
            };

            if (utils.isFunction(callback)) {
              callback(response);
            }
          });
        });
      }
    }
  });
};

exports.destroy = (instance, callback) => {
  exports.request({
    endpoint: 'droplets/' + instance.digitalocean.id + '/destroy',
    query: { scrub_data: 1 },
    callback: callback
  });
};

exports.boot = (instance, callback) => {
  exports.eventedRequest({
    endpoint: 'droplets/' + instance.digitalocean.id + '/power_on',
    callback: callback
  });
};

exports.shutdown = (instance, callback) => {
  exports.eventedRequest({
    endpoint: 'droplets/' + instance.digitalocean.id + '/power_off',
    callback: callback
  });
};

exports.snapshot = (instance, snapshotName, callback) => {
  exports.shutdown(instance, () => {
    exports.eventedRequest({
      endpoint: 'droplets/' + instance.digitalocean.id + '/snapshot',
      query: { name: snapshotName },
      callback: callback
    });
  });
};

exports.reboot = (instance, callback) => {
  exports.eventedRequest({
    endpoint: 'droplets/' + instance.digitalocean.id + '/reboot',
    callback: callback
  });
};

exports.rebuild = (instance, image, callback) => {
  exports.getImages(images => {
    var match = getMatching(images, image);
    if (!match) {
      return utils.die('No image found that matches "' + image + '".');
    }

    exports.eventedRequest({
      endpoint: 'droplets/' + instance.digitalocean.id + '/rebuild',
      query: { image_id: match.id },
      callback: callback
    });
  });
};

exports.resize = (instance, size, callback) => {
  exports.getSizes(sizes => {
    var match = getMatching(sizes, size);
    if (!match) {
      return utils.die('No size found that matches "' + size + '".');
    }

    exports.shutdown(instance, () => {
      exports.eventedRequest({
        endpoint: 'droplets/' + instance.digitalocean.id + '/resize',
        query: { size_id: match.id },
        callback: callback
      });
    });
  });
};

exports.getKeys = callback => {
  exports.request({
    endpoint: 'ssh_keys',
    callback: function (result) {
      if (result && result.ssh_keys) {
        callback(result.ssh_keys);
      }
    }
  });
};

exports.createKey = (keyData, callback) => {
  exports.request({
    endpoint: 'ssh_keys/new',
    query: {
      name: utils.createHashedKeyName(keyData),
      ssh_pub_key: keyData + ''
    },
    callback: function (result) {
      if (result && result.ssh_key) {
        callback(result.ssh_key);
      }
    }
  });
};

exports.getImages = callback => {
  exports.request({
    endpoint: 'images',
    callback: function (result) {
      if (result && result.images) {
        callback(returnOnlyIDNameSlug(result.images));
      }
    }
  });
};

exports.getSnapshots = callback => {
  exports.request({
    endpoint: 'images',
    query: { filter: 'my_images' },
    callback: function (result) {
      if (result && result.images) {
        callback(returnOnlyIDNameSlug(result.images));
      }
    }
  });
};

exports.getInstances = (args, callback) => {
  exports.request({
    endpoint: 'droplets',
    callback: function (result) {
      if (result && result.droplets) {
        callback(result.droplets);
      }
    }
  });
};

exports.getInstance = (instance, callback) => {
  // exports.create passes in an id, since instance doesn't exist yet.
  var id = utils.isObject(instance) && instance.digitalocean && instance.digitalocean.id ?
    instance.digitalocean.id : instance;

  exports.request({
    endpoint: 'droplets/' + id,
    callback: function (result) {
      if (result && result.droplet) {
        callback(result.droplet);
      }
    }
  });
};

exports.updateInstanceMetadata = (instance, callback) => {
  exports.getInstance(instance, droplet => {
    utils.updateInstance(instance.name, {
      ip: droplet.ip_address,
      digitalocean: droplet
    });

    if (utils.isFunction(callback)) {
      callback();
    }
  });
};

exports.getRegions = callback => {
  exports.request({
    endpoint: 'regions',
    callback: function (result) {
      if (result && result.regions) {
        callback(result.regions);
      }
    }
  });
};

exports.getSizes = callback => {
  exports.request({
    endpoint: 'sizes',
    callback: function (result) {
      if (result && result.sizes) {
        callback(result.sizes);
      }
    }
  });
};

exports.sync = (instance, callback) => {
  exports.getInstances((instances) => {
    var match = utils.findUsingMultipleKeys(instances, instance.name, ['name']);

    if (!match) {
      match = utils.findUsingMultipleKeys(instances, instance.ip, ['ip_address']);

      if (!match) {
        return utils.die('No instance found in your account matching this name or IP address.');
      }
    }

    utils.updateInstance(match.name, {
      ip: match.ip_address,
      digitalocean: match
    });

    if (utils.isFunction(callback)) {
      callback(match);
    }
  });
};

// Internal functions

function returnOnlyIDNameSlug(collection) {
  return collection.map((obj) => {
    return {
      id: obj.id,
      name: obj.name,
      slug: obj.slug
    };
  });
};

exports.getOrCreateOvercastKeyID = (pubKeyPath, callback) => {
  var keyData = fs.readFileSync(pubKeyPath, 'utf8') + '';

  exports.getKeys((keys) => {
    var key = _.find(keys, {
      name: utils.createHashedKeyName(keyData)
    });
    if (key) {
      utils.grey('Using SSH key: ' + pubKeyPath);
      callback(key.id);
    } else {
      utils.grey('Uploading new SSH key: ' + pubKeyPath);
      exports.createKey(keyData, (key) => {
        callback(key.id);
      });
    }
  });
};

exports.normalizeAndFindPropertiesForCreate = (args, callback) => {
  args.image = args.image || args['image-id'] || args['image-slug'] || args['image-name'] || 'ubuntu-14-04-x64';
  args.size = args.size || args['size-id'] || args['size-slug'] || args['size-name'] || '512mb';
  args.region = args.region || args['region-id'] || args['region-slug'] || args['region-name'] || 'nyc3';

  exports.getImages(images => {
    var matchingImage = getMatching(images, args.image);
    if (!matchingImage) {
      return utils.die('No image found that matches "' + args.image + '".');
    }
    exports.getSizes(sizes => {
      var matchingSize = getMatching(sizes, args.size);
      if (!matchingSize) {
        return utils.die('No size found that matches "' + args.size + '".');
      }
      exports.getRegions(regions => {
        var matchingRegion = getMatching(regions, args.region);
        if (!matchingRegion) {
          return utils.die('No region found that matches "' + args.region + '".');
        }

        _.each(['image', 'image-id', 'image-slug', 'image-name', 'size', 'size-id',
          'size-slug', 'size-name', 'region', 'region-id', 'region-slug', 'region-name'], key => {
          delete args[key];
        });

        args['image-id'] = matchingImage.id;
        args['size-id'] = matchingSize.id;
        args['region-id'] = matchingRegion.id;

        if (utils.isFunction(callback)) {
          callback();
        }
      });
    });
  });
};

function getMatching(collection, val) {
  return utils.findUsingMultipleKeys(collection, val, ['id', 'name', 'slug']);
}

function waitForEventToFinish(event_id, callback) {
  var percentage = 0;
  var response = {};

  var eventTimeout = setTimeout(() => {
    utils.red('This event has not finished in ' + EVENT_TIMEOUT_NAME + ', assuming it finished successfully...');
    percentage = 100;
  }, EVENT_TIMEOUT);

  utils.progressBar(() => {
    return percentage;
  }, () => {
    clearTimeout(eventTimeout);
    if (utils.isFunction(callback)) {
      callback(response);
    }
  });

  var requestLoop = () => {
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

exports.eventedRequest = options => {
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
exports.request = options => {
  var variables = utils.getVariables();
  options.query = options.query || {};
  options.query.client_id = variables.DIGITALOCEAN_CLIENT_ID;
  options.query.api_key = variables.DIGITALOCEAN_API_KEY;

  if (!variables.DIGITALOCEAN_CLIENT_ID || !variables.DIGITALOCEAN_API_KEY) {
    utils.red('The variables DIGITALOCEAN_CLIENT_ID and DIGITALOCEAN_API_KEY are not set.');
    utils.red('Go to https://cloud.digitalocean.com/api_access to get these variables,');
    utils.red('then run the following commands:');
    utils.red('overcast var set DIGITALOCEAN_CLIENT_ID [your_client_id]');
    return utils.die('overcast var set DIGITALOCEAN_API_KEY [your_api_key]');
  }

  var args = constructCurlArgs(options);

  if (exports.DEBUG) {
    console.log('curl ' + args.join(' '));
  }

  var curl = cp.spawn('curl', args);
  var stderr = null;
  var stdout = '';

  curl.stdout.on('data', data => {
    stdout += data;
  });

  curl.stderr.on('data', data => {
    stderr += data;
  });

  curl.on('close', code => {
    if (code !== 0) {
      return utils.die('Got a non-zero exit code from DigitalOcean API (' + code + ').');
    }

    try {
      stdout = JSON.parse(stdout);
    } catch (e) {
      return utils.die('Exception thrown while parsing DigitalOcean API output: ' + stdout);
    }

    if (exports.DEBUG) {
      console.log(JSON.stringify(stdout, null, 4));
    }

    if (stdout && stdout.status && stdout.status === 'ERROR') {
      if (utils.isFunction(options.onError)) {
        options.onError(stdout);
      }
      utils.die('Error response from API: ' + stdout.error_message);
    } else if (stdout && stdout.status && stdout.status === 'OK') {
      if (utils.isFunction(options.callback)) {
        options.callback(stdout);
      }
    } else {
      utils.die('Error response from API: ' + stderr);
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
