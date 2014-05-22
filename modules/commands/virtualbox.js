var fs = require('fs');
var readline = require('readline');
var _ = require('lodash');
var Promise = require('bluebird');
var utils = require('../utils');
var API = require('../providers/virtualbox');

exports.signatures = function () {
  return utils.printSignatures(subcommands);
};

exports.help = function () {
  utils.printArray([
    'These commands require Vagrant to be installed on your local machine.',
    'See http://www.vagrantup.com/downloads, or install on OS X using homebrew-cask:',
    '  $ brew tap caskroom/cask',
    '  $ brew install brew-cask',
    '  $ brew cask install vagrant',
    ''
  ]);

  utils.printCommandHelp(subcommands);
};

exports.run = function (args) {
  utils.argShift(args, 'subcommand');
  utils.runSubcommand(args, subcommands, exports.help);
};

var subcommands = {};

subcommands.create = utils.module(function (exports) {
  exports.signature = 'overcast virtualbox create [name] [options...]';

  exports.help = function () {
    utils.printArray([
      exports.signature,
      '  Creates a new local Virtualbox instance using Vagrant.'.grey,
      '',
      '  If --ip is not specified, the next available IP from 192.168.22.10 will be assigned.'.grey,
      '  User will be root by default. Vagrant files are stored in the ~/.overcast-vagrant directory.'.grey,
      '  Image names "trusty64" (Ubuntu 14.04) and "precise64" (Ubuntu 12.04) are downloaded'.grey,
      '  automatically from Ubuntu servers the first time they are used. Other names will need'.grey,
      '  to be added using `vagrant box add --name [name] [image-url]`.'.grey,
      '',
      '    Option                   | Default'.grey,
      '    --cluster CLUSTER        | default'.grey,
      '    --image NAME             | trusty64'.grey,
      '    --ram MB                 | 512'.grey,
      '    --ip ADDRESS             | 192.168.22.10'.grey,
      '    --ssh-key KEY_PATH       | overcast.key'.grey,
      '    --ssh-pub-key KEY_PATH   | overcast.key.pub'.grey,
      '',
      '  Examples:'.grey,
      '  $ overcast virtualbox create local.vm.01'.grey,
      '  $ overcast virtualbox create local.vm.02 --ram 1024 --image precise64'.grey
    ]);
  };

  exports.run = function (args) {
    var clusters = utils.getClusters();
    utils.argShift(args, 'name');

    if (!args.cluster) {
      utils.grey('Using "default" cluster.');
      args.cluster = 'default';
    }

    if (!args.name) {
      return utils.missingParameter('[name]', exports.help);
    } else if (clusters[args.cluster] && clusters[args.cluster].instances[args.name]) {
      return utils.dieWithList('Instance "' + args.name + '" already exists.');
    }

    args = _.extend({
      ssh_port: 22,
      user: 'root',
      ssh_key: utils.normalizeKeyPath(args['ssh-key'] || 'overcast.key'),
      ssh_pub_key: utils.normalizeKeyPath(args['ssh-key'] || 'overcast.key.pub'),
      image: args.image || 'trusty64',
      ram: args.ram || '512'
    }, args);

    API.getImages(args)
      .then(API.createBox)
      .then(API.createInstance)
      .then(function (args) {
        var instance = {
          name: args.name,
          ip: args.ip,
          ssh_key: args.ssh_key,
          ssh_port: '22',
          user: 'root',
          virtualbox: {
            dir: args.dir,
            image: args.image,
            ram: args.ram
          }
        };

        utils.saveInstanceToCluster(args.cluster, instance);
        utils.success('New virtualbox instance "' + instance.name + '" (' + instance.ip + ') created.');
      })
      .catch(API.catch);
  };
});

