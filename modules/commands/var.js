var colors = require('colors');
var _ = require('lodash');
var utils = require('../utils');

exports.signatures = function () {
  return utils.printSignatures(subcommands);
};

exports.help = function () {
  utils.printCommandHelp(subcommands);
};

exports.run = function (args) {
  utils.argShift(args, 'subcommand');
  utils.runSubcommand(args, subcommands, exports.help);
};

var subcommands = {};

subcommands.list = utils.module(function (exports) {
  exports.signature = 'overcast var list';

  exports.help = function () {
    utils.printArray([
      exports.signature,
      ('  List variables in ' + utils.VARIABLES_JSON + '.').grey
    ]);
  };

  exports.run = function (args) {
    var vars = utils.getVariables();
    utils.grey('Using ' + utils.VARIABLES_JSON);
    console.log('');
    _.each(vars, function (value, name) {
      console.log(name + ': ' + value.green);
    });
  };
});

subcommands.set = utils.module(function (exports) {
  exports.signature = 'overcast var set [name] [value]';

  exports.help = function () {
    utils.printArray([
      exports.signature,
      ('  Set a variable in ' + utils.VARIABLES_JSON + '.').grey,
      '',
      '  Examples:'.grey,
      '  $ overcast var set AWS_KEY myawskey12345'.grey,
      '  $ overcast var set MY_CUSTOM_VARIABLE_NAME foo'.grey
    ]);
  };

  exports.run = function (args) {
    utils.argShift(args, 'name');
    utils.argShift(args, 'value');

    if (!args.name) {
      return utils.missingParameter('[name]', exports.help);
    } else if (!args.value) {
      return utils.missingParameter('[value]', exports.help);
    }

    var vars = utils.getVariables();
    vars[args.name] = args.value;
    utils.saveVariables(vars);
  };
});

subcommands.get = utils.module(function (exports) {
  exports.signature = 'overcast var get [name]';

  exports.help = function () {
    utils.printArray([
      exports.signature,
      ('  Get a variable from ' + utils.VARIABLES_JSON + '.').grey,
      '',
      '  Examples:'.grey,
      '  $ overcast var get AWS_KEY'.grey,
      '  > myawskey12345'.grey,
      '  $ overcast var get MY_CUSTOM_VARIABLE_NAME'.grey,
      '  > foo'.grey
    ]);
  };

  exports.run = function (args) {
    utils.argShift(args, 'name');

    if (!args.name) {
      return utils.missingParameter('[name]', exports.help);
    }

    var vars = utils.getVariables();
    if (vars[args.name]) {
      console.log(vars[args.name]);
    } else {
      utils.die('Variable not found.');
    }
  };
});

subcommands.delete = utils.module(function (exports) {
  exports.signature = 'overcast var delete [name]';

  exports.help = function () {
    utils.printArray([
      exports.signature,
      ('  Delete a variable from ' + utils.VARIABLES_JSON + '.').grey,
      '',
      '  Examples:'.grey,
      '  $ overcast var delete MY_CUSTOM_VARIABLE_NAME'.grey
    ]);
  };

  exports.run = function (args) {
    utils.argShift(args, 'name');

    if (!args.name) {
      return utils.missingParameter('[name]', exports.help);
    }

    var vars = utils.getVariables();
    if (vars[args.name]) {
      delete vars[args.name];
      utils.saveVariables(vars);
    } else {
      utils.grey('Variable not found, no action taken.');
    }
  };
});
