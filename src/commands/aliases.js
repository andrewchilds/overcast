import * as utils from '../utils.js';
import { log, alert } from '../log.js';

export const commands = {};

commands.aliases = {
  name: 'aliases',
  usage: ['overcast aliases'],
  description: [
    'Return a list of bash aliases for SSHing to your instances.',
    '',
    'To use, add this to your .bash_profile:',
    '  test -f $HOME/.overcast_aliases && source $HOME/.overcast_aliases',
    '',
    'And then create the .overcast_aliases file:',
    '  overcast aliases > $HOME/.overcast_aliases',
    '',
    'Or to automatically refresh aliases in every new terminal window',
    '(which will add a couple hundred milliseconds to your startup time),',
    'add this to your .bash_profile:',
    '  overcast aliases > $HOME/.overcast_aliases',
    '  source $HOME/.overcast_aliases'
  ],
  run: (args, nextFn) => {
    const clusters = utils.getClusters();

    if (Object.keys(clusters).length > 0) {
      utils.eachObject(clusters, ({ instances }) => {
        utils.eachObject(instances, instance => {
          log(`alias ssh.${instance.name}="ssh -i ${utils.normalizeKeyPath(instance.ssh_key)} -p ${instance.ssh_port} ${instance.user}@${instance.ip}"`);
        });
      });
    } else {
      log('# No overcast clusters defined');
    }

    nextFn();
  }
};
