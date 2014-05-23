utils = require('./utils')
overcast = utils.overcast

describe 'instance', ->

  describe 'import', ->

    it 'should allow me to import an instance', ->
      overcast 'cluster create instance-test', ->
        overcast 'instance import instance.01 --cluster instance-test --ip 127.0.0.1', (stdout) ->
          expect(stdout).toContain 'Instance "instance.01" (127.0.0.1) has been imported ' +
          'to the "instance-test" cluster'

  describe 'get', ->

    it 'should output the instance attributes', ->
      overcast 'instance get instance.01 ip', (stdout) ->
        expect(stdout).toContain '127.0.0.1'

  describe 'list', ->

    it 'should list all instances with overcast instance list', ->
      overcast 'instance list', (stdout) ->
        expect(stdout).toContain 'instance.01'

  describe 'update', ->

    it 'should allow me to rename an instance', ->
      overcast 'instance update instance.01 --name instance.01.renamed', (stdout) ->
        expect(stdout).toContain 'Instance "instance.01" has been renamed to "instance.01.renamed".'

  describe 'remove', ->

    it 'should allow me to remove an instance', ->
      overcast 'instance remove instance.01.renamed', (stdout) ->
        expect(stdout).toContain 'Instance "instance.01.renamed" removed'
        overcast 'cluster remove instance-test', (stdout) ->
          expect(stdout).toContain 'Cluster "instance-test" has been removed'
