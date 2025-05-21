import * as filters from '../filters.js';
import * as provider from '../provider.js';
import { isTestRun } from '../utils.js';
import { api } from '../providers/vultr.js';
import { mockAPI } from '../providers/mock.js';

function getAPI() {
  return isTestRun() ? mockAPI : api;
}

export const commands = {};

commands.boot = {
  name: 'boot',
  usage: ['overcast vultr boot [name]'],
  description: 'Boot up an instance if powered off, otherwise do nothing.',
  required: [
    { name: 'name', filters: [filters.findFirstMatchingInstance, filters.shouldBeVultr] }
  ],
  run: (args, nextFn) => {
    provider.boot(getAPI(), args, nextFn);
  }
};

commands.poweron = Object.assign({ alias: true }, commands.boot);

commands.create = {
  name: 'create',
  usage: ['overcast vultr create [name] [options...]'],
  description: ['Creates a new instance on Vultr.'],
  examples: [
    '# Create with defaults (Ubuntu 20.04, 1GB RAM, New Jersey region):',
    '$ overcast vultr create vm-01',
    '',
    '# Create with specific OS, plan and region:',
    '$ overcast vultr create vm-02 --image "ubuntu_22_04_x64" --plan "vc2-2c-4gb" --region "lax"',
    '',
    '# Create with additional options:',
    '$ overcast vultr create vm-03 --enable-ipv6 --enable-private-network'
  ],
  required: [
    { name: 'name', filters: filters.shouldBeNewInstance }
  ],
  options: [
    { usage: '--cluster CLUSTER', default: 'default' },
    { usage: '--ssh-port PORT', default: '22' },
    { usage: '--ssh-key PATH', default: 'overcast.key' },
    { usage: '--ssh-pub-key PATH', default: 'overcast.key.pub' },
    { usage: '--region REGION/ID', default: api.DEFAULT_REGION },
    { usage: '--image OS/IMAGE', default: api.DEFAULT_IMAGE },
    { usage: '--plan SIZE', default: api.DEFAULT_PLAN },
    { usage: '--enable-ipv6', default: 'false' },
    { usage: '--enable-private-network', default: 'false' },
    { usage: '--activation-email', default: 'false' }
  ],
  run: (args, nextFn) => {
    provider.create(getAPI(), args, nextFn);
  }
};

commands.destroy = {
  name: 'destroy',
  usage: ['overcast vultr destroy [name] [options...]'],
  description: [
    'Destroys a Vultr instance and removes it from your account.',
    'Using --force overrides the confirm dialog.'
  ],
  examples: [
    '$ overcast vultr destroy vm-01',
    '$ overcast vultr destroy vm-01 --force'
  ],
  required: [
    { name: 'name', filters: [filters.findFirstMatchingInstance, filters.shouldBeVultr] }
  ],
  options: [
    { usage: '--force', default: 'false' }
  ],
  run: (args, nextFn) => {
    provider.destroy(getAPI(), args, nextFn);
  }
};

commands.images = {
  name: 'images',
  usage: ['overcast vultr images'],
  description: 'List all available OS images, applications, and snapshots.',
  run: (args, nextFn) => {
    provider.images(getAPI(), nextFn);
  }
};

commands.instances = {
  name: 'instances',
  usage: ['overcast vultr instances'],
  description: 'List all instances in your account.',
  run: (args, nextFn) => {
    provider.instances(getAPI(), args, nextFn);
  }
};

commands.reboot = {
  name: 'reboot',
  usage: ['overcast vultr reboot [name]'],
  description: 'Reboot an instance using the provider API.',
  required: [
    { name: 'name', filters: [filters.findFirstMatchingInstance, filters.shouldBeVultr] }
  ],
  run: (args, nextFn) => {
    provider.reboot(getAPI(), args, nextFn);
  }
};

commands.regions = {
  name: 'regions',
  usage: ['overcast vultr regions'],
  description: 'List all available regions.',
  run: (args, nextFn) => {
    provider.regions(getAPI(), nextFn);
  }
};

commands.rebuild = {
  name: 'rebuild',
  usage: ['overcast vultr rebuild [name] [image]'],
  description: [
    'Rebuilds an existing instance on Vultr, preserving the IP address.',
    '[image] can be OS ID, OS name, image ID, or image name.'
  ],
  examples: [
    '# Rebuild an instance using Ubuntu 22.04:',
    '$ overcast vultr rebuild vm-01 ubuntu_22_04_x64',
    '',
    '# Rebuild an instance using a snapshot:',
    '$ overcast vultr rebuild vm-01 "My Custom Image"'
  ],
  required: [
    { name: 'name', filters: [filters.findFirstMatchingInstance, filters.shouldBeVultr] },
    { name: 'image' }
  ],
  run: (args, nextFn) => {
    provider.rebuild(getAPI(), args, nextFn);
  }
};

commands.resize = {
  name: 'resize',
  usage: ['overcast vultr resize [name] [plan]'],
  description: [
    'Shut down, resize, and boot a Vultr instance.',
    '[plan] can be plan ID or name.'
  ],
  examples: [
    '# Resize an instance to a 4GB plan:',
    '$ overcast vultr resize vm-01 vc2-2c-4gb'
  ],
  required: [
    { name: 'name', filters: [filters.findFirstMatchingInstance, filters.shouldBeVultr] },
    { name: 'size' }
  ],
  run: (args, nextFn) => {
    provider.resize(getAPI(), args, nextFn);
  }
};

commands.snapshot = {
  name: 'snapshot',
  usage: ['overcast vultr snapshot [name] [snapshot-name]'],
  description: 'Creates a named snapshot of an instance.',
  examples: '$ overcast vultr snapshot vm-01 vm-01-backup',
  required: [
    { name: 'name', filters: [filters.findFirstMatchingInstance, filters.shouldBeVultr] },
    { name: 'snapshot-name', varName: 'snapshotName' }
  ],
  run: (args, nextFn) => {
    provider.snapshot(getAPI(), args, nextFn);
  }
};

commands.snapshots = {
  name: 'snapshots',
  usage: ['overcast vultr snapshots'],
  description: 'List all snapshots in your account.',
  run: (args, nextFn) => {
    provider.snapshots(getAPI(), nextFn);
  }
};

commands.shutdown = {
  name: 'shutdown',
  usage: ['overcast vultr shutdown [name]'],
  description: 'Shut down an instance using the provider API.',
  required: [
    { name: 'name', filters: [filters.findFirstMatchingInstance, filters.shouldBeVultr] }
  ],
  run: (args, nextFn) => {
    provider.shutdown(getAPI(), args, nextFn);
  }
};

commands.plans = {
  name: 'plans',
  usage: ['overcast vultr plans'],
  description: 'List all available instance plans.',
  run: (args, nextFn) => {
    provider.sizes(getAPI(), nextFn);
  }
};

commands.sizes = Object.assign({ alias: true }, commands.plans);

commands.sync = {
  name: 'sync',
  usage: ['overcast vultr sync [name]'],
  description: 'Fetch and update instance metadata.',
  required: [
    { name: 'name', filters: [filters.findFirstMatchingInstance, filters.shouldBeVultr] }
  ],
  run: (args, nextFn) => {
    provider.sync(getAPI(), args, nextFn);
  }
};
