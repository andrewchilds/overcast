var cp = require('child_process');
var _ = require('lodash');
var utils = require('../utils');

exports.run = function (args) {
  utils.argShift(args, 'name');

  process.stdin.setMaxListeners(0);

  if (!args.name) {
    return utils.missingParameter('[instance|cluster|all]', exports.help);
  }

  var instances = utils.findMatchingInstances(args.name);
  utils.handleInstanceOrClusterNotFound(instances, args);

  _.each(instances, function (instance) {
    connect(instance, args);
  });
};

function connect(instance, args) {
  var color = utils.SSH_COLORS[utils.SSH_COUNT++ % 5];

  var privateKeyFile = utils.normalizeKeyPath(args['ssh-key'] || instance.ssh_key || utils.CONFIG_DIR + '/keys/overcast.key');
  var sshPort = instance.ssh_port || '22';
  var host = (args.user || instance.user || 'root') + '@' + instance.ip;

  console.log('ssh -tt -i ' + privateKeyFile + ' -p ' + sshPort + ' ' + host);

  var ssh = cp.spawn('ssh', [
    '-tt',
    '-i',
    privateKeyFile,
    '-p',
    sshPort,
    '-o',
    'StrictHostKeyChecking=no',
    host
  ], {
    stdio: 'inherit'
  });

  ssh.on('exit', function (code) {
    process.stdin.pause();

    if (code !== 0) {
      var str = 'SSH connection exited with a non-zero code (' + code + ').';
      utils.die(str);
    }
  });
}

exports.signatures = function () {
  return [
    '  overcast ssh [instance|cluster|all] [options...]'
  ];
};

exports.help = function () {
  utils.printArray([
    'overcast ssh [instance|cluster|all]',
    '  Opens an interactive SSH connection to an instance or cluster.'.grey,
    '  Because what could possibly go wrong?'.grey,
    '',
    '  Option'.grey,
    '  --ssh-key PATH'.grey,
    '  --user NAME'.grey
  ]);
};
