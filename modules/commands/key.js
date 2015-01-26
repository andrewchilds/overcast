var fs = require('fs');
var _ = require('lodash');
var utils = require('../utils');
var filters = require('../filters');
var ssh = require('../ssh');

var commands = {};
exports.commands = commands;

commands.create = {
  name: 'create',
  usage: 'overcast key create [name]',
  description: 'Creates a new SSH key in the current .overcast config.',
  examples: [
    '$ overcast key create myKeyName',
    'New SSH key "myKeyName" created.',
    ' - /path/to/.overcast/keys/myKeyName.key',
    ' - /path/to/.overcast/keys/myKeyName.key.pub'
  ],
  required: [{ name: 'name', filters: filters.shouldBeNewKey }],
  run: function (args) {
    utils.createKey(args.name, function (keyPath) {
      utils.success('New SSH key "' + args.name + '" created.');
      utils.grey(' - ' + keyPath);
      utils.grey(' - ' + keyPath + '.pub');
    });
  }
};

commands.delete = {
  name: 'delete',
  usage: 'overcast key delete [name]',
  description: 'Deletes SSH public/private key files from the current .overcast config.',
  examples: [
    '$ overcast key delete myKeyName',
    'SSH key "myKeyName" deleted.'
  ],
  required: [{ name: 'name', filters: filters.shouldBeExistingKey }],
  run: function (args) {
    utils.deleteKey(args.name, function () {
      utils.success('SSH key "' + args.name + '" deleted.');
    });
  }
};

commands.get = {
  name: 'get',
  usage: 'overcast key get [name] [option]',
  description: [
    'Display the requested SSH key data or path from the current .overcast config.',
    'Defaults to displaying the public key data if no option found.'
  ],
  options: [
    { usage: '--public-data' },
    { usage: '--private-data' },
    { usage: '--public-path' },
    { usage: '--private-path' }
  ],
  examples: [
    '$ overcast key get myKeyName',
    '[public key data]',
    '$ overcast key get myKeyName --private-data',
    '[private key data]'
  ],
  required: [{ name: 'name', filters: filters.shouldBeExistingKey }],
  run: function (args) {
    var keyFile = utils.getKeyFileFromName(args.name);
    var publicKeyFile = keyFile + '.pub';

    if (args['private-data']) {
      printFile(keyFile);
    } else if (args['private-path']) {
      console.log(keyFile);
    } else if (args['public-path']) {
      console.log(publicKeyFile);
    } else {
      printFile(publicKeyFile);
    }
  }
};

commands.list = {
  name: 'list',
  usage: 'overcast key list',
  description: 'List the found SSH key names in the current .overcast config.',
  examples: [
    '$ overcast key list',
    'myKeyName',
    'overcast'
  ],
  run: function (args) {
    listKeys();
  }
};

commands.push = {
  name: 'push',
  usage: 'overcast key push [instance|cluster|all] [name|path] [options...]',
  description: [
    'Push a public SSH key to an instance or cluster. Accepts a key name,',
    'filename, or full path. This will overwrite the existing authorized_keys',
    'file, unless you use --append.'
  ],
  examples: [
    '# Generate new SSH key pair:',
    '$ overcast key create newKey',
    '',
    '# Push public key to instance, update instance config to use private key:',
    '$ overcast key push vm-01 newKey',
    '$ overcast instance update vm-01 --ssh-key newKey.key',
    '',
    '# Same as above but using key path instead of key name:',
    '$ overcast key push vm-02 "~/.ssh/id_rsa.pub"',
    '$ overcast instance update vm-02 --ssh-key "~/.ssh/id_rsa"',
    '',
    '# Push public key to instance using arbitrary user:',
    '$ overcast key push vm-03 newKey --user myOtherUser',
    '',
    '# Append public key to authorized_keys instead of overwriting:',
    '$ overcast key push vm-04 newKey --append'
  ],
  required: [
    { name: 'instance|cluster|all', varName: 'name', filters: filters.findMatchingInstances },
    { name: 'name|path', varName: 'path', raw: true }
  ],
  options: [
    { usage: '--user USERNAME' },
    { usage: '--append, -a', default: 'false' }
  ],
  run: function (args) {
    var keyPath = exports.getKeyPath(args.path);
    args.env = {
      PUBLIC_KEY: fs.readFileSync(keyPath, { encoding: 'utf8' }),
      SHOULD_APPEND: utils.argIsTruthy(args.append) || utils.argIsTruthy(args.a)
    };

    args._ = ['authorize_key'];
    args.mr = true; // machine readable
    ssh.run(args, function () {
      utils.success('Key updated on ' + args.instances.length + ' instance(s).');
      utils.grey('If this is the default user you use to SSH in,');
      utils.grey('you need to update the instance configuration. For example:');
      utils.grey('overcast instance update ' + args.name + ' --ssh-key myPrivateKey.key');
    });
  }
};

exports.getKeyPath = function (path) {
  var keyPath = utils.normalizeKeyPath(path);
  if (!fs.existsSync(keyPath)) {
    if (fs.existsSync(keyPath + '.key.pub')) {
      keyPath += '.key.pub';
    } else if (fs.existsSync(keyPath + '.pub')) {
      keyPath += '.pub';
    } else {
      utils.die('Key "' + keyPath + '" not found.');
      return false;
    }
  }

  return keyPath;
};

function printFile(file) {
  fs.readFile(file, function (err, data) {
    if (err) {
      return utils.die(err);
    }
    console.log(data.toString());
  });
}

function listKeys() {
  fs.readdir(utils.CONFIG_DIR + '/keys/', function (err, data) {
    data = _.map(data, function (name) {
      return name.replace('.pub', '').replace('.key', '');
    });
    _.map(_.unique(data), function (name) {
      console.log(name);
    });
  });
}
