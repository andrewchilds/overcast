import chalk from 'chalk';
import cp from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import url from 'url';

import * as listCommand from './commands/list.js';
import * as log from './log.js';
import * as store from './store.js';
import { SSH_COLORS } from './constants.js';

export function getNextColor() {
  const count = store.getSSHCount();
  store.increaseSSHCount();

  return SSH_COLORS[count % SSH_COLORS.length];
}

export function isTestRun() {
  return store.getArgString().includes('--is-test-run');
}

export function now() {
  return new Date().getTime();
}

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
  const results = [];
  let index = 1;
  while (index <= maxIndex) {
    results.push(cb(index++));
  }

  return results;
}

export function allInParallelThen(parallelFns, nextFn) {
  let results = 0;
  parallelFns.forEach((fn) => {
    fn(() => {
      results += 1;
      if (results >= parallelFns.length) {
        nextFn();
      }
    });
  });
}

export function runSubcommand(args, subcommands, helpFn) {
  if (args.subcommand && subcommands[args.subcommand]) {
    var command = subcommands[args.subcommand];
    if (args.name === 'help' || args._[0] === 'help') {
      log.br();
      return command.help();
    }

    return command.run(args);
  }

  return missingCommand(helpFn);
}

export function findConfig(nextFn) {
  const cwd = process.cwd();

  if (isTestRun()) {
    return initOvercastDir(cwd, () => {
      store.setConfigDirs(cwd + '/.overcast');
      return nextFn();
    });
  }

  walkDir(cwd, (dir) => {
    store.setConfigDirs(dir);
    nextFn();
  });
}

export function walkDir(dir, nextFn) {
  if (!dir || dir === '/') {
    // No config directory found!
    // Falling back to config directory in $HOME.
    log.alert(`No config directory found. Creating one in ${getUserHome()}`);
    return initOvercastDir(getUserHome(), () => {
      nextFn(getUserHome() + '/.overcast');
    });
  }

  if (fs.existsSync(dir + '/.overcast')) {
    nextFn(dir + '/.overcast');
  } else {
    dir = dir.split('/');
    dir.pop();
    walkDir(dir.join('/'), nextFn);
  }
}

export function getKeyFileFromName(keyName) {
  return store.getConfigDir() + '/keys/' + keyName + '.key';
}

export function createKeyIfMissing(nextFn = () => {}, keyName = 'overcast') {
  if (keyExists(keyName)) {
    nextFn();
  } else {
    log.info('Overcast SSH key not found, creating one...')
    createKey(keyName, nextFn);
  }
}

export function keyExists(keyName) {
  return fs.existsSync(getKeyFileFromName(keyName));
}

export function createKey(keyName, nextFn) {
  var keyFile = getKeyFileFromName(keyName);
  var keysDir = store.getConfigDir() + '/keys';

  if (!fs.existsSync(keysDir)) {
    fs.mkdirSync(keysDir);
  }

  if (isTestRun()) {
    cp.exec(`touch "${keyFile}" && touch "${keyFile}".pub`, (err) => {
      if (err) {
        log.failure('Error generating SSH key!');
        die(err);
      } else {
        log.success(`Created new SSH key at ${keyFile}.`);
        nextFn();
      }
    });
  } else {
    var keygen = spawn('ssh-keygen -t rsa -N "" -f ' + keyFile);
    keygen.on('exit', code => {
      if (code !== 0) {
        log.failure('Error generating SSH key!');
        die(err);
      } else {
        log.success(`Created new SSH key at ${keyFile}.`);
        nextFn();
      }
    });
  }
}

export function deleteKey(keyName, nextFn) {
  var keyFile = getKeyFileFromName(keyName);
  var pubKeyFile = keyFile + '.pub';

  function handleError(e, name) {
    if (e) {
      log.faded('Unable to delete ' + name + ' - perhaps it wasn\'t found.');
    }
  }

  fs.unlink(keyFile, e => {
    handleError(e, keyFile);
    fs.unlink(pubKeyFile, e => {
      handleError(e, pubKeyFile);
      if (isFunction(nextFn)) {
        nextFn();
      }
    });
  });
}

export function deleteFromKnownHosts(instance, nextFn = () => {}) {
  var ssh = spawn('ssh-keygen -R ' + instance.ip);
  ssh.on('exit', code => {
    log.faded(instance.ip + ' removed from ' + getUserHome() + '/.ssh/known_hosts.');
    nextFn(instance);
  });
}

