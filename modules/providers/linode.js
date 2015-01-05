var fs = require('fs');
var crypto = require('crypto');
var Promise = require('bluebird');
var _ = require('lodash');
var utils = require('../utils');

var DEBUG = false;

exports.id = 'linode';
exports.name = 'Linode';

// Provider interface

exports.boot = function (instance, callback) {
  exports.bootLinode({ 'linode-name': instance.name })
    .then(exports.waitForPendingJobs)
    .then(function () {
      if (_.isFunction(callback)) {
        callback();
      }
    });
};

exports.create = function (args, callback) {
  exports.createRequest(args).then(function (res) {
    var instance = {
      ip: res.linode.ip,
      name: args.name,
      ssh_key: args['ssh-key'] || 'overcast.key',
      ssh_port: '22',
      user: 'root',
      linode: res.linode
    };

    if (_.isFunction(callback)) {
      callback(instance);
    }
  });
};

exports.destroy = function (instance, callback) {
  exports.shutdownLinode({ 'linode-name': instance.name })
    .then(exports.deleteDisks)
    .then(exports.deleteLinode)
    .catch(exports.errorCatcher).then(function () {
      if (_.isFunction(callback)) {
        callback();
      }
    });
};

exports.getImages = function (callback) {
  exports.getDistributions().then(function (distributions) {
    if (_.isFunction(callback)) {
      callback(distributions);
    }
  });
};

exports.getInstances = function (args, callback) {
  exports.getLinodes().then(function (instances) {
    if (_.isFunction(callback)) {
      callback(instances);
    }
  });
};

exports.getKernels = function (callback) {
  exports.getLinodeKernels().then(function (kernels) {
    if (_.isFunction(callback)) {
      callback(kernels);
    }
  });
};

exports.getRegions = function (callback) {
  exports.getDatacenters().then(function (datacenters) {
    if (_.isFunction(callback)) {
      callback(datacenters);
    }
  });
};

exports.getSizes = function (callback) {
  exports.getPlans().then(function (plans) {
    if (_.isFunction(callback)) {
      callback(plans);
    }
  });
};

exports.reboot = function (instance, callback) {
  exports.rebootLinode({ 'linode-name': instance.name })
    .then(exports.waitForPendingJobs)
    .then(function () {
      if (_.isFunction(callback)) {
        callback();
      }
    });
};

exports.resize = function (instance, size, callback) {
  exports.getPlans().then(function (plans) {
    var matchingPlan = getMatching(plans, size);
    if (!matchingPlan) {
      utils.die('No size found matching "' + size + '".');
    }
    var data = {
      'linode-name': instance.name,
      'plan-id': matchingPlan.id
    };
    exports.resizeLinode(data).then(function () {
      if (_.isFunction(callback)) {
        callback();
      }
    });
  });
};

exports.shutdown = function (instance, callback) {
  exports.shutdownLinode({ 'linode-name': instance.name })
    .then(exports.waitForPendingJobs)
    .then(function () {
      if (_.isFunction(callback)) {
        callback();
      }
    });
};

exports.updateInstanceMetadata = function (instance, callback) {
  exports.getLinode({ 'linode-name': instance.name })
    .catch(exports.errorCatcher)
    .then(function (linodes) {
      utils.updateInstance(instance.name, {
        linode: linodes[0]
      });

      if (_.isFunction(callback)) {
        callback();
      }
    });
};

exports.sync = exports.updateInstanceMetadata;

// Internal functions

exports.generateRandomPassword = function (length) {
  return crypto.randomBytes(length || 20).toString('hex');
};

exports.request = function (action, data, callback) {
  if (!exports.client) {
    var variables = utils.getVariables();
    if (!variables.LINODE_API_KEY) {
      utils.red('Missing LINODE_API_KEY.');
      return utils.die('Please add to ' + utils.VARIABLES_JSON);
    }

    exports.client = new(require('linode-api').LinodeClient)(variables.LINODE_API_KEY);
  }

  return exports.client.call(action, data, callback);
};

