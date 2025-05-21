import https from 'https';
import fs from 'fs';
import * as log from '../log.js';
import * as utils from '../utils.js';

export const api = {
  id: 'vultr',
  name: 'Vultr'
};

export const DEFAULT_IMAGE = 'ubuntu_20_04_x64'; // Ubuntu 20.04 x64
export const DEFAULT_PLAN = 'vc2-1c-1gb'; // 1 CPU, 1GB RAM
export const DEFAULT_REGION = 'ewr'; // New Jersey (NJ)

// Provider interface
api.create = (args, nextFn) => {
  args['ssh-pub-key'] = utils.normalizeKeyPath(args['ssh-pub-key'], 'overcast.key.pub');

  normalizeAndFindPropertiesForCreate(args, () => {
    getOrCreateOvercastKeyID(args['ssh-pub-key'], keyID => {
      const data = {
        region: args['region-id'],
        plan: args['plan-id'],
        sshkey_id: [keyID],
        label: args.name,
        hostname: args.name,
        enable_ipv6: utils.argIsTruthy(args['enable-ipv6']),
        enable_private_network: utils.argIsTruthy(args['enable-private-network']),
        activation_email: utils.argIsTruthy(args['activation-email']),
      };

      // Add OS or image ID (but not both)
      if (args['os-id']) {
        data.os_id = args['os-id'];
      } else if (args['image-id']) {
        data.image_id = args['image-id'];
      }

      // Remove any undefined values
      Object.keys(data).forEach(key => {
        if (data[key] === undefined) {
          delete data[key];
        }
      });

      _create(args, data, nextFn);
    });
  });
};

api.destroy = (instance, nextFn = () => {}) => {
  apiRequest({
    method: 'DELETE',
    path: `/instances/${instance.vultr.id}`
  }, () => {
    nextFn();
  });
};

api.boot = (instance, nextFn) => {
  apiRequest({
    method: 'POST',
    path: `/instances/${instance.vultr.id}/start`
  }, () => {
    api.updateInstanceMetadata(instance, nextFn);
  });
};

api.shutdown = (instance, nextFn) => {
  apiRequest({
    method: 'POST',
    path: `/instances/${instance.vultr.id}/halt`
  }, () => {
    api.updateInstanceMetadata(instance, nextFn);
  });
};

api.reboot = (instance, nextFn) => {
  apiRequest({
    method: 'POST',
    path: `/instances/${instance.vultr.id}/reboot`
  }, () => {
    api.updateInstanceMetadata(instance, nextFn);
  });
};

api.rebuild = (instance, imageIdOrOsId, nextFn) => {
  // First check OS list
  apiRequest({
    method: 'GET',
    path: '/os'
  }, osData => {
    const osList = osData.os || [];
    const foundOS = osList.find(os =>
      os.id.toString() === imageIdOrOsId.toString() ||
      os.name.toLowerCase() === imageIdOrOsId.toLowerCase() ||
      imageIdOrOsId.toLowerCase().includes(os.name.toLowerCase())
    );

    if (foundOS) {
      // It's an OS
      apiRequest({
        method: 'POST',
        path: `/instances/${instance.vultr.id}/reinstall`,
        data: {
          os_id: foundOS.id
        }
      }, () => {
        waitForInstanceToBecomeActive(instance.vultr.id, () => {
          api.updateInstanceMetadata(instance, nextFn);
        });
      });
    } else {
      // Check if it's an image
      apiRequest({
        method: 'GET',
        path: '/images'
      }, imagesData => {
        const images = imagesData.images || [];
        const foundImage = images.find(img =>
          img.id.toString() === imageIdOrOsId.toString() ||
          img.name.toLowerCase() === imageIdOrOsId.toLowerCase() ||
          imageIdOrOsId.toLowerCase().includes(img.name.toLowerCase())
        );

        if (foundImage) {
          apiRequest({
            method: 'POST',
            path: `/instances/${instance.vultr.id}/reinstall`,
            data: {
              image_id: foundImage.id
            }
          }, () => {
            waitForInstanceToBecomeActive(instance.vultr.id, () => {
              api.updateInstanceMetadata(instance, nextFn);
            });
          });
        } else {
          utils.die(`No OS or image found that matches "${imageIdOrOsId}".`);
        }
      });
    }
  });
};