export function normalizeKeyPath(keyPath, keyName) {
  keyName = keyName || 'overcast.key';

  if (!keyPath) {
    return path.resolve(store.getConfigDir(), 'keys', keyName);
  }

  if (isAbsolute(keyPath)) {
    return keyPath;
  } else if (keyPath.indexOf('~/') === 0) {
    return keyPath.replace('~/', getUserHome() + '/');
  } else if (keyPath.indexOf('$HOME') === 0) {
    return keyPath.replace('$HOME', getUserHome());
  } else {
    return path.resolve(store.getConfigDir(), 'keys', keyPath);
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
      p = path.resolve(store.getConfigDir(), 'files', p);
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

export function getFileDirname() {
  return url.fileURLToPath(new URL('.', import.meta.url));
}

export function initOvercastDir(destDir, nextFn) {
  if (fs.existsSync(destDir + '/.overcast')) {
    return nextFn();
  }

  destDir += '/.overcast';
  const initFile = escapeWindowsPath(getFileDirname() + '/../bin/overcast-init');
  const fixtureDir = escapeWindowsPath(getFileDirname() + '/../fixtures');

  return cp.exec('bash ' + initFile, {
    env: Object.assign({}, process.env, {
      OVERCAST_FIXTURE_DIR: fixtureDir,
      OVERCAST_DEST_DIR: escapeWindowsPath(destDir)
    })
  }, (err, stdout, stderr) => {
    if (err) {
      return die('Unable to create .overcast directory.');
    }

    log.success(`Created an .overcast directory at ${destDir}`);
    nextFn();
  });
}

export function argShift(args, key) {
  args[key] = sanitize(args._.shift());
}

export function argIsTruthy(arg) {
  return !!(arg && arg !== 'false');
}

export function findMatchingInstances(name) {
  const clusters = getClusters();
  let instances = [];

  if (name === 'all') {
    eachObject(clusters, (cluster) => {
      eachObject(cluster.instances, instance => {
        instances.push(instance);
      });
    });
  } else if (clusters[name] && clusters[name].instances) {
    instances = Object.values(clusters[name].instances);
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

export function saveInstanceToCluster(clusterName, instance, nextFn) {
  var clusters = getClusters();
  clusters[clusterName] = clusters[clusterName] || { instances: {} };
  clusters[clusterName].instances[instance.name] = instance;
  saveClusters(clusters, nextFn);
}

export function deleteInstance(instance, nextFn) {
  var clusters = getClusters();

  eachObject(clusters, (cluster) => {
    if (cluster.instances[instance.name] &&
      cluster.instances[instance.name].ip === instance.ip) {
      delete cluster.instances[instance.name];
    }
  });

  saveClusters(clusters, () => {
    deleteFromKnownHosts(instance, nextFn);
  });
}

export function updateInstance(name, updates, nextFn) {
  var clusters = getClusters();
  eachObject(clusters, (cluster) => {
    eachObject(cluster.instances, (instance) => {
      if (instance.name === name) {
        Object.assign(instance, updates);
      }
    });
  });

  saveClusters(clusters, nextFn);
}

export function getVariables() {
  const file = store.getVariablesJSON();
  if (fs.existsSync(file)) {
    try {
      const data = JSON.parse(fs.readFileSync(file, { encoding: 'utf8' }));
      return data;
    } catch (e) {
      die(`Unable to parse the variables file (${file}). Please correct the parsing error.`);
    }
  } else {
    die(`Unable to find the variables file (${file}).`);
  }
}

export function saveVariables(variables, nextFn = () => {}) {
  const file = store.getVariablesJSON();
  fs.writeFile(file, JSON.stringify(variables, null, 2), (err) => {
    if (err) {
      die(`Error saving to the variables file (${file}).`);
    } else {
      nextFn();
    }
  });
}

export function getClusters() {
  const file = store.getClustersJSON();
  if (fs.existsSync(file)) {
    try {
      const data = JSON.parse(fs.readFileSync(file, { encoding: 'utf8' }));
      return data;
    } catch (e) {
      die(`Unable to parse the clusters file (${file}). Please correct the parsing error.`);
    }
  } else {
    die(`Unable to find the clusters file (${file}).`);
  }
}

export function saveClusters(clusters, nextFn = () => {}) {
  const file = store.getClustersJSON();
  fs.writeFile(file, JSON.stringify(clusters, null, 2), (err) => {
    if (err) {
      die(`Error saving to the clusters file (${file}).`);
    } else {
      nextFn();
    }
  });
}

export function unknownCommand() {
  log.failure('Unknown command.');
}

export function tokenize(str) {
  var tokens = [];
  var isQuoted = false;
  var token = '';

  str.split(' ').forEach((chunk) => {
    if (!chunk) {
      return;
    }

    var first = chunk.charAt(0);
    var last = chunk.charAt(chunk.length - 1);
    if (isQuoted) {
      if (last === '"' || last === '\'') {
        token += ' ' + (chunk.slice(0, -1));
        if (token) {
          tokens.push(token);
        }
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
          if (token) {
            tokens.push(token);
          }
          isQuoted = false;
        }
      } else {
        token = '';
        if (chunk) {
          tokens.push(chunk);
        }
      }
    }
  });

  if (tokens.length === 0 && token) {
    tokens.push(token);
  }

  return tokens;
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

export function printArray(arr, color = null) {
  let str = '  ' + arr.join('\n  ');
  log.log(color ? chalk[color](str) : str);
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
  log.failure(str);
  if (isTestRun()) {
    return false;
  } else {
    process.exit(1);
  }
}

export function dieWithList(str) {
  log.failure(str);
  log.br();
  listCommand.commands.list.run();
  if (isTestRun()) {
    return false;
  } else {
    process.exit(1);
  }
}

export function handleInstanceOrClusterNotFound(instances, args) {
  if (!instances || instances.length === 0) {
    log.failure('No instance or cluster found matching "' + args.name + '".');
    log.br();
    listCommand.commands.list.run();
    if (isTestRun()) {
      return false;
    } else {
      process.exit(1);
    }
  }
}

export function handleInstanceNotFound(instance, args) {
  if (!instance) {
    log.failure('No instance found matching "' + args.name + '".');
    log.br();
    listCommand.commands.list.run();
    if (isTestRun()) {
      return false;
    } else {
      process.exit(1);
    }
  }
}

export function missingParameter(name, helpFn) {
  log.failure('Missing ' + name + ' parameter.');
  log.br();
  helpFn();
  if (isTestRun()) {
    return false;
  } else {
    process.exit(1);
  }
}

export function missingCommand(helpFn) {
  log.failure('Missing or unknown command.');
  log.br();
  helpFn();
  if (isTestRun()) {
    return false;
  } else {
    process.exit(1);
  }
}

export function prefixPrint(prefix, prefixColor, buffer, textColor) {
  prefix = chalk[prefixColor](prefix + ': ');
  var str = textColor ? chalk[textColor](buffer.toString()) : buffer.toString();
  str = str.replace(/\r/g, "\r" + prefix).replace(/\n/g, "\n" + prefix);
  process.stdout.write(str);
}

export function progress(percentage, elapsed) {
  const maxWidth = 34;
  percentage = percentage || 0;
  percentage = parseFloat(percentage);

  var remaining = '???';
  if (percentage > 2) {
    remaining = (((elapsed / (percentage / 100)) - elapsed) / 1000).toPrecision(3);
  }
  if (remaining > 99) {
    remaining = '???';
  }

  var width = Math.max(1, Math.ceil(percentage / 3));
  var hashes = times(width, (i) => {
    i += Math.round(now() / maxWidth);
    return chalk.bgGreen(' ');
  });
  var spaces = times(maxWidth - width, () => {
    return chalk.bgGrey(' ');
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

export let progressComplete = clearLine;

export function progressBar(testFn, nextFn = () => {}) {
  const intervalSpeed = 60;
  var startTime = now();
  var interval = setInterval(() => {
    var percentage = testFn();
    if (percentage < 100) {
      progress(percentage, now() - startTime);
    } else {
      clearInterval(interval);
      progressComplete();
      nextFn();
    }
  }, intervalSpeed);

  return interval;
}

export function waitForProgress(seconds, nextFn) {
  var startTime = now();
  progressBar(() => {
    return ((now() - startTime) / (seconds * 1000)) * 100;
  }, nextFn);
}

export function waitForBoot(instance, nextFn, startTime) {
  if (!startTime) {
    startTime = now();
    log.faded('Waiting until we can connect to ' + instance.name + '...');
  }

  testConnection(instance, canConnect => {
    var delayBetweenPolls = 2000;

    if (canConnect) {
      var duration = (now() - startTime) / 1000;
      log.success('Connection established after ' + Math.ceil(duration) + ' seconds.');
      if (isFunction(nextFn)) {
        nextFn();
      }
    } else {
      setTimeout(() => {
        waitForBoot(instance, nextFn, startTime);
      }, delayBetweenPolls);
    }
  });
}

export function fixedWait(seconds, nextFn = () => {}) {
  seconds = seconds || 60;
  log.faded('Waiting ' + seconds + ' seconds...');
  waitForProgress(seconds, nextFn);
}

export function printCollection(type, collection) {
  if (collection.length === 0) {
    return log.failure('No ' + type + ' found.');
  }

  collection.forEach((obj) => {
    var name = obj.name || obj.Name || obj._name || obj.slug;
    log.br();
    log.log(name);
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
      log.log(prefix + key + ':');
      prettyPrint(val, indent + stepBy, stepBy);
    } else {
      var valStr = val;
      if (isArray(val) && val.length === 0) {
        valStr = '[]';
      } else if (val === '') {
        valStr = '""';
      }
      log.log(prefix + key + ': ' + valStr);
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
        log.br();
      }
      command.help();
    }
  });
}

export function testConnection(instance, nextFn = () => {}) {
  const key = normalizeKeyPath(escapeWindowsPath(instance.ssh_key));
  const port = instance.ssh_port || 22;
  const host = instance.user + '@' + instance.ip;
  const command = 'ssh -i ' + key + ' -p ' + port + ' ' + host +
    ' -o StrictHostKeyChecking=no "echo hi"';

  const ssh = spawn(command);
  const timeout = setTimeout(() => {
    callbackOnce(false);
    ssh.kill();
  }, 8000);

  let alreadyCalled = false;
  const callbackOnce = (result) => {
    if (!alreadyCalled) {
      clearTimeout(timeout);
      alreadyCalled = true;
      nextFn(result);
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

  const options = { stdio: 'pipe' };
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
