var utils = require('../utils');
var instance = require('./instance');

var commands = {};
exports.commands = commands;

commands.remove = {
  name: 'remove',
  usage: 'overcast remove [name]',
  description: instance.commands.remove.description,
  examples: instance.commands.remove.examples,
  required: instance.commands.remove.required,
  run: function (args) {
    args.command = 'instance';
    args._.unshift('remove');
    instance.commands.remove.run(args);
  }
};
