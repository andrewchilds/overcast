var fs = require('fs');
var path = require('path');
var crypto = require('crypto');
var cp = require('child_process');
var _ = require('lodash');
var colors = require('colors');
var Promise = require('bluebird');
var listCommand = require('./commands/list');

exports.VERSION = '0.6.12';

exports.clustersCache = null;
exports.variablesCache = null;

exports.SSH_COUNT = 0;
exports.SSH_COLORS = ['cyan', 'green', 'red', 'yellow', 'magenta', 'blue'];

exports.module = function (fn) {
  var obj = {};
  fn(obj);
  return obj;
};

// https://gist.github.com/victorquinn/8030190
exports.promiseWhile = function (condition, action, value) {
  var resolver = Promise.defer();

  var loop = function() {
    if (!condition()) {
      return resolver.resolve(value);
    }
    return Promise.cast(action()).then(loop).catch(resolver.reject);
  };

  process.nextTick(loop);

  return resolver.promise;
};

exports.runSubcommand = function (args, subcommands, helpFn) {
  if (args.subcommand && subcommands[args.subcommand]) {
    var command = subcommands[args.subcommand];
    if (args.name === 'help' || args._[0] === 'help') {
      console.log('');
      return command.help();
    }

    return command.run(args);
  }

  return exports.missingCommand(helpFn);
};

exports.getCommands = function () {
  return require('./commands');
};

exports.findConfig = function (callback) {
  exports.walkDir(process.cwd(), function (dir) {
    exports.setConfigDir(dir);
    (callback || _.noop)();
  });
};

exports.setConfigDir = function (dir) {
  exports.CONFIG_DIR = dir;
  exports.CLUSTERS_JSON = dir + '/clusters.json';
  exports.VARIABLES_JSON = dir + '/variables.json';
};

exports.getKeyFileFromName = function (keyName) {
  return exports.CONFIG_DIR + '/keys/' + keyName + '.key';
};

exports.keyExists = function (keyName) {
  return fs.existsSync(exports.getKeyFileFromName(keyName));
};

exports.createKey = function (keyName, callback) {
  var keyFile = exports.getKeyFileFromName(keyName);
  var keysDir = exports.CONFIG_DIR + '/keys';

  if (!fs.existsSync(keysDir)) {
    fs.mkdirSync(keysDir);
  }

  var keygen = exports.spawn('ssh-keygen -t rsa -N "" -f ' + keyFile);
  keygen.on('exit', function (code) {
    if (code !== 0) {
      exports.red('Error generating SSH key.');
      exports.die(err);
    } else {
      (callback || _.noop)(keyFile);
    }
  });
};

exports.deleteKey = function (keyName, callback) {
  var keyFile = exports.getKeyFileFromName(keyName);
  var pubKeyFile = keyFile + '.pub';

  function handleError(e, name) {
    if (e) {
      exports.grey('Unable to delete ' + name + ' - perhaps it wasn\'t found.');
    }
  }

  fs.unlink(keyFile, function (e) {
    handleError(e, keyFile);
    fs.unlink(pubKeyFile, function (e) {
      handleError(e, pubKeyFile);
      (callback || _.noop)();
    });
  });
};

exports.deleteFromKnownHosts = function (instance, callback) {
  var ssh = exports.spawn('ssh-keygen -R ' + instance.ip);
  ssh.on('exit', function (code) {
    exports.grey(instance.ip + ' removed from ' + exports.getUserHome() + '/.ssh/known_hosts.');
    if (_.isFunction(callback)) {
      callback(instance);
    }
  });
};

exports.normalizeKeyPath = function (keyPath, keyName) {
  keyName = keyName || 'overcast.key';

  if (!keyPath) {
    return path.resolve(exports.CONFIG_DIR, 'keys', keyName);
  }

  if (exports.isAbsolute(keyPath)) {
    return keyPath;
  } else if (keyPath.indexOf('~/') === 0) {
    return keyPath.replace('~/', exports.getUserHome() + '/');
  } else if (keyPath.indexOf('$HOME') === 0) {
    return keyPath.replace('$HOME', exports.getUserHome());
  } else {
    return path.resolve(exports.CONFIG_DIR, 'keys', keyPath);
  }
};

