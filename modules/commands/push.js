var _ = require('lodash');
var utils = require('../utils');
var scp = require('../scp');

exports.run = function (args) {
  utils.argShift(args, 'name');
  args.source = args._.shift();
  args.dest = args._.shift();
  args.direction = 'push';

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
    '  overcast push [instance|cluster|all] [source] [dest]'
  ];
};

exports.help = function (args) {
  utils.printArray([
    'overcast push [instance|cluster|all] [source] [dest]',
    '  Push a file or directory to an instance or cluster using scp. Source can be'.grey,
    '  absolute, or relative to the .overcast/files directory. Destination is absolute.'.grey,
    '',
    '  Any reference to {instance} in the source will be replaced with the instance name.'.grey,
    '',
    '  Example:'.grey,
    '  Assuming instances "app.01" and "app.02", this will expand to:'.grey,
    '    - .overcast/files/nginx/app.01.myapp.conf'.grey,
    '    - .overcast/files/nginx/app.02.myapp.conf'.grey,
    '  $ overcast push app nginx/{instance}.myapp.conf /etc/nginx/sites-enabled/myapp.conf'.grey
  ]);
};
