var fs = require('fs');
var colors = require('colors');
var _ = require('lodash');
var utils = require('../utils');
var cli = require('../cli');

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
        return module.help();
      } else if (module && module.commands) {
        return cli.missingCommand(module, args);
      }
    } else {
      utils.unknownCommand();
    }
  }

  exports.help();
};

exports.help = function () {
  var signatures = [];
  var row = ' ';
  _.each(utils.getCommands(), function (command, name) {
    if (name !== 'help' && (command.signatures || command.commands)) {
      if (row.length > 58) {
        signatures.push(row);
        row = ' ';
      }
      row += ' ' + name;
    }
  });
  signatures.push(row);

  utils.printArray([
    ('Overcast v' + utils.VERSION).grey,
    '',
    'Source code, issues, pull requests:'.grey,
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
