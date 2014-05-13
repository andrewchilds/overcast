var _ = require('lodash');
var utils = require('../utils');

exports.run = function (args) {
  utils.argShift(args, 'name');

  if (!args.name) {
    return utils.missingParameter('[instance]', exports.help);
  } else if (args._.length === 0) {
    return utils.missingParameter('[port...]', exports.help);
  }

  var instance = utils.findFirstMatchingInstance(args.name);
  utils.handleInstanceNotFound(instance, args);

  connect(instance, args);
};

function connect(instance, args) {
  var sshArgs = [
    'ssh',
    '-i',
    utils.normalizeKeyPath(args['ssh-key'] || instance.ssh_key || 'overcast.key'),
    '-p',
    (instance.ssh_port || '22'),
    '-o StrictHostKeyChecking=no'
  ];

  var ports = exports.normalizePorts(args._);
  _.each(ports, function (port) {
    sshArgs.push('-L ' + port.localPort + ':' + port.remoteHost + ':' + port.remotePort);
  });

  sshArgs.push((args.user || instance.user || 'root') + '@' + instance.ip);
  sshArgs.push('-N'); // Don't run a command.

  var ssh = utils.spawn(sshArgs);

  utils.grey(sshArgs.join(' '));

  _.each(ports, function (port) {
    utils.cyan('Tunneling from ' + port.localPort + ' to ' + port.remoteHost + ':' + port.remotePort + '.');
  });

  ssh.stdout.on('data', function (data) {
    utils.grey(data.toString());
  });

  ssh.stderr.on('data', function (data) {
    utils.grey(data.toString());
  });

  ssh.on('exit', function (code) {
    if (code !== 0) {
      utils.die('SSH connection exited with a non-zero code (' + code + '). Stopping execution...');
    }
    console.log('');
  });
}

exports.normalizePorts = function (arr) {
  var ports = [];

  _.each(arr, function (str) {
    str = (str + '').split(':');
    ports.push({
      localPort: str[0],
      remoteHost: str.length === 3 ? str[1] : '127.0.0.1',
      remotePort: str.length >= 2 ? _.last(str) : str[0]
    });
  });

  return ports;
};

exports.signatures = function () {
  return [
    '  overcast tunnel [instance] [local-port((:hostname):remote-port)...]'
  ];
};

exports.help = function () {
  utils.printArray([
    'overcast tunnel [instance] [local-port((:hostname):remote-port)...]',
    '  Opens an SSH tunnel to the port(s) specified.'.grey,
    '  If only one port is specified, assume the same port for local/remote.'.grey,
    '  If no remote host is specified, assume the remote host itself (127.0.0.1).'.grey,
    '  Multiple tunnels can be opened over a single connection.'.grey,
    '',
    '  Examples:'.grey,
    '',
    '  # Tunnel local 5984 to remote 5984:'.grey,
    '  $ overcast tunnel app-01 5984'.grey,
    '',
    '  # Tunnel local 8000 to remote 5984, local 8001 to remote 3000.'.grey,
    '  $ overcast tunnel app-01 8000:5984 8001:3000'.grey,
    '',
    '  # Tunnel local 3000 to otherhost.com:4000.'.grey,
    '  $ overcast tunnel app-01 3000:otherhost.com:4000'.grey
  ]);
};
