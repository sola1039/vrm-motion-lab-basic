import {SPACE} from "../../motion/schema.mjs";
export function playbackFixture() {
  const turn = angle => [0, 0, Math.sin(angle / 2), Math.cos(angle / 2)];
  return {
    format:"vrm-basic-motion", version:1, name:"非均匀时间验证",
    source:{id:"playback-test",kind:"reference"}, space:{...SPACE},
    bone_order:["head"], expression_order:["aa"],
    frames:[
      {time:0,root_position:[0,0,0],local_rotations:[turn(0)],expressions:[0]},
      {time:0.2,root_position:[0.2,0,0],local_rotations:[turn(Math.PI / 2)],expressions:[1]},
      {time:1,root_position:[1,0,0],local_rotations:[turn(Math.PI)],expressions:[0]}
    ]
  };
}
