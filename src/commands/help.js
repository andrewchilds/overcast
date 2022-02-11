import chalk from 'chalk';
import * as utils from '../utils.js';
import allCommands from './index.js';

export const commands = {};

commands.help = {
  name: 'help',
  usage: 'overcast help',
  description: [
    'Provides help about Overcast and specific commands.'
  ],
  run: (args) => {
    const signatures = [];
    let row = ' ';
    utils.eachObject(allCommands, (command, name) => {
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
      (`This is Overcast v${utils.VERSION}.`),
      '',
      chalk.grey('Source code, issues, pull requests:'),
      chalk.cyan('  https://github.com/andrewchilds/overcast'),
      '',
      chalk.grey('Usage:'),
      '  overcast [command] [options...]',
      '',
      chalk.grey('Help:'),
      '  overcast help',
      '  overcast help [command]',
      '  overcast [command] help',
      '',
      chalk.grey('Commands:')
    ]);
    utils.printArray(signatures);
    utils.printArray([
      '',
      'Config directory:',
      chalk.cyan(`  ${utils.CONFIG_DIR}`)
    ]);
  }
};
