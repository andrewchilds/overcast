var cp = require('child_process');
var _ = require('lodash');
var utils = require('../utils');

exports.run = function (args) {
  utils.argShift(args, 'name');

  var color = utils.SSH_COLORS[utils.SSH_COUNT++ % 5];

  if (!args.name) {
    utils.die('Missing [name] parameter.');
  }

  var instance = utils.findOnlyMatchingInstance(args.name);
  if (!instance) {
    utils.handleEmptyInstances({}, args);
  }

  var ssh = cp.spawn('ssh', [
    '-tt',
    '-i',
    (args['ssh-key'] || instance.ssh_key || utils.CONFIG_DIR + '/keys/overcast.key'),
    '-p',
    (instance.ssh_port || '22'),
    '-o',
    'StrictHostKeyChecking=no',
    (args.user || instance.user || 'root') + '@' + instance.ip
  ]);

  process.stdin.resume();
  process.stdin.on('data', function (chunk) {
    ssh.stdin.write(chunk);
  });

  ssh.stdout.on('data', function (data) {
    data = (data + '').trim().split("\n");
    _.each(data, function (line) {
      utils.prefixPrint(instance.name, color, line, 'white');
    });
  });

  ssh.stderr.on('data', function (data) {
    data = (data + '').trim().split("\n");
    _.each(data, function (line) {
      utils.prefixPrint(instance.name, color, line, 'red');
    });
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
};

exports.signatures = function () {
  return [
    '  overcast ssh [instance]'
  ];
};

exports.help = function () {
  utils.printArray([
    'overcast ssh [instance]',
    '  Opens an SSH connection to an instance.'.grey,
    '',
    '  Option'.grey,
    '  --ssh-key=PATH'.grey,
    '  --user=NAME'.grey
  ]);
};
