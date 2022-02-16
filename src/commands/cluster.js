import * as utils from '../utils.js';
import * as filters from '../filters.js';
import * as log from '../log.js';

export const commands = {};

commands.count = {
  name: 'count',
  usage: ['overcast cluster count [name]'],
  description: 'Return the number of instances in a cluster.',
  examples: [
    '$ overcast cluster count db',
    '> 0',
    '$ overcast instance create db.01 --cluster db',
    '> ...',
    '$ overcast cluster count db',
    '> 1'
  ],
  required: [{ name: 'name', filters: filters.findMatchingCluster }],
  run: ({ cluster }) => {
    console.log(Object.keys(cluster.instances).length);
  }
};

commands.add = {
  name: 'add',
  usage: ['overcast cluster add [name]'],
  description: 'Adds a new cluster.',
  examples: '$ overcast cluster add db',
  required: [{ name: 'name', filters: filters.shouldBeNewCluster }],
  run: ({ name }) => {
    const clusters = utils.getClusters();
    // We shouldn't have to guard against an existing cluster here,
    // because of the shouldBeNewCluster filter above.
    clusters[name] = { instances: {} };

    utils.saveClusters(clusters, () => {
      log.success(`Cluster "${name}" has been added.`);
    });
  }
};

commands.rename = {
  name: 'rename',
  usage: ['overcast cluster rename [name] [new-name]'],
  description: 'Renames a cluster.',
  examples: '$ overcast cluster rename app-cluster app-cluster-renamed',
  required: [
    { name: 'name', filters: filters.findMatchingCluster },
    { name: 'new-name', varName: 'newName', filters: filters.shouldBeNewCluster }
  ],
  run: ({ newName, name }) => {
    const clusters = utils.getClusters();

    clusters[newName] = clusters[name];
    delete clusters[name];

    utils.saveClusters(clusters, () => {
      log.success(`Cluster "${name}" has been renamed to "${newName}".`);
    });
  }
};

commands.remove = {
  name: 'remove',
  usage: ['overcast cluster remove [name]'],
  description: [
    'Removes a cluster from the index. If the cluster has any instances',
    'attached to it, they will be moved to an "orphaned" cluster.'
  ],
  examples: '$ overcast cluster remove db',
  required: [
    { name: 'name', filters: filters.findMatchingCluster }
  ],
  run: ({ name }) => {
    const clusters = utils.getClusters();

    let orphaned = 0;
    if (clusters[name].instances && Object.keys(clusters[name].instances).length > 0) {
      orphaned = Object.keys(clusters[name].instances).length;
      clusters.orphaned = clusters.orphaned || { instances: {} };
      Object.assign(clusters.orphaned.instances, clusters[name].instances);
    }

    delete clusters[name];

    utils.saveClusters(clusters, () => {
      log.success(`Cluster "${name}" has been removed.`);
      if (orphaned) {
        if (name === 'orphaned') {
          log.alert(`The ${orphaned} instance(s) in the "orphaned" cluster were removed.`);
        } else {
          log.alert(`The ${orphaned} instance(s) from this cluster were moved to the "orphaned" cluster.`);
        }
      }
    });
  }
};
