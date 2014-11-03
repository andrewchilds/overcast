var _ = require('lodash');
var utils = require('../utils');
var ssh = require('../ssh');

exports.run = function (args) {
  utils.argShift(args, 'name');
  args.var_filename = args._.shift();
  utils.argShift(args, 'var_name');
  args.var_value = args._.shift();

  if (!args.name) {
    return utils.missingParameter('[instance|cluster|all]', exports.help);
  } else if (!args.var_filename) {
    return utils.missingParameter('[filename]', exports.help);
  } else if (!args.var_name) {
    return utils.missingParameter('[key]', exports.help);
  } else if (!args.var_value) {
    return utils.missingParameter('[value]', exports.help);
  }

  args._ = ['set_script_var'];
  args.env = {
    VAR_FILENAME: args.var_filename,
    VAR_NAME: args.var_name,
    VAR_VALUE: args.var_value
  };

  ssh.run(args);
};

exports.signatures = function () {
  return [
    '  overcast scriptvar [instance|cluster|all] [filename] [key] [value]'
  ];
};

exports.help = function () {
  utils.printArray([
    'overcast scriptvar [instance|cluster|all] [filename] [key] [value]',
    '  Set a named variable in a remote file on an instance or cluster.'.grey,
    '',
    '    Option                          | Default'.grey,
    '    --user NAME                     |'.grey,
    '    --continueOnError               | false'.grey,
    '    --mr --machine-readable         | false'.grey,
    '    --parallel -p                   | false'.grey,
    '',
    '  Example'.grey,
    '  $ overcast scriptvar app-01 /path/to/file.conf MY_API_TOKEN abc123'.grey
  ]);
};
