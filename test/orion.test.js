/**
 * Tests for Orion Node-RED nodes.
 *
 * @author Greg Albrecht <gba@orionlabs.io>
 * @copyright Orion Labs, Inc. https://www.orionlabs.io
 * @license Apache-2.0
 */

'use strict';

const fs = require('fs');
const helper = require('node-red-node-test-helper');
const should = require('should');

const OrionClient = require('../orionClient');
const OrionNode = require('../orion.js');

helper.init(require.resolve('node-red'));

describe('OrionConfig', () => {
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

describe('OrionEncode', () => {
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

describe('OrionDecode', () => {
  beforeEach((done) => helper.startServer(done));

  afterEach((done) => {
    helper.unload();
    helper.stopServer(done);
  });

  it('Should decode Opus to WAV/PCM URL (default)', (done) => {
    const decodeNode = {
      id: 'decodeNode',
      type: 'orion_decode',
      name: 'orion_decode_node',
      wires: [['helperNode']],
    };
    const helperNode = { id: 'helperNode', type: 'helper', name: 'helper_node' };
    const testFlow = [decodeNode, helperNode];

    helper.load(OrionNode, testFlow, {}, () => {
      const testDecodeNode = helper.getNode('decodeNode');
      const testHelperNode = helper.getNode('helperNode');
      testDecodeNode.should.have.property('name', 'orion_decode_node');

      testDecodeNode.receive({
        media: 'https://alnitak-rx.orionlabs.io/b9577f6f-668f-423b-bb9a-11d1ace77f42.ov',
        ts: 1587406431.588,
        id: '81a84c52ff91497aa6182d09e66d50f8',
        sender: '2a6d61f9023342c8855423ba36128a19',
        event_type: 'ptt',
        sender_token_hash: '388b20153a4c47b386120fc3e05c88bc',
        ptt_seqnum: '1587406432.056607',
        sender_name: 'G2347',
        ptt_id: 'fc6c96a1e09e4aeda45cc6e5babac1fe',
        eventId: 'fc6c96a1e09e4aeda45cc6e5babac1fe',
      });

      testHelperNode.on('input', (msg) => {
        msg.should.have.property('media');
        msg.should.have.property('media_wav');
        done();
      });
    });
  });

  it('Should decode Opus to WAV/PCM URL (selected)', (done) => {
    const decodeNode = {
      id: 'decodeNode',
      type: 'orion_decode',
      name: 'orion_decode_node',
      return_type: 'url',
      wires: [['helperNode']],
    };
    const helperNode = { id: 'helperNode', type: 'helper', name: 'helper_node' };
    const testFlow = [decodeNode, helperNode];

    helper.load(OrionNode, testFlow, {}, () => {
      const testDecodeNode = helper.getNode('decodeNode');
      const testHelperNode = helper.getNode('helperNode');
      testDecodeNode.should.have.property('name', 'orion_decode_node');

      testDecodeNode.receive({
        media: 'https://alnitak-rx.orionlabs.io/b9577f6f-668f-423b-bb9a-11d1ace77f42.ov',
        ts: 1587406431.588,
        id: '81a84c52ff91497aa6182d09e66d50f8',
        sender: '2a6d61f9023342c8855423ba36128a19',
        event_type: 'ptt',
        sender_token_hash: '388b20153a4c47b386120fc3e05c88bc',
        ptt_seqnum: '1587406432.056607',
        sender_name: 'G2347',
        ptt_id: 'fc6c96a1e09e4aeda45cc6e5babac1fe',
        eventId: 'fc6c96a1e09e4aeda45cc6e5babac1fe',
      });

      testHelperNode.on('input', (msg) => {
        msg.should.have.property('media');
        msg.should.have.property('media_wav');
        done();
      });
    });
  });

  it('Should decode Opus to WAV/PCM URL (in-band)', (done) => {
    const decodeNode = {
      id: 'decodeNode',
      type: 'orion_decode',
      name: 'orion_decode_node',
      return_type: 'url',
      wires: [['helperNode']],
    };
    const helperNode = { id: 'helperNode', type: 'helper', name: 'helper_node' };
    const testFlow = [decodeNode, helperNode];

    helper.load(OrionNode, testFlow, {}, () => {
      const testDecodeNode = helper.getNode('decodeNode');
      const testHelperNode = helper.getNode('helperNode');
      testDecodeNode.should.have.property('name', 'orion_decode_node');

      testDecodeNode.receive({
        media: 'https://alnitak-rx.orionlabs.io/b9577f6f-668f-423b-bb9a-11d1ace77f42.ov',
        ts: 1587406431.588,
        id: '81a84c52ff91497aa6182d09e66d50f8',
        sender: '2a6d61f9023342c8855423ba36128a19',
        event_type: 'ptt',
        sender_token_hash: '388b20153a4c47b386120fc3e05c88bc',
        ptt_seqnum: '1587406432.056607',
        sender_name: 'G2347',
        ptt_id: 'fc6c96a1e09e4aeda45cc6e5babac1fe',
        eventId: 'fc6c96a1e09e4aeda45cc6e5babac1fe',
        return_type: 'url',
      });

      testHelperNode.on('input', (msg) => {
        msg.should.have.property('media');
        msg.should.have.property('media_wav');
        done();
      });
    });
  });

  it('Should decode Opus to WAV/PCM Buffer (selected)', (done) => {
    const decodeNode = {
      id: 'decodeNode',
      type: 'orion_decode',
      name: 'orion_decode_node',
      return_type: 'buffer',
      wires: [['helperNode']],
    };
    const helperNode = { id: 'helperNode', type: 'helper', name: 'helper_node' };
    const testFlow = [decodeNode, helperNode];

    helper.load(OrionNode, testFlow, {}, () => {
      const testDecodeNode = helper.getNode('decodeNode');
      const testHelperNode = helper.getNode('helperNode');
      testDecodeNode.should.have.property('name', 'orion_decode_node');

      testDecodeNode.receive({
        media: 'https://alnitak-rx.orionlabs.io/b9577f6f-668f-423b-bb9a-11d1ace77f42.ov',
        ts: 1587406431.588,
        id: '81a84c52ff91497aa6182d09e66d50f8',
        sender: '2a6d61f9023342c8855423ba36128a19',
        event_type: 'ptt',
        sender_token_hash: '388b20153a4c47b386120fc3e05c88bc',
        ptt_seqnum: '1587406432.056607',
        sender_name: 'G2347',
        ptt_id: 'fc6c96a1e09e4aeda45cc6e5babac1fe',
        eventId: 'fc6c96a1e09e4aeda45cc6e5babac1fe',
      });

      testHelperNode.on('input', (msg) => {
        msg.should.have.property('media');
        msg.should.have.property('payload');
        msg.payload.should.be.instanceOf(Buffer);
        done();
      });
    });
  });

  it('Should decode Opus to WAV/PCM Buffer (in-band)', (done) => {
    const decodeNode = {
      id: 'decodeNode',
      type: 'orion_decode',
      name: 'orion_decode_node',
      return_type: 'buffer',
      wires: [['helperNode']],
    };
    const helperNode = { id: 'helperNode', type: 'helper', name: 'helper_node' };
    const testFlow = [decodeNode, helperNode];

    helper.load(OrionNode, testFlow, {}, () => {
      const testDecodeNode = helper.getNode('decodeNode');
      const testHelperNode = helper.getNode('helperNode');
      testDecodeNode.should.have.property('name', 'orion_decode_node');

      testDecodeNode.receive({
        media: 'https://alnitak-rx.orionlabs.io/b9577f6f-668f-423b-bb9a-11d1ace77f42.ov',
        ts: 1587406431.588,
        id: '81a84c52ff91497aa6182d09e66d50f8',
        sender: '2a6d61f9023342c8855423ba36128a19',
        event_type: 'ptt',
        sender_token_hash: '388b20153a4c47b386120fc3e05c88bc',
        ptt_seqnum: '1587406432.056607',
        sender_name: 'G2347',
        ptt_id: 'fc6c96a1e09e4aeda45cc6e5babac1fe',
        eventId: 'fc6c96a1e09e4aeda45cc6e5babac1fe',
        return_type: 'buffer',
      });

      testHelperNode.on('input', (msg) => {
        msg.should.have.property('media');
        msg.should.have.property('payload');
        msg.payload.should.be.instanceOf(Buffer);
        done();
      });
    });
  });

  it('Should do nothing', (done) => {
    const testNode = {
      id: 'tn1',
      type: 'orion_decode',
      name: 'orion_decode',
      wires: [['hn1']],
    };
    const helperNode = { id: 'hn1', type: 'helper' };
    const testFlow = [testNode, helperNode];

    helper.load(OrionNode, testFlow, {}, () => {
      const tn1 = helper.getNode('tn1');
      const hn1 = helper.getNode('hn1');
      tn1.should.have.property('name', 'orion_decode');

      tn1.receive({ taco: 'burrito' });

      hn1.on('input', (msg) => {
        msg.should.have.property('taco', 'burrito');
        done();
      });
    });
  });
});

describe('OrionTranscribe', () => {
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
      const testHelperNode = helper.getNode('helperNode');

      testEncodeNode.receive({ payload: fs.readFileSync('test/test.wav') });

      testHelperNode.on('input', (msg) => {
        msg.should.have.property('transcript', 'Hey look it works, yay.');
        done();
      });
    });
  });

  it('Should do nothing', (done) => {
    const transcribeNode = {
      id: 'transcribeNode',
      type: 'orion_transcribe',
      name: 'orion_transcribe_node',
      wires: [['helperNode']],
    };
    const helperNode = { id: 'helperNode', type: 'helper', name: 'helper_node' };
    const testFlow = [transcribeNode, helperNode];

    helper.load(OrionNode, testFlow, {}, () => {
      const testTranscribeNode = helper.getNode('transcribeNode');
      const testHelperNode = helper.getNode('helperNode');

      testTranscribeNode.receive({ taco: 'burrito' });

      testHelperNode.on('input', (msg) => {
        msg.should.have.property('taco', 'burrito');
        done();
      });
    });
  });
});

