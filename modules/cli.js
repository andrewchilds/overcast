var _ = require('lodash');
var utils = require('./utils');

exports.findMatchingCommand = function (command, args) {
  var names = _.keys(command.commands);
  if (names.length === 1) {
    return command.commands[names[0]];
  } else {
    utils.argShift(args, 'subcommand');
    return command.commands[args.subcommand];
  }
};

exports.hasSubCommands = function (command) {
  return _.keys(command.commands).length > 1;
};

exports.run = function (command, args, next) {
  args = args || { _: [] };

  if (args._[0] === 'help') {
    return exports.compileHelp(command);
  }

  _.each(command.required, function (required) {
    if (_.isString(required)) {
      required = { name: required };
    }

    utils.argShift(args, required.name);
    if (!args[required.name] && !required.optional) {
      return exports.missingArgument('[' + required.name + ']', command);
    }

    if (args[required.name]) {
      required.filters = utils.forceArray(required.filters);
      _.each(required.filters, function (filter) {
        if (_.isFunction(filter)) {
          filter(args[required.name], args);
        }
      });
    }
  });

  command.run(args, next);
  if (!command.async && _.isFunction(next)) {
    next();
  }
};

exports.missingArgument = function (name, command) {
  utils.red('Missing ' + name + ' argument.');
  exports.compileHelp(command);
  process.exit(1);
};

exports.missingCommand = function (command, args) {
  var exitCode = 0;
  if (args.subcommand && args.subcommand !== 'help' && args.command !== 'help') {
    utils.red('Missing or unknown command.');
    exitCode = 1;
  }

  if (command.banner) {
    exports.printLines(command.banner);
  }

  if (_.keys(command.commands).length > 1) {
    console.log('');
    console.log('overcast ' + args.command + ' [command] help');
    exports.printLines('View extended help.', { color: 'grey', pad: 2 });
  }

  _.each(command.commands, function (command) {
    console.log('');
    exports.printLines(command.usage);
    exports.printLines(command.description, { color: 'grey', pad: 2 });
  });

  process.exit(exitCode);
};

exports.compileHelp = function (command, skipFirstLine) {
  var firstLineSkipped = false;
  _.each(['usage', 'description', 'options', 'examples'], function (key) {
    if (command[key]) {
      // Used by bin/docs:
      if (skipFirstLine !== true && firstLineSkipped !== true) {
        firstLineSkipped = true;
        console.log('');
      }
      utils.grey(utils.capitalize(key) + ':');
      exports.printLines(command[key], { pad: 2 });
    }
  });
};

exports.printLines = function (strOrArray, options) {
  options = options || {};
  _.each(utils.forceArray(strOrArray), function (str) {
    if (!str) {
      return false;
    }
    if (options.pad) {
      _.times(options.pad, function () {
        str = ' ' + str;
      });
    }
    if (options.color) {
      utils[options.color](str);
    } else {
      console.log(str);
    }
  });
};
