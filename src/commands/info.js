import * as utils from '../utils.js';
import * as filters from '../filters.js';
import * as log from '../log.js';
import { getClustersJSON } from '../store.js';

export const commands = {};

commands.info = {
  name: 'info',
  usage: ['overcast info', 'overcast info [name]'],
  description: ['Pretty-prints the complete clusters.json file, stored here:',
    getClustersJSON(),
    'Optionally display only instances matching [name].'],
  required: [{ name: 'name', optional: true, filters: filters.findMatchingInstances }],
  run: ({ instances }, nextFn) => {
    const clusters = utils.getClusters();

    log.faded(`Using ${getClustersJSON()}`);

    if (Object.keys(clusters).length === 0) {
      log.br();
      log.alert('No clusters found.');
      return nextFn();
    }

    if (instances && instances.length > 0) {
      log.br();
      instances.forEach((instance) => {
        log.log(instance.name);
        utils.prettyPrint(instance, 2);
      });

      return nextFn();
    }

    utils.eachObject(clusters, ({ instances }, clusterName) => {
      log.br();
      log.log(clusterName);
      utils.eachObject(instances, instance => {
        log.br();
        log.log(`  ${instance.name}`);
        utils.prettyPrint(instance, 4);
      });
    });

    nextFn();
  }
};
