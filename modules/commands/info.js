var fs = require('fs');
var _ = require('lodash');
var utils = require('../utils');

exports.run = function (args) {
  var clusters = utils.getClusters();

  utils.grey('Using ' + utils.CONFIG_DIR + '/clusters.json');

  if (_.isEmpty(clusters)) {
    console.log('');
    utils.grey('No clusters found.');
    return false;
  }

  _.each(clusters, function (cluster, clusterName) {
    console.log('');
    console.log('  ' + clusterName);
    _.each(cluster.instances, function (instance) {
      utils.green('    ' + instance.name);
      utils.prettyPrint(instance, 6);
    });
  });
};

exports.signatures = function () {
  return [
    '  overcast info'
  ];
};

exports.help = function () {
  utils.printArray([
    'overcast info',
    '  Pretty-prints the complete clusters.json file, stored here:'.grey,
    ('  ' + utils.CONFIG_DIR + '/clusters.json').cyan
  ]);
};