subcommands.destroy = utils.module(function (exports) {
  exports.signature = 'overcast virtualbox destroy [name]';

  exports.help = function () {
    utils.printArray([
      exports.signature,
      '  Destroys a virtualbox instance.'.grey,
      '',
      '    Option                   | Default'.grey,
      '    --force                  | false'.grey,
      '',
      '  Example:'.grey,
      '  $ overcast virtualbox destroy local.01'.grey
    ]);
  };

  exports.run = function (args) {
    var clusters = utils.getClusters();
    utils.argShift(args, 'name');

    if (!args.name) {
      return utils.missingParameter('[name]', exports.help);
    }

    var instance = utils.findFirstMatchingInstance(args.name);
    utils.handleInstanceNotFound(instance, args);

    if (!instance.virtualbox || !instance.virtualbox.dir) {
      return utils.die('This instance does not have a corresponding vagrant directory.');
    }

    if (args.force) {
      return destroy(instance);
    }

    var rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question('Do you really want to destroy instance ' + instance.name + '? [Y/n]'.yellow, function (answer) {
      rl.close();
      if (answer === 'n' || answer === 'N') {
        utils.grey('No action taken.');
      } else {
        destroy(instance);
      }
    });

    function destroy(instance) {
      API.destroyInstance(instance)
        .then(function (instance) {
          utils.success('Instance "' + instance.name + '" destroyed.');
          utils.deleteInstance(instance);
        })
        .catch(API.catch);
    }
  };
});

subcommands.reboot = utils.module(function (exports) {
  exports.signature = 'overcast virtualbox reboot [name]';

  exports.help = function () {
    utils.printArray([
      exports.signature,
      '  Reboots a virtualbox instance.'.grey,
      '',
      '  Example:'.grey,
      '  $ overcast virtualbox reboot local.01'.grey
    ]);
  };

  exports.run = function (args) {
    var clusters = utils.getClusters();
    utils.argShift(args, 'name');

    if (!args.name) {
      return utils.missingParameter('[name]', exports.help);
    }

    var instance = utils.findFirstMatchingInstance(args.name);
    utils.handleInstanceNotFound(instance, args);

    if (!instance.virtualbox || !instance.virtualbox.dir) {
      return utils.die('This instance does not have a corresponding vagrant directory.');
    }

    API.stopInstance(instance)
      .then(API.startInstance)
      .then(function (instance) {
        utils.success('Instance ' + instance.name + ' rebooted.');
        // Vagrant already waits for the server to boot, no need for utils.waitForBoot here.
      })
      .catch(API.catch);
  };
});

subcommands.start = utils.module(function (exports) {
  exports.signature = 'overcast virtualbox start [name]';

  exports.help = function () {
    utils.printArray([
      exports.signature,
      '  Starts a virtualbox instance.'.grey,
      '',
      '  Example:'.grey,
      '  $ overcast virtualbox start local.01'.grey
    ]);
  };

  exports.run = function (args) {
    var clusters = utils.getClusters();
    utils.argShift(args, 'name');

    if (!args.name) {
      return utils.missingParameter('[name]', exports.help);
    }

    var instance = utils.findFirstMatchingInstance(args.name);
    utils.handleInstanceNotFound(instance, args);

    if (!instance.virtualbox || !instance.virtualbox.dir) {
      return utils.die('This instance does not have a corresponding vagrant directory.');
    }

    API.startInstance(instance)
      .then(function (instance) {
        utils.success('Instance ' + instance.name + ' started.');
        // Vagrant already waits for the server to boot, no need for utils.waitForBoot here.
      })
      .catch(API.catch);
  };
});

subcommands.stop = utils.module(function (exports) {
  exports.signature = 'overcast virtualbox stop [name]';

  exports.help = function () {
    utils.printArray([
      exports.signature,
      '  Stop a virtualbox instance.'.grey,
      '',
      '  Example:'.grey,
      '  $ overcast virtualbox stop local.01'.grey
    ]);
  };

  exports.run = function (args) {
    var clusters = utils.getClusters();
    utils.argShift(args, 'name');

    if (!args.name) {
      return utils.missingParameter('[name]', exports.help);
    }

    var instance = utils.findFirstMatchingInstance(args.name);
    utils.handleInstanceNotFound(instance, args);

    if (!instance.virtualbox || !instance.virtualbox.dir) {
      return utils.die('This instance does not have a corresponding vagrant directory.');
    }

    API.stopInstance(instance)
      .then(function (instance) {
        utils.success('Instance ' + instance.name + ' stopped.');
      })
      .catch(API.catch);
  };
});
