var utils = require('../utils');
var instanceCommand = require('./instance');

exports.run = function (args) {
  args.command = 'instance';
  args._.unshift('remove');
  instanceCommand.run(args);
};

exports.signatures = function () {
  return [
    '  overcast remove [name]'
  ];
};

exports.help = function () {
  utils.printArray([
    'overcast remove [name]',
    '  Removes an instance from the index.'.grey,
    '  The server itself is not affected by this action.'.grey,
    '',
    '  Example:'.grey,
    '  $ overcast remove app.01'.grey
  ]);
};
