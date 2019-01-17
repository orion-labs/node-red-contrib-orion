/*
Orion Node-RED Client.

Author:: Greg Albrecht <gba@orionlabs.io>
Copyright:: Copyright 2019 Orion Labs, Inc.
License:: Apache License, Version 2.0
Source:: https://github.com/orion-labs/node-red-contrib-orion

*/


var request = require('request');
var JSONStream = require('JSONStream');
var es = require('event-stream');
var XMLHttpRequest = require('xmlhttprequest').XMLHttpRequest;
var orion = require('./orionlib.js');

module.exports = function (RED) {

    /*
    OrionConfig
      Meta-Node for containing other Node-level configurations.
    */
    function OrionConfig (config) {
        RED.nodes.createNode(this, config);
        this.username = config.username;
        this.password = config.password;
        this.group = config.group;
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
    function OrionTXNode (config) {
        RED.nodes.createNode(this, config);
        var node = this;
        var node_id = node.id;

        this.orion_config = RED.nodes.getNode(config.orion_config);

        this.username = this.orion_config.credentials.username;
        this.password = this.orion_config.credentials.password;
        this.group = this.orion_config.group;

        this.on('input', function (msg) {
            var lyre_options = {
                'username': this.username,
                'password': this.password,
                'group': msg.hasOwnProperty('group') ? msg.group : node.group,
                'message': msg.hasOwnProperty('message') ? msg.message : null,
                'media': msg.hasOwnProperty('media') ? msg.media : null,
                'target': msg.hasOwnProperty('target') ? msg.target : null
            };
            orion.lyre(lyre_options);
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
    function OrionRXNode (config) {
        RED.nodes.createNode(this, config);
        var node = this;
        var node_id = node.id;

        this.orion_config = RED.nodes.getNode(config.orion_config);

        this.username = this.orion_config.credentials.username;
        this.password = this.orion_config.credentials.password;
        this.group = this.orion_config.group;

        function ok_send (data) {
          node.status({
              fill: 'green', shape: 'dot', text: 'Receiving Events'
          });
          node.send(data);
        }

        orion.event_stream(
            this.username, this.password, [this.group], ok_send);

        //node.on('close', function() { EventStream.abort(); });
        node.on('close', function () { return; });
    }

    RED.nodes.registerType('orion_rx', OrionRXNode, {
        credentials: {
            username: { type: 'text' },
            password: { type: 'password' },
            group: { type: 'text' },
            token: { type: 'password' }
        }
    });

    /*
    OrionEncode
      Node for Encoding Orion audio format media.
    */
    function OrionEncode (config) {
        RED.nodes.createNode(this, config);
        var node = this;
        var node_id = node.id;
        var logt = 'OrionEncode(' + node_id + '): ';

        // Override wav2ov endpoint for local development:
        var locris_wav2ov = process.env.LOCRIS_WAV2OV || 'https://locris.api.orionaster.com/wav2ov';
        console.log(logt + 'Using locris_wav2ov=' + locris_wav2ov);

        node.on('input', function (msg) {
            if (msg.hasOwnProperty('media_wav')) {
                console.log(logt + 'DEPRECATED: Using "media_wav", use "payload" instead.')
            }

            if (msg.hasOwnProperty('media_buf')) {
                console.log(logt + 'DEPRECATED: Using "media_buf", use "payload" instead.')
            }

            if (msg.hasOwnProperty('media_wav') || msg.hasOwnProperty('media_buf') || msg.hasOwnProperty('payload')) {
                /* console.log(
                    'OrionEncode('+node_id+'): Encoding msg="' + JSON.stringify(msg) + '"'
                ); */
                var xhr = new XMLHttpRequest();

                xhr.open('POST', locris_wav2ov, true);

                xhr.setRequestHeader('Content-Type', 'application/json');

                xhr.onreadystatechange = function () {
                    if (xhr.readyState === 4 && xhr.status === 200) {
                        var response = JSON.parse(xhr.responseText);
                        /* console.log(
                            logt + 'Locris wav2ov Response="' + JSON.stringify(response) + '"'
                        ); */
                        node.send(response);
                    }
                };

                xhr.send(JSON.stringify(msg));
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
    function OrionDecode (config) {
        RED.nodes.createNode(this, config);
        var node = this;
        var node_id = node.id;
        var logt = 'OrionDecode(' + node_id + '): ';

        var locris_ov2wav = process.env.LOCRIS_OV2WAV || 'https://locris.api.orionaster.com/ov2wav';
        console.log(logt + 'Using locris_ov2wav=' + locris_ov2wav);

        node.on('input', function (msg) {
            if (msg.hasOwnProperty('event_type') && msg.event_type === 'ptt') {
                console.log(
                    logt + 'Decoding PTT Event="' + JSON.stringify(msg) + '"'
                );

                var xhr = new XMLHttpRequest();

                xhr.open('POST', locris_ov2wav, true);

                xhr.setRequestHeader('Content-Type', 'application/json');

                xhr.onreadystatechange = function () {
                    if (xhr.readyState === 4 && xhr.status === 200) {
                        var response = JSON.parse(xhr.responseText);

                        if (config.return_type === 'url') {
                            console.log(
                                logt + 'Locris ov2wav Response="' + JSON.stringify(response) + '"'
                            );
                        } else if (config.return_type === 'buffer') {
                            var buf = response.payload;
                            response.payload = Buffer.from(buf);
                        }
                        node.send(response);
                    }
                };

                msg.return_type = config.return_type;
                xhr.send(JSON.stringify(msg));
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
    function OrionLookup (config) {
        RED.nodes.createNode(this, config);
        var node = this;
        var node_id = node.id;
        var logt = 'OrionLookup(' + node_id + '): ';

        var ochre_url = process.env.OCHRE_URL || 'https://ochre.api.orionaster.com/ochre';
        console.log(logt + 'Using ochre_url=' + ochre_url);

        this.orion_config = RED.nodes.getNode(config.orion_config);

        this.username = this.orion_config.credentials.username;
        this.password = this.orion_config.credentials.password;
        this.group = this.orion_config.group;

        if (!this.password) {
            console.error(logt + 'No Password Set!');
            return null;
        }

        this.on('input', function (msg) {
            request({
                url: 'https://api.orionlabs.io/api/login',
                method: 'POST',
                json: { 'uid': this.username, 'password': this.password }
            },
            function (err, httpResponse, body) {
                if (err) {
                    node.error(logt, err, body);
                    node.status({
                        fill: 'red', shape: 'ring', text: 'OrionTXNode Failed'
                    });
                } else {
                    this.token = body.token;
                    this.id = body.id;
                }

                if (!this.token) {
                    console.error(logt + 'No Auth Token Set!');
                } else {
                    console.log(logt + 'Received Auth Token');

                    node.status({
                        fill: 'green', shape: 'dot', text: 'Connected'
                    });

                    request({
                        url: ochre_url,
                        method: 'POST',
                        json: {
                            'token': this.token,
                            'user_id': this.id,
                            'msg': msg
                        }
                    },
                    function (err, response, body) {
                        if (err) {
                            console.log(logt, err, msg);
                        } else {
                          console.log(response.body.msg);
                          node.send(response.body.msg);
                        }
                    });
                }
            });
        });

        node.on('close', function () { return; });
    }
    RED.nodes.registerType('orion_lookup', OrionLookup, {
        credentials: {
            username: { type: 'text' },
            password: { type: 'password' },
            token: { type: 'password' }
        }
    });
};
