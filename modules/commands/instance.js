var colors = require('colors');
var _ = require('lodash');
var utils = require('../utils');
var providers = require('../providers');
var list = require('./list');

exports.run = function (args) {
  utils.argShift(args, 'subcommand');
  utils.argShift(args, 'name');

  if (args.subcommand && subcommands[args.subcommand]) {
    subcommands[args.subcommand](args);
  } else {
    utils.red('Missing subcommand.');
    exports.help(args);
  }
};

var subcommands = {};

subcommands.create = function (args) {
  var clusters = utils.getClusters();

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
      _keys(clusters).join(', ') + '.');
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

exports.signatures = function () {
  return [
    '  overcast instance create [name] [options]',
    '  overcast instance import [name] [options]',
    '  overcast instance remove [name]',
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
    'overcast instance remove [name]',
    '  Removes an instance from the index.'.grey,
    '  The server itself is not affected by this action.'.grey,
    '',
    '  Example:'.grey,
    '  $ overcast instance remove app.01'.grey
  ]);
};
