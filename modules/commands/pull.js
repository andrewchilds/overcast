var _ = require('lodash');
var utils = require('../utils');
var scp = require('../scp');

exports.run = function (args) {
  utils.argShift(args, 'name');
  args.source = args._.shift();
  args.dest = args._.shift();
  args.direction = 'pull';

  exports.validate(args);

  scp(args);
};

exports.validate = function (args) {
  if (!args.name) {
    utils.red('Missing [name] parameter.');
    return exports.help(args);
  } else if (!args.source) {
    utils.red('Missing [source] parameter.');
    return exports.help(args);
  } else if (!args.dest) {
    utils.red('Missing [dest] parameter.');
    return exports.help(args);
  }
};

exports.signatures = function () {
  return [
    '  overcast pull [instance|cluster|all] [source] [dest]'
  ];
};

exports.help = function (args) {
  utils.printArray([
    'overcast pull [instance|cluster|all] [source] [dest]',
    '  Pull a file or directory from an instance or cluster using scp. Source is absolute.'.grey,
    '  Destination can be absolute or relative to the .overcast/files directory. '.grey,
    '',
    '  Any reference to {instance} in the destination will be replaced with the instance name.'.grey,
    '',
    '  Example:'.grey,
    '  Assuming instances "app.01" and "app.02", this will expand to:'.grey,
    '    - .overcast/files/nginx/app.01.myapp.conf'.grey,
    '    - .overcast/files/nginx/app.02.myapp.conf'.grey,
    '  $ overcast pull app /etc/nginx/sites-enabled/myapp.conf nginx/{instance}.myapp.conf'.grey
  ]);
};
