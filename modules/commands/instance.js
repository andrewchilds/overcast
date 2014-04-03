var colors = require('colors');
var _ = require('lodash');
var utils = require('../utils');
var providers = require('../providers');
var list = require('./list');

exports.run = function (args) {
  utils.argShift(args, 'subcommand');

  if (args.subcommand && subcommands[args.subcommand]) {
    subcommands[args.subcommand](args);
  } else {
    utils.red('Missing or unknown subcommand.');
    exports.help(args);
  }
};

var subcommands = {};

subcommands.create = function (args) {
  var clusters = utils.getClusters();
  utils.argShift(args, 'name');

  args.cluster = utils.sanitize(args.cluster);
  args.provider = utils.sanitize(args.provider) || 'digitalocean';

  if (!args.name) {
    utils.red('Missing [name] parameter.');
    return exports.help(args);
  } else if (!args.cluster) {
    utils.red('Missing --cluster parameter.');
    return exports.help(args);
  } else if (!clusters[args.cluster]) {
    utils.die('No "' + args.cluster + '" cluster found. Known clusters are: ' +
      _.keys(clusters).join(', ') + '.');
  } else if (!args.provider || !providers[args.provider]) {
    utils.die('Missing --provider parameter. Supported providers are: ' +
      _.keys(providers).join(', ') + '.');
  } else if (clusters[args.cluster].instances[args.name]) {
    utils.red('Instance "' + args.name + '" already exists.');
    return list.run(args);
  }

  providers[args.provider].create(args);
};

subcommands.import = function (args) {
  var clusters = utils.getClusters();
  utils.argShift(args, 'name');

  var cluster = utils.sanitize(args.cluster);
  var ip = utils.sanitize(args.ip);
  var user = utils.sanitize(args.user) || 'root';
  var ssh_port = utils.sanitize(args['ssh-port']) || '22';
  var ssh_key = args['ssh-key'] || utils.CONFIG_DIR + '/keys/overcast.key';

  if (!args.name) {
    utils.red('Missing [name] parameter.');
    return exports.help(args);
  } else if (!cluster) {
    utils.red('Missing --cluster parameter.');
    return exports.help(args);
  } else if (!ip) {
    utils.red('Missing --ip parameter.');
    return exports.help(args);
  } else if (!clusters[cluster]) {
    utils.die('No "' + cluster + '" cluster found.' + "\n" +
      'You can create one by running: ' +
      'overcast cluster create ' + cluster);
  }

  clusters[cluster].instances = clusters[cluster].instances || {};
  clusters[cluster].instances[args.name] = {
    ip: ip,
    name: args.name,
    ssh_port: ssh_port,
    ssh_key: ssh_key,
    user: user
  };

  utils.saveClusters(clusters, function () {
    utils.success('Instance "' + args.name + '" (' + ip +
      ') has been imported to the "' + cluster + '" cluster.');
    list.run(args);
  });
};

subcommands.remove = function (args) {
  var clusters = utils.getClusters();
  utils.argShift(args, 'name');

  if (!args.name) {
    utils.die('Missing [name] parameter.');
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
      utils.die('No instance found with the name "' + args.name + '".');
    } else {
      utils.success('Instance "' + args.name +
        '" has been deleted from the "' + deletedFrom + '" cluster.');
    }
  });
};

