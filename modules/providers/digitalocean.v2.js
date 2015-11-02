var _ = require('lodash');
var utils = require('../utils');
var DigitalOcean = require('do-wrapper');

exports.API = null;

exports.id = 'digitalocean';
exports.name = 'DigitalOcean';

// Provider interface

exports.create = function (args, callback) {

};

exports.destroy = function (instance, callback) {

};

exports.boot = function (instance, callback) {

};

exports.shutdown = function (instance, callback) {

};

exports.reboot = function (instance, callback) {

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
