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
    exposed_ports: args._.join(' ')
  };
  args._ = ['install/iptables'];
  if (args.whitelist) {
    args.env.ip_whitelist = args.whitelist;
  }

  ssh(args);
};

exports.signatures = function () {
  return [
    '  overcast expose [instance|cluster|all] [port...] [options]'
  ];
};

exports.help = function (args) {
  utils.printArray([
    'overcast expose [instance|cluster|all] [port...]',
    '  Reset the exposed ports on the instance or cluster using iptables.'.grey,
    '  This will fail if you don\'t include the current SSH port.'.grey,
    '  Specifying --whitelist will restrict all ports to the specified address(es).'.grey,
    '  These can be individual IPs or CIDR ranges, such as "192.168.0.0/24".',
    '',
    '  Expects an Ubuntu server, untested on other distributions.'.grey,
    '',
    '    Option'.grey,
    '    --whitelist "IP IP IP"'.grey,
    '',
    '  Examples:'.grey,
    '  $ overcast expose redis 22 6379'.grey,
    '  $ overcast expose mysql 22 3306 --whitelist "1.1.1.1 2.2.2.2 192.168.100.0/24"'.grey,
    '  $ overcast expose app 22 80 443'.grey
  ]);
};
