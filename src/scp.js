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

function runOnInstances(stack, args, nextFn) {
  const instance = stack.shift();
  runOnInstance(instance, utils.deepClone(args), () => {
    if (stack.length > 0) {
      runOnInstances(stack, args);
    } else {
      nextFn();
    }
  });
}

function runOnInstance(instance, args, nextFn = () => {}) {
  scpExec({
    ip: instance.ip,
    user: args.user || instance.user,
    password: args.password || instance.password,
    name: instance.name,
    ssh_key: args['ssh-key'] || instance.ssh_key,
    ssh_port: instance.ssh_port,
    env: args.env,
    direction: args.direction,
    source: args.source,
    dest: args.dest
  }, nextFn);
}

function scpExec(options, nextFn = () => {}) {
  if (!options.ip) {
    return utils.die('IP missing.');
  }

  const color = utils.getNextColor();

  options.ssh_key = utils.normalizeKeyPath(options.ssh_key);
  options.ssh_port = options.ssh_port || '22';
  options.user = options.user || 'root';
  options.name = options.name || 'Unknown';

  const args = [];
  if (options.password) {
    args.push('sshpass');
    args.push('-p' + options.password);
  }
  args.push('scp');
  args.push('-r');
  if (!options.password) {
    args.push('-i');
    args.push(options.ssh_key);
  }
  args.push('-P');
  args.push(options.ssh_port);
  args.push('-o');
  args.push('StrictHostKeyChecking=no');
  if (options.password) {
    args.push('-o');
    args.push('PubkeyAuthentication=no');
  }

  if (options.direction === 'pull') {
    options.dest = utils.convertToAbsoluteFilePath(options.dest);
    options.dest = utils.replaceInstanceName(options.name, options.dest);
    args.push((options.user || 'root') + '@' + options.ip + ':' + options.source);
    args.push(options.dest);
  } else if (options.direction === 'push') {
    options.source = utils.convertToAbsoluteFilePath(options.source);
    options.source = utils.replaceInstanceName(options.name, options.source);
    args.push(options.source);
    args.push((options.user || 'root') + '@' + options.ip + ':' + options.dest);
  } else {
    return utils.die('No direction specified.');
  }

  log.faded(args.join(' '));

  if (utils.isTestRun()) {
    log.log('mocked call of SCP command');

    return nextFn();
  }

  const scp = utils.spawn(args);

  scp.stdout.on('data', data => {
    utils.prefixPrint(options.name, color, data);
  });

  scp.stderr.on('data', data => {
    utils.prefixPrint(options.name, color, data, 'grey');
  });

  scp.on('exit', code => {
    if (code !== 0) {
      const str = 'SCP connection exited with a non-zero code (' + code + '). Stopping execution...';
      utils.prefixPrint(options.name, color, str, 'red');
      process.exit(1);
    }
    log.success(options.source + ' transferred to ' + options.dest);
    log.br();

    nextFn();
  });
}
