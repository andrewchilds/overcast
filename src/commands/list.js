import chalk from 'chalk';
import * as utils from '../utils.js';

export const commands = {};

commands.list = {
  name: 'list',
  usage: 'overcast list',
  description: 'List your cluster and instance definitions.',
  run: (args) => {
    const clusters = utils.getClusters();

    console.log(utils.grey(`Using ${utils.CONFIG_DIR}/clusters.json`));

    if (!clusters) {
      console.log('');
      console.log(utils.note('No clusters found.'));
      return false;
    }

    utils.eachObject(clusters, ({ instances }, clusterName) => {
      console.log('');
      console.log(utils.grey(clusterName));
      utils.eachObject(instances, (instance) => {
        const origin = `(${instance.user}@${instance.ip}:${instance.ssh_port || 22})`;
        const provider = getProviderName(instance);
        const str = `  ${instance.name} ${origin} (${chalk.green(provider || 'unknown provider')})`;
        console.log(str);
      });
    });
  }
};

function getProviderName(instance) {
  let name = '';
  ['digitalocean', 'virtualbox'].forEach((provider) => {
    if (instance[provider]) {
      name = `${provider}`;
    }
  });
  return name;
}
