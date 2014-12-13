var _ = require('lodash');
var utils = require('../utils');
var ssh = require('../ssh');
var filters = require('../filters');

var commands = {};
exports.commands = commands;

commands.port = {
  name: 'port',
  usage: 'overcast port [instance|cluster|all] [port]',
  description: [
    'Change the SSH port for an instance or a cluster.',
    'This command will fail if the new port is not opened by iptables.'
  ],
  examples: [
    '$ overcast port app-01 22222',
    '$ overcast port db 22222'
  ],
  required: [
    { name: 'instance|cluster|all', varName: 'name' },
    { name: 'port' }
  ],
  run: function (args) {
    var new_ssh_port = args.port + '';
    args.env = {
      new_ssh_port: new_ssh_port
    };

    args._ = ['change_ssh_port'];
    ssh.run(args, function () {
      _.each(args.instances, function (instance) {
        utils.updateInstance(instance.name, {
          ssh_port: new_ssh_port
        });
      });
    });
  }
};
