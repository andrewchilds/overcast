import * as utils from './utils.js';
import * as log from './log.js';

export function run(args, nextFn) {
  const instances = utils.findMatchingInstances(args.name);
  utils.handleInstanceOrClusterNotFound(instances, args);

  if (args.parallel || args.p) {
    instances.forEach((instance) => {
      runOnInstance(instance, utils.deepClone(args), nextFn);
    });
  } else {
    runOnInstances(instances, args, nextFn);
  }
}

function runOnInstances(instances, args, nextFn) {
  const instance = instances.shift();
  runOnInstance(instance, utils.deepClone(args), () => {
    if (instances.length > 0) {
      runOnInstances(instances, args);
    } else {
      nextFn();
    }
  });
}

function runOnInstance(instance, args, nextFn = () => {}) {
  const vars = utils.getVariables();

  rsync({
    ip: instance.ip,
    name: instance.name,
    user: args.user || vars.OVERCAST_SSH_USER || instance.user,
    password: args.password || instance.password,
    ssh_key: args['ssh-key'] || vars.OVERCAST_SSH_KEY || instance.ssh_key,
    ssh_port: instance.ssh_port,
    env: args.env,
    exclude: args.exclude,
    direction: args.direction,
    source: args.source,
    dest: args.dest
  }, nextFn);
}

function rsync(options, nextFn = () => {}) {
  if (!options.ip) {
    return utils.die('IP missing.');
  }

  const color = utils.getNextColor();

  options.ssh_key = utils.normalizeKeyPath(options.ssh_key);
  options.ssh_port = options.ssh_port || '22';
  options.user = options.user || 'root';
  options.name = options.name || 'Unknown';

  const ssh = [];
  if (options.password) {
    ssh.push('sshpass');
    ssh.push('-p' + options.password);
  }
  ssh.push('ssh');
  ssh.push('-p');
  ssh.push(options.ssh_port);
  if (options.password) {
    ssh.push('-o');
    ssh.push('PubkeyAuthentication=no');
  } else {
    ssh.push('-i');
    ssh.push(options.ssh_key);
  }

  const args = [
    'rsync',
    '-e "' + ssh.join(' ') + '"',
    '-varuzP',
    '--delete',
    '--ignore-errors'
  ];

  if (options.exclude) {
    args.push('--exclude');
    args.push(options.exclude);
  }

  if (options.direction === 'pull') {
    options.dest = utils.convertToAbsoluteFilePath(options.dest);
    options.dest = utils.replaceInstanceName(options.name, options.dest);
    args.push(options.user + '@' + options.ip + ':' + options.source);
    args.push(options.dest);
  } else if (options.direction === 'push') {
    options.source = utils.convertToAbsoluteFilePath(options.source);
    options.source = utils.replaceInstanceName(options.name, options.source);
    args.push(options.source);
    args.push(options.user + '@' + options.ip + ':' + options.dest);
  } else {
    return utils.die('No direction specified.');
  }

  log.faded(args.join(' '));

  if (utils.isTestRun()) {
    log.log('mocked call of Rsync command');

    return nextFn();
  }

  const rsyncProcess = utils.spawn(args);

  rsyncProcess.stdout.on('data', data => {
    utils.prefixPrint(options.name, color, data);
  });

  rsyncProcess.stderr.on('data', data => {
    utils.prefixPrint(options.name, color, data, 'grey');
  });

  rsyncProcess.on('exit', code => {
    if (code !== 0) {
      const str = 'rsync exited with a non-zero code (' + code + '). Stopping execution...';
      utils.prefixPrint(options.name, color, str, 'red');
      process.exit(1);
    }
    log.success(options.source + ' transferred to ' + options.dest);
    log.br();

    nextFn();
  });
}
