var _ = require('lodash');
var utils = require('../utils');

exports.run = function (args) {
  _.each(utils.getClusters(), function (cluster) {
    _.each(cluster.instances, function (instance) {
      console.log('alias ssh.' + instance.name + '="ssh -i ' +
        utils.normalizeKeyPath(instance.ssh_key) + ' -p ' + instance.ssh_port +
        ' ' + instance.user + '@' + instance.ip + '"');
    });
  });
};

exports.signatures = function () {
  return [
    '  overcast aliases'
  ];
};

exports.help = function () {
  utils.printArray([
    'overcast aliases',
    '  Return a list of bash aliases for SSHing to your instances.'.grey,
    '',
    '  To use, add this to your .bash_profile:'.grey,
    '    test -f $HOME/.overcast_aliases && source $HOME/.overcast_aliases'.white,
    '',
    '  And then create the .overcast_aliases file:'.grey,
    '    overcast aliases > $HOME/.overcast_aliases'.white,
    '',
    '  Or to automatically refresh aliases in every new terminal window'.grey,
    '  (which will add a couple hundred milliseconds to your startup time),'.grey,
    '  add this to your .bash_profile:'.grey,
    '    overcast aliases > $HOME/.overcast_aliases'.white,
    '    source $HOME/.overcast_aliases'.white
  ]);
};
