var fs = require('fs');
var cp = require('child_process');
var _ = require('lodash');
var utils = require('./utils');

module.exports = function (args) {
  var instances = utils.findMatchingInstances(args.name);
  utils.handleEmptyInstances(instances, args);

  if (instances.length > 1) {
    args.multipleInstances = true;
  }

  if (args.parallel || args.p) {
    _.each(instances, function (instance) {
      runOnInstance(instance, _.cloneDeep(args));
    });
  } else {
    runOnInstances(_.toArray(instances), args);
  }
};

function runOnInstances(stack, args) {
  var instance = stack.shift();
  runOnInstance(instance, _.cloneDeep(args), function () {
    if (stack.length > 0) {
      runOnInstances(stack, args);
    }
  });
}

function runOnInstance(instance, args, next) {
  scpExec({
    ip: instance.ip,
    user: args.user || instance.user,
    name: instance.name,
    ssh_key: args['ssh-key'] || instance.ssh_key,
    ssh_port: instance.ssh_port,
    env: args.env,
    direction: args.direction,
    source: args.source,
    dest: args.dest,
    multipleInstances: args.multipleInstances
  }, function () {
    if (_.isFunction(next)) {
      next();
    }
  });
}

function scpExec(options, next) {
  if (!options.ip) {
    utils.die('IP missing.');
  }

  var color = utils.SSH_COLORS[utils.SSH_COUNT++ % 5];

  options.ssh_key = utils.normalizeKeyPath(options.ssh_key);
  options.ssh_port = options.ssh_port || '22';
  options.user = options.user || 'root';
  options.name = options.name || 'Unknown';

  var args = [
    '-r',
    '-i',
    options.ssh_key,
    '-P',
    options.ssh_port,
    '-o',
    'StrictHostKeyChecking=no'
  ];

  if (options.direction === 'pull') {
    options.dest = convertToAbsolute(options.dest);
    options.dest = replaceInstanceName(options.name, options.dest);
    args.push((options.user || 'root') + '@' + options.ip + ':' + options.source);
    args.push(options.dest);
  } else if (options.direction === 'push') {
    options.source = convertToAbsolute(options.source);
    options.source = replaceInstanceName(options.name, options.source);
    args.push(options.source);
    args.push((options.user || 'root') + '@' + options.ip + ':' + options.dest);
  } else {
    utils.die('No direction specified.');
  }

  var scp = cp.spawn('scp', args);

  scp.stdout.on('data', function (data) {
    data = (data + '').trim().split("\n");
    _.each(data, function (line) {
      utils.prefixPrint(options.name, color, line, 'white');
    });
  });

  scp.stderr.on('data', function (data) {
    data = (data + '').trim().split("\n");
    _.each(data, function (line) {
      utils.prefixPrint(options.name, color, line, 'red');
    });
  });

  scp.on('exit', function (code) {
    if (code !== 0) {
      var str = 'SCP connection exited with a non-zero code (' + code + '). Stopping execution...';
      utils.prefixPrint(options.name, color, str, 'red');
      process.exit(1);
    }
    utils.success(options.source + ' transferred to ' + options.dest);
    console.log('');
    if (_.isFunction(next)) {
      next();
    }
  });
}

function convertToAbsolute(str) {
  return str.charAt(0) === '/' ? str : utils.CONFIG_DIR + '/files/' + str;
}

function replaceInstanceName(name, path) {
  return path.replace(/\{instance\}/g, name);
}
