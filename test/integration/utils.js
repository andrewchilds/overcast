import cp from 'child_process';
import { init } from '../../src/cli.js';
import { getLogs } from '../../src/log.js';
import { clearStore } from '../../src/store.js';

export const overcast = (args, nextFn = () => {}) => {
  clearStore();
  init(args + ' --is-test-run', () => {
    nextFn(getLogs());
  });
};

export const tearDown = (nextFn = () => {}) => {
  const args = 'rm -rf .overcast';
  cp.exec(args, () => {
    nextFn();
  });
};

function findInLog(logs, str) {
  return logs.some(log => log.includes(str));
}

export const expectInLog = (expect, logs, str) => {
  const found = findInLog(logs, str);
  if (found !== true) {
    console.log(logs);
  }
  expect(found).toBe(true);
};

export const expectInLogExact = (expect, logs, str) => {
  const found = logs.some(log => log === str);
  if (found !== true) {
    console.log(logs);
  }
  expect(found).toBe(true);
}

export const expectNotInLog = (expect, logs, str) => {
  const found = findInLog(logs, str);
  if (found !== false) {
    console.log(logs);
  }
  expect(found).toBe(false);
};
