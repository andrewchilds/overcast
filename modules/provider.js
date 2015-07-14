var _ = require('lodash');
var readline = require('readline');
var utils = require('./utils');

exports.handleCommandNotFound = function (fn) {
  if (!_.isFunction(fn)) {
    utils.die('Command not supported by provider.');
  }
};

exports.create = function (api, args, callback) {
  exports.handleCommandNotFound(api.create);

  utils.grey('Creating new instance "' + args.name + '" on ' + api.name + '...');
  api.create(args, function (instance) {
    utils.saveInstanceToCluster(args.cluster, instance);
    utils.success('Instance "' + args.name + '" (' + instance.ip + ') saved.');
    utils.waitForBoot(instance, callback);
  });
};

exports.destroy = function (api, args, callback) {
  exports.handleCommandNotFound(api.destroy);

  var onDestroy = function () {
    utils.success('Instance "' + args.instance.name + '" destroyed.');
    utils.deleteInstance(args.instance, callback);
  };

  if (args.force) {
    return api.destroy(args.instance, onDestroy);
  }

  var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  var q = 'Do you really want to destroy "' + args.instance.name + '"? [Y/n]';
  rl.question(q.yellow, function (answer) {
    rl.close();
    if (answer !== '' && answer !== 'Y' && answer !== 'y') {
      utils.grey('No action taken.');
    } else {
      api.destroy(args.instance, onDestroy);
    }
  });
};

exports.boot = function (api, args, callback) {
  exports.handleCommandNotFound(api.boot);

  utils.grey('Booting "' + args.instance.name + '"...');
  api.boot(args.instance, function () {
    utils.success('Instance "' + args.instance.name + '" booted.');
    utils.waitForBoot(args.instance, callback);
  });
};

exports.shutdown = function (api, args, callback) {
  exports.handleCommandNotFound(api.shutdown);

  utils.grey('Shutting down "' + args.instance.name + '"...');
  api.shutdown(args.instance, function () {
    utils.success('Instance "' + args.instance.name + '" has been shut down.');
    if (_.isFunction(callback)) {
      callback();
    }
  });
};

exports.reboot = function (api, args, callback) {
  exports.handleCommandNotFound(api.reboot);

  utils.grey('Rebooting "' + args.instance.name + '"...');
  api.reboot(args.instance, function () {
    utils.success('Instance "' + args.instance.name + '" rebooted.');
    utils.waitForBoot(args.instance, callback);
  });
};

exports.rebuild = function (api, args, callback) {
  exports.handleCommandNotFound(api.rebuild);

  utils.grey('Rebuilding "' + args.instance.name + '" using image "' + args.image + '"...');
  api.rebuild(args.instance, args.image, function () {
    exports.updateInstanceMetadata(api, args, function () {
      utils.success('Instance "' + args.instance.name + '" rebuilt.');
      utils.waitForBoot(args.instance, callback);
    });
  });
};

exports.resize = function (api, args, callback) {
  exports.handleCommandNotFound(api.resize);

  utils.grey('Resizing "' + args.instance.name + '" to "' + args.size + '"...');
  api.resize(args.instance, args.size, function () {
    exports.updateInstanceMetadata(api, args, function () {
      utils.success('Instance "' + args.instance.name + '" resized.');
      if (args.skipBoot || args['skip-boot']) {
        utils.grey('Skipping boot since --skip-boot flag was used.');
        if (_.isFunction(callback)) {
          callback();
        }
      } else {
        exports.boot(api, args, callback);
      }
    });
  });
};

exports.snapshot = function (api, args, callback) {
  exports.handleCommandNotFound(api.snapshot);

  utils.grey('Saving snapshot "' + args.snapshotName + '" of "' + args.instance.name + '"...');
  api.snapshot(args.instance, args.snapshotName, function () {
    utils.success('Snapshot "' + args.snapshotName + '" of "' + args.instance.name + '" saved.');
    utils.waitForBoot(args.instance, callback);
  });
};

// AKA distributions (Linode).
exports.images = function (api, callback) {
  exports.handleCommandNotFound(api.getImages);

  api.getImages(function (images) {
    utils.printCollection('images', images);
    if (_.isFunction(callback)) {
      callback();
    }
  });
};

// AKA droplets (DO) or linodes (Linode).
exports.instances = function (api, args, callback) {
  exports.handleCommandNotFound(api.getInstances);

  // AWS needs args.region, DigitalOcean does not.
  api.getInstances(args, function (instances) {
    utils.printCollection('instances', instances);
    if (_.isFunction(callback)) {
      callback();
    }
  });
};

exports.instance = function (api, args, callback) {
  exports.handleCommandNotFound(api.getInstance);

  api.getInstance(args.instance, callback);
};

exports.updateInstanceMetadata = function (api, args, callback) {
  exports.handleCommandNotFound(api.updateInstanceMetadata);

  api.updateInstanceMetadata(args.instance, callback);
};

exports.sync = function (api, args, callback) {
  exports.handleCommandNotFound(api.sync);

  utils.grey('Fetching metadata for "' + args.instance.name + '"...');
  api.sync(args.instance, function () {
    utils.success('Metadata for "' + args.instance.name + '" updated.');
    if (_.isFunction(callback)) {
      callback();
    }
  });
};

exports.kernels = function (api, callback) {
  exports.handleCommandNotFound(api.getKernels);

  api.getKernels(function (kernels) {
    utils.printCollection('kernels', kernels);
    if (_.isFunction(callback)) {
      callback();
    }
  });
};

// AKA datacenters (Linode).
exports.regions = function (api, callback) {
  exports.handleCommandNotFound(api.getRegions);

  api.getRegions(function (regions) {
    utils.printCollection('regions', regions);
    if (_.isFunction(callback)) {
      callback();
    }
  });
};

// AKA types (AWS) or plans (Linode).
exports.sizes = function (api, callback) {
  exports.handleCommandNotFound(api.getSizes);

  api.getSizes(function (sizes) {
    utils.printCollection('sizes', sizes);
    if (_.isFunction(callback)) {
      callback();
    }
  });
};

exports.snapshots = function (api, callback) {
  exports.handleCommandNotFound(api.getSnapshots);

  api.getSnapshots(function (snapshots) {
    utils.printCollection('snapshots', snapshots);
    if (_.isFunction(callback)) {
      callback();
    }
  });
};

// AKA distributions (Linode).
exports.addprivate = function (api, args, callback) {
  exports.handleCommandNotFound(api.addPrivate);

  utils.grey('Creating private ip on "' + args.instance.name + '"...');
  api.addPrivate(args.instance, function () {
    utils.success('Instance "' + args.instance.name + '" has private ip.');
    if (_.isFunction(callback)) {
      callback();
    }
  });
};
