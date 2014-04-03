var _ = require('lodash');
var utils = require('../utils');
var commands = require('./index');

exports.run = function (args) {
  console.log(getCompletions().join(" "));
};

exports.signatures = function () {
  return [
    '  overcast completions'
  ];
};

exports.help = function () {
  utils.printArray([
    'overcast completions',
    '  Return an array of commands, cluster names, and instance names for use '.grey,
    '  in bash tab completion.'.grey,
    '',
    '  To enable tab completion in bash, add this to your .bash_profile:'.grey,
    '',
    '  _overcast_completions() {'.white,
    '    local cur=${COMP_WORDS[COMP_CWORD]}'.white,
    '    COMPREPLY=($(compgen -W "`overcast completions`" -- "$cur"))'.white,
    '    return 0'.white,
    '  }'.white,
    '  complete -F _overcast_completions overcast'.white
  ]);
};

function getCompletions() {
  var list = [];
  _.each(utils.getCommands(), function (command) {
    if (command.signatures) {
      _.each(command.signatures(), function (signature) {
        _.each(signature.split(' '), function (word) {
          if (word && word.length > 3 && word.charAt(0) !== '[') {
            list.push(word);
          }
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
