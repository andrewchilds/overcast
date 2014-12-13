var _ = require('lodash');
var utils = require('../utils');

var commands = {};
exports.commands = commands;

commands.wait = {
  name: 'wait',
  usage: 'overcast wait [seconds]',
  description: [
    'Show a progress bar for a specified number of seconds.'
  ],
  examples: [
    '$ overcast wait 30'
  ],
  required: ['seconds'],
  run: function (args) {
    utils.fixedWait(args.seconds);
  }
};
