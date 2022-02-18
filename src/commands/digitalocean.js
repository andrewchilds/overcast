import * as filters from '../filters.js';
import * as provider from '../provider.js';
import { api } from '../providers/digitalocean.js';

export const commands = {};

commands.boot = {
  name: 'boot',
  usage: ['overcast digitalocean boot [name]'],
  description: 'Boot up an instance if powered off, otherwise do nothing.',
  required: [
    { name: 'name', filters: [filters.findFirstMatchingInstance, filters.shouldBeDigitalOcean] }
  ],
  run: (args, nextFn) => {
    provider.boot(api, args, nextFn);
  }
};

commands.poweron = Object.assign({ alias: true }, commands.boot);

commands.create = {
  name: 'create',
  usage: ['overcast digitalocean create [name] [options...]'],
  description: ['Creates a new instance on DigitalOcean.'],
  examples: [
    '# Match using slugs:',
    '$ overcast digitalocean create vm-01 --size 2gb --region sfo1',
    '',
    '# Match using IDs or names:',
    '$ overcast digitalocean create vm-02 --region "London 1" --image 6374128'
  ],
  required: [
    { name: 'name', filters: filters.shouldBeNewInstance }
  ],
  options: [
    { usage: '--cluster CLUSTER', default: 'default' },
    { usage: '--ssh-port PORT', default: '22' },
    { usage: '--ssh-key PATH', default: 'overcast.key' },
    { usage: '--ssh-pub-key PATH', default: 'overcast.key.pub' },
    { usage: '--region REGION', default: api.DEFAULT_REGION },
    { usage: '--image IMAGE', default: api.DEFAULT_IMAGE },
    { usage: '--size SIZE', default: api.DEFAULT_SIZE },
    { usage: '--backups', default: 'false' },
    { usage: '--monitoring', default: 'false' },
    { usage: '--private-networking', default: 'false' },
    { usage: '--with-droplet-agent', default: 'false' }
  ],
  run: (args, nextFn) => {
    provider.create(api, args, nextFn);
  }
};

commands.destroy = {
  name: 'destroy',
  usage: ['overcast digitalocean destroy [name] [options...]'],
  description: [
    'Destroys a DigitalOcean droplet and removes it from your account.',
    'Using --force overrides the confirm dialog.'
  ],
  examples: [
    '$ overcast digitalocean destroy vm-01'
  ],
  required: [
    { name: 'name', filters: [filters.findFirstMatchingInstance, filters.shouldBeDigitalOcean] }
  ],
  options: [
    { usage: '--force', default: 'false' }
  ],
  run: (args, nextFn) => {
    provider.destroy(api, args, nextFn);
  }
};

commands.images = {
  name: 'images',
  usage: ['overcast digitalocean images'],
  description: 'List all images, including snapshots.',
  run: (args, nextFn) => {
    provider.images(api, nextFn);
  }
};

commands.instances = {
  name: 'instances',
  usage: ['overcast digitalocean instances'],
  description: 'List all instances in your account.',
  run: (args, nextFn) => {
    provider.instances(api, args, nextFn);
  }
};

commands.droplets = Object.assign({ alias: true }, commands.instances);

commands.reboot = {
  name: 'reboot',
  usage: ['overcast digitalocean reboot [name]'],
  description: 'Reboot an instance using the provider API.',
  required: [
    { name: 'name', filters: [filters.findFirstMatchingInstance, filters.shouldBeDigitalOcean] }
  ],
  run: (args, nextFn) => {
    provider.reboot(api, args, nextFn);
  }
};

commands.regions = {
  name: 'regions',
  usage: ['overcast digitalocean regions'],
  description: 'List all available regions.',
  run: (args, nextFn) => {
    provider.regions(api, nextFn);
  }
};

commands.rebuild = {
  name: 'rebuild',
  usage: ['overcast digitalocean rebuild [name] [image]'],
  description: [
    'Rebuilds an existing instance on DigitalOcean, preserving the IP address.',
    '[image] can be image ID, name or slug.'
  ],
  examples: [
    '# Rebuild an instance using a readymade image:',
    '$ overcast digitalocean rebuild vm-01 ubuntu-14-04-x64',
    '',
    '# Rebuild an instance using a snapshot:',
    '$ overcast digitalocean rebuild vm-01 "vm-01 backup"'
  ],
  required: [
    { name: 'name', filters: [filters.findFirstMatchingInstance, filters.shouldBeDigitalOcean] },
    { name: 'image' }
  ],
  run: (args, nextFn) => {
    provider.rebuild(api, args, nextFn);
  }
};

commands.resize = {
  name: 'resize',
  usage: ['overcast digitalocean resize [name] [size] [options...]'],
  description: [
    'Shutdown, resize, and reboot a DigitalOcean instance.',
    '[size] must be a valid size slug.',
    'If the --skip-boot flag is used, the instance will stay powered off.'
  ],
  examples: [
    '# Resize an instance to 2gb:',
    '$ overcast digitalocean resize vm-01 2gb'
  ],
  required: [
    { name: 'name', filters: [filters.findFirstMatchingInstance, filters.shouldBeDigitalOcean] },
    { name: 'size' }
  ],
  options: [
    { usage: '--skip-boot', default: 'false' }
  ],
  run: (args, nextFn) => {
    provider.resize(api, args, nextFn);
  }
};

commands.snapshot = {
  name: 'snapshot',
  usage: ['overcast digitalocean snapshot [name] [snapshot-name]'],
  description: 'Creates a named snapshot of a droplet. This will reboot the instance.',
  examples: '$ overcast digitalocean snapshot vm-01 vm-01-snapshot',
  required: [
    { name: 'name', filters: [filters.findFirstMatchingInstance, filters.shouldBeDigitalOcean] },
    { name: 'snapshot-name', varName: 'snapshotName' }
  ],
  run: (args, nextFn) => {
    provider.snapshot(api, args, nextFn);
  }
};

commands.snapshots = {
  name: 'snapshots',
  usage: ['overcast digitalocean snapshots'],
  description: 'List all available snapshots in your account.',
  run: (args, nextFn) => {
    provider.snapshots(api, nextFn);
  }
};

commands.shutdown = {
  name: 'shutdown',
  usage: ['overcast digitalocean shutdown [name]'],
  description: 'Shut down an instance using the provider API.',
  required: [
    { name: 'name', filters: [filters.findFirstMatchingInstance, filters.shouldBeDigitalOcean] }
  ],
  run: (args, nextFn) => {
    provider.shutdown(api, args, nextFn);
  }
};

commands.sizes = {
  name: 'sizes',
  usage: ['overcast digitalocean sizes'],
  description: 'List all available instance sizes.',
  run: (args, nextFn) => {
    provider.sizes(api, nextFn);
  }
};

commands.types = Object.assign({ alias: true }, commands.sizes);

commands.sync = {
  name: 'sync',
  usage: ['overcast digitalocean sync [name]'],
  description: 'Fetch and update instance metadata.',
  required: [
    { name: 'name', filters: filters.findFirstMatchingInstance }
  ],
  run: (args, nextFn) => {
    provider.sync(api, args, nextFn);
  }
};
