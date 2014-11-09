var _ = require('lodash');
var utils = require('../utils');

exports.run = function (args) {
  utils.argShift(args, 'delay');

  if (!args.delay) {
    return utils.missingParameter('[seconds]', exports.help);
  }

  utils.fixedWait(args.delay);
};

exports.signatures = function () {
  return [
    '  overcast wait [seconds]'
  ];
};

exports.help = function () {
  utils.printArray([
    'overcast wait [seconds]',
    '  Show a progress bar for a specified number of seconds.'.grey,
    '',
    '  Wait 30 seconds:'.grey,
    '  $ overcast wait 30'.grey,
    '',
    '  Wait 120 seconds:'.grey,
    '  $ overcast wait 120'.grey
  ]);
};
