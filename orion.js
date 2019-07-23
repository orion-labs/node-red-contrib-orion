#!/usr/bin/env node
/*
Orion Node-RED Nodes.

Author:: Greg Albrecht <gba@orionlabs.io>
Copyright:: Copyright 2019 Orion Labs, Inc.
License:: Apache License, Version 2.0
Source:: https://github.com/orion-labs/node-red-contrib-orion
*/

/* jslint node: true */
/* jslint white: true */

'use strict';

var WebSocket = require('ws');

var orion = require('./orionlib.js');

var request = require('requestretry').defaults({
  maxAttempts: 10,
  retryDelay: (Math.floor(Math.random() * (120000 - 10000))),
  retryStrategy: function myRetryStrategy(err, response, body, options) {
    if (response) {
      if (response.hasOwnProperty('statusCode')) {
        if (response.statusCode >= 400) {
          console.debug(Date() +
            ' requestretry response.statusCode=' + response.statusCode);
          console.debug(Date() +
            ' requestretry body=' + JSON.stringify(body));
          return response.statusCode;
        }
      }
    } else if (err) {
      console.log('requestretry err=' + err);
      return err;
    }
  },
});


module.exports = function(RED) {
  /*
  OrionConfig
    Meta-Node for containing other Node-level configurations.
  */
  function OrionConfig(config) {
    RED.nodes.createNode(this, config);
    this.username = config.username;
    this.password = config.password;
    this.groupIds = config.groupIds;
  }

  RED.nodes.registerType('orion_config', OrionConfig, {
    credentials: {
      username: {type: 'text'},
      password: {type: 'text'},
    },
  });

  /*
  OrionTXNode
    Node for Transmitting (TX) events to Orion.
  */
  function OrionTXNode(config) {
    RED.nodes.createNode(this, config);
    var node = this;

    node.orion_config = RED.nodes.getNode(config.orion_config);
    node.username = node.orion_config.credentials.username;
    node.password = node.orion_config.credentials.password;
    node.groupIds = node.orion_config.groupIds;

    node.status({fill: 'yellow', shape: 'dot', text: 'Idle'});

    node.on('input', function(msg) {
      var use_all_groups;
      var groupIds = [];

      // Enter as a String, exit as an Array.
      if (msg.hasOwnProperty('groupIds') && typeof msg.groupIds === 'string' && msg.groupIds === 'ALL') {
          use_all_groups = true;
      } else if (msg.hasOwnProperty('groupIds') && typeof msg.groupIds === 'string') {
          use_all_groups = false;
          groupIds = msg.groupIds.replace(/(\r\n|\n|\r)/gm, '').split(',');
      } else if (typeof node.groupIds === 'string' && node.groupIds === 'ALL') {
          use_all_groups = true;
      } else if (typeof node.groupIds === 'string') {
          groupIds = node.groupIds.replace(/(\r\n|\n|\r)/gm, '').split(',');
      }

      var lyreOptions = {
        'username': node.username,
        'password': node.password,
        'groupIds': groupIds,
        'use_all_groups': use_all_groups,
        'message': msg.hasOwnProperty('message') ? msg.message : null,
        'media': msg.hasOwnProperty('media') ? msg.media : null,
        'target': msg.hasOwnProperty('target') ? msg.target : null,
        'target_self': msg.hasOwnProperty('target_self') ? msg.target_self : null
      };
      node.status({fill: 'green', shape: 'dot', text: 'Transmitting'});
      orion.lyre(lyreOptions);
      node.status({fill: 'yellow', shape: 'dot', text: 'Idle'});
    });

    node.on('close', function() {
      return;
    });
  }

  RED.nodes.registerType('orion_tx', OrionTXNode, {
    credentials: {
      username: {type: 'text'},
      password: {type: 'text'},
    },
  });

  /*
  OrionRXNode
    Node for Receiving (RX) events from Orion.
  */
  function OrionRXNode(config) {
    RED.nodes.createNode(this, config);
    var node = this;
    var token;
    var user_id;
    var ws;
    var emsg;
    var use_all_groups;

    var verbosity = config.verbosity;
    var ignoreSelf = config.ignoreSelf;

    node.orion_config = RED.nodes.getNode(config.orion_config);
    node.username = node.orion_config.credentials.username;
    node.password = node.orion_config.credentials.password;

    var _groupIds = node.orion_config.groupIds;
    if (_groupIds === 'ALL') {
        use_all_groups = true;
        node.groupIds = [];
    } else {
        use_all_groups = false;
        node.groupIds = _groupIds.replace(/(\r\n|\n|\r)/gm, '').split(',');
    }

    node.status({fill: 'red', shape: 'dot', text: 'Disconnected'});

    // Called for every Event received from the Event Stream:
    function eventCallback(data) {
      node.status({fill: 'green', shape: 'dot', text: 'Receiving'});
      switch (data.event_type) {
        case 'ptt':
          /*
          If 'ignoreSelf' is False: Send PTTs (target and group).
          if 'ignoreSelf' is True: Send PTTs (target and group) as long as
            they ARE NOT from me! (Stop hitting yourself!)
          */
          if (!ignoreSelf || user_id !== data.sender) {
            node.send([
              data,  // Output 0 (all)
              data,  // Output 1 (ptt)
              null,  // Output 2 (userstatus)
              // 'target_user_id' is only set on direct/target messages
              data.hasOwnProperty('target_user_id') ? data : null  // Output 3 (direct/target)
            ]);
          }
          break;
        case 'userstatus':
          if (!ignoreSelf || user_id !== data.id) {
            node.send([data, null, data, null]);
          }
          break;
        default:
          node.send([data, null, null, null]);
          break;
      }
      node.status({fill: 'yellow', shape: 'dot', text: 'Connected & Idle'});
      return;
    }

    orion.authPromise(node.username, node.password)
        .then(
            function(auth) {
                if (!auth.token) {
                    emsg = 'No Auth Token for username=' + node.username;
                    node.error(emsg);
                    node.status({fill: 'red', shape: 'dot', text: emsg});
                } else if (auth.token) {
                    token = auth.token;
                    user_id = auth.id;
                    if (use_all_groups === true) {
                        var url = 'https://api.orionlabs.io/api/users/' + user_id;
                        console.log(Date() + ' ' + node.id + ' use_all_groups=true');
                        request(
                            {
                                url: url,
                                method: 'GET',
                                headers: {'Authorization': token},
                            },
                            function(error, response, body) {
                                if (error) {
                                    console.log(Date() + ' get user error=' + error);
                                    console.log(response);
                                } else {
                                    var body_groups = JSON.parse(body).groups;
                                    body_groups.forEach(function (group) {
                                        node.groupIds.push(group.id);
                                    });
                                    orion.engage(token, node.groupIds, verbosity);
                                    node.status(
                                        {fill: 'green', shape: 'dot', text: 'Engaged (' + verbosity + ')'});
                                }
                            }
                        );
                    } else {
                        orion.engage(token, node.groupIds, verbosity);
                        node.status(
                            {fill: 'green', shape: 'dot', text: 'Engaged (' + verbosity + ')'});
                    }

                    var ws_url = 'wss://alnilam.orionlabs.io/stream/wss'
                    var ws_opts = {'headers': {'Authorization': token}}

                    function startWS() {
                        ws = new WebSocket(ws_url, ws_opts);
                        ws.onopen = function(evt) {
                            console.log(Date() + ' ' + node.id + ' ws.onopen');
                            node.status(
                                {fill: 'green', shape: 'dot', text: 'Connected'});
                        };

                        ws.onmessage = function(data, flags, number) {
                            console.log(Date() + ' ' + node.id + ' ws.onmessage');

                            var event_data = JSON.parse(data.data);
                            console.log(Date() + ' ' + node.id + ' event_data.event_type=' + event_data.event_type);

                            // Respond to Orion's in-band Ping/Pong (EventStream legacy)
                            if (event_data.event_type === 'ping') {
                              node.debug('Ping Received.');
                              // Respond to Engage's Ping/Pong
                              orion.pong(token)
                                .then(function(response) {
                                  node.debug('Pong succeeded.');
                                  node.status(
                                      {fill: 'green', shape: 'dot', text: 'Engaged'});
                                })
                                .catch(function(response) {
                                  node.debug('Pong failed, calling engage()');
                                  node.status(
                                    {fill: 'yellow', shape: 'dot', text: 'Re-engaging'});
                                  orion.engage(token, node.groupIds);
                                });
                            }

                            eventCallback(event_data);
                        };

                        ws.onclose = function (evt) {
                          console.log(Date() + ' ' + node.id + ' ws.onclose err=' + evt.code);
                            ws = null;
                            setTimeout(function() {
                                startWS();
                            }, 5000);
                        }
                    }

                    startWS();

                }
            },
            function(error) {
                if (error && error.hasOwnProperty('code')) {
                    node.debug('error.code=' + error.code);
                    // node.error(error.code === 'ETIMEDOUT');

                    // Set to `true` if the timeout was a connection timeout,
                    // `false` or `undefined` otherwise.
                    node.debug('error.connect=' + error.connect);
                    // node.error(error.connect === true);

                    node.status(
                        {fill: 'red', shape: 'dot', text: JSON.stringify(error)});

                    node.error(
                        'username=' +
                        node.username +
                        ' encountered a connection error (' +
                        error.code +
                        '). Reconnecting...'
                    );
                } else {
                    node.status({
                        fill: 'yellow', shape: 'dot', text: 'Unknown State',
                    });
                    // node.error('error=' + error);
                    node.error(
                        'username=' +
                        node.username +
                        ' encountered a connection error. Reconnecting...'
                    );
                }

                node.status({
                    fill: 'yellow', shape: 'dot', text: 'Reconnecting',
                });
            });

    node.on('close', function() {
      node.debug('Closing');
      node.status({fill: 'red', shape: 'dot', text: 'Disconnected'});
    });
  }

  RED.nodes.registerType('orion_rx', OrionRXNode, {
    credentials: {
      username: {type: 'text'},
      password: {type: 'text'},
      groupIds: {type: 'text'},
    },
  });

  /*
  OrionEncode
    Node for Encoding Orion audio format media.
  */
  function OrionEncode(config) {
    RED.nodes.createNode(this, config);
    var node = this;

    node.status({fill: 'yellow', shape: 'dot', text: 'Idle'});

    function wav2ovCallback(response) {
      node.send(response);
    }

    node.on('input', function(msg) {
      if (msg.hasOwnProperty('payload')) {
        node.status({fill: 'green', shape: 'dot', text: 'Encoding'});
        orion.locrisWAV2OV(msg, wav2ovCallback);
        node.status({fill: 'yellow', shape: 'dot', text: 'Idle'});
      } else {
        node.send(msg);
      }
    });
  }
  RED.nodes.registerType('orion_encode', OrionEncode);

  /*
  OrionTranscribe
    Node for Transcribing Orion audio format media.
  */
  function OrionTranscribe(config) {
    RED.nodes.createNode(this, config);
    var node = this;

    node.status({fill: 'yellow', shape: 'dot', text: 'Idle'});

    function sttCallback(response) {
      node.send(response);
    }

    node.on('input', function(msg) {
      if (msg.hasOwnProperty('media')) {
        node.status({fill: 'green', shape: 'dot', text: 'Encoding'});
        orion.locrisSTT(msg, sttCallback);
        node.status({fill: 'yellow', shape: 'dot', text: 'Idle'});
      } else {
        node.send(msg);
      }
    });
  }
  RED.nodes.registerType('orion_transcribe', OrionTranscribe);

  /*
  OrionDecode
    Node for Decoding Orion audio format media.
  */
  function OrionDecode(config) {
    RED.nodes.createNode(this, config);
    var node = this;

    node.status({fill: 'yellow', shape: 'dot', text: 'Idle'});

    function ov2wavCallback(response) {
      node.send(response);
    }

    node.on('input', function(msg) {
      if (msg.hasOwnProperty('event_type') && msg.event_type === 'ptt') {
        node.status({fill: 'green', shape: 'dot', text: 'Decoding'});
        msg.return_type = config.return_type;
        orion.locrisOV2WAV(msg, ov2wavCallback);
        node.status({fill: 'yellow', shape: 'dot', text: 'Idle'});
      } else {
        node.send(msg);
      }
    });
  }
  RED.nodes.registerType('orion_decode', OrionDecode);


  /*
  OrionLookup
    Node for Looking Up Orion User & Group info.
  */
  function OrionLookup(config) {
    RED.nodes.createNode(this, config);
    var node = this;

    node.orion_config = RED.nodes.getNode(config.orion_config);

    node.username = node.orion_config.credentials.username;
    node.password = node.orion_config.credentials.password;

    node.status({fill: 'yellow', shape: 'dot', text: 'Idle'});

    function LookupCallback(data) {
      node.status({fill: 'blue', shape: 'dot', text: 'Lookup'});
      node.send(data);
      node.status({fill: 'yellow', shape: 'dot', text: 'Idle'});
    }

    node.on('input', function(msg) {
      orion.auth(node.username, node.password, function(auth) {
        orion.lookup(auth, msg, LookupCallback);
      });
    });

    node.on('close', function() {
      return;
    });
  }

  RED.nodes.registerType('orion_lookup', OrionLookup, {
    credentials: {
      username: {type: 'text'},
      password: {type: 'text'},
    },
  });
};
