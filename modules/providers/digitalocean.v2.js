import fs from 'fs';
import _ from 'lodash';
import utils from '../utils';
import DigitalOcean from 'overcast-do-wrapper';
export const API = null;
export const id = 'digitalocean';
export const name = 'DigitalOcean';

// Provider interface

export function create(args, callback) {
  args['ssh-pub-key'] = utils.normalizeKeyPath(args['ssh-pub-key'], 'overcast.key.pub');

  exports.normalizeAndFindPropertiesForCreate(args, () => {
    exports.getOrCreateOvercastKeyID(args['ssh-pub-key'], keyID => {
      const query = {
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
}

export function createRequest(args, query, callback) {
  exports.getAPI().dropletsCreate(query, (err, res, body) => {
    if (err) {
      return utils.die(`Got an error from the DigitalOcean API: ${err}`);
    }
    if (body && body.droplet) {
      utils.grey('Waiting for instance to be created...');
      exports.waitForActionToComplete(body.links.actions[0].id, () => {
        exports.getInstance(body.droplet.id, droplet => {
          const response = {
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
}

export function destroy(instance, callback) {
  exports.getAPI().dropletsDelete(instance.digitalocean.id, (err, res, body) => {
    if (err) {
      return utils.die(`Got an error from the DigitalOcean API: ${err}`);
    }
    if (utils.isFunction(callback)) {
      callback();
    }
  });
}

export function boot(instance, callback) {
  exports.dropletAction(instance, { type: 'power_on' }, callback);
}

export function shutdown(instance, callback) {
  exports.dropletAction(instance, { type: 'shutdown' }, callback);
}

export function reboot(instance, callback) {
  exports.dropletAction(instance, { type: 'reboot' }, callback);
}

export function rebuild(instance, image, callback) {
  exports.ensureDropletIsShutDown(instance, () => {
    exports.dropletAction(instance, { type: 'rebuild', image }, callback);
  });
}

export function resize(instance, size, callback) {
  const isDiskIncrease = exports.isDiskIncrease(instance.digitalocean.size.slug, size);
  if (!isDiskIncrease) {
    utils.die(`You can only increase the size of the disk image (${instance.digitalocean.size.slug}).`);
  }

  exports.ensureDropletIsShutDown(instance, () => {
    exports.dropletAction(instance, { type: 'resize', disk: true, size }, callback);
  });
}

export function snapshot(instance, snapshotName, callback) {
  exports.ensureDropletIsShutDown(instance, () => {
    exports.dropletAction(instance, { type: 'snapshot', name: snapshotName }, callback);
  });
}

function _handlePaginatedResponse(err, body, callback) {
  if (err) {
    return utils.die(`Got an error from the DigitalOcean API: ${err}`);
  }
  callback(body);
}

export function getImages(callback) {
  exports.getAPI().imagesGetAll({ includeAll: true, per_page: 50 }, (err, res, body) => {
    _handlePaginatedResponse(err, body, callback);
  });
}

export function getInstances(args, callback) {
  exports.getAPI().dropletsGetAll({ includeAll: true, per_page: 50 }, (err, res, body) => {
    _handlePaginatedResponse(err, body, callback);
  });
}

export function getInstance(instance, callback) {
  // exports.create passes in an id, since instance doesn't exist yet.
  const id = utils.isObject(instance) && instance.digitalocean ?
    instance.digitalocean.id : instance;

  exports.getAPI().dropletsGetById(id, (err, res, body) => {
    if (err) {
      return utils.die(`Got an error from the DigitalOcean API: ${err}`);
    }
    if (body && body.droplet) {
      callback(body.droplet);
    }
  });
}

export function sync(instance, callback) {
  exports.updateInstanceMetadata(instance, callback);
}

export function updateInstanceMetadata(instance, callback) {
  exports.getInstance(instance, droplet => {
    utils.updateInstance(instance.name, {
      ip: droplet.networks.v4[0].ip_address,
      digitalocean: droplet
    });

    if (utils.isFunction(callback)) {
      callback();
    }
  });
}

/*
exports.getKernels = function (callback) { };
*/

export function getRegions(callback) {
  exports.getAPI().regionsGetAll({ includeAll: true, per_page: 50 }, (err, res, body) => {
    _handlePaginatedResponse(err, body, callback);
  });
}

export function getSizes(callback) {
  exports.getAPI().sizesGetAll({ includeAll: true, per_page: 50 }, (err, res, body) => {
    _handlePaginatedResponse(err, body, callback);
  });
}

export function getSnapshots(callback) {
  exports.getAPI().imagesGetAll({ includeAll: true, per_page: 50, private: true }, (err, res, body) => {
    _handlePaginatedResponse(err, body, callback);
  });
}

export function getKeys(callback) {
  exports.getAPI().accountGetKeys({ includeAll: true, per_page: 50 }, (err, res, body) => {
    _handlePaginatedResponse(err, body, callback);
  });
}

export function createKey(keyData, callback) {
  exports.getAPI().accountAddKey({
    name: utils.createHashedKeyName(keyData),
    public_key: `${keyData}`
  }, (err, res, body) => {
    if (err) {
      return utils.die(`Got an error from the DigitalOcean API: ${err}`);
    }
    if (body && body.ssh_key) {
      callback(body.ssh_key);
    }
  });
}

// Internal functions

export function ensureDropletIsShutDown(instance, callback) {
  exports.getInstance(instance, droplet => {
    if (droplet.status === 'off') {
      callback();
    } else {
      exports.shutdown(instance, () => {
        exports.waitForShutdown(instance, callback);
      });
    }
  });
}

export function waitForShutdown(instance, callback) {
  exports.getInstance(instance, droplet => {
    if (droplet.status === 'off') {
      callback();
    } else {
      setTimeout(() => {
        exports.waitForShutdown(instance, callback);
      }, 3000);
    }
  });
}

export function waitForActionToComplete(id, callback) {
  exports.getAPI().accountGetAction(id, (err, res, body) => {
    if (err) {
      return utils.die(`Got an error from the DigitalOcean API: ${err}`);
    }
    if (body && body.action && body.action.status === 'completed') {
      callback();
    } else {
      setTimeout(() => {
        exports.waitForActionToComplete(id, callback);
      }, 5000);
    }
  });
}

export function getAPI() {
  if (exports.API) {
    return exports.API;
  }

  const variables = utils.getVariables();
  if (!variables.DIGITALOCEAN_API_TOKEN) {
    utils.red('The variable DIGITALOCEAN_API_TOKEN is not set.');
    utils.red('Go to https://cloud.digitalocean.com/settings/applications');
    utils.red('to get this variable, then run the following command:');
    return utils.die('overcast var set DIGITALOCEAN_API_TOKEN [your_api_token]');
  }

  exports.API = new DigitalOcean(variables.DIGITALOCEAN_API_TOKEN);

  return exports.API;
}

export function dropletAction(instance, data, callback) {
  exports.getAPI().dropletsRequestAction(instance.digitalocean.id, data, (err, res, body) => {
    if (err || body.message) {
      return utils.die(`Got an error from the DigitalOcean API: ${err || body.message}`);
    }
    exports.waitForActionToComplete(body.action.id, () => {
      exports.updateInstanceMetadata(instance, callback);
    });
  });
}

export function normalizeAndFindPropertiesForCreate(args, callback) {
  args.image = args.image || args['image-id'] || args['image-slug'] || args['image-name'] || 'ubuntu-14-04-x64';
  args.size = args.size || args['size-slug'] || args['size-name'] || '512mb';
  args.region = args.region || args['region-slug'] || args['region-name'] || 'nyc3';

  exports.getImages((images) => {
    const matchingImage = getMatching(images, args.image);
    if (!matchingImage) {
      return utils.die(`No image found that matches "${args.image}".`);
    }
    exports.getSizes((sizes) => {
      const matchingSize = getMatching(sizes, args.size);
      if (!matchingSize) {
        return utils.die(`No size found that matches "${args.size}".`);
      }
      exports.getRegions((regions) => {
        const matchingRegion = getMatching(regions, args.region);
        if (!matchingRegion) {
          return utils.die(`No region found that matches "${args.region}".`);
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
}

export function getOrCreateOvercastKeyID(pubKeyPath, callback) {
  const keyData = `${fs.readFileSync(pubKeyPath, 'utf8')}`;

  exports.getKeys((keys) => {
    const key = _.find(keys, {
      name: utils.createHashedKeyName(keyData)
    });
    if (key) {
      utils.grey(`Using SSH key: ${pubKeyPath}`);
      callback(key.id);
    } else {
      utils.grey(`Uploading new SSH key: ${pubKeyPath}`);
      exports.createKey(keyData, (key) => {
        callback(key.id);
      });
    }
  });
}

export function isDiskIncrease(oldSize, newSize) {
  function normalizeSize(s) {
    return s.indexOf('mb') !== -1 ? parseInt(s, 10) : parseInt(s, 10) * 1000;
  }

  return normalizeSize(newSize) > normalizeSize(oldSize);
}

function getMatching(collection, val) {
  return utils.findUsingMultipleKeys(collection, val, ['id', 'name', 'slug']);
}
