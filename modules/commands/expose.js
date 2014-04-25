var _ = require('lodash');
var utils = require('../utils');
var ssh = require('../ssh');

exports.run = function (args) {
  utils.argShift(args, 'name');

  if (!args.name) {
    return utils.missingParameter('[instance|cluster|all]', exports.help);
  } else if (args._.length === 0) {
    return utils.missingParameter('[port]', exports.help);
  }

  args.env = {
    exposed_ports: args._.join(' ')
  };
  args._ = ['install/iptables'];
  _.each(args, function (val, key) {
    if (key.indexOf('whitelist') === 0) {
      args.env[key.replace('-', '_')] = val;
    }
  });

  ssh.run(args);
};

exports.signatures = function () {
  return [
    '  overcast expose [instance|cluster|all] [port...] [options]'
  ];
};

exports.help = function () {
  utils.printArray([
    'overcast expose [instance|cluster|all] [port...]',
    '  Reset the exposed ports on the instance or cluster using iptables.'.grey,
    '  This will fail if you don\'t include the current SSH port.'.grey,
    '  Specifying --whitelist will restrict all ports to the specified address(es).'.grey,
    '  These can be individual IPs or CIDR ranges, such as "192.168.0.0/24".'.grey,
    '',
    '  Expects an Ubuntu server, untested on other distributions.'.grey,
    '',
    '    Option'.grey,
    '    --user=NAME'.grey,
    '    --whitelist "IP|RANGE..."'.grey,
    '    --whitelist-PORT "IP|RANGE..."'.grey,
    '',
    '  Examples:'.grey,
    '  # Allow SSH, HTTP and HTTPS connections from anywhere:'.grey,
    '  $ overcast expose app 22 80 443'.grey,
    '  # Allow SSH from anywhere, only allow Redis connections from 1.2.3.4:'.grey,
    '  $ overcast expose redis 22 6379 --whitelist-6379 "1.2.3.4"'.grey,
    '  # Only allow SSH and MySQL connections from 1.2.3.4 or from 5.6.7.xxx:'.grey,
    '  $ overcast expose mysql 22 3306 --whitelist "1.2.3.4 5.6.7.0/24"'.grey
  ]);
};
