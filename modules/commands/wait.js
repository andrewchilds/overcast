import _ from 'lodash';
import utils from '../utils';

const commands = {};
export {commands};

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
  run: function (args) {
    utils.fixedWait(args.seconds);
  }
};
