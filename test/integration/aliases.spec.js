import { overcast, tearDown } from './utils.js';

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
      overcast('aliases', ({ stdout }) => {
        expect(stdout).not.toContain('ssh');
        done();
      });
    });
  });

  describe('when there are instances', () => {
    it('should print the ssh bash aliases for each', (done) => {
      overcast('instance add instance.01 127.0.0.1', () => {
        overcast('aliases', ({ stdout }) => {
          expect(stdout).toContain('alias ssh.instance.01="ssh -i');
          done();
        });
      });
    });
  });

});
