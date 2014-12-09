var cp = require('child_process');
var _ = require('lodash');
var utils = require('../utils');
var filters = require('../filters');

var commands = {};
exports.commands = commands;

commands.ssh = {
  name: 'ssh',
  usage: 'overcast ssh [instance] [options...]',
  description: [
    'Opens an interactive SSH connection to an instance.'
  ],
  required: [
    { name: 'instance', varName: 'name', filters: filters.findFirstMatchingInstance }
  ],
  options: [
    { usage: '--user NAME' },
    { usage: '--ssh-key PATH' }
  ],
  run: function (args) {
    // Fix "possible EventEmitter memory leak detected" errors.
    // Ref: https://github.com/andrewchilds/overcast/issues/14
    process.stdin.setMaxListeners(0);

    connect(args.instance, args);
  }
};

function connect(instance, args) {
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
