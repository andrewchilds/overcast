import * as utils from '../utils.js';
import * as filters from '../filters.js';
import * as log from '../log.js';

export const commands = {};

commands.tunnel = {
  name: 'tunnel',
  usage: ['overcast tunnel [instance] [local-port((:hostname):remote-port)...]'],
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
  run: (args, nextFn) => {
    args._.unshift(args.firstPort);
    delete args.firstPort;

    connect(args.instance, args, nextFn);
  }
};

function connect(instance, args, nextFn) {
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

  const ports = normalizePorts(args._);
  ports.forEach(({ localPort, remoteHost, remotePort }) => {
    sshArgs.push(`-L ${localPort}:${remoteHost}:${remotePort}`);
  });

  sshArgs.push(`${args.user || instance.user || 'root'}@${instance.ip}`);
  sshArgs.push('-N'); // Don't run a command.

  log.faded(sshArgs.join(' '));

  if (utils.isTestRun()) {
    log.log('mocked call of SSH command');

    return nextFn();
  }

  const ssh = utils.spawn(sshArgs);

  ports.forEach(({ localPort, remoteHost, remotePort }) => {
    log.info(`Tunneling from ${localPort} to ${remoteHost}:${remotePort}.`);
  });

  ssh.stdout.on('data', data => {
    log.faded(data.toString());
  });

  ssh.stderr.on('data', data => {
    log.alert(data.toString());
  });

  ssh.on('exit', code => {
    if (code !== 0) {
      utils.die(`SSH connection exited with a non-zero code (${code}). Stopping execution...`);
    }
    log.br();

    nextFn();
  });
}

export function normalizePorts(arr) {
  const ports = [];

  arr.forEach(str => {
    str = (`${str}`).split(':');
    const hasHostDefined = str.length === 3; // e.g. 3000:otherhost.com:4000
    const hasRemotePortDefined = str.length >= 2; // e.g. 80:8080
    ports.push({
      localPort: str[0],
      remoteHost: hasHostDefined ? str[1] : '127.0.0.1',
      remotePort: hasRemotePortDefined ? str[str.length - 1] : str[0]
    });
  });

  return ports;
}
