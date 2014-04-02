var _ = require('lodash');
var utils = require('../utils');

exports.run = function (args) {
  var clusters = utils.getClusters();

  utils.grey('Using ' + utils.CONFIG_DIR + '/clusters.json');

  if (_.isEmpty(clusters)) {
    console.log('');
    utils.note('No clusters found.');
    return false;
  }

  _.each(clusters, function (cluster, clusterName) {
    console.log('');
    console.log('  ' + clusterName);
    _.each(cluster.instances, function (instance) {
      var str = '    - ' + instance.name + ' (' + instance.ip + ':' + (instance.ssh_port || 22) + ')';
      utils.note(str);
    });
  });
};

exports.signatures = function () {
  return [
    '  overcast list'
  ];
};

exports.help = function () {
  utils.printArray([
    'overcast list',
    '  Short list of your cluster and instance definitions, stored here:'.grey,
    ('  ' + utils.CONFIG_DIR + '/clusters.json').cyan
  ]);
};
