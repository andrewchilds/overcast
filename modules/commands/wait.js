import _ from 'lodash';
import * as utils from '../utils.js';

const commands = {};
export default commands;

commands.wait = {
  name: 'wait',
  usage: 'overcast wait [seconds]',
  description: [
    'Show a progress bar for a specified number of seconds.'
  ],
  examples: [
    '$ overcast wait 30'
  ],
  required: ['seconds'],
  run: function({seconds}) {
    utils.fixedWait(seconds);
  }
};
