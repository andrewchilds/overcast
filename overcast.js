var minimist = require('minimist');
var spawn = require('child_process').spawn;
var utils = require('./modules/utils');
var commands = require('./modules/commands');

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

  var command = commands.help;
  if (args.command) {
    if (commands[args.command]) {
      command = commands[args.command];
    }
  }

  if ((args._[0] === 'help' || args.help) && command.help) {
    command.help(args);
  } else {
    command.run(args);
  }
}

if (module.parent && module.parent.filename.indexOf('bin/overcast') !== -1) {
  // Command line use:
  init();
} else {
  // Programmatic use:
  exports.utils = utils;
  exports.commands = commands;
}
