import { overcast, tearDown, expectInLog } from './utils.js';

describe('list', () => {
  beforeAll((nextFn) => {
    tearDown(nextFn);
  });

  it('should display nothing when no clusters are defined', (nextFn) => {
    overcast('list', (logs) => {
      expectInLog(expect, logs, 'No clusters found');
      nextFn();
    });
  });

  it('should display info when clusters are defined', (nextFn) => {
    overcast('cluster add list-test', () => {
      overcast('list', (logs) => {
        expectInLog(expect, logs, 'list-test');
        nextFn();
      });
    });
  });

  it('should display nothing after the test cluster is removed', (nextFn) => {
    overcast('cluster remove list-test', () => {
      overcast('list', (logs) => {
        expectInLog(expect, logs, 'No clusters found');
        nextFn();
      });
    });
  });
});
