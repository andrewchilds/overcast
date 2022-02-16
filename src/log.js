import chalk from 'chalk';
import _ from 'lodash';
import { isTestRun } from './utils.js';
import { appendToStore, getStore } from './store.js';

const STORE_KEY = 'log.logs';

export const faded = (str) => {
  log(chalk.blackBright(str));
}

export const success = (str) => {
  log(chalk.greenBright(str));
};

export const info = (str) => {
  log(chalk.cyanBright(str));
};

export const alert = (str) => {
  log(chalk.yellowBright(str));
};

export const failure = (str) => {
  log(chalk.red(str));
};

export const br = () => {
  log('');
};

export const log = (str) => {
  if (isTestRun()) {
    appendToStore(STORE_KEY)
  } else {
    console.log(str);
  }
};

export const getLogs = () => {
  return getStore(STORE_KEY);
};
