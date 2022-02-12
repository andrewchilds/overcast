import * as cli from '../../src/cli.js';
import * as utils from '../../src/utils.js';

describe('aliases', () => {
  beforeEach(() => {
    spyOn(utils, 'getClusters').and.returnValue({
      myCluster: {
        instances: {
          vm01: {
            name: 'vm01',
            ip: '1.2.3.4',
            ssh_key: 'overcast.key',
            ssh_port: '22',
            user: 'root'
          },
          vm02: {
            name: 'vm02',
            ip: '1.2.3.5',
            ssh_key: 'overcast.key',
            ssh_port: '22',
            user: 'root'
          }
        }
      }
    });

    spyOn(utils, 'normalizeKeyPath').and.callFake((key) => {
      return '/path/to/' + key;
    });

    return spyOn(console, 'log');
  });

  return it('should return a list of bash aliases', () => {
    const expected = 'alias ssh.vm01="ssh -i /path/to/overcast.key -p 22 root@1.2.3.4"';
    cli.execute('aliases');
    expect(console.log.calls.all()).toEqual(expected);
  });
});
