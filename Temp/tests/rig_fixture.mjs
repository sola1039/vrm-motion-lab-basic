import {Object3D,Bone} from "three";
import {VRMHumanoid} from "@pixiv/three-vrm";
import {BONE_NAMES} from "../../motion/bones.mjs";
export async function rigFixture() {
  const scene = new Object3D(), nodes = {};
  function bone(name,parent,position) {const node = new Bone(); node.name = name; node.position.fromArray(position); (parent ? nodes[parent] : scene).add(node); nodes[name] = node;}
  bone("hips",null,[0,1,0]); bone("spine","hips",[0,.2,0]); bone("chest","spine",[0,.15,0]); bone("neck","chest",[0,.15,0]); bone("head","neck",[0,.1,0]);
  for (const [side,sign] of [["left",1],["right",-1]]) {
    bone(side+"Shoulder","chest",[sign*.1,.1,0]); bone(side+"UpperArm",side+"Shoulder",[sign*.1,0,0]);
    bone(side+"LowerArm",side+"UpperArm",[sign*.25,0,0]); bone(side+"Hand",side+"LowerArm",[sign*.2,0,0]);
    bone(side+"UpperLeg","hips",[sign*.1,-.1,0]); bone(side+"LowerLeg",side+"UpperLeg",[0,-.4,0]); bone(side+"Foot",side+"LowerLeg",[0,-.4,0]);
  }
  scene.updateMatrixWorld(true);
  const humanoid = new VRMHumanoid(Object.fromEntries(Object.entries(nodes).map(([name,node]) => [name,{node}])));
  scene.add(humanoid.normalizedHumanBonesRoot);
  const values = new Map(["aa","ih","ou","ee","oh"].map(name => [name,0]));
  const expressionManager = {setValue:(name,value) => values.set(name,value),getValue:name => values.get(name),getExpression:name => values.has(name) ? {} : null,update(){}};
  const profile = {vrm_version:"1",bone_order:BONE_NAMES.filter(name => nodes[name]),expression_presets:Object.fromEntries([...values.keys()].map(name => [name,name]))};
  const vrm = {scene,humanoid,expressionManager,meta:{metaVersion:"1"}};
  scene.updateMatrixWorld(true); return {vrm,profile};
}
