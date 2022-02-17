import chalk from 'chalk';
import * as utils from '../utils.js';
import * as log from '../log.js';
import { getClustersJSON } from '../store.js';

export const commands = {};

commands.list = {
  name: 'list',
  usage: ['overcast list'],
  description: 'List your cluster and instance definitions.',
  run: (args, nextFn = () => {}) => {
    const clusters = utils.getClusters();

    log.faded(`Using ${getClustersJSON()}`);

    if (Object.keys(clusters).length === 0) {
      log.br();
      log.alert('No clusters found.');
      return nextFn();
    }

    utils.eachObject(clusters, ({ instances }, clusterName) => {
      log.br();
      log.log(clusterName);
      utils.eachObject(instances, (instance) => {
        const origin = `(${instance.user}@${instance.ip}:${instance.ssh_port || 22})`;
        const provider = getProviderName(instance);
        const str = `  ${chalk.cyan(instance.name)} ${origin} (${chalk.green(provider || 'unknown provider')})`;
        log.log(str);
      });
    });

    nextFn();
  }
};

function getProviderName(instance) {
  let name = '';
  ['digitalocean', 'virtualbox', 'linode', 'aws'].forEach((provider) => {
    if (instance[provider]) {
      name = `${provider}`;
    }
  });
  return name;
}
