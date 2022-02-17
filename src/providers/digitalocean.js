import fs from 'fs';
import DigitalOcean from 'do-wrapper';

import * as utils from '../utils.js';

const FIRST_PAGE = 1;
const PAGE_SIZE = 50;
const DEFAULT_IMAGE = 'ubuntu-20-04-x64';
const DEFAULT_SIZE = 's-1vcpu-2gb-amd';
const DEFAULT_REGION = 'nyc3';

const PRIVATE_CACHE = {
  API: null
};

// export const id = 'digitalocean';
// export const name = 'DigitalOcean';

// Provider interface

export function getAPI() {
  if (PRIVATE_CACHE.API) {
    return PRIVATE_CACHE.API;
  }

  const vars = utils.getVariables();
  if (!vars.DIGITALOCEAN_API_TOKEN) {
    log.failure('The variable DIGITALOCEAN_API_TOKEN is not set.');
    log.failure('Go to https://cloud.digitalocean.com/settings/applications');
    log.failure('to get your API token, then run the following command:');
    return utils.die('overcast var set DIGITALOCEAN_API_TOKEN [your_api_token]');
  }

  PRIVATE_CACHE.API = new DigitalOcean.default(vars.DIGITALOCEAN_API_TOKEN);

  return PRIVATE_CACHE.API;
}

function genericErrorHandler(err) {
  if (err) {
    return utils.die(`Got an error from the DigitalOcean API: ${err}`);
  }
}

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
  getAPI().droplets.create(query).then(body => {
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
  }).catch(genericErrorHandler);
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
  nextFn(body);
}

export function getImages(nextFn) {
  getAPI().images.getAll('', true, FIRST_PAGE, PAGE_SIZE).then(body => {
    nextFn(body);
  }).catch(genericErrorHandler);
}

export function getInstances(nextFn) {
  getAPI().droplets.getAll({ includeAll: true, pageSize: 50 }).then(body => {
    nextFn(body);
  }).catch(genericErrorHandler);
}

export function getInstance(instance, nextFn) {
  // create passes in an id, since instance doesn't exist yet.
  const id = utils.isObject(instance) && instance.digitalocean ?
    instance.digitalocean.id : instance;

  getAPI().droplets.getById(id).then(body => {
    if (body && body.droplet) {
      nextFn(body.droplet);
    } else {
      utils.die('Unable to find droplet.');
    }
  }).catch(genericErrorHandler);
}

export function sync(instance, nextFn) {
  updateInstanceMetadata(instance, nextFn);
}

export function updateInstanceMetadata(instance, nextFn = () => {}) {
  getInstance(instance, droplet => {
    utils.updateInstance(instance.name, {
      ip: droplet.networks.v4[0].ip_address,
      digitalocean: droplet
    });
    nextFn();
  });
}

export function getRegions(nextFn) {
  getAPI().regions.getAll('', true, FIRST_PAGE, PAGE_SIZE).then(body => {
    nextFn(body);
  }).catch(genericErrorHandler);
}

export function getSizes(nextFn) {
  getAPI().sizes.get('', true, FIRST_PAGE, PAGE_SIZE).then(body => {
    nextFn(body);
  }).catch(genericErrorHandler);
}

export function getSnapshots(nextFn) {
  getAPI().snapshots.getAll('', true, FIRST_PAGE, PAGE_SIZE).then(body => {
    nextFn(body);
  }).catch(genericErrorHandler);
}

export function getKeys(nextFn) {
  getAPI().keys.getAll('', true, FIRST_PAGE, PAGE_SIZE).then(body => {
    nextFn(body);
  }).catch(genericErrorHandler);
}

export function createKey(keyData, nextFn) {
  getAPI().keys.add({
    name: utils.createHashedKeyName(keyData),
    public_key: `${keyData}`
  }).then(body => {
    if (body && body.ssh_key) {
      nextFn(body.ssh_key);
    } else {
      utils.die('Unable to add SSH key.');
    }
  }).catch(genericErrorHandler);
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
  getAPI().actions.getById(id).then(body => {
    if (body && body.action && body.action.status === 'completed') {
      nextFn();
    } else {
      setTimeout(() => {
        waitForActionToComplete(id, nextFn);
      }, 5000);
    }
  }).catch(genericErrorHandler);
}

export function dropletAction(instance, data, nextFn) {
  getAPI().dropletsRequestAction(instance.digitalocean.id, data, (err, res, { message, action }) => {
    if (err || message) {
      return utils.die(`Got an error from the DigitalOcean API: ${err || message}`);
    }
    waitForActionToComplete(action.id, () => {
      updateInstanceMetadata(instance, nextFn);
    });
  });
}

export function normalizeAndFindPropertiesForCreate(args, nextFn = () => {}) {
  args.image = args.image || args['image-id'] || args['image-slug'] || args['image-name'] || DEFAULT_IMAGE;
  args.size = args.size || args['size-slug'] || args['size-name'] || DEFAULT_SIZE;
  args.region = args.region || args['region-slug'] || args['region-name'] || DEFAULT_REGION;

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

        nextFn();
      });
    });
  });
}

export function getOrCreateOvercastKeyID(pubKeyPath, nextFn = () => {}) {
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

function normalizeSize(s) {
  return s.includes('mb') ? parseInt(s, 10) : parseInt(s, 10) * 1000;
}

export function isDiskIncrease(oldSize, newSize) {
  return normalizeSize(newSize) > normalizeSize(oldSize);
}

function getMatching(collection, val) {
  return utils.findUsingMultipleKeys(collection, val, ['id', 'name', 'slug']);
}
