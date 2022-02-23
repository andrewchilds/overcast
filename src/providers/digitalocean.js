import fs from 'fs';
import DigitalOcean from 'do-wrapper';

import * as log from '../log.js';
import * as utils from '../utils.js';

const FIRST_PAGE = 1;
const PAGE_SIZE = 50;

export const api = {
  id: 'digitalocean',
  name: 'DigitalOcean'
};

export const DEFAULT_IMAGE = 'ubuntu-20-04-x64';
export const DEFAULT_SIZE = 's-1vcpu-2gb-intel';
export const DEFAULT_REGION = 'nyc3';

const PRIVATE_CACHE = {
  API: null
};

// Provider interface

api.create = (args, nextFn) => {
  args['ssh-pub-key'] = utils.normalizeKeyPath(args['ssh-pub-key'], 'overcast.key.pub');

  normalizeAndFindPropertiesForCreate(args, () => {
    getOrCreateOvercastKeyID(args['ssh-pub-key'], keyID => {
      const query = {
        backups: utils.argIsTruthy(args['backups']),
        monitoring: utils.argIsTruthy(args['monitoring']),
        name: args.name,
        with_droplet_agent: utils.argIsTruthy(args['with-droplet-agent']),
        private_networking: utils.argIsTruthy(args['private-networking']),
        ssh_keys: [keyID],
        image: args['image-slug'],
        size: args['size-slug'],
        region: args['region-slug']
      };

      _create(args, query, nextFn);
    });
  });
}

api.destroy = (instance, nextFn = () => {}) => {
  getAPI().droplets.deleteById(instance.digitalocean.id).then(body => {
    nextFn(body);
  }).catch(genericCatch);
}

api.boot = (instance, nextFn) => {
  dropletAction(instance, { type: 'power_on' }, nextFn);
}

api.shutdown = (instance, nextFn) => {
  dropletAction(instance, { type: 'shutdown' }, nextFn);
}

api.reboot = (instance, nextFn) => {
  dropletAction(instance, { type: 'reboot' }, nextFn);
}

api.rebuild = (instance, image, nextFn) => {
  ensureDropletIsShutDown(instance, () => {
    dropletAction(instance, { type: 'rebuild', image }, nextFn);
  });
}

api.resize = (instance, size, nextFn) => {
  ensureDropletIsShutDown(instance, () => {
    dropletAction(instance, { type: 'resize', disk: true, size }, () => {
      api.boot(instance, nextFn);
    });
  });
}

api.snapshot = (instance, snapshotName, nextFn) => {
  ensureDropletIsShutDown(instance, () => {
    dropletAction(instance, { type: 'snapshot', name: snapshotName }, () => {
      api.boot(instance, nextFn);
    });
  });
}

api.getImages = (nextFn) => {
  getAPI().images.getAll('', true, FIRST_PAGE, PAGE_SIZE).then(body => {
    nextFn(body);
  }).catch(genericCatch);
}

api.getInstances = (args, nextFn) => {
  getAPI().droplets.getAll('', true, FIRST_PAGE, PAGE_SIZE).then(body => {
    nextFn(body);
  }).catch(genericCatch);
}

api.getInstance = (instance, nextFn) => {
  // create passes in an id, since instance doesn't exist yet.
  const id = utils.isObject(instance) && instance.digitalocean ?
    instance.digitalocean.id : instance;

  getAPI().droplets.getById(id).then(body => {
    if (body && body.droplet) {
      nextFn(body.droplet);
    } else {
      utils.die('Unable to find droplet.');
    }
  }).catch(genericCatch);
}

api.sync = (instance, nextFn) => {
  api.updateInstanceMetadata(instance, nextFn);
}

api.updateInstanceMetadata = (instance, nextFn = () => {}) => {
  api.getInstance(instance, droplet => {
    utils.updateInstance(instance.name, {
      ip: droplet.networks.v4[0].ip_address,
      digitalocean: droplet
    });
    nextFn();
  });
}

api.getRegions = (nextFn) => {
  getAPI().regions.getAll('', true, FIRST_PAGE, PAGE_SIZE).then(body => {
    nextFn(body);
  }).catch(genericCatch);
}