api.resize = (instance, planId, nextFn) => {
  apiRequest({
    method: 'GET',
    path: '/plans'
  }, data => {
    const plans = data.plans || [];
    const foundPlan = plans.find(plan =>
      plan.id.toString() === planId.toString() ||
      plan.id.toLowerCase() === planId.toLowerCase() ||
      planId.toLowerCase().includes(plan.id.toLowerCase())
    );

    if (!foundPlan) {
      return utils.die(`No plan found that matches "${planId}".`);
    }

    // Check if instance is powered off
    api.getInstance(instance, vultrInstance => {
      if (vultrInstance.power_status === 'running') {
        log.faded('Shutting down instance before resize...');
        api.shutdown(instance, () => {
          waitForInstanceToBePoweredOff(instance.vultr.id, () => {
            performResize(instance, foundPlan.id, nextFn);
          });
        });
      } else {
        performResize(instance, foundPlan.id, nextFn);
      }
    });
  });
};

function performResize(instance, planId, nextFn) {
  apiRequest({
    method: 'POST',
    path: `/instances/${instance.vultr.id}/resize`,
    data: {
      plan: planId
    }
  }, () => {
    log.faded('Plan upgraded. Starting instance...');
    waitForInstanceToBecomeActive(instance.vultr.id, () => {
      api.boot(instance, nextFn);
    });
  });
}

api.snapshot = (instance, snapshotName, nextFn) => {
  // Check if instance is powered off
  api.getInstance(instance, vultrInstance => {
    if (vultrInstance.power_status === 'running') {
      log.faded('Shutting down instance before taking snapshot...');
      api.shutdown(instance, () => {
        waitForInstanceToBePoweredOff(instance.vultr.id, () => {
          createSnapshot(instance, snapshotName, nextFn);
        });
      });
    } else {
      createSnapshot(instance, snapshotName, nextFn);
    }
  });
};

function createSnapshot(instance, snapshotName, nextFn) {
  apiRequest({
    method: 'POST',
    path: `/instances/${instance.vultr.id}/snapshots`,
    data: {
      description: snapshotName
    }
  }, data => {
    log.faded('Snapshot creation started. This may take several minutes.');
    log.faded('Starting instance...');
    api.boot(instance, nextFn);
  });
}

api.getImages = (nextFn) => {
  // Combine OS list with snapshots and other images
  apiRequest({
    method: 'GET',
    path: '/os'
  }, osData => {
    const osList = osData.os || [];

    apiRequest({
      method: 'GET',
      path: '/images'
    }, imagesData => {
      const images = imagesData.images || [];

      const result = {
        os: osList.map(os => ({
          id: os.id,
          name: os.name,
          family: 'os',
          type: 'os'
        })),
        snapshots: images.filter(img => img.type === 'snapshot').map(img => ({
          id: img.id,
          name: img.name,
          description: img.description,
          size: img.size,
          status: img.status,
          type: 'snapshot'
        })),
        applications: images.filter(img => img.type === 'application').map(img => ({
          id: img.id,
          name: img.name,
          description: img.description,
          type: 'application'
        }))
      };

      nextFn(result);
    });
  });
};

api.getInstances = (args, nextFn) => {
  apiRequest({
    method: 'GET',
    path: '/instances'
  }, data => {
    nextFn(data.instances || []);
  });
};

api.getInstance = (instance, nextFn) => {
  const id = utils.isObject(instance) && instance.vultr ? instance.vultr.id : instance;

  apiRequest({
    method: 'GET',
    path: `/instances/${id}`
  }, data => {
    nextFn(data.instance);
  });
};

api.updateInstanceMetadata = (instance, nextFn = () => {}) => {
  api.getInstance(instance, vultrInstance => {
    utils.updateInstance(instance.name, {
      ip: vultrInstance.main_ip,
      vultr: vultrInstance
    }, () => {
      nextFn();
    });
  });
};

