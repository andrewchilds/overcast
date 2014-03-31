var minimist = require('minimist');
var spawn = require('child_process').spawn;
var utils = require('./modules/utils');
var keys = require('./modules/keys');
var commands = require('./modules/commands');

function init() {
  utils.findConfig(function () {
    if (keys.notFound()) {
      keys.create(execute);
    } else {
      execute();
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

init();
