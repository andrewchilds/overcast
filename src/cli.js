import minimist from 'minimist';
import chalk from 'chalk';

import * as utils from './utils.js';
import * as store from './store.js';
import * as log from './log.js';
import allCommands from './commands/index.js';

const DEFAULT_COMMAND = 'info';

export function init(argString = '', nextFn = () => {}) {
  store.setArgString(argString || process.argv.slice(2).join(' ') || DEFAULT_COMMAND);
  utils.findConfig(() => {
    utils.createKeyIfMissing(() => {
      execute(store.getArgString(), nextFn);
    });
  });
}

export function execute(argString, nextFn = () => {}) {
  if (utils.isTestRun()) {
    log.alert(chalk.bgRed('TEST RUN: Be aware that some things are mocked for testing.'));
  }

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
        run(matchingCommand, args, nextFn);
      } else {
        missingCommand(command, args, nextFn);
      }
    } else {
      return utils.die(`${args.command} is missing commands array (cli.execute).`);
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

export function run(command, args, nextFn) {
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
      log.failure(`Missing [${required.name}] argument.`);
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
    missingArguments(command);
    return nextFn();
  }

  command.run(args, nextFn);
}

export function missingArguments(command) {
  compileHelp(command);
  if (utils.isTestRun()) {
    return false;
  } else {
    process.exit(1);
  }
}

export function missingCommand({banner, commands}, args, nextFn = () => {}) {
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
    log.log(`overcast ${args.command} [command] help`);
    printLines('View extended help.', { color: 'cyan', pad: 2 });
  }

  utils.eachObject(commands, ({ alias, usage, description }) => {
    if (alias === true) {
      return;
    }

    log.br();
    printLines(usage);
    printLines(description, { color: 'cyan', pad: 2 });
  });

  if (utils.isTestRun()) {
    nextFn();
  } else {
    process.exit(exitCode);
  }
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
        log.log(`${utils.capitalize(key)}:`);
        printLines(command[key], { color: 'cyan', pad: 2 });
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
  log.log(headline);
  options.forEach((option) => {
    log.log(`  ${utils.padRight(option.usage, maxLength)}${option.default || ''}`);
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
      log.log(chalk[options.color](str));
    } else {
      log.log(str);
    }
  });
}
