import * as utils from '../utils.js';
import allCommands from './index.js';

export const commands = {};

commands.help = {
  name: 'help',
  usage: 'overcast help',
  description: [
    'Provides help about Overcast and specific commands.'
  ],
  run: function (args) {
    const signatures = [];
    let row = ' ';
    utils.each(allCommands, (command, name) => {
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
};
