import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import cp from 'child_process';
import _ from 'lodash';
import listCommand from './commands/list';
export var VERSION = '1.0.8';
export var clustersCache = null;
export var variablesCache = null;
export var SSH_COUNT = 0;
export var SSH_COLORS = ['cyan', 'green', 'red', 'yellow', 'magenta', 'blue'];

export function isArray(v) {
  return Array.isArray(v);
}

export function isObject(v) {
  return typeof v === 'object' && v !== null;
}

export function isNumber(v) {
  return typeof v === 'number';
}

export function isString(v) {
  return typeof v === 'string';
}

export function isFunction(v) {
  return typeof v === 'function';
}

export function each(o, cb) {
  if (exports.isObject(o)) {
    throw new Error('This is an Object, replace with eachObject.');
    exports.eachObject(o, cb);
  } else if (exports.isArray(o)) {
    throw new Error('This is an Array, replace with forEach.');
    o.forEach(cb);
  }
}

export function eachObject(o, cb) {
  Object.keys(o).forEach((k) => {
    console.log(k);
    cb(o[k], k);
  });
}

export function mapObject(o, cb) {
  const mapped = [];
  Object.keys(o).map((k) => {
    mapped.push(cb(o[k], k));
  });
  return mapped;
}

export function times(maxIndex, cb) {
  const index = 0;
  while (index < maxIndex) {
    cb(index++);
  }
}

export function runSubcommand(args, subcommands, helpFn) {
  if (args.subcommand && subcommands[args.subcommand]) {
    var command = subcommands[args.subcommand];
    if (args.name === 'help' || args._[0] === 'help') {
      console.log('');
      return command.help();
    }

    return command.run(args);
  }

  return exports.missingCommand(helpFn);
}

export function getCommands() {
  return require('./commands');
}

export function findConfig(done) {
  exports.walkDir(process.cwd(), dir => {
    exports.setConfigDir(dir);
    done();
  });
}

export function setConfigDir(dir) {
  exports.CONFIG_DIR = dir;
  exports.CLUSTERS_JSON = dir + '/clusters.json';
  exports.VARIABLES_JSON = dir + '/variables.json';
}

export function getKeyFileFromName(keyName) {
  return exports.CONFIG_DIR + '/keys/' + keyName + '.key';
}

export function keyExists(keyName) {
  return fs.existsSync(exports.getKeyFileFromName(keyName));
}

export function createKey(keyName, callback) {
  var keyFile = exports.getKeyFileFromName(keyName);
  var keysDir = exports.CONFIG_DIR + '/keys';

  if (!fs.existsSync(keysDir)) {
    fs.mkdirSync(keysDir);
  }

  var keygen = exports.spawn('ssh-keygen -t rsa -N "" -f ' + keyFile);
  keygen.on('exit', code => {
    if (code !== 0) {
      exports.red('Error generating SSH key.');
      exports.die(err);
    } else {
      if (exports.isFunction(callback)) {
        callback(keyFile);
      }
    }
  });
}

export function deleteKey(keyName, callback) {
  var keyFile = exports.getKeyFileFromName(keyName);
  var pubKeyFile = keyFile + '.pub';

  function handleError(e, name) {
    if (e) {
      exports.grey('Unable to delete ' + name + ' - perhaps it wasn\'t found.');
    }
  }

  fs.unlink(keyFile, e => {
    handleError(e, keyFile);
    fs.unlink(pubKeyFile, e => {
      handleError(e, pubKeyFile);
      if (exports.isFunction(callback)) {
        callback();
      }
    });
  });
}

export function deleteFromKnownHosts(instance, callback) {
  var ssh = exports.spawn('ssh-keygen -R ' + instance.ip);
  ssh.on('exit', code => {
    exports.grey(instance.ip + ' removed from ' + exports.getUserHome() + '/.ssh/known_hosts.');
    if (exports.isFunction(callback)) {
      callback(instance);
    }
  });
}

export function normalizeKeyPath(keyPath, keyName) {
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
}

// Ref: http://stackoverflow.com/questions/9080085/node-js-find-home-directory-in-platform-agnostic-way
export function getUserHome() {
  return process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE;
}

export function createHashedKeyName(keyData) {
  return 'overcast.' + crypto.createHash('md5').update(keyData).digest('hex');
}

export function replaceInstanceName(name, str) {
  return str.replace(/\{instance\}/g, name);
}

export function isAbsolute(p) {
  return path.resolve(p) === path.normalize(p) || p.charAt(0) === '/';
}

export function convertToAbsoluteFilePath(p) {
  if (!exports.isAbsolute(p)) {
    var cwdFile = path.normalize(path.resolve(process.cwd(), p));
    if (fs.existsSync(cwdFile)) {
      p = cwdFile;
    } else {
      p = path.resolve(exports.CONFIG_DIR, 'files', p);
    }
  }
  return exports.normalizeWindowsPath(p);
}

