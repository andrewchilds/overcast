var fs = require('fs');
var _ = require('lodash');
var utils = require('../utils');
var DigitalOcean = require('overcast-do-wrapper');

exports.API = null;

exports.id = 'digitalocean';
exports.name = 'DigitalOcean';

// Provider interface

exports.create = (args, callback) => {
  args['ssh-pub-key'] = utils.normalizeKeyPath(args['ssh-pub-key'], 'overcast.key.pub');

  exports.normalizeAndFindPropertiesForCreate(args, () => {
    exports.getOrCreateOvercastKeyID(args['ssh-pub-key'], keyID => {
      var query = {
        backups: utils.argIsTruthy(args['backups-enabled']),
        name: args.name,
        private_networking: utils.argIsTruthy(args['private-networking']),
        ssh_keys: [keyID],
        image: args['image-slug'],
        size: args['size-slug'],
        region: args['region-slug']
      };

      exports.createRequest(args, query, callback);
    });
  });
};

exports.createRequest = (args, query, callback) => {
  exports.getAPI().dropletsCreate(query, (err, res, body) => {
    if (err) {
      return utils.die('Got an error from the DigitalOcean API: ' + err);
    }
    if (body && body.droplet) {
      utils.grey('Waiting for instance to be created...');
      exports.waitForActionToComplete(body.links.actions[0].id, () => {
        exports.getInstance(body.droplet.id, droplet => {
          var response = {
            name: droplet.name,
            ip: droplet.networks.v4[0].ip_address,
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
  });
};

exports.destroy = (instance, callback) => {
  exports.getAPI().dropletsDelete(instance.digitalocean.id, (err, res, body) => {
    if (err) {
      return utils.die('Got an error from the DigitalOcean API: ' + err);
    }
    if (utils.isFunction(callback)) {
      callback();
    }
  });
};

exports.boot = (instance, callback) => {
  exports.dropletAction(instance, { type: 'power_on' }, callback);
};

exports.shutdown = (instance, callback) => {
  exports.dropletAction(instance, { type: 'shutdown' }, callback);
};

exports.reboot = (instance, callback) => {
  exports.dropletAction(instance, { type: 'reboot' }, callback);
};

exports.rebuild = (instance, image, callback) => {
  exports.ensureDropletIsShutDown(instance, () => {
    exports.dropletAction(instance, { type: 'rebuild', image }, callback);
  });
};

exports.resize = (instance, size, callback) => {
  var isDiskIncrease = exports.isDiskIncrease(instance.digitalocean.size.slug, size);
  if (!isDiskIncrease) {
    utils.die('You can only increase the size of the disk image (' + instance.digitalocean.size.slug + ').');
  }

  exports.ensureDropletIsShutDown(instance, () => {
    exports.dropletAction(instance, { type: 'resize', disk: true, size }, callback);
  });
};

exports.snapshot = (instance, snapshotName, callback) => {
  exports.ensureDropletIsShutDown(instance, () => {
    exports.dropletAction(instance, { type: 'snapshot', name: snapshotName }, callback);
  });
};

function _handlePaginatedResponse(err, body, callback) {
  if (err) {
    return utils.die('Got an error from the DigitalOcean API: ' + err);
  }
  callback(body);
}

exports.getImages = callback => {
  exports.getAPI().imagesGetAll({ includeAll: true, per_page: 50 }, (err, res, body) => {
    _handlePaginatedResponse(err, body, callback);
  });
};

exports.getInstances = (args, callback) => {
  exports.getAPI().dropletsGetAll({ includeAll: true, per_page: 50 }, (err, res, body) => {
    _handlePaginatedResponse(err, body, callback);
  });
};

exports.getInstance = (instance, callback) => {
  // exports.create passes in an id, since instance doesn't exist yet.
  var id = utils.isObject(instance) && instance.digitalocean ?
    instance.digitalocean.id : instance;

  exports.getAPI().dropletsGetById(id, (err, res, body) => {
    if (err) {
      return utils.die('Got an error from the DigitalOcean API: ' + err);
    }
    if (body && body.droplet) {
      callback(body.droplet);
    }
  });
};

exports.sync = (instance, callback) => {
  exports.updateInstanceMetadata(instance, callback);
};

exports.updateInstanceMetadata = (instance, callback) => {
  exports.getInstance(instance, droplet => {
    utils.updateInstance(instance.name, {
      ip: droplet.networks.v4[0].ip_address,
      digitalocean: droplet
    });

    if (utils.isFunction(callback)) {
      callback();
    }
  });
};

/*
exports.getKernels = function (callback) { };
*/

exports.getRegions = callback => {
  exports.getAPI().regionsGetAll({ includeAll: true, per_page: 50 }, (err, res, body) => {
    _handlePaginatedResponse(err, body, callback);
  });
};

exports.getSizes = callback => {
  exports.getAPI().sizesGetAll({ includeAll: true, per_page: 50 }, (err, res, body) => {
    _handlePaginatedResponse(err, body, callback);
  });
};

exports.getSnapshots = callback => {
  exports.getAPI().imagesGetAll({ includeAll: true, per_page: 50, private: true }, (err, res, body) => {
    _handlePaginatedResponse(err, body, callback);
  });
};

exports.getKeys = callback => {
  exports.getAPI().accountGetKeys({ includeAll: true, per_page: 50 }, (err, res, body) => {
    _handlePaginatedResponse(err, body, callback);
  });
};

exports.createKey = (keyData, callback) => {
  exports.getAPI().accountAddKey({
    name: utils.createHashedKeyName(keyData),
    public_key: keyData + ''
  }, (err, res, body) => {
    if (err) {
      return utils.die('Got an error from the DigitalOcean API: ' + err);
    }
    if (body && body.ssh_key) {
      callback(body.ssh_key);
    }
  });
};

// Internal functions

exports.ensureDropletIsShutDown = (instance, callback) => {
  exports.getInstance(instance, droplet => {
    if (droplet.status === 'off') {
      callback();
    } else {
      exports.shutdown(instance, () => {
        exports.waitForShutdown(instance, callback);
      });
    }
  });
};

exports.waitForShutdown = (instance, callback) => {
  exports.getInstance(instance, droplet => {
    if (droplet.status === 'off') {
      callback();
    } else {
      setTimeout(() => {
        exports.waitForShutdown(instance, callback);
      }, 3000);
    }
  });
};

exports.waitForActionToComplete = (id, callback) => {
  exports.getAPI().accountGetAction(id, (err, res, body) => {
    if (err) {
      return utils.die('Got an error from the DigitalOcean API: ' + err);
    }
    if (body && body.action && body.action.status === 'completed') {
      callback();
    } else {
      setTimeout(() => {
        exports.waitForActionToComplete(id, callback);
      }, 5000);
    }
  });
};

exports.getAPI = () => {
  if (exports.API) {
    return exports.API;
  }

  var variables = utils.getVariables();
  if (!variables.DIGITALOCEAN_API_TOKEN) {
    utils.red('The variable DIGITALOCEAN_API_TOKEN is not set.');
    utils.red('Go to https://cloud.digitalocean.com/settings/applications');
    utils.red('to get this variable, then run the following command:');
    return utils.die('overcast var set DIGITALOCEAN_API_TOKEN [your_api_token]');
  }

  exports.API = new DigitalOcean(variables.DIGITALOCEAN_API_TOKEN);

  return exports.API;
};

exports.dropletAction = (instance, data, callback) => {
  exports.getAPI().dropletsRequestAction(instance.digitalocean.id, data, (err, res, body) => {
    if (err || body.message) {
      return utils.die('Got an error from the DigitalOcean API: ' + (err || body.message));
    }
    exports.waitForActionToComplete(body.action.id, () => {
      exports.updateInstanceMetadata(instance, callback);
    });
  });
};

exports.normalizeAndFindPropertiesForCreate = (args, callback) => {
  args.image = args.image || args['image-id'] || args['image-slug'] || args['image-name'] || 'ubuntu-14-04-x64';
  args.size = args.size || args['size-slug'] || args['size-name'] || '512mb';
  args.region = args.region || args['region-slug'] || args['region-name'] || 'nyc3';

  exports.getImages((images) => {
    var matchingImage = getMatching(images, args.image);
    if (!matchingImage) {
      return utils.die('No image found that matches "' + args.image + '".');
    }
    exports.getSizes((sizes) => {
      var matchingSize = getMatching(sizes, args.size);
      if (!matchingSize) {
        return utils.die('No size found that matches "' + args.size + '".');
      }
      exports.getRegions((regions) => {
        var matchingRegion = getMatching(regions, args.region);
        if (!matchingRegion) {
          return utils.die('No region found that matches "' + args.region + '".');
        }

        ['image', 'image-id', 'image-slug', 'image-name',
          'size', 'size-id', 'size-slug', 'size-name',
          'region', 'region-id', 'region-slug', 'region-name'].forEach((key) => {
          delete args[key];
        });

        args['image-slug'] = matchingImage.slug;
        args['size-slug'] = matchingSize.slug;
        args['region-slug'] = matchingRegion.slug;

        if (utils.isFunction(callback)) {
          callback();
        }
      });
    });
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

exports.isDiskIncrease = (oldSize, newSize) => {
  function normalizeSize(s) {
    return s.indexOf('mb') !== -1 ? parseInt(s, 10) : parseInt(s, 10) * 1000;
  }

  return normalizeSize(newSize) > normalizeSize(oldSize);
};

function getMatching(collection, val) {
  return utils.findUsingMultipleKeys(collection, val, ['id', 'name', 'slug']);
}
