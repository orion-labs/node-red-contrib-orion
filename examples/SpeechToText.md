Speech To Text
--------------

# Speech To Text with IBM Watson
The following flow uses [IBM Watson Speech to Text](https://www.ibm.com/watson/services/speech-to-text/) to convert Orion PTT Audio to text, and searches that text for a keyword. If the keyword is found, the
flow responds to the Orion Group with a predefined message.

## Requirements

This flow requires an IBM Watson Speech-To-Text account and assicated app keys. IBM has a "Lite" account which is free.

## Orion Flow

![Speech-To-Text](https://github.com/orion-labs/node-red-contrib-orion/raw/master/docs/example-stt.png)

## Code for Importing into Node-RED or Orion Aster

```json
[{"id":"31ed2883.795ce8","type":"orion_decode","z":"f038a834.836688","name":"","x":380,"y":520,"wires":[["8643dbce.4f47c8"]]},{"id":"8643dbce.4f47c8","type":"change","z":"f038a834.836688","name":"","rules":[{"t":"set","p":"payload","pt":"msg","to":"media_wav","tot":"msg"}],"action":"","property":"","from":"","to":"","reg":false,"x":560,"y":520,"wires":[["a22b887d.5a09b8"]]},{"id":"67ad40c.d552bc","type":"switch","z":"f038a834.836688","name":"If \"taco\"","property":"transcription","propertyType":"msg","rules":[{"t":"cont","v":"taco","vt":"str"}],"checkall":"true","repair":false,"outputs":1,"x":280,"y":560,"wires":[["95a61fdd.9c9ed"]]},{"id":"77c7be33.069e8","type":"orion_tx","z":"f038a834.836688","name":"Orion TX","orion_config":"","x":620,"y":560,"wires":[]},{"id":"95a61fdd.9c9ed","type":"change","z":"f038a834.836688","name":"","rules":[{"t":"set","p":"message","pt":"msg","to":"TACO PARTY!","tot":"str"}],"action":"","property":"","from":"","to":"","reg":false,"x":450,"y":560,"wires":[["77c7be33.069e8"]]},{"id":"82a506c4.286578","type":"orion_rx","z":"f038a834.836688","name":"Orion RX","orion_config":"","x":100,"y":520,"wires":[["c393611a.adb47"]]},{"id":"c393611a.adb47","type":"switch","z":"f038a834.836688","name":"","property":"event_type","propertyType":"msg","rules":[{"t":"eq","v":"ptt","vt":"str"}],"checkall":"true","repair":false,"outputs":1,"x":230,"y":520,"wires":[["31ed2883.795ce8"]]},{"id":"a22b887d.5a09b8","type":"watson-speech-to-text","z":"f038a834.836688","name":"","alternatives":1,"speakerlabels":true,"smartformatting":false,"lang":"en-US","langhidden":"en-US","langcustom":"NoCustomisationSetting","langcustomhidden":"","band":"NarrowbandModel","bandhidden":"","password":"","apikey":"","payload-response":false,"streaming-mode":false,"streaming-mute":true,"auto-connect":false,"discard-listening":false,"disable-precheck":false,"default-endpoint":true,"service-endpoint":"https://stream.watsonplatform.net/speech-to-text/api","x":120,"y":560,"wires":[["67ad40c.d552bc"]]}]
```

# Speech to Text with Microsoft Cognitive Services

The following flow uses [Microsoft Cognitive Services](https://azure.microsoft.com/en-us/services/cognitive-services/) to convert Orion PTT Audio to text, and searches that text for a keyword. If the keyword is found, the
flow responds to the Orion Group with a predefined message.

## Requirements

This flow requires an Azure Account account and assicated app keys. Azure has a free trial accounts.

## Code for Importing into Node-RED or Orion Aster
```json
[{"id":"c1afab9e.5c5958","type":"tab","label":"Flow 2","disabled":false,"info":""},{"id":"6c0894e4.5711ac","type":"orion_decode","z":"c1afab9e.5c5958","name":"","x":380,"y":180,"wires":[["fca94b5b.ab4c78"]]},{"id":"fca94b5b.ab4c78","type":"change","z":"c1afab9e.5c5958","name":"","rules":[{"t":"set","p":"payload","pt":"msg","to":"media_wav","tot":"msg"}],"action":"","property":"","from":"","to":"","reg":false,"x":560,"y":180,"wires":[["da6b5c67.1a78"]]},{"id":"4c9d4a80.5567b4","type":"switch","z":"c1afab9e.5c5958","name":"If \"taco\"","property":"transcription","propertyType":"msg","rules":[{"t":"cont","v":"taco","vt":"str"}],"checkall":"true","repair":false,"outputs":1,"x":280,"y":220,"wires":[["4083e971.e818b8"]]},{"id":"cdb3c0fa.92c5b","type":"orion_tx","z":"c1afab9e.5c5958","name":"Orion TX","orion_config":"","x":620,"y":220,"wires":[]},{"id":"4083e971.e818b8","type":"change","z":"c1afab9e.5c5958","name":"","rules":[{"t":"set","p":"message","pt":"msg","to":"TACO PARTY!","tot":"str"}],"action":"","property":"","from":"","to":"","reg":false,"x":450,"y":220,"wires":[["cdb3c0fa.92c5b"]]},{"id":"1233d5b2.6cd4fa","type":"orion_rx","z":"c1afab9e.5c5958","name":"Orion RX","orion_config":"","x":100,"y":180,"wires":[["66cd7c1f.f073a4"]]},{"id":"66cd7c1f.f073a4","type":"switch","z":"c1afab9e.5c5958","name":"","property":"event_type","propertyType":"msg","rules":[{"t":"eq","v":"ptt","vt":"str"}],"checkall":"true","repair":false,"outputs":1,"x":230,"y":180,"wires":[["6c0894e4.5711ac"]]},{"id":"da6b5c67.1a78","type":"Speech To Text","z":"c1afab9e.5c5958","name":"","userAgent":"Linux OS","locale":"en-US","x":120,"y":220,"wires":[["4c9d4a80.5567b4"]]}]
```
