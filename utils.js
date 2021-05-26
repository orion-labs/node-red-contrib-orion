/**
 * Orion-Node Utilities for working with Orion streams & media.
 *
 * @module @orionlabs/node-orion/utils
 * @see @orionlabs/node-orion
 * @author Greg Albrecht <gba@orionlabs.io>
 * @copyright Orion Labs, Inc. https://www.orionlabs.io
 * @license Apache-2.0
 **/

'use strict';

const axios = require('axios');
const fs = require('fs');
const tmp = require('tmp');

tmp.setGracefulCleanup();

/**
 * Wrapper for Axios.
 * @param url {String} URL to hit
 * @param method {String} Method to use (default: GET)
 * @param status {Number} HTTP Status to expect (default: 200)
 * @param payload {Object} If defined, pass this as 'data'
 * @returns {Promise<unknown>}
 */
const callApi = (url, method = 'POST', status = 200, payload = {}) => {
  let options = {
    url: url,
    method: method,
    data: payload,
    validateStatus: (st) => st == status,
  };

  return new Promise((resolve, reject) => {
    axios(options)
      .then((response) => resolve(response.data))
      .catch((reason) => reject(reason));
  });
};

/**
 * Transmits to an Orion Group.
 * @param token {String} Orion Auth Token
 * @param groups {Array} List of Orion Groups to transmit to
 * @param message {String} Optional. Message to speak (using TTS)
 * @param media {String} Optional. URL to Orion Audio file to transmit
 * @param target {String} Optional. Direct message/target specified User Id
 * @returns {Promise<Object>}
 */
exports.lyre = (token, groups, message = '', media = '', target = '') => {
  const url = `${global.orionLyre}/lyre`;
  const payload = {
    token: token,
    group_ids: groups,
    message: message || null,
    media: media || null,
    target: target,
  };
  return callApi(url, 'POST', 200, payload);
};

/**
 * Decodes Orion Opus Audio to WAV.
 * @param event {Object} Orion Audio Event to decode.
 * @returns {Promise<Object>} Transformed event containing wav file.
 */
exports.ov2wav = (event) => {
  const url = `${global.orionLocris}/ov2wav`;
  return callApi(url, 'POST', 200, event).then((res) => {
    if (event.return_type === 'buffer') {
      res.payload = Buffer.from(res.payload);
    }
    return res;
  });
};

/**
 * Transcribes Orion Audio Events to text.
 * @param event {Object} Orion Audio Event to transcribe.
 * @returns {Promise<Object>} Transformed event containing transcription.
 */
exports.stt = (event) => {
  const url = `${orionLocris}/stt`;
  return callApi(url, 'POST', 200, event).then((res) => {
    if (event.return_type === 'buffer') {
      res.payload = Buffer.from(res.payload);
    }
    return res;
  });
};

/**
 * Translates Orion Opus Audio from one language to another.
 * @param event {Object} Orion Audio Event to translate.
 * @returns {Promise<Object>} Original object transformed to include
 *                            translation.
 */
exports.translate = (event) => {
  const url = `${orionLocris}/translate`;
  return callApi(url, 'POST', 200, event).then((res) => {
    if (event.return_type === 'buffer') {
      res.payload = Buffer.from(res.payload);
    }
    return res;
  });
};

/**
 * Encodes WAV file as Orion Opus file and uploads to S3.
 * @param event {Object} Node-RED message object containing audio to encode.
 * @returns {Promise<Object>} Resolves original object + media URL to ov file.
 */
exports.wav2ov = (event) => {
  const url = `${global.orionLocris}/wav2ov`;
  return callApi(url, 'POST', 200, event).then((res) => {
    if (event.return_type === 'buffer') {
      res.payload = Buffer.from(res.payload);
    }
    return res;
  });
};

/**
 * GETs Media from the given URL.
 * @param url {String} URL from which to GET media
 * @returns {Promise<unknown>}
 */
const getMedia = (url, how = 'file') => {
  return new Promise((resolve, reject) => {
    axios({
      method: 'GET',
      url: url,
      responseType: how === 'file' ? 'stream' : 'arraybuffer',
      validateStatus: (status) => status == 200,
    })
      .then((response) => {
        if (how === 'file') {
          const tmpobj = tmp.fileSync();
          const writer = fs.createWriteStream(tmpobj.name);
          response.data.pipe(writer);
          writer.on('finish', () => {
            resolve(tmpobj.name);
          });
          writer.on('error', () => {
            reject(response.data);
          });
        } else if (how === 'buffer') {
          resolve(response.data);
        }
      })
      .catch((reason) => reject(reason));
  });
};
exports.getMedia = getMedia;

/**
 * PUTs (Uploads) Data to the given URL.
 * @param url {String} URL to which we'll PUT Data
 * @param data {Uint8Array} Data to PUT
 * @returns {Promise<Object>} Returns response
 */
const putMedia = (url, data, mimeType = '') => {
  return new Promise((resolve, reject) => {
    axios({
      method: 'PUT',
      url: url,
      data: data,
      validateStatus: (status) => status == 200,
      headers: { 'Content-Type': mimeType ? mimeType : 'application/x-www-form-urlencoded' },
    })
      .then((response) => resolve(response.data))
      .catch((reason) => reject(reason));
  });
};
exports.putMedia = putMedia;
