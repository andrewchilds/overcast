var fs = require('fs');
var minimist = require('minimist');
var utils = require('./modules/utils');
var cli = require('./modules/cli');

function init() {
  utils.findConfig(function () {
    if (utils.keyExists('overcast')) {
      execute();
    } else {
      utils.createKey('overcast', execute);
    }
  });
}

function execute() {
  var args = minimist(process.argv.slice(2));
  utils.argShift(args, 'command');

  var file = utils.escapeWindowsPath(__dirname + '/modules/commands/' + args.command + '.js');
  var command;
  if (fs.existsSync(file)) {
    command = require(file);
  } else {
    command = require('./modules/commands/help');
  }

  if ((args._[0] === 'help' || args.help) && command.help) {
    command.help(args);
  } else {
    if (command.commands) {
      var matchingCommand = cli.findMatchingCommand(command, args);
      if (matchingCommand) {
        cli.run(matchingCommand, args);
      } else {
        cli.missingCommand(command, args);
      }
    } else {
      command.run(args);
    }
  }
}

if (module.parent && module.parent.filename.indexOf('bin/overcast') !== -1) {
  // Command line use:
  init();
} else {
  // Programmatic use:
  exports.utils = utils;
  exports.commands = utils.getCommands();
}
