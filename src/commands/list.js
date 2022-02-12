import chalk from 'chalk';
import * as utils from '../utils.js';
import * as log from '../log.js';

export const commands = {};

commands.list = {
  name: 'list',
  usage: 'overcast list',
  description: 'List your cluster and instance definitions.',
  run: (args) => {
    const clusters = utils.getClusters();

    log.faded(`Using ${utils.CONFIG_DIR}/clusters.json`);

    if (!clusters) {
      log.br();
      log.faded('No clusters found.');
      return false;
    }

    utils.eachObject(clusters, ({ instances }, clusterName) => {
      log.br();
      log.faded(clusterName);
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
