'use strict';

const fs = require('fs');
const helper = require('node-red-node-test-helper');
const should = require('should');

const OrionNode = require('../orion.js');

helper.init(require.resolve('node-red'));

describe('Orion Config Node', () => {
  beforeEach((done) => helper.startServer(done));

  afterEach((done) => {
    helper.unload();
    helper.stopServer(done);
  });

  it('Should load Node with Credentials', (done) => {
    const flow = [{ id: 'c1', type: 'orion_config', name: 'orion_config', groupIds: 'g1' }];
    const credentials = { c1: { username: 'u1', password: 'p1' } };
    helper.load(OrionNode, flow, credentials, () => {
      const c1 = helper.getNode('c1');
      c1.should.have.property('name', 'orion_config');
      c1.should.have.property('groupIds', 'g1');
      c1.should.have.property('credentials', { username: 'u1', password: 'p1' });
      done();
    });
  });
});

describe('Orion Encode Node', () => {
  beforeEach((done) => helper.startServer(done));

  afterEach((done) => {
    helper.unload();
    helper.stopServer(done);
  });

  it('Should encode WAV/PCM to Opus', (done) => {
    const testNode = {
      id: 'tn1',
      type: 'orion_encode',
      name: 'orion_encode',
      wires: [['hn1']],
    };
    const helperNode = { id: 'hn1', type: 'helper' };
    const testFlow = [testNode, helperNode];

    helper.load(OrionNode, testFlow, {}, () => {
      const tn1 = helper.getNode('tn1');
      const hn1 = helper.getNode('hn1');
      tn1.should.have.property('name', 'orion_encode');

      tn1.receive({
        payload: fs.readFileSync('test/test.wav'),
      });

      hn1.on('input', (msg) => {
        msg.payload.should.have.property('type', 'Buffer');
        msg.should.have.property('media');
        done();
      });
    });
  });

  it('Should do nothing', (done) => {
    const testNode = {
      id: 'tn1',
      type: 'orion_encode',
      name: 'orion_encode',
      wires: [['hn1']],
    };
    const helperNode = { id: 'hn1', type: 'helper' };
    const testFlow = [testNode, helperNode];

    helper.load(OrionNode, testFlow, {}, () => {
      const tn1 = helper.getNode('tn1');
      const hn1 = helper.getNode('hn1');
      tn1.should.have.property('name', 'orion_encode');

      tn1.receive({ taco: 'burrito' });

      hn1.on('input', (msg) => {
        msg.should.have.property('taco', 'burrito');
        done();
      });
    });
  });
});

describe('Orion Transcribe Node', () => {
  beforeEach((done) => helper.startServer(done));

  afterEach((done) => {
    helper.unload();
    helper.stopServer(done);
  });

  it('Should transcribe audio', (done) => {
    const encodeNode = {
      id: 'encodeNode',
      type: 'orion_encode',
      name: 'orion_encode_node',
      wires: [['transcribeNode']],
    };
    const transcribeNode = {
      id: 'transcribeNode',
      type: 'orion_transcribe',
      name: 'orion_transcribe_node',
      wires: [['helperNode']],
    };
    const helperNode = { id: 'helperNode', type: 'helper', name: 'helper_node' };
    const testFlow = [encodeNode, transcribeNode, helperNode];

    helper.load(OrionNode, testFlow, {}, () => {
      const testEncodeNode = helper.getNode('encodeNode');
      const testTranscribeNode = helper.getNode('transcribeNode');
      const testHelperNode = helper.getNode('helperNode');

      testEncodeNode.should.have.property('name', 'orion_encode_node');
      testTranscribeNode.should.have.property('name', 'orion_transcribe_node');
      testHelperNode.should.have.property('name', 'helper_node');

      testEncodeNode.receive({ payload: fs.readFileSync('test/test.wav') });

      testHelperNode.on('input', (msg) => {
        msg.should.have.property('transcript', 'Hey look it works, yay.');
        done();
      });
    });
  });

  it('Should do nothing', (done) => {
    const encodeNode = {
      id: 'encodeNode',
      type: 'orion_encode',
      name: 'orion_encode_node',
      wires: [['helperNode']],
    };
    const helperNode = { id: 'helperNode', type: 'helper', name: 'helper_node' };
    const testFlow = [encodeNode, helperNode];

    helper.load(OrionNode, testFlow, {}, () => {
      const testEncodeNode = helper.getNode('encodeNode');
      const testHelperNode = helper.getNode('helperNode');

      testEncodeNode.should.have.property('name', 'orion_encode_node');
      testHelperNode.should.have.property('name', 'helper_node');

      testEncodeNode.receive({ taco: 'burrito' });

      testHelperNode.on('input', (msg) => {
        msg.should.have.property('taco', 'burrito');
        done();
      });
    });
  });
});

