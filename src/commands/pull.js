import * as utils from '../utils.js';
import * as scp from '../scp.js';
import * as rsync from '../rsync.js';

export const commands = {};

commands.pull = {
  name: 'pull',
  usage: 'overcast pull [instance|cluster|all] [source] [dest] [options...]',
  description: [
    'Pull a file or directory from an instance or cluster using scp by default,',
    'or using rsync if the --rsync flag is used. Source is absolute or relative',
    'to the home directory. Destination can be absolute or relative to the',
    '.overcast/files directory. Any reference to {instance} in the destination',
    'will be replaced with the instance name.'
  ],
  examples: [
    'Assuming instances "app.01" and "app.02", this will expand to:',
    '  - .overcast/files/app.01.bashrc',
    '  - .overcast/files/app.02.bashrc',
    '$ overcast pull app .bashrc {instance}.bashrc'
  ],
  required: [
    { name: 'instance|cluster|all', varName: 'name' },
    { name: 'source', raw: true },
    { name: 'dest', raw: true }
  ],
  options: [
    { usage: '--rsync', default: 'false' },
    { usage: '--user USERNAME' },
    { usage: '--password PASSWORD' }
  ],
  run: (args) => {
    args.direction = 'pull';

    if (utils.argIsTruthy(args.rsync)) {
      rsync.run(args);
    } else {
      scp.run(args);
    }
  }
};
