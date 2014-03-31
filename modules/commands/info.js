var fs = require('fs');
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
      console.log('');
      utils.note('    ' + instance.name);
      _.each(instance, function (val, key) {
        if (key !== 'name') {
          utils.grey('      ' + key + ': ' + val);
        }
      });
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
