var fs = require('fs');
var _ = require('lodash');
var utils = require('../utils');
var DigitalOcean = require('do-wrapper');

exports.API = null;

exports.id = 'digitalocean';
exports.name = 'DigitalOcean';

// Provider interface

exports.create = function (args, callback) {
  args['ssh-pub-key'] = utils.normalizeKeyPath(args['ssh-pub-key'], 'overcast.key.pub');

  exports.normalizeAndFindPropertiesForCreate(args, function () {
    exports.getOrCreateOvercastKeyID(args['ssh-pub-key'], function (keyID) {
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

exports.createRequest = function (args, query, callback) {
  exports.getAPI().dropletsCreate(query, function (err, res, body) {
    if (err) {
      return utils.die('Got an error from the DigitalOcean API: ' + err);
    }
    if (body && body.droplet) {
      utils.grey('Waiting for instance to be created...');
      exports.waitForActionToComplete(body.links.actions[0].id, function () {
        exports.getInstance(body.droplet.id, function (droplet) {
          var response = {
            name: droplet.name,
            ip: droplet.networks.v4[0].ip_address,
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
  });
};

exports.destroy = function (instance, callback) {
  exports.getAPI().dropletsDelete(instance.digitalocean.id, function (err, res, body) {
    if (err) {
      return utils.die('Got an error from the DigitalOcean API: ' + err);
    }
    if (_.isFunction(callback)) {
      callback();
    }
  });
};

exports.boot = function (instance, callback) {
  exports.dropletAction(instance, { type: 'power_on' }, callback);
};

exports.shutdown = function (instance, callback) {
  exports.dropletAction(instance, { type: 'shutdown' }, callback);
};

exports.reboot = function (instance, callback) {
  exports.dropletAction(instance, { type: 'reboot' }, callback);
};

exports.rebuild = function (instance, image, callback) {

};

exports.resize = function (instance, size, callback) {

};

exports.snapshot = function (instance, snapshotName, callback) {

};

exports.getImages = function (callback) {
  exports.getAPI().imagesGetAll({}, function (err, res, body) {
    if (err) {
      return utils.die('Got an error from the DigitalOcean API: ' + err);
    }
    if (body && body.images) {
      callback(body.images);
    }
  });
};

exports.getInstances = function (args, callback) {
  exports.getAPI().dropletsGetAll({}, function (err, res, body) {
    if (err) {
      return utils.die('Got an error from the DigitalOcean API: ' + err);
    }
    if (body && body.droplets) {
      callback(body.droplets);
    }
  });
};

exports.getInstance = function (instance, callback) {
  // exports.create passes in an id, since instance doesn't exist yet.
  var id = _.isPlainObject(instance) && instance.digitalocean ?
    instance.digitalocean.id : instance;

  exports.getAPI().dropletsGetById(id, function (err, res, body) {
    if (err) {
      return utils.die('Got an error from the DigitalOcean API: ' + err);
    }
    if (body && body.droplet) {
      callback(body.droplet);
    }
  });
};

exports.updateInstanceMetadata = function (instance, callback) {
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

/*
exports.getKernels = function (callback) { };
*/

exports.getRegions = function (callback) {
  exports.getAPI().regionsGetAll({}, function (err, res, body) {
    if (err) {
      return utils.die('Got an error from the DigitalOcean API: ' + err);
    }
    if (body && body.regions) {
      callback(body.regions);
    }
  });
};

exports.getSizes = function (callback) {
  exports.getAPI().sizesGetAll({}, function (err, res, body) {
    if (err) {
      return utils.die('Got an error from the DigitalOcean API: ' + err);
    }
    if (body && body.sizes) {
      callback(body.sizes);
    }
  });
};

exports.getSnapshots = function (callback) {
  exports.getAPI().imagesGetAll({ private: true }, function (err, res, body) {
    if (err) {
      return utils.die('Got an error from the DigitalOcean API: ' + err);
    }
    if (body && body.images) {
      callback(body.images);
    }
  });
};

exports.getKeys = function (callback) {
  exports.getAPI().accountGetKeys({}, function (err, res, body) {
    if (err) {
      return utils.die('Got an error from the DigitalOcean API: ' + err);
    }
    if (body && body.ssh_keys) {
      callback(body.ssh_keys);
    }
  });
};

exports.createKey = function (keyData, callback) {
  exports.getAPI().accountAddKey({
    name: utils.createHashedKeyName(keyData),
    public_key: keyData + ''
  }, function (err, res, body) {
    if (err) {
      return utils.die('Got an error from the DigitalOcean API: ' + err);
    }
    if (body && body.ssh_key) {
      callback(body.ssh_key);
    }
  });
};

// Internal functions

/*
  "action": {
    "id": 36804636,
    "status": "completed",
    "type": "create",
    "started_at": "2014-11-14T16:29:21Z",
    "completed_at": "2014-11-14T16:30:06Z",
    "resource_id": 3164444,
    "resource_type": "droplet",
    "region": "nyc3",
    "region_slug": "nyc3"
  }
*/

exports.waitForActionToComplete = function (id, callback) {
  exports.getAPI().accountGetAction(id, function (err, res, body) {
    if (err) {
      return utils.die('Got an error from the DigitalOcean API: ' + err);
    }
    if (body && body.action && body.action.status === 'completed') {
      callback();
    } else {
      setTimeout(function () {
        exports.waitForActionToComplete(id, callback);
      }, 5000);
    }
  });
};

exports.getAPI = function () {
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

exports.dropletAction = function (instance, data, callback) {
  exports.getAPI().dropletsRequestAction(instance.digitalocean.id, data, function (err, res, body) {
    if (err || body.message) {
      return utils.die('Got an error from the DigitalOcean API: ' + (err || body.message));
    }
    exports.waitForActionToComplete(body.action.id, callback);
  });
};

exports.normalizeAndFindPropertiesForCreate = function (args, callback) {
  args.image = args.image || args['image-id'] || args['image-slug'] || args['image-name'] || 'ubuntu-14-04-x64';
  args.size = args.size || args['size-slug'] || args['size-name'] || '512mb';
  args.region = args.region || args['region-slug'] || args['region-name'] || 'nyc3';

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

        _.each(['image', 'image-id', 'image-slug', 'image-name',
          'size', 'size-id', 'size-slug', 'size-name',
          'region', 'region-id', 'region-slug', 'region-name'], function (key) {
          delete args[key];
        });

        args['image-slug'] = matchingImage.slug;
        args['size-slug'] = matchingSize.slug;
        args['region-slug'] = matchingRegion.slug;

        if (_.isFunction(callback)) {
          callback();
        }
      });
    });
  });
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

exports.returnOnlyIDNameSlug = function (collection) {
  return _.map(collection, function (obj) {
    return {
      id: obj.id,
      name: obj.name,
      slug: obj.slug
    };
  });
};

function getMatching(collection, val) {
  return utils.findUsingMultipleKeys(collection, val, ['id', 'name', 'slug']);
}