export function normalizeWindowsPath(p) {
  if (process.platform === 'win32') {
    return p.replace(/^[A-Z]:(\\|\/)/i, m => {
      return '/' + m[0].toLowerCase() + '/';
    });
  }

  return p;
}

export function escapeWindowsPath(p) {
  return p.replace(/\\/g, '\\\\');
}

export function initOvercastDir(dest_dir, callback) {
  dest_dir += '/.overcast';

  return cp.exec('bash ' + exports.escapeWindowsPath(__dirname + '/../bin/overcast-init'), {
    env: Object.assign({}, process.env, {
      OVERCAST_FIXTURE_DIR: exports.escapeWindowsPath(__dirname + '/../fixtures'),
      OVERCAST_DEST_DIR: exports.escapeWindowsPath(dest_dir)
    })
  }, (err, stdout, stderr) => {
    if (err) {
      exports.die('Unable to create .overcast directory.');
    } else {
      (callback || _.noop)(dest_dir);
    }
  });
}

export function walkDir(dir, callback) {
  if (!dir || dir === '/') {
    // No config directory found!
    // Fallback to config directory in $HOME.
    return exports.initOvercastDir(exports.getUserHome(), () => {
      callback(exports.getUserHome() + '/.overcast');
    });
  }
  fs.exists(dir + '/.overcast', exists => {
    if (exists) {
      callback(dir + '/.overcast');
    } else {
      dir = dir.split('/');
      dir.pop();
      exports.walkDir(dir.join('/'), callback);
    }
  });
}

export function argShift(args, key) {
  args[key] = exports.sanitize(args._.shift());
}

export function argIsTruthy(arg) {
  return !!(arg && arg !== 'false');
}

// http://stackoverflow.com/questions/5364928/node-js-require-all-files-in-a-folder
export function requireDirectory(dir) {
  var output = {};

  fs.readdirSync(dir).forEach(file => {
    if (/.+\.js/g.test(file) && file !== 'index.js') {
      var name = file.replace('.js', '');
      output[name] = require(dir + file);
    }
  });

  return output;
}

export function findMatchingInstances(name) {
  var clusters = exports.getClusters();
  var instances = [];

  if (name === 'all') {
    exports.each(clusters, cluster => {
      exports.each(cluster.instances, instance => {
        instances.push(instance);
      });
    });
  } else if (clusters[name]) {
    instances = _.toArray(clusters[name].instances);
  } else {
    instances = exports.findMatchingInstancesByInstanceName(name);
  }

  return instances;
}

