import fs from 'fs';
import cp from 'child_process';
import _ from 'lodash';
import utils from './utils';

export function run(args) {
  var instances = utils.findMatchingInstances(args.name);
  utils.handleInstanceOrClusterNotFound(instances, args);

  if (args.parallel || args.p) {
    utils.each(instances, instance => {
      runOnInstance(instance, _.cloneDeep(args));
    });
  } else {
    runOnInstances(_.toArray(instances), args);
  }
}

function runOnInstances(stack, args) {
  var instance = stack.shift();
  runOnInstance(instance, _.cloneDeep(args), () => {
    if (stack.length > 0) {
      runOnInstances(stack, args);
    }
  });
}

function runOnInstance(instance, args, next) {
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
  }, () => {
    if (utils.isFunction(next)) {
      next();
    }
  });
}

function scpExec(options, next) {
  if (!options.ip) {
    return utils.die('IP missing.');
  }

  var color = utils.SSH_COLORS[utils.SSH_COUNT++ % 5];

  options.ssh_key = utils.normalizeKeyPath(options.ssh_key);
  options.ssh_port = options.ssh_port || '22';
  options.user = options.user || 'root';
  options.name = options.name || 'Unknown';

  var args = [];
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

  utils.grey(args.join(' '));
  var scp = utils.spawn(args);

  scp.stdout.on('data', data => {
    utils.prefixPrint(options.name, color, data);
  });

  scp.stderr.on('data', data => {
    utils.prefixPrint(options.name, color, data, 'grey');
  });

  scp.on('exit', code => {
    if (code !== 0) {
      var str = 'SCP connection exited with a non-zero code (' + code + '). Stopping execution...';
      utils.prefixPrint(options.name, color, str, 'red');
      process.exit(1);
    }
    utils.success(options.source + ' transferred to ' + options.dest);
    console.log('');
    if (utils.isFunction(next)) {
      next();
    }
  });
}
