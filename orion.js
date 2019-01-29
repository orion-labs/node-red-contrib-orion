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

var request = require('request');
var es = require('event-stream');
var JSONStream = require('JSONStream');
var orion = require('./orionlib.js');

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
      password: {type: 'password'},
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
    var groupIds = node.orion_config.groupIds.split(',');

    node.status({fill: 'yellow', shape: 'dot', text: 'Idle'});

    node.on('input', function(msg) {
      var lyreOptions = {
        'username': node.username,
        'password': node.password,
        'group_ids': msg.hasOwnProperty('groupIds') ? msg.groupIds : groupIds,
        'message': msg.hasOwnProperty('message') ? msg.message : null,
        'media': msg.hasOwnProperty('media') ? msg.media : null,
        'target': msg.hasOwnProperty('target') ? msg.target : null,
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
      password: {type: 'password'},
    },
  });

  /*
  OrionRXNode
    Node for Receiving (RX) events from Orion.
  */
  function OrionRXNode(config) {
      RED.nodes.createNode(this, config);
      var node = this;
      var EventStream;
      var sessionId;

      node.orion_config = RED.nodes.getNode(config.orion_config);
      node.username = node.orion_config.credentials.username;
      node.password = node.orion_config.credentials.password;
      var groupIds = node.orion_config.groupIds.split(',');

      var esURL = 'https://api.orionlabs.io/api/ptt/' + groupIds.join('+');
      node.debug('esURL=' + esURL);

      node.status({fill: 'red', shape: 'dot', text: 'Disconnected'});

      // Called for every Event received from the Event Stream:
      function eventCallback(data) {
        node.status({fill: 'green', shape: 'dot', text: 'Receiving'});
        node.send(data);
        node.status({fill: 'yellow', shape: 'dot', text: 'Idle'});
      }

      // Called after Auth to connect to Event Stream:
      function eventStreamCallback(auth) {
        if (auth.error) {
          console.error(auth.error);
          node.status({fill: 'red', shape: 'dot', text: auth.error});
        } else if (!auth.token) {
          console.error('No Auth Token');
          node.status({fill: 'red', shape: 'dot', text: 'No Auth Token'});
        } else if (auth.token && auth.sessionId) {
          sessionId = auth.sessionId;

          orion.engage(auth.token, groupIds);
          node.status({fill: 'green', shape: 'dot', text: 'Engaged'});

          var esOptions = {
            url: esURL,
            method: 'GET',
            headers: {'Authorization': auth.token},
            timeout: 120000,
          };

          node.debug('Connecting to Event Stream.');

          EventStream = request(esOptions, function(error) {
            if (error) {
              node.error('error.code=' + error.code);
              node.error(error.code === 'ETIMEDOUT');

              // Set to `true` if the timeout was a connection timeout,
              // `false` or `undefined` otherwise.
              node.error('error.connect=' + error.connect);
              node.error(error.connect === true);

              node.status({fill: 'red', shape: 'dot', text: error});
            } else {
              node.error('In error function but no error.');

              node.status({
                  fill: 'yellow', shape: 'dot', text: 'Unknown State',
              });
            }
          });

          EventStream.pipe(JSONStream.parse()).pipe(es.mapSync(
            function(data) {
              if (data.event_type === 'ping') {
                node.debug('Ping Received.');
                // Respond to Engage's Ping/Pong
                orion.pong(auth.token)
                  .then(function(response) {
                    node.debug('Pong succeeded.');
                    node.status({fill: 'green', shape: 'dot', text: 'Engaged'});
                    eventCallback(data);
                  })
                  .catch(function(response) {
                    node.debug('Pong failed, calling engage()');
                    node.status(
                      {fill: 'yellow', shape: 'dot', text: 'Re-engaging'});
                    orion.engage(auth.token, groupIds);
                    eventCallback(data);
                  });
              } else {
                eventCallback(data);
              }
            }
          ));
        }
    }

    orion.auth(node.username, node.password, eventStreamCallback);

    node.on('close', function() {
      node.debug('Closing');
      EventStream.abort();
      orion.logout(sessionId);
      node.status({fill: 'red', shape: 'dot', text: 'Disconnected'});
    });
  }

  RED.nodes.registerType('orion_rx', OrionRXNode, {
    credentials: {
      username: {type: 'text'},
      password: {type: 'password'},
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
      if (msg.hasOwnProperty('media_wav')) {
        node.warn('DEPRECATED: Using "media_wav", use "payload" instead.');
      }

      if (msg.hasOwnProperty('media_buf')) {
        node.warn('DEPRECATED: Using "media_buf", use "payload" instead.');
      }

      if (msg.hasOwnProperty('media_wav') || msg.hasOwnProperty('media_buf') ||
          msg.hasOwnProperty('payload')) {
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
      password: {type: 'password'},
    },
  });
};
