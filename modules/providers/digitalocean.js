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

exports.create = function (args, callback) {
  args['ssh-pub-key'] = utils.normalizeKeyPath(args['ssh-pub-key'], 'overcast.key.pub');

  exports.normalizeAndFindPropertiesForCreate(args, function () {
    exports.getOrCreateOvercastKeyID(args['ssh-pub-key'], function (keyID) {
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

exports.createRequest = function (args, query, callback) {
  exports.request({
    endpoint: 'droplets/new',
    query: query,
    callback: function (result) {
      if (result && result.droplet && result.droplet.event_id) {
        waitForEventToFinish(result.droplet.event_id, function () {
          exports.getInstance(result.droplet.id, function (droplet) {
            var response = {
              name: droplet.name,
              ip: droplet.ip_address,
              ssh_key: args['ssh-key'] || 'overcast.key',
              ssh_port: args['ssh-port'] || '22',
              user: 'root',
              digitalocean: droplet
            };

            if (_.isFunction(callback)) {
              callback(response);
            }
          });
        });
      }
    }
  });
};

exports.destroy = function (instance, callback) {
  if (exports.handleMetadataNotFound(instance)) {
    return false;
  }

  exports.request({
    endpoint: 'droplets/' + instance.digitalocean.id + '/destroy',
    query: { scrub_data: 1 },
    callback: callback
  });
};

exports.boot = function (instance, callback) {
  if (exports.handleMetadataNotFound(instance)) {
    return false;
  }

  exports.eventedRequest({
    endpoint: 'droplets/' + instance.digitalocean.id + '/power_on',
    callback: callback
  });
};

exports.shutdown = function (instance, callback) {
  if (exports.handleMetadataNotFound(instance)) {
    return false;
  }

  exports.eventedRequest({
    endpoint: 'droplets/' + instance.digitalocean.id + '/power_off',
    callback: callback
  });
};

exports.snapshot = function (instance, snapshotName, callback) {
  if (exports.handleMetadataNotFound(instance)) {
    return false;
  }

  exports.shutdown(instance, function () {
    exports.eventedRequest({
      endpoint: 'droplets/' + instance.digitalocean.id + '/snapshot',
      query: { name: snapshotName },
      callback: callback
    });
  });
};

exports.reboot = function (instance, callback) {
  if (exports.handleMetadataNotFound(instance)) {
    return false;
  }

  exports.eventedRequest({
    endpoint: 'droplets/' + instance.digitalocean.id + '/reboot',
    callback: callback
  });
};

exports.rebuild = function (instance, image, callback) {
  if (exports.handleMetadataNotFound(instance)) {
    return false;
  }

  exports.getImages(function (images) {
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

exports.resize = function (instance, size, callback) {
  if (exports.handleMetadataNotFound(instance)) {
    return false;
  }

  exports.getSizes(function (sizes) {
    var match = getMatching(sizes, size);
    if (!match) {
      return utils.die('No size found that matches "' + size + '".');
    }

    exports.shutdown(instance, function () {
      exports.eventedRequest({
        endpoint: 'droplets/' + instance.digitalocean.id + '/resize',
        query: { size_id: match.id },
        callback: callback
      });
    });
  });
};

exports.getKeys = function (callback) {
  exports.request({
    endpoint: 'ssh_keys',
    callback: function (result) {
      if (result && result.ssh_keys) {
        callback(result.ssh_keys);
      }
    }
  });
};

exports.createKey = function (keyData, callback) {
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

exports.getImages = function (callback) {
  exports.request({
    endpoint: 'images',
    callback: function (result) {
      if (result && result.images) {
        callback(exports.returnOnlyIDNameSlug(result.images));
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
        callback(exports.returnOnlyIDNameSlug(result.images));
      }
    }
  });
};

exports.getInstances = function (args, callback) {
  exports.request({
    endpoint: 'droplets',
    callback: function (result) {
      if (result && result.droplets) {
        callback(result.droplets);
      }
    }
  });
};

exports.getInstance = function (instance, callback) {
  // Intentionally not guarding against missing metadata here
  // exports.create passes in an id, since instance doesn't exist yet.
  var id = _.isPlainObject(instance) && instance.digitalocean && instance.digitalocean.id ?
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

exports.updateInstanceMetadata = function (instance, callback) {
  // Intentionally not guarding against missing metadata here
  // user might be trying to sync instance metadata.
  exports.getInstance(instance, function (droplet) {
    utils.updateInstance(instance.name, {
      ip: droplet.ip_address,
      digitalocean: droplet
    });

    if (_.isFunction(callback)) {
      callback();
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

exports.sync = function (instance, callback) {
  // Intentionally not guarding against missing metadata here.

  exports.getInstances(function (instances) {
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

    if (_.isFunction(callback)) {
      callback(match);
    }
  });
};

// Internal functions

exports.returnOnlyIDNameSlug = function (collection) {
  return _.map(collection, function (obj) {
    return {
      id: obj.id,
      name: obj.name,
      slug: obj.slug
    };
  });
};

exports.handleMetadataNotFound = function (instance) {
  if (!instance || !instance.digitalocean) {
    utils.red('This instance has no DigitalOcean metadata attached.');
    utils.red('Run this command and then try again:');
    utils.die('overcast digitalocean sync "' + instance.name + '"');
    return true;
  }
};

exports.getOrCreateOvercastKeyID = function (pubKeyPath, callback) {
  var keyData = fs.readFileSync(pubKeyPath, 'utf8') + '';

  exports.getKeys(function (keys) {
    var key = _.find(keys, {
      name: utils.createHashedKeyName(keyData)
    });
    if (key) {
      utils.grey('Using SSH key: ' + pubKeyPath);
      callback(key.id);
    } else {
      utils.grey('Uploading new SSH key: ' + pubKeyPath);
      exports.createKey(keyData, function (key) {
        callback(key.id);
      });
    }
  });
};

exports.normalizeAndFindPropertiesForCreate = function (args, callback) {
  args.image = args.image || args['image-id'] || args['image-slug'] || args['image-name'] || 'ubuntu-14-04-x64';
  args.size = args.size || args['size-id'] || args['size-slug'] || args['size-name'] || '512mb';
  args.region = args.region || args['region-id'] || args['region-slug'] || args['region-name'] || 'nyc3';

  exports.getImages(function (images) {
    var matchingImage = getMatching(images, args.image);
    if (!matchingImage) {
      return utils.die('No image found that matches "' + args.image + '".');
    }
    exports.getSizes(function (sizes) {
      var matchingSize = getMatching(sizes, args.size);
      if (!matchingSize) {
        return utils.die('No size found that matches "' + args.size + '".');
      }
      exports.getRegions(function (regions) {
        var matchingRegion = getMatching(regions, args.region);
        if (!matchingRegion) {
          return utils.die('No region found that matches "' + args.region + '".');
        }

        _.each(['image', 'image-id', 'image-slug', 'image-name', 'size', 'size-id',
          'size-slug', 'size-name', 'region', 'region-id', 'region-slug', 'region-name'], function (key) {
          delete args[key];
        });

        args['image-id'] = matchingImage.id;
        args['size-id'] = matchingSize.id;
        args['region-id'] = matchingRegion.id;

        if (_.isFunction(callback)) {
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

  var eventTimeout = setTimeout(function () {
    utils.red('This event has not finished in ' + EVENT_TIMEOUT_NAME + ', assuming it finished successfully...');
    percentage = 100;
  }, EVENT_TIMEOUT);

  utils.progressBar(function () {
    return percentage;
  }, function () {
    clearTimeout(eventTimeout);
    if (_.isFunction(callback)) {
      callback(response);
    }
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

  curl.stdout.on('data', function (data) {
    stdout += data;
  });

  curl.stderr.on('data', function (data) {
    stderr += data;
  });

  curl.on('close', function (code) {
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
      if (_.isFunction(options.onError)) {
        options.onError(stdout);
      }
      utils.die('Error response from API: ' + stdout.error_message);
    } else if (stdout && stdout.status && stdout.status === 'OK') {
      if (_.isFunction(options.callback)) {
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
