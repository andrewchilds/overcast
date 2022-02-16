import * as utils from '../utils.js';
import allCommands from './index.js';

export const commands = {};

commands.completions = {
  name: 'completions',
  usage: ['overcast completions'],
  description: [
    'Return an array of commands, cluster names, and instance names for use',
    'in bash tab completion.',
    '',
    'To enable tab completion in bash, add this to your .bash_profile:',
    '',
    '_overcast_completions() {',
    '  local cur=${COMP_WORDS[COMP_CWORD]}',
    '  COMPREPLY=($(compgen -W "`overcast completions`" -- "$cur"))',
    '  return 0',
    '}',
    'complete -F _overcast_completions overcast'
  ],
  run: (args) => {
    console.log(getCompletions().join(' '));
  }
};

function getCompletions() {
  const list = [];

  function pushWords(signature) {
    signature.split(' ').forEach((word) => {
      if (word && word.length > 3 && word.charAt(0) !== '[' && !list.includes(word)) {
        list.push(word);
      }
    });
  }

  utils.eachObject(allCommands, (command) => {
    if (command.commands) {
      utils.eachObject(command.commands, command => {
        command.usage.forEach((usage) => {
          pushWords(usage);
        });
      });
    }
  });

  const clusters = utils.getClusters();
  utils.eachObject(clusters, ({ instances }, clusterName) => {
    if (!list.includes(clusterName)) {
      list.push(clusterName);
    }
    Object.keys(instances).forEach((instanceName) => {
      if (!list.includes(instanceName)) {
        list.push(instanceName);
      }
    });
  });

  return list;
}
