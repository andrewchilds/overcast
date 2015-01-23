var _ = require('lodash');
var utils = require('../utils');
var filters = require('../filters');
var provider = require('../provider');
var api = require('../providers/aws');

var DEFAULT_REGION = 'us-east-1';

var commands = {};
exports.commands = commands;

commands.boot = {
  name: 'boot',
  usage: 'overcast aws boot [name]',
  description: 'Boot up an EC2 instance.',
  required: [
    { name: 'name', filters: [filters.findFirstMatchingInstance, filters.shouldBeAWS] }
  ],
  async: true,
  run: function (args, next) {
    provider.boot(api, args, next);
  }
};

commands.start = _.extend({ alias: true }, commands.boot);

commands.create = {
  name: 'create',
  usage: 'overcast aws create [name] [options...]',
  description: [
    'Creates a new EC2 instance.'
  ],
  examples: [
    '# Specify size:',
    '$ overcast aws create vm-01 --size m1.small --user ubuntu',
    '',
    '# Specify image and region (Ubuntu 14.04 64bit, EBS, us-west-2):',
    '$ overcast aws create vm-01 --region us-west-2 --image ami-978dd9a7 --user ubuntu',
    '',
    '# Specify security groups, separated by spaces:',
    '$ overcast aws create vm-01 --security-group-ids "sg-12a34b56 sg-90c32ab1" --user ubuntu',
    '',
    '# Specify availability zone:',
    '$ overcast aws create vm-01 --availability-zone us-east-1d --user ubuntu',
    '',
    '# Enable root access:',
    '$ overcast aws create vm-02 --user ubuntu',
    '$ overcast run vm-02 allow_root_access_on_ec2',
    '$ overcast instance update vm-02 --user root'
  ],
  required: [
    { name: 'name', filters: filters.shouldBeNewInstance }
  ],
  options: [
    { usage: '--cluster CLUSTER', default: 'default' },
    { usage: '--availability-zone NAME', default: '(default)' },
    { usage: '--image IMAGE', default: 'ami-64e27e0c (Ubuntu 14.04 64bit, EBS, us-east-1)' },
    { usage: '--monitoring', default: 'false' },
    { usage: '--region REGION', default: DEFAULT_REGION },
    { usage: '--security-group-ids IDS', default: '(default)' },
    { usage: '--size SIZE', default: 't1.micro' },
    { usage: '--ssh-key PATH', default: 'overcast.key' },
    { usage: '--ssh-pub-key PATH', default: 'overcast.key.pub' },
    { usage: '--user USERNAME', default: 'root' }
  ],
  async: true,
  run: function (args, next) {
    provider.create(api, args, next);
  }
};

commands.destroy = {
  name: 'destroy',
  usage: 'overcast aws destroy [name] [options...]',
  description: [
    'Destroys an EC2 instance.',
    'Using --force overrides the confirm dialog.'
  ],
  examples: [
    '$ overcast aws destroy vm-01'
  ],
  required: [
    { name: 'name', filters: [filters.findFirstMatchingInstance, filters.shouldBeAWS] }
  ],
  options: [
    { usage: '--force', default: 'false' }
  ],
  async: true,
  run: function (args, next) {
    provider.destroy(api, args, next);
  }
};

commands.instances = {
  name: 'instances',
  usage: 'overcast aws instances [options...]',
  description: 'List all EC2 instances in your account.',
  options: [
    { usage: '--region REGION', default: DEFAULT_REGION }
  ],
  async: true,
  run: function (args, next) {
    provider.instances(api, args, next);
  }
};

commands.reboot = {
  name: 'reboot',
  usage: 'overcast aws reboot [name]',
  description: 'Reboots an EC2 instance.',
  required: [
    { name: 'name', filters: [filters.findFirstMatchingInstance, filters.shouldBeAWS] }
  ],
  async: true,
  run: function (args, next) {
    provider.reboot(api, args, next);
  }
};

commands.regions = {
  name: 'regions',
  usage: 'overcast aws regions',
  description: 'List all EC2 regions.',
  async: true,
  run: function (args, next) {
    provider.regions(api, next);
  }
};

commands.shutdown = {
  name: 'shutdown',
  usage: 'overcast aws shutdown [name]',
  description: 'Shut down an EC2 instance.',
  required: [
    { name: 'name', filters: [filters.findFirstMatchingInstance, filters.shouldBeAWS] }
  ],
  async: true,
  run: function (args, next) {
    provider.shutdown(api, args, next);
  }
};

commands.stop = _.extend({ alias: true }, commands.shutdown);