// Ref: http://stackoverflow.com/questions/9080085/node-js-find-home-directory-in-platform-agnostic-way
exports.getUserHome = function () {
  return process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE;
};

exports.createHashedKeyName = function (keyData) {
  return 'overcast.' + crypto.createHash('md5').update(keyData).digest('hex');
};

exports.replaceInstanceName = function (name, str) {
  return str.replace(/\{instance\}/g, name);
};

exports.isAbsolute = function (p) {
  return path.resolve(p) === path.normalize(p) || p.charAt(0) === '/';
};

exports.convertToAbsoluteFilePath = function (p) {
  if (!exports.isAbsolute(p)) {
    var cwdFile = path.normalize(path.resolve(process.cwd(), p));
    if (fs.existsSync(cwdFile)) {
      p = cwdFile;
    } else {
      p = path.resolve(exports.CONFIG_DIR, 'files', p);
    }
  }
  return exports.normalizeWindowsPath(p);
};

exports.normalizeWindowsPath = function (p) {
  if (process.platform === 'win32') {
    return p.replace(/^[A-Z]:(\\|\/)/i, function(m) {
      return '/' + m[0].toLowerCase() + '/';
    });
  }

  return p;
};

exports.escapeWindowsPath = function (p) {
  return p.replace(/\\/g, '\\\\');
};

exports.initOvercastDir = function (dest_dir, callback) {
  dest_dir += '/.overcast';

  return cp.exec('bash ' + exports.escapeWindowsPath(__dirname + '/../bin/overcast-init'), {
    env: _.extend({}, process.env, {
      OVERCAST_FIXTURE_DIR: exports.escapeWindowsPath(__dirname + '/../fixtures'),
      OVERCAST_DEST_DIR: exports.escapeWindowsPath(dest_dir)
    })
  }, function (err, stdout, stderr) {
    if (err) {
      exports.die('Unable to create .overcast directory.');
    } else {
      (callback || _.noop)(dest_dir);
    }
  });
};

exports.walkDir = function(dir, callback) {
  if (!dir || dir === '/') {
    // No config directory found!
    // Fallback to config directory in $HOME.
    return exports.initOvercastDir(exports.getUserHome(), function () {
      callback(exports.getUserHome() + '/.overcast');
    });
  }
  fs.exists(dir + '/.overcast', function (exists) {
    if (exists) {
      callback(dir + '/.overcast');
    } else {
      dir = dir.split('/');
      dir.pop();
      exports.walkDir(dir.join('/'), callback);
    }
  });
};

exports.argShift = function (args, key) {
  args[key] = exports.sanitize(args._.shift());
};

exports.argIsTruthy = function (arg) {
  return !!(arg && arg !== 'false');
};

// http://stackoverflow.com/questions/5364928/node-js-require-all-files-in-a-folder
exports.requireDirectory = function (dir) {
  var output = {};

  fs.readdirSync(dir).forEach(function (file) {
    if (/.+\.js/g.test(file) && file !== 'index.js') {
      var name = file.replace('.js', '');
      output[name] = require(dir + file);
    }
  });

  return output;
};

exports.findMatchingInstances = function (name) {
  var clusters = exports.getClusters();
  var instances = [];

  if (name === 'all') {
    _.each(clusters, function (cluster) {
      _.each(cluster.instances, function (instance) {
        instances.push(instance);
      });
    });
  } else if (clusters[name]) {
    instances = _.toArray(clusters[name].instances);
  } else {
    instances = exports.findMatchingInstancesByInstanceName(name);
  }

  return instances;
};

exports.findMatchingInstancesByInstanceName = function (name) {
  var clusters = exports.getClusters();
  var instances = [];

  var hasWildcard = name.indexOf('*') !== -1;
  if (hasWildcard) {
    name = exports.convertWildcard(name);
  }

  _.each(clusters, function (cluster) {
    if (hasWildcard) {
      _.each(cluster.instances, function (instance, instanceName) {
        if (name.test(instanceName)) {
          instances.push(instance);
        }
      });
    } else {
      if (cluster.instances[name]) {
        instances.push(cluster.instances[name]);
      }
    }
  });

  return instances;
};

exports.findFirstMatchingInstance = function (name) {
  return exports.findMatchingInstancesByInstanceName(name)[0];
};

