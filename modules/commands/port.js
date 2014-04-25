var _ = require('lodash');
var utils = require('../utils');
var ssh = require('../ssh');

exports.run = function (args) {
  utils.argShift(args, 'name');

  if (!args.name) {
    utils.missingParameter('[instance|cluster|all]', exports.help);
  } else if (args._.length === 0) {
    utils.missingParameter('[port]', exports.help);
  }

  var instances = utils.findMatchingInstances(args.name);
  utils.handleInstanceOrClusterNotFound(instances, args);

  var new_ssh_port = args._[0] + '';

  args.env = {
    new_ssh_port: new_ssh_port
  };

  args._ = ['change_ssh_port'];
  ssh(args, function () {
    _.each(instances, function (instance) {
      utils.updateInstance(instance.name, {
        ssh_port: new_ssh_port
      });
    });
  });
};

exports.signatures = function () {
  return [
    '  overcast port [instance|cluster|all] [port]'
  ];
};

exports.help = function () {
  utils.printArray([
    'overcast port [instance|cluster|all] [port]',
    '  Change the SSH port for an instance or a cluster.'.grey,
    '  This command will fail if the new port is not opened by iptables.'.grey,
    '',
    '  Examples:'.grey,
    '  $ overcast port app.01 22222'.grey,
    '  $ overcast port db 22222'.grey
  ]);
};
