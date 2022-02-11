import readline from 'readline';
import utils from './utils';

export function handleCommandNotFound(fn) {
  if (!utils.isFunction(fn)) {
    utils.die('Command not supported by provider.');
  }
}

export function create(api, args, callback) {
  exports.handleCommandNotFound(api.create);

  utils.grey(`Creating new instance "${args.name}" on ${api.name}...`);
  api.create(args, instance => {
    utils.saveInstanceToCluster(args.cluster, instance);
    utils.success(`Instance "${args.name}" (${instance.ip}) saved.`);
    utils.waitForBoot(instance, callback);
  });
}

export function destroy(api, args, callback) {
  exports.handleCommandNotFound(api.destroy);

  const onDestroy = () => {
    utils.deleteInstance(args.instance, callback);
    utils.success(`Instance "${args.instance.name}" destroyed.`);
  };

  if (args.force) {
    return api.destroy(args.instance, onDestroy);
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const q = `Do you really want to destroy "${args.instance.name}"? [Y/n]`;
  rl.question(q.yellow, answer => {
    rl.close();
    if (answer !== '' && answer !== 'Y' && answer !== 'y') {
      utils.grey('No action taken.');
    } else {
      api.destroy(args.instance, onDestroy);
    }
  });
}

export function boot(api, args, callback) {
  exports.handleCommandNotFound(api.boot);

  utils.grey(`Booting "${args.instance.name}"...`);
  api.boot(args.instance, () => {
    utils.success(`Instance "${args.instance.name}" booted.`);
    utils.waitForBoot(args.instance, callback);
  });
}

export function shutdown(api, args, callback) {
  exports.handleCommandNotFound(api.shutdown);

  utils.grey(`Shutting down "${args.instance.name}"...`);
  api.shutdown(args.instance, () => {
    utils.success(`Instance "${args.instance.name}" has been shut down.`);
    if (utils.isFunction(callback)) {
      callback();
    }
  });
}

export function reboot(api, args, callback) {
  exports.handleCommandNotFound(api.reboot);

  utils.grey(`Rebooting "${args.instance.name}"...`);
  api.reboot(args.instance, () => {
    utils.success(`Instance "${args.instance.name}" rebooted.`);
    utils.waitForBoot(args.instance, callback);
  });
}

export function rebuild(api, args, callback) {
  exports.handleCommandNotFound(api.rebuild);

  utils.grey(`Rebuilding "${args.instance.name}" using image "${args.image}"...`);
  api.rebuild(args.instance, args.image, () => {
    exports.updateInstanceMetadata(api, args, () => {
      utils.success(`Instance "${args.instance.name}" rebuilt.`);
      utils.waitForBoot(args.instance, callback);
    });
  });
}

export function resize(api, args, callback) {
  exports.handleCommandNotFound(api.resize);

  utils.grey(`Resizing "${args.instance.name}" to "${args.size}"...`);
  api.resize(args.instance, args.size, () => {
    exports.updateInstanceMetadata(api, args, () => {
      utils.success(`Instance "${args.instance.name}" resized.`);
      if (args.skipBoot || args['skip-boot']) {
        utils.grey('Skipping boot since --skip-boot flag was used.');
        if (utils.isFunction(callback)) {
          callback();
        }
      } else {
        exports.boot(api, args, callback);
      }
    });
  });
}

export function snapshot(api, args, callback) {
  exports.handleCommandNotFound(api.snapshot);

  utils.grey(`Saving snapshot "${args.snapshotName}" of "${args.instance.name}"...`);
  api.snapshot(args.instance, args.snapshotName, () => {
    utils.success(`Snapshot "${args.snapshotName}" of "${args.instance.name}" saved.`);
    utils.waitForBoot(args.instance, callback);
  });
}

// AKA distributions (Linode).
export function images(api, callback) {
  exports.handleCommandNotFound(api.getImages);

  api.getImages(images => {
    utils.printCollection('images', images);
    if (utils.isFunction(callback)) {
      callback();
    }
  });
}

// AKA droplets (DO) or linodes (Linode).
export function instances(api, args, callback) {
  exports.handleCommandNotFound(api.getInstances);

  // AWS needs args.region, DigitalOcean does not.
  api.getInstances(args, instances => {
    utils.printCollection('instances', instances);
    if (utils.isFunction(callback)) {
      callback();
    }
  });
}

export function instance(api, args, callback) {
  exports.handleCommandNotFound(api.getInstance);

  api.getInstance(args.instance, callback);
}

export function updateInstanceMetadata(api, args, callback) {
  exports.handleCommandNotFound(api.updateInstanceMetadata);

  api.updateInstanceMetadata(args.instance, callback);
}

export function sync(api, args, callback) {
  exports.handleCommandNotFound(api.sync);

  utils.grey(`Fetching metadata for "${args.instance.name}"...`);
  api.sync(args.instance, () => {
    utils.success(`Metadata for "${args.instance.name}" updated.`);
    if (utils.isFunction(callback)) {
      callback();
    }
  });
}

export function kernels(api, callback) {
  exports.handleCommandNotFound(api.getKernels);

  api.getKernels(kernels => {
    utils.printCollection('kernels', kernels);
    if (utils.isFunction(callback)) {
      callback();
    }
  });
}

// AKA datacenters (Linode).
export function regions(api, callback) {
  exports.handleCommandNotFound(api.getRegions);

  api.getRegions(regions => {
    utils.printCollection('regions', regions);
    if (utils.isFunction(callback)) {
      callback();
    }
  });
}

// AKA types (AWS) or plans (Linode).
export function sizes(api, callback) {
  exports.handleCommandNotFound(api.getSizes);

  api.getSizes(sizes => {
    utils.printCollection('sizes', sizes);
    if (utils.isFunction(callback)) {
      callback();
    }
  });
}

export function snapshots(api, callback) {
  exports.handleCommandNotFound(api.getSnapshots);

  api.getSnapshots(snapshots => {
    utils.printCollection('snapshots', snapshots);
    if (utils.isFunction(callback)) {
      callback();
    }
  });
}
