import utils from '../utils';
import cli from '../cli';

const commands = {};
export {commands};

commands.list = {
  name: 'list',
  usage: 'overcast list',
  description: 'List your cluster and instance definitions.',
  run: function (args) {
    const clusters = utils.getClusters();

    utils.grey(`Using ${utils.CONFIG_DIR}/clusters.json`);

    console.log(clusters);

    if (!clusters) {
      console.log('');
      utils.note('No clusters found.');
      return false;
    }

    utils.eachObject(clusters, (cluster, clusterName) => {
      utils.grey(clusterName);
      utils.eachObject(cluster.instances, (instance) => {
        const origin = `(${instance.user}@${instance.ip}:${instance.ssh_port || 22})`;
        const provider = getProviderName(instance);
        const str = `  ${instance.name} ${origin}${provider ? ` ${provider.green}` : ''}`;
        console.log(str);
      });
    });
  }
};

// Backwards compatibility:
export function run() {
  cli.run(commands.list);
}

function getProviderName(instance) {
  let name = '';
  ['digitalocean', 'virtualbox'].forEach((provider) => {
    if (instance[provider]) {
      name = `(${provider})`;
    }
  });
  return name;
}
