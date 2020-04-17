#!/usr/bin/env node
/*
Orion Node-RED Nodes.

Author:: Greg Albrecht <gba@orionlabs.io>
Copyright:: Copyright 2020 Orion Labs, Inc.
License:: Apache License, Version 2.0
Source:: https://github.com/orion-labs/node-red-contrib-orion
*/

// 'use strict';

// const OrionClient = require('@orionlabs/node-orion');
const OrionClient = require('./../node-orion/src/main');

module.exports = function(RED) {
  /**
   * Meta-Node for containing other Node-level configurations.
   * This node would not appear in a Pallet or within a Flow, and instead
   * is used by the OrionRXNode, OrionTXNode & OrionLookupNode to provide
   * credentials to the Orion service.
   * @param config {Object} Orion Configuration
   * @constructor
  */
  function OrionConfig(config) {
    RED.nodes.createNode(this, config);
    this.username = config.username;
    this.password = config.password;
    this.groupIds = config.groupIds;
  }
  RED.nodes.registerType('orion_config', OrionConfig,
      {credentials: {username: {type: 'text'}, password: {type: 'text'}}});

  /**
   * Node for Transmitting (TX) events to Orion.
   * @constructor
   * @param {config} config - FIXME
  */
  function OrionTXNode(config) {
    RED.nodes.createNode(this, config);
    const node = this;

    node.orion_config = RED.nodes.getNode(config.orion_config);
    node.username = node.orion_config.credentials.username;
    node.password = node.orion_config.credentials.password;
    node.groupIds = node.orion_config.groupIds;

    node.status({fill: 'yellow', shape: 'dot', text: 'Idle'});

    node.on('input', (msg) => {
      if (msg.hasOwnProperty('event_type') &&
          msg.event_type === 'userstatus') {
        // Handle "userstatus" Event...
        OrionClient.updateUserStatus(node.username, node.password,
            msg.userstatus)
            .then((resolve, reject) => {
              if (resolve) {
                node.status(
                    {fill: 'green', shape: 'dot', text: 'Updated userstatus'});
                console.log(
                    `${new Date().toISOString()} resolve=${resolve}`);
              } else if (reject) {
                console.error(
                    `${new Date().toISOString()} reject=${reject}`);
              }
            })
            .catch((error) => {
              console.log(
                  `${new Date().toISOString()} error=${error}`);
            });
        node.status({fill: 'yellow', shape: 'dot', text: 'Idle'});
      } else {
        // Handle "PTT" Event...
        let useAllGroups;
        let groupIds = [];
        const target = msg.target_self ? userId : msg.target;

        // Enter as a String, exit as an Array.
        if (msg.hasOwnProperty('groupIds') &&
            typeof msg.groupIds === 'string' && msg.groupIds === 'ALL') {
          useAllGroups = true;
        } else if (msg.hasOwnProperty('groupIds') &&
          typeof msg.groupIds === 'string') {
          useAllGroups = false;
          groupIds = msg.groupIds.replace(/(\r\n|\n|\r)/gm, '').split(',');
        } else if (typeof node.groupIds === 'string' &&
            node.groupIds === 'ALL') {
          useAllGroups = true;
        } else if (typeof node.groupIds === 'string') {
          groupIds = node.groupIds.replace(/(\r\n|\n|\r)/gm,
              '').split(',');
        }

        node.status({fill: 'green', shape: 'dot', text: 'Transmitting'});

        OrionClient.auth(node.username, node.password).then(
            (auth) => {
              const token = auth.token;

              if (useAllGroups) {
                OrionClient.getAllUserGroups(token).then((result, error) => {
                  /* FIXME This probably won't populate groupIds because
                      it's not async.
                   */
                  result.groups.forEach((group) => groupIds.push(group.id));
                  OrionClient.utils.lyre(
                      token, groupIds, msg.message, msg.media, target);
                });
              } else {
                OrionClient.utils.lyre(
                    token, groupIds, msg.message, msg.media, target);
              }
            });
        node.status({fill: 'yellow', shape: 'dot', text: 'Idle'});
      }
      Promise.resolve()
          .then(() => {
            if (msg.message === 'unit_test') {
              this.warn('unit_test');
            }
          });
    });

    node.on('close', () => {});
  }
  RED.nodes.registerType('orion_tx', OrionTXNode,
      {credentials: {username: {type: 'text'}, password: {type: 'text'}}});

  /**
   * Node for Receiving (RX) events from Orion.
   * @param config {OrionConfig} Orion Config Meta-Node.
   * @constructor
   */
  function OrionRXNode(config) {
    RED.nodes.createNode(this, config);
    const node = this;
    let ws;
    const verbosity = config.verbosity;
    const ignoreSelf = config.ignoreSelf;

    node.orion_config = RED.nodes.getNode(config.orion_config);
    node.username = node.orion_config.credentials.username;
    node.password = node.orion_config.credentials.password;

    node.status({fill: 'red', shape: 'dot', text: 'Disconnected'});

    const resolveGroups = (token) => {
      return new Promise((resolve, reject) => {
        if (node.orion_config.groupIds === 'ALL') {
          OrionClient.getAllUserGroups(token)
            .then((resolve, reject) => {
              const _groups = [];
              resolve.forEach((group) => _groups.push(group.id));
              return _groups;
            });
        } else {
          resolve(node.orion_config.groupIds.replace(/(\r\n|\n|\r)/gm,
            '').split(','));
        }
      });
    };

    OrionClient.auth(node.username, node.password).then((resolve, reject) => {
      const token = resolve.token;
      resolveGroups(token).then((resolve, reject) => {
        OrionClient.engage(token, resolve).then((resolve, reject) => {
          OrionClient.connectToWebsocket(token).then((websocket) => {
            ws = websocket;

            websocket.onmessage = (data, flags, number) => {
              const eventData = JSON.parse(data.data);

              /* console.debug(
                  `${new Date().toISOString()} ` +
                  `ws.onmessage ` +
                  `eventData.event_type=${eventData.event_type} ` +
                  `event_data.eventId=${eventData.eventId}`,
              ); */

              switch (eventData.event_type) {
                case 'ptt':
                  // Handle PTT Events
                  /*
                  If 'ignoreSelf' is False: Send PTTs (target and group).
                  if 'ignoreSelf' is True: Send PTTs (target and group) as
                    long as they ARE NOT from me! (Stop hitting yourself!)
                  */
                  if (!ignoreSelf || userId !== eventData.sender) {
                    node.send([
                      eventData, // Output 0 (all)
                      eventData, // Output 1 (ptt)
                      null, // Output 2 (userstatus)
                      // 'target_user_id' is only set on direct/target messages
                      // Output 3 (direct/target)
                      eventData.hasOwnProperty(
                          'target_user_id') ? eventData : null,
                    ]);
                  }
                  break;
                case 'userstatus':
                  // Handle Userstatus Events
                  if (!ignoreSelf || userId !== eventData.id) {
                    node.send([eventData, null, eventData, null]);
                  }
                  break;
                case 'ping':
                  // Handle Ping Events
                  OrionClient.pong(token)
                      .then((resolve, reject) => {
                        node.status(
                            {fill: 'green', shape: 'dot', text: 'Engaged'});
                      })
                      .catch((resolve, reject) => {
                        node.status({
                          fill: 'yellow', shape: 'dot', text: 'Re-engaging'});
                        OrionClient.engage(token, groups)
                            .then((resolve, reject) => {
                              node.status({
                                fill: 'green', shape: 'dot', text: 'Engaged'});
                            })
                            .catch((resolve, reject) => {
                              new Error('Unable to re-engage');
                            });
                      });
                  break;
                default:
                  // Handle undefined Events
                  node.send([eventData, null, null, null]);
                  break;
              }
              node.status(
                  {fill: 'yellow', shape: 'dot', text: 'Connected & Idle'});
            };

            websocket.onclose = (event) => {
              console.warn(
                  `${new Date().toISOString()} ${node.id} ` +
                  `ws.onclose err=${event.code}`);
              if (event.code !== 4158) {
                console.warn(
                    `${new Date().toISOString()} ${node.id} Closing.`);
                websocket = null;
                ws = null;
              }
            };
          });
        });
      });
    });

    node.on('close', () => {
      node.debug(`${node.id} Closing OrionRX.`);
      try {
        ws.close(4158);
      } catch (err) {
        console.error(
            `${new Date().toISOString()} ${node.id} Caught err=${err}`);
      }
      node.status({fill: 'red', shape: 'dot', text: 'Disconnected'});
    });
  }
  RED.nodes.registerType('orion_rx', OrionRXNode, {
    credentials: {
      username: {type: 'text'},
      password: {type: 'text'},
      groupIds: {type: 'text'}}});

  /**
   * Node for encoding PCM/WAV to Orion Opus.
   * @param config
   * @constructor
   */
  function OrionEncode(config) {
    RED.nodes.createNode(this, config);
    const node = this;

    node.status({fill: 'yellow', shape: 'dot', text: 'Idle'});

    node.on('input', (msg) => {
      if (msg.hasOwnProperty('payload')) {
        node.status({fill: 'green', shape: 'dot', text: 'Encoding'});
        OrionClient.utils.wav2ov(msg).then((resolve, reject) => {
          node.send(resolve);
        });
        node.status({fill: 'yellow', shape: 'dot', text: 'Idle'});
      } else {
        node.send(msg);
      }
    });
  }
  RED.nodes.registerType('orion_encode', OrionEncode);

  /**
   * Node for transcribing Orion Audio to Text.
   * @param config
   * @constructor
   */
  function OrionTranscribe(config) {
    RED.nodes.createNode(this, config);
    const node = this;

    node.status({fill: 'yellow', shape: 'dot', text: 'Idle'});

    node.on('input', (msg) => {
      if (msg.hasOwnProperty('media')) {
        node.status({fill: 'green', shape: 'dot', text: 'Encoding'});
        OrionClient.utils.stt(msg).then((resolve, reject) => {
          node.send(resolve);
        });
        node.status({fill: 'yellow', shape: 'dot', text: 'Idle'});
      } else {
        node.send(msg);
      }
    });
  }
  RED.nodes.registerType('orion_transcribe', OrionTranscribe);

  /**
   * Node for translating Orion Audio events between languages.
   * @param config {OrionConfig}
   * @constructor
   */
  function OrionTranslate(config) {
    RED.nodes.createNode(this, config);
    const node = this;

    node.status({fill: 'yellow', shape: 'dot', text: 'Idle'});

    node.on('input', (msg) => {
      if (msg.hasOwnProperty('media')) {
        node.status({fill: 'green', shape: 'dot', text: 'Translating'});
        msg.input_lang = config.inputlanguageCode;
        msg.output_lang = config.outputlanguageCode;
        OrionClient.utils.translate(msg, (response) => node.send(response));
        node.status({fill: 'yellow', shape: 'dot', text: 'Idle'});
      } else {
        node.send(msg);
      }
    });
  }
  RED.nodes.registerType('orion_translate', OrionTranslate);

  /**
   * Decode Orion Opus files to WAV/PCM.
   * @param config
   * @constructor
   */
  function OrionDecode(config) {
    RED.nodes.createNode(this, config);
    const node = this;

    node.status({fill: 'yellow', shape: 'dot', text: 'Idle'});

    node.on('input', (msg) => {
      if (msg.hasOwnProperty('event_type') && msg.event_type === 'ptt') {
        node.status({fill: 'green', shape: 'dot', text: 'Decoding'});
        msg.return_type = config.return_type;
        OrionClient.utils.ov2wav(msg, (response) => node.send(response));
        node.status({fill: 'yellow', shape: 'dot', text: 'Idle'});
      } else {
        node.send(msg);
      }
    });
  }
  RED.nodes.registerType('orion_decode', OrionDecode);

  /**
   * Node for looking-up Orion User & Group Profiles.
   * @param config {OrionConfig}
   * @constructor
   */
  function OrionLookup(config) {
    RED.nodes.createNode(this, config);
    const node = this;

    node.orion_config = RED.nodes.getNode(config.orion_config);

    node.username = node.orion_config.credentials.username;
    node.password = node.orion_config.credentials.password;

    node.status({fill: 'yellow', shape: 'dot', text: 'Idle'});

    node.on('input', (msg) => {
      OrionClient.auth(node.username, node.password).then(
        (resolve, reject) => {
          const token = resolve.token;
          node.status({fill: 'blue', shape: 'dot', text: 'Lookup'});

          if (msg.payload && msg.payload === 'whoami') {
            OrionClient.whoami(token).then((resolve, reject) => {
              msg.user_info = resolve;
              const userId = resolve.id;
              OrionClient.getUserStatus(token, userId)
                .then((resolve, reject) => {
                  msg.userstatus_info = resolve;
                  node.send(msg);
                });
            });
          } else if (msg.event_type && msg.event_type === 'userstatus') {
            const userId = msg.id;
            OrionClient.getUser(token, userId).then((resolve, reject) => {
              msg.user_info = resolve;
              OrionClient.getUserStatus(token, userId)
                .then((resolve, reject) => {
                  msg.userstatus_info = resolve;
                  node.send(msg);
                });
            });
          } else if (msg.event_type && msg.event_type === 'ptt') {
            const groupId = msg.id;
            const userId = msg.sender;
            OrionClient.getGroup(token, groupId).then((resolve, reject) => {
              msg.group_info = resolve;
              OrionClient.getUser(token, userId)
                .then((resolve, reject) => {
                  msg.user_info = resolve;
                  OrionClient.getUserStatus(token, userId)
                    .then((resolve, reject) => {
                      msg.userstatus_info = resolve;
                      node.send(msg);
                    });
                });
            });
          } else if (msg.group) {
            const groupId = msg.group;
            OrionClient.getGroup(token, groupId).then((resolve, reject) => {
              msg.group_info = resolve;
              node.send(msg);
            });
          } else if (msg.user) {
            const userId = msg.user;
            OrionClient.getUser(token, userId).then((resolve, reject) => {
              msg.user_info = resolve;
              node.send(msg);
            });
          }
          node.status({fill: 'yellow', shape: 'dot', text: 'Idle'});
        });
    });

    node.on('close', () => {});
  }
  RED.nodes.registerType('orion_lookup', OrionLookup, {
    credentials: {username: { type: 'text' }, password: { type: 'text' }}});
};
