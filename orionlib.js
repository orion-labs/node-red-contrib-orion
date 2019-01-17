


var request = require('request');
var JSONStream = require('JSONStream');
var es = require('event-stream');
var XMLHttpRequest = require('xmlhttprequest').XMLHttpRequest;


// Login to Orion.
function auth (username, password) {
  return new Promise(function(resolve, reject) {
    request({
      url: 'https://api.orionlabs.io/api/login',
      method: 'POST',
      json: { 'uid': username, 'password': password }
    }, function (err, httpResponse, body) {
      if (err) {
        reject(err);
      } else {
        resolve(body.token);
      }
    });
  });
}


exports.auth = function (username, password) {
    auth(username, password)
      .then(function (token) {
        return token;
      });
}


function engage (token, group_ids) {
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

  function engage_callback (error, response, body) {
    if (response.statusCode == 409) {
      console.log(Date() + ' Re-engaging.')
      request(engage_options, engage_callback);
    } else if (!error && response.statusCode == 200) {
      console.log(Date() + ' Engaged.')
    } else {
      console.log('Unable to Engage!')
    }
  }

  request(engage_options, engage_callback);
}


function pong (token, ping_id) {
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


exports.event_stream = function (username, password, group_ids, callback) {
  var req_url = 'https://api.orionlabs.io/api/ptt/' + group_ids[0];
  console.log('Using req_url=' + req_url);

  auth(username, password).then(function (token) {

    engage(token, group_ids);

    var req_options = {
      url: req_url,
      method: 'GET',
      headers: { 'Authorization': token },
      timeout: 120000
    };

    EventStream = request(req_options, function(err) {
      console.log(err.code === 'ETIMEDOUT');
      // Set to `true` if the timeout was a connection timeout, `false` or
      // `undefined` otherwise.
      console.log(err.connect === true);
    });

    EventStream.pipe(JSONStream.parse()).pipe(es.mapSync(
      function (data) {
        if (data.event_type === 'ping') {

          // Respond to Engage's Ping/Pong
          pong(token)
            .then(function (response) {
              console.log(Date() + ' Engaged.');
            })
            .catch(function (response) {
              engage(token, group_ids);
            });
        }
        callback(data);
      }
    ));
  }
  );
};



exports.lyre = function (options) {
  var lyre_url = process.env.LYRE_URL || 'https://lyre.api.orionaster.com/lyre';

  auth(options.username, options.password)
    .then(function (token) {
      request({
          url: lyre_url,
          method: 'POST',
          json: {
              'token': token,
              'group': options.group,
              'message': options.message || null,
              'media': options.media || null,
              'target': options.target || null
          }
      },
      function (err, httpResponse, body) {
          if (err) {
              console.error(err);
          }
      });
    });

};



//module.exports = Orion;
