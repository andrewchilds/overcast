var _ = require('lodash');
var utils = require('../utils');
var scp = require('../scp');
var rsync = require('../rsync');

exports.run = function (args) {
  utils.argShift(args, 'name');
  args.source = args._.shift();
  args.dest = args._.shift();
  args.direction = 'pull';

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
    '  overcast pull [instance|cluster|all] [source] [dest] [options]'
  ];
};

exports.help = function () {
  utils.printArray([
    'overcast pull [instance|cluster|all] [source] [dest]',
    '  Pull a file or directory from an instance or cluster using scp by default,'.grey,
    '  or using rsync if the --rsync flag is used. Source is absolute or relative'.grey,
    '  to the home directory. Destination can be absolute or relative to the'.grey,
    '  .overcast/files directory. Any reference to {instance} in the destination'.grey,
    '  will be replaced with the instance name.'.grey,
    '',
    '    Option         | Default'.grey,
    '    --rsync        | false'.grey,
    '    --user NAME    |'.grey,
    '',
    '  Example:'.grey,
    '  Assuming instances "app.01" and "app.02", this will expand to:'.grey,
    '    - .overcast/files/app.01.bashrc'.grey,
    '    - .overcast/files/app.02.bashrc'.grey,
    '  $ overcast pull app .bashrc {instance}.bashrc'.grey
  ]);
};
