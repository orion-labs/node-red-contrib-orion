/*
Orion Node-RED Nodes.

Author:: Greg Albrecht <gba@orionlabs.io>
Copyright:: Copyright 2019 Orion Labs, Inc.
License:: Apache License, Version 2.0
Source:: https://github.com/orion-labs/node-red-contrib-orion

*/

/*jslint node: true */
/*jslint white: true */

"use strict";

var request = require('request');
var es = require('event-stream');
var JSONStream = require('JSONStream');
var XMLHttpRequest = require('xmlhttprequest').XMLHttpRequest;
var orion = require('./orionlib.js');

module.exports = function (RED) {

  /*
  OrionConfig
    Meta-Node for containing other Node-level configurations.
  */
  function OrionConfig(config) {
    RED.nodes.createNode(this, config);
    this.username = config.username;
    this.password = config.password;
    this.group_ids = config.group_ids;
  }

  RED.nodes.registerType('orion_config', OrionConfig, {
    credentials: {
      username: { type: 'text' },
      password: { type: 'password' }
    }
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
    var group_ids = node.orion_config.group_ids.split(',');

    node.status({fill: 'yellow', shape: 'dot', text: 'Idle'});

    node.on('input', function (msg) {
      var lyre_options = {
        'username': node.username,
        'password': node.password,
        'group_ids': msg.hasOwnProperty('group_ids') ? msg.group_ids : group_ids,
        'message': msg.hasOwnProperty('message') ? msg.message : null,
        'media': msg.hasOwnProperty('media') ? msg.media : null,
        'target': msg.hasOwnProperty('target') ? msg.target : null
      };
      node.status({fill: 'green', shape: 'dot', text: 'Transmitting'});
      orion.lyre(lyre_options);
      node.status({fill: 'yellow', shape: 'dot', text: 'Idle'});
    });

    node.on('close', function () { return; });
  }

  RED.nodes.registerType('orion_tx', OrionTXNode, {
    credentials: {
      username: { type: 'text' },
      password: { type: 'password' }
    }
  });

  /*
  OrionRXNode
    Node for Receiving (RX) events from Orion.
  */
  function OrionRXNode(config) {
      RED.nodes.createNode(this, config);
      var node = this,
          EventStream,
          session_id;

      node.orion_config = RED.nodes.getNode(config.orion_config);
      node.username = node.orion_config.credentials.username;
      node.password = node.orion_config.credentials.password;
      var group_ids = node.orion_config.group_ids.split(',');

      var es_url = 'https://api.orionlabs.io/api/ptt/' + group_ids.join('+');
      node.debug('es_url=' + es_url);

      node.status({fill: 'red', shape: 'dot', text: 'Disconnected'});

      // Called for every Event received from the Event Stream:
      function event_callback (data) {
        node.status({fill: 'green', shape: 'dot', text: 'Receiving'});
        node.send(data);
        node.status({fill: 'yellow', shape: 'dot', text: 'Idle'});
      }

      // Called after Auth to connect to Event Stream:
      function event_stream_callback (auth) {
        if (auth.error) {
          console.error(auth.error);
          node.status({
              fill: 'red', shape: 'dot', text: auth.error
          });
        } else if (!auth.token) {
          console.error('No Auth Token');
          node.status({
              fill: 'red', shape: 'dot', text: 'No Auth Token'
          });
        } else if (auth.token && auth.sessionId) {
          session_id = auth.sessionId;

          orion.engage(auth.token, group_ids);
          node.status({fill: 'green', shape: 'dot', text: 'Engaged'});

          var es_options = {
            url: es_url,
            method: 'GET',
            headers: { 'Authorization': auth.token },
            timeout: 120000
          };

          node.debug('Connecting to Event Stream.');

          EventStream = request(es_options, function(error) {
            if (error) {
              node.error('error.code=' + error.code);
              node.error(error.code === 'ETIMEDOUT');

              // Set to `true` if the timeout was a connection timeout, `false` or
              // `undefined` otherwise.
              node.error('error.connect=' + error.connect);
              node.error(error.connect === true);

              node.status({
                  fill: 'red', shape: 'dot', text: error
              });
            } else {
              node.error('In error function but no error.');

              node.status({
                  fill: 'yellow', shape: 'dot', text: 'Unknown State'
              });
            }
          });

          EventStream.pipe(JSONStream.parse()).pipe(es.mapSync(
            function (data) {
              if (data.event_type === 'ping') {
                node.debug('Ping Received.');
                // Respond to Engage's Ping/Pong
                orion.pong(auth.token)
                  .then(function (response) {
                    node.debug('Pong succeeded.');
                    node.status({fill: 'green', shape: 'dot', text: 'Engaged'});
                    event_callback(data);
                  })
                  .catch(function (response) {
                    node.debug('Pong failed, calling engage()');
                    node.status({fill: 'yellow', shape: 'dot', text: 'Re-engaging'});
                    orion.engage(auth.token, group_ids);
                    event_callback(data);
                  });
              } else {
                event_callback(data);
              }
            }
          ));
        }
    }

    orion.auth(node.username, node.password, event_stream_callback);

    node.on('close', function() {
      node.debug('Closing');
      EventStream.abort();
      orion.logout(session_id);
      node.status({fill: 'red', shape: 'dot', text: 'Disconnected'});
    });
  }

  RED.nodes.registerType('orion_rx', OrionRXNode, {
    credentials: {
      username: { type: 'text' },
      password: { type: 'password' },
      group_ids: { type: 'text' }
    }
  });

  /*
  OrionEncode
    Node for Encoding Orion audio format media.
  */
  function OrionEncode(config) {
    RED.nodes.createNode(this, config);
    var node = this;

    node.status({fill: 'yellow', shape: 'dot', text: 'Idle'});

    function wav2ov_cb (response) {
      node.send(response);
    }

    node.on('input', function (msg) {
      if (msg.hasOwnProperty('media_wav')) {
        node.warn('DEPRECATED: Using "media_wav", use "payload" instead.');
      }

      if (msg.hasOwnProperty('media_buf')) {
        node.warn('DEPRECATED: Using "media_buf", use "payload" instead.');
      }

      if (msg.hasOwnProperty('media_wav') || msg.hasOwnProperty('media_buf') || msg.hasOwnProperty('payload')) {
        node.status({fill: 'green', shape: 'dot', text: 'Encoding'});
        orion.locris_wav2ov(msg, wav2ov_cb);
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

    function ov2wav_cb (response) {
      node.send(response);
    }

    node.on('input', function (msg) {
      if (msg.hasOwnProperty('event_type') && msg.event_type === 'ptt') {
        node.status({fill: 'green', shape: 'dot', text: 'Decoding'});
        msg.return_type = config.return_type;
        orion.locris_ov2wav(msg, ov2wav_cb);
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

    function lookup_cb (data) {
      node.status({fill: 'blue', shape: 'dot', text: 'Lookup'});
      node.send(data);
      node.status({fill: 'yellow', shape: 'dot', text: 'Idle'});
    }

    node.on('input', function (msg) {
      orion.auth(node.username, node.password, function (auth) {
        orion.lookup(auth, msg, lookup_cb);
      });
    });

    node.on('close', function () { return; });
  }

  RED.nodes.registerType('orion_lookup', OrionLookup, {
    credentials: {
      username: { type: 'text' },
      password: { type: 'password' }
    }
  });
};
