import { overcast, tearDown, expectInLog } from './utils.js';

describe('info', () => {
  beforeAll((nextFn) => {
    tearDown(nextFn);
  });

  it('should display nothing when no clusters are defined', (nextFn) => {
    overcast('info', (logs) => {
      expectInLog(expect, logs, 'No clusters found');
      nextFn();
    });
  });

  it('should display info when clusters and instances are added', (nextFn) => {
    overcast('cluster add info-test', () => {
      overcast('instance add info.01 --cluster info-test --ip 127.0.0.1', () => {
        overcast('info', (logs) => {
          expectInLog(expect, logs, 'info-test');
          nextFn();
        });
      });
    });
  });

  it('should display nothing after the test cluster is removed', (nextFn) => {
    overcast('instance remove info.01', () => {
      overcast('cluster remove info-test', () => {
        overcast('info', (logs) => {
          expectInLog(expect, logs, 'No clusters found');
          nextFn();
        });
      });
    });
  });
});
