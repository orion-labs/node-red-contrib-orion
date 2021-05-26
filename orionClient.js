/**
 * Orion Node.js Module. Functions for connecting to the Orion Platform.
 *
 * @module @orionlabs/node-orion
 * @author Greg Albrecht <gba@orionlabs.io>
 * @copyright Orion Labs, Inc. https://www.orionlabs.io
 * @license Apache-2.0
 **/

'use strict';

const axios = require('axios');
const fs = require('fs');
const Swagger = require('swagger-client');
const uuid = require('uuid');
const WebSocket = require('ws');

const utils = require('./utils');
exports.utils = utils;

global.orionApi = process.env.ORION_API_URL || "https://api.orionlabs.io" ;
global.orionMedia = process.env.ORION_MEDIA_URL || "https://alnitak-rx.orionlabs.io";
global.orionEventstream = process.env.ORION_EVENTSTREAM_URL || "https://alnilam.orionlabs.io";
global.orionEventstreamWS = process.env.ORION_EVENTSTREAM_WS ||"wss://alnilam.orionlabs.io";
global.orionDatastore = process.env.ORION_DATASTORE_URL || "https://icarus.orionlabs.io/v1/graphql/";
global.orionLocris = process.env.ORION_LOCRIS_URL || "https://locris.api.orionaster.com";
global.orionLyre = process.env.ORION_LYRE_URL || "https://lyre.api.orionaster.com";

function logServiceEndpoints(){
  console.log(`API: ${global.orionApi}`)
  console.log(`Media: ${global.orionMedia}`)
  console.log(`Eventstream: ${global.orionEventstream}`)
  console.log(`EventstreamWS: ${global.orionEventstreamWS}`)
  console.log(`Datastore: ${global.orionDatastore}`)
  console.log(`Locris: ${global.orionLocris}`)
  console.log(`Lyre: ${global.orionLyre}`)

}

/**
 * Wrapper for Axios with pre-built headers for Orion API calls.
 * @param token {String} API Auth Token to use
 * @param url {String} URL to hit
 * @param method {String} Method to use (default: GET)
 * @param status {Number} HTTP Status to expect (default: 200)
 * @param payload {Object} If defined, pass this as 'data'
 * @returns {Promise<unknown>}
 */
const callOrion = (token, url, method = 'GET', status = 200, payload = {}) => {
  let options = {
    url: url,
    method: method,
    data: payload,
    headers: { Authorization: token },
    validateStatus: (st) => st == status,
  };

  return new Promise((resolve, reject) => {
    axios(options)
      .then((response) => resolve(response.data))
      .catch((reason) => reject(reason));
  });
};

/**
 * Authenticates against the Orion Platform, and retrieves an Auth Object:
 * {
 *   token: API Auth Token,
 *   id: Your platform user Id,
 *   sessionId: The unique Session Id for this token.
 * }
 * @param username {string} Username for Orion
 * @param password {string} Password for Orion
 * @returns {Promise<Object>} Authentication object
 */
const auth = (username, password) => {
  logServiceEndpoints();
  return new Promise((resolve, reject) => {
    Swagger(`${global.orionApi}/api/swagger.json`)
      .then((client) => {
        const authParams = { uid: username, password: password };
        client.apis.auth
          .login({ body: authParams })
          .then((response) => resolve(response.body))
          .catch((reason) => reject(reason.response.body));
      })
      .catch((error) => reject(error));
  });
};
exports.auth = auth;
exports.login = auth;

/**
 * Logout of a given Orion Session.
 * Orion issues authentication Tokens of a specific TTL upon successful
 * login. To invalidate these tokens a user can call the logout endpoint.
 * @param sessionId {string} ID of the Orion Session to logout from
 * @returns {Promise<Object>} Resolves or Rejects successful logout
 */
const logout = (token, sessionId) =>
  callOrion(token, `${global.orionApi}/api/logout/${sessionId}`, 'POST', 204);

exports.logout = logout;

/**
 * Gets the current Orion User's Profile information.
 * @param token {String} Orion Auth Token
 * @returns {Promise<Object>} Resolves to the User's Profile as an Object
 */
const whoami = (token) => callOrion(token, `${global.orionApi}/api/whoami`);
exports.whoami = whoami;

/**
 * Updates a User's Status.
 * @param token {String} Authentication Token
 * @param userstatus {Object} User Status Object to update with
 * @returns {Promise<Object>} Updated User Status
 */
const updateUserStatus = (token, userstatus) => {
  return callOrion(
    token,
    `${global.orionApi}/api/users/${userstatus.id}/status`,
    'PATCH',
    204,
    userstatus,
  );
};
exports.updateUserStatus = updateUserStatus;

/**
 * Engages ("subscribes") to Orion Group Event Streams.
 * @param token {String} Orion Authentication Token
 * @param groups {String|Array} List of groups to engage with.
 * @param verbosity {String} Stream verbosity level.
 * @returns {Promise<Object>} Group(s) Configuration.
 */
