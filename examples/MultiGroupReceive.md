Multi-Group Receive
-------------------

The following flow allows one group to receive transmissions from other groups - this is similar to 'scanning' multiple other groups.

![Orion Group Receiving Transmissions from 2 other groups](https://github.com/orion-labs/node-red-contrib-orion/raw/master/docs/example-scan.png)

```json
[{"id":"9be2a9f4.d1e518","type":"orion_rx","z":"43dbbc8.6699844","name":"Group A RX","orion_config":"","x":90,"y":240,"wires":[["1b343e95.f243f1"]]},{"id":"1b343e95.f243f1","type":"orion_tx","z":"43dbbc8.6699844","name":"Group C TX","orion_config":"","x":270,"y":240,"wires":[]},{"id":"93480bd2.04a058","type":"orion_rx","z":"43dbbc8.6699844","name":"Group B RX","orion_config":"","x":90,"y":280,"wires":[["1b343e95.f243f1"]]}]
```
