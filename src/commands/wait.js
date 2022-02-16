import * as utils from '../utils.js';
import * as log from '../log.js';

export const commands = {};

commands.wait = {
  name: 'wait',
  usage: ['overcast wait [seconds]'],
  description: [
    'Show a progress bar for a specified number of seconds.'
  ],
  examples: [
    '$ overcast wait 30'
  ],
  required: ['seconds'],
  run: ({ seconds }) => {
    utils.fixedWait(seconds, () => {
      log.success('Done!');
    });
  }
};
