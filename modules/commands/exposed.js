var spawn = require('child_process').spawn;
var _ = require('lodash');
var utils = require('../utils');
var ssh = require('../ssh');
var help = require('./help');

exports.run = function (args) {
  utils.argShift(args, 'name');

  if (!args.name) {
    utils.red('Missing [name] parameter.');
    return exports.help(args);
  }

  args._ = ['list_exposed_ports'];
  ssh(args);
};

exports.signatures = function () {
  return [
    '  overcast exposed [instance|cluster|all]'
  ];
};

exports.help = function (args) {
  utils.printArray([
    'overcast exposed [instance|cluster|all]',
    '  List the exposed ports on the instance or cluster.'.grey,
    '  Expects an Ubuntu server, untested on other distributions.'.yellow
  ]);
};
