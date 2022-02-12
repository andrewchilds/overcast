import fs from 'fs';
import * as utils from '../utils.js';
import DigitalOcean from 'overcast-do-wrapper';

const PRIVATE_CACHE = {
  API: null
};

// export const id = 'digitalocean';
// export const name = 'DigitalOcean';

// Provider interface

export function create(args, callback) {
  args['ssh-pub-key'] = utils.normalizeKeyPath(args['ssh-pub-key'], 'overcast.key.pub');

  normalizeAndFindPropertiesForCreate(args, () => {
    getOrCreateOvercastKeyID(args['ssh-pub-key'], keyID => {
      const query = {
        backups: utils.argIsTruthy(args['backups-enabled']),
        name: args.name,
        private_networking: utils.argIsTruthy(args['private-networking']),
        ssh_keys: [keyID],
        image: args['image-slug'],
        size: args['size-slug'],
        region: args['region-slug']
      };

      createRequest(args, query, callback);
    });
  });
}

export function createRequest(args, query, callback) {
  getAPI().dropletsCreate(query, (err, res, body) => {
    if (err) {
      return utils.die(`Got an error from the DigitalOcean API: ${err}`);
    }
    if (body && body.droplet) {
      log.faded('Waiting for instance to be created...');
      waitForActionToComplete(body.links.actions[0].id, () => {
        getInstance(body.droplet.id, droplet => {
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

export function destroy({digitalocean}, callback) {
  getAPI().dropletsDelete(digitalocean.id, (err, res, body) => {
    if (err) {
      return utils.die(`Got an error from the DigitalOcean API: ${err}`);
    }
    if (utils.isFunction(callback)) {
      callback();
    }
  });
}

export function boot(instance, callback) {
  dropletAction(instance, { type: 'power_on' }, callback);
}

export function shutdown(instance, callback) {
  dropletAction(instance, { type: 'shutdown' }, callback);
}

export function reboot(instance, callback) {
  dropletAction(instance, { type: 'reboot' }, callback);
}

export function rebuild(instance, image, callback) {
  ensureDropletIsShutDown(instance, () => {
    dropletAction(instance, { type: 'rebuild', image }, callback);
  });
}

export function resize(instance, size, callback) {
  const isDiskIncrease = isDiskIncrease(instance.digitalocean.size.slug, size);
  if (!isDiskIncrease) {
    utils.die(`You can only increase the size of the disk image (${instance.digitalocean.size.slug}).`);
  }

  ensureDropletIsShutDown(instance, () => {
    dropletAction(instance, { type: 'resize', disk: true, size }, callback);
  });
}

export function snapshot(instance, snapshotName, callback) {
  ensureDropletIsShutDown(instance, () => {
    dropletAction(instance, { type: 'snapshot', name: snapshotName }, callback);
  });
}

function _handlePaginatedResponse(err, body, callback) {
  if (err) {
    return utils.die(`Got an error from the DigitalOcean API: ${err}`);
  }
  callback(body);
}

export function getImages(callback) {
  getAPI().imagesGetAll({ includeAll: true, per_page: 50 }, (err, res, body) => {
    _handlePaginatedResponse(err, body, callback);
  });
}

export function getInstances(args, callback) {
  getAPI().dropletsGetAll({ includeAll: true, per_page: 50 }, (err, res, body) => {
    _handlePaginatedResponse(err, body, callback);
  });
}

export function getInstance(instance, callback) {
  // create passes in an id, since instance doesn't exist yet.
  const id = utils.isObject(instance) && instance.digitalocean ?
    instance.digitalocean.id : instance;

  getAPI().dropletsGetById(id, (err, res, body) => {
    if (err) {
      return utils.die(`Got an error from the DigitalOcean API: ${err}`);
    }
    if (body && body.droplet) {
      callback(body.droplet);
    }
  });
}

export function sync(instance, callback) {
  updateInstanceMetadata(instance, callback);
}

export function updateInstanceMetadata(instance, callback) {
  getInstance(instance, droplet => {
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
export function getKernels = (callback) => {};
*/

export function getRegions(callback) {
  getAPI().regionsGetAll({ includeAll: true, per_page: 50 }, (err, res, body) => {
    _handlePaginatedResponse(err, body, callback);
  });
}

export function getSizes(callback) {
  getAPI().sizesGetAll({ includeAll: true, per_page: 50 }, (err, res, body) => {
    _handlePaginatedResponse(err, body, callback);
  });
}

export function getSnapshots(callback) {
  getAPI().imagesGetAll({ includeAll: true, per_page: 50, private: true }, (err, res, body) => {
    _handlePaginatedResponse(err, body, callback);
  });
}

export function getKeys(callback) {
  getAPI().accountGetKeys({ includeAll: true, per_page: 50 }, (err, res, body) => {
    _handlePaginatedResponse(err, body, callback);
  });
}

export function createKey(keyData, callback) {
  getAPI().accountAddKey({
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
  getInstance(instance, ({status}) => {
    if (status === 'off') {
      callback();
    } else {
      shutdown(instance, () => {
        waitForShutdown(instance, callback);
      });
    }
  });
}

export function waitForShutdown(instance, callback) {
  getInstance(instance, ({status}) => {
    if (status === 'off') {
      callback();
    } else {
      setTimeout(() => {
        waitForShutdown(instance, callback);
      }, 3000);
    }
  });
}

export function waitForActionToComplete(id, callback) {
  getAPI().accountGetAction(id, (err, res, body) => {
    if (err) {
      return utils.die(`Got an error from the DigitalOcean API: ${err}`);
    }
    if (body && body.action && body.action.status === 'completed') {
      callback();
    } else {
      setTimeout(() => {
        waitForActionToComplete(id, callback);
      }, 5000);
    }
  });
}

export function getAPI() {
  if (PRIVATE_CACHE.API) {
    return PRIVATE_CACHE.API;
  }

  const vars = utils.getVariables();
  if (!vars.DIGITALOCEAN_API_TOKEN) {
    log.failure('The variable DIGITALOCEAN_API_TOKEN is not set.');
    log.failure('Go to https://cloud.digitalocean.com/settings/applications');
    log.failure('to get this variable, then run the following command:');
    return utils.die('overcast var set DIGITALOCEAN_API_TOKEN [your_api_token]');
  }

  PRIVATE_CACHE.API = new DigitalOcean(vars.DIGITALOCEAN_API_TOKEN);

  return PRIVATE_CACHE.API;
}

export function dropletAction(instance, data, callback) {
  getAPI().dropletsRequestAction(instance.digitalocean.id, data, (err, res, {message, action}) => {
    if (err || message) {
      return utils.die(`Got an error from the DigitalOcean API: ${err || message}`);
    }
    waitForActionToComplete(action.id, () => {
      updateInstanceMetadata(instance, callback);
    });
  });
}

export function normalizeAndFindPropertiesForCreate(args, callback) {
  args.image = args.image || args['image-id'] || args['image-slug'] || args['image-name'] || 'ubuntu-14-04-x64';
  args.size = args.size || args['size-slug'] || args['size-name'] || '512mb';
  args.region = args.region || args['region-slug'] || args['region-name'] || 'nyc3';

  getImages((images) => {
    const matchingImage = getMatching(images, args.image);
    if (!matchingImage) {
      return utils.die(`No image found that matches "${args.image}".`);
    }
    getSizes((sizes) => {
      const matchingSize = getMatching(sizes, args.size);
      if (!matchingSize) {
        return utils.die(`No size found that matches "${args.size}".`);
      }
      getRegions((regions) => {
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

  getKeys((keys) => {
    const key = keys.find(({ name }) => {
      return name === utils.createHashedKeyName(keyData);
    });
    if (key) {
      log.faded(`Using SSH key: ${pubKeyPath}`);
      callback(key.id);
    } else {
      log.faded(`Uploading new SSH key: ${pubKeyPath}`);
      createKey(keyData, (key) => {
        callback(key.id);
      });
    }
  });
}

export function isDiskIncrease(oldSize, newSize) {
  function normalizeSize(s) {
    return s.includes('mb') ? parseInt(s, 10) : parseInt(s, 10) * 1000;
  }

  return normalizeSize(newSize) > normalizeSize(oldSize);
}

function getMatching(collection, val) {
  return utils.findUsingMultipleKeys(collection, val, ['id', 'name', 'slug']);
}