// linode-id
// linode-name
exports.getLinodes = exports.getLinode = function (args) {
  args = args || {};
  return exports.normalizeArgs(args).then(function (args) {
    return apiPromise({
      action: 'linode.list',
      data: args['linode-id'] ? { LinodeID: args['linode-id'] } : null,
      mapper: function (obj) {
        return {
          id: obj.LINODEID,
          name: obj.LABEL,
          distribution: obj.DISTRIBUTIONVENDOR,
          status: obj.STATUS,
          datacenter_id: obj.DATACENTERID,
          disk: obj.TOTALHD,
          ram: obj.TOTALRAM
        };
      }
    });
  }).map(function (linode) {
    return new Promise(function (resolve, reject) {
      var args = {};
      args['linode-id'] = linode.id;
      exports.getDisksForLinode(args).then(function (disks) {
        linode.disks = disks;
        resolve(linode);
      });
    });
  }).map(function (linode) {
    return new Promise(function (resolve, reject) {
      var args = {};
      args['linode-id'] = linode.id;
      exports.getIPsForLinode(args).then(function (IPs) {
        linode.IPs = IPs;
        var publicAddress = _.find(IPs, 'public');
        if (publicAddress) {
          linode.ip = publicAddress.address;
        }
        resolve(linode);
      });
    });
  });
};

// linode-id
// linode-name
exports.getDisksForLinode = function (args) {
  return exports.normalizeArgs(args).then(function (args) {
    return apiPromise({
      action: 'linode.disk.list',
      data: { LinodeID: args['linode-id'] },
      mapper: function (obj) {
        return {
          name: obj.LABEL,
          id: obj.DISKID,
          status: obj.STATUS,
          type: obj.TYPE,
          size: obj.SIZE
        };
      }
    });
  });
};

exports.getIPsForLinode = function (args) {
  return exports.normalizeArgs(args).then(function (args) {
    return apiPromise({
      action: 'linode.ip.list',
      data: { LinodeID: args['linode-id'] },
      mapper: function (obj) {
        return {
          address: obj.IPADDRESS,
          id: obj.IPADDRESSID,
          public: !!obj.ISPUBLIC
        };
      }
    });
  });
};

// linode-id
// linode-name
// job-id
// pending-only
exports.getJobs = function (args) {
  return exports.normalizeArgs(args).then(function (args) {
    var data = {
      LinodeID: parseInt(args['linode-id'], 10),
      pendingOnly: args['pending-only'] ? 1 : 0 // true/false do not work!
    };
    if (args['job-id']) {
      data.JobID = parseInt(args['job-id'], 10);
    }
    return apiPromise({
      action: 'linode.job.list',
      data: data,
      mapper: function (obj) {
        return {
          action: obj.ACTION,
          date_started: obj.HOST_START_DT,
          date_finished: obj.HOST_FINISH_DT,
          duration: obj.DURATION,
          id: obj.JOBID,
          name: obj.LABEL,
          success: obj.HOST_SUCCESS
        };
      }
    });
  });
};

// linode-id
// linode-name
exports.waitForPendingJobs = function (args) {
  return exports.normalizeArgs(args).then(function (args) {
    var pendingJobCount, startingJobCount;
    args['pending-only'] = true;

    utils.grey('Waiting for pending jobs...');
    var progressBarInterval = utils.progressBar(function () {
      if (!startingJobCount) {
        return 0;
      } else if (startingJobCount && pendingJobCount === 0) {
        return 99;
      }
      return ((startingJobCount - pendingJobCount) / startingJobCount) * 100;
    });

    function whileFn() {
      return !_.isNumber(pendingJobCount) || pendingJobCount > 0;
    }

    function checkPendingJobCount() {
      return Promise.delay(3000).then(function () {
        return exports.getJobs(args);
      }).then(function (pendingJobs) {
        pendingJobCount = pendingJobs.length;
        if (!startingJobCount) {
          startingJobCount = pendingJobCount;
        }
        return Promise.resolve();
      });
    }

    return utils.promiseWhile(whileFn, checkPendingJobCount).then(function () {
      clearInterval(progressBarInterval);
      utils.progressComplete();
      utils.success(startingJobCount + ' jobs finished.');

      return resolver(args);
    });
  });
};

