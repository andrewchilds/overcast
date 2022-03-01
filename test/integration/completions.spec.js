import { overcast, tearDown, expectInLog } from './utils.js';

describe('completions', () => {
  beforeAll((nextFn) => {
    tearDown(nextFn);
  });

  it('should print a list of keywords', (nextFn) => {
    overcast('completions', (logs) => {
      expectInLog(expect, logs, 'overcast');
      expectInLog(expect, logs, 'cluster');
      expectInLog(expect, logs, 'instance');
      nextFn();
    });
  });

  it('should also print a list of clusters and instances', (nextFn) => {
    overcast('instance add myInstanceName 1.2.3.4 --cluster helloCluster', () => {
      overcast('completions', (logs) => {
        expectInLog(expect, logs, 'myInstanceName');
        expectInLog(expect, logs, 'helloCluster');
        nextFn();
      });
    });
  });

});
