#!/usr/bin/env node
/**
 * Orion Node-RED Nodes.
 *
 * @module node-red-contrib-orion
 * @author Greg Albrecht <gba@orionlabs.io>
 * @copyright Orion Labs, Inc. https://www.orionlabs.io
 * @license Apache-2.0
 */

'use strict';

module.exports = function (RED) {
  const OrionClient = require('@orionlabs/node-orion');

  let OrionCrypto = false;
  try {
    require.resolve('@orionlabs/node-orion-crypto');
    OrionCrypto = require('@orionlabs/node-orion-crypto');
  } catch (exception) {
    OrionCrypto = false;
  }

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
  RED.nodes.registerType('orion_config', OrionConfig, {
    credentials: { username: { type: 'text' }, password: { type: 'text' } },
  });

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

    node.status({ fill: 'yellow', shape: 'dot', text: 'Idle' });

    const resolveGroups = (token, msg) => {
      return new Promise((resolve) => {
        if (msg.groupIds && typeof msg.groupIds === 'string' && msg.groupIds === 'ALL') {
          OrionClient.getAllUserGroups(token).then((response) => {
            const _groups = [];
            response.forEach((group) => _groups.push(group.id));
            resolve(_groups);
          });
        } else if (msg.groupIds && typeof msg.groupIds === 'string') {
          let _groups = msg.groupIds.replace(/(\r\n|\n|\r)/gm, '').split(',');
          resolve(_groups);
        } else if (typeof node.groupIds === 'string' && node.groupIds === 'ALL') {
          OrionClient.getAllUserGroups(token).then((response) => {
            const _groups = [];
            response.forEach((group) => _groups.push(group.id));
            resolve(_groups);
          });
        } else if (typeof node.groupIds === 'string') {
          let _groups = node.groupIds.replace(/(\r\n|\n|\r)/gm, '').split(',');
          resolve(_groups);
        }
      });
    };

    node.on('input', (msg) => {
      switch (msg.event_type) {
        case 'userstatus':
          OrionClient.auth(node.username, node.password).then((resolve) => {
            const token = resolve.token;
            OrionClient.updateUserStatus(token, msg)
              .then((resolve, reject) => {
                if (resolve) {
                  node.status({
                    fill: 'green',
                    shape: 'dot',
                    text: 'Updated userstatus',
                  });
                  console.log(`${new Date().toISOString()} resolve=${resolve}`);
                } else if (reject) {
                  console.error(`${new Date().toISOString()} reject=${reject}`);
                }
              })
              .catch((error) => {
                console.log(`${new Date().toISOString()} error=${error}`);
              });
          });
          node.status({ fill: 'yellow', shape: 'dot', text: 'Idle' });
          break;
        case 'text':
          OrionClient.auth(node.username, node.password).then((response) => {
            const token = response.token;

            resolveGroups(token, msg).then((response) => {
              let groups = response;
              groups.forEach((value) => {
                const groupId = value;

                let streamKey;
                if (OrionCrypto) {
                  streamKey = OrionCrypto.utils.generateStreamKey();
                  msg.cipherPayload = OrionCrypto.encryptText(streamKey, msg.payload);
                }

                OrionClient.sendTextMessage(
                  token,
                  msg.cipherPayload || msg.payload,
                  groupId,
                  streamKey,
                )
                  .then(() => {
                    node.status({
                      fill: 'green',
                      shape: 'dot',
                      text: 'Multimedia Text Message Sent!',
                    });
                  })
                  .catch((result) => console.log(result));
              });
            });
          });
          node.status({ fill: 'yellow', shape: 'dot', text: 'Idle' });
          break;
        default:
          // Handle "PTT" Event...
          node.status({ fill: 'green', shape: 'dot', text: 'Transmitting' });

          OrionClient.auth(node.username, node.password).then((resolve) => {
            const token = resolve.token;
            const userId = resolve.id;

            const target = msg.target_self ? userId : msg.target;

            resolveGroups(token, msg).then((resolve) => {
              let groups = resolve;
              OrionClient.utils
                .lyre(token, groups, msg.message, msg.media, target)
                .then((resolve) => node.send(resolve));
            });
          });
          break;
      }

      node.status({ fill: 'yellow', shape: 'dot', text: 'Idle' });

      Promise.resolve().then(() => {
        if (msg.unitTest) {
          this.warn(msg.unitTest);
        }
      });
    });

    node.on('close', () => {});
  }
  RED.nodes.registerType('orion_tx', OrionTXNode, {
    credentials: { username: { type: 'text' }, password: { type: 'text' } },
  });

  /**
   * Node for Receiving (RX) events from Orion.
   * @param config {OrionConfig} Orion Config Meta-Node.
   * @constructor
   */
  function OrionRXNode(config) {
    RED.nodes.createNode(this, config);
    const node = this;
    const verbosity = config.verbosity;
    const ignoreSelf = config.ignoreSelf;

    let ws;

    const idleTimeout = process.env.PONG_TIMEOUT || 200000;

    node.orion_config = RED.nodes.getNode(config.orion_config);
    node.username = node.orion_config.credentials.username;
    node.password = node.orion_config.credentials.password;

    node.status({ fill: 'red', shape: 'dot', text: 'Disconnected' });

    const resolveGroups = (token) => {
      return new Promise((resolve) => {
        if (node.orion_config.groupIds === 'ALL') {
          OrionClient.getAllUserGroups(token).then((response) => {
            const _groups = [];
            response.forEach((group) => _groups.push(group.id));
            resolve(_groups);
          });
        } else {
          resolve(node.orion_config.groupIds.replace(/(\r\n|\n|\r)/gm, '').split(','));
        }
      });
    };

    OrionClient.auth(node.username, node.password).then((resolve) => {
      const token = resolve.token;
      const userId = resolve.id;

      resolveGroups(token).then((resolve) => {
        const groups = resolve;

        OrionClient.connectToWebsocket(token).then((websocket) => {
          ws = websocket;
          node.status({ fill: 'green', shape: 'dot', text: 'Connected' });

          OrionClient.engage(token, groups, verbosity).then(() => {
            node.status({ fill: 'green', shape: 'dot', text: 'Engaged' });
          });

          const pongWS = () => {
            node.status({ fill: 'yellow', shape: 'dot', text: 'Pong' });
            OrionClient.pong(token)
              .then(() => {
                node.status({ fill: 'green', shape: 'dot', text: 'Pong' });
              })
              .catch(() => {
                node.status({
                  fill: 'red',
                  shape: 'dot',
                  text: 'Pong Failed',
                });
                ws.reconnect(4001, 'Pong Failed');
              });
          };

          let pongTimeout = setTimeout(pongWS, idleTimeout);

          websocket.addEventListener('open', () => {
            OrionClient.engage(token, groups, verbosity).then(() => {
              node.status({ fill: 'green', shape: 'dot', text: 'Engaged' });
            });
          });

          websocket.addEventListener('message', (data) => {
            node.status({ fill: 'green', shape: 'square', text: 'Receiving Event' });

            clearTimeout(pongTimeout);
            pongTimeout = setTimeout(pongWS, idleTimeout);

            const eventData = JSON.parse(data.data);

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
                    eventData.target_user_id ? eventData : null,
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
                pongWS();
                // Maybe people want to see ping events?
                node.send([eventData, null, null, null]);
                break;
              case 'text':
                if (OrionCrypto) {
                  OrionCrypto.decryptEvent(eventData).then((event) => {
                    node.send([event, null, null, null]);
                  });
                } else {
                  node.send([eventData, null, null, null]);
                }
                break;
              default:
                // Handle undefined Events (including multimedia).
                node.send([eventData, null, null, null]);
                break;
            }
            node.status({ fill: 'yellow', shape: 'dot', text: 'Idle' });
          });
        });
      });
    });

    node.on('close', () => {
      node.debug(`${node.id} Closing OrionRX.`);
      try {
        ws.close(4158);
      } catch (err) {
        console.error(`${new Date().toISOString()} ${node.id} WebSocket Caught err=${err}`);
      }
      node.status({ fill: 'red', shape: 'dot', text: 'Disconnected' });
    });
  }
  RED.nodes.registerType('orion_rx', OrionRXNode, {
    credentials: {
      username: { type: 'text' },
      password: { type: 'text' },
      groupIds: { type: 'text' },
    },
  });

  /**
   * Node for encoding PCM/WAV to Orion Opus.
   * @param config
   * @constructor
   */
  function OrionEncode(config) {
    RED.nodes.createNode(this, config);
    const node = this;

    node.status({ fill: 'yellow', shape: 'dot', text: 'Idle' });

    node.on('input', (msg) => {
      if (msg.payload) {
        node.status({ fill: 'green', shape: 'dot', text: 'Encoding' });
        OrionClient.utils.wav2ov(msg).then((resolve) => {
          node.send(resolve);
        });
        node.status({ fill: 'yellow', shape: 'dot', text: 'Idle' });
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

    node.status({ fill: 'yellow', shape: 'dot', text: 'Idle' });

    node.on('input', (msg) => {
      if (msg.media) {
        node.status({ fill: 'green', shape: 'dot', text: 'Encoding' });
        OrionClient.utils.stt(msg).then((resolve) => {
          node.send(resolve);
        });
        node.status({ fill: 'yellow', shape: 'dot', text: 'Idle' });
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

    node.status({ fill: 'yellow', shape: 'dot', text: 'Idle' });

    node.on('input', (msg) => {
      if (msg.media) {
        node.status({ fill: 'green', shape: 'dot', text: 'Translating' });
        msg.input_lang = config.inputlanguageCode;
        msg.output_lang = config.outputlanguageCode;
        OrionClient.utils.translate(msg).then((response) => {
          node.send(response);
        });
        node.status({ fill: 'yellow', shape: 'dot', text: 'Idle' });
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

    node.status({ fill: 'yellow', shape: 'dot', text: 'Idle' });

    node.on('input', (msg) => {
      if (msg.event_type && msg.event_type === 'ptt') {
        node.status({ fill: 'green', shape: 'dot', text: 'Decoding' });
        msg.return_type = msg.return_type ? msg.return_type : config.return_type;
        OrionClient.utils.ov2wav(msg).then((response) => {
          node.send(response);
        });
        node.status({ fill: 'yellow', shape: 'dot', text: 'Idle' });
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

    node.status({ fill: 'yellow', shape: 'dot', text: 'Idle' });

    node.on('input', (msg) => {
      OrionClient.auth(node.username, node.password).then((resolve) => {
        const token = resolve.token;
        node.status({ fill: 'blue', shape: 'dot', text: 'Lookup' });

        if (msg.payload && msg.payload === 'whoami') {
          OrionClient.whoami(token).then((resolve) => {
            msg.user_info = resolve;
            const userId = resolve.id;
            OrionClient.getUserStatus(token, userId).then((resolve) => {
              msg.userstatus_info = resolve;
              node.send(msg);
            });
          });
        } else if (msg.event_type && msg.event_type === 'userstatus') {
          const userId = msg.id;
          OrionClient.getUser(token, userId).then((resolve) => {
            msg.user_info = resolve;
            OrionClient.getUserStatus(token, userId).then((resolve) => {
              msg.userstatus_info = resolve;
              node.send(msg);
            });
          });
        } else if (msg.event_type && msg.event_type === 'ptt') {
          const groupId = msg.id;
          const userId = msg.sender;
          OrionClient.getGroup(token, groupId).then((resolve) => {
            msg.group_info = resolve;
            OrionClient.getUser(token, userId).then((resolve) => {
              msg.user_info = resolve;
              OrionClient.getUserStatus(token, userId).then((resolve) => {
                msg.userstatus_info = resolve;
                node.send(msg);
              });
            });
          });
        } else if (msg.group) {
          const groupId = msg.group;
          OrionClient.getGroup(token, groupId).then((resolve) => {
            msg.group_info = resolve;
            node.send(msg);
          });
        } else if (msg.user) {
          const userId = msg.user;
          OrionClient.getUser(token, userId).then((resolve) => {
            msg.user_info = resolve;
            OrionClient.getUserStatus(token, userId).then((resolve) => {
              msg.userstatus_info = resolve;
              node.send(msg);
            });
          });
        }
        node.status({ fill: 'yellow', shape: 'dot', text: 'Idle' });
      });
    });

    node.on('close', () => {});
  }
  RED.nodes.registerType('orion_lookup', OrionLookup, {
    credentials: { username: { type: 'text' }, password: { type: 'text' } },
  });
};
