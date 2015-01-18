var fs = require('fs');
var path = require('path');
var cp = require('child_process');
var _ = require('lodash');
var utils = require('./utils');

exports.run = function (args, callback) {
  // Handle cases where minimist mistakenly parses ssh-args (e.g. "-tt" becomes { t: true }).
  if (args['ssh-args'] === true) {
    var rawArgs = process.argv.slice(2);
    var rawArgsIndex = _.indexOf(rawArgs, '--ssh-args') + 1;
    if (rawArgs[rawArgsIndex]) {
      args['ssh-args'] = rawArgs[rawArgsIndex];
    }
  }

  var instances = utils.findMatchingInstances(args.name);
  utils.handleInstanceOrClusterNotFound(instances, args);

  if (args.parallel || args.p) {
    _.each(instances, function (instance) {
      runOnInstance(instance, _.cloneDeep(args));
    });
    if (_.isFunction(callback)) {
      callback();
    }
  } else {
    runOnInstances(_.toArray(instances), args, callback);
  }
};

function runOnInstances(stack, args, callback) {
  var instance = stack.shift();
  runOnInstance(instance, _.cloneDeep(args), function () {
    if (stack.length > 0) {
      runOnInstances(stack, args, callback);
    } else {
      if (_.isFunction(callback)) {
        callback();
      }
    }
  });
}

function runOnInstance(instance, args, next) {
  var command = args._.shift();
  sshExec({
    ip: instance.ip,
    user: args.user || instance.user,
    password: args.password || instance.password,
    name: instance.name,
    ssh_key: args['ssh-key'] || instance.ssh_key,
    ssh_port: instance.ssh_port,
    ssh_args: _.isString(args['ssh-args']) ? args['ssh-args'] : '',
    continueOnError: args.continueOnError,
    machineReadable: args['mr'] || args['machine-readable'],
    env: args.env,
    command: command,
    shell_command: args['shell-command']
  }, function () {
    if (args._.length > 0) {
      runOnInstance(instance, args, next);
    } else if (_.isFunction(next)) {
      next();
    }
  });
}

function sshExec(options, next) {
  if (!options.ip) {
    return utils.die('IP missing.');
  }

  var color = utils.SSH_COLORS[utils.SSH_COUNT++ % 5];

  options.ssh_key = utils.normalizeKeyPath(options.ssh_key);
  options.ssh_port = options.ssh_port || '22';
  options.user = options.user || 'root';
  options.password = options.password || '';
  options.name = options.name || 'Unknown';
  
  var args = [
    utils.escapeWindowsPath(__dirname + '/../bin/ssh')
  ];

  var sshEnv = _.extend({}, process.env, {
    OVERCAST_KEY: utils.escapeWindowsPath(options.ssh_key),
    OVERCAST_PORT: options.ssh_port,
    OVERCAST_USER: options.user,
    OVERCAST_PASSWORD: options.password,
    OVERCAST_IP: options.ip,
    OVERCAST_SSH_ARGS: options.ssh_args
  });

  if (options.env) {
    if (_.isPlainObject(options.env)) {
      sshEnv.OVERCAST_ENV = _.map(options.env, function (val, key) {
        return key + '="' + (val + '').replace(/"/g, '\"') + '"';
      }).join(' ');
    } else if (_.isArray(options.env)) {
      sshEnv.OVERCAST_ENV = options.env.join(' ');
    } else if (_.isString(options.env)) {
      sshEnv.OVERCAST_ENV = options.env.trim();
    }
    if (sshEnv.OVERCAST_ENV) {
      sshEnv.OVERCAST_ENV += ' ';
    }
  }

  var cwdScriptFile = commandAsScriptFile(options.command, process.cwd());
  var scriptFile = commandAsScriptFile(options.command, utils.CONFIG_DIR + '/scripts');
  var bundledScriptFile = commandAsScriptFile(options.command, __dirname + '/../scripts');

  if (fs.existsSync(cwdScriptFile)) {
    sshEnv.OVERCAST_SCRIPT_FILE = utils.escapeWindowsPath(cwdScriptFile);
  } else if (fs.existsSync(scriptFile)) {
    sshEnv.OVERCAST_SCRIPT_FILE = utils.escapeWindowsPath(scriptFile);
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

  var ssh = cp.spawn('bash', args, { env: sshEnv });
  var connectionProblem = false;

  ssh.stdout.on('data', function (data) {
    if (options.machineReadable) {
      process.stdout.write(data + '');
    } else {
      utils.prefixPrint(options.name, color, data);
    }
  });

  ssh.stderr.on('data', function (data) {
    if (_.contains(data.toString(), 'Operation timed out') ||
      _.contains(data.toString(), 'No route to host') ||
      _.contains(data.toString(), 'Host is down')) {
      connectionProblem = true;
    }

    if (options.machineReadable) {
      process.stdout.write(data + '');
    } else {
      utils.prefixPrint(options.name, color, data, 'grey');
    }
  });

  ssh.on('exit', function (code) {
    if (connectionProblem && code === 255) {
      options.retries = options.retries ? options.retries + 1 : 1;
      options.maxRetries = options.maxRetries || 3;

      if (options.retries <= options.maxRetries) {
        utils.prefixPrint(options.name, color, 'Retrying (' +
          options.retries + ' of ' + options.maxRetries + ' attempts)...', 'red');
        console.log('');
        utils.SSH_COUNT--;
        sshExec(options, next);
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
      console.log('');
    }
    if (_.isFunction(next)) {
      next();
    }
  });
}

function commandAsScriptFile(str, scriptDir) {
  return str.charAt(0) === '/' ? str : path.normalize(scriptDir + '/' + str);
}
