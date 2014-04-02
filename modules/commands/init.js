var fs = require('fs');
var _ = require('lodash');
var utils = require('../utils');

exports.run = function (args) {
  var cwd = process.cwd();

  if (fs.existsSync(cwd + '/.overcast')) {
    utils.alert('.overcast directory already exists here.');
  } else {
    utils.initOvercastDir(cwd);
  }
};

exports.signatures = function () {
  return [
    '  overcast init'
  ];
};

exports.help = function () {
  utils.printArray([
    'overcast init',
    '  Create an .overcast config directory in the current working directory.'.grey,
    '  No action taken if one already exists.'.grey
  ]);
};
