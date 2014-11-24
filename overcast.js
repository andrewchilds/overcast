var utils = require('./modules/utils');
var cli = require('./modules/cli');

if (module.parent && module.parent.filename.indexOf('bin/overcast') !== -1) {
  // Command line use:
  cli.init();
} else {
  // Programmatic use:
  exports.utils = utils;
  exports.commands = utils.getCommands();
}
