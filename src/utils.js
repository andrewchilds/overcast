import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import cp from 'child_process';
import _ from 'lodash';
import chalk from 'chalk';
import * as listCommand from './commands/list.js';

export const VERSION = '1.0.8';
export const SSH_COLORS = ['cyan', 'green', 'red', 'yellow', 'magenta', 'blue'];

export let CONFIG_DIR;
export let CLUSTERS_JSON;
export let VARIABLES_JSON;

export let clustersCache = null;
export let variablesCache = null;
export let SSH_COUNT = 0;

export function isArray(v) {
  return Array.isArray(v);
}

export function isObject(v) {
  return !isArray(v) && typeof v === 'object' && v !== null;
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
  if (isObject(o)) {
    throw new Error('This is an Object, replace with eachObject.');
  } else if (isArray(o)) {
    throw new Error('This is an Array, replace with forEach.');
  }
}

export function eachObject(o, cb) {
  Object.keys(o).forEach((k) => {
    cb(o[k], k);
  });
}

export function maxValueFromArray(arr, cb) {
  let max = 0;
  let result = false;

  arr.forEach((o) => {
    const v = cb(o);
    if (v > max) {
      max = v;
      result = o;
    }
  });

  return result;
}

export function mapObject(o, cb) {
  const mapped = [];
  Object.keys(o).map((k) => {
    mapped.push(cb(o[k], k));
  });
  return mapped;
}

export function times(maxIndex, cb) {
  let index = 0;
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

  return missingCommand(helpFn);
}

export function findConfig(done) {
  walkDir(process.cwd(), dir => {
    setConfigDir(dir);
    done();
  });
}

export function setConfigDir(dir) {
  CONFIG_DIR = dir;
  CLUSTERS_JSON = dir + '/clusters.json';
  VARIABLES_JSON = dir + '/variables.json';
}

export function getKeyFileFromName(keyName) {
  return CONFIG_DIR + '/keys/' + keyName + '.key';
}

export function keyExists(keyName) {
  return fs.existsSync(getKeyFileFromName(keyName));
}

export function createKey(keyName, callback) {
  var keyFile = getKeyFileFromName(keyName);
  var keysDir = CONFIG_DIR + '/keys';

  if (!fs.existsSync(keysDir)) {
    fs.mkdirSync(keysDir);
  }

  var keygen = spawn('ssh-keygen -t rsa -N "" -f ' + keyFile);
  keygen.on('exit', code => {
    if (code !== 0) {
      red('Error generating SSH key.');
      die(err);
    } else {
      if (isFunction(callback)) {
        callback(keyFile);
      }
    }
  });
}

export function deleteKey(keyName, callback) {
  var keyFile = getKeyFileFromName(keyName);
  var pubKeyFile = keyFile + '.pub';

  function handleError(e, name) {
    if (e) {
      grey('Unable to delete ' + name + ' - perhaps it wasn\'t found.');
    }
  }

  fs.unlink(keyFile, e => {
    handleError(e, keyFile);
    fs.unlink(pubKeyFile, e => {
      handleError(e, pubKeyFile);
      if (isFunction(callback)) {
        callback();
      }
    });
  });
}

export function deleteFromKnownHosts(instance, callback) {
  var ssh = spawn('ssh-keygen -R ' + instance.ip);
  ssh.on('exit', code => {
    grey(instance.ip + ' removed from ' + getUserHome() + '/.ssh/known_hosts.');
    if (isFunction(callback)) {
      callback(instance);
    }
  });
}

