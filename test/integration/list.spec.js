import { overcast, tearDown } from './utils.js';

describe('list', () => {
  beforeAll((done) => {
    tearDown(() => {
      overcast('init', () => {
        done();
      });
    });
  });

  it('should display nothing when no clusters are defined', (done) => {
    overcast('list', ({ stdout }) => {
      expect(stdout).toContain('No clusters found');
      done();
    });
  });

  it('should display info when clusters are defined', (done) => {
    overcast('cluster create list-test', () => {
      overcast('list', ({ stdout }) => {
        expect(stdout).toContain('list-test');
        done();
      });
    });
  });

  it('should display nothing after the test cluster is removed', (done) => {
    overcast('cluster remove list-test', () => {
      overcast('list', ({ stdout }) => {
        expect(stdout).toContain('No clusters found');
        done();
      });
    });
  });
});
