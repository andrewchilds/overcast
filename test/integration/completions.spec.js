import { overcast, tearDown } from './utils.js';

describe('completions', () => {
  beforeAll((done) => {
    tearDown(() => {
      overcast('init', () => {
        done();
      });
    });
  });

  it('should print a list of keywords', (done) => {
    overcast('completions', ({ stdout }) => {
      expect(stdout).toContain('overcast');
      expect(stdout).toContain('cluster');
      expect(stdout).toContain('instance');
      done();
    });
  });

  it('should also print a list of clusters and instances', (done) => {
    overcast('instance add myInstanceName 1.2.3.4 --cluster helloCluster', () => {
      overcast('completions', ({ stdout }) => {
        expect(stdout).toContain('myInstanceName');
        expect(stdout).toContain('helloCluster');
        done();
      });
    });
  });

});
