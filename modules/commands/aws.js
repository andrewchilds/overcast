var fs = require('fs');
var readline = require('readline');
var _ = require('lodash');
var Promise = require('bluebird');
var utils = require('../utils');
var API = require('../providers/aws');

exports.signatures = function () {
  return utils.printSignatures(subcommands);
};

exports.help = function () {
  utils.printArray([
    'These commands require the following values set in .overcast/variables.json:',
    '  AWS_KEY',
    '  AWS_SECRET',
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
  exports.signature = 'overcast aws create [name] [options...]';

  exports.help = function () {
    utils.printArray([
      exports.signature,
      '  Creates a new EC2 instance.'.grey,
      '',
      '    Option                   | Default'.grey,
      '    --cluster CLUSTER        | default'.grey,
      '    --ami NAME               | ami-018c9568 (Ubuntu 14.04 LTS, 64bit, EBS)'.grey,
      '    --size NAME              | t1.micro'.grey,
      '    --monitoring BOOLEAN     | false'.grey,
      '    --user NAME              | root'.grey,
      ('    --ssh-key KEY_PATH       | overcast.key').grey,
      ('    --ssh-pub-key KEY_PATH   | overcast.key.pub').grey,
      '',
      '  Example:'.grey,
      '  $ overcast aws create db.01 --cluster db --size m1.small --user ubuntu'.grey
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

    if (args['ssh-pub-key']) {
      args.keyPath = args['ssh-pub-key'];
    }

    API.getKeys(args)
      .then(API.createKey)
      .then(API.createInstance)
      .then(function (args) {
        args.InstanceId = args.CreatedInstances[0].InstanceId;
        args.state = 'running';
        return Promise.resolve(args);
      })
      .then(API.waitForInstanceState)
      .then(API.getInstances)
      .catch(API.catch)
      .then(function (args) {
        var instance = {
          name: args.name,
          ip: args.Instances[0].PublicIpAddress,
          ssh_key: utils.normalizeKeyPath(args['ssh-key']),
          ssh_port: '22',
          user: args.user || 'root',
          aws: {
            id: args.InstanceId,
            public_dns_name: args.Instances[0].PublicDnsName,
            private_ip: args.Instances[0].PrivateIpAddress,
            private_dns_name: args.Instances[0].PrivateDnsName
          }
        };

        utils.saveInstanceToCluster(args.cluster, instance);
        utils.success('New instance "' + instance.name + '" (' + instance.ip + ') created on EC2.');
        utils.waitForBoot();
      });
  };
});

subcommands.destroy = utils.module(function (exports) {
  exports.signature = 'overcast aws destroy [name]';

  exports.help = function () {
    utils.printArray([
      exports.signature,
      '  Destroys an EC2 instance.'.grey,
      '',
      '    Option                   | Default'.grey,
      '    --force                  | false'.grey,
      '',
      '  Example:'.grey,
      '  $ overcast aws destroy db.01'.grey
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

    if (!instance.aws || !instance.aws.id) {
      return utils.die('This instance has no EC2 id attached.');
    }

    if (args.force) {
      return destroy(instance);
    }

    var rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question('Do you really want to destroy this instance? [Y/n]'.yellow, function (answer) {
      rl.close();
      if (answer === 'n' || answer === 'N') {
        utils.grey('No action taken.');
      } else {
        destroy(instance);
      }
    });

    function destroy(instance) {
      API.destroyInstance({ InstanceId: instance.aws.id })
        .catch(API.catch)
        .then(function (args) {
          utils.deleteInstance(instance);
          utils.success('Instance destroyed.');
        });
    }
  };
});

subcommands.reboot = utils.module(function (exports) {
  exports.signature = 'overcast aws reboot [name]';

  exports.help = function () {
    utils.printArray([
      exports.signature,
      '  Reboots an EC2 instance.'.grey,
      '',
      '  Example:'.grey,
      '  $ overcast aws reboot db.01'.grey
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

    if (!instance.aws || !instance.aws.id) {
      return utils.die('This instance has no EC2 id attached.');
    }

    var params = {
      InstanceId: instance.aws.id,
      state: 'running'
    };

    API.rebootInstance(params)
      .then(API.waitForInstanceState)
      .catch(API.catch)
      .then(function (args) {
        utils.success('Instance rebooted.');
        utils.waitForBoot();
      });
  };
});

subcommands.start = utils.module(function (exports) {
  exports.signature = 'overcast aws start [name]';

  exports.help = function () {
    utils.printArray([
      exports.signature,
      '  Starts an EC2 instance.'.grey,
      '',
      '  Example:'.grey,
      '  $ overcast aws start db.01'.grey
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

    if (!instance.aws || !instance.aws.id) {
      return utils.die('This instance has no EC2 id attached.');
    }

    var params = {
      InstanceId: instance.aws.id,
      state: 'running'
    };

    API.startInstance(params)
      .then(API.waitForInstanceState)
      .catch(API.catch)
      .then(function (args) {
        utils.success('Instance started.');
        utils.waitForBoot();
      });
  };
});

subcommands.stop = utils.module(function (exports) {
  exports.signature = 'overcast aws stop [name]';

  exports.help = function () {
    utils.printArray([
      exports.signature,
      '  Stop an EC2 instance.'.grey,
      '',
      '  Example:'.grey,
      '  $ overcast aws stop db.01'.grey
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

    if (!instance.aws || !instance.aws.id) {
      return utils.die('This instance has no EC2 id attached.');
    }

    var params = {
      InstanceId: instance.aws.id,
      state: 'stopped'
    };

    API.stopInstance(params)
      .then(API.waitForInstanceState)
      .catch(API.catch)
      .then(function (args) {
        utils.success('Instance stopped.');
      });
  };
});
