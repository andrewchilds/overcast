import fs from 'fs';
import querystring from 'querystring';
import cp from 'child_process';
import * as utils from '../utils.js';

const API_URL = 'https://api.digitalocean.com/';
const EVENT_TIMEOUT = 1000 * 60 * 10;
const EVENT_TIMEOUT_NAME = 'ten minutes';

export const DEBUG = false;
export const id = 'digitalocean';
export const name = 'DigitalOcean';

// Provider interface

export function create(args, nextFn) {
  args['ssh-pub-key'] = utils.normalizeKeyPath(args['ssh-pub-key'], 'overcast.key.pub');

  normalizeAndFindPropertiesForCreate(args, () => {
    getOrCreateOvercastKeyID(args['ssh-pub-key'], keyID => {
      const query = {
        backups_enabled: utils.argIsTruthy(args['backups-enabled']),
        name: args.name,
        private_networking: utils.argIsTruthy(args['private-networking']),
        ssh_key_ids: keyID,
        image_id: args['image-id'],
        size_id: args['size-id'],
        region_id: args['region-id']
      };

      createRequest(args, query, nextFn);
    });
  });
}

export function createRequest(args, query, nextFn = () => {}) {
  request({
    endpoint: 'droplets/new',
    query,
    nextFn: (result) => {
      if (result && result.droplet && result.droplet.event_id) {
        waitForEventToFinish(result.droplet.event_id, () => {
          getInstance(result.droplet.id, droplet => {
            const response = {
              name: droplet.name,
              ip: droplet.ip_address,
              ssh_key: args['ssh-key'] || 'overcast.key',
              ssh_port: args['ssh-port'] || '22',
              user: 'root',
              digitalocean: droplet
            };

            nextFn(response);
          });
        });
      }
    }
  });
}

export function destroy({digitalocean}, nextFn) {
  request({
    endpoint: `droplets/${digitalocean.id}/destroy`,
    query: { scrub_data: 1 },
    nextFn
  });
}

export function boot({digitalocean}, nextFn) {
  eventedRequest({
    endpoint: `droplets/${digitalocean.id}/power_on`,
    nextFn
  });
}

export function shutdown({digitalocean}, nextFn) {
  eventedRequest({
    endpoint: `droplets/${digitalocean.id}/power_off`,
    nextFn
  });
}

export function snapshot(instance, snapshotName, nextFn) {
  shutdown(instance, () => {
    eventedRequest({
      endpoint: `droplets/${instance.digitalocean.id}/snapshot`,
      query: { name: snapshotName },
      nextFn
    });
  });
}

export function reboot({digitalocean}, nextFn) {
  eventedRequest({
    endpoint: `droplets/${digitalocean.id}/reboot`,
    nextFn
  });
}

export function rebuild({digitalocean}, image, nextFn) {
  getImages(images => {
    const match = getMatching(images, image);
    if (!match) {
      return utils.die(`No image found that matches "${image}".`);
    }

    eventedRequest({
      endpoint: `droplets/${digitalocean.id}/rebuild`,
      query: { image_id: match.id },
      nextFn
    });
  });
}

export function resize(instance, size, nextFn) {
  getSizes(sizes => {
    const match = getMatching(sizes, size);
    if (!match) {
      return utils.die(`No size found that matches "${size}".`);
    }

    shutdown(instance, () => {
      eventedRequest({
        endpoint: `droplets/${instance.digitalocean.id}/resize`,
        query: { size_id: match.id },
        nextFn
      });
    });
  });
}

export function getKeys(nextFn) {
  request({
    endpoint: 'ssh_keys',
    nextFn: (result) => {
      if (result && result.ssh_keys) {
        nextFn(result.ssh_keys);
      }
    }
  });
}

export function createKey(keyData, nextFn) {
  request({
    endpoint: 'ssh_keys/new',
    query: {
      name: utils.createHashedKeyName(keyData),
      ssh_pub_key: `${keyData}`
    },
    nextFn: (result) => {
      if (result && result.ssh_key) {
        nextFn(result.ssh_key);
      }
    }
  });
}

export function getImages(nextFn) {
  request({
    endpoint: 'images',
    nextFn: (result) => {
      if (result && result.images) {
        nextFn(returnOnlyIDNameSlug(result.images));
      }
    }
  });
}

export function getSnapshots(nextFn) {
  request({
    endpoint: 'images',
    query: { filter: 'my_images' },
    nextFn: (result) => {
      if (result && result.images) {
        nextFn(returnOnlyIDNameSlug(result.images));
      }
    }
  });
}

export function getInstances(args, nextFn) {
  request({
    endpoint: 'droplets',
    nextFn: (result) => {
      if (result && result.droplets) {
        nextFn(result.droplets);
      }
    }
  });
}

export function getInstance(instance, nextFn) {
  // create passes in an id, since instance doesn't exist yet.
  const id = utils.isObject(instance) && instance.digitalocean && instance.digitalocean.id ?
    instance.digitalocean.id : instance;

  request({
    endpoint: `droplets/${id}`,
    nextFn: (result) => {
      if (result && result.droplet) {
        nextFn(result.droplet);
      }
    }
  });
}

export function updateInstanceMetadata(instance, nextFn = () => {}) {
  getInstance(instance, droplet => {
    utils.updateInstance(instance.name, {
      ip: droplet.ip_address,
      digitalocean: droplet
    });

    nextFn();
  });
}

export function getRegions(nextFn = () => {}) {
  request({
    endpoint: 'regions',
    nextFn: (result) => {
      if (result && result.regions) {
        nextFn(result.regions);
      }
    }
  });
}

