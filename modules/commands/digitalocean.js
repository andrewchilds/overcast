var _ = require('lodash');
var utils = require('../utils');
var filters = require('../filters');
var provider = require('../provider');
var api = require('../providers/digitalocean.js');

var commands = {};
exports.commands = commands;

commands.boot = {
  name: 'boot',
  usage: 'overcast digitalocean boot [name]',
  description: 'Boot up an instance if powered off, otherwise do nothing.',
  required: [
    { name: 'name', filters: [filters.findFirstMatchingInstance, filters.shouldBeDigitalOcean] }
  ],
  async: true,
  run: function (args, next) {
    provider.boot(api, args, next);
  }
};

commands.poweron = _.extend({ alias: true }, commands.boot);

commands.create = {
  name: 'create',
  usage: 'overcast digitalocean create [name] [options...]',
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
    { usage: '--region REGION', default: 'nyc3' },
    { usage: '--image IMAGE', default: 'ubuntu-14-04-x64' },
    { usage: '--size SIZE', default: '512mb' },
    { usage: '--backups-enabled', default: 'false' },
    { usage: '--private-networking', default: 'false' }
  ],
  async: true,
  run: function (args, next) {
    provider.create(api, args, next);
  }
};

commands.destroy = {
  name: 'destroy',
  usage: 'overcast digitalocean destroy [name] [options...]',
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
  async: true,
  run: function (args, next) {
    provider.destroy(api, args, next);
  }
};

commands.images = {
  name: 'images',
  usage: 'overcast digitalocean images',
  description: 'List all images, including snapshots.',
  async: true,
  run: function (args, next) {
    provider.images(api, next);
  }
};

commands.instances = {
  name: 'instances',
  usage: 'overcast digitalocean instances',
  description: 'List all instances in your account.',
  async: true,
  run: function (args, next) {
    provider.instances(api, args, next);
  }
};

commands.droplets = _.extend({ alias: true }, commands.instances);

commands.reboot = {
  name: 'reboot',
  usage: 'overcast digitalocean reboot [name]',
  description: 'Reboot an instance using the provider API.',
  required: [
    { name: 'name', filters: [filters.findFirstMatchingInstance, filters.shouldBeDigitalOcean] }
  ],
  async: true,
  run: function (args, next) {
    provider.reboot(api, args, next);
  }
};

commands.regions = {
  name: 'regions',
  usage: 'overcast digitalocean regions',
  description: 'List all available regions.',
  async: true,
  run: function (args, next) {
    provider.regions(api, next);
  }
};

commands.rebuild = {
  name: 'rebuild',
  usage: 'overcast digitalocean rebuild [name] [image]',
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
  async: true,
  run: function (args, next) {
    provider.rebuild(api, args, next);
  }
};

commands.resize = {
  name: 'resize',
  usage: 'overcast digitalocean resize [name] [size] [options...]',
  description: [
    'Shutdown, resize, and reboot a DigitalOcean instance.',
    '[size] can be a size ID, name or slug.',
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
  async: true,
  run: function (args, next) {
    provider.resize(api, args, next);
  }
};

commands.snapshot = {
  name: 'snapshot',
  usage: 'overcast digitalocean snapshot [name] [snapshot-name]',
  description: 'Creates a named snapshot of a droplet. This will reboot the instance.',
  examples: '$ overcast digitalocean snapshot vm-01 vm-01-snapshot',
  required: [
    { name: 'name', filters: [filters.findFirstMatchingInstance, filters.shouldBeDigitalOcean] },
    { name: 'snapshot-name', varName: 'snapshotName' }
  ],
  async: true,
  run: function (args, next) {
    provider.snapshot(api, args, next);
  }
};

commands.snapshots = {
  name: 'snapshots',
  usage: 'overcast digitalocean snapshots',
  description: 'List all available snapshots in your account.',
  async: true,
  run: function (args, next) {
    provider.snapshots(api, next);
  }
};

commands.shutdown = {
  name: 'shutdown',
  usage: 'overcast digitalocean shutdown [name]',
  description: 'Shut down an instance using the provider API.',
  required: [
    { name: 'name', filters: [filters.findFirstMatchingInstance, filters.shouldBeDigitalOcean] }
  ],
  async: true,
  run: function (args, next) {
    provider.shutdown(api, args, next);
  }
};

commands.sizes = {
  name: 'sizes',
  usage: 'overcast digitalocean sizes',
  description: 'List all available instance sizes.',
  async: true,
  run: function (args, next) {
    provider.sizes(api, next);
  }
};

commands.types = _.extend({ alias: true }, commands.sizes);

commands.sync = {
  name: 'sync',
  usage: 'overcast digitalocean sync [name]',
  description: 'Fetch and update instance metadata.',
  required: [
    { name: 'name', filters: filters.findFirstMatchingInstance }
  ],
  async: true,
  run: function (args, next) {
    provider.sync(api, args, next);
  }
};