api.getSizes = (nextFn) => {
  getAPI().sizes.get('', true, FIRST_PAGE, PAGE_SIZE).then(body => {
    nextFn(body);
  }).catch(genericCatch);
}

api.getSnapshots = (nextFn) => {
  getAPI().snapshots.get('', true, FIRST_PAGE, PAGE_SIZE).then(body => {
    nextFn(body);
  }).catch(genericCatch);
}

api.getKeys = (nextFn) => {
  getAPI().keys.getAll('', true, FIRST_PAGE, PAGE_SIZE).then(body => {
    nextFn(body);
  }).catch(genericCatch);
}

api.createKey = (keyData, nextFn) => {
  getAPI().keys.add({
    name: utils.createHashedKeyName(keyData),
    public_key: `${keyData}`
  }).then(body => {
    if (body && body.ssh_key) {
      nextFn(body.ssh_key);
    } else {
      utils.die('Unable to add SSH key.');
    }
  }).catch(genericCatch);
}

// Internal functions

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

function genericCatch(err) {
  if (err) {
    return utils.die(`Got an error from the DigitalOcean API: ${err.message || err}`);
  }
}

function _create(args, query, nextFn = () => {}) {
  getAPI().droplets.create(query).then(body => {
    if (body && body.droplet) {
      log.faded('Waiting for instance to be created...');
      waitForActionToComplete(body.links.actions[0].id, () => {
        api.getInstance(body.droplet.id, droplet => {
          const response = {
            name: droplet.name,
            ip: droplet.networks.v4[0].ip_address,
            ssh_key: args['ssh-key'] || 'overcast.key',
            ssh_port: args['ssh-port'] || '22',
            user: 'root',
            digitalocean: droplet
          };

          nextFn(response);
        });
      });
    }
  }).catch(genericCatch);
}

export function ensureDropletIsShutDown(instance, nextFn) {
  api.getInstance(instance, ({ status }) => {
    if (status === 'off') {
      nextFn();
    } else {
      api.shutdown(instance, () => {
        waitForShutdown(instance, nextFn);
      });
    }
  });
}

export function waitForShutdown(instance, nextFn) {
  api.getInstance(instance, ({ status }) => {
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
  getAPI().actions.getById(id).then(({ action }) => {
    if (action && action.status === 'completed') {
      nextFn();
    } else {
      setTimeout(() => {
        waitForActionToComplete(id, nextFn);
      }, 3000);
    }
  }).catch(genericCatch);
}

export function dropletAction(instance, actionData, nextFn) {
  getAPI().droplets.requestAction(instance.digitalocean.id, actionData).then(({ action }) => {
    waitForActionToComplete(action.id, () => {
      api.updateInstanceMetadata(instance, nextFn);
    });
  }).catch(genericCatch);
}

export function normalizeAndFindPropertiesForCreate(args, nextFn = () => {}) {
  args.image = args.image || args['image-id'] || args['image-slug'] || args['image-name'] || DEFAULT_IMAGE;
  args.size = args.size || args['size-slug'] || args['size-name'] || DEFAULT_SIZE;
  args.region = args.region || args['region-slug'] || args['region-name'] || DEFAULT_REGION;

  api.getImages((images) => {
    const matchingImage = getMatching(images, args.image);
    if (!matchingImage) {
      return utils.die(`No image found that matches "${args.image}".`);
    }
    api.getSizes((sizes) => {
      const matchingSize = getMatching(sizes, args.size);
      if (!matchingSize) {
        return utils.die(`No size found that matches "${args.size}".`);
      }
      api.getRegions((regions) => {
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

  api.getKeys((keys) => {
    const key = keys.find(({ name }) => {
      return name === utils.createHashedKeyName(keyData);
    });
    if (key) {
      log.faded(`Using SSH key: ${pubKeyPath}`);
      nextFn(key.id);
    } else {
      log.faded(`Uploading new SSH key: ${pubKeyPath}`);
      api.createKey(keyData, (key) => {
        nextFn(key.id);
      });
    }
  });
}

function getMatching(collection, val) {
  return utils.findUsingMultipleKeys(collection, val, ['id', 'name', 'slug']);
}
