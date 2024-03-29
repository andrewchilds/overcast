import * as utils from '../utils.js';
import * as filters from '../filters.js';
import * as log from '../log.js';

export const commands = {};

commands.get = {
  name: 'get',
  usage: ['overcast instance get [instance|cluster|all] [attr...] [options...]'],
  description: [
    'Returns the attribute(s) for the instance or cluster, one per line,',
    'or space-delimited using the --single-line option.',
    'Deeply nested arrays and objects are supported.',
    '"origin" is a compound attribute that returns user@ip:ssh-port.'
  ],
  examples: [
    '$ overcast instance get app-01 origin',
    'root@1.2.3.4:22',
    '',
    '$ overcast instance get app-cluster ip',
    '127.0.0.1',
    '127.0.0.2',
    '127.0.0.3',
    '',
    '$ overcast instance get app-01 digitalocean.image.id',
    '103510828'
  ],
  options: [
    { usage: '--single-line, -s', default: 'false' }
  ],
  required: [
    { name: 'instance|cluster|all', varName: 'name', filters: filters.findMatchingInstances },
    { name: 'attr...', varName: 'attr', greedy: true }
  ],
  run: (args, nextFn) => {
    const output = [];
    args.attr = args.attr.split(' ');

    args.instances.forEach((instance) => {
      args.attr.forEach((attr) => {
        attr = attr.replace(/-/g, '_');
        if (attr === 'origin') {
          output.push(`${instance.user}@${instance.ip}:${instance.ssh_port}`);
        } else {
          const v = utils.deepGet(instance, attr);
          if (v !== undefined) {
            output.push(v);
          }
        }
      });
    });

    if (args.s || args['single-line']) {
      log.log(output.join(' '));
    } else {
      output.forEach((line) => {
        log.log(line);
      });
    }

    nextFn();
  }
};

commands.add = {
  name: 'add',
  usage: ['overcast instance add [name] [ip] [options...]'],
  description: 'Adds an existing instance to a cluster.',
  examples: [
    '$ overcast instance add app.01 127.0.0.1 --cluster app \\',
    '    --ssh-port 22222 --ssh-key $HOME/.ssh/id_rsa'
  ],
  required: [
    { name: 'name', filters: filters.shouldBeNewInstance },
    { name: 'ip' }
  ],
  options: [
    { usage: '--cluster CLUSTER', default: 'default' },
    { usage: '--ssh-port PORT', default: '22' },
    { usage: '--ssh-key PATH', default: 'overcast.key' },
    { usage: '--user USERNAME', default: 'root' },
    { usage: '--password PASSWORD' },
  ],
  run: (args, nextFn) => {
    const instance = {
      ip: args.ip,
      name: args.name,
      ssh_port: args['ssh-port'] || '22',
      ssh_key: args['ssh-key'] || 'overcast.key',
      user: args.user || 'root',
      password: args.password || ''
    };

    utils.saveInstanceToCluster(args.cluster, instance, () => {
      log.success(`Instance "${args.name}" (${args.ip}) has been added to the "${args.cluster}" cluster.`);
      nextFn();
    });
  }
};

commands.list = {
  name: 'list',
  usage: ['overcast instance list [cluster...]'],
  description: [
    'Returns all instance names, one per line.',
    'Optionally limit to one or more clusters.'
  ],
  examples: [
    '$ overcast instance list',
    '$ overcast instance list app-cluster db-cluster'
  ],
  run: (args, nextFn) => {
    const clusters = utils.getClusters();
    const scope = (args._ && args._.length > 0) ? args._ : Object.keys(clusters);

    utils.eachObject(clusters, ({instances}, clusterName) => {
      if (scope.findIndex(s => s === clusterName) !== -1) {
        utils.eachObject(instances, ({name}) => {
          log.log(name);
        });
      }
    });

    nextFn();
  }
};

commands.remove = {
  name: 'remove',
  usage: ['overcast instance remove [name]'],
  description: [
    'Removes an instance from the index.',
    'The server itself is not affected by this action.'
  ],
  examples: [
    '$ overcast instance remove app-01'
  ],
  required: [{ name: 'name', filters: filters.findFirstMatchingInstance }],
  run: ({ instance }, nextFn) => {
    utils.deleteInstance(instance, () => {
      log.success(`Instance "${instance.name}" removed.`);
      nextFn();
    });
  }
};

commands.update = {
  name: 'update',
  usage: ['overcast instance update [instance|cluster|all] [options...]'],
  description: [
    'Update any instance property. Specifying --cluster will move the instance',
    'to that cluster. Specifying --name will rename the instance.'
  ],
  examples: [
    '# Update the user and ssh-key of an instance:',
    '$ overcast instance update app.01 --user myuser --ssh-key /path/to/key',
    '',
    '# Update ssh-port of a cluster:',
    '$ overcast instance update app-cluster --ssh-port 22222'
  ],
  required: [
    { name: 'instance|cluster|all', varName: 'oldName', filters: filters.findMatchingInstances }
  ],
  options: [
    { usage: '--name NAME' },
    { usage: '--cluster CLUSTER' },
    { usage: '--ip IP' },
    { usage: '--ssh-port PORT' },
    { usage: '--ssh-key PATH' },
    { usage: '--user USERNAME' },
    { usage: '--password PASSWORD' }
  ],
  run: (args, nextFn) => {
    const clusters = utils.getClusters();

    if (!args.name) {
      args.name = args.oldName;
      args.oldName = null;
    }

    const instances = utils.findMatchingInstances(args.oldName || args.name);
    const messages = [];

    utils.eachObject(instances, (instance) => {
      return updateInstance(args, messages, clusters, instance);
    });

    utils.saveClusters(clusters, () => {
      messages.forEach(log.success);
      nextFn();
    });
  }
};

export function updateInstance(args, messages, clusters, instance) {
  let parentClusterName = utils.findClusterNameForInstance(instance);

  if (args.cluster) {
    if (!clusters[args.cluster]) {
      return utils.die(`No "${args.cluster}" cluster found. Known clusters are: ${Object.keys(clusters).join(', ')}.`);
    }
    if (clusters[args.cluster].instances[instance.name]) {
      return utils.die(`An instance named "${instance.name}" already exists in the "${args.cluster}" cluster.`);
    }

    delete clusters[parentClusterName].instances[instance.name];
    clusters[args.cluster].instances[instance.name] = instance;
    parentClusterName = args.cluster;
    messages.push(`Instance "${instance.name}" has been moved to the "${args.cluster}" cluster.`);
  }

  if (args.oldName) {
    if (clusters[parentClusterName].instances[args.name]) {
      return utils.die(`An instance named "${args.name}" already exists in the "${parentClusterName}" cluster.`);
    }

    instance.name = args.name;
    delete clusters[parentClusterName].instances[args.oldName];
    clusters[parentClusterName].instances[args.name] = instance;
    messages.push(`Instance "${args.oldName}" has been renamed to "${args.name}".`);
  }

  ['ip', 'ssh-key', 'ssh-port', 'user', 'password'].forEach((prop) => {
    if (prop in args) {
      if (args[prop]) {
        clusters[parentClusterName].instances[instance.name][prop.replace('-', '_')] = args[prop];
        messages.push(`Instance property "${prop}" has been updated to "${args[prop]}".`);
      } else {
        delete clusters[parentClusterName].instances[instance.name][prop.replace('-', '_')];
        messages.push(`Instance property "${prop}" has been unset.`);
      }
    }
  });
}
