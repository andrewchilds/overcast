var colors = require('colors');
var _ = require('lodash');
var utils = require('../utils');
var providers = require('../providers');
var list = require('./list');

exports.run = function (args) {
  utils.argShift(args, 'subcommand');

  if (args._[0] === 'help' && subcommands[args.subcommand].help) {
    console.log('');
    return subcommands[args.subcommand].help();
  } else if (args.subcommand && subcommands[args.subcommand]) {
    return subcommands[args.subcommand](args);
  } else {
    return utils.missingCommand(exports.help);
  }
};

var subcommands = {};

subcommands.get = function (args) {
  var clusters = utils.getClusters();
  utils.argShift(args, 'name');

  if (!args.name) {
    return utils.missingParameter('[instance|cluster|all]', subcommands.get.help);
  } else if (args._.length === 0) {
    return utils.missingParameter('[attr]', subcommands.get.help);
  }

  var instances = utils.findMatchingInstances(args.name);
  utils.handleInstanceOrClusterNotFound(instances, args);

  _.each(instances, function (instance) {
    _.each(args._, function (attr) {
      attr = attr.replace(/-/g, '_');
      if (instance[attr]) {
        console.log(instance[attr]);
      }
    });
  });
};

subcommands.get.help = function () {
  utils.printArray([
    'overcast instance get [instance|cluster|all] [attr...]',
    '  Returns the attribute(s) for the instance or cluster, one per line.'.grey,
    '',
    '  Examples:'.grey,
    '  $ overcast instance get app.01 ssh-port'.grey,
    '  > 22'.grey,
    '  $ overcast instance get app-cluster ip'.grey,
    '  > 127.0.0.1'.grey,
    '  > 127.0.0.2'.grey,
    '  > 127.0.0.3'.grey
  ]);
};

subcommands.import = function (args) {
  var clusters = utils.getClusters();
  utils.argShift(args, 'name');

  if (!args.cluster) {
    utils.grey('Using "default" cluster.');
    args.cluster = 'default';
  }

  var cluster = utils.sanitize(args.cluster);
  var ip = utils.sanitize(args.ip);

  if (!args.name) {
    return utils.missingParameter('[name]', subcommands.import.help);
  } else if (!ip) {
    return utils.missingParameter('--ip', subcommands.import.help);
  } else if (!clusters[cluster]) {
    return utils.die('No "' + cluster + '" cluster found.' + "\n" +
      'You can create one by running: ' +
      'overcast cluster create ' + cluster);
  } else if (clusters[cluster].instances[args.name]) {
    return utils.die('Instance "' + args.name + '" already exists.');
  }

  clusters[cluster].instances = clusters[cluster].instances || {};
  clusters[cluster].instances[args.name] = {
    ip: ip,
    name: args.name,
    ssh_port: utils.sanitize(args['ssh-port']) || '22',
    ssh_key: args['ssh-key'] || 'overcast.key',
    user: utils.sanitize(args.user) || 'root'
  };

  utils.saveClusters(clusters, function () {
    utils.success('Instance "' + args.name + '" (' + ip +
      ') has been imported to the "' + cluster + '" cluster.');
    list.run(args);
  });
};

subcommands.import.help = function () {
  utils.printArray([
    'overcast instance import [name] [options]',
    '  Imports an existing instance to a cluster.'.grey,
    '',
    '    Option               | Default'.grey,
    '    --cluster CLUSTER    | default'.grey,
    '    --ip IP              |'.grey,
    '    --ssh-port PORT      | 22 '.grey,
    '    --ssh-key PATH       | overcast.key'.grey,
    '    --user USERNAME      | root'.grey,
    '',
    '  Example:'.grey,
    '  $ overcast instance import app.01 --cluster app --ip 127.0.0.1 \\'.grey,
    '      --ssh-port 22222 --ssh-key $HOME/.ssh/id_rsa'.grey
  ]);
};

subcommands.list = function (args) {
  var clusters = utils.getClusters();
  var scope = (args._ && args._.length > 0) ? args._ : _.keys(clusters);

  _.each(clusters, function (cluster, clusterName) {
    if (_.indexOf(scope, clusterName) !== -1) {
      _.each(cluster.instances, function (instance) {
        console.log(instance.name);
      });
    }
  });
};