api.sync = api.updateInstanceMetadata;

api.getRegions = (nextFn) => {
  apiRequest({
    method: 'GET',
    path: '/regions'
  }, data => {
    nextFn(data.regions || []);
  });
};

api.getPlans = (nextFn) => {
  apiRequest({
    method: 'GET',
    path: '/plans'
  }, data => {
    nextFn(data.plans || []);
  });
};

api.getSizes = api.getPlans;

api.getSnapshots = (nextFn) => {
  apiRequest({
    method: 'GET',
    path: '/snapshots'
  }, data => {
    nextFn(data.snapshots || []);
  });
};

api.getKeys = (nextFn) => {
  apiRequest({
    method: 'GET',
    path: '/ssh-keys'
  }, data => {
    nextFn(data.ssh_keys || []);
  });
};

api.createKey = (keyData, nextFn) => {
  apiRequest({
    method: 'POST',
    path: '/ssh-keys',
    data: {
      name: utils.createHashedKeyName(keyData),
      ssh_key: keyData.trim()
    }
  }, data => {
    nextFn(data.ssh_key);
  });
};

// Internal functions

function apiRequest(options, nextFn) {
  const vars = utils.getVariables();
  const apiKey = vars.VULTR_API_KEY;

  if (!apiKey) {
    log.failure('The variable VULTR_API_KEY is not set.');
    log.failure('Go to https://my.vultr.com/settings/#settingsapi');
    log.failure('to get your API key, then run the following command:');
    return utils.die('overcast var set VULTR_API_KEY [your_api_key]');
  }

  const reqOptions = {
    hostname: 'api.vultr.com',
    port: 443,
    path: '/v2' + options.path,
    method: options.method || 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }
  };

  let reqData = '';
  if (options.data) {
    reqData = JSON.stringify(options.data);
    reqOptions.headers['Content-Length'] = Buffer.byteLength(reqData);
  }

  const req = https.request(reqOptions, (res) => {
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      try {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          if (data && data.trim()) {
            data = JSON.parse(data);
          } else {
            data = {};
          }
          nextFn(data);
        } else {
          let errorMessage = `Vultr API error: ${res.statusCode}`;
          try {
            if (data && data.trim()) {
              const errorData = JSON.parse(data);
              if (errorData.error) {
                errorMessage += ` - ${errorData.error}`;
              }
            }
          } catch (e) {
            // Parse error, just use the status code
          }
          utils.die(errorMessage);
        }
      } catch (e) {
        utils.die(`Error parsing Vultr API response: ${e.message}`);
      }
    });
  });

  req.on('error', (e) => {
    utils.die(`Error making request to Vultr API: ${e.message}`);
  });

  if (reqData) {
    req.write(reqData);
  }

  req.end();
}

function _create(args, data, nextFn) {
  apiRequest({
    method: 'POST',
    path: '/instances',
    data
  }, response => {
    if (response && response.instance) {
      log.success('Instance created!');
      log.faded('Waiting for it to boot up and get an IP address...');

      waitForInstanceToBecomeActive(response.instance.id, () => {
        api.getInstance(response.instance.id, instance => {
          const result = {
            name: args.name,
            ip: instance.main_ip,
            ssh_key: args['ssh-key'] || 'overcast.key',
            ssh_port: args['ssh-port'] || '22',
            user: 'root',
            vultr: instance
          };

          log.success(`Instance ready! IP: ${instance.main_ip}`);

          // Save the instance to the cluster
          utils.saveInstanceToCluster(args.cluster || 'default', result, () => {
            nextFn(result);
          });
        });
      });
    } else {
      utils.die('Failed to create Vultr instance.');
    }
  });
}

function waitForInstanceToBecomeActive(instanceId, nextFn) {
  api.getInstance(instanceId, instance => {
    // Main IP is set and status is active
    if (instance.status === 'active' && instance.main_ip && instance.main_ip !== '0.0.0.0') {
      if (instance.power_status === 'running') {
        nextFn(instance);
      } else {
        // Power it on if it's not running
        apiRequest({
          method: 'POST',
          path: `/instances/${instanceId}/start`
        }, () => {
          // Wait a bit before checking again
          setTimeout(() => {
            waitForInstanceToBecomeActive(instanceId, nextFn);
          }, 5000);
        });
      }
    } else {
      // Check again after a delay
      setTimeout(() => {
        waitForInstanceToBecomeActive(instanceId, nextFn);
      }, 5000);
    }
  });
}