describe('OrionLookup', () => {
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

  it('Should return whoami profile for a User', (done) => {
    const lookupNode = {
      id: 'lookupNode',
      type: 'orion_lookup',
      name: 'orion_lookup_node',
      orion_config: 'configNode',
      wires: [['helperNode'], [], [], []],
    };
    const configNode = {
      id: 'configNode',
      type: 'orion_config',
      name: 'orion_config_node',
      groupIds: groups,
    };
    const helperNode = { id: 'helperNode', type: 'helper', name: 'helper_node' };
    const testCreds = { username: username, password: password };

    const testFlow = [lookupNode, configNode, helperNode];

    helper.load(OrionNode, testFlow, { configNode: testCreds }, () => {
      const testLookupNode = helper.getNode('lookupNode');
      const testConfigNode = helper.getNode('configNode');
      const testHelperNode = helper.getNode('helperNode');

      testLookupNode.should.have.property('name', 'orion_lookup_node');
      testConfigNode.should.have.property('name', 'orion_config_node');

      testLookupNode.receive({ payload: 'whoami' });

      testHelperNode.on('input', (msg) => {
        msg.should.have.property('userstatus_info');
        msg.should.have.property('user_info');

        const usUserId = msg.userstatus_info.id;
        const uiUserId = msg.user_info.id;

        msg.userstatus_info.should.have.property('id', uiUserId);
        msg.user_info.should.have.property('id', usUserId);

        done();
      });
    });
  });

  it('Should get User Status for a userstatus event_type', (done) => {
    const lookupNode = {
      id: 'lookupNode',
      type: 'orion_lookup',
      name: 'orion_lookup_node',
      orion_config: 'configNode',
      wires: [['helperNode'], [], [], []],
    };
    const configNode = {
      id: 'configNode',
      type: 'orion_config',
      name: 'orion_config_node',
      groupIds: groups,
    };
    const helperNode = { id: 'helperNode', type: 'helper', name: 'helper_node' };
    const testCreds = { username: username, password: password };

    const testFlow = [lookupNode, configNode, helperNode];

    OrionClient.auth(username, password).then((resolve) => {
      const userId = resolve.id;
      helper.load(OrionNode, testFlow, { configNode: testCreds }, () => {
        const testLookupNode = helper.getNode('lookupNode');
        const testConfigNode = helper.getNode('configNode');
        const testHelperNode = helper.getNode('helperNode');

        testLookupNode.should.have.property('name', 'orion_lookup_node');
        testConfigNode.should.have.property('name', 'orion_config_node');

        testLookupNode.receive({ event_type: 'userstatus', id: userId });

        testHelperNode.on('input', (msg) => {
          msg.should.have.property('userstatus_info');
          msg.should.have.property('user_info');

          const usUserId = msg.userstatus_info.id;
          const uiUserId = msg.user_info.id;

          msg.userstatus_info.should.have.property('id', uiUserId);
          msg.user_info.should.have.property('id', usUserId);
          done();
        });
      });
    });
  });

  it('Should get User & Group Profile for a ptt event_type', (done) => {
    const lookupNode = {
      id: 'lookupNode',
      type: 'orion_lookup',
      name: 'orion_lookup_node',
      orion_config: 'configNode',
      wires: [['helperNode'], [], [], []],
    };
    const configNode = {
      id: 'configNode',
      type: 'orion_config',
      name: 'orion_config_node',
      groupIds: groups,
    };
    const helperNode = { id: 'helperNode', type: 'helper', name: 'helper_node' };
    const testCreds = { username: username, password: password };

    const testFlow = [lookupNode, configNode, helperNode];

    OrionClient.auth(username, password).then((resolve) => {
      const userId = resolve.id;
      helper.load(OrionNode, testFlow, { configNode: testCreds }, () => {
        const testLookupNode = helper.getNode('lookupNode');
        const testConfigNode = helper.getNode('configNode');
        const testHelperNode = helper.getNode('helperNode');

        testLookupNode.should.have.property('name', 'orion_lookup_node');
        testConfigNode.should.have.property('name', 'orion_config_node');

        testLookupNode.receive({ event_type: 'ptt', id: groups, sender: userId });

        testHelperNode.on('input', (msg) => {
          msg.should.have.property('userstatus_info');
          msg.should.have.property('user_info');
          msg.should.have.property('group_info');

          const usUserId = msg.userstatus_info.id;
          const uiUserId = msg.user_info.id;

          msg.userstatus_info.should.have.property('id', uiUserId);
          msg.user_info.should.have.property('id', usUserId);
          msg.group_info.should.have.property('id', groups);

          done();
        });
      });
    });
  });

  it('Should get User Profile for a msg.user', (done) => {
    const lookupNode = {
      id: 'lookupNode',
      type: 'orion_lookup',
      name: 'orion_lookup_node',
      orion_config: 'configNode',
      wires: [['helperNode'], [], [], []],
    };
    const configNode = {
      id: 'configNode',
      type: 'orion_config',
      name: 'orion_config_node',
      groupIds: groups,
    };
    const helperNode = { id: 'helperNode', type: 'helper', name: 'helper_node' };
    const testCreds = { username: username, password: password };

    const testFlow = [lookupNode, configNode, helperNode];

    OrionClient.auth(username, password).then((resolve) => {
      const userId = resolve.id;
      helper.load(OrionNode, testFlow, { configNode: testCreds }, () => {
        const testLookupNode = helper.getNode('lookupNode');
        const testConfigNode = helper.getNode('configNode');
        const testHelperNode = helper.getNode('helperNode');

        testLookupNode.should.have.property('name', 'orion_lookup_node');
        testConfigNode.should.have.property('name', 'orion_config_node');

        testLookupNode.receive({ user: userId });

        testHelperNode.on('input', (msg) => {
          msg.should.have.property('userstatus_info');
          msg.should.have.property('user_info');

          const usUserId = msg.userstatus_info.id;
          const uiUserId = msg.user_info.id;

          msg.userstatus_info.should.have.property('id', uiUserId);
          msg.user_info.should.have.property('id', usUserId);
          done();
        });
      });
    });
  });

  it('Should get Group Profile for a msg.group', (done) => {
    const lookupNode = {
      id: 'lookupNode',
      type: 'orion_lookup',
      name: 'orion_lookup_node',
      orion_config: 'configNode',
      wires: [['helperNode'], [], [], []],
    };
    const configNode = {
      id: 'configNode',
      type: 'orion_config',
      name: 'orion_config_node',
      groupIds: groups,
    };
    const helperNode = { id: 'helperNode', type: 'helper', name: 'helper_node' };
    const testCreds = { username: username, password: password };

    const testFlow = [lookupNode, configNode, helperNode];

    helper.load(OrionNode, testFlow, { configNode: testCreds }, () => {
      const testLookupNode = helper.getNode('lookupNode');
      const testConfigNode = helper.getNode('configNode');
      const testHelperNode = helper.getNode('helperNode');

      testLookupNode.should.have.property('name', 'orion_lookup_node');
      testConfigNode.should.have.property('name', 'orion_config_node');

      testLookupNode.receive({ group: groups });

      testHelperNode.on('input', (msg) => {
        msg.should.have.property('group_info');
        msg.group_info.should.have.property('id', groups);
        done();
      });
    });
  });
});

