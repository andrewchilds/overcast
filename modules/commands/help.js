import fs from 'fs';
import * as utils from '../utils.js';
import * as cli from '../cli.js';

export function run(args) {
  if (!args.subcommand) {
    utils.argShift(args, 'subcommand');
  }

  let moduleName;
  if (args.command === 'help' && args.subcommand) {
    moduleName = args.subcommand;
  } else if (args.command !== 'help') {
    moduleName = args.command;
  }

  if (moduleName) {
    if (fs.existsSync(`${__dirname}/${moduleName}.js`)) {
      const module = require(`./${moduleName}`);
      if (module && module.help) {
        return module.help();
      } else if (module && module.commands) {
        return cli.missingCommand(module, args);
      }
    } else {
      utils.unknownCommand();
    }
  }

  help();
}

export function help() {
  const signatures = [];
  let row = ' ';
  utils.each(utils.getCommands(), (command, name) => {
    if (name !== 'help' && (command.signatures || command.commands)) {
      if (row.length > 58) {
        signatures.push(row);
        row = ' ';
      }
      row += ` ${name}`;
    }
  });
  signatures.push(row);

  utils.printArray([
    (`Overcast v${utils.VERSION}`),
    '',
    'Source code, issues, pull requests:',
    '  https://github.com/andrewchilds/overcast',
    '',
    'Usage:',
    '  overcast [command] [options...]',
    '',
    'Help:',
    '  overcast help',
    '  overcast help [command]',
    '  overcast [command] help',
    '',
    'Commands:'
  ]);
  utils.printArray(signatures);
  utils.printArray([
    '',
    'Config directory:',
    `  ${utils.CONFIG_DIR}`
  ]);
}