export function findMatchingInstancesByInstanceName(name) {
  var clusters = exports.getClusters();
  var instances = [];

  var hasWildcard = name.indexOf('*') !== -1;
  if (hasWildcard) {
    name = exports.convertWildcard(name);
  }

  exports.each(clusters, cluster => {
    if (hasWildcard) {
      exports.each(cluster.instances, (instance, instanceName) => {
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
}

export function findFirstMatchingInstance(name) {
  return exports.findMatchingInstancesByInstanceName(name)[0];
}

export function convertWildcard(name) {
  // Instance names are sanitized, so we don't have to worry about regexp edge cases.
  return new RegExp(name.replace(/-/g, '\\-').replace(/\./g, '\\.').replace(/\*/g, '.*'));
}

export function findClusterNameForInstance(instance) {
  var clusters = exports.getClusters();
  var foundName;

  exports.each(clusters, (cluster, clusterName) => {
    if (!foundName && cluster.instances[instance.name]) {
      foundName = clusterName;
    }
  });

  return foundName;
}

export function saveInstanceToCluster(clusterName, instance, callback) {
  var clusters = exports.getClusters();
  clusters[clusterName] = clusters[clusterName] || { instances: {} };
  clusters[clusterName].instances[instance.name] = instance;
  exports.saveClusters(clusters, callback);
}

export function deleteInstance(instance, callback) {
  var clusters = exports.getClusters();

  exports.each(clusters, (cluster) => {
    if (cluster.instances[instance.name] &&
      cluster.instances[instance.name].ip === instance.ip) {
      delete cluster.instances[instance.name];
    }
  });

  exports.saveClusters(clusters);
  exports.deleteFromKnownHosts(instance, callback);
}

export function updateInstance(name, updates, callback) {
  var clusters = exports.getClusters();
  exports.each(clusters, (cluster, clusterName) => {
    exports.each(cluster.instances, (instance) => {
      if (instance.name === name) {
        Object.assign(instance, updates);
      }
    });
  });

  exports.saveClusters(clusters, callback);
}

export function getVariables() {
  if (exports.variablesCache) {
    return exports.variablesCache;
  }

  if (fs.existsSync(exports.VARIABLES_JSON)) {
    try {
      var data = require(exports.VARIABLES_JSON);
      exports.variablesCache = data;
      return data;
    } catch (e) {
      exports.die('Unable to parse the variables.json file. Please correct the parsing error.');
    }
  } else {
    exports.die('Unable to find the variables.json file.');
  }
}

export function saveVariables(variables) {
  exports.variablesCache = variables;

  fs.writeFile(exports.VARIABLES_JSON, JSON.stringify(variables, null, 2), (err) => {
    if (err) {
      exports.red('Error saving variables.json.');
    } else {
      exports.success('Variables saved.');
    }
  });
}

export function getClusters() {
  if (exports.clustersCache) {
    return exports.clustersCache;
  }

  if (fs.existsSync(exports.CLUSTERS_JSON)) {
    try {
      var data = require(exports.CLUSTERS_JSON);
      exports.clustersCache = data;
      return data;
    } catch (e) {
      exports.die('Unable to parse the clusters.json file. Please correct the parsing error.');
    }
  } else {
    exports.die('Unable to find the clusters.json file.');
  }
}

export function saveClusters(clusters, done) {
  exports.clustersCache = clusters;
  fs.writeFile(exports.CLUSTERS_JSON, JSON.stringify(clusters, null, 2), (err) => {
    if (err) {
      exports.red('Error saving clusters.json.');
    } else {
      if (exports.isFunction(done)) {
        done();
      }
    }
  });
}

export function unknownCommand() {
  exports.red('Unknown command.');
}

export function tokenize(str) {
  var tokens = [];
  var isQuoted = false;
  var token = '';
  var chunks = str.split(' ');

  exports.each(chunks, chunk => {
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
}

export function sanitize(str) {
  if (!str) {
    str = '';
  } else if (!str.replace) {
    str = str + '';
  }

  return str.replace(/[^0-9a-zA-Z\.\-\_\* ]/g, '');
}

export function capitalize(str) {
  str = str + '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function padRight(str, length, padChar) {
  str = str + '';
  padChar = padChar || ' ';
  while (str.length < length) {
    str += padChar;
  }

  return str;
}

export function padLeft(str, length, padChar) {
  str = str + '';
  padChar = padChar || ' ';
  while (str.length < length) {
    str = padChar + str;
  }

  return str;
}

export function printArray(arr) {
  console.log('  ' + arr.join("\n  "));
}

export function forceArray(strOrArray) {
  return exports.isArray(strOrArray) ? strOrArray : [strOrArray];
}

export function findUsingMultipleKeys(collection, val, keys) {
  var match = null;
  exports.each(collection, (obj) => {
    exports.each(keys, (key) => {
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
}

export function die(str) {
  exports.red(str);
  process.exit(1);
}

export function dieWithList(str) {
  exports.red(str);
  console.log('');
  listCommand.run();
  process.exit(1);
}

export function handleInstanceOrClusterNotFound(instances, args) {
  if (!instances || instances.length === 0) {
    exports.red('No instance or cluster found matching "' + args.name + '".');
    console.log('');
    listCommand.run();
    process.exit(1);
  }
}

export function handleInstanceNotFound(instance, args) {
  if (!instance) {
    exports.red('No instance found matching "' + args.name + '".');
    console.log('');
    listCommand.run();
    process.exit(1);
  }
}

export function missingParameter(name, helpFn) {
  exports.red('Missing ' + name + ' parameter.');
  console.log('');
  helpFn();
  process.exit(1);
}

export function missingCommand(helpFn) {
  exports.red('Missing or unknown command.');
  console.log('');
  helpFn();
  process.exit(1);
}

exports.eachObject({
  alert: 'yellow',
  cyan: 'cyan',
  green: 'green',
  grey: 'grey',
  note: 'cyan',
  red: 'red',
  success: 'green',
  yellow: 'yellow',
  white: 'white'
}, (color, fnName) => {
  exports[fnName] = (str) => {
    console.log((str + '')[color]);
  };
});

export function prefixPrint(prefix, prefixColor, buffer, textColor) {
  prefix = (prefix + ': ')[prefixColor];
  var str = textColor ? buffer.toString()[textColor] : buffer.toString();
  str = str.replace(/\r/g, "\r" + prefix).replace(/\n/g, "\n" + prefix);
  process.stdout.write(str);
}

export function progress(percentage, elapsed) {
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
  var hashes = exports.times(width, (i) => {
    i += Math.round(_.now() / 250);
    var char = i % 3 ? ' ' : '/';
    return char.cyan.inverse;
  });
  var spaces = exports.times(50 - width, () => {
    return '-'.grey;
  });
  var str = ' ' + hashes.join('') + spaces.join('') + (' ' + remaining + ' seconds left').grey;

  exports.clearLine();
  process.stdout.write(str + "\r");
}

export function clearLine() {
  var str = exports.times(70, () => {
    return ' ';
  });
  process.stdout.write(str.join('') + "\r");
}

export var progressComplete = exports.clearLine;

export function progressBar(testFn, callback) {
  var startTime = _.now();
  var interval = setInterval(() => {
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
}

export function waitForProgress(seconds, callback) {
  var startTime = _.now();
  exports.progressBar(() => {
    return ((_.now() - startTime) / (seconds * 1000)) * 100;
  }, callback);
}

export function waitForBoot(instance, callback, startTime) {
  if (!startTime) {
    startTime = _.now();
    exports.grey('Waiting until we can connect to ' + instance.name + '...');
  }

  exports.testConnection(instance, canConnect => {
    var delayBetweenPolls = 2000;

    if (canConnect) {
      var duration = (_.now() - startTime) / 1000;
      exports.green('Connection established after ' + Math.ceil(duration) + ' seconds.');
      if (exports.isFunction(callback)) {
        callback();
      }
    } else {
      setTimeout(() => {
        exports.waitForBoot(instance, callback, startTime);
      }, delayBetweenPolls);
    }
  });
}

export function fixedWait(seconds, callback) {
  seconds = seconds || 60;
  exports.grey('Waiting ' + seconds + ' seconds...');
  exports.waitForProgress(seconds, () => {
    exports.success('OK.');
    if (exports.isFunction(callback)) {
      callback();
    }
  });
}

export function printCollection(type, collection) {
  if (collection.length === 0) {
    return exports.red('No ' + type + ' found.');
  }

  collection.forEach((obj) => {
    var name = obj.name || obj.Name || obj._name || obj.slug;
    console.log('');
    console.log(name);
    exports.prettyPrint(obj, 2);
  });
}

export function prettyPrint(obj, indent, stepBy) {
  var prefix = '';
  exports.times(indent || 0, () => {
    prefix += ' ';
  });
  stepBy = stepBy || 2;

  exports.eachObject(obj, (val, key) => {
    if (key === '_name') {
      return;
    }

    if (exports.isArray(val) || exports.isObject(val)) {
      exports.grey(prefix + key + ':');
      exports.prettyPrint(val, indent + stepBy, stepBy);
    } else {
      var valStr = val;
      if (exports.isArray(val) && val.length === 0) {
        valStr = '[]';
      } else if (val === '') {
        valStr = '""';
      }
      exports.grey(prefix + key + ': ' + valStr);
    }
  });
}

export function printSignatures(commands) {
  return commands.map((command) => {
    return command.signature ? '  ' + command.signature : '';
  });
}

export function printCommandHelp(commands) {
  var first = true;
  commands.forEach((command) => {
    if (command.help) {
      if (first) {
        first = false;
      } else {
        console.log('');
      }
      command.help();
    }
  });
}

export function testConnection(instance, callback) {
  var key = exports.normalizeKeyPath(exports.escapeWindowsPath(instance.ssh_key));
  var port = instance.ssh_port || 22;
  var host = instance.user + '@' + instance.ip;
  var command = 'ssh -i ' + key + ' -p ' + port + ' ' + host +
    ' -o StrictHostKeyChecking=no "echo hi"';

  var ssh = exports.spawn(command);

  var timeout = setTimeout(() => {
    callbackOnce(false);
    ssh.kill();
  }, 8000);

  var alreadyCalled = false;
  var callbackOnce = (result) => {
    if (!alreadyCalled) {
      clearTimeout(timeout);
      alreadyCalled = true;
      callback(result);
    }
  };

  ssh.on('exit', (code) => {
    if (code === 0) {
      callbackOnce(true);
    } else {
      callbackOnce(false);
    }
  });
}

// Based on https://github.com/mattijs/node-rsync/blob/master/rsync.js#L436
export function spawn(command, overrides) {
  overrides = overrides || {};
  if (exports.isArray(command)) {
    command = command.join(' ');
  }

  var options = { stdio: 'pipe' };
  options.env = exports.isObject(overrides.env) ? Object.assign({}, process.env, overrides.env) : process.env;

  if (overrides.cwd) {
    options.cwd = overrides.cwd;
  }

  if (process.platform === 'win32') {
    options.windowsVerbatimArguments = true;
    return cp.spawn('cmd.exe', ['/s', '/c', '"' + command + '"'], options);
  }

  return cp.spawn('/bin/sh', ['-c', command], options);
}