const engage = (token, groups, verbosity = 'active') => {
  if (typeof groups === 'string') {
    groups = groups.split(',');
  }

  let payload = {
    seqnum: Date.now(),
    groupIds: groups,
    destinations: [{ destination: 'EventStream', verbosity: verbosity }],
  };

  return callOrion(token, `${global.orionApi}/api/engage`, 'POST', 200, payload);
};
exports.engage = engage;

/**
 * Gets all Groups for the current user (as determined by the token).
 * @param token {String} Orion Authentication Token.
 * @returns {Promise<Object>} User's Groups
 */
const getAllUserGroups = (token) => {
  return whoami(token).then((resolve) => {
    return callOrion(token, `${global.orionApi}/api/users/${resolve.id}`).then(
      (res) => res.groups,
    );
  });
};
exports.getAllUserGroups = getAllUserGroups;

/**
 * Gets an Web Socket Ticket
 * @param token {String} Orion Auth Token
 * @returns {Promise<String>} Web Socket Ticket
 */
const getAlmilamTicket = (token) => callOrion(token, `${global.orionEventstream}/api/ticket`);
exports.getAlmilamTicket = getAlmilamTicket;

/**
 * Respond to an Orion Event Stream keepalive 'Ping'
 * @param token {String} Orion Authentication Token
 * @returns {Promise<Object>} Updated Stream Configuration
 */
const pong = (token) => callOrion(token, `${global.orionApi}/api/pong`, 'POST');
exports.pong = pong;

/**
 * Gets User Status for the given User Id
 * @param token {String} Orion Authentication Token
 * @param userId {String} Orion User Id
 * @returns {Promise<Object>} Orion User Profile
 */
const getUserStatus = (token, userId) =>
  callOrion(token, `${global.orionApi}/api/users/${userId}/status`);
exports.getUserStatus = getUserStatus;

/**
 * Gets User Profile for the given User Id
 * @param token {String} Orion Authentication Token
 * @param userId {String} Orion User Id
 * @returns {Promise<Object>} User Profile
 */
const getUser = (token, userId) => callOrion(token, `${global.orionApi}/api/users/${userId}`);
exports.getUser = getUser;

/**
 * Gets Group Profile for the given Group Id
 * @param token {String} Orion Authentication Token
 * @param groupId {String} Orion Group Id
 * @returns {Promise<Object>} Orion Group Profile
 */
const getGroup = (token, groupId) =>
  callOrion(token, `${global.orionApi}/api/groups/${groupId}`);
exports.getGroup = getGroup;

/**
 * Gets the media base URL for the current user.
 * @param token {String} Orion Auth Token.
 * @returns {Promise<String>} Media Base URL
 */
const getMediaBase = () => {
  return callOrion('PLAT-230', `${global.orionApi}/admin/mediabase`).then((res) => res.mediabase);
}

/**
 * Transmits multimedia to a given Orion group.
 * @param token {String} Orion Authentication Token
 * @param groupId {String} Orion Group to transmit to
 * @param event {Object} Event to transmit
 * @returns {Promise<Object>} Return status and body, if any.
 */
const postMultimediaEvent = (token, groupId, event) =>
  callOrion(token, `${global.orionApi}/multimedia/${groupId}`, 'POST', 204, event);

/**
 * POSTs a PTT Event to the Orion API.
 * @param token {String} Auth Token
 * @param groupId {String} Group to which to POST PTT Event
 * @param event {Object} PTT Event Object
 * @returns {Promise<unknown>} Response from server.
 */
const postPttEvent = (token, groupId, event) =>
  callOrion(token, `${global.orionApi}/ptt/${groupId}`, 'POST', 204, {
    media: event.ptt_event.media,
    ts: event.ptt_event.ts,
    stream_key: event.ptt_event.stream_key,
  });

/**
 * Sends a PTT Voice message to a group.
 * @param token {String} Orion Authentication Token
 * @param media {Uint8Array} Media to transmit
 * @param groupId {String} Group to transmit to
 * @param streamKey {String} If present, indicates message is encrypted w/ key
 * @returns {Promise<Object>} Return status and body, if any.
 */
const sendPtt = (token, media, groupId, target = null, streamKey = '') => {
  return new Promise((resolve, reject) => {
    getMediaBase()
      .then((mediabase) => {
        const mediaURL = `${mediabase}${uuid.v4()}.ov`;
        utils
          .putMedia(mediaURL, media)
          .then(() => {
            let event = {
              event_type: 'ptt',
              ptt_event: {
                media: mediaURL,
                mime_type: 'audio/vnd.orion.opus',
                ts: new Date() / 1000, // {float} Client-side timestamp
              },
            };

            if (target) {
              event.ptt_event.target_user_id = target;
            }

            if (streamKey) {
              event.ptt_event.stream_key = streamKey;
            }

            // TODO: Switch to sendMultimediaEvent when Android bug is fixed.
            postPttEvent(token, groupId, event)
              .then((response) => resolve(response))
              .catch((reason) => reject(reason));
          })
          .catch((reason) => reject(reason));
      })
      .catch((reason) => reject(reason));
  });
};
exports.sendPtt = sendPtt;

