var utils = require('../utils');
var instanceCommand = require('./instance');

exports.run = function (args) {
  args.command = 'instance';
  args._.unshift('import');
  instanceCommand.run(args);
};

exports.signatures = function () {
  return [
    '  overcast import [name] [options...]'
  ];
};

exports.help = function () {
  utils.printArray([
    'overcast import [name] [options...]',
    '  Imports an existing instance to a cluster.'.grey,
    '',
    '    Option               | Default'.grey,
    '    --cluster CLUSTER    | default'.grey,
    '    --ip IP              |'.grey,
    '    --ssh-port PORT      | 22 '.grey,
    '    --ssh-key PATH       | overcast.key'.grey,
    '    --user USERNAME      | root'.grey,
    '',
    '  Example:'.grey,
    '  $ overcast import app.01 --cluster app --ip 127.0.0.1 \\'.grey,
    '      --ssh-port 22222 --ssh-key $HOME/.ssh/id_rsa'.grey
  ]);
};