subcommands.list.help = function () {
  utils.printArray([
    'overcast instance list [cluster...]',
    '  Returns all instance names, one per line. Optionally limit to one or more clusters.'.grey,
    '',
    '  Examples:'.grey,
    '  $ overcast instance list'.grey,
    '  $ overcast instance list app-cluster db-cluster'.grey
  ]);
};

subcommands.remove = function (args) {
  var clusters = utils.getClusters();
  utils.argShift(args, 'name');

  if (!args.name) {
    return utils.missingParameter('[name]', subcommands.remove.help);
  }

  var deletedFrom;
  _.each(clusters, function (cluster, clusterName) {
    if (!deletedFrom && cluster.instances[args.name]) {
      delete cluster.instances[args.name];
      deletedFrom = clusterName;
    }
  });

  utils.saveClusters(clusters, function () {
    if (!deletedFrom) {
      return utils.die('No instance found with the name "' + args.name + '".');
    }

    utils.success('Instance "' + args.name +
      '" has been removed from the "' + deletedFrom + '" cluster.');
  });
};

subcommands.remove.help = function () {
  utils.printArray([
    'overcast instance remove [name]',
    '  Removes an instance from the index.'.grey,
    '  The server itself is not affected by this action.'.grey,
    '',
    '  Example:'.grey,
    '  $ overcast instance remove app.01'.grey
  ]);
};

subcommands.update = function (args) {
  var clusters = utils.getClusters();

  if (args.name) {
    utils.argShift(args, 'oldName');
  } else {
    utils.argShift(args, 'name');
  }

  if (!args.name) {
    return utils.missingParameter('[name]', subcommands.update.help);
  }

  var instance = utils.findFirstMatchingInstance(args.oldName || args.name);
  utils.handleInstanceNotFound(instance, args);

  var parentClusterName = utils.findClusterNameForInstance(instance);
  var messages = [];

  if (args.cluster) {
    if (!clusters[args.cluster]) {
      return utils.die('No "' + args.cluster + '" cluster found. Known clusters are: ' +
        _.keys(clusters).join(', ') + '.');
    }
    if (clusters[args.cluster].instances[instance.name]) {
      return utils.die('An instance named "' + instance.name + '" already exists in the "' + args.cluster + '" cluster.');
    }

    delete clusters[parentClusterName].instances[instance.name];
    clusters[args.cluster].instances[instance.name] = instance;
    parentClusterName = args.cluster;
    messages.push('Instance "' + instance.name + '" has been moved to the "' + args.cluster + '" cluster.');
  }

  if (args.oldName) {
    if (clusters[parentClusterName].instances[args.name]) {
      return utils.die('An instance named "' + args.name + '" already exists in the "' + parentClusterName + '" cluster.');
    }

    instance.name = args.name;
    delete clusters[parentClusterName].instances[args.oldName];
    clusters[parentClusterName].instances[args.name] = instance;
    messages.push('Instance "' + args.oldName + '" has been renamed to "' + args.name + '".');
  }

  _.each(['ip', 'ssh-key', 'ssh-port', 'user'], function (prop) {
    if (args[prop]) {
      clusters[parentClusterName].instances[instance.name][prop.replace('-', '_')] = args[prop];
      messages.push('Instance "' + prop + '" has been updated to "' + args[prop] + '".');
    }
  });

  utils.saveClusters(clusters, function () {
    _.each(messages, utils.success);
    list.run(args);
  });
};

subcommands.update.help = function () {
  utils.printArray([
    'overcast instance update [name] [options]',
    '  Update any instance property. Specifying --cluster will move the instance to'.grey,
    '  that cluster. Specifying --name will rename the instance.'.grey,
    '',
    '    Option               | Default'.grey,
    '    --name NAME          |'.grey,
    '    --cluster CLUSTER    |'.grey,
    '    --ip IP              |'.grey,
    '    --ssh-port PORT      |'.grey,
    '    --ssh-key PATH       |'.grey,
    '    --user USERNAME      |'.grey,
    '',
    '  Example:'.grey,
    '  $ overcast instance update app.01 --user differentuser --ssh-key /path/to/another/key'.grey
  ]);
};

exports.signatures = function () {
  return [
    '  overcast instance get [instance|cluster|all] [attr...]',
    '  overcast instance import [name] [options...]',
    '  overcast instance list [cluster...]',
    '  overcast instance remove [name]',
    '  overcast instance update [name] [options...]'
  ];
};

exports.help = function () {
  utils.printCommandHelp(subcommands);
};
