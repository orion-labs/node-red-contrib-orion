Multi-Group Transmit
--------------------

![Orion group transmitting to multi other groups](https://github.com/orion-labs/node-red-contrib-orion/raw/master/docs/example-all_call.png)

```json
[{"id":"7079bb58.35dcd4","type":"orion_rx","z":"7ec1616e.0e3e2","name":"Group A RX","orion_config":"","x":610,"y":300,"wires":[["53ee37f7.041a08","8f185157.2f1f4"]]},{"id":"53ee37f7.041a08","type":"orion_tx","z":"7ec1616e.0e3e2","name":"Group B TX","orion_config":"","x":790,"y":300,"wires":[]},{"id":"8f185157.2f1f4","type":"orion_tx","z":"7ec1616e.0e3e2","name":"Group C TX","orion_config":"","x":790,"y":340,"wires":[]}]
```
