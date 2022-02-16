import cp from 'child_process';
import { init } from '../../src/cli.js';
import { getLogs } from '../../src/log.js';
import { clearStore, setConfigDirs } from '../../src/store.js';

export const overcast = (args, done) => {
  clearStore();
  setConfigDirs(process.cwd());
  init(args + ' --is-test-run', () => {
    done(getLogs());
  });
};

export const tearDown = (done = () => {}) => {
  const args = 'rm -rf .overcast';
  cp.exec(args, (err, stdout, stderr) => {
    done();
  });
};

function findInLog(logs, str) {
  return logs.some((log) => {
    return log.includes(str);
  });
}

export const expectInLog = (expect, logs, str) => {
  expect(findInLog(logs, str)).toBe(true);
};

export const expectNotInLog = (expect, logs, str) => {
  expect(findInLog(logs, str)).toBe(false);
};
