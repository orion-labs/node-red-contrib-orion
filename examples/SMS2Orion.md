SMS To Orion
------------

The following flow receives SMS from <a href="https://twilio.com" target="_new">Twilio</a> and speaks the message into
an <a href="https://orionlabs.io" target="_new">Orion</a> Group.

This flow requires a Twilio Number with SMS support setup to POST to the URL specified by the **HTTP In** node.

![Twilio Messaging Webhook Config](https://github.com/orion-labs/node-red-contrib-orion/raw/master/docs/example-sms2orion-twilio_setup.png)

![SMS to Orion](https://github.com/orion-labs/node-red-contrib-orion/raw/master/docs/example-sms2orion.png)

1. **HTTP In**: Accepts HTTP POST at `/example_incoming_sms_endpoint`.
2. **Change**: Sets `msg.message` to `msg.payload.Body`.
3. **HTTP Response**: Returns `201` to Twilio.
4. **Orion TX**: Speaks `msg.message` into an Orion Group.

```json
[{"id":"23bb0e23.bf3532","type":"change","z":"43dbbc8.6699844","name":"","rules":[{"t":"set","p":"message","pt":"msg","to":"payload.Body","tot":"msg"}],"action":"","property":"","from":"","to":"","reg":false,"x":350,"y":680,"wires":[["2e7a597e.38ffa6"]]},{"id":"b68c9f69.7b9a8","type":"http in","z":"43dbbc8.6699844","name":"Twilio POST Endpoint","url":"/example_incoming_sms_endpoint","method":"post","upload":false,"swaggerDoc":"","x":120,"y":680,"wires":[["a4c126b2.b0c208","23bb0e23.bf3532"]]},{"id":"a4c126b2.b0c208","type":"http response","z":"43dbbc8.6699844","name":"","statusCode":"201","headers":{},"x":320,"y":720,"wires":[]},{"id":"2e7a597e.38ffa6","type":"orion_tx","z":"43dbbc8.6699844","name":"Group TX","orion_config":"","x":540,"y":680,"wires":[]}]
```
