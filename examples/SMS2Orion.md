SMS To Orion
------------

The following flow receives SMS from Twilio and speaks the message into
an Orion group.

![SMS to Orion](https://github.com/orion-labs/node-red-contrib-orion/raw/master/docs/example-sms2orion.png)

```json
[{"id":"23bb0e23.bf3532","type":"change","z":"43dbbc8.6699844","name":"","rules":[{"t":"set","p":"message","pt":"msg","to":"payload.Body","tot":"msg"}],"action":"","property":"","from":"","to":"","reg":false,"x":350,"y":680,"wires":[["2e7a597e.38ffa6"]]},{"id":"b68c9f69.7b9a8","type":"http in","z":"43dbbc8.6699844","name":"Twilio POST Endpoint","url":"/example_incoming_sms_endpoint","method":"post","upload":false,"swaggerDoc":"","x":120,"y":680,"wires":[["a4c126b2.b0c208","23bb0e23.bf3532"]]},{"id":"a4c126b2.b0c208","type":"http response","z":"43dbbc8.6699844","name":"","statusCode":"201","headers":{},"x":320,"y":720,"wires":[]},{"id":"2e7a597e.38ffa6","type":"orion_tx","z":"43dbbc8.6699844","name":"Group TX","orion_config":"","x":540,"y":680,"wires":[]}]
```