function waitForInstanceToBePoweredOff(instanceId, nextFn) {
  api.getInstance(instanceId, instance => {
    if (instance.power_status === 'stopped') {
      nextFn(instance);
    } else {
      // Check again after a delay
      setTimeout(() => {
        waitForInstanceToBePoweredOff(instanceId, nextFn);
      }, 5000);
    }
  });
}

function normalizeAndFindPropertiesForCreate(args, nextFn) {
  args.image = args.image || args['image-id'] || args['os-id'] || DEFAULT_IMAGE;
  args.plan = args.plan || args['plan-id'] || DEFAULT_PLAN;
  args.region = args.region || args['region-id'] || DEFAULT_REGION;

  // Get OS list first to determine if the image is an OS or an image
  apiRequest({
    method: 'GET',
    path: '/os'
  }, osData => {
    const osList = osData.os || [];
    const foundOS = osList.find(os =>
      os.id.toString() === args.image.toString() ||
      os.name.toLowerCase() === args.image.toLowerCase() ||
      args.image.toLowerCase().includes(os.name.toLowerCase())
    );

    if (foundOS) {
      // It's an OS
      args['os-id'] = foundOS.id;
      continueWithPlanAndRegion();
    } else {
      // Check if it's an app/snapshot image
      apiRequest({
        method: 'GET',
        path: '/images'
      }, imagesData => {
        const images = imagesData.images || [];
        const foundImage = images.find(img =>
          img.id.toString() === args.image.toString() ||
          img.name.toLowerCase() === args.image.toLowerCase() ||
          imageIdOrOsId.toLowerCase().includes(img.name.toLowerCase())
        );

        if (foundImage) {
          args['image-id'] = foundImage.id;
          continueWithPlanAndRegion();
        } else {
          return utils.die(`No OS or image found that matches "${args.image}".`);
        }
      });
    }
  });

  function continueWithPlanAndRegion() {
    // Find plan
    apiRequest({
      method: 'GET',
      path: '/plans'
    }, data => {
      const plans = data.plans || [];
      const foundPlan = plans.find(plan =>
        plan.id.toString() === args.plan.toString() ||
        plan.id.toLowerCase() === args.plan.toLowerCase() ||
        args.plan.toLowerCase().includes(plan.id.toLowerCase())
      );

      if (!foundPlan) {
        return utils.die(`No plan found that matches "${args.plan}".`);
      }

      args['plan-id'] = foundPlan.id;

      // Find region
      apiRequest({
        method: 'GET',
        path: '/regions'
      }, data => {
        const regions = data.regions || [];
        const foundRegion = regions.find(region =>
          region.id.toString() === args.region.toString() ||
          region.id.toLowerCase() === args.region.toLowerCase() ||
          args.region.toLowerCase().includes(region.id.toLowerCase())
        );

        if (!foundRegion) {
          return utils.die(`No region found that matches "${args.region}".`);
        }

        args['region-id'] = foundRegion.id;

        // Clean up temporary args
        ['image', 'plan', 'region'].forEach(key => {
          delete args[key];
        });

        nextFn();
      });
    });
  }
}

function getOrCreateOvercastKeyID(pubKeyPath, nextFn) {
  const keyData = fs.readFileSync(pubKeyPath, 'utf8');
  const keyName = utils.createHashedKeyName(keyData);

  api.getKeys(keys => {
    const existingKey = keys.find(key => key.name === keyName);

    if (existingKey) {
      log.faded(`Using existing SSH key: ${pubKeyPath}`);
      nextFn(existingKey.id);
    } else {
      log.faded(`Uploading new SSH key: ${pubKeyPath}`);
      api.createKey(keyData, newKey => {
        nextFn(newKey.id);
      });
    }
  });
}