export function getSizes(nextFn = () => {}) {
  request({
    endpoint: 'sizes',
    nextFn: (result) => {
      if (result && result.sizes) {
        nextFn(result.sizes);
      }
    }
  });
}

export function sync(instance, nextFn = () => {}) {
  getInstances((instances) => {
    let match = utils.findUsingMultipleKeys(instances, instance.name, ['name']);

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

    nextFn(match);
  });
}

// Internal functions

function returnOnlyIDNameSlug(collection) {
  return collection.map((obj) => {
    return {
      id: obj.id,
      name: obj.name,
      slug: obj.slug
    };
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

export function normalizeAndFindPropertiesForCreate(args, nextFn = () => {}) {
  args.image = args.image || args['image-id'] || args['image-slug'] || args['image-name'] || 'ubuntu-14-04-x64';
  args.size = args.size || args['size-id'] || args['size-slug'] || args['size-name'] || '512mb';
  args.region = args.region || args['region-id'] || args['region-slug'] || args['region-name'] || 'nyc3';

  getImages(images => {
    const matchingImage = getMatching(images, args.image);
    if (!matchingImage) {
      return utils.die(`No image found that matches "${args.image}".`);
    }
    getSizes(sizes => {
      const matchingSize = getMatching(sizes, args.size);
      if (!matchingSize) {
        return utils.die(`No size found that matches "${args.size}".`);
      }
      getRegions(regions => {
        const matchingRegion = getMatching(regions, args.region);
        if (!matchingRegion) {
          return utils.die(`No region found that matches "${args.region}".`);
        }

        ['image', 'image-id', 'image-slug', 'image-name', 'size', 'size-id',
          'size-slug', 'size-name', 'region', 'region-id', 'region-slug', 'region-name'].forEach(key => {
          delete args[key];
        });

        args['image-id'] = matchingImage.id;
        args['size-id'] = matchingSize.id;
        args['region-id'] = matchingRegion.id;

        nextFn();
      });
    });
  });
}

function getMatching(collection, val) {
  return utils.findUsingMultipleKeys(collection, val, ['id', 'name', 'slug']);
}

function waitForEventToFinish(event_id, nextFn = () => {}) {
  let percentage = 0;
  let response = {};

  const eventTimeout = setTimeout(() => {
    log.alert(`This event has not finished in ${EVENT_TIMEOUT_NAME}, assuming it finished successfully...`);
    percentage = 100;
  }, EVENT_TIMEOUT);

  utils.progressBar(() => {
    return percentage;
  }, () => {
    clearTimeout(eventTimeout);
    nextFn(response);
  });

  const requestLoop = () => {
    request({
      endpoint: `events/${event_id}`,
      nextFn: (result) => {
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

export function eventedRequest({ endpoint, query, nextFn }) {
  request({
    endpoint: endpoint,
    query: query,
    nextFn: (result) => {
      if (result && result.event_id) {
        waitForEventToFinish(result.event_id, nextFn);
      }
    }
  });
}

// request({
//   endpoint: 'droplets/new',
//   type: 'GET',
//   query: { client_id: 'abc123', api_key: 'abc123', ... },
//   data: {},
//   nextFn: function (stderr, stdout) {}
// });
export function request(options) {
  const variables = utils.getVariables();
  options.query = options.query || {};
  options.query.client_id = variables.DIGITALOCEAN_CLIENT_ID;
  options.query.api_key = variables.DIGITALOCEAN_API_KEY;

  if (!variables.DIGITALOCEAN_CLIENT_ID || !variables.DIGITALOCEAN_API_KEY) {
    log.failure('The variables DIGITALOCEAN_CLIENT_ID and DIGITALOCEAN_API_KEY are not set.');
    log.failure('Go to https://cloud.digitalocean.com/api_access to get these variables,');
    log.failure('then run the following commands:');
    log.failure('overcast var set DIGITALOCEAN_CLIENT_ID [your_client_id]');
    return utils.die('overcast var set DIGITALOCEAN_API_KEY [your_api_key]');
  }

  const args = constructCurlArgs(options);

  if (DEBUG) {
    log.log(`curl ${args.join(' ')}`);
  }

  const curl = cp.spawn('curl', args);
  let stderr = null;
  let stdout = '';

  curl.stdout.on('data', data => {
    stdout += data;
  });

  curl.stderr.on('data', data => {
    stderr += data;
  });

  curl.on('close', code => {
    if (code !== 0) {
      return utils.die(`Got a non-zero exit code from DigitalOcean API (${code}).`);
    }

    try {
      stdout = JSON.parse(stdout);
    } catch (e) {
      return utils.die(`Exception thrown while parsing DigitalOcean API output: ${stdout}`);
    }

    if (DEBUG) {
      log.log(JSON.stringify(stdout, null, 4));
    }

    if (stdout && stdout.status && stdout.status === 'ERROR') {
      if (utils.isFunction(options.onError)) {
        options.onError(stdout);
      }
      return utils.die(`Error response from API: ${stdout.error_message}`);
    } else if (stdout && stdout.status && stdout.status === 'OK') {
      if (utils.isFunction(options.nextFn)) {
        options.nextFn(stdout);
      }
    } else {
      return utils.die(`Error response from API: ${stderr}`);
    }
  });
}

function constructCurlArgs({ endpoint, query, type, data }) {
  const url = `${API_URL + endpoint}?${querystring.stringify(query || {})}`;
  const args = ['-s', '-X', type || 'GET'];

  if (data) {
    args.push('-d', JSON.stringify(data));
  }
  args.push(url);

  return args;
}
