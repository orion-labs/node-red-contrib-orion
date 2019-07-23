#!/usr/bin/env node
/*
Orion Node.JS Library

Author:: Greg Albrecht <gba@orionlabs.io>
Copyright:: Copyright 2019 Orion Labs, Inc.
License:: Apache License, Version 2.0
Source:: https://github.com/orion-labs/node-red-contrib-orion

*/


/* jslint node: true */
/* jslint white: true */

'use strict';

var XMLHttpRequest = require('xmlhttprequest').XMLHttpRequest;

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


var LYRE_URL = 'https://lyre.api.orionaster.com/lyre';
var OCHRE_URL = 'https://ochre.api.orionaster.com/ochre';
var LOCRIS_OV2WAV = 'https://locris.api.orionaster.com/ov2wav';
var LOCRIS_WAV2OV = 'https://locris.api.orionaster.com/wav2ov';
var LOCRIS_STT = 'https://locris.api.orionaster.com/stt';


// Login to Orion and retrieve a Auth Token, then call callback:
function auth(username, password, callback) {
  request({
    url: 'https://api.orionlabs.io/api/login',
    method: 'POST',
    json: {'uid': username, 'password': password},
  }, function(error, response, body) {
    if (error) {
      return callback({error: error});
    } else if (response.statusCode !== 200) {
      return callback({error: 'Auth Status Code != 200'});
    } else if (response.statusCode === 200) {
      return callback(body);
    }
  });
}
exports.auth = auth;

// Login to Orion and retrieve a Auth Token for later use:
function authPromise(username, password) {
  return new Promise(function(resolve, reject) {
    request({
      url: 'https://api.orionlabs.io/api/login',
      method: 'POST',
      json: {'uid': username, 'password': password},
    }, function(error, response, body) {
      if (error) {
        reject(error);
      } else {
        resolve({token: body.token, id: body.id});
      }
    });
  });
}
exports.authPromise = authPromise;


function logout(sessionId) {
  request({
    url: 'https://api.orionlabs.io/api/logout/' + sessionId,
    method: 'POST',
  });
}
exports.logout = logout;

/*
'Engage' with the Orion Event Stream.
Ensures user Presence for asyncronous stream connections (APN).
*/
function engage(token, groupIds, verbosity) {
  console.log(Date() + ' engage() groupIds=' + groupIds);

  // Legacy EventStream 'debug' verbosity
  var _verbosity = verbosity === 'debug' ? 'active' : verbosity;

  var engageOptions = {
    url: 'https://api.orionlabs.io/api/engage',
    method: 'POST',
    headers: {'Authorization': token},
    json: {
      seqnum: Date.now(),
      groupIds: groupIds,
      destinations: [{destination: 'EventStream', verbosity: _verbosity}],
    },
  };

  /*
  Start a Timer every time we Engage. If we don't receive a Ping within this
  period, we'll attempt to re-engage.

  The prescribed period is 5 minutes, or 300000 ms.
  */
  var engageTimer = setTimeout(function() {
    console.log(Date() + ' Engage Timeout.');
    return engage(token, groupIds);
  }, 360000);

  function engageCallback(error, response, body) {
    if (error) {
      console.log(Date() + ' Unable to Engage. error=' + error);
    } else if (response.statusCode === 409) {
      console.log(Date() + ' Re-engaging.');
      clearTimeout(engageTimer);
      return engage(token, groupIds);
    } else if (!error && response.statusCode === 200) {
      console.log(Date() + ' Engaged.');
    } else {
      console.log(Date() + ' Unable to Engage!');
    }
  }

  return request(engageOptions, engageCallback);
}
exports.engage = engage;


