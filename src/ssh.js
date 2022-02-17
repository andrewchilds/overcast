import fs from 'fs';
import path from 'path';
import cp from 'child_process';
import _ from 'lodash';
import * as utils from './utils.js';
import * as log from './log.js';
import { decreaseSSHCount } from './store.js';

export function run(args, nextFn) {
  // Handle cases where minimist mistakenly parses ssh-args (e.g. "-tt" becomes { t: true }).
  if (args['ssh-args'] === true) {
    var rawArgs = process.argv.slice(2);
    var rawArgsIndex = rawArgs.findIndex(arg => arg === '--ssh-args') + 1;
    if (rawArgs[rawArgsIndex]) {
      args['ssh-args'] = rawArgs[rawArgsIndex];
    }
  }

  var instances = utils.findMatchingInstances(args.name);
  utils.handleInstanceOrClusterNotFound(instances, args);

  if (args.parallel || args.p) {
    runOnInstancesInParallel(instances, args, nextFn);
  } else {
    runOnInstances(instances, args, nextFn);
  }
}

function runOnInstancesInParallel(instances, args, nextFn) {
  const fns = instances.map((instance) => {
    return (nextFn) => {
      runOnInstance(instance, _.cloneDeep(args), nextFn);
    };
  });

  utils.allInParallelThen(fns, nextFn);
}

function runOnInstances(instances, args, nextFn = () => {}) {
  var instance = instances.shift();
  runOnInstance(instance, _.cloneDeep(args), () => {
    if (instances.length > 0) {
      runOnInstances(instances, args, nextFn);
    } else {
      nextFn();
    }
  });
}

function runOnInstance(instance, args, nextFn) {
  var command = args._.shift();
  sshExec({
    ip: instance.ip,
    user: args.user || instance.user,
    password: args.password || instance.password,
    name: instance.name,
    ssh_key: args['ssh-key'] || instance.ssh_key,
    ssh_port: instance.ssh_port,
    ssh_args: utils.isString(args['ssh-args']) ? args['ssh-args'] : '',
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

  var color = utils.getNextColor();

  options.ssh_key = utils.normalizeKeyPath(options.ssh_key);
  options.ssh_port = options.ssh_port || '22';
  options.user = options.user || 'root';
  options.password = options.password || '';
  options.name = options.name || 'Unknown';

  var args = [
    utils.escapeWindowsPath(utils.getFileDirname() + '/../bin/overcast-ssh')
  ];

  var sshEnv = Object.assign({}, process.env, {
    OVERCAST_KEY: utils.escapeWindowsPath(options.ssh_key),
    OVERCAST_PORT: options.ssh_port,
    OVERCAST_USER: options.user,
    OVERCAST_PASSWORD: options.password,
    OVERCAST_IP: options.ip,
    OVERCAST_SSH_ARGS: options.ssh_args
  });

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

  var cwdScriptFile = commandAsScriptFile(options.command, process.cwd());
  var bundledScriptFile = commandAsScriptFile(options.command, utils.getFileDirname() + '/../scripts');

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
    log.log('test run of SSH command');
    log.log('args = ' + JSON.stringify(args));
    log.log('sshEnv = ' + JSON.stringify(onlyOvercastKeys(sshEnv)));

    return nextFn();
  }

  var ssh = cp.spawn('bash', args, { env: sshEnv });
  var connectionProblem = false;

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
      var str = 'SSH connection exited with a non-zero code (' + code + '). Stopping execution...';
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

// used only by the test env code path:
function onlyOvercastKeys(envObj) {
  const obj = {};

  Object.keys(envObj).forEach((k) => {
    if (k.indexOf('OVERCAST_') === 0) {
      obj[k] = envObj[k];
    }
  });

  return obj;
}
