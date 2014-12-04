var fs = require('fs');
var _ = require('lodash');
var utils = require('../utils');

var commands = {};
exports.commands = commands;

commands.init = {
  usage: 'overcast init',
  description: [
    'Create an .overcast config directory in the current working directory.',
    'No action taken if one already exists.'
  ],
  run: function (args) {
    var cwd = process.cwd();

    if (fs.existsSync(cwd + '/.overcast')) {
      utils.alert('.overcast directory already exists here.');
    } else {
      utils.initOvercastDir(cwd);
    }
  }
};
