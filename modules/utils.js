var fs = require('fs');
var path = require('path');
var crypto = require('crypto');
var cp = require('child_process');
var _ = require('lodash');
var colors = require('colors');
var Promise = require('bluebird');
var listCommand = require('./commands/list');

exports.VERSION = '0.4.1';

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
    if (args.name === 'help' || args._[0] === 'help') {
      console.log('');
      return subcommands[args.subcommand].help();
    }

    return subcommands[args.subcommand].run(args);
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
  cp.exec('mkdir -p ' + exports.CONFIG_DIR + '/keys && ssh-keygen -t rsa -N "" -f ' +
    keyFile + ' && chmod 600 ' + keyFile, function (err) {
    if (err) {
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

exports.normalizeKeyPath = function (keyPath, keyName) {
  keyName = keyName || 'overcast.key';

  if (!keyPath) {
    return exports.CONFIG_DIR + '/keys/' + keyName;
  }

  if (keyPath.charAt(0) === '/') {
    return keyPath;
  } else {
    return path.normalize(exports.CONFIG_DIR + '/keys/' + keyPath);
  }
};

exports.createHashedKeyName = function (keyData) {
  return 'overcast.' + crypto.createHash('md5').update(keyData).digest('hex');
};

exports.initOvercastDir = function (dest_dir, callback) {
  dest_dir += '/.overcast';

  return cp.exec(__dirname + '/../bin/init', {
    env: _.extend({}, process.env, {
      overcast_fixture_dir: __dirname + '/../fixtures',
      overcast_dest_dir: dest_dir
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
    return exports.initOvercastDir(process.env.HOME, function () {
      callback(process.env.HOME + '/.overcast');
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
  var instances = {};

  if (name === 'all') {
    _.each(clusters, function (cluster) {
      _.each(cluster.instances, function (instance) {
        instances[instance.name] = instance;
      });
    });
  } else if (clusters[name]) {
    instances = clusters[name].instances;
  } else {
    _.each(clusters, function (cluster) {
      if (cluster.instances[name]) {
        instances[name] = cluster.instances[name];
      }
    });
  }

  return instances;
};

exports.findFirstMatchingInstance = function (name) {
  var clusters = exports.getClusters();
  var instance;

  _.each(clusters, function (cluster) {
    if (!instance && cluster.instances[name]) {
      instance = cluster.instances[name];
    }
  });

  return instance;
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

exports.saveInstanceToCluster = function (cluster, instance) {
  var clusters = exports.getClusters();
  clusters[cluster] = clusters[cluster] || { instances: {} };
  clusters[cluster].instances[instance.name] = instance;
  exports.saveClusters(clusters);
};

exports.deleteInstance = function (instance) {
  var clusters = exports.getClusters();

  _.each(clusters, function (cluster) {
    if (cluster.instances[instance.name] &&
      cluster.instances[instance.name].ip === instance.ip) {
      delete cluster.instances[instance.name];
    }
  });

  exports.saveClusters(clusters);
};

exports.updateInstance = function (name, updates) {
  var clusters = exports.getClusters();
  _.each(clusters, function (cluster, clusterName) {
    _.each(cluster.instances, function (instance) {
      if (instance.name === name) {
        _.extend(instance, updates);
      }
    });
  });

  exports.saveClusters(clusters);
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

exports.sanitize = function (str) {
  if (!str) {
    str = '';
  } else if (!str.replace) {
    str = str + '';
  }
  return str.replace(/[^0-9a-zA-Z\.\-\_ ]/g, '');
};

exports.printArray = function (arr) {
  console.log('  ' + arr.join("\n  "));
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
  yellow: 'yellow'
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
  var str = _.times(120, function () { return ' '; });
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

exports.waitForBoot = function (callback, seconds) {
  seconds = seconds || 45;
  exports.grey('Waiting ' + seconds + ' seconds for server to boot up...');
  exports.waitForProgress(seconds, function () {
    exports.success('OK, server should be responsive.');
    (callback || _.noop)();
  });
};

exports.printCollection = function (type, collection) {
  if (_.isEmpty(collection)) {
    return exports.red('No ' + type + ' found.');
  }

  _.each(collection, function (obj) {
    console.log('');
    console.log('  ' + obj.name);
    exports.prettyPrint(obj, 4);
  });
};

exports.prettyPrint = function (obj, indent, stepBy) {
  var prefix = '';
  _.times(indent || 0, function () { prefix += ' '; });
  stepBy = stepBy || 2;

  _.each(obj, function (val, key) {
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