describe('Orion TX Node', () => {
  const username = process.env.TEST_ORION_USERNAME;
  const password = process.env.TEST_ORION_PASSWORD;
  const groups = process.env.TEST_ORION_GROUPS;

  beforeEach((done) => helper.startServer(done));

  afterEach((done) => {
    helper.unload();
    helper.stopServer(done);
  });

  it('Auth Credentials should be set', (done) => {
    should.exist(username);
    should.exist(password);
    should.exist(groups);
    done();
  });

  it('Should load & send events', (done) => {
    const testTXNode = {
      id: 'tn1',
      type: 'orion_tx',
      name: 'orion_tx',
      orion_config: 'tc1',
    };
    const testConfig = {
      id: 'tc1',
      type: 'orion_config',
      name: 'orion_config',
      groupIds: groups,
    };
    const testCreds = { username: username, password: password };

    const testFlow = [testTXNode, testConfig];

    helper.load(OrionNode, testFlow, { tc1: testCreds }, () => {
      let tn1 = helper.getNode('tn1');
      let tc1 = helper.getNode('tc1');
      tn1.should.have.property('name', 'orion_tx');
      tc1.should.have.property('name', 'orion_config');
      tn1.receive({ message: 'unit_test' });

      tn1.on('call:warn', (call) => {
        call.should.be.calledWithExactly('unit_test');
        done();
      });
    });
  });
});

describe('Orion RX Node', () => {
  const username = process.env.TEST_ORION_USERNAME;
  const password = process.env.TEST_ORION_PASSWORD;
  const groups = process.env.TEST_ORION_GROUPS;

  beforeEach((done) => helper.startServer(done));

  afterEach((done) => {
    helper.unload();
    helper.stopServer(done);
  });

  it('Auth Credentials should be set', (done) => {
    should.exist(username);
    should.exist(password);
    should.exist(groups);
    done();
  });

  it('Should load & receive events', (done) => {
    const testRXNode = {
      id: 'tn1',
      type: 'orion_rx',
      name: 'orion_rx',
      orion_config: 'tc1',
      wires: [['hn1'], [], [], []],
    };
    const testTXNode = {
      id: 'tn2',
      type: 'orion_tx',
      name: 'orion_tx',
      orion_config: 'tc1',
    };
    const testConfig = {
      id: 'tc1',
      type: 'orion_config',
      name: 'orion_config',
      groupIds: groups,
    };
    const helperNode = { id: 'hn1', type: 'helper' };
    const testCreds = { username: username, password: password };

    const testFlow = [testRXNode, testConfig, helperNode, testTXNode];

    helper.load(OrionNode, testFlow, { tc1: testCreds }, () => {
      const tn1 = helper.getNode('tn1');
      const tn2 = helper.getNode('tn2');
      const tc1 = helper.getNode('tc1');
      const hn1 = helper.getNode('hn1');
      tn1.should.have.property('name', 'orion_rx');
      tn2.should.have.property('name', 'orion_tx');
      tc1.should.have.property('name', 'orion_config');

      tn2.receive({ message: 'unit_test' });

      hn1.on('input', (msg) => {
        msg.should.have.property('event_type', 'ptt');
        done();
      });
    });
  });
});
