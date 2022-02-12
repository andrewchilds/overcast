import * as utils from '../utils.js';
import * as filters from '../filters.js';
import * as log from '../log.js';

export const commands = {};

commands.info = {
  name: 'info',
  usage: ['overcast info', 'overcast info [name]'],
  description: ['Pretty-prints the complete clusters.json file, stored here:',
    `${utils.CONFIG_DIR}/clusters.json`,
    'Optionally display only instances matching [name].'],
  required: [{ name: 'name', optional: true, filters: filters.findMatchingInstances }],
  run: function({instances}) {
    const clusters = utils.getClusters();

    log.faded(`Using ${utils.CONFIG_DIR}/clusters.json`);

    if (!clusters) {
      log.br();
      log.faded('No clusters found.');
      return false;
    }

    if (instances) {
      log.br();
      utils.eachObject(instances, instance => {
        console.log(instance.name);
        utils.prettyPrint(instance, 2);
      });

      return false;
    }

    utils.eachObject(clusters, ({instances}, clusterName) => {
      log.br();
      log.faded(clusterName);
      utils.eachObject(instances, instance => {
        log.br();
        console.log(`  ${instance.name}`);
        utils.prettyPrint(instance, 4);
      });
    });
  }
};
