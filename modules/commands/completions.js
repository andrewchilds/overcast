var _ = require('lodash');
var utils = require('../utils');

var commands = {};
exports.commands = commands;

commands.completions = {
  name: 'completions',
  usage: 'overcast completions',
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
  run: function (args) {
    console.log(getCompletions().join(" "));
  }
};

function getCompletions() {
  var list = [];

  function pushWords(signature) {
    _.each(signature.split(' '), function (word) {
      if (word && word.length > 3 && word.charAt(0) !== '[') {
        list.push(word);
      }
    });
  }

  _.each(utils.getCommands(), function (command) {
    if (command.signatures) {
      _.each(command.signatures(), function (signature) {
        pushWords(signature);
      });
    } else if (command.commands) {
      _.each(command.commands, function (command) {
        command.usage = utils.forceArray(command.usage);
        _.each(command.usage, function (usage) {
          pushWords(usage);
        });
      });
    }
  });

  var clusters = utils.getClusters();
  _.each(clusters, function (cluster, clusterName) {
    list.push(clusterName);
    _.each(cluster.instances, function (instance, instanceName) {
      list.push(instanceName);
    });
  });

  return _.unique(list);
}
