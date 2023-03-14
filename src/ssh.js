import fs from 'fs';
import path from 'path';
import cp from 'child_process';
import * as utils from './utils.js';
import * as log from './log.js';
import { decreaseSSHCount } from './store.js';

export function run(args, nextFn) {
  // Handle cases where minimist mistakenly parses ssh-args (e.g. "-tt" becomes { t: true }).
  if (args['ssh-args'] === true) {
    const rawArgs = process.argv.slice(2);
    const rawArgsIndex = rawArgs.findIndex(arg => arg === '--ssh-args') + 1;
    if (rawArgs[rawArgsIndex]) {
      args['ssh-args'] = rawArgs[rawArgsIndex];
    }
  }

  let instances = utils.findMatchingInstances(args.name);
  utils.handleInstanceOrClusterNotFound(instances, args);

  if (instances.length > 1 && utils.argIsTruthy(args['only-once'])) {
    instances = [instances[0]];
  }

  if (args.parallel || args.p) {
    runOnInstancesInParallel(instances, args, nextFn);
  } else {
    runOnInstances(instances, args, nextFn);
  }
}

function runOnInstancesInParallel(instances, args, nextFn) {
  const fns = instances.map((instance) => {
    return (nextFn) => {
      runOnInstance(instance, utils.deepClone(args), nextFn);
    };
  });

  utils.allInParallelThen(fns, nextFn);
}

function runOnInstances(instances, args, nextFn = () => {}) {
  const instance = instances.shift();
  runOnInstance(instance, utils.deepClone(args), () => {
    if (instances.length > 0) {
      runOnInstances(instances, args, nextFn);
    } else {
      nextFn();
    }
  });
}

function runOnInstance(instance, args, nextFn) {
  const command = args._.shift();
  const vars = utils.getVariables();

  sshExec({
    ip: instance.ip,
    name: instance.name,
    user: args.user || vars.OVERCAST_SSH_USER || instance.user,
    password: args.password || instance.password,
    ssh_key: args['ssh-key'] || vars.OVERCAST_SSH_KEY || instance.ssh_key,
    ssh_args: utils.isString(args['ssh-args']) ? args['ssh-args'] : '',
    ssh_port: instance.ssh_port,
    continueOnError: args.continueOnError,
    machineReadable: args['mr'] || args['machine-readable'],
    env: args.env,
    command,
    shell_command: args['shell-command']
  }, () => {
    if (args._.length > 0) {
      runOnInstance(instance, args, nextFn);
    } else if (utils.isFunction(nextFn)) {
      nextFn();
    }
  });
}

function sshExec(options, nextFn) {
  if (!options.ip) {
    utils.die('IP missing.');
    return nextFn();
  }

  const color = utils.getNextColor();

  options.ssh_key = utils.normalizeKeyPath(options.ssh_key);
  options.ssh_port = options.ssh_port || '22';
  options.user = options.user || 'root';
  options.password = options.password || '';
  options.name = options.name || 'Unknown';

  const args = [
    utils.escapeWindowsPath(utils.getFileDirname() + '/../bin/overcast-ssh')
  ];

  const sshEnv = {
    OVERCAST_KEY: utils.escapeWindowsPath(options.ssh_key),
    OVERCAST_PORT: options.ssh_port,
    OVERCAST_USER: options.user,
    OVERCAST_PASSWORD: options.password,
    OVERCAST_IP: options.ip,
    OVERCAST_SSH_ARGS: options.ssh_args
  };

  if (options.env) {
    if (utils.isObject(options.env)) {
      sshEnv.OVERCAST_ENV = utils.mapObject(options.env, (val, key) => {
        return key + '="' + (val + '').replace(/"/g, '\"') + '"';
      }).join(' ');
    } else if (utils.isArray(options.env)) {
      sshEnv.OVERCAST_ENV = options.env.join(' ');
    } else if (utils.isString(options.env)) {
      sshEnv.OVERCAST_ENV = options.env.trim();
    }
    if (sshEnv.OVERCAST_ENV) {
      sshEnv.OVERCAST_ENV += ' ';
    }
  }

  const cwdScriptFile = commandAsScriptFile(options.command, process.cwd());
  const bundledScriptFile = commandAsScriptFile(options.command, utils.getFileDirname() + '/../scripts');

  if (fs.existsSync(cwdScriptFile)) {
    sshEnv.OVERCAST_SCRIPT_FILE = utils.escapeWindowsPath(cwdScriptFile);
  } else if (fs.existsSync(bundledScriptFile)) {
    sshEnv.OVERCAST_SCRIPT_FILE = utils.escapeWindowsPath(bundledScriptFile);
  } else {
    sshEnv.OVERCAST_COMMAND = options.command;
  }

  if (options.shell_command) {
    sshEnv.SHELL_COMMAND = options.shell_command;
  }

  if (options.machineReadable) {
    sshEnv.OVERCAST_HIDE_COMMAND = 1;
  }

  if (utils.isTestRun()) {
    log.log('mocked call of SSH command');
    log.log(args);
    log.log(sshEnv);

    return nextFn();
  }

  const ssh = cp.spawn('bash', args, { env: Object.assign({}, process.env, sshEnv) });
  const connectionProblem = false;

  ssh.stdout.on('data', data => {
    if (options.machineReadable) {
      process.stdout.write(data + '');
    } else {
      utils.prefixPrint(options.name, color, data);
    }
  });

  ssh.stderr.on('data', data => {
    if (data.toString().includes( 'Operation timed out') ||
      data.toString().includes('No route to host') ||
      data.toString().includes('Host is down')) {
      connectionProblem = true;
    }

    if (options.machineReadable) {
      process.stdout.write(data + '');
    } else {
      utils.prefixPrint(options.name, color, data, 'grey');
    }
  });

  ssh.on('exit', code => {
    if (connectionProblem && code === 255) {
      options.retries = options.retries ? options.retries + 1 : 1;
      options.maxRetries = options.maxRetries || 3;

      if (options.retries <= options.maxRetries) {
        utils.prefixPrint(options.name, color, 'Retrying (' +
          options.retries + ' of ' + options.maxRetries + ' attempts)...', 'red');
        log.br();
        // Do this to keep the same color for this session.
        decreaseSSHCount();
        sshExec(options, nextFn);
        return false;
      } else {
        // TODO: implement events
        // events.trigger('ssh.timeout', options);
        utils.prefixPrint(options.name, color, 'Giving up!', 'red');
      }
    }
    if (code !== 0 && !options.continueOnError) {
      const str = 'SSH connection exited with a non-zero code (' + code + '). Stopping execution...';
      utils.prefixPrint(options.name, color, str, 'red');
      process.exit(1);
    }
    if (!options.machineReadable) {
      log.br();
    }
    if (utils.isFunction(nextFn)) {
      nextFn();
    }
  });
}

function commandAsScriptFile(str, scriptDir) {
  return str.charAt(0) === '/' ? str : path.normalize(scriptDir + '/' + str);
}