exports.convertWildcard = function (name) {
  // Instance names are sanitized, so we don't have to worry about regexp edge cases.
  return new RegExp(name.replace(/-/g, '\\-').replace(/\./g, '\\.').replace(/\*/g, '.*'));
};

exports.findClusterNameForInstance = function (instance) {
  var clusters = exports.getClusters();
  var foundName;

  _.each(clusters, function (cluster, clusterName) {
    if (!foundName && cluster.instances[instance.name]) {
      foundName = clusterName;
    }
  });

  return foundName;
};

exports.saveInstanceToCluster = function (clusterName, instance, callback) {
  var clusters = exports.getClusters();
  clusters[clusterName] = clusters[clusterName] || { instances: {} };
  clusters[clusterName].instances[instance.name] = instance;
  exports.saveClusters(clusters, callback);
};

exports.deleteInstance = function (instance, callback) {
  var clusters = exports.getClusters();

  _.each(clusters, function (cluster) {
    if (cluster.instances[instance.name] &&
      cluster.instances[instance.name].ip === instance.ip) {
      delete cluster.instances[instance.name];
    }
  });

  exports.saveClusters(clusters);
  exports.deleteFromKnownHosts(instance, callback);
};

exports.updateInstance = function (name, updates, callback) {
  var clusters = exports.getClusters();
  _.each(clusters, function (cluster, clusterName) {
    _.each(cluster.instances, function (instance) {
      if (instance.name === name) {
        _.extend(instance, updates);
      }
    });
  });

  exports.saveClusters(clusters, callback);
};

exports.getVariables = function () {
  if (exports.variablesCache) {
    return exports.variablesCache;
  }

  if (fs.existsSync(exports.VARIABLES_JSON)) {
    try {
      var data = require(exports.VARIABLES_JSON);
      exports.variablesCache = data;
      return data;
    } catch (e) {
      console.log('Unable to parse the variables.json file. Please correct the parsing error.'.red);
      process.exit(1);
    }
  }

  return {};
};

exports.saveVariables = function (variables, done) {
  exports.variablesCache = variables;
  fs.writeFile(exports.VARIABLES_JSON, JSON.stringify(variables, null, 2), function (err) {
    if (err) {
      exports.error('Error saving variables.json.');
    } else {
      if (_.isFunction(done)) {
        done();
      }
    }
  });
};

exports.getClusters = function () {
  if (exports.clustersCache) {
    return exports.clustersCache;
  }

  if (fs.existsSync(exports.CLUSTERS_JSON)) {
    try {
      var data = require(exports.CLUSTERS_JSON);
      exports.clustersCache = data;
      return data;
    } catch (e) {
      console.log('Unable to parse the clusters.json file. Please correct the parsing error.'.red);
      process.exit(1);
    }
  }
  return {};
};

exports.saveClusters = function (clusters, done) {
  exports.clustersCache = clusters;
  fs.writeFile(exports.CLUSTERS_JSON, JSON.stringify(clusters, null, 2), function (err) {
    if (err) {
      exports.error('Error saving clusters.json.');
    } else {
      if (_.isFunction(done)) {
        done();
      }
    }
  });
};

exports.unknownCommand = function () {
  exports.red('Unknown command.');
};

exports.tokenize = function (str) {
  var tokens = [];
  var isQuoted = false;
  var token = '';
  var chunks = str.split(' ');

  _.each(chunks, function (chunk) {
    if (!chunk) {
      return;
    }

    var first = _.first(chunk);
    var last = _.last(chunk);
    if (isQuoted) {
      if (last === '"' || last === '\'') {
        token += ' ' + (chunk.slice(0, -1));
        tokens.push(token);
        isQuoted = false;
      } else {
        token += ' ' + chunk;
      }
    } else {
      if (first === '"' || first === '\'') {
        token = chunk.slice(1);
        isQuoted = true;
        if (last === '"' || last === '\'') {
          token = token.slice(0, -1);
          tokens.push(token);
          isQuoted = false;
        }
      } else {
        token = '';
        tokens.push(chunk);
      }
    }
  });

  if (tokens.length === 0 && token) {
    tokens.push(token);
  }

  return _.compact(tokens);
};

