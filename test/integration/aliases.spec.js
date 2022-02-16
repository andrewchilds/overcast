import { overcast, tearDown, expectInLog, expectNotInLog } from './utils.js';

describe('aliases', () => {
  beforeAll((done) => {
    tearDown(() => {
      overcast('init', () => {
        done();
      });
    });
  });

  describe('when there are no instances', () => {
    it('should print nothing', (done) => {
      overcast('aliases', (logs) => {
        expectNotInLog(expect, logs, 'ssh');
        done();
      });
    });
  });

  describe('when there are instances', () => {
    it('should print the ssh bash aliases for each', (done) => {
      overcast('instance add instance.01 127.0.0.1', () => {
        overcast('aliases', (logs) => {
          const str = 'alias ssh.instance.01="ssh -i';
          expectInLog(expect, logs, str);
          done();
        });
      });
    });
  });

});
