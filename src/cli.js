import minimist from 'minimist';
import * as utils from './utils.js';
import * as log from './log.js';
import allCommands from './commands/index.js';

const DEFAULT_COMMAND = 'aliases';

export function init() {
  utils.findConfig(() => {
    const argString = process.argv.slice(2).join(' ') || DEFAULT_COMMAND;

    if (utils.keyExists('overcast')) {
      execute(argString);
    } else {
      utils.createKey('overcast', () => {
        execute(argString);
      });
    }
  });
}

export function execute(argString) {
  if (!argString) {
    return utils.die('Nothing to execute (cli.execute).');
  }

  let argArray = utils.tokenize(argString);

  const args = minimist(argArray);
  utils.argShift(args, 'command');

  const command = allCommands[args.command] || allCommands.help;

  if ((args._[0] === 'help' || args.help) && command.help) {
    command.help(args);
  } else {
    if (command.commands) {
      const matchingCommand = findMatchingCommand(command.commands, args);
      if (matchingCommand) {
        run(matchingCommand, args);
      } else {
        missingCommand(command, args);
      }
    } else {
      utils.die(`${args.command} is missing commands array (cli.execute).`);
    }
  }
}

export function findMatchingCommand(commands, args) {
  const names = Object.keys(commands);
  if (names.length === 1) {
    return commands[names[0]];
  } else {
    utils.argShift(args, 'subcommand');
    return commands[args.subcommand];
  }
}

export function run(command, args, next) {
  let shortCircuit = false;
  args = args || { _: [] };

  if (args._[0] === 'help') {
    return compileHelp(command);
  }

  (command.required || []).forEach((required) => {
    if (utils.isString(required)) {
      required = { name: required };
    }

    const key = required.varName || required.name;
    if (required.greedy) {
      args[key] = args._.join(' ');
    } else if (required.raw) {
      args[key] = args._.shift();
    } else {
      utils.argShift(args, key);
    }

    if (!args[key] && !required.optional) {
      missingArgument(`[${required.name}]`, command);
      shortCircuit = true;
    }

    if (args[key]) {
      utils.forceArray(required.filters).forEach((filter) => {
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
}

export function missingArgument(name, command) {
  log.failure(`Missing ${name} argument.`);
  compileHelp(command);
  process.exit(1);
}

export function missingCommand({banner, commands}, args) {
  let exitCode = 0;
  if (args.subcommand && args.subcommand !== 'help' && args.command !== 'help') {
    log.failure('Missing or unknown command.');
    exitCode = 1;
  }

  if (banner) {
    printLines(banner);
  }

  if (Object.keys(commands).length > 1) {
    log.br();
    console.log(`overcast ${args.command} [command] help`);
    printLines('View extended help.', { color: 'grey', pad: 2 });
  }

  utils.eachObject(commands, ({ alias, usage, description }) => {
    if (alias === true) {
      return;
    }

    log.br();
    printLines(usage);
    printLines(description, { color: 'grey', pad: 2 });
  });

  process.exit(exitCode);
}

export function compileHelp(command, skipFirstLine) {
  ['usage', 'description', 'options', 'examples'].forEach((key) => {
    if (command[key]) {
      // Used by bin/docs:
      if (skipFirstLine !== true) {
        log.br();
      }
      skipFirstLine = false;
      if (key === 'options') {
        printCommandOptions(command.options);
      } else {
        log.faded(`${utils.capitalize(key)}:`);
        printLines(command[key], { pad: 2 });
      }
    }
  });
}

export function printCommandOptions(options) {
  let hasDefaults = false;
  const maxLength = utils.maxValueFromArray(options, (option) => {
    if (option.default) {
      hasDefaults = true;
    }
    return option.usage.length;
  }).usage.length + 4;
  let headline = 'Options:';
  if (hasDefaults) {
    headline = `${utils.padRight(headline, maxLength + 2)}Defaults:`;
  }
  log.faded(headline);
  options.forEach((option) => {
    console.log(`  ${utils.padRight(option.usage, maxLength)}${option.default || ''}`);
  });
}

export function printLines(strOrArray, options) {
  options = options || {};
  utils.forceArray(strOrArray).forEach((str) => {
    if (options.pad) {
      utils.times(options.pad, () => {
        str = ` ${str}`;
      });
    }
    if (options.color) {
      utils[options.color](str);
    } else {
      console.log(str);
    }
  });
}
