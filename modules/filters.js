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

  if (clusters[name]) {
    utils.die('"' + name + '" is already in use as a cluster name.');
    return false;
  } else if (name === 'all') {
    utils.die('"all" is a special keyword that cannot be used for instance names.');
    return false;
  } else if (name.indexOf('*') !== -1) {
    utils.die('Instance names cannot include asterisk characters.');
    return false;
  } else if (utils.findMatchingInstancesByInstanceName(name).length > 0) {
    utils.die('Instance "' + name + '" already exists.');
    return false;
  }
};

exports.shouldBeNewKey = function (name, args) {
  if (utils.keyExists(name)) {
    utils.grey('The key "' + name + '" already exists, no action taken.');
    return false;
  }
};

exports.shouldBeExistingKey = function (name, args) {
  if (!utils.keyExists(name)) {
    utils.grey('The key "' + name + '" was not found, no action taken.');
    return false;
  }
};

exports.shouldBeAWS = function (name, args) {
  if (!args.instance || !args.instance.aws) {
    utils.die('This instance has no AWS metadata attached.');
    return false;
  }
};

exports.shouldBeDigitalOcean = function (name, args) {
  if (!args.instance || !args.instance.digitalocean) {
    utils.red('This instance has no DigitalOcean metadata attached.');
    utils.red('Run this command and then try again:');
    utils.die('overcast digitalocean sync "' + args.instance.name + '"');
    return false;
  }
};

exports.shouldBeVirtualbox = function (name, args) {
  if (!args.instance || !args.instance.virtualbox) {
    utils.die('This instance has no Virtualbox metadata attached.');
    return false;
  }
};

exports.shouldBeLinode = function (name, args) {
  if (!args.instance || !args.instance.linode) {
    utils.red('This instance has no Linode metadata attached.');
    utils.red('Run this command and then try again:');
    utils.die('overcast linode sync "' + args.instance.name + '"');
    return false;
  }
};
