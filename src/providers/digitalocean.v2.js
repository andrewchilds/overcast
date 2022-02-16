import fs from 'fs';
import * as utils from '../utils.js';
import DigitalOcean from 'overcast-do-wrapper';

const PRIVATE_CACHE = {
  API: null
};

// export const id = 'digitalocean';
// export const name = 'DigitalOcean';

// Provider interface

export function create(args, nextFn) {
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

      createRequest(args, query, nextFn);
    });
  });
}

export function createRequest(args, query, nextFn) {
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

          if (utils.isFunction(nextFn)) {
            nextFn(response);
          }
        });
      });
    }
  });
}

export function destroy({digitalocean}, nextFn) {
  getAPI().dropletsDelete(digitalocean.id, (err, res, body) => {
    if (err) {
      return utils.die(`Got an error from the DigitalOcean API: ${err}`);
    }
    if (utils.isFunction(nextFn)) {
      nextFn();
    }
  });
}

export function boot(instance, nextFn) {
  dropletAction(instance, { type: 'power_on' }, nextFn);
}

export function shutdown(instance, nextFn) {
  dropletAction(instance, { type: 'shutdown' }, nextFn);
}

export function reboot(instance, nextFn) {
  dropletAction(instance, { type: 'reboot' }, nextFn);
}

export function rebuild(instance, image, nextFn) {
  ensureDropletIsShutDown(instance, () => {
    dropletAction(instance, { type: 'rebuild', image }, nextFn);
  });
}

export function resize(instance, size, nextFn) {
  const isDiskIncrease = isDiskIncrease(instance.digitalocean.size.slug, size);
  if (!isDiskIncrease) {
    return utils.die(`You can only increase the size of the disk image (${instance.digitalocean.size.slug}).`);
  }

  ensureDropletIsShutDown(instance, () => {
    dropletAction(instance, { type: 'resize', disk: true, size }, nextFn);
  });
}

export function snapshot(instance, snapshotName, nextFn) {
  ensureDropletIsShutDown(instance, () => {
    dropletAction(instance, { type: 'snapshot', name: snapshotName }, nextFn);
  });
}

function _handlePaginatedResponse(err, body, nextFn) {
  if (err) {
    return utils.die(`Got an error from the DigitalOcean API: ${err}`);
  }
  nextFn(body);
}

export function getImages(nextFn) {
  getAPI().imagesGetAll({ includeAll: true, per_page: 50 }, (err, res, body) => {
    _handlePaginatedResponse(err, body, nextFn);
  });
}

export function getInstances(args, nextFn) {
  getAPI().dropletsGetAll({ includeAll: true, per_page: 50 }, (err, res, body) => {
    _handlePaginatedResponse(err, body, nextFn);
  });
}

export function getInstance(instance, nextFn) {
  // create passes in an id, since instance doesn't exist yet.
  const id = utils.isObject(instance) && instance.digitalocean ?
    instance.digitalocean.id : instance;

  getAPI().dropletsGetById(id, (err, res, body) => {
    if (err) {
      return utils.die(`Got an error from the DigitalOcean API: ${err}`);
    }
    if (body && body.droplet) {
      nextFn(body.droplet);
    }
  });
}

export function sync(instance, nextFn) {
  updateInstanceMetadata(instance, nextFn);
}

export function updateInstanceMetadata(instance, nextFn) {
  getInstance(instance, droplet => {
    utils.updateInstance(instance.name, {
      ip: droplet.networks.v4[0].ip_address,
      digitalocean: droplet
    });

    if (utils.isFunction(nextFn)) {
      nextFn();
    }
  });
}

/*
export function getKernels = (nextFn) => {};
*/

export function getRegions(nextFn) {
  getAPI().regionsGetAll({ includeAll: true, per_page: 50 }, (err, res, body) => {
    _handlePaginatedResponse(err, body, nextFn);
  });
}

export function getSizes(nextFn) {
  getAPI().sizesGetAll({ includeAll: true, per_page: 50 }, (err, res, body) => {
    _handlePaginatedResponse(err, body, nextFn);
  });
}

export function getSnapshots(nextFn) {
  getAPI().imagesGetAll({ includeAll: true, per_page: 50, private: true }, (err, res, body) => {
    _handlePaginatedResponse(err, body, nextFn);
  });
}

export function getKeys(nextFn) {
  getAPI().accountGetKeys({ includeAll: true, per_page: 50 }, (err, res, body) => {
    _handlePaginatedResponse(err, body, nextFn);
  });
}

export function createKey(keyData, nextFn) {
  getAPI().accountAddKey({
    name: utils.createHashedKeyName(keyData),
    public_key: `${keyData}`
  }, (err, res, body) => {
    if (err) {
      return utils.die(`Got an error from the DigitalOcean API: ${err}`);
    }
    if (body && body.ssh_key) {
      nextFn(body.ssh_key);
    }
  });
}

// Internal functions

export function ensureDropletIsShutDown(instance, nextFn) {
  getInstance(instance, ({status}) => {
    if (status === 'off') {
      nextFn();
    } else {
      shutdown(instance, () => {
        waitForShutdown(instance, nextFn);
      });
    }
  });
}

export function waitForShutdown(instance, nextFn) {
  getInstance(instance, ({status}) => {
    if (status === 'off') {
      nextFn();
    } else {
      setTimeout(() => {
        waitForShutdown(instance, nextFn);
      }, 3000);
    }
  });
}

export function waitForActionToComplete(id, nextFn) {
  getAPI().accountGetAction(id, (err, res, body) => {
    if (err) {
      return utils.die(`Got an error from the DigitalOcean API: ${err}`);
    }
    if (body && body.action && body.action.status === 'completed') {
      nextFn();
    } else {
      setTimeout(() => {
        waitForActionToComplete(id, nextFn);
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

export function dropletAction(instance, data, nextFn) {
  getAPI().dropletsRequestAction(instance.digitalocean.id, data, (err, res, {message, action}) => {
    if (err || message) {
      return utils.die(`Got an error from the DigitalOcean API: ${err || message}`);
    }
    waitForActionToComplete(action.id, () => {
      updateInstanceMetadata(instance, nextFn);
    });
  });
}

export function normalizeAndFindPropertiesForCreate(args, nextFn) {
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

        if (utils.isFunction(nextFn)) {
          nextFn();
        }
      });
    });
  });
}

export function getOrCreateOvercastKeyID(pubKeyPath, nextFn) {
  const keyData = `${fs.readFileSync(pubKeyPath, 'utf8')}`;

  getKeys((keys) => {
    const key = keys.find(({ name }) => {
      return name === utils.createHashedKeyName(keyData);
    });
    if (key) {
      log.faded(`Using SSH key: ${pubKeyPath}`);
      nextFn(key.id);
    } else {
      log.faded(`Uploading new SSH key: ${pubKeyPath}`);
      createKey(keyData, (key) => {
        nextFn(key.id);
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
