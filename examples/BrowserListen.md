Listen to a Group in a Web Browser
----------------------------------

The following flow plays PTT audio messages in the browser.

![Playing PTTs in Browser](https://github.com/orion-labs/node-red-contrib-orion/raw/master/docs/example-browser_play.png)

1. **Orion RX**: Connects to Orion and receives PTT events.
2. **Orion Decode**: Converts Orion Audio Format to WAV and stores at URL `media_wav`.
3. **Change**: Sets `msg.url` to `msg.media_wav`.
4. **HTTP Request**: Downloads `msg.url` and returns a binary buffer in `msg.payload`.
5. **Play Audio**: Plays the audio in the binary buffer in `msg.payload`.

```json
[{"id":"7fee8343.1b74dc","type":"orion_rx","z":"43dbbc8.6699844","name":"Group RX","orion_config":"","x":80,"y":560,"wires":[["906e5a3c.573af8"]]},{"id":"906e5a3c.573af8","type":"orion_decode","z":"43dbbc8.6699844","name":"","x":260,"y":560,"wires":[["790dbd12.238254"]]},{"id":"79a5c028.08cf7","type":"play audio","z":"43dbbc8.6699844","name":"","voice":"","x":810,"y":560,"wires":[]},{"id":"6db772e2.dc9cec","type":"http request","z":"43dbbc8.6699844","name":"GET Media","method":"GET","ret":"bin","url":"","tls":"","x":630,"y":560,"wires":[["79a5c028.08cf7"]]},{"id":"790dbd12.238254","type":"change","z":"43dbbc8.6699844","name":"","rules":[{"t":"set","p":"url","pt":"msg","to":"media_wav","tot":"msg"}],"action":"","property":"","from":"","to":"","reg":false,"x":450,"y":560,"wires":[["6db772e2.dc9cec"]]}]
```
