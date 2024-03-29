// Generates Markdown-formatted API documentation from module/command help functions.

import { compileHelp } from '../src/cli.js';
import * as utils from '../src/utils.js';
import * as log from '../src/log.js';
import { setConfigDirs } from '../src/store.js';
import allCommands from '../src/commands/index.js';

setConfigDirs('/path/to/.overcast');

utils.eachObject(allCommands, ({ commands }, name) => {
  utils.eachObject(commands, (subcommand) => {
    if (subcommand.alias === true) {
      return;
    }
    const subcommandName = subcommand.name && name !== subcommand.name ?
      ' ' + subcommand.name : '';
    console.log('### overcast ' + name + subcommandName);
    log.br();
    console.log('```');
    compileHelp(subcommand, true);
    console.log('```');
    log.br();
  });
});
