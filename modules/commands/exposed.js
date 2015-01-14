var _ = require('lodash');
var utils = require('../utils');
var ssh = require('../ssh');

var commands = {};
exports.commands = commands;

commands.exposed = {
  name: 'exposed',
  usage: 'overcast exposed [instance|cluster|all]',
  description: [
    'List the exposed ports on the instance or cluster.',
    'Expects an Ubuntu server, untested on other distributions.'
  ],
  options: [
    { usage: '--user USERNAME' },
    { usage: '--password PASSWORD' },
    { usage: '--machine-readable, --mr' }
  ],
  required: [{ name: 'instance|cluster|all', varName: 'name' }],
  run: function (args) {
    args._ = ['list_exposed_ports'];
    ssh.run(args);
  }
};