exports.getDistributions = function () {
  return apiPromise({
    action: 'avail.distributions',
    mapper: function (obj) {
      return {
        id: obj.DISTRIBUTIONID,
        name: obj.LABEL,
        slug: slugify(obj.LABEL)
      };
    }
  });
};

exports.getLinodeKernels = function () {
  return apiPromise({
    action: 'avail.kernels',
    mapper: function (obj) {
      return {
        id: obj.KERNELID,
        name: obj.LABEL,
        pvops: obj.ISPVOPS,
        xen: obj.ISXEN
      };
    }
  });
};

exports.getPlans = function () {
  return apiPromise({
    action: 'avail.linodeplans',
    mapper: function (obj) {
      return {
        id: obj.PLANID,
        name: obj.LABEL,
        slug: obj.RAM,
        price: obj.PRICE,
        ram: obj.RAM,
        disk: obj.DISK,
        transfer: obj.XFER
      };
    }
  });
};

exports.getDatacenters = function () {
  return apiPromise({
    action: 'avail.datacenters',
    mapper: function (obj) {
      return {
        id: obj.DATACENTERID,
        name: obj.LOCATION,
        slug: obj.ABBR
      };
    }
  });
};

exports.createRequest = function (args) {
  var linode = {};

  return exports.normalizeArgs(args)
    .then(function (args) {
      linode = args;
      return resolver(linode);
    })
    .then(exports.createLinode)
    .then(exports.waitForPendingJobs)
    .then(exports.createDiskFromDistribution)
    .then(exports.createSwapDisk)
    .then(exports.waitForPendingJobs)
    .then(exports.createConfig)
    .then(exports.waitForPendingJobs)
    .then(exports.bootLinode)
    .then(exports.waitForPendingJobs)
    .then(exports.getLinodes)
    .then(function (linodes) {
      linode.linode = linodes[0];
      return resolver(linode);
    })
    .catch(exports.errorCatcher);
};

// name
// region || datacenter-slug || datacenter-id || 6 (Newark)
// size || plan-slug || plan-id || 1 (1024)
// payment-term || 1 (Monthly, if not metered)
exports.createLinode = function (args) {
  var linode = {};
  return exports.normalizeArgs(args).then(function (args) {
    linode = args;
    return apiPromise({
      action: 'linode.create',
      data: {
        DatacenterID: args['datacenter-id'] || 6, // Defaults to Newark
        PlanID: args['plan-id'] || 1, // Defaults to 1024
        PaymentTerm: args['payment-term'] || 1 // Defaults to monthly (if not metered)
      },
      transform: function (res) {
        linode['linode-id'] = res.LinodeID;
      }
    });
  }).then(function () {
    return new Promise(function (resolve, reject) {
      if (linode.name) {
        return apiPromise({
          action: 'linode.update',
          data: { Label: linode.name, LinodeID: linode['linode-id'] },
          transform: function (res) {
            resolve(linode);
          }
        }).catch(exports.errorCatcher);
      } else {
        resolve(linode);
      }
    });
  });
};

// linode-id || linode-name
// size || plan-id || plan-slug
exports.resizeLinode = function (args) {
  return new Promise(function (resolve, reject) {
    exports.normalizeArgs(args).then(function (args) {
      exports.request('linode.resize', {
        LinodeID: args['linode-id'],
        PlanID: args['plan-id'] || 1 // Defaults to 1024
      }, function (err, res) {
        // Y U error on success Linode?
        if (err === 'ok') {
          resolve(args);
        } else {
          reject(new Error(err));
        }
      });
    });
  }).then(exports.waitForPendingJobs).catch(exports.errorCatcher);
};

// linode-id || linode-name
// kernel || kernel-id || kernel-name
exports.createConfig = function (args) {
  if (!args['kernel'] && !args['kernel-id'] && !args['kernel-name']) {
    args['kernel'] = 'Latest 64 bit';
  }

  return exports.normalizeArgs(args).then(exports.addLinodeToArgs).then(function (args) {
    return apiPromise({
      action: 'linode.config.create',
      data: {
        LinodeID: args['linode-id'],
        KernelID: args['kernel-id'],
        Label: args.linode.name + ' Config',
        DiskList: _.pluck(args.linode.disks, 'id').join(',')
      },
      transform: function (res) {
        args['config-id'] = res.ConfigID;
        return args;
      }
    });
  });
};

