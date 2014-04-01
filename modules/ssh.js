var fs = require('fs');
var cp = require('child_process');
var _ = require('lodash');
var utils = require('./utils');

module.exports = function (args, callback) {
  var instances = utils.findMatchingInstances(args.name);
  utils.handleEmptyInstances(instances, args);

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
    user: instance.user,
    name: instance.name,
    ssh_key: instance.ssh_key,
    ssh_port: instance.ssh_port,
    env: args.env,
    command: command
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
    utils.die('IP missing.');
  }

  var color = utils.SSH_COLORS[utils.SSH_COUNT++ % 5];

  options.ssh_key = options.ssh_key || utils.CONFIG_DIR + '/keys/overcast.key';
  options.ssh_port = options.ssh_port || '22';
  options.user = options.user || 'root';
  options.name = options.name || 'Unknown';

  var args = [
    __dirname + '/../bin/ssh'
  ];

  var sshEnv = _.extend({}, process.env, {
    overcast_key: options.ssh_key,
    overcast_port: options.ssh_port,
    overcast_user: options.user,
    overcast_ip: options.ip
  });

  if (options.env) {
    if (_.isPlainObject(options.env)) {
      sshEnv.overcast_env = _.map(options.env, function (val, key) {
        return key + '="' + (val + '').replace(/"/g, '\"') + '"';
      }).join(' ');
    } else if (_.isString(options.env)) {
      sshEnv.overcast_env = options.env.trim();
    }
  }

  var scriptFile = commandAsScriptFile(options.command);
  if (fs.existsSync(scriptFile)) {
    sshEnv.overcast_script_file = scriptFile;
  } else {
    sshEnv.overcast_command = options.command;
  }

  var ssh = cp.spawn('bash', args, { env: sshEnv });

  process.stdin.resume();
  process.stdin.on('data', function (chunk) {
    ssh.stdin.write(chunk);
  });

  ssh.stdout.on('data', function (data) {
    data = (data + '').trim().split("\n");
    _.each(data, function (line) {
      utils.prefixPrint(options.name, color, line, 'white');
    });
  });

  ssh.stderr.on('data', function (data) {
    data = (data + '').trim().split("\n");
    _.each(data, function (line) {
      utils.prefixPrint(options.name, color, line, 'red');
    });
  });

  ssh.on('exit', function (code) {
    process.stdin.pause();
    if (code !== 0) {
      var str = 'SSH connection exited with a non-zero code (' + code + '). Stopping execution...';
      utils.prefixPrint(options.name, color, str, 'red');
      process.exit(1);
    }
    console.log('');
    if (_.isFunction(next)) {
      next();
    }
  });
}

function commandAsScriptFile(str) {
  return str.charAt(0) === '/' ? str : utils.CONFIG_DIR + '/scripts/' + str;
}