/**
 * Sends a Text Multimedia message to a group.
 * @param token {String} Orion Authentication Token
 * @param message {String} Message to transmit
 * @param groupId {String} Group to transmit to
 * @param streamKey {String} If present, indicates message is encrypted w/ key
 * @returns {Promise<Object>} Return status and body, if any.
 */
const sendText = (token, message, groupId, target = null, streamKey = '') => {
  return new Promise((resolve, reject) => {
    getMediaBase()
      .then((mediabase) => {
        const mediaURL = `${mediabase}${uuid.v4()}.txt`;
        if (!streamKey && typeof message === 'string' && !message.startsWith('Vt11')) {
          message = 'Vt11' + message;
        }
        utils
          .putMedia(mediaURL, message)
          .then(() => {
            let event = {
              event_type: 'text',
              text_event: {
                media: mediaURL,
                char_set: 'utf-8',
                mime_type: 'text/plain',
                ts: new Date() / 1000, // {float} Client-side timestamp
              },
            };

            if (target) {
              event.text_event.target_user_id = target;
            }

            if (streamKey) {
              event.text_event.stream_key = streamKey;
            }

            postMultimediaEvent(token, groupId, event)
              .then((response) => resolve(response))
              .catch((reason) => reject(reason));
          })
          .catch((reason) => reject(reason));
      })
      .catch((reason) => reject(reason));
  });
};
exports.sendText = sendText;

/**
 * Sends a Multimedia Image Message to a group.
 * @param token {String} Orion Authentication Token
 * @param media {Uint8Array} Image to transmit
 * @param groupId {String} Group to transmit to
 * @param streamKey {String} If present, indicates message is encrypted w/ key
 * @returns {Promise<Object>} Return status and body, if any.
 */
const sendImage = (
  token,
  media,
  groupId,
  target = null,
  streamKey = '',
  mimeType = 'image/png',
  thumbMedia = '',
) => {
  // Generate a pseudo-random file name:
  const fileId = uuid.v4();
  const fileExt = mimeType.split('/').pop();
  const fileName = [fileId, fileExt].join('.');
  const thumbFileName = [fileId + '_thumb', fileExt].join('.');

  return new Promise((resolve, reject) => {
    getMediaBase()
      .then((mediabase) => {
        const mediaURL = mediabase + fileName;
        const thumbURL = mediabase + thumbFileName;

        utils
          .putMedia(mediaURL, media)
          .then(() => {
            new Promise((resolve) => {
              if (thumbMedia) {
                utils.putMedia(thumbURL, thumbMedia, mimeType).then(() => resolve());
              } else {
                resolve();
              }
            }).then(() => {
              let event = {
                event_type: 'image',
                image_event: {
                  media: mediaURL,
                  mime_type: mimeType,
                  friendly_filename: fileName,
                  ts: new Date() / 1000, // {float} Client-side timestamp
                },
              };

              if (target) {
                event.image_event.target_user_id = target;
              }

              if (streamKey) {
                event.image_event.stream_key = streamKey;
              }

              if (thumbMedia) {
                event.image_event.thumbnail_url = thumbURL;
              }

              postMultimediaEvent(token, groupId, event)
                .then((response) => resolve(response))
                .catch((reason) => reject(reason));
            });
          })
          .catch((reason) => reject(reason));
      })
      .catch((reason) => reject(reason));
  });
};
exports.sendImage = sendImage;

/**
 * Connects to the Orion Event Stream Websocket
 * @param token {String} Orion Auth Ticket
 * @returns {Promise<ws>} Websocket session
 */
const connectToWebsocket = (token) => {
  return new Promise((resolve) => {
    getAlmilamTicket(token).then((result) => {
      let tokenId = result.token_id;
      let wsURL = `${global.orionEventstreamWS}/stream/${tokenId}/wss`;

      let wsConnection = new WebSocket(wsURL);

      wsConnection.addEventListener('open', () => {
        resolve(wsConnection);
      });
    });
  });
};
exports.connectToWebsocket = connectToWebsocket;

/**
 * Uploads a media file to the server-specified Media Base.
 * @param fileName {String} Path to filename to read & upload
 * @returns {Promise<String>} URL to uploaded media
 */
const uploadMedia = (fileName) => {
  return new Promise((resolve, reject) => {
    getMediaBase()
      .then((mediabase) => {
        const mediaURL = mediabase + uuid.v4();
        const media = new Uint8Array(fs.readFileSync(fileName));
        utils
          .putMedia(mediaURL, media)
          .then(() => resolve(mediaURL))
          .catch((reason) => reject(reason));
      })
      .catch((reason) => reject(reason));
  });
};
exports.uploadMedia = uploadMedia;