exports.sanitize = function (str) {
  if (!str) {
    str = '';
  } else if (!str.replace) {
    str = str + '';
  }

  return str.replace(/[^0-9a-zA-Z\.\-\_\* ]/g, '');
};

exports.capitalize = function (str) {
  str = str + '';
  return str.charAt(0).toUpperCase() + str.slice(1);
};

exports.padRight = function (str, length, padChar) {
  str = str + '';
  padChar = padChar || ' ';
  while (str.length < length) {
    str += padChar;
  }

  return str;
};

exports.padLeft = function (str, length, padChar) {
  str = str + '';
  padChar = padChar || ' ';
  while (str.length < length) {
    str = padChar + str;
  }

  return str;
};

exports.printArray = function (arr) {
  console.log('  ' + arr.join("\n  "));
};

exports.forceArray = function (strOrArray) {
  return _.isArray(strOrArray) ? strOrArray : [strOrArray];
};

exports.findUsingMultipleKeys = function (collection, val, keys) {
  var match = null;
  _.each(collection, function (obj) {
    _.each(keys, function (key) {
      if (obj[key] && obj[key] === val) {
        match = obj;
        return false;
      }
    });
    if (match) {
      return false;
    }
  });

  return match;
};

exports.die = function (str) {
  exports.red(str);
  process.exit(1);
};

exports.dieWithList = function (str) {
  exports.red(str);
  console.log('');
  listCommand.run();
  process.exit(1);
};

exports.handleInstanceOrClusterNotFound = function (instances, args) {
  if (_.isEmpty(instances)) {
    exports.red('No instance or cluster found matching "' + args.name + '".');
    console.log('');
    listCommand.run();
    process.exit(1);
  }
};

exports.handleInstanceNotFound = function (instance, args) {
  if (!instance) {
    exports.red('No instance found matching "' + args.name + '".');
    console.log('');
    listCommand.run();
    process.exit(1);
  }
};

exports.missingParameter = function (name, helpFn) {
  exports.red('Missing ' + name + ' parameter.');
  console.log('');
  helpFn();
  process.exit(1);
};

exports.missingCommand = function (helpFn) {
  exports.red('Missing or unknown command.');
  console.log('');
  helpFn();
  process.exit(1);
};

_.each({
  alert: 'yellow',
  cyan: 'cyan',
  green: 'green',
  grey: 'grey',
  note: 'cyan',
  red: 'red',
  success: 'green',
  yellow: 'yellow',
  white: 'white'
}, function (color, fnName) {
  exports[fnName] = function (str) {
    console.log((str + '')[color]);
  };
});

exports.prefixPrint = function (prefix, prefixColor, buffer, textColor) {
  prefix = (prefix + ': ')[prefixColor];
  var str = textColor ? buffer.toString()[textColor] : buffer.toString();
  str = str.replace(/\r/g, "\r" + prefix).replace(/\n/g, "\n" + prefix);
  process.stdout.write(str);
};

exports.progress = function (percentage, elapsed) {
  percentage = percentage || 0;
  percentage = parseFloat(percentage);

  var remaining = '???';
  if (percentage > 2) {
    remaining = (((elapsed / (percentage / 100)) - elapsed) / 1000).toPrecision(2);
  }
  if (remaining > 99) {
    remaining = '???';
  }

  var width = Math.max(1, Math.ceil(percentage / 2));
  var hashes = _.times(width, function (i) {
    i += Math.round(_.now() / 250);
    var char = i % 3 ? ' ' : '/';
    return char.cyan.inverse;
  });
  var spaces = _.times(50 - width, function () { return '-'.grey; });
  var str = ' ' + hashes.join('') + spaces.join('') + (' ' + remaining + ' seconds left').grey;

  exports.clearLine();
  process.stdout.write(str + "\r");
};

exports.clearLine = function () {
  var str = _.times(70, function () { return ' '; });
  process.stdout.write(str.join('') + "\r");
};

exports.progressComplete = exports.clearLine;

exports.progressBar = function (testFn, callback) {
  var startTime = _.now();
  var interval = setInterval(function () {
    var percentage = testFn();
    if (percentage < 100) {
      exports.progress(percentage, _.now() - startTime);
    } else {
      clearInterval(interval);
      exports.progressComplete();
      (callback || _.noop)();
    }
  }, 250);

  return interval;
};

