Who Am I?
---------

The following flow looks-up a users information using the **Orion Lookup**
Node. This is useful for finding Group IDs for use within other Flows.

!['Who Am I?' Flow](https://github.com/orion-labs/node-red-contrib-orion/raw/master/docs/example-whoami.png)

1. **Inject**: Inject *whoami* into `msg.payload` after 0.1 seconds.
2. **Orion Lookup**: Looks-up user for whom the Node is configured (using **orion_config**).
3. **Debug**: Log the entire `msg` to the Debug Output.

```json
[{"id":"d7033f3b.a0012","type":"debug","z":"f038a834.836688","name":"","active":true,"tosidebar":true,"console":false,"tostatus":false,"complete":"true","x":510,"y":420,"wires":[]},{"id":"f79280b0.d0168","type":"orion_lookup","z":"f038a834.836688","name":"","orion_config":"","x":340,"y":420,"wires":[["d7033f3b.a0012"]]},{"id":"4bb83296.5ab0ec","type":"inject","z":"f038a834.836688","name":"","topic":"","payload":"whoami","payloadType":"str","repeat":"","crontab":"","once":true,"onceDelay":0.1,"x":140,"y":420,"wires":[["f79280b0.d0168"]]}]
```

Example Debug Output:

```json
{
  "user_info": {
    "groups": [{
      "avatars": "object",
      "created_ts": 1510948270.800819,
      "id": "04ac0a0b6f674a23bad0e5b57fe59f08",
      "initials": "op",
      "last_activity": 1537836374,
      "membercount": 16,
      "name": "OPG"
    }]
  }
}
```
