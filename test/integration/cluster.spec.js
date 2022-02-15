import { overcast, tearDown } from './utils.js';

const name = 'testCluster';

describe('cluster', () => {
  beforeAll((done) => {
    tearDown(() => {
      overcast('init', () => {
        done();
      });
    });
  });

  describe('add', () => {
    it('should allow me to add a new cluster', (done) => {
      overcast(`cluster add ${name}`, ({ stdout }) => {
        expect(stdout).toContain(`Cluster "${name}" has been added`);
        done();
      });
    });
  });

  describe('count', () => {
    it('should return the instance count for an existing cluster', (done) => {
      overcast(`cluster count ${name}`, ({ stdout }) => {
        expect(stdout).toContain('0');
        done();
      });
    });
  });

  describe('rename', () => {
    it('should allow me to rename an existing cluster', (done) => {
      overcast(`cluster rename ${name} foo`, ({ stdout }) => {
        expect(stdout).toContain(`Cluster "${name}" has been renamed to "foo"`);
        done();
      });
    });
  });

  describe('remove', () => {
    it('should allow me to remove an existing cluster', (done) => {
      overcast(`cluster remove foo`, ({ stdout }) => {
        expect(stdout).toContain('Cluster "foo" has been removed');
        done();
      });
    });
  });

});
