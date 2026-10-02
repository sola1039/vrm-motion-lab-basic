export function sampleMotion() {
  return {
    format: "vrm-basic-motion", version: 1, name: "说话并点头的格式样例",
    space: {
      handedness: "right", up: "+Y", forward: "+Z",
      position_unit: "meter", time_unit: "second", quaternion_order: "xyzw",
      rotation_space: "normalized_local_rest_delta",
      root_space: "normalized_root_rest_offset"
    },
    source: {id: "格式校验样例", kind: "validation"},
    bone_order: ["hips", "head"], expression_order: ["aa", "ih"],
    action_ids: ["speak", "nod"],
    audio: {uri: "Temp/videos/说话样例.mp4", offset_seconds: 1.25},
    frames: [0, 0.037, 0.081].map((time, index) => ({
      time, root_position: [index * 0.0123, index === 0 ? 0 : -index * 0.001, 0],
      local_rotations: [[0, 0, 0, 1], [Math.sin(index / 20), 0, 0, Math.cos(index / 20)]],
      expressions: [index * 0.2, 0.15],
      contacts: {leftFoot: true, rightFoot: null},
      confidence: {root: null, bones: [0.98, index ? 0.7 : null], expressions: [null, 0.5]}
    }))
  };
}
