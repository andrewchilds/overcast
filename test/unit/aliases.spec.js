import * as cli from '../../src/cli.js';
import * as utils from '../../src/utils.js';

describe('aliases', () => {
  beforeEach(() => {
    utils.mockClusters({
      myCluster: {
        instances: {
          vm01: {
            name: 'vm01',
            ip: '1.2.3.4',
            ssh_key: '/path/to/overcast.key',
            ssh_port: '22',
            user: 'root'
          },
          vm02: {
            name: 'vm02',
            ip: '1.2.3.5',
            ssh_key: '/path/to/overcast.key',
            ssh_port: '22',
            user: 'root'
          }
        }
      }
    });

    spyOn(console, 'log');
  });

  it('should return a list of bash aliases', () => {
    const expectedArgs = [
      ['alias ssh.vm01="ssh -i /path/to/overcast.key -p 22 root@1.2.3.4"'],
      ['alias ssh.vm02="ssh -i /path/to/overcast.key -p 22 root@1.2.3.5"']
    ];
    cli.execute('aliases');
    expect(console.log.calls.allArgs()).toEqual(expectedArgs);
  });
});
