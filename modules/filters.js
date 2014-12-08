var utils = require('./utils');

exports.findMatchingInstances = function (name, args) {
  args.instances = utils.findMatchingInstances(name);

  if (args.instances.length === 0) {
    utils.dieWithList('No instances found matching "' + name + '".');
    return false;
  }
};

exports.findFirstMatchingInstance = function (name, args) {
  args.instance = utils.findFirstMatchingInstance(name);

  if (!args.instance) {
    utils.dieWithList('No instance found matching "' + name + '".');
    return false;
  }
};

exports.findMatchingCluster = function (name, args) {
  var clusters = utils.getClusters();
  args.cluster = clusters[name];

  if (!args.cluster) {
    utils.dieWithList('No clusters found matching "' + name + '".');
    return false;
  }
};

exports.shouldBeNewCluster = function (name, args) {
  var clusters = utils.getClusters();

  if (clusters[name]) {
    utils.grey('The cluster "' + name + '" already exists, no action taken.');
    return false;
  }
};

exports.shouldBeNewInstance = function (name, args) {
  var clusters = utils.getClusters();

  if (!args.cluster) {
    utils.grey('Using "default" cluster.');
    args.cluster = 'default';
  }

  if (!clusters[args.cluster]) {
    clusters[args.cluster] = { instances: {} };
    utils.saveClusters(clusters, function () {
      utils.success('Cluster "' + args.name + '" has been created.');
    });
  } else if (clusters[args.cluster].instances[name]) {
    utils.die('Instance "' + name + '" already exists.');
    return false;
  }
};