describe('OrionTranslate', () => {
  beforeEach((done) => helper.startServer(done));

  afterEach((done) => {
    helper.unload();
    helper.stopServer(done);
  });

  it('Should translate from English to Spanish', (done) => {
    const encodeNode = {
      id: 'encodeNode',
      type: 'orion_encode',
      name: 'orion_encode_node',
      wires: [['translateNode']],
    };
    const translateNode = {
      id: 'translateNode',
      type: 'orion_translate',
      name: 'orion_translate_node',
      inputlanguageCode: 'en-US',
      outputlanguageCode: 'es-MX',
      wires: [['helperNode']],
    };
    const helperNode = { id: 'helperNode', type: 'helper', name: 'helper_node' };
    const testFlow = [encodeNode, translateNode, helperNode];

    helper.load(OrionNode, testFlow, {}, () => {
      const testEncodeNode = helper.getNode('encodeNode');
      const testTranslateNode = helper.getNode('translateNode');
      const testHelperNode = helper.getNode('helperNode');

      testEncodeNode.should.have.property('name', 'orion_encode_node');
      testTranslateNode.should.have.property('name', 'orion_translate_node');
      testHelperNode.should.have.property('name', 'helper_node');

      testEncodeNode.receive({ payload: fs.readFileSync('test/test.wav') });

      testHelperNode.on('input', (msg) => {
        msg.should.have.property('translation');
        msg.translation.should.have.property('transcript');
        //msg.translation.transcript.should.match(/mira/);
        msg.translation.should.have.property('translated_text');
        msg.translation.translated_text.should.match(/mira/);
        done();
      });
    });
  });

  it('Should do nothing', (done) => {
    const translateNode = {
      id: 'orion_translate_id',
      type: 'orion_translate',
      name: 'orion_translate_name',
      inputlanguageCode: 'en-US',
      outputlanguageCode: 'es-MX',
      wires: [['helper_id']],
    };
    const helperNode = { id: 'helper_id', type: 'helper', name: 'helper_name' };
    const testFlow = [translateNode, helperNode];

    helper.load(OrionNode, testFlow, {}, () => {
      const testTranslateNode = helper.getNode('orion_translate_id');
      const testHelperNode = helper.getNode('helper_id');

      testTranslateNode.should.have.property('name', 'orion_translate_name');
      testHelperNode.should.have.property('name', 'helper_name');

      testTranslateNode.receive({ taco: 'burrito' });

      testHelperNode.on('input', (msg) => {
        msg.should.have.property('taco', 'burrito');
        done();
      });
    });
  });
});