// Respond to an Event Stream Engage Ping
function pong(token, pingId) {
  console.log(Date() + ' pong() pingId=' + pingId);
  return new Promise(function(resolve, reject) {
    request({
      url: 'https://api.orionlabs.io/api/pong',
      method: 'POST',
      headers: {'Authorization': token},
    }, function(err, response, body) {
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
function lyre(options) {
  var lyreUrl = process.env.LYRE_URL || LYRE_URL;
  console.debug(Date() + ' lyreUrl=' + lyreUrl);
  var token;
  var user_id;

  authPromise(options.username, options.password)
    .then(function(auth) {
        token = auth.token;
        user_id = auth.id;

        var target = options.target || null;
        if (options.target_self) {
            target = user_id;
        }

        if (options.use_all_groups === true) {
            var url = 'https://api.orionlabs.io/api/users/' + user_id;
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
                            options.groupIds.push(group.id);
                        });
                        console.log(Date() + ' lyre() groupIds=' + options.groupIds);
                        request({
                            url: lyreUrl,
                            method: 'POST',
                            json: {
                                'token': auth.token,
                                'group_ids': options.groupIds,
                                'message': options.message || null,
                                'media': options.media || null,
                                'target': target,
                            },
                          },
                          function(err, response, body) {
                              if (err) {
                                  console.error(err);
                              }
                        });
                    }
                }
            );
        } else {
            console.log(Date() + ' lyre() groupIds=' + options.groupIds);
            request({
                url: lyreUrl,
                method: 'POST',
                json: {
                    'token': auth.token,
                    'group_ids': options.groupIds,
                    'message': options.message || null,
                    'media': options.media || null,
                    'target': target,
                },
              },
              function(err, response, body) {
                if (err) {
                    console.error(err);
                }
              });
        }
    });
}
exports.lyre = lyre;


function lookupPromise(options, callback) {
  var ochreUrl = process.env.OCHRE_URL || OCHRE_URL;

    authPromise(options.username, options.password)
      .then(function(auth) {
        request({
          url: ochreUrl,
          method: 'POST',
          json: {
            'token': auth.token,
            'user_id': auth.id,
            'msg': options.msg,
          },
        },
        function(error, response, body) {
          if (error) {
            console.log(Date() + ' Lookup error=' + error);
          } else {
            callback(body.msg);
          }
        });
      });
}
exports.lookupPromise = lookupPromise;


function lookup(auth, msg, callback) {
  var ochreUrl = process.env.OCHRE_URL || OCHRE_URL;
  request({
    url: ochreUrl,
    method: 'POST',
    json: {
      'token': auth.token,
      'user_id': auth.id,
      'msg': msg,
    },
  },
  function(error, response, body) {
    if (error) {
      console.log(Date() + ' Lookup error=' + error);
      console.log(response);
    } else {
      callback(body.msg);
    }
  });
}
exports.lookup = lookup;


function locrisWAV2OV(msg, callback) {
  // Override wav2ov endpoint for local development:
  var locrisWAV2OVURL = process.env.LOCRIS_WAV2OV || LOCRIS_WAV2OV;
  var xhr = new XMLHttpRequest();

  console.debug(Date() + ' locrisWAV2OVURL=' + locrisWAV2OVURL);

  xhr.open('POST', locrisWAV2OVURL, true);

  xhr.setRequestHeader('Content-Type', 'application/json');

  xhr.onreadystatechange = function() {
    if (xhr.readyState === 4 && xhr.status === 200) {
      var response = JSON.parse(xhr.responseText);
      callback(response);
    }
  };

  xhr.send(JSON.stringify(msg));
}
exports.locrisWAV2OV = locrisWAV2OV;


function locrisOV2WAV(msg, callback) {
  var locrisOV2WAVURL = process.env.LOCRIS_OV2WAV || LOCRIS_OV2WAV;
  var xhr = new XMLHttpRequest();

  console.debug(Date() + ' locrisOV2WAVURL=' + locrisOV2WAVURL);

  xhr.open('POST', locrisOV2WAVURL, true);

  xhr.setRequestHeader('Content-Type', 'application/json');

  xhr.onreadystatechange = function() {
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
exports.locrisOV2WAV = locrisOV2WAV;


function locrisSTT(msg, callback) {
  var locrisSTTURL = process.env.LOCRIS_STT || LOCRIS_STT;
  var xhr = new XMLHttpRequest();

  console.debug(Date() + ' locrisSTTURL=' + locrisSTTURL);

  xhr.open('POST', locrisSTTURL, true);

  xhr.setRequestHeader('Content-Type', 'application/json');

  xhr.onreadystatechange = function() {
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
exports.locrisSTT = locrisSTT;
