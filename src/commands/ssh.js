import cp from 'child_process';
import _ from 'lodash';
import * as utils from '../utils.js';
import * as filters from '../filters.js';

export const commands = {};

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
    { usage: '--user USERNAME' },
    { usage: '--password PASSWORD' },
    { usage: '--ssh-key PATH' }
  ],
  run: (args) => {
    // Fix "possible EventEmitter memory leak detected" errors.
    // Ref: https://github.com/andrewchilds/overcast/issues/14
    process.stdin.setMaxListeners(0);

    connect(args.instance, args);
  }
};

function connect(instance, args) {
  const privateKeyFile = utils.normalizeKeyPath(args['ssh-key'] || instance.ssh_key || `${utils.CONFIG_DIR}/keys/overcast.key`);
  const sshPort = instance.ssh_port || '22';
  const host = `${args.user || instance.user || 'root'}@${instance.ip}`;
  const password = (args.password || instance.password || '');

  const command = [];
  if (password) {
    command.push('sshpass');
    command.push(`-p${password}`);
  }
  command.push('ssh');
  command.push('-tt');
  if (!password) {
    command.push('-i');
    command.push(privateKeyFile);
  }
  command.push('-p');
  command.push(sshPort);
  command.push('-o');
  command.push('StrictHostKeyChecking=no');
  if (password) {
    command.push('-o');
    command.push('PubkeyAuthentication=no');
  }
  command.push(host);

  console.log(command.join(' '));

  const ssh = cp.spawn(command.shift(), command, {
    stdio: 'inherit'
  });

  ssh.on('error', err => {
    utils.red('There was an error running this command.');
    if (password) {
      utils.red('You need the "sshpass" program installed to use password-based');
      utils.red('SSH authentication. Do you have that installed?');
    }
  });

  ssh.on('exit', code => {
    process.stdin.pause();

    if (code !== 0) {
      const str = `SSH connection exited with a non-zero code (${code}).`;
      utils.die(str);
    }
  });
}
