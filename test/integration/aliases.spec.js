import { overcast, tearDown, expectInLog } from './utils.js';

describe('aliases', () => {
  beforeAll((nextFn) => {
    tearDown(nextFn);
  });

  describe('when there are no instances', () => {
    it('should print nothing', (nextFn) => {
      overcast('aliases', (logs) => {
        expectInLog(expect, logs, 'No overcast clusters defined');
        nextFn();
      });
    });
  });

  describe('when there are instances', () => {
    it('should print the ssh bash aliases for each', (nextFn) => {
      overcast('instance add instance.01 127.0.0.1', () => {
        overcast('aliases', (logs) => {
          const str = 'alias ssh.instance.01="ssh -i';
          expectInLog(expect, logs, str);
          nextFn();
        });
      });
    });
  });

});
