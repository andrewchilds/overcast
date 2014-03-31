var spawn = require('child_process').spawn;
var _ = require('lodash');
var utils = require('../utils');
var ssh = require('../ssh');

exports.run = function (args) {
  utils.argShift(args, 'name');

  if (!args.name) {
    utils.red('Missing [name] parameter.');
    return exports.help(args);
  } else if (args._.length === 0) {
    utils.red('Missing [port] parameter.');
    return exports.help(args);
  }

  args.env = {
    'new_ssh_port': args._[0] + ''
  };

  args._ = ['change_ssh_port'];
  ssh(args);

  utils.updateInstance(args.name, {
    ssh_port: args.env.new_ssh_port
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
    '  Careful, this port should already be open!'.yellow,
    '',
    '  Examples:'.grey,
    '  $ overcast port app.01 22222'.grey,
    '  $ overcast port db 22222'.grey
  ]);
};
