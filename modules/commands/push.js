var _ = require('lodash');
var utils = require('../utils');
var scp = require('../scp');
var rsync = require('../rsync');

exports.run = function (args) {
  utils.argShift(args, 'name');
  args.source = args._.shift();
  args.dest = args._.shift();
  args.direction = 'push';

  if (!args.name) {
    return utils.missingParameter('[instance|cluster|all]', exports.help);
  } else if (!args.source) {
    return utils.missingParameter('[source]', exports.help);
  } else if (!args.dest) {
    return utils.missingParameter('[dest]', exports.help);
  }

  if (utils.argIsTruthy(args.rsync)) {
    rsync.run(args);
  } else {
    scp.run(args);
  }
};

exports.signatures = function () {
  return [
    '  overcast push [instance|cluster|all] [source] [dest] [options]'
  ];
};

exports.help = function () {
  utils.printArray([
    'overcast push [instance|cluster|all] [source] [dest]',
    '  Push a file or directory to an instance or cluster using scp by default,'.grey,
    '  or rsync if the --rsync flag is used. Source can be absolute or relative'.grey,
    '  to the .overcast/files directory. Destination can be absolute or relative'.grey,
    '  to the home directory. Any reference to {instance} in the source will be'.grey,
    '  replaced with the instance name.'.grey,
    '',
    '    Option         | Default'.grey,
    '    --rsync        | false'.grey,
    '    --user NAME    |'.grey,
    '',
    '  Example:'.grey,
    '  Assuming instances "app.01" and "app.02", this will expand to:'.grey,
    '    - .overcast/files/app.01.bashrc'.grey,
    '    - .overcast/files/app.02.bashrc'.grey,
    '  $ overcast push app {instance}.bashrc .bashrc'.grey
  ]);
};
