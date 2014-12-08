var fs = require('fs');
var _ = require('lodash');
var utils = require('../utils');
var filters = require('../filters');

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