// linode-id || linode-name
// image || distribution-slug || distribution-id || ubuntu-14-04-lts
// password
// ssh-key
exports.createDiskFromDistribution = function (args) {
  utils.grey('Creating main disk...');

  if (!args.password) {
    args.password = exports.generateRandomPassword();
    console.log('Using random password for root:');
    console.log(args.password);
  }

  args['ssh-pub-key'] = utils.normalizeKeyPath(args['ssh-pub-key'], 'overcast.key.pub');
  args['ssh-key-data'] = fs.readFileSync(args['ssh-pub-key'], 'utf8') + '';

  if (!args['image'] && !args['distribution-id'] && !args['distribution-slug']) {
    args['distribution-slug'] = 'ubuntu-14-04-lts';
  }

  return exports.normalizeArgs(args).then(exports.addLinodeToArgs).then(function (args) {
    return apiPromise({
      action: 'linode.disk.createFromDistribution',
      data: {
        DistributionID: args['distribution-id'],
        Label: args.linode.name + ' Disk',
        LinodeID: args['linode-id'],
        rootPass: args.password,
        rootSSHKey: args['ssh-key-data'] || '',
        Size: args.linode.disk - (args.swap || 256)
      },
      transform: function () {
        return args;
      }
    });
  });
};

// linode-id || linode-name
exports.createSwapDisk = function (args) {
  utils.grey('Creating ' + (args.swap || 256) + 'MB swap disk...');

  return exports.normalizeArgs(args).then(function (args) {
    return apiPromise({
      action: 'linode.disk.create',
      data: {
        Label: 'Swap Disk',
        LinodeID: args['linode-id'],
        Size: args.swap || 256, // in MB
        Type: 'swap'
      },
      transform: function () {
        return args;
      }
    });
  });
};

// disk-id
// linode-id || linode-name
exports.deleteDisk = function (args) {
  return exports.normalizeArgs(args).then(function (args) {
    return apiPromise({
      action: 'linode.disk.delete',
      data: {
        DiskID: args['disk-id'],
        LinodeID: args['linode-id']
      },
      transform: function () {
        return args;
      }
    });
  });
};

// linode-id || linode-name
exports.deleteDisks = function (args) {
  return exports.normalizeArgs(args).then(exports.addLinodeToArgs).then(function (args) {
    _.each(args.linode.disks, function (disk) {
      utils.grey('Deleting disk "' + disk.name + '" from linode "' + args.linode.name + '"...');
      apiPromise({
        action: 'linode.disk.delete',
        data: {
          DiskID: disk.id,
          LinodeID: args['linode-id']
        },
        transform: function () {
          return args;
        }
      });
    });

    return resolver(args);
  }).delay(5000).then(exports.waitForPendingJobs);
};

// linode-id || linode-name
_.each(['boot', 'delete', 'reboot', 'shutdown'], function (methodName) {
  exports[methodName + 'Linode'] = function (args) {
    return exports.normalizeArgs(args).then(function (args) {
      utils.grey('Starting ' + methodName + ' of Linode "' + args['linode-id'] + '"...');
      var data = { LinodeID: args['linode-id'] };
      if (args['config-id']) {
        data.ConfigID = args['config-id'];
      }
      return apiPromise({
        action: 'linode.' + methodName,
        data: data,
        transform: function () {
          return args;
        }
      });
    }).catch(exports.errorCatcher);
  };
});

exports.addLinodeToArgs = function (args) {
  args = args || {};
  return new Promise(function (resolve, reject) {
    exports.getLinode(args).then(function (linodes) {
      args.linode = linodes[0];
      resolve(args);
    }).catch(function (err) {
      reject(err);
    });
  });
};

