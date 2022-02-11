import * as utils from '../utils.js';
import * as filters from '../filters.js';

const commands = {};
export default commands;

commands.info = {
  name: 'info',
  usage: ['overcast info', 'overcast info [name]'],
  description: ['Pretty-prints the complete clusters.json file, stored here:',
    `${utils.CONFIG_DIR}/clusters.json`,
    'Optionally display only instances matching [name].'],
  required: [{ name: 'name', optional: true, filters: filters.findMatchingInstances }],
  run: function({instances}) {
    const clusters = utils.getClusters();

    utils.grey(`Using ${utils.CONFIG_DIR}/clusters.json`);

    if (!clusters) {
      console.log('');
      utils.grey('No clusters found.');
      return false;
    }

    if (instances) {
      console.log('');
      utils.each(instances, instance => {
        console.log(instance.name);
        utils.prettyPrint(instance, 2);
      });

      return false;
    }

    utils.each(clusters, ({instances}, clusterName) => {
      console.log('');
      utils.cyan(clusterName);
      utils.each(instances, instance => {
        console.log('');
        console.log(`  ${instance.name}`);
        utils.prettyPrint(instance, 4);
      });
    });
  }
};
