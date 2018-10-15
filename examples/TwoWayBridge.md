Two-Way Group Bridge
--------------------

The following flow 'bridges' or 'patches' two Orion groups together so that
transmissions from one group are re-transmitted to another group, and
vice-versa.

![Two Orion Groups Bridged](https://github.com/orion-labs/node-red-contrib-orion/raw/master/docs/example-2way_bridge.png)

```json
[{"id":"fcdb7143.5c244","type":"orion_rx","z":"43dbbc8.6699844","name":"Group A RX","orion_config":"","x":90,"y":80,"wires":[["7748fadc.f08b74"]]},{"id":"7748fadc.f08b74","type":"orion_tx","z":"43dbbc8.6699844","name":"Group B TX","orion_config":"","x":270,"y":80,"wires":[]},{"id":"94e3616d.0bc3e","type":"orion_tx","z":"43dbbc8.6699844","name":"Group A TX","orion_config":"","x":270,"y":120,"wires":[]},{"id":"17f0f537.c1f2db","type":"orion_rx","z":"43dbbc8.6699844","name":"Group B RX","orion_config":"","x":90,"y":120,"wires":[["94e3616d.0bc3e"]]}]
```
