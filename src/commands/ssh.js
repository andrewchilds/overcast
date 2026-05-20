import cp from 'child_process';
import * as utils from '../utils.js';
import * as filters from '../filters.js';
import * as log from '../log.js';
import { getConfigDir } from '../store.js';

export const commands = {};

commands.ssh = {
  name: 'ssh',
  usage: ['overcast ssh [instance] [options...]'],
  description: [
    'Opens an interactive SSH connection to an instance.'
  ],
  required: [
    { name: 'instance', varName: 'name', filters: filters.findFirstMatchingInstance }
  ],
  examples: [
    '$ overcast ssh instance-01',
    '# To use a personal username and key in variables.json:',
    '$ overcast vars set OVERCAST_SSH_USER my-username',
    '$ overcast vars set OVERCAST_SSH_KEY /path/to/my.key',
    '$ overcast ssh instance-01 # will use the above variables to attempt a connection'
  ],
  options: [
    { usage: '--user USERNAME' },
    { usage: '--password PASSWORD' },
    { usage: '--ssh-key PATH' }
  ],
  run: (args, nextFn) => {
    // This fixes a "possible EventEmitter memory leak detected" error.
    // Ref: https://github.com/andrewchilds/overcast/issues/14
    process.stdin.setMaxListeners(0);

    connect(args.instance, args, nextFn);
  }
};

function connect(instance, args, nextFn = () => {}) {
  // Use getVariable for proper precedence: CLI args > env > variables.json
  const sshKeyArg = args['ssh-key'] || utils.getVariable('OVERCAST_SSH_KEY') || instance.ssh_key;
  const sshKey = sshKeyArg ? utils.normalizeKeyPath(sshKeyArg) : '';
  const sshPort = instance.ssh_port || '22';
  const sshUser = args.user || utils.getVariable('OVERCAST_SSH_USER') || instance.user || 'root';
  const host = `${sshUser}@${instance.ip}`;
  const password = (args.password || instance.password || '');

  const command = [];
  if (password) {
    command.push('sshpass');
    command.push(`-p${password}`);
  }
  command.push('ssh');
  command.push('-tt');
  // Only pass -i if a key is specified and not using password auth
  // Otherwise let OpenSSH use ssh-agent, ~/.ssh/config, or default keys
  if (!password && sshKey) {
    command.push('-i');
    command.push(sshKey);
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

  log.log(command.join(' '));

  const ssh = cp.spawn(command.shift(), command, {
    stdio: 'inherit'
  });

  ssh.on('error', (err) => {
    log.failure('There was an error running this command. ' + err);
    if (password) {
      log.failure('You need the "sshpass" program installed to use password-based');
      log.failure('SSH authentication. Do you have that installed?');
    }
  });

  ssh.on('exit', code => {
    process.stdin.pause();

    if (code !== 0) {
      const str = `SSH connection exited with a non-zero code (${code}).`;
      utils.die(str);
    }

    nextFn();
  });
}
