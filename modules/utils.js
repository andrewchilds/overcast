var fs = require('fs');
var cp = require('child_process');
var _ = require('lodash');
var colors = require('colors');
var list = require('./commands/list');

exports.VERSION = '0.1.14';

exports.clustersCache = null;
exports.variablesCache = null;

exports.SSH_COUNT = 0;
exports.SSH_COLORS = ['cyan', 'green', 'red', 'yellow', 'magenta', 'blue'];

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

exports.initOvercastDir = function (dest_dir, callback) {
  dest_dir += '/.overcast';

  return cp.exec(__dirname + '/../bin/init', {
    env: _.extend({}, process.env, {
      overcast_src_dir: __dirname + '/../.overcast',
      overcast_dest_dir: dest_dir
    })
  }, function (err, stdout, stderr) {
    if (err) {
      console.log(stdout);
      exports.red(stderr);
      exports.die('Unable to create .overcast directory.');
    } else {
      exports.grey('Created new config directory:');
      exports.cyan(dest_dir);
      (callback || _.noop)(dest_dir);
    }
  });
};

exports.walkDir = function(dir, callback) {
  if (!dir || dir === '/') {
    // No config directory found!
    // Fallback to config directory in $HOME.
    exports.alert('No config directory found!');
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

exports.findOnlyMatchingInstance = function (name) {
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

exports.handleEmptyInstances = function (instances, args) {
  if (_.isEmpty(instances)) {
    exports.red('No cluster or instance found matching "' + args.name + '".');
    list.run(args);
    process.exit(1);
  }
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

exports.prefixPrint = function (prefix, prefixColor, str, textColor) {
  console.log((prefix + ': ')[prefixColor] + str[textColor || 'white']);
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
  var str = _.times(80, function () { return ' '; });
  process.stdout.write(str.join('') + "\r");
};

exports.progressComplete = exports.clearLine;

exports.progressBar = function (testFn, doneFn) {
  var startTime = _.now();
  var interval = setInterval(function () {
    var percentage = testFn();
    if (percentage < 100) {
      exports.progress(percentage, _.now() - startTime);
    } else {
      clearInterval(interval);
      exports.progressComplete();
      (doneFn || _.noop)();
    }
  }, 250);
};

exports.waitForProgress = function (seconds, callback, percentage) {
  var startTime = _.now();
  exports.progressBar(function () {
    return ((_.now() - startTime) / (seconds * 1000)) * 100;
  }, callback);
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
    if (_.isPlainObject(val)) {
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
