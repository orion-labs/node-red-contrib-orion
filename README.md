node-red-contrib-orion
======================

<a href="http://nodered.org" target="_new">Node-RED</a> nodes to talk to <a href="http://orionlabs.io" target="_new">Orion</a>.

Orion is an Advanced Voice Platform for instant team communications across any
device, on any network, without boundaries. The primary Orion Application is
Push-To-Talk, where users can speak-to and be heard-by groups using the Orion
Smartphone Applications for iOS and Android, and using specialized devices
such as the Orion Onyx, Orion Sync.

In addition to speaking to people, users can speak to 'things'. Using Orion's
Voice Superpowers users can build Bots that respond to voice commands, user
actions, and other knowledge about the user's state (location, geo-fencing, etc).

Orion truly is Push-to-Talk with SUPERPOWERS!

Install
-------

Run the following command in your Node-RED user directory - typically `~/.node-red`

```bash
$ npm install node-red-contrib-orion
```

Requirements
------------

Before using these Nodes, you should sign-up for an Orion account using the
*FREE* Orion App on your [iOS](https://itunes.apple.com/us/app/orion-communications-onyx/id984202314?ls=1&mt=8) or [Android](https://play.google.com/store/apps/details?id=com.onbeep.obiwan) Phone.

Usage
-----

Provides several nodes for receiving, transmitting, decoding & encoding messages, as well as a node for retrieving user & group info from Orion.

Encode, Decode and Lookup Nodes act as Transforms, and are intended to be used in-line (or piped) between Terminal Nodes. That is, they'll accept input `msg`s, and append new fields to the `msg` on output.

### Input/Receive (Orion RX)

![Orion RX Node](https://github.com/orion-labs/node-red-contrib-orion/raw/master/docs/orion_rx.png)

Orion input node, used to receive messages from a specified Orion Group.

Sets the `msg` body to the Event body received from Orion.

There are several Event Types, but the two significant ones are 'User Status' and 'PTT'.

#### User Status Event

Orion clients periodically send User Status updates to other users within a Group. This allows group
members to see each other's Presence (online or offline), Muted State (muted or not), and if available,
Location.

```json
{
  "eventId": "8500fe502a5d4f4aab194c0f1e33ee1f",
  "event_type": "userstatus",
  "presence": "online",
  "muted": false,
  "sender_token_hash": "1f570302db214ad29e75dee16d9e348f",
  "location": {
    "lat": 37.760038,
    "timestamp": 0,
    "lng": -122.497455,
    "accuracy": 0
  },
  "groups": [{
    "group_id": "2f8b4570149f4501b0607c26480778b1",
    "presence": "online"
  }],
  "id": "a16f681a1d0847c685dc6b09eedf62d9"
}
```

Fields are as follows:
- `event_type`: Type of Event, in this case `userstatus`.
- `id`: UID of User for whom the User Status event represents.
- `location`: Latitude, Longitude & Accuracy of User's location, if available.
- `presence`: User's state, in this case `online`, as opposed to `offline`.
- `muted`: User's audio state if they have a device that supports muting.
- `groups`:


#### PTT (Push-to-Talk) Event

Orion clients can transmit audio messages to a Group, or directly to a user within a Group. Audio Media
is sent as a stream using Orion's proprietary audio framing, but can be easily decoded using the Decoding Node.

```json
{
  "eventId": "49a8f5209e5a4407a485d7c8b73ad42b",
  "event_type": "ptt",
  "ptt_id": "49a8f5209e5a4407a485d7c8b73ad42b",
  "sender_name": "Greg Albrecht",
  "media": "https://alnitak-rx.orionlabs.io/eb510eaa-b0cc-42e8-825a-3d87156bad22.ov",
  "ts": 1539444420.372,
  "sender_token_hash": "d0306f43ae484699869f541742bfc2a1",
  "id": "aeca5b687e424d26bb8663a53590a251",
  "ptt_seqnum": "1539444420.798206",
  "sender": "965377752a494d329fcf0b3101be6b0f"
}
```

Fields are as follows:
- `event_type`: Type of Event, in this case `ptt`.
- `sender`: UID of User transmitting this event.
- `sender_Name`: Name of User transmitting this event.
- `media`: URL to audio stream being transmitted.

### Output/Transmit (Orion TX)

Orion Output Node, used to send messages to a specified Orion Group or User.

Required Parameters
- `group`: Group ID to transmit messages to (broadcast).

Optional Parameters
- `target`: User ID to transmit message to (one-to-one).

Transmission Sources
- `message`: Text message to convert to Speech and transmit.
- `media`: WAV file to transmit.

For Example, the following `msg` body will speak the phrase ``Hello World`` to the group ``01abc``:


```json
{
  "group": "01abc",
  "message": "Hello World"
}
```

### Decoding Audio (Orion Decode)

Orion uses a proprietary framing for PTT Media. To decode these messages use the **Orion Decode** node.

By connecting the output of the Receive Node to the input of the Decode node, `media` will be decoded to `media_wav`. From there you can use the resulting WAV file as an input to any other node, for example, IBM Watson Speech-to-Text.

![Orion RX->Orion Decode](https://github.com/orion-labs/node-red-contrib-orion/raw/master/docs/orion_rx-orion_decode.png)

#### Decoded PTT

```json
{
  "eventId": "49a8f5209e5a4407a485d7c8b73ad42b",
  "event_type": "ptt",
  "ptt_id": "49a8f5209e5a4407a485d7c8b73ad42b",
  "sender_name": "Greg Albrecht",
  "media": "https://alnitak-rx.orionlabs.io/eb510eaa-b0cc-42e8-825a-3d87156bad22.ov",
  "media_wav": "https://s3-us-west-2.amazonaws.com/locris/tmp_x1q_9pc_locris_out_wav_.wav",
  "ts": 1539444420.372,
  "sender_token_hash": "d0306f43ae484699869f541742bfc2a1",
  "id": "aeca5b687e424d26bb8663a53590a251",
  "ptt_seqnum": "1539444420.798206",
  "sender": "965377752a494d329fcf0b3101be6b0f"
}
```


### Encoding Audio (Orion Encode)

Input & Output Node for encoding WAV to Orion's Audio format. Supports encoding
either a binary buffer or a file at a specified URL.

Parameters:

- `media_wav`: URL to WAV file to encode.
- `media_buf`: Binary Buffer containing WAV data to encode.

For example, the following `msg` will encode the file at the URL specified with `media_wav` to Orion's Audio Format, and return the resulting file at the URL specified by `media`:

Input `msg`:
```json
{
  "media_wav": "https://example.com/hello_world.wav"
}
```
Output `msg`:
```json
{
  "media_wav": "https://example.com/hello_world.wav",
  "media": "https://example.orionlabs.io/hello_world.ov"
}

```

## Example Flows

### 2-Way Group Bridge

The following flow 'bridges' or 'patches' two Orion groups together so that
transmissions from one group are re-transmitted to another group, and
vice-versa.

![Two Orion Groups Bridged](https://github.com/orion-labs/node-red-contrib-orion/raw/master/docs/example-2way_bridge.png)

```json
[{"id":"fcdb7143.5c244","type":"orion_rx","z":"43dbbc8.6699844","name":"Group A RX","orion_config":"fc95227d.1462c","x":90,"y":80,"wires":[["7748fadc.f08b74"]]},{"id":"7748fadc.f08b74","type":"orion_tx","z":"43dbbc8.6699844","name":"Group B TX","orion_config":"fc95227d.1462c","x":270,"y":80,"wires":[]},{"id":"94e3616d.0bc3e","type":"orion_tx","z":"43dbbc8.6699844","name":"Group A TX","orion_config":"fc95227d.1462c","x":270,"y":120,"wires":[]},{"id":"17f0f537.c1f2db","type":"orion_rx","z":"43dbbc8.6699844","name":"Group B RX","orion_config":"fc95227d.1462c","x":90,"y":120,"wires":[["94e3616d.0bc3e"]]},{"id":"fc95227d.1462c","type":"orion_config","z":"","group":"1","name":"NOOP"}]
```

### Multi-group Receive

The following flow allows one group to receive transmissions from other groups - this is similar to 'scanning' multiple other groups.

![Orion Group Receiving Transmissions from 2 other groups](https://github.com/orion-labs/node-red-contrib-orion/raw/master/docs/example-scan.png)

```json
[{"id":"9be2a9f4.d1e518","type":"orion_rx","z":"43dbbc8.6699844","name":"Group A RX","orion_config":"fc95227d.1462c","x":90,"y":240,"wires":[["1b343e95.f243f1"]]},{"id":"1b343e95.f243f1","type":"orion_tx","z":"43dbbc8.6699844","name":"Group C TX","orion_config":"fc95227d.1462c","x":270,"y":240,"wires":[]},{"id":"93480bd2.04a058","type":"orion_rx","z":"43dbbc8.6699844","name":"Group B RX","orion_config":"fc95227d.1462c","x":90,"y":280,"wires":[["1b343e95.f243f1"]]},{"id":"fc95227d.1462c","type":"orion_config","z":"","group":"1","name":"NOOP"}]
```

### Multi-Group Transmit

```json
[{"id":"9210cf9e.9df92","type":"orion_rx","z":"43dbbc8.6699844","name":"Group A RX","orion_config":"fc95227d.1462c","x":90,"y":400,"wires":[["cd54d733.303428","ae4c797d.839908"]]},{"id":"cd54d733.303428","type":"orion_tx","z":"43dbbc8.6699844","name":"Group B TX","orion_config":"fc95227d.1462c","x":270,"y":400,"wires":[]},{"id":"ae4c797d.839908","type":"orion_tx","z":"43dbbc8.6699844","name":"Group C TX","orion_config":"fc95227d.1462c","x":270,"y":440,"wires":[]},{"id":"fc95227d.1462c","type":"orion_config","z":"","group":"1","name":"NOOP"}]
```

### Listen to a Group in-browser

```json
[{"id":"9210cf9e.9df92","type":"orion_rx","z":"43dbbc8.6699844","name":"Group A RX","orion_config":"fc95227d.1462c","x":90,"y":400,"wires":[["cd54d733.303428","ae4c797d.839908"]]},{"id":"cd54d733.303428","type":"orion_tx","z":"43dbbc8.6699844","name":"Group B TX","orion_config":"fc95227d.1462c","x":270,"y":400,"wires":[]},{"id":"ae4c797d.839908","type":"orion_tx","z":"43dbbc8.6699844","name":"Group C TX","orion_config":"fc95227d.1462c","x":270,"y":440,"wires":[]},{"id":"fc95227d.1462c","type":"orion_config","z":"","group":"1","name":"NOOP"}]
```

### SMS To Orion

The following flow receives SMS from Twilio and speaks the message into
an Orion group.

![SMS to Orion](https://github.com/orion-labs/node-red-contrib-orion/raw/master/docs/example-sms2orion.png)

```json
[{"id":"9210cf9e.9df92","type":"orion_rx","z":"43dbbc8.6699844","name":"Group A RX","orion_config":"fc95227d.1462c","x":90,"y":400,"wires":[["cd54d733.303428","ae4c797d.839908"]]},{"id":"cd54d733.303428","type":"orion_tx","z":"43dbbc8.6699844","name":"Group B TX","orion_config":"fc95227d.1462c","x":270,"y":400,"wires":[]},{"id":"ae4c797d.839908","type":"orion_tx","z":"43dbbc8.6699844","name":"Group C TX","orion_config":"fc95227d.1462c","x":270,"y":440,"wires":[]},{"id":"fc95227d.1462c","type":"orion_config","z":"","group":"1","name":"NOOP"}]
```

# Support

For help with this or other Orion products, please contact Orion Support at [support@orionlabs.io](mailto:support@orionlabs.io?subject=node-red-contrib-orion)

# Copyright & License

Copyright 2018  Orion Labs, Inc.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at [http://www.apache.org/licenses/LICENSE-2.0](http://www.apache.org/licenses/LICENSE-2.0)

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