describe('OrionRXNode', () => {
  const username = process.env.TEST_ORION_USERNAME;
  const password = process.env.TEST_ORION_PASSWORD;
  const groups = process.env.TEST_ORION_GROUPS;

  beforeEach((done) => helper.startServer(done));

  afterEach((done) => {
    helper.unload();
    helper.stopServer(done);
  });

  it('Should receive a PTT Event', (done) => {
    const orionRXNode = {
      id: 'orion_rx_id',
      type: 'orion_rx',
      name: 'orion_rx_name',
      orion_config: 'orion_config_id',
      verbosity: 'passive',
      wires: [['helper_id'], [], [], []],
    };
    const orionTXNode = {
      id: 'orion_tx_id',
      type: 'orion_tx',
      name: 'orion_tx_name',
      orion_config: 'orion_config_id',
    };
    const orionConfigNode = {
      id: 'orion_config_id',
      type: 'orion_config',
      name: 'orion_config_name',
      groupIds: groups,
    };
    const helperNode = { id: 'helper_id', type: 'helper', name: 'helper_name' };
    const testCreds = { username: username, password: password };

    const testFlow = [orionRXNode, orionTXNode, orionConfigNode, helperNode];

    helper.load(OrionNode, testFlow, { orion_config_id: testCreds }, () => {
      const testTXNode = helper.getNode('orion_tx_id');
      const testHelperNode = helper.getNode('helper_id');
      helper.getNode('orion_rx_id');

      testTXNode.receive({
        unitTest: 'ptt',
        message: 'unit_test',
      });

      testHelperNode.on('input', (msg) => {
        msg.should.have.property('event_type');
        done();
      });
    });
  });

  it('Should receive a Text Event', (done) => {
    const orionRXNode = {
      id: 'orion_rx_id',
      type: 'orion_rx',
      name: 'orion_rx_name',
      orion_config: 'orion_config_id',
      verbosity: 'passive',
      wires: [['helper_id'], [], [], []],
    };
    const orionTXNode = {
      id: 'orion_tx_id',
      type: 'orion_tx',
      name: 'orion_tx_name',
      orion_config: 'orion_config_id',
    };
    const orionConfigNode = {
      id: 'orion_config_id',
      type: 'orion_config',
      name: 'orion_config_name',
      groupIds: groups,
    };
    const helperNode = { id: 'helper_id', type: 'helper', name: 'helper_name' };
    const testCreds = { username: username, password: password };

    const testFlow = [orionRXNode, orionTXNode, orionConfigNode, helperNode];

    helper.load(OrionNode, testFlow, { orion_config_id: testCreds }, () => {
      const testTXNode = helper.getNode('orion_tx_id');
      const testHelperNode = helper.getNode('helper_id');
      helper.getNode('orion_rx_id');

      testTXNode.receive({
        event_type: 'text',
        payload: 'unit_test',
        unitTest: 'text',
        unitTestSleep: 15000,
      });

      testHelperNode.on('input', (msg) => {
        msg.should.have.property('event_type', 'text');
        done();
      });
    });
  });

  it('Should receive PTT Events from ALL', (done) => {
    const orionRXNode = {
      id: 'orion_rx_id',
      type: 'orion_rx',
      name: 'orion_rx_name',
      orion_config: 'orion_config_id',
      wires: [['helper_node'], [], [], []],
    };
    const orionTXNode = {
      id: 'orion_tx_id',
      type: 'orion_tx',
      name: 'orion_tx_name',
      orion_config: 'orion_config_id',
    };
    const orionConfigNode = {
      id: 'orion_config_id',
      type: 'orion_config',
      name: 'orion_config_name',
      groupIds: 'ALL',
    };
    const helperNode = { id: 'helper_node', type: 'helper', name: 'helper_name' };
    const testCreds = { username: username, password: password };

    const testFlow = [orionRXNode, orionTXNode, orionConfigNode, helperNode];

    helper.load(OrionNode, testFlow, { orion_config_id: testCreds }, () => {
      const testRXNode = helper.getNode('orion_rx_id');
      const testTXNode = helper.getNode('orion_tx_id');
      const testConfigNode = helper.getNode('orion_config_id');
      const testHelperNode = helper.getNode('helper_node');

      testRXNode.should.have.property('name', 'orion_rx_name');
      testTXNode.should.have.property('name', 'orion_tx_name');
      testConfigNode.should.have.property('name', 'orion_config_name');

      // Send a TTS 'message' to Orion TX Node
      testTXNode.receive({
        unitTest: 'ptt',
        message: 'unit_test',
      });

      testHelperNode.on('input', (msg) => {
        msg.should.have.property('event_type', 'ptt');
        done();
      });
    });
  });
});

