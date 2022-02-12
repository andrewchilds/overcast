import readline from 'readline';
import * as utils from './utils.js';
import * as log from './log.js';

export function handleCommandNotFound(fn) {
  if (!utils.isFunction(fn)) {
    utils.die('Command not supported by provider.');
  }
}

export function create(api, args, callback) {
  handleCommandNotFound(api.create);

  log.faded(`Creating new instance "${args.name}" on ${api.name}...`);
  api.create(args, instance => {
    utils.saveInstanceToCluster(args.cluster, instance);
    log.success(`Instance "${args.name}" (${instance.ip}) saved.`);
    utils.waitForBoot(instance, callback);
  });
}

export function destroy(api, args, callback) {
  handleCommandNotFound(api.destroy);

  const onDestroy = () => {
    utils.deleteInstance(args.instance, callback);
    log.success(`Instance "${args.instance.name}" destroyed.`);
  };

  if (args.force) {
    return api.destroy(args.instance, onDestroy);
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const q = `Do you really want to destroy "${args.instance.name}"? [Y/n]`;
  rl.question(q, answer => {
    rl.close();
    if (answer !== '' && answer !== 'Y' && answer !== 'y') {
      log.faded('No action taken.');
    } else {
      api.destroy(args.instance, onDestroy);
    }
  });
}

export function boot(api, args, callback) {
  handleCommandNotFound(api.boot);

  log.faded(`Booting "${args.instance.name}"...`);
  api.boot(args.instance, () => {
    log.success(`Instance "${args.instance.name}" booted.`);
    utils.waitForBoot(args.instance, callback);
  });
}

export function shutdown(api, args, callback) {
  handleCommandNotFound(api.shutdown);

  log.faded(`Shutting down "${args.instance.name}"...`);
  api.shutdown(args.instance, () => {
    log.success(`Instance "${args.instance.name}" has been shut down.`);
    if (utils.isFunction(callback)) {
      callback();
    }
  });
}

export function reboot(api, args, callback) {
  handleCommandNotFound(api.reboot);

  log.faded(`Rebooting "${args.instance.name}"...`);
  api.reboot(args.instance, () => {
    log.success(`Instance "${args.instance.name}" rebooted.`);
    utils.waitForBoot(args.instance, callback);
  });
}

export function rebuild(api, args, callback) {
  handleCommandNotFound(api.rebuild);

  log.faded(`Rebuilding "${args.instance.name}" using image "${args.image}"...`);
  api.rebuild(args.instance, args.image, () => {
    updateInstanceMetadata(api, args, () => {
      log.success(`Instance "${args.instance.name}" rebuilt.`);
      utils.waitForBoot(args.instance, callback);
    });
  });
}

export function resize(api, args, callback) {
  handleCommandNotFound(api.resize);

  log.faded(`Resizing "${args.instance.name}" to "${args.size}"...`);
  api.resize(args.instance, args.size, () => {
    updateInstanceMetadata(api, args, () => {
      log.success(`Instance "${args.instance.name}" resized.`);
      if (args.skipBoot || args['skip-boot']) {
        log.faded('Skipping boot since --skip-boot flag was used.');
        if (utils.isFunction(callback)) {
          callback();
        }
      } else {
        boot(api, args, callback);
      }
    });
  });
}

export function snapshot(api, args, callback) {
  handleCommandNotFound(api.snapshot);

  log.faded(`Saving snapshot "${args.snapshotName}" of "${args.instance.name}"...`);
  api.snapshot(args.instance, args.snapshotName, () => {
    log.success(`Snapshot "${args.snapshotName}" of "${args.instance.name}" saved.`);
    utils.waitForBoot(args.instance, callback);
  });
}

// AKA distributions (Linode).
export function images(api, callback) {
  handleCommandNotFound(api.getImages);

  api.getImages(images => {
    utils.printCollection('images', images);
    if (utils.isFunction(callback)) {
      callback();
    }
  });
}

// AKA droplets (DO) or linodes (Linode).
export function instances(api, args, callback) {
  handleCommandNotFound(api.getInstances);

  // AWS needs args.region, DigitalOcean does not.
  api.getInstances(args, instances => {
    utils.printCollection('instances', instances);
    if (utils.isFunction(callback)) {
      callback();
    }
  });
}

export function instance(api, args, callback) {
  handleCommandNotFound(api.getInstance);

  api.getInstance(args.instance, callback);
}

export function updateInstanceMetadata(api, args, callback) {
  handleCommandNotFound(api.updateInstanceMetadata);

  api.updateInstanceMetadata(args.instance, callback);
}

export function sync(api, args, callback) {
  handleCommandNotFound(api.sync);

  log.faded(`Fetching metadata for "${args.instance.name}"...`);
  api.sync(args.instance, () => {
    log.success(`Metadata for "${args.instance.name}" updated.`);
    if (utils.isFunction(callback)) {
      callback();
    }
  });
}

export function kernels(api, callback) {
  handleCommandNotFound(api.getKernels);

  api.getKernels(kernels => {
    utils.printCollection('kernels', kernels);
    if (utils.isFunction(callback)) {
      callback();
    }
  });
}

// AKA datacenters (Linode).
export function regions(api, callback) {
  handleCommandNotFound(api.getRegions);

  api.getRegions(regions => {
    utils.printCollection('regions', regions);
    if (utils.isFunction(callback)) {
      callback();
    }
  });
}

// AKA types (AWS) or plans (Linode).
export function sizes(api, callback) {
  handleCommandNotFound(api.getSizes);

  api.getSizes(sizes => {
    utils.printCollection('sizes', sizes);
    if (utils.isFunction(callback)) {
      callback();
    }
  });
}

export function snapshots(api, callback) {
  handleCommandNotFound(api.getSnapshots);

  api.getSnapshots(snapshots => {
    utils.printCollection('snapshots', snapshots);
    if (utils.isFunction(callback)) {
      callback();
    }
  });
}