subcommands.update = function (args) {
  var clusters = utils.getClusters();

  if (args.name) {
    utils.argShift(args, 'oldName');
  } else {
    utils.argShift(args, 'name');
  }

  var instance = utils.findOnlyMatchingInstance(args.oldName || args.name);
  utils.handleEmptyInstances(instance, args);

  var parentClusterName = utils.findClusterNameForInstance(instance);
  var messages = [];

  if (args.cluster) {
    if (!clusters[args.cluster]) {
      utils.die('No "' + args.cluster + '" cluster found. Known clusters are: ' +
        _.keys(clusters).join(', ') + '.');
    }
    if (clusters[args.cluster].instances[instance.name]) {
      utils.die('An instance named "' + instance.name + '" already exists in the "' + args.cluster + '" cluster.');
    }

    delete clusters[parentClusterName].instances[instance.name];
    clusters[args.cluster].instances[instance.name] = instance;
    parentClusterName = args.cluster;
    messages.push('Instance "' + instance.name + '" has been moved to the "' + args.cluster + '" cluster.');
  }

  if (args.oldName) {
    if (clusters[parentClusterName].instances[args.name]) {
      utils.die('An instance named "' + args.name + '" already exists in the "' + parentClusterName + '" cluster.');
    }

    instance.name = args.name;
    delete clusters[parentClusterName].instances[args.oldName];
    clusters[parentClusterName].instances[args.name] = instance;
    messages.push('Instance "' + args.oldName + '" has been renamed to "' + args.name + '".');
  }

  _.each(['ip', 'ssh-key', 'ssh-port', 'user'], function (prop) {
    if (args[prop]) {
      clusters[parentClusterName].instances[args.name][prop.replace('-', '_')] = args[prop];
      messages.push('Instance "' + prop + '" has been updated to "' + args[prop] + '".');
    }
  });

  utils.saveClusters(clusters, function () {
    _.each(messages, utils.success);
    list.run(args);
  });
};

exports.signatures = function () {
  return [
    '  overcast instance create [name] [options]',
    '  overcast instance import [name] [options]',
    '  overcast instance remove [name]',
    '  overcast instance update [name] [options]'
  ];
};

exports.help = function () {
  utils.printArray([
    'overcast instance create [name] [options]',
    '  Creates a new instance on a hosting provider. You\'ll need to add your API'.grey,
    '  credentials to the .overcast/variables.json file for this to work.'.grey,
    '  See the .overcast/example.variables.json file for reference.'.grey,
    '',
    '  The instance will start out using the auto-generated SSH key found here:'.grey,
    ('  ' + utils.CONFIG_DIR + '/keys/overcast.key.pub').cyan,
    '',
    '  You can specify region, image, and size of the droplet using -id or -slug.'.grey,
    '  You can also specify an image or snapshot using --image-name.'.grey,
    '',
    '    Option               | Default'.grey,
    '    --cluster=CLUSTER    |'.grey,
    '    --provider=NAME      | digitalocean'.grey,
    '    --ssh-port=PORT      | 22'.grey,
    '    --region-slug=NAME   | nyc2'.grey,
    '    --region-id=ID       |'.grey,
    '    --image-slug=NAME    | ubuntu-12-04-x64'.grey,
    '    --image-id=ID        |'.grey,
    '    --image-name=NAME    |'.grey,
    '    --size-slug=NAME     | 512mb'.grey,
    '    --size-id=ID         |'.grey,
    '',
    '  Example:'.grey,
    '  $ overcast instance create db.01 --cluster=db --host=digitalocean'.grey,
    '',
    'overcast instance import [name] [options]',
    '  Imports an existing instance to a cluster.'.grey,
    '',
    '    Option               | Default'.grey,
    '    --cluster=CLUSTER    |'.grey,
    '    --ip=IP              |'.grey,
    '    --ssh-port=PORT      | 22 '.grey,
    '    --ssh-key=PATH       | .overcast/keys/overcast.key'.grey,
    '    --user=USERNAME      | root'.grey,
    '',
    '  Example:'.grey,
    '  $ overcast instance import app.01 --cluster=app --ip=127.0.0.1 \\'.grey,
    '      --ssh-port=22222 --ssh-key=$HOME/.ssh/id_rsa'.grey,
    '',
    'overcast instance update [name] [options]',
    '  Update any instance property. Specifying --cluster will move the instance to'.grey,
    '  that cluster. Specifying --name will rename the instance.'.grey,
    '',
    '    Option               | Default'.grey,
    '    --name=NAME          |'.grey,
    '    --cluster=CLUSTER    |'.grey,
    '    --ip=IP              |'.grey,
    '    --ssh-port=PORT      | 22 '.grey,
    '    --ssh-key=PATH       | .overcast/keys/overcast.key'.grey,
    '    --user=USERNAME      | root'.grey,
    '',
    '  Example:'.grey,
    '  $ overcast instance update app.01 --user=differentuser --ssh-key=/path/to/another/key'.grey,
    '',
    'overcast instance remove [name]',
    '  Removes an instance from the index.'.grey,
    '  The server itself is not affected by this action.'.grey,
    '',
    '  Example:'.grey,
    '  $ overcast instance remove app.01'.grey
  ]);
};
