var fs = require('fs');
var _ = require('lodash');
var minimist = require('minimist');
var utils = require('./utils');

exports.init = () => {
  utils.findConfig(() => {
    if (utils.keyExists('overcast')) {
      exports.execute();
    } else {
      utils.createKey('overcast', () => {
        exports.execute();
      });
    }
  });
};

exports.execute = (argString) => {
  var argArray = process.argv.slice(2);
  if (argString && utils.isString(argString)) {
    argArray = utils.tokenize(argString);
  }

  var args = minimist(argArray);
  utils.argShift(args, 'command');

  var file = utils.escapeWindowsPath(__dirname + '/commands/' + args.command + '.js');
  var command;
  if (fs.existsSync(file)) {
    command = require(file);
  } else {
    command = require('./commands/help');
  }

  if ((args._[0] === 'help' || args.help) && command.help) {
    command.help(args);
  } else {
    if (command.commands) {
      var matchingCommand = exports.findMatchingCommand(command, args);
      if (matchingCommand) {
        exports.run(matchingCommand, args);
      } else {
        exports.missingCommand(command, args);
      }
    } else {
      command.run(args);
    }
  }
};

exports.findMatchingCommand = (command, args) => {
  var names = Object.keys(command.commands);
  if (names.length === 1) {
    return command.commands[names[0]];
  } else {
    utils.argShift(args, 'subcommand');
    return command.commands[args.subcommand];
  }
};

exports.run = (command, args, next) => {
  var shortCircuit = false;
  args = args || { _: [] };

  if (args._[0] === 'help') {
    return exports.compileHelp(command);
  }

  utils.each(command.required, (required) => {
    if (utils.isString(required)) {
      required = { name: required };
    }

    var key = required.varName || required.name;
    if (required.greedy) {
      args[key] = args._.join(' ');
    } else if (required.raw) {
      args[key] = args._.shift();
    } else {
      utils.argShift(args, key);
    }

    if (!args[key] && !required.optional) {
      exports.missingArgument('[' + required.name + ']', command);
      shortCircuit = true;
    }

    if (args[key]) {
      required.filters = utils.forceArray(required.filters);
      utils.each(required.filters, (filter) => {
        if (utils.isFunction(filter)) {
          // Allow filters to short-circuit a command run without
          // needing process.exit.
          if (filter(args[key], args) === false) {
            shortCircuit = true;
            return false;
          }
        }
      });
    }
  });

  if (shortCircuit) {
    return false;
  }

  command.run(args, next);
  if (!command.async && utils.isFunction(next)) {
    next();
  }
};

exports.missingArgument = (name, command) => {
  utils.red('Missing ' + name + ' argument.');
  exports.compileHelp(command);
  process.exit(1);
};

exports.missingCommand = (command, args) => {
  var exitCode = 0;
  if (args.subcommand && args.subcommand !== 'help' && args.command !== 'help') {
    utils.red('Missing or unknown command.');
    exitCode = 1;
  }

  if (command.banner) {
    exports.printLines(command.banner);
  }

  if (Object.keys(command.commands).length > 1) {
    console.log('');
    console.log('overcast ' + args.command + ' [command] help');
    exports.printLines('View extended help.', { color: 'grey', pad: 2 });
  }

  utils.each(command.commands, (command) => {
    if (command.alias === true) {
      return;
    }

    console.log('');
    exports.printLines(command.usage);
    exports.printLines(command.description, { color: 'grey', pad: 2 });
  });

  process.exit(exitCode);
};

exports.compileHelp = (command, skipFirstLine) => {
  ['usage', 'description', 'options', 'examples'].forEach((key) => {
    if (command[key]) {
      // Used by bin/docs:
      if (skipFirstLine !== true) {
        console.log('');
      }
      skipFirstLine = false;
      if (key === 'options') {
        exports.printCommandOptions(command.options);
      } else {
        utils.grey(utils.capitalize(key) + ':');
        exports.printLines(command[key], { pad: 2 });
      }
    }
  });
};

exports.printCommandOptions = (options) => {
  var hasDefaults = false;
  var maxLength = _.max(options, (option) => {
    if (option.default) {
      hasDefaults = true;
    }
    return option.usage.length;
  }).usage.length + 4;
  var headline = 'Options:';
  if (hasDefaults) {
    headline = utils.padRight(headline, maxLength + 2) + 'Defaults:';
  }
  utils.grey(headline);
  options.forEach((option) => {
    console.log('  ' + utils.padRight(option.usage, maxLength) + (option.default || ''));
  });
};

exports.printLines = (strOrArray, options) => {
  options = options || {};
  utils.forceArray(strOrArray).forEach((str) => {
    if (options.pad) {
      utils.times(options.pad, () => {
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
