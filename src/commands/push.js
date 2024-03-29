import * as utils from '../utils.js';
import * as scp from '../scp.js';
import * as rsync from '../rsync.js';
import { findMatchingInstances } from '../filters.js';

export const commands = {};

commands.push = {
  name: 'push',
  usage: ['overcast push [instance|cluster|all] [source] [dest] [options...]'],
  description: [
    'Push a file or directory to an instance or cluster using scp by default,',
    'or rsync if the --rsync flag is used. Source can be absolute or relative',
    'to the .overcast/files directory. Destination can be absolute or relative',
    'to the home directory. Any reference to {instance} in the source will be',
    'replaced with the instance name. The --exclude flag only works with rsync.'
  ],
  examples: [
    'Assuming instances "app.01" and "app.02", this will expand to:',
    '  - .overcast/files/app.01.bashrc',
    '  - .overcast/files/app.02.bashrc',
    '$ overcast push app {instance}.bashrc .bashrc'
  ],
  required: [
    { name: 'instance|cluster|all', varName: 'name', filters: findMatchingInstances },
    { name: 'source', raw: true },
    { name: 'dest', raw: true }
  ],
  options: [
    { usage: '--rsync', default: 'false' },
    { usage: '--user USERNAME' },
    { usage: '--password PASSWORD' },
    { usage: '--exclude FILE_OR_DIRECTORY' }
  ],
  run: (args, nextFn) => {
    args.direction = 'push';

    if (utils.argIsTruthy(args.rsync)) {
      rsync.run(args, nextFn);
    } else {
      scp.run(args, nextFn);
    }
  }
};