exports.normalizeArgs = function (args) {
  return new Promise(function (resolve, reject) {
    if (args['linode-name']) {
      return getLinodeIDFromName(args, exports.normalizeArgs, resolve, reject);
    }
    if (args.size || args['plan-slug']) {
      return getPlanIDFromSlug(args, exports.normalizeArgs, resolve, reject);
    }
    if (args.region || args['datacenter-slug']) {
      return getDatacenterIDFromSlug(args, exports.normalizeArgs, resolve, reject);
    }
    if (args.image || args['distribution-slug']) {
      return getDistributionIDFromSlug(args, exports.normalizeArgs, resolve, reject);
    }
    if (args.kernel || args['kernel-name']) {
      return getKernelIDFromName(args, exports.normalizeArgs, resolve, reject);
    }
    resolve(args);
  });
};

exports.errorCatcher = function (e) {
  utils.die('Linode API Error: ' + (e.message ? e.message : e));
};

function getLinodeIDFromName(args, fn, resolve, reject) {
  return exports.getLinodes().then(function (linodes) {
    var key = args['linode-name'];
    var found = _.find(linodes, { name: key });
    if (found) {
      delete args['linode-name'];
      args['linode-id'] = found.id;
      fn(args).then(resolve);
    } else {
      utils.die('No linode found matching "' + key + '".');
    }
  });
}

function getKernelIDFromName(args, fn, resolve, reject) {
  return exports.getLinodeKernels().then(function (kernels) {
    var key = args.kernel || args['kernel-name'];
    var found = _.find(kernels, function (kernel) {
      return kernel.name.indexOf(key) !== -1;
    });
    if (found) {
      delete args.kernel;
      delete args['kernel-name'];
      args['kernel-id'] = found.id;
      fn(args).then(resolve);
    } else {
      utils.die('No kernel found matching "' + key + '".');
    }
  });
}

function getDistributionIDFromSlug(args, fn, resolve, reject) {
  return exports.getDistributions().then(function (distributions) {
    var key = args.image || args['distribution-slug'];
    var found = getMatching(distributions, key);
    if (found) {
      delete args.image;
      delete args['distribution-slug'];
      args['distribution-id'] = found.id;
      fn(args).then(resolve);
    } else {
      utils.die('No image found matching "' + key + '".');
    }
  });
}

function getPlanIDFromSlug(args, fn, resolve, reject) {
  return exports.getPlans().then(function (plans) {
    var key = args.size || args['plan-slug'];
    var found = getMatching(plans, key);
    if (found) {
      delete args.size;
      delete args['plan-slug'];
      args['plan-id'] = found.id;
      fn(args).then(resolve);
    } else {
      utils.die('No size found matching "' + key + '".');
    }
  });
}

function getDatacenterIDFromSlug(args, fn, resolve, reject) {
  return exports.getDatacenters().then(function (datacenters) {
    var key = args.region || args['datacenter-slug'];
    var found = getMatching(datacenters, key);
    if (found) {
      delete args.region;
      delete args['datacenter-slug'];
      args['datacenter-id'] = found.id;
      fn(args).then(resolve);
    } else {
      utils.die('No region found matching "' + key + '".');
    }
  });
}

function getMatching(collection, val) {
  var matchAsString = utils.findUsingMultipleKeys(collection, val, ['id', 'name', 'slug']);
  var matchAsInt = utils.findUsingMultipleKeys(collection, parseInt(val, 10), ['id', 'name', 'slug']);
  return matchAsString || matchAsInt;
}

function apiPromise(options) {
  if (DEBUG) {
    console.log(JSON.stringify(options, null, 2));
  }

  return new Promise(function (resolve, reject) {
    exports.request(options.action, options.data || {}, function (err, collection) {
      if (DEBUG) {
        console.log(err, collection);
      }
      if (err) {
        return reject(err);
      }
      if (options.mapper) {
        collection = _.map(collection, options.mapper);
      }
      if (options.transform) {
        collection = options.transform(collection);
      }
      resolve(collection);
    });
  });
}

function resolver(resolveTo) {
  return new Promise(function (resolve) {
    resolve(resolveTo);
  });
}

function slugify(str) {
  return str.replace(/[^a-zA-Z0-9]/g, '-').trim().toLowerCase();
}
