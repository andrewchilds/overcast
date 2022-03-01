import readline from 'readline';
import * as utils from './utils.js';
import * as log from './log.js';

export function handleCommandNotFound(fn) {
  if (!utils.isFunction(fn)) {
    return utils.die('Command not supported by provider.');
  }
}

export function create(api, args, nextFn) {
  handleCommandNotFound(api.create);

  log.faded(`Creating new instance "${args.name}" on ${api.name}...`);
  api.create(args, instance => {
    utils.saveInstanceToCluster(args.cluster, instance, () => {
      log.success(`Instance "${args.name}" (${instance.ip}) saved.`);
      waitForBoot(instance, nextFn);
    });
  });
}

export function destroy(api, args, nextFn) {
  handleCommandNotFound(api.destroy);

  const onDestroy = () => {
    utils.deleteInstance(args.instance, () => {
      log.success(`Instance "${args.instance.name}" destroyed.`);
      nextFn()
    });
  };

  if (args.force || utils.isTestRun()) {
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

export function boot(api, args, nextFn) {
  handleCommandNotFound(api.boot);

  log.faded(`Booting "${args.instance.name}"...`);
  api.boot(args.instance, () => {
    log.success(`Instance "${args.instance.name}" booted.`);
    waitForBoot(args.instance, nextFn);
  });
}

export function shutdown(api, args, nextFn) {
  handleCommandNotFound(api.shutdown);

  log.faded(`Shutting down "${args.instance.name}"...`);
  api.shutdown(args.instance, () => {
    log.success(`Instance "${args.instance.name}" has been shut down.`);
    if (utils.isFunction(nextFn)) {
      nextFn();
    }
  });
}

export function reboot(api, args, nextFn) {
  handleCommandNotFound(api.reboot);

  log.faded(`Rebooting "${args.instance.name}"...`);
  api.reboot(args.instance, () => {
    log.success(`Instance "${args.instance.name}" rebooted.`);
    waitForBoot(args.instance, nextFn);
  });
}

export function rebuild(api, args, nextFn) {
  handleCommandNotFound(api.rebuild);

  log.faded(`Rebuilding "${args.instance.name}" using image "${args.image}"...`);
  api.rebuild(args.instance, args.image, () => {
    updateInstanceMetadata(api, args, () => {
      log.success(`Instance "${args.instance.name}" rebuilt.`);
      waitForBoot(args.instance, nextFn);
    });
  });
}

export function resize(api, args, nextFn) {
  handleCommandNotFound(api.resize);

  log.faded(`Resizing "${args.instance.name}" to "${args.size}"...`);
  api.resize(args.instance, args.size, () => {
    updateInstanceMetadata(api, args, () => {
      log.success(`Instance "${args.instance.name}" resized.`);
      if (args.skipBoot || args['skip-boot']) {
        log.faded('Skipping boot since --skip-boot flag was used.');
        if (utils.isFunction(nextFn)) {
          nextFn();
        }
      } else {
        boot(api, args, nextFn);
      }
    });
  });
}

export function snapshot(api, args, nextFn) {
  handleCommandNotFound(api.snapshot);

  log.faded(`Saving snapshot "${args.snapshotName}" of "${args.instance.name}"...`);
  api.snapshot(args.instance, args.snapshotName, () => {
    log.success(`Snapshot "${args.snapshotName}" of "${args.instance.name}" saved.`);
    waitForBoot(args.instance, nextFn);
  });
}

// AKA distributions (Linode).
export function images(api, nextFn) {
  handleCommandNotFound(api.getImages);

  api.getImages(images => {
    utils.printCollection('images', images);
    if (utils.isFunction(nextFn)) {
      nextFn();
    }
  });
}

// AKA droplets (DO) or linodes (Linode).
export function instances(api, args, nextFn) {
  handleCommandNotFound(api.getInstances);

  // AWS needs args.region, DigitalOcean does not.
  api.getInstances(args, instances => {
    utils.printCollection('instances', instances);
    if (utils.isFunction(nextFn)) {
      nextFn();
    }
  });
}

export function instance(api, args, nextFn) {
  handleCommandNotFound(api.getInstance);

  api.getInstance(args.instance, nextFn);
}

export function updateInstanceMetadata(api, args, nextFn) {
  handleCommandNotFound(api.updateInstanceMetadata);

  api.updateInstanceMetadata(args.instance, nextFn);
}

export function sync(api, args, nextFn) {
  handleCommandNotFound(api.sync);

  log.faded(`Fetching metadata for "${args.instance.name}"...`);
  api.sync(args.instance, () => {
    log.success(`Metadata for "${args.instance.name}" updated.`);
    if (utils.isFunction(nextFn)) {
      nextFn();
    }
  });
}

export function kernels(api, nextFn) {
  handleCommandNotFound(api.getKernels);

  api.getKernels(kernels => {
    utils.printCollection('kernels', kernels);
    if (utils.isFunction(nextFn)) {
      nextFn();
    }
  });
}

// AKA datacenters (Linode).
export function regions(api, nextFn) {
  handleCommandNotFound(api.getRegions);

  api.getRegions(regions => {
    utils.printCollection('regions', regions);
    if (utils.isFunction(nextFn)) {
      nextFn();
    }
  });
}

// AKA types (AWS) or plans (Linode).
export function sizes(api, nextFn) {
  handleCommandNotFound(api.getSizes);

  api.getSizes(sizes => {
    utils.printCollection('sizes', sizes);
    if (utils.isFunction(nextFn)) {
      nextFn();
    }
  });
}

export function snapshots(api, nextFn) {
  handleCommandNotFound(api.getSnapshots);

  api.getSnapshots(snapshots => {
    utils.printCollection('snapshots', snapshots);
    if (utils.isFunction(nextFn)) {
      nextFn();
    }
  });
}

export function waitForBoot(instance, nextFn = () => {}, startTime) {
  if (!startTime) {
    startTime = utils.now();
    log.faded('Waiting until we can connect to ' + instance.name + '...');
  }

  testConnection(instance, canConnect => {
    const delayBetweenPolls = 2000;

    if (canConnect) {
      const duration = (utils.now() - startTime) / 1000;
      log.success('Connection established after ' + Math.ceil(duration) + ' seconds.');
      nextFn();
    } else {
      setTimeout(() => {
        waitForBoot(instance, nextFn, startTime);
      }, delayBetweenPolls);
    }
  });
}

export function testConnection(instance, nextFn = () => {}) {
  if (utils.isTestRun) {
    return nextFn(true);
  }

  const key = utils.normalizeKeyPath(utils.escapeWindowsPath(instance.ssh_key));
  const port = instance.ssh_port || 22;
  const host = instance.user + '@' + instance.ip;
  const command = 'ssh -i ' + key + ' -p ' + port + ' ' + host +
    ' -o StrictHostKeyChecking=no "echo hi"';

  const ssh = utils.spawn(command);
  const timeout = setTimeout(() => {
    callbackOnce(false);
    ssh.kill();
  }, 8000);

  let alreadyCalled = false;
  const callbackOnce = (result) => {
    if (!alreadyCalled) {
      clearTimeout(timeout);
      alreadyCalled = true;
      nextFn(result);
    }
  };

  ssh.on('exit', (code) => {
    if (code === 0) {
      callbackOnce(true);
    } else {
      callbackOnce(false);
    }
  });
}