describe('OrionTXNode', () => {
  const username = process.env.TEST_ORION_USERNAME;
  const password = process.env.TEST_ORION_PASSWORD;
  const groups = process.env.TEST_ORION_GROUPS;

  beforeEach((done) => helper.startServer(done));

  afterEach((done) => {
    helper.unload();
    helper.stopServer(done);
  });
  /*
  it('Auth Credentials should be set', (done) => {
    should.exist(username);
    should.exist(password);
    should.exist(groups);
    done();
  });
*/

  it('Should send unit_test message as a PTT event', (done) => {
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
      tn1.receive({ message: 'unitTest', unitTest: 'ptt' });

      tn1.on('call:warn', (call) => {
        call.should.be.calledWithExactly('ptt');
        done();
      });
    });
  });

  it('Should set userstatus', (done) => {
    const testTXNode = {
      id: 'testTXNode',
      type: 'orion_tx',
      name: 'orion_tx_node',
      orion_config: 'testConfig',
    };
    const testConfig = {
      id: 'testConfig',
      type: 'orion_config',
      name: 'orion_config_node',
      groupIds: groups,
    };
    const testCreds = { username: username, password: password };

    const testFlow = [testTXNode, testConfig];
    OrionClient.auth(username, password).then((resolve) => {
      const userId = resolve.id;
      helper.load(OrionNode, testFlow, { testConfig: testCreds }, () => {
        let tn1 = helper.getNode('testTXNode');
        let tc1 = helper.getNode('testConfig');
        tn1.should.have.property('name', 'orion_tx_node');
        tc1.should.have.property('name', 'orion_config_node');

        tn1.receive({
          unitTest: 'userstatus',
          event_type: 'userstatus',
          id: userId,
          location: { lat: 1.2, lng: 3.4 },
        });

        tn1.on('call:warn', (call) => {
          call.should.be.calledWithExactly('userstatus');
          done();
        });
      });
    });
  });

  it('Should fail to set userstatus', (done) => {
    const testTXNode = {
      id: 'testTXNode',
      type: 'orion_tx',
      name: 'orion_tx_node',
      orion_config: 'testConfig',
    };
    const testConfig = {
      id: 'testConfig',
      type: 'orion_config',
      name: 'orion_config_node',
      groupIds: groups,
    };
    const testCreds = { username: username, password: password };

    const testFlow = [testTXNode, testConfig];
    OrionClient.auth(username, password).then((resolve) => {
      const userId = resolve.id;
      helper.load(OrionNode, testFlow, { testConfig: testCreds }, () => {
        let tn1 = helper.getNode('testTXNode');
        let tc1 = helper.getNode('testConfig');
        tn1.should.have.property('name', 'orion_tx_node');
        tc1.should.have.property('name', 'orion_config_node');

        tn1.receive({
          unitTest: 'userstatus',
          event_type: 'userstatus',
          id: userId,
          location: { lat: 1.2, lng: 'taco' },
        });

        tn1.on('call:error', (call) => {
          call.should.be.called();
          done();
        });
      });
    });
  });

  it('Should send unit_test message as a Text event', (done) => {
    const testTXNode = {
      id: 'testTXNode',
      type: 'orion_tx',
      name: 'orion_tx_node',
      orion_config: 'testConfig',
    };
    const testConfig = {
      id: 'testConfig',
      type: 'orion_config',
      name: 'orion_config_node',
      groupIds: groups,
    };
    const testCreds = { username: username, password: password };

    const testFlow = [testTXNode, testConfig];
    helper.load(OrionNode, testFlow, { testConfig: testCreds }, () => {
      let tn1 = helper.getNode('testTXNode');
      let tc1 = helper.getNode('testConfig');
      tn1.should.have.property('name', 'orion_tx_node');
      tc1.should.have.property('name', 'orion_config_node');

      tn1.receive({
        unitTest: 'text',
        event_type: 'text',
        payload: 'unit_test',
      });

      tn1.on('call:warn', (call) => {
        call.should.be.calledWithExactly('text');
        done();
      });
    });
  });

  it('Should not send unit_test message as an Image event', (done) => {
    const orionTXNode = {
      id: 'orion_tx_id',
      type: 'orion_tx',
      name: 'orion_tx_name',
      orion_config: 'orion_config_id',
    };
    const orionConfigNode = {
      id: 'orion_config_id',
      type: 'orion_config',
      name: 'orion_config_name',
      groupIds: groups,
    };
    const orionCreds = { username: username, password: password };
    const testFlow = [orionTXNode, orionConfigNode];
    helper.load(OrionNode, testFlow, { orion_config_id: orionCreds }, () => {
      let testTXNode = helper.getNode('orion_tx_id');

      testTXNode.receive({
        unitTest: 'image',
        event_type: 'image',
        payload: Buffer.from([]),
        mimeType: 'invalid',
      });

      testTXNode.on('call:error', (call) => {
        call.should.be.called();
        done();
      });
    });
  });

  it('Should send unit_test message as a PTT event to ALL', (done) => {
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
      groupIds: 'ALL',
    };
    const testCreds = { username: username, password: password };

    const testFlow = [testTXNode, testConfig];

    helper.load(OrionNode, testFlow, { tc1: testCreds }, () => {
      let tn1 = helper.getNode('tn1');
      let tc1 = helper.getNode('tc1');
      tn1.should.have.property('name', 'orion_tx');
      tc1.should.have.property('name', 'orion_config');
      tn1.receive({ message: 'unitTest', unitTest: 'ptt' });

      tn1.on('call:warn', (call) => {
        call.should.be.calledWithExactly('ptt');
        done();
      });
    });
  });

  it('Should send unit_test message as a Text event to ALL', (done) => {
    const testTXNode = {
      id: 'testTXNode',
      type: 'orion_tx',
      name: 'orion_tx_node',
      orion_config: 'testConfig',
    };
    const testConfig = {
      id: 'testConfig',
      type: 'orion_config',
      name: 'orion_config_node',
      groupIds: 'ALL',
    };
    const testCreds = { username: username, password: password };

    const testFlow = [testTXNode, testConfig];
    helper.load(OrionNode, testFlow, { testConfig: testCreds }, () => {
      let tn1 = helper.getNode('testTXNode');
      let tc1 = helper.getNode('testConfig');
      tn1.should.have.property('name', 'orion_tx_node');
      tc1.should.have.property('name', 'orion_config_node');

      tn1.receive({
        unitTest: 'text',
        event_type: 'text',
        payload: 'unit_test',
      });

      tn1.on('call:warn', (call) => {
        call.should.be.calledWithExactly('text');
        done();
      });
    });
  });

  it('Should send unit_test message as a Text event to ALL (pass by msg)', (done) => {
    const testTXNode = {
      id: 'testTXNode',
      type: 'orion_tx',
      name: 'orion_tx_node',
      orion_config: 'testConfig',
    };
    const testConfig = {
      id: 'testConfig',
      type: 'orion_config',
      name: 'orion_config_node',
      groupIds: 'xxx',
    };
    const testCreds = { username: username, password: password };

    const testFlow = [testTXNode, testConfig];
    helper.load(OrionNode, testFlow, { testConfig: testCreds }, () => {
      let tn1 = helper.getNode('testTXNode');
      let tc1 = helper.getNode('testConfig');
      tn1.should.have.property('name', 'orion_tx_node');
      tc1.should.have.property('name', 'orion_config_node');

      tn1.receive({
        unitTest: 'text',
        event_type: 'text',
        payload: 'unit_test',
        groupIds: 'ALL', // <-- testing this
      });

      tn1.on('call:warn', (call) => {
        call.should.be.calledWithExactly('text');
        done();
      });
    });
  });

  it('Should send test media as a PTT event', (done) => {
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
    const fileName = 'test/test.ov';

    OrionClient.auth(username, password).then((resolve) => {
      resolve.should.be.instanceOf(Object);
      return OrionClient.uploadMedia(fileName).then((response) => {
        const media = response;
        helper.load(OrionNode, testFlow, { tc1: testCreds }, () => {
          let tn1 = helper.getNode('tn1');
          let tc1 = helper.getNode('tc1');
          tn1.should.have.property('name', 'orion_tx');
          tc1.should.have.property('name', 'orion_config');
          tn1.receive({ media: media, unitTest: 'ptt' });

          tn1.on('call:warn', (call) => {
            call.should.be.calledWithExactly('ptt');
            done();
          });
        });
      });
    });
  });

  it('Should send an Image', (done) => {
    const testTXNode = {
      id: 'testTXNode',
      type: 'orion_tx',
      name: 'orion_tx_node',
      orion_config: 'testConfig',
    };
    const testConfig = {
      id: 'testConfig',
      type: 'orion_config',
      name: 'orion_config_node',
      groupIds: groups,
    };
    const testCreds = { username: username, password: password };

    const testFlow = [testTXNode, testConfig];
    helper.load(OrionNode, testFlow, { testConfig: testCreds }, () => {
      let tn1 = helper.getNode('testTXNode');
      let tc1 = helper.getNode('testConfig');
      tn1.should.have.property('name', 'orion_tx_node');
      tc1.should.have.property('name', 'orion_config_node');

      tn1.receive({
        unitTest: 'image',
        event_type: 'image',
        payload: new Uint8Array(fs.readFileSync('test/test_input_image.png')),
      });

      tn1.on('call:warn', (call) => {
        call.should.be.calledWithExactly('image');
        //console.log(call);
        done();
      });
    });
  });

  it('Should not send an Image', (done) => {
    const testTXNode = {
      id: 'testTXNode',
      type: 'orion_tx',
      name: 'orion_tx_node',
      orion_config: 'testConfig',
    };
    const testConfig = {
      id: 'testConfig',
      type: 'orion_config',
      name: 'orion_config_node',
      groupIds: groups,
    };
    const testCreds = { username: username, password: password };

    const testFlow = [testTXNode, testConfig];
    helper.load(OrionNode, testFlow, { testConfig: testCreds }, () => {
      let tn1 = helper.getNode('testTXNode');
      let tc1 = helper.getNode('testConfig');
      tn1.should.have.property('name', 'orion_tx_node');
      tc1.should.have.property('name', 'orion_config_node');

      tn1.receive({
        unitTest: 'image',
        event_type: 'image',
        payload: new Uint8Array(fs.readFileSync('test/test_input_image.png')),
        mimeType: 'invalid',
      });

      tn1.on('call:error', (call) => {
        call.should.be.called();
        done();
      });
    });
  });
});
