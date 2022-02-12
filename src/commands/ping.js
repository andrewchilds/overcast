import chalk from 'chalk';
import cp from 'child_process';
import * as utils from '../utils.js';
import * as filters from '../filters.js';

export const commands = {};

commands.ping = {
  name: 'ping',
  usage: 'overcast ping [instance|cluster|all] [options]',
  description: 'Display the average ping time for an instance or cluster.',
  examples: [
    '$ overcast ping app-01',
    '$ overcast ping db --count 5'
  ],
  required: [
    { name: 'name', filters: filters.findMatchingInstances }
  ],
  options: [{ usage: '--count N, -c N', default: '3' }],
  run: (args) => {
    const count = args.count || args.c || 3;
    utils.each(args.instances, instance => {
      ping(instance, count);
    });
  }
};

function ping({ip, name}, count) {
  cp.exec(`ping -c ${count} ${ip}`, (err, stdout) => {
    const color = utils.SSH_COLORS[utils.SSH_COUNT++ % 5];
    const averagePing = stdout.match(/ ([\d\.]+)\/([\d\.]+)\/([\d\.]+)\/([\d\.]+) ms/);
    const prefix = `${name}: `;
    console.log(`${chalk[color](prefix) + averagePing[2]} ms`);
  });
}
