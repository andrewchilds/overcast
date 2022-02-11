var _ = require('lodash');
var cp = require('child_process');
var utils = require('../utils');
var filters = require('../filters');

var commands = {};
exports.commands = commands;

commands.ping = {
  name: 'ping',
  usage: 'overcast ping [instance|cluster|all] [options]',
  description: 'Display the average ping time for an instance or cluster.',
  examples: [
    '$ overcast ping app-01',
    '$ overcast ping db --count 5'
  ],
  required: [
    { name: 'name', filters: filters.findMatchingInstances }
  ],
  options: [{ usage: '--count N, -c N', default: '3' }],
  run: function (args) {
    var count = args.count || args.c || 3;
    utils.each(args.instances, instance => {
      ping(instance, count);
    });
  }
};

function ping(instance, count) {
  cp.exec('ping -c ' + count + ' ' + instance.ip, (err, stdout) => {
    var color = utils.SSH_COLORS[utils.SSH_COUNT++ % 5];
    var averagePing = stdout.match(/ ([\d\.]+)\/([\d\.]+)\/([\d\.]+)\/([\d\.]+) ms/);
    var prefix = instance.name + ': ';
    console.log(prefix[color] + averagePing[2] + ' ms');
  });
}
