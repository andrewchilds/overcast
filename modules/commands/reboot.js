var _ = require('lodash');
var Promise = require('bluebird');
var utils = require('../utils');
var ssh = require('../ssh');

var API = {
  DigitalOcean: require('../providers/digitalocean.js'),
  Linode: require('../providers/linode.js')
};

exports.run = function (args) {
  utils.argShift(args, 'name');

  if (!args.name) {
    utils.missingParameter('[instance|cluster|all]', exports.help);
  }

  var instances = utils.findMatchingInstances(args.name);
  utils.handleInstanceOrClusterNotFound(instances, args);

  var self = { queue: Promise.resolve() };

  function addPromise(fn) {
    // We need to overwrite queue to make `then` sequential.
    self.queue = self.queue.then(function () {
      return new Promise(fn);
    });
  }

  _.each(instances, function (instance) {
    if (instance.digitalocean) {
      addPromise(function (resolve) {
        API.DigitalOcean.reboot(instance, resolve);
      });
    } else if (instance.linode && instance.linode.id) {
      addPromise(function (resolve) {
        API.Linode.rebootLinode({ 'linode-id': instance.linode.id }).then(function () {
          utils.waitForBoot(resolve);
        });
      });
    } else {
      addPromise(function (resolve) {
        ssh({ name: instance.name, _: ['reboot'] }, function () {
          // Bumping delay to 60 seconds for shutdown time.
          utils.waitForBoot(resolve, 60);
        });
      });
    }
  });

  self.queue.catch(function (err) {
    utils.red('Error: ', err);
    process.exit(1);
  }).then(function () {
    utils.success('All instances rebooted.');
  });
};

exports.signatures = function () {
  return [
    '  overcast reboot [instance|cluster|all]'
  ];
};

exports.help = function () {
  utils.printArray([
    'overcast reboot [instance|cluster|all]',
    '  Reboot an instance or cluster.'.grey,
    '  If the instance was created using DigitalOcean or Linode, this will use the provider API,'.grey,
    '  otherwise will execute "reboot" command on the server and wait for 60 seconds.'.grey
  ]);
};
