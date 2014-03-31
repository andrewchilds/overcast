var spawn = require('child_process').spawn;
var _ = require('lodash');
var utils = require('../utils');
var ssh = require('../ssh');
var help = require('./help');

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
    exposed_ports: args._.join(' ')
  };
  args._ = ['install/iptables'];

  ssh(args);
};

exports.signatures = function () {
  return [
    '  overcast expose [instance|cluster|all] [port...]'
  ];
};

exports.help = function (args) {
  utils.printArray([
    'overcast expose [instance|cluster|all] [port...]',
    '  Reset the exposed ports on the instance or cluster using iptables.'.grey,
    '  This will fail if you don\'t include the current SSH port.'.grey,
    '  Expects an Ubuntu server, untested on other distributions.'.yellow,
    '',
    '  Examples:'.grey,
    '  $ overcast expose redis 22 6379'.grey,
    '  $ overcast expose mysql 22 3306'.grey,
    '  $ overcast expose app 22 80 443'.grey
  ]);
};
