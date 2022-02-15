import { overcast, tearDown } from './utils.js';

describe('info', () => {
  beforeAll((done) => {
    tearDown(() => {
      overcast('init', () => {
        done();
      });
    });
  });

  it('should display nothing when no clusters are defined', (done) => {
    overcast('info', ({ stdout }) => {
      expect(stdout).toContain('No clusters found');
      done();
    });
  });

  it('should display info when clusters and instances are added', (done) => {
    overcast('cluster add info-test', () => {
      overcast('instance add info.01 --cluster info-test --ip 127.0.0.1', () => {
        overcast('info', ({ stdout }) => {
          expect(stdout).toContain('info-test');
          done();
        });
      });
    });
  });

  it('should display nothing after the test cluster is removed', (done) => {
    overcast('instance remove info.01', () => {
      overcast('cluster remove info-test', () => {
        overcast('info', ({ stdout }) => {
          expect(stdout).toContain('No clusters found');
          done();
        });
      });
    });
  });
});
