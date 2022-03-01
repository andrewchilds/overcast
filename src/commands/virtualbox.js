import * as filters from '../filters.js';
import * as provider from '../provider.js';
import { isTestRun } from '../utils.js';
import { api } from '../providers/virtualbox.js';
import { mockAPI } from '../providers/mock.js';

function getAPI() {
  return isTestRun() ? mockAPI : api;
}

export const commands = {};

export const banner = [
  'These commands require VirtualBox and Vagrant to be installed on',
  'your local machine. Vagrant files are stored in ~/.overcast-vagrant.'
];

commands.boot = {
  name: 'boot',
  usage: ['overcast virtualbox boot [name]'],
  description: 'Boot up a Virtualbox instance.',
  required: [
    { name: 'name', filters: [filters.findFirstMatchingInstance, filters.shouldBeVirtualbox] }
  ],
  run: (args, nextFn) => {
    provider.boot(getAPI(), args, nextFn);
  }
};

commands.start = Object.assign({ alias: true }, commands.boot);

commands.create = {
  name: 'create',
  usage: ['overcast virtualbox create [name] [options...]'],
  description: [
    'Creates a new Virtualbox instance.'
  ],
  examples: [
    '$ overcast virtualbox create vm-01',
    '$ overcast virtualbox create vm-02 --ram 1024 --image precise64'
  ],
  required: [
    { name: 'name', filters: filters.shouldBeNewInstance }
  ],
  options: [
    { usage: '--cluster CLUSTER', default: 'default' },
    { usage: '--cpus COUNT', default: '1' },
    { usage: '--image NAME', default: 'trusty64' },
    { usage: '--ram MB', default: '512' },
    { usage: '--ip ADDRESS', default: '192.168.22.10' },
    { usage: '--ssh-key PATH', default: 'overcast.key' },
    { usage: '--ssh-pub-key PATH', default: 'overcast.key.pub' }
  ],
  run: (args, nextFn) => {
    provider.create(getAPI(), args, nextFn);
  }
};

commands.destroy = {
  name: 'destroy',
  usage: ['overcast virtualbox destroy [name] [options...]'],
  description: [
    'Destroys a Virtualbox instance.',
    'Using --force overrides the confirm dialog.'
  ],
  examples: [
    '$ overcast virtualbox destroy vm-01'
  ],
  required: [
    { name: 'name', filters: [filters.findFirstMatchingInstance, filters.shouldBeVirtualbox] }
  ],
  options: [
    { usage: '--force', default: 'false' }
  ],
  run: (args, nextFn) => {
    provider.destroy(getAPI(), args, nextFn);
  }
};

commands.reboot = {
  name: 'reboot',
  usage: ['overcast virtualbox reboot [name]'],
  description: 'Reboots a Virtualbox instance.',
  required: [
    { name: 'name', filters: [filters.findFirstMatchingInstance, filters.shouldBeVirtualbox] }
  ],
  run: (args, nextFn) => {
    provider.reboot(getAPI(), args, nextFn);
  }
};

commands.shutdown = {
  name: 'shutdown',
  usage: ['overcast virtualbox shutdown [name]'],
  description: 'Shut down a Virtualbox instance.',
  required: [
    { name: 'name', filters: [filters.findFirstMatchingInstance, filters.shouldBeVirtualbox] }
  ],
  run: (args, nextFn) => {
    provider.shutdown(getAPI(), args, nextFn);
  }
};

commands.stop = Object.assign({ alias: true }, commands.shutdown);
