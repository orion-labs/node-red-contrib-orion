<a href="https://orionlabs.io" target="_new"><img
  src="https://github.com/orion-labs/node-red-contrib-orion/raw/master/docs/app_icon.png"
  alt="Orion App Logo"
  width="128"
  height="128"
/></a>
<b>+</b>
<a href="https://nodered.org" target="_new"><img
  src="https://github.com/orion-labs/node-red-contrib-orion/raw/master/docs/node-red-icon-2.png"
  alt="Node-RED Logo"
  width="128"
  height="128"
/></a>


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

Orion is Push-to-Talk with SUPERPOWERS!

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

Provides several nodes for receiving, transmitting, decoding & encoding
messages, as well as a node for retrieving user & group info from Orion.

Encode, Decode and Lookup Nodes act as Transforms, and are intended to be used
in-line (or piped) between Terminal Nodes. That is, they'll accept input
`msg`s, and append new fields to the `msg` on output.


### Input/Receive (Orion RX)

![Orion RX Node](https://github.com/orion-labs/node-red-contrib-orion/raw/master/docs/orion_rx.png)

Orion input node, used to receive Events from a specified Orion Group.

There are several Event Types, but the two significant ones are 'User Status'
and 'PTT'.


### Output/Transmit (Orion TX)

![Orion TX Node](https://github.com/orion-labs/node-red-contrib-orion/raw/master/docs/orion_tx.png)

Orion Output Node, used to send Events to a specified Orion Group or User.


### Decoding Orion Audio (Orion Decode)

![Orion Decode](https://github.com/orion-labs/node-red-contrib-orion/raw/master/docs/orion_decode.png)

Orion uses a proprietary framing for PTT Media. To decode these messages use
the **Orion Decode** node.

By connecting the output of the Receive Node to the input of the Decode node,
`media` will be decoded to `media_wav`. From there you can use the resulting
WAV file as an input to any other node, for example, IBM Watson Speech-to-Text.


### Encoding Orion Audio (Orion Encode)

![Orion Encode](https://github.com/orion-labs/node-red-contrib-orion/raw/master/docs/orion_encode.png)

Input & Output Node for encoding WAV to Orion's Audio format. Supports encoding
either a binary buffer or a file at a specified URL.


### Looking Up Users & Groups (Orion Lookup)

![Orion Lookup](https://github.com/orion-labs/node-red-contrib-orion/raw/master/docs/orion_lookup.png)

Input & Output Node for looking-up Orion User & Group information.


Configure
---------

For **Orion RX**, **Orion TX**, and **Orion Lookup** Nodes, you'll need to
create at least one **Orion Config** configuration. When you first add one of
these Nodes to a Flow, you'll see that the config is blank:

![Unconfigured Node](https://github.com/orion-labs/node-red-contrib-orion/raw/master/docs/unconfigured_node.png)

Click the Edit/Pencil next to *Add new orion_config...* and enter your Orion
Login and Group information, then click *Save*:

![New Configuration](https://github.com/orion-labs/node-red-contrib-orion/raw/master/docs/new_config.png)


# Examples

See <a href="examples/">examples/</a> for many examples!


# Support

For help with this or other Orion products, please contact Orion Support at [support@orionlabs.io](mailto:support@orionlabs.io?subject=node-red-contrib-orion)

# Copyright & License

Copyright 2018 Orion Labs, Inc.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at [http://www.apache.org/licenses/LICENSE-2.0](http://www.apache.org/licenses/LICENSE-2.0)

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
