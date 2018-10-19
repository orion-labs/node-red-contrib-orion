Speech To Text
--------------

# Speech To Text with IBM Watson
The following flow uses [IBM Watson Speech to Text](https://www.ibm.com/watson/services/speech-to-text/) to convert Orion PTT Audio to text, and searches that text for a keyword. If the keyword is found, the
flow responds to the Orion Group with a predefined message.

## Requirements

This flow requires an IBM Watson Speech-To-Text account and assicated app keys. IBM has a "Lite" account which is free. 

## Orion Flow

![Speech-To-Text](https://github.com/orion-labs/node-red-contrib-orion/raw/master/docs/example-stt.png)

## Code for Importing into Aster or NodeRED

```json
[{"id":"31ed2883.795ce8","type":"orion_decode","z":"f038a834.836688","name":"","x":380,"y":520,"wires":[["8643dbce.4f47c8"]]},{"id":"8643dbce.4f47c8","type":"change","z":"f038a834.836688","name":"","rules":[{"t":"set","p":"payload","pt":"msg","to":"media_wav","tot":"msg"}],"action":"","property":"","from":"","to":"","reg":false,"x":560,"y":520,"wires":[["a22b887d.5a09b8"]]},{"id":"67ad40c.d552bc","type":"switch","z":"f038a834.836688","name":"If \"taco\"","property":"transcription","propertyType":"msg","rules":[{"t":"cont","v":"taco","vt":"str"}],"checkall":"true","repair":false,"outputs":1,"x":280,"y":560,"wires":[["95a61fdd.9c9ed"]]},{"id":"77c7be33.069e8","type":"orion_tx","z":"f038a834.836688","name":"Orion TX","orion_config":"","x":620,"y":560,"wires":[]},{"id":"95a61fdd.9c9ed","type":"change","z":"f038a834.836688","name":"","rules":[{"t":"set","p":"message","pt":"msg","to":"TACO PARTY!","tot":"str"}],"action":"","property":"","from":"","to":"","reg":false,"x":450,"y":560,"wires":[["77c7be33.069e8"]]},{"id":"82a506c4.286578","type":"orion_rx","z":"f038a834.836688","name":"Orion RX","orion_config":"","x":100,"y":520,"wires":[["c393611a.adb47"]]},{"id":"c393611a.adb47","type":"switch","z":"f038a834.836688","name":"","property":"event_type","propertyType":"msg","rules":[{"t":"eq","v":"ptt","vt":"str"}],"checkall":"true","repair":false,"outputs":1,"x":230,"y":520,"wires":[["31ed2883.795ce8"]]},{"id":"a22b887d.5a09b8","type":"watson-speech-to-text","z":"f038a834.836688","name":"","alternatives":1,"speakerlabels":true,"smartformatting":false,"lang":"en-US","langhidden":"en-US","langcustom":"NoCustomisationSetting","langcustomhidden":"","band":"NarrowbandModel","bandhidden":"","password":"","apikey":"","payload-response":false,"streaming-mode":false,"streaming-mute":true,"auto-connect":false,"discard-listening":false,"disable-precheck":false,"default-endpoint":true,"service-endpoint":"https://stream.watsonplatform.net/speech-to-text/api","x":120,"y":560,"wires":[["67ad40c.d552bc"]]}]
```
