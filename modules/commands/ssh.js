var cp = require('child_process');
var _ = require('lodash');
var utils = require('../utils');

exports.run = function (args) {
  utils.argShift(args, 'name');

  if (!args.name) {
    return utils.missingParameter('[name]', exports.help);
  }

  var instance = utils.findFirstMatchingInstance(args.name);
  utils.handleInstanceNotFound(instance, args);

  connect(instance, args);
};

function connect(instance, args) {
  var color = utils.SSH_COLORS[utils.SSH_COUNT++ % 5];

  var privateKeyFile = args['ssh-key'] || instance.ssh_key || utils.CONFIG_DIR + '/keys/overcast.key';
  var sshPort = instance.ssh_port || '22';
  var host = (args.user || instance.user || 'root') + '@' + instance.ip;

  var ssh = cp.spawn('ssh', [
    '-tt',
    '-i',
    privateKeyFile,
    '-p',
    sshPort,
    '-o',
    'StrictHostKeyChecking=no',
    host
  ]);

  console.log('$ ssh -i ' + privateKeyFile + ' -p ' + sshPort + ' ' + host);

  process.stdin.resume();
  process.stdin.on('data', function (chunk) {
    ssh.stdin.write(chunk);
  });

  ssh.stdout.on('data', function (data) {
    utils.prefixPrint(instance.name, color, data);
  });

  ssh.stderr.on('data', function (data) {
    utils.prefixPrint(instance.name, color, data, 'grey');
  });

  ssh.on('exit', function (code) {
    process.stdin.pause();
    if (code !== 0) {
      var str = 'SSH connection exited with a non-zero code (' + code + '). Stopping execution...';
      utils.prefixPrint(instance.name, color, str, 'red');
      process.exit(1);
    }
    console.log('');
  });
}

exports.signatures = function () {
  return [
    '  overcast ssh [name]'
  ];
};

exports.help = function () {
  utils.printArray([
    'overcast ssh [name]',
    '  Opens an interactive SSH connection to an instance.'.grey,
    '',
    '  Option'.grey,
    '  --ssh-key PATH'.grey,
    '  --user NAME'.grey
  ]);
};
