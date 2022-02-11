var _ = require('lodash');
var Promise = require('bluebird');
var utils = require('../utils');
var ssh = require('../ssh');
var cli = require('../cli');

var API = {
  AWS: require('./aws.js'),
  DigitalOcean: require('./digitalocean.js'),
  Linode: require('./linode.js'),
  VirtualBox: require('./virtualbox.js')
};

exports.run = args => {
  utils.argShift(args, 'name');

  if (!args.name) {
    return utils.missingParameter('[instance|cluster|all]', exports.help);
  }

  var instances = utils.findMatchingInstances(args.name);
  utils.handleInstanceOrClusterNotFound(instances, args);

  var self = { queue: Promise.resolve() };

  function addPromise(fn) {
    // We need to overwrite queue to make `then` sequential.
    self.queue = self.queue.then(() => {
      return new Promise(fn);
    });
  }

  _.each(instances, instance => {
    if (instance.digitalocean) {
      addPromise(resolve => {
        args.command = 'digitalocean';
        args.subcommand = 'reboot';
        args._.unshift(instance.name);
        delete args.name;
        cli.run(API.DigitalOcean.commands.reboot, args, resolve);
      });
    } else if (instance.linode && instance.linode.id) {
      addPromise(resolve => {
        args.command = 'linode';
        args.subcommand = 'reboot';
        args._.unshift(instance.name);
        delete args.name;
        cli.run(API.Linode.commands.reboot, args, resolve);
      });
    } else if (instance.aws && instance.aws.id) {
      addPromise(resolve => {
        args.command = 'aws';
        args.subcommand = 'reboot';
        args._.unshift(instance.name);
        delete args.name;
        cli.run(API.AWS.commands.reboot, args, resolve);
      });
    } else if (instance.virtualbox) {
      addPromise(resolve => {
        args.command = 'virtualbox';
        args.subcommand = 'reboot';
        args._.unshift(instance.name);
        delete args.name;
        cli.run(API.VirtualBox.commands.reboot, args, resolve);
      });
    } else {
      addPromise(resolve => {
        ssh.run({ name: instance.name, _: ['reboot'] }, () => {
          // Giving the server some time to shutdown before testing for connectivity.
          setTimeout(() => {
            utils.waitForBoot(instance, resolve);
          }, 10 * 1000);
        });
      });
    }
  });

  self.queue.catch(err => {
    utils.die('Error: ' + err);
  }).then(() => {
    utils.success('All instances rebooted.');
  });
};

exports.signatures = () => {
  return [
    '  overcast reboot [instance|cluster|all]'
  ];
};

exports.help = () => {
  utils.printArray([
    'overcast reboot [instance|cluster|all]',
    '  Reboot an instance or cluster.'.grey,
    '',
    '  If the instance was created using AWS, DigitalOcean or Linode,'.grey,
    '  this will use the provider API. Otherwise this will execute the "reboot"'.grey,
    '  command on the server and then wait until the server is responsive.'.grey
  ]);
};