export function normalizeKeyPath(keyPath, keyName) {
  keyName = keyName || 'overcast.key';

  if (!keyPath) {
    return path.resolve(CONFIG_DIR, 'keys', keyName);
  }

  if (isAbsolute(keyPath)) {
    return keyPath;
  } else if (keyPath.indexOf('~/') === 0) {
    return keyPath.replace('~/', getUserHome() + '/');
  } else if (keyPath.indexOf('$HOME') === 0) {
    return keyPath.replace('$HOME', getUserHome());
  } else {
    return path.resolve(CONFIG_DIR, 'keys', keyPath);
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
  if (!isAbsolute(p)) {
    var cwdFile = path.normalize(path.resolve(process.cwd(), p));
    if (fs.existsSync(cwdFile)) {
      p = cwdFile;
    } else {
      p = path.resolve(CONFIG_DIR, 'files', p);
    }
  }
  return normalizeWindowsPath(p);
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

  return cp.exec('bash ' + escapeWindowsPath(__dirname + '/../bin/overcast-init'), {
    env: Object.assign({}, process.env, {
      OVERCAST_FIXTURE_DIR: escapeWindowsPath(__dirname + '/../fixtures'),
      OVERCAST_DEST_DIR: escapeWindowsPath(dest_dir)
    })
  }, (err, stdout, stderr) => {
    if (err) {
      die('Unable to create .overcast directory.');
    } else {
      (callback || _.noop)(dest_dir);
    }
  });
}

export function walkDir(dir, callback) {
  if (!dir || dir === '/') {
    // No config directory found!
    // Fallback to config directory in $HOME.
    return initOvercastDir(getUserHome(), () => {
      callback(getUserHome() + '/.overcast');
    });
  }
  fs.exists(dir + '/.overcast', exists => {
    if (exists) {
      callback(dir + '/.overcast');
    } else {
      dir = dir.split('/');
      dir.pop();
      walkDir(dir.join('/'), callback);
    }
  });
}

export function argShift(args, key) {
  args[key] = sanitize(args._.shift());
}

export function argIsTruthy(arg) {
  return !!(arg && arg !== 'false');
}

export function findMatchingInstances(name) {
  var clusters = getClusters();
  var instances = [];

  if (name === 'all') {
    eachObject(clusters, cluster => {
      eachObject(cluster.instances, instance => {
        instances.push(instance);
      });
    });
  } else if (clusters[name]) {
    instances = _.toArray(clusters[name].instances);
  } else {
    instances = findMatchingInstancesByInstanceName(name);
  }

  return instances;
}

export function findMatchingInstancesByInstanceName(name) {
  var clusters = getClusters();
  var instances = [];

  var hasWildcard = name.indexOf('*') !== -1;
  if (hasWildcard) {
    name = convertWildcard(name);
  }

  eachObject(clusters, cluster => {
    if (hasWildcard) {
      eachObject(cluster.instances, (instance, instanceName) => {
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
  return findMatchingInstancesByInstanceName(name)[0];
}

export function convertWildcard(name) {
  // Instance names are sanitized, so we don't have to worry about regexp edge cases.
  return new RegExp(name.replace(/-/g, '\\-').replace(/\./g, '\\.').replace(/\*/g, '.*'));
}

export function findClusterNameForInstance(instance) {
  var clusters = getClusters();
  var foundName;

  eachObject(clusters, (cluster, clusterName) => {
    if (!foundName && cluster.instances[instance.name]) {
      foundName = clusterName;
    }
  });

  return foundName;
}

export function saveInstanceToCluster(clusterName, instance, callback) {
  var clusters = getClusters();
  clusters[clusterName] = clusters[clusterName] || { instances: {} };
  clusters[clusterName].instances[instance.name] = instance;
  saveClusters(clusters, callback);
}

export function deleteInstance(instance, callback) {
  var clusters = getClusters();

  eachObject(clusters, (cluster) => {
    if (cluster.instances[instance.name] &&
      cluster.instances[instance.name].ip === instance.ip) {
      delete cluster.instances[instance.name];
    }
  });

  saveClusters(clusters);
  deleteFromKnownHosts(instance, callback);
}

export function updateInstance(name, updates, callback) {
  var clusters = getClusters();
  eachObject(clusters, (cluster) => {
    eachObject(cluster.instances, (instance) => {
      if (instance.name === name) {
        Object.assign(instance, updates);
      }
    });
  });

  saveClusters(clusters, callback);
}

export function getVariables() {
  if (variablesCache) {
    return variablesCache;
  }

  if (fs.existsSync(VARIABLES_JSON)) {
    try {
      const data = JSON.parse(fs.readFileSync(VARIABLES_JSON, { encoding: 'utf8' })),
      variablesCache = data;
      return data;
    } catch (e) {
      die('Unable to parse the variables.json file. Please correct the parsing error.');
    }
  } else {
    die('Unable to find the variables.json file.');
  }
}

export function saveVariables(variables) {
  variablesCache = variables;

  fs.writeFile(VARIABLES_JSON, JSON.stringify(variables, null, 2), (err) => {
    if (err) {
      red('Error saving variables.json.');
    } else {
      success('Variables saved.');
    }
  });
}

export function getClusters() {
  if (clustersCache) {
    return clustersCache;
  }

  if (fs.existsSync(CLUSTERS_JSON)) {
    try {
      const data = JSON.parse(fs.readFileSync(CLUSTERS_JSON, { encoding: 'utf8' })),
      clustersCache = data;
      return data;
    } catch (e) {
      die('Unable to parse the clusters.json file. Please correct the parsing error.');
    }
  } else {
    die('Unable to find the clusters.json file.');
  }
}

export function saveClusters(clusters, done) {
  clustersCache = clusters;
  fs.writeFile(CLUSTERS_JSON, JSON.stringify(clusters, null, 2), (err) => {
    if (err) {
      red('Error saving clusters.json.');
    } else {
      if (isFunction(done)) {
        done();
      }
    }
  });
}

export function unknownCommand() {
  red('Unknown command.');
}

export function tokenize(str) {
  var tokens = [];
  var isQuoted = false;
  var token = '';

  str.split(' ').forEach((chunk) => {
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
  return isArray(strOrArray) ? strOrArray : [strOrArray];
}

export function findUsingMultipleKeys(collection, val, keys) {
  var match = null;
  each(collection, (obj) => {
    each(keys, (key) => {
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
  red(str);
  process.exit(1);
}

export function dieWithList(str) {
  red(str);
  console.log('');
  listCommand.run();
  process.exit(1);
}

export function handleInstanceOrClusterNotFound(instances, args) {
  if (!instances || instances.length === 0) {
    red('No instance or cluster found matching "' + args.name + '".');
    console.log('');
    listCommand.run();
    process.exit(1);
  }
}

export function handleInstanceNotFound(instance, args) {
  if (!instance) {
    red('No instance found matching "' + args.name + '".');
    console.log('');
    listCommand.run();
    process.exit(1);
  }
}

export function missingParameter(name, helpFn) {
  red('Missing ' + name + ' parameter.');
  console.log('');
  helpFn();
  process.exit(1);
}

export function missingCommand(helpFn) {
  red('Missing or unknown command.');
  console.log('');
  helpFn();
  process.exit(1);
}

export const alert = chalk.yellow;
export const cyan = chalk.cyan;
export const green = chalk.green;
export const grey = chalk.grey;
export const note = chalk.cyan;
export const red = chalk.red;
export const success = chalk.green;
export const white = chalk.white;
export const yellow = chalk.yellow;

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
  var hashes = times(width, (i) => {
    i += Math.round(_.now() / 250);
    return i % 3 ? ' ' : '/';
  });
  var spaces = times(50 - width, () => {
    return '-';
  });
  var str = ' ' + hashes.join('') + spaces.join('') + (' ' + remaining + ' seconds left');

  clearLine();
  process.stdout.write(str + "\r");
}

export function clearLine() {
  var str = times(70, () => {
    return ' ';
  });
  process.stdout.write(str.join('') + "\r");
}

export var progressComplete = clearLine;

export function progressBar(testFn, callback) {
  var startTime = _.now();
  var interval = setInterval(() => {
    var percentage = testFn();
    if (percentage < 100) {
      progress(percentage, _.now() - startTime);
    } else {
      clearInterval(interval);
      progressComplete();
      (callback || _.noop)();
    }
  }, 250);

  return interval;
}

export function waitForProgress(seconds, callback) {
  var startTime = _.now();
  progressBar(() => {
    return ((_.now() - startTime) / (seconds * 1000)) * 100;
  }, callback);
}

export function waitForBoot(instance, callback, startTime) {
  if (!startTime) {
    startTime = _.now();
    grey('Waiting until we can connect to ' + instance.name + '...');
  }

  testConnection(instance, canConnect => {
    var delayBetweenPolls = 2000;

    if (canConnect) {
      var duration = (_.now() - startTime) / 1000;
      green('Connection established after ' + Math.ceil(duration) + ' seconds.');
      if (isFunction(callback)) {
        callback();
      }
    } else {
      setTimeout(() => {
        waitForBoot(instance, callback, startTime);
      }, delayBetweenPolls);
    }
  });
}

export function fixedWait(seconds, callback) {
  seconds = seconds || 60;
  grey('Waiting ' + seconds + ' seconds...');
  waitForProgress(seconds, () => {
    success('OK.');
    if (isFunction(callback)) {
      callback();
    }
  });
}

export function printCollection(type, collection) {
  if (collection.length === 0) {
    return red('No ' + type + ' found.');
  }

  collection.forEach((obj) => {
    var name = obj.name || obj.Name || obj._name || obj.slug;
    console.log('');
    console.log(name);
    prettyPrint(obj, 2);
  });
}

export function prettyPrint(obj, indent, stepBy) {
  var prefix = '';
  times(indent || 0, () => {
    prefix += ' ';
  });
  stepBy = stepBy || 2;

  eachObject(obj, (val, key) => {
    if (key === '_name') {
      return;
    }

    if (isArray(val) || isObject(val)) {
      grey(prefix + key + ':');
      prettyPrint(val, indent + stepBy, stepBy);
    } else {
      var valStr = val;
      if (isArray(val) && val.length === 0) {
        valStr = '[]';
      } else if (val === '') {
        valStr = '""';
      }
      grey(prefix + key + ': ' + valStr);
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
  var key = normalizeKeyPath(escapeWindowsPath(instance.ssh_key));
  var port = instance.ssh_port || 22;
  var host = instance.user + '@' + instance.ip;
  var command = 'ssh -i ' + key + ' -p ' + port + ' ' + host +
    ' -o StrictHostKeyChecking=no "echo hi"';

  var ssh = spawn(command);

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
  if (isArray(command)) {
    command = command.join(' ');
  }

  var options = { stdio: 'pipe' };
  options.env = isObject(overrides.env) ? Object.assign({}, process.env, overrides.env) : process.env;

  if (overrides.cwd) {
    options.cwd = overrides.cwd;
  }

  if (process.platform === 'win32') {
    options.windowsVerbatimArguments = true;
    return cp.spawn('cmd.exe', ['/s', '/c', '"' + command + '"'], options);
  }

  return cp.spawn('/bin/sh', ['-c', command], options);
}
