var _ = require('lodash');
var utils = require('../utils');
var ssh = require('../ssh');

exports.run = function (args) {
  utils.argShift(args, 'name');

  if (!args.name) {
    utils.missingParameter('[instance|cluster|all]', exports.help);
  }

  args._ = ['list_exposed_ports'];
  ssh(args);
};

exports.signatures = function () {
  return [
    '  overcast exposed [instance|cluster|all]'
  ];
};

exports.help = function () {
  utils.printArray([
    'overcast exposed [instance|cluster|all]',
    '  List the exposed ports on the instance or cluster.'.grey,
    '  Expects an Ubuntu server, untested on other distributions.'.grey,
    '',
    '    Option        | Default'.grey,
    '    --user NAME   |'.grey
  ]);
};
