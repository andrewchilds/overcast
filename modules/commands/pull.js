var _ = require('lodash');
var utils = require('../utils');
var scp = require('../scp');

exports.run = function (args) {
  utils.argShift(args, 'name');
  args.source = args._.shift();
  args.dest = args._.shift();
  args.direction = 'pull';

  if (!args.name) {
    utils.missingParameter('[instance|cluster|all]', exports.help);
  } else if (!args.source) {
    utils.missingParameter('[source]', exports.help);
  } else if (!args.dest) {
    utils.missingParameter('[dest]', exports.help);
  }

  scp(args);
};

exports.signatures = function () {
  return [
    '  overcast pull [instance|cluster|all] [source] [dest]'
  ];
};

exports.help = function () {
  utils.printArray([
    'overcast pull [instance|cluster|all] [source] [dest]',
    '  Pull a file or directory from an instance or cluster using scp. Source is absolute.'.grey,
    '  Destination can be absolute or relative to the .overcast/files directory. '.grey,
    '',
    '  Any reference to {instance} in the destination will be replaced with the instance name.'.grey,
    '',
    '    Option'.grey,
    '    --user NAME'.grey,
    '',
    '  Example:'.grey,
    '  Assuming instances "app.01" and "app.02", this will expand to:'.grey,
    '    - .overcast/files/nginx/app.01.myapp.conf'.grey,
    '    - .overcast/files/nginx/app.02.myapp.conf'.grey,
    '  $ overcast pull app /etc/nginx/sites-enabled/myapp.conf nginx/{instance}.myapp.conf'.grey
  ]);
};
