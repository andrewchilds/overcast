var fs = require('fs');
var _ = require('lodash');
var utils = require('../utils');
var list = require('./list');

exports.signatures = function () {
  return utils.printSignatures(subcommands);
};

exports.help = function () {
  utils.printCommandHelp(subcommands);
};

exports.run = function (args) {
  utils.argShift(args, 'subcommand');
  utils.argShift(args, 'name');

  if (args.name === 'help' && subcommands[args.subcommand].help) {
    console.log('');
    return subcommands[args.subcommand].help();
  } else if (args.subcommand && subcommands[args.subcommand] && subcommands[args.subcommand].run) {
    return subcommands[args.subcommand].run(args);
  } else {
    return utils.missingCommand(exports.help);
  }
};

var subcommands = {};

subcommands.create = utils.module(function (exports) {
  exports.signature = 'overcast key create [name]';

  exports.help = function () {
    utils.printArray([
      exports.signature,
      '  Creates a new SSH key in the current .overcast config.'.grey,
      '',
      '  Example:'.grey,
      '  $ overcast key create myKeyName'.grey,
      '  > New SSH key "myKeyName" created.'.grey,
      '  > /path/to/.overcast/keys/myKeyName.key'.grey,
      '  > /path/to/.overcast/keys/myKeyName.key.pub'.grey
    ]);
  };

  exports.run = function (args) {
    if (!args.name) {
      return utils.missingParameter('[name]', exports.help);
    } else if (utils.keyExists(args.name)) {
      return utils.grey('The key "' + args.name + '" already exists, no action taken.');
    }

    utils.createKey(args.name, function (keyPath) {
      utils.success('New SSH key "' + args.name + '" created.');
      utils.grey(' - ' + keyPath);
      utils.grey(' - ' + keyPath + '.pub');
    });
  };
});

subcommands.delete = utils.module(function (exports) {
  exports.signature = 'overcast key delete [name]';

  exports.help = function () {
    utils.printArray([
      exports.signature,
      '  Deletes SSH public/private key files from the current .overcast config.'.grey,
      '',
      '  Example:'.grey,
      '  $ overcast key delete myKeyName'.grey,
      '  > SSH key "myKeyName" deleted.'.grey
    ]);
  };

  exports.run = function (args) {
    if (!args.name) {
      return utils.missingParameter('[name]', exports.help);
    } else if (!utils.keyExists(args.name)) {
      return utils.grey('The key "' + args.name + '" was not found, no action taken.');
    }

    utils.deleteKey(args.name, function () {
      utils.success('SSH key "' + args.name + '" deleted.');
    });
  };
});

subcommands.get = utils.module(function (exports) {
  exports.signature = 'overcast key get [name] [option]';

  exports.help = function () {
    utils.printArray([
      exports.signature,
      '  Display the requested SSH key data or path from the current .overcast config.'.grey,
      '  Defaults to displaying the public key data if no option found.'.grey,
      '',
      '    Option'.grey,
      '    --public-data'.grey,
      '    --private-data'.grey,
      '    --public-path'.grey,
      '    --private-path'.grey,
      '',
      '  Examples:'.grey,
      '  $ overcast key get myKeyName'.grey,
      '  > [public key data]'.grey,
      '  $ overcast key get myKeyName --private-data'.grey,
      '  > [private key data]'.grey
    ]);
  };

  exports.run = function (args) {
    if (!args.name) {
      return utils.missingParameter('[name]', exports.help);
    } else if (!utils.keyExists(args.name)) {
      return utils.grey('The key "' + args.name + '" was not found.');
    }

    var keyFile = utils.getKeyFileFromName(args.name);
    var publicKeyFile = keyFile + '.pub';

    function printFile(file) {
      fs.readFile(file, function (err, data) {
        if (err) {
          return utils.die(err);
        }
        console.log(data.toString());
      });
    }

    if (args['private-data']) {
      printFile(keyFile);
    } else if (args['private-path']) {
      console.log(keyFile);
    } else if (args['public-path']) {
      console.log(publicKeyFile);
    } else {
      printFile(publicKeyFile);
    }
  };
});

subcommands.list = utils.module(function (exports) {
  exports.signature = 'overcast key list';

  exports.help = function () {
    utils.printArray([
      exports.signature,
      '  List the found SSH key names in the current .overcast config.'.grey,
      '',
      '  Examples:'.grey,
      '  $ overcast key list'.grey,
      '  > myKeyName'.grey,
      '  > overcast'.grey
    ]);
  };

  exports.run = function (args) {
    fs.readdir(utils.CONFIG_DIR + '/keys/', function (err, data) {
      data = _.map(data, function (name) {
        return name.replace('.pub', '').replace('.key', '');
      });
      _.map(_.unique(data), function (name) {
        console.log(name);
      });
    });
  };
});
