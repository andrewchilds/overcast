import chalk from 'chalk';

import { isTestRun } from './utils.js';
import { appendToStore, getStore } from './store.js';

const STORE_KEY = 'LOGS';

export const faded = (str) => {
  log(str, chalk.blackBright);
}

export const success = (str) => {
  log(str, chalk.green);
};

export const info = (str) => {
  log(str, chalk.cyan);
};

export const alert = (str) => {
  log(str, chalk.yellow);
};

export const failure = (str) => {
  log(str, chalk.red);
};

export const br = () => {
  log('');
};

export const log = (str, colorFn = null) => {
  if (isTestRun()) {
    appendToStore(STORE_KEY, str);
  } else {
    console.log(colorFn ? colorFn(str) : str);
  }
};

export const getLogs = () => {
  return getStore(STORE_KEY);
};
