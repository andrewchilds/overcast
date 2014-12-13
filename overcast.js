var cli = require('./modules/cli');
var utils = require('./modules/utils');

if (module.parent && module.parent.filename.indexOf('bin/overcast') !== -1) {
  // Command line use:
  cli.init();
} else {
  // Programmatic use:
  exports.cli = cli;
  exports.utils = utils;
  exports.commands = utils.getCommands();
}
