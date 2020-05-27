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

    // Helper for getting all of the groups to which a user belongs.
    // To Use: Set 'ALL' as a String in your Node Groups config,
    //         or pass 'ALL' as a String in 'msg.groupIds'.
    const resolveGroups = (token, msg) => {
      return new Promise((resolve) => {
        node.status({ fill: 'blue', shape: 'dot', text: 'Resolving Groups' });
        let _groupIds = node.groupIds;

        // Allow the user to pass in the group configuration:
        if (msg.groupIds && typeof msg.groupIds === 'string') {
          _groupIds = msg.groupIds;
        }

        switch (_groupIds) {
          case 'ALL':
            OrionClient.getAllUserGroups(token).then((response) => {
              const _groups = [];
              response.forEach((group) => _groups.push(group.id));
              if (msg.unitTestSleep) {
                setTimeout(resolve(_groups), msg.unitTestSleep);
              } else {
                resolve(_groups);
              }
            });
            break;
          default:
            if (msg.unitTestSleep) {
              setTimeout(
                resolve(_groupIds.replace(/(\r\n|\n|\r)/gm, '').split(',')),
                msg.unitTestSleep,
              );
            } else {
              resolve(_groupIds.replace(/(\r\n|\n|\r)/gm, '').split(','));
            }
            break;
        }
      });
    };

    node.on('input', (msg) => {
      switch (msg.event_type) {
        case 'userstatus':
          OrionClient.auth(node.username, node.password).then((res) => {
            OrionClient.updateUserStatus(res.token, msg)
              .then(() => {
                node.status({
                  fill: 'green',
                  shape: 'dot',
                  text: 'Updated User Status',
                });
                msg.unitTest ? Promise.resolve().then(() => this.warn(msg.unitTest)) : null;
              })
              .catch((error) => {
                node.status({
                  fill: 'red',
                  shape: 'dot',
                  text: 'Failed to Update User Status',
                });
                node.error(`updateUserStatus ${error}`);
              });
          });
          break;
        case 'image':
          OrionClient.auth(node.username, node.password).then((response) => {
            const token = response.token;
            const userId = response.id;

            resolveGroups(token, msg)
              .then((groups) => {
                groups.forEach((groupId) => {
                  let streamKey;
                  if (OrionCrypto) {
                    streamKey = OrionCrypto.utils.generateStreamKey();
                    msg.cipherPayload = OrionCrypto.encryptImage(streamKey, msg.payload);
                  }
                  OrionClient.sendImage(
                    token,
                    msg.cipherPayload || msg.payload,
                    groupId,
                    msg.target_self ? userId : msg.target,
                    streamKey,
                    msg.mimeType ? msg.mimeType : msg.mimetype,
                  )
                    .then(() => {
                      node.status({ fill: 'green', shape: 'dot', text: 'Sent Image' });
                    })
                    .catch((error) => {
                      node.status({
                        fill: 'red',
                        shape: 'dot',
                        text: 'Failed to Send Image',
                      });
                      node.error(`sendImage ${error}`);
                    });
                });
              })
              .then(() => {
                msg.unitTest ? Promise.resolve().then(() => this.warn(msg.unitTest)) : null;
              });
          });
          break;
        case 'text':
          OrionClient.auth(node.username, node.password).then((response) => {
            const token = response.token;
            const userId = response.id;

            resolveGroups(token, msg)
              .then((groups) => {
                groups.forEach((groupId) => {
                  let streamKey;
                  if (OrionCrypto) {
                    streamKey = OrionCrypto.utils.generateStreamKey();
                    msg.cipherPayload = OrionCrypto.encryptText(streamKey, msg.payload);
                  }
                  OrionClient.sendText(
                    token,
                    msg.cipherPayload || msg.payload,
                    groupId,
                    msg.target_self ? userId : msg.target,
                    streamKey,
                  )
                    .then(() => {
                      node.status({ fill: 'green', shape: 'dot', text: 'Sent Text' });
                    })
                    .catch((error) => {
                      node.status({
                        fill: 'red',
                        shape: 'dot',
                        text: 'Failed to Send Text',
                      });
                      node.error(`sendText ${error}`);
                    });
                });
              })
              .then(() => {
                msg.unitTest ? Promise.resolve().then(() => this.warn(msg.unitTest)) : null;
              });
          });
          break;
        default:
          // Handle "PTT" Event...
          OrionClient.auth(node.username, node.password)
            .then((resolve) => {
              const token = resolve.token;
              const userId = resolve.id;

              const target = msg.target_self ? userId : msg.target;

              resolveGroups(token, msg).then((groups) => {
                if (msg.media) {
                  OrionClient.utils.getMedia(msg.media).then((response) => {
                    const media = response;
                    groups.forEach((value) => {
                      const groupId = value;
                      OrionClient.sendPtt(token, media, groupId, target)
                        .then(() => {
                          node.status({
                            fill: 'green',
                            shape: 'dot',
                            text: 'Sent PTT',
                          });
                        })
                        .catch((error) => {
                          node.status({
                            fill: 'red',
                            shape: 'dot',
                            text: 'Failed to Send PTT',
                          });
                          node.error(`sendPtt ${error}`);
                        });
                    });
                  });
                } else {
                  OrionClient.utils
                    .lyre(token, groups, msg.message, msg.media, target)
                    .then(() => {
                      node.status({
                        fill: 'green',
                        shape: 'dot',
                        text: 'Sent PTT',
                      });
                    })
                    .catch((error) => {
                      node.status({
                        fill: 'red',
                        shape: 'dot',
                        text: 'Failed to Send PTT (lyre)',
                      });
                      node.error(`lyre ${error}`);
                    });
                }
              });
            })
            .then(() => {
              msg.unitTest ? Promise.resolve().then(() => this.warn(msg.unitTest)) : null;
            });
          break;
      }
    });

    node.on('close', () => {});
  }
  RED.nodes.registerType('orion_tx', OrionTXNode, {
    credentials: { username: { type: 'text' }, password: { type: 'text' } },
  });

  const _engageEventStream = (node, token, groups, verbosity = 'active') => {
    return new Promise((resolve, reject) => {
      OrionClient.connectToWebsocket(token)
        .then((websocket) => {
          node.status({ fill: 'green', shape: 'dot', text: 'Connected' });
          OrionClient.engage(token, groups, verbosity)
            .then(() => {
              node.status({ fill: 'green', shape: 'dot', text: 'Engaged' });
              // Return the connection and a lazy promise to disengage the
              // current session.
              resolve([websocket, OrionClient.engage.bind(this, token, [], verbosity)]);
            })
            .catch((err) => {
              // Reject engagement.
              node.warn('Failed to Engage groups, closing WebSocket:', err);

              try {
                websocket.close(4158);
              } catch (err) {
                node.error('Could not cleanly close WebSocket:', err);
              }

              reject();
            });
        })
        .catch(reject); // Reject connection.
    });
  };

  const _resolveGroups = (node, authToken) => {
    return new Promise((resolve) => {
      if (node.orion_config.groupIds === 'ALL') {
        OrionClient.getAllUserGroups(authToken).then((response) => {
          const _groups = [];
          response.forEach((group) => _groups.push(group.id));
          resolve(_groups);
        });
      } else {
        resolve(node.orion_config.groupIds.replace(/(\r\n|\n|\r)/gm, '').split(','));
      }
    });
  };

  const _ackPing = (node, authToken) => {
    node.status({ fill: 'yellow', shape: 'dot', text: 'Pong' });
    OrionClient.pong(authToken)
      .then(() => {
        node.status({ fill: 'green', shape: 'dot', text: 'Pong' });
      })
      .catch((error) => {
        node.status({ fill: 'red', shape: 'dot', text: 'Pong Failed' });
        node.warn('Pong Failed:', error);
      })
      .finally(() => {
        _setIdleStatusDelay(node);
      });
  };

  let idleStatusTriggerHandle;
  const _setIdleStatusDelay = (node, delay = 5) => {
    clearTimeout(idleStatusTriggerHandle);
    idleStatusTriggerHandle = setTimeout(() => {
      node.status({ fill: 'blue', shape: 'dot', text: 'Idle' });
    }, delay * 1000);
  };

  const _cleanupEventStreamConnection = (node, connection, disengage) => {
    try {
      disengage
        ? disengage()
        : console.warn('Could not disengage group(s), callback not specified.');
      connection
        ? connection.close(4158)
        : console.warn('Could not close websocket, connection not specified.');
    } catch (err) {
      console.error(`${new Date().toISOString()} ${node.id} WebSocket error on close: err=`, err);
    }
    node.status({ fill: 'red', shape: 'dot', text: 'Disconnected' });
  };

  const _registerEventStreamListeners = (node, config) => {
    const verbosity = config.verbosity;
    const ignoreSelf = config.ignoreSelf;
    const pingInterval = process.env.PING_INTERVAL || 200000;

    // Attempt to setup the event stream engaged against resolved groups.
    const eventStream = new Promise((resolve, reject) => {
      OrionClient.auth(node.username, node.password)
        .then(({ token, userId }) => {
          _resolveGroups(node, token)
            .then((groups) => {
              _engageEventStream(node, token, groups, verbosity)
                .then(([connection, disengage]) => {
                  // Success!
                  node.status({ fill: 'green', shape: 'dot', text: 'Engaged' });
                  resolve([token, userId, connection, disengage]);
                })
                .catch(reject);
            })
            .catch(reject);
        })
        .catch(reject);
    });

    // Eventstream engaged, setup message handlers.
    eventStream
      .then(([token, userId, connection, disengage]) => {
        const pongIntervalHandle = setInterval(_ackPing.bind(this, node, token), pingInterval);

        // If the node itself is closed, clean up the event stream connection.
        node.on('close', () => {
          node.debug('Closing OrionRX.');
          clearInterval(pongIntervalHandle);
          clearTimeout(idleStatusTriggerHandle);
          _cleanupEventStreamConnection(node, connection, disengage);
        });

        // Setup websocket clean-reconnect.
        connection.addEventListener('close', (event) => {
          clearInterval(pongIntervalHandle);
          clearTimeout(idleStatusTriggerHandle);

          node.status({ fill: 'red', shape: 'dot', text: 'WebSocket Closed' });
          node.warn('Websocket connection closed:', event);

          // If any non-deliberate (client-side) closure is detected, reload the websocket.
          if (event.code != 4158) {
            console.warn('Encountered unclean closure of websocket, reloading with delay: ', event);
            _cleanupEventStreamConnection(node, connection, disengage);
            setTimeout(_registerEventStreamListeners.bind(this, node, config), 5 * 1000);
          }
        });

        // Cleanly reconnect on error (is this desirable behavior?).
        connection.addEventListener('error', (event) => {
          clearInterval(pongIntervalHandle);
          clearTimeout(idleStatusTriggerHandle);

          node.status({ fill: 'red', shape: 'dot', text: 'WebSocket Error' });
          node.warn('WebSocket Error:', event);

          _cleanupEventStreamConnection(node, connection, disengage);
          setTimeout(_registerEventStreamListeners.bind(this, node, config), 0);
        });

        // Setup event handlers.
        connection.addEventListener('message', (data) => {
          _setIdleStatusDelay(node);

          const eventData = JSON.parse(data.data);
          let eventArray = [eventData, null, null, null];

          node.status({
            fill: 'green',
            shape: 'square',
            text: `Event Type: ${eventData.event_type}`,
          });

          switch (eventData.event_type) {
            case 'userstatus':
              if (!ignoreSelf || eventData.id !== userId) {
                eventArray[2] = eventData;
              }
              node.send(eventArray);
              break;
            case 'ping':
              // Handle Ping Events
              _ackPing(node, token);
              node.send(eventArray);
              break;
            case 'ptt':
              /* This conditional block is deliberately written long form to
              help unpack the complexity.
               */

              // First, see if we can decrypt the event:
              new Promise((resolve) => {
                if (OrionCrypto) {
                  // Can encrypt, return decrypted event:
                  OrionCrypto.decryptEvent(eventData)
                    .then((event) => resolve(event))
                    .catch(() => resolve(eventData));
                } else if (!OrionCrypto) {
                  // Can't encrypt, return original event:
                  resolve(eventData);
                }
              }).then((event) => {
                // Set the newly decrypted (or original) event to 0:
                eventArray[0] = event;

                if (ignoreSelf) {
                  // If ignoreSelf is set:
                  if (event.sender === userId) {
                    // If I am the sender, don't fill out ptt/direct:
                    node.send(eventArray);
                  } else if (event.sender !== userId) {
                    // If I am NOT the sender:
                    eventArray[1] = event;
                    eventArray[3] = event.target_user_id ? event : null;
                  }
                } else if (!ignoreSelf) {
                  // If ignoreSelf is NOT set:
                  eventArray[1] = event;
                  eventArray[3] = event.target_user_id ? event : null;
                }
                node.send(eventArray);
              });
              break;
            default:
              // First, see if we can decrypt the event:
              new Promise((resolve) => {
                if (OrionCrypto) {
                  // Can encrypt, return decrypted event:
                  OrionCrypto.decryptEvent(eventData)
                    .then((event) => resolve(event))
                    .catch(() => resolve(eventData));
                } else if (!OrionCrypto) {
                  // Can't encrypt, return original event:
                  resolve(eventData);
                }
              }).then((event) => {
                // Set the newly decrypted (or original) event to 0:
                eventArray[0] = event;
                node.send(eventArray);
              });
              break;
          }

          // For unit tests:
          //Promise.resolve().then(() => node.warn(eventData.event_type));
        });
      })
      .catch((err) => {
        // If anything goes wrong during setup, retry connection every 5s.
        node.status({ fill: 'red', shape: 'square', text: 'Initialization Failed' });
        node.debug('Encountered error registering event stream, retrying in 5s:', err);
        setTimeout(_registerEventStreamListeners.bind(this, node, config), 5 * 1000);
      });
  };

  /**
   * Node for Receiving (RX) events from Orion.
   * @param config {OrionConfig} Orion Config Meta-Node.
   * @constructor
   */
  function OrionRXNode(config) {
    RED.nodes.createNode(this, config);
    const node = this;

    node.orion_config = RED.nodes.getNode(config.orion_config);
    node.username = node.orion_config.credentials.username;
    node.password = node.orion_config.credentials.password;

    node.status({ fill: 'red', shape: 'dot', text: 'Initializing' });

    _registerEventStreamListeners(node, config);
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
