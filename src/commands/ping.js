import chalk from 'chalk';
import cp from 'child_process';

import * as log from '../log.js';
import * as utils from '../utils.js';
import * as filters from '../filters.js';
import { fsync } from 'fs';

export const commands = {};

commands.ping = {
  name: 'ping',
  usage: ['overcast ping [instance|cluster|all] [options]'],
  description: 'Display the average ping time for an instance or cluster.',
  examples: [
    '$ overcast ping app-01',
    '$ overcast ping db --count 5'
  ],
  required: [
    { name: 'name', filters: filters.findMatchingInstances }
  ],
  options: [{ usage: '--count N, -c N', default: '3' }],
  run: (args, nextFn) => {
    const count = args.count || args.c || 3;
    const fns = [];

    args.instances.forEach((instance) => {
      fns.push((nextFn) => {
        ping(instance, count, nextFn);
      });
    });

    utils.allInParallelThen(fns, nextFn);
  }
};

function ping({ ip, name }, count, nextFn) {
  cp.exec(`ping -c ${count} ${ip}`, (err, stdout) => {
    const color = utils.getNextColor();
    const averagePing = stdout.match(/ ([\d\.]+)\/([\d\.]+)\/([\d\.]+)\/([\d\.]+) ms/);
    const prefix = `${name}: `;
    log.log(`${chalk[color](prefix) + averagePing[2]} ms`);
    nextFn();
  });
}
