import fs from 'fs';
import * as utils from '../utils.js';
import * as log from '../log.js';

export const commands = {};

commands.init = {
  name: 'init',
  usage: 'overcast init',
  description: [
    'Create an .overcast config directory in the current working directory.',
    'No action taken if one already exists.'
  ],
  run: (args) => {
    const cwd = process.cwd();

    if (fs.existsSync(`${cwd}/.overcast`)) {
      log.alert('.overcast directory already exists here.');
    } else {
      utils.initOvercastDir(cwd);
    }
  }
};
