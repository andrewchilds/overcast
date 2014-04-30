var fs = require('fs');
var _ = require('lodash');
var Promise = require('bluebird');
var utils = require('../utils');
var list = require('./list');
var API = require('../providers/aws');

exports.signatures = function () {
  return utils.printSignatures(subcommands);
};

exports.help = function () {
  utils.printArray([
    'These functions require the following values set in .overcast/variables.json:',
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
      '    --cluster CLUSTER        |'.grey,
      '    --ami NAME               | ami-018c9568 (Ubuntu 14.04 LTS, 64bit, EBS)'.grey,
      '    --region NAME            | us-east-1'.grey,
      '    --size NAME              | t1.micro'.grey,
      '    --monitoring BOOLEAN     | false'.grey,
      '    --user NAME              | root'.grey,
      ('    --ssh-key KEY_PATH       | overcast.key').grey,
      ('    --ssh-pub-key KEY_PATH   | overcast.key.pub').grey,
      '',
      '  Example:'.grey,
      '  $ overcast aws create db.01 --cluster db --region us-west-1'.grey
    ]);
  };

  exports.run = function (args) {
    var clusters = utils.getClusters();
    utils.argShift(args, 'name');

    if (!args.name) {
      return utils.missingParameter('[name]', exports.help);
    } else if (!args.cluster) {
      return utils.missingParameter('--cluster', exports.help);
    } else if (!clusters[args.cluster]) {
      return utils.die('No "' + args.cluster + '" cluster found. Known clusters are: ' +
        _.keys(clusters).join(', ') + '.');
    } else if (clusters[args.cluster].instances[args.name]) {
      return utils.dieWithList('Instance "' + args.name + '" already exists.');
    }

    if (args['ssh-pub-key']) {
      args.keyPath = args['ssh-pub-key'];
    }

    API.setRegion(args)
      .then(API.getKeys)
      .then(API.createKey)
      .then(API.createInstance)
      .then(function (args) {
        args.InstanceId = args.CreatedInstances[0].InstanceId;
        args.state = 'running';

        return Promise.resolve(args);
      })
      .then(API.waitForInstanceState)
      .then(API.getInstances)
      .then(function (args) {
        var instance = {
          name: args.name,
          ip: args.Instances[0].PublicIpAddress,
          ssh_key: utils.normalizeKeyPath(args['ssh-key']),
          ssh_port: 22,
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

        return Promise.resolve(args);
      })
      .then(function (args) {
        utils.waitForBoot();
      })
      .catch(API.catch);
  };
});

subcommands.destroy = utils.module(function (exports) {
  exports.signature = 'overcast aws destroy [name]';

  exports.help = function () {
    utils.printArray([
      exports.signature,
      '  Destroys an EC2 instance.'.grey,
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

    API.destroyInstance({ InstanceId: instance.aws.id })
      .then(function (args) {
        utils.deleteInstance(instance);
        utils.success('Instance destroyed.');
      })
      .catch(API.catch);
  };
});
