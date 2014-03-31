var fs = require('fs');
var colors = require('colors');
var _ = require('lodash');
var utils = require('../utils');

exports.run = function (args) {
  if (!args.subcommand) {
    utils.argShift(args, 'subcommand');
  }

  var moduleName;
  if (args.command === 'help' && args.subcommand) {
    moduleName = args.subcommand;
  } else if (args.command !== 'help') {
    moduleName = args.command;
  }

  if (moduleName) {
    if (fs.existsSync(__dirname + '/' + moduleName + '.js')) {
      var module = require('./' + moduleName);
      if (module && module.help) {
        return module.help(args);
      }
    } else {
      utils.unknownCommand();
    }
  }

  exports.help(args);
};

exports.help = function (args) {
  var signatures = [];
  _.each(utils.getCommands(), function (command, name) {
    if (name !== 'help' && command.signatures) {
      signatures = signatures.concat(command.signatures());
    }
  });

  utils.printArray([
    ('Overcast v' + utils.VERSION).grey,
    '',
    'Code repo, issues, pull requests:'.grey,
    '  https://github.com/andrewchilds/overcast',
    '',
    'Usage:'.grey,
    '  overcast [command] [options...]',
    '',
    'Help:'.grey,
    '  overcast help',
    '  overcast help [command]',
    '  overcast [command] help',
    '',
    'Commands:'.grey
  ]);
  utils.printArray(signatures);
  utils.printArray([
    '',
    'Config directory:'.grey,
    '  ' + utils.CONFIG_DIR.cyan
  ]);
};