exports.waitForProgress = function (seconds, callback, percentage) {
  var startTime = _.now();
  exports.progressBar(function () {
    return ((_.now() - startTime) / (seconds * 1000)) * 100;
  }, callback);
};

exports.waitForBoot = function (instance, callback, startTime) {
  if (!startTime) {
    startTime = _.now();
    exports.grey('Waiting until we can connect to ' + instance.name + '...');
  }

  exports.testConnection(instance, function (canConnect) {
    var delayBetweenPolls = 2000;

    if (canConnect) {
      var duration = (_.now() - startTime) / 1000;
      exports.green('Connection established after ' + Math.ceil(duration) + ' seconds.');
      if (_.isFunction(callback)) {
        callback();
      }
    } else {
      setTimeout(function () {
        exports.waitForBoot(instance, callback, startTime);
      }, delayBetweenPolls);
    }
  });
};

exports.fixedWait = function (seconds, callback) {
  seconds = seconds || 60;
  exports.grey('Waiting ' + seconds + ' seconds...');
  exports.waitForProgress(seconds, function () {
    exports.success('OK.');
    if (_.isFunction(callback)) {
      callback();
    }
  });
};

exports.printCollection = function (type, collection) {
  if (_.isEmpty(collection)) {
    return exports.red('No ' + type + ' found.');
  }

  _.each(collection, function (obj) {
    var name = obj.name || obj.Name || obj._name;
    console.log('');
    console.log(name);
    exports.prettyPrint(obj, 2);
  });
};

exports.prettyPrint = function (obj, indent, stepBy) {
  var prefix = '';
  _.times(indent || 0, function () { prefix += ' '; });
  stepBy = stepBy || 2;

  _.each(obj, function (val, key) {
    if (key === '_name') {
      return;
    }

    if (_.isArray(val) || _.isPlainObject(val)) {
      exports.grey(prefix + key + ':');
      exports.prettyPrint(val, indent + stepBy, stepBy);
    } else {
      var valStr = val;
      if (_.isArray(val) && val.length === 0) {
        valStr = '[]';
      } else if (val === '') {
        valStr = '""';
      }
      exports.grey(prefix + key + ': ' + valStr);
    }
  });
};

exports.printSignatures = function (commands) {
  return _.map(commands, function (command) {
    return command.signature ? '  ' + command.signature : '';
  });
};

exports.printCommandHelp = function (commands) {
  var first = true;
  _.each(commands, function (command) {
    if (command.help) {
      if (first) {
        first = false;
      } else {
        console.log('');
      }
      command.help();
    }
  });
};

exports.testConnection = function (instance, callback) {
  var key = exports.normalizeKeyPath(exports.escapeWindowsPath(instance.ssh_key));
  var port = instance.ssh_port || 22;
  var host = instance.user + '@' + instance.ip;
  var command = 'ssh -i ' + key + ' -p ' + port + ' ' + host +
    ' -o StrictHostKeyChecking=no "echo hi"';

  var ssh = exports.spawn(command);

  var timeout = setTimeout(function () {
    callbackOnce(false);
    ssh.kill();
  }, 8000);

  var alreadyCalled = false;
  var callbackOnce = function (result) {
    if (!alreadyCalled) {
      clearTimeout(timeout);
      alreadyCalled = true;
      callback(result);
    }
  };

  ssh.on('exit', function (code) {
    if (code === 0) {
      callbackOnce(true);
    } else {
      callbackOnce(false);
    }
  });
};

// Based on https://github.com/mattijs/node-rsync/blob/master/rsync.js#L436
exports.spawn = function (command, overrides) {
  overrides = overrides || {};
  if (_.isArray(command)) {
    command = command.join(' ');
  }

  var options = { stdio: 'pipe' };
  options.env = _.isPlainObject(overrides.env) ? _.extend({}, process.env, overrides.env) : process.env;

  if (overrides.cwd) {
    options.cwd = overrides.cwd;
  }

  if (process.platform === 'win32') {
    options.windowsVerbatimArguments = true;
    return cp.spawn('cmd.exe', ['/s', '/c', '"' + command + '"'], options);
  }

  return cp.spawn('/bin/sh', ['-c', command], options);
};
