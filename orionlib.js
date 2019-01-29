/*
Orion Node.JS Library

Author:: Greg Albrecht <gba@orionlabs.io>
Copyright:: Copyright 2019 Orion Labs, Inc.
License:: Apache License, Version 2.0
Source:: https://github.com/orion-labs/node-red-contrib-orion

*/


/*jslint node: true */
/*jslint white: true */

"use strict";

var request = require('request');
var JSONStream = require('JSONStream');
var es = require('event-stream');
var XMLHttpRequest = require('xmlhttprequest').XMLHttpRequest;


// Login to Orion and retrieve a Auth Token, then call callback:
function auth (username, password, callback) {
  request({
    url: 'https://api.orionlabs.io/api/login',
    method: 'POST',
    json: { 'uid': username, 'password': password }
  }, function (error, response, body) {

    if (error) {
      callback({error: error});
    } else if (response.statusCode !== 200) {
      callback({error: 'Auth Status Code != 200'});
    } else if (response.statusCode === 200) {
      callback(body);
    }

  });
}
exports.auth = auth;

// Login to Orion and retrieve a Auth Token for later use:
function auth_promise (username, password) {
  return new Promise(function(resolve, reject) {
    request({
      url: 'https://api.orionlabs.io/api/login',
      method: 'POST',
      json: { 'uid': username, 'password': password }
    }, function (error, response, body) {
      if (error) {
        reject(error);
      } else {
        resolve({token: body.token, id: body.id});
      }
    });
  });
}
exports.auth_promise = auth_promise;


function logout (session_id) {
  request({
    url: 'https://api.orionlabs.io/api/logout/' + session_id,
    method: 'POST'
  });
}
exports.logout = logout;

/*
'Engage' with the Orion Event Stream.
Ensures user Presence for asyncronous stream connections (APN).
*/
function engage (token, group_ids) {
  console.log(Date() + ' engage() group_ids=' + group_ids);

  var engage_options = {
    url: 'https://api.orionlabs.io/api/engage',
    method: 'POST',
    headers: { 'Authorization': token },
    json: {
      seqnum: Date.now(),
      groupIds: group_ids,
      destinations: [{
        destination: 'EventStream',
        verbosity: 'active'
      }]
    }
  };

  /*
  Start a Timer every time we Engage. If we don't receive a Ping within this
  period, we'll attempt to re-engage.

  The prescribed period is 5 minutes, or 300000 ms.
  */
  var engageTimer = setTimeout(function () {
    console.log(Date() + ' Engage Timeout.');
    engage (token, group_ids);
  }, 360000);

  function engage_callback (error, response, body) {
    if (error) {
      console.log(Date() + ' Unable to Engage. error=' + error);
    } else if (response.statusCode === 409) {
      console.log(Date() + ' Re-engaging.');
      clearTimeout(engageTimer);
      engage (token, group_ids);
    } else if (!error && response.statusCode === 200) {
      console.log(Date() + ' Engaged.');
    } else {
      console.log(Date() + ' Unable to Engage!');
    }
  }

  request(engage_options, engage_callback);
}
exports.engage = engage;


// Respond to an Event Stream Engage Ping
function pong (token, ping_id) {
  console.log(Date() + ' pong() ping_id=' + ping_id);
  return new Promise(function(resolve, reject) {
    request({
      url: 'https://api.orionlabs.io/api/pong',
      method: 'POST',
      headers: { 'Authorization': token }
    }, function (err, response, body) {
      if (err) {
        reject(response);
      } else {
        resolve(response);
      }
    });
  });
}
exports.pong = pong;


// Orion TTS-as-a-Service. (TTSAAS?)
function lyre (options) {
  var lyre_url = process.env.LYRE_URL || 'https://lyre.api.orionaster.com/lyre';
  console.debug(Date() + ' lyre_url=' + lyre_url);

  auth_promise(options.username, options.password)
    .then(function (auth) {
      request({
        url: lyre_url,
        method: 'POST',
        json: {
          'token': auth.token,
          'group_ids': options.group_ids,
          'message': options.message || null,
          'media': options.media || null,
          'target': options.target || null
        }
      },
      function (err, response, body) {
        if (err) {
          console.error(err);
        }
      });
    });

}
exports.lyre = lyre;


function lookup_promise (options, callback) {
  var ochre_url = process.env.OCHRE_URL || 'https://ochre.api.orionaster.com/ochre';

    auth_promise(options.username, options.password)
      .then(function (auth) {
        request({
          url: ochre_url,
          method: 'POST',
          json: {
            'token': auth.token,
            'user_id': auth.id,
            'msg': options.msg
          }
        },
        function (error, response, body) {
          if (error) {
            console.log(Date() + ' Lookup error=' + error);
          } else {
            callback(body.msg);
          }
        });
      });
}
exports.lookup_promise = lookup_promise;


function lookup (auth, msg, callback) {
  var ochre_url = process.env.OCHRE_URL || 'https://ochre.api.orionaster.com/ochre';
  request({
    url: ochre_url,
    method: 'POST',
    json: {
      'token': auth.token,
      'user_id': auth.id,
      'msg': msg
    }
  },
  function (error, response, body) {
    if (error) {
      console.log(Date() + ' Lookup error=' + error);
      console.log(response);
    } else {
      callback(body.msg);
    }
  });
}
exports.lookup = lookup;


function locris_wav2ov (msg, callback) {
  // Override wav2ov endpoint for local development:
  var locris_wav2ov_url = process.env.LOCRIS_WAV2OV || 'https://locris.api.orionaster.com/wav2ov',
      xhr = new XMLHttpRequest();
  console.debug(Date() + ' locris_wav2ov_url=' + locris_wav2ov_url);

  xhr.open('POST', locris_wav2ov_url, true);

  xhr.setRequestHeader('Content-Type', 'application/json');

  xhr.onreadystatechange = function () {
    if (xhr.readyState === 4 && xhr.status === 200) {
      var response = JSON.parse(xhr.responseText);
      callback(response);
    }
  };

  xhr.send(JSON.stringify(msg));
}
exports.locris_wav2ov = locris_wav2ov;


function locris_ov2wav (msg, callback) {
  var locris_ov2wav_url = process.env.LOCRIS_OV2WAV || 'https://locris.api.orionaster.com/ov2wav',
      xhr = new XMLHttpRequest();
  console.debug(Date() + ' locris_ov2wav_url=' + locris_ov2wav_url);

  xhr.open('POST', locris_ov2wav_url, true);

  xhr.setRequestHeader('Content-Type', 'application/json');

  xhr.onreadystatechange = function () {
    if (xhr.readyState === 4 && xhr.status === 200) {
      var response = JSON.parse(xhr.responseText);

      if (msg.return_type === 'buffer') {
        response.payload = Buffer.from(response.payload);
      }
      callback(response);
    }
  };

  xhr.send(JSON.stringify(msg));
}
exports.locris_ov2wav = locris_ov2wav;
