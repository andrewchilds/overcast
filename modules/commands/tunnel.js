import _ from 'lodash';
import utils from '../utils';
import filters from '../filters';

const commands = {};
export {commands};

commands.tunnel = {
  name: 'tunnel',
  usage: 'overcast tunnel [instance] [local-port((:hostname):remote-port)...]',
  description: [
    'Opens an SSH tunnel to the port(s) specified.',
    'If only one port is specified, assume the same port for local/remote.',
    'If no remote host is specified, assume the remote host itself (127.0.0.1).',
    'Multiple tunnels can be opened over a single connection.'
  ],
  examples: [
    '# Tunnel local 5984 to remote 5984',
    '$ overcast tunnel app-01 5984',
    '',
    '# Tunnel local 8000 to remote 5984, local 8001 to remote 3000',
    '$ overcast tunnel app-01 8000:5984 8001:3000',
    '',
    '# Tunnel local 3000 to otherhost.com:4000',
    '$ overcast tunnel app-01 3000:otherhost.com:4000'
  ],
  required: [
    { name: 'instance', varName: 'name', filters: filters.findFirstMatchingInstance },
    { name: 'local-port((:hostname):remote-port)...', varName: 'firstPort', raw: true }
  ],
  options: [
    { usage: '--user USERNAME' },
    { usage: '--password PASSWORD' },
    { usage: '--ssh-key PATH' }
  ],
  run: function (args) {
    args._.unshift(args.firstPort);
    delete args.firstPort;

    connect(args.instance, args);
  }
};

function connect(instance, args) {
  const password = (args.password || instance.password || '');

  const sshArgs = [];
  if (password) {
    sshArgs.push('sshpass');
    sshArgs.push(`-p${password}`);
  }
  sshArgs.push('ssh');
  if (!password) {
    sshArgs.push('-i');
    sshArgs.push(utils.normalizeKeyPath(args['ssh-key'] || instance.ssh_key || 'overcast.key'));
  }
  sshArgs.push('-p');
  sshArgs.push((instance.ssh_port || '22'));
  sshArgs.push('-o');
  sshArgs.push('StrictHostKeyChecking=no');
  if (password) {
    sshArgs.push('-o');
    sshArgs.push('PubkeyAuthentication=no');
  }

  const ports = exports.normalizePorts(args._);
  utils.each(ports, port => {
    sshArgs.push(`-L ${port.localPort}:${port.remoteHost}:${port.remotePort}`);
  });

  sshArgs.push(`${args.user || instance.user || 'root'}@${instance.ip}`);
  sshArgs.push('-N'); // Don't run a command.

  const ssh = utils.spawn(sshArgs);

  utils.grey(sshArgs.join(' '));

  utils.each(ports, port => {
    utils.cyan(`Tunneling from ${port.localPort} to ${port.remoteHost}:${port.remotePort}.`);
  });

  ssh.stdout.on('data', data => {
    utils.grey(data.toString());
  });

  ssh.stderr.on('data', data => {
    utils.grey(data.toString());
  });

  ssh.on('exit', code => {
    if (code !== 0) {
      utils.die(`SSH connection exited with a non-zero code (${code}). Stopping execution...`);
    }
    console.log('');
  });
}

export function normalizePorts(arr) {
  const ports = [];

  utils.each(arr, str => {
    str = (`${str}`).split(':');
    ports.push({
      localPort: str[0],
      remoteHost: str.length === 3 ? str[1] : '127.0.0.1',
      remotePort: str.length >= 2 ? _.last(str) : str[0]
    });
  });

  return ports;
}
