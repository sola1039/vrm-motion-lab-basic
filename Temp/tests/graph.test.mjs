import test from "node:test";
import assert from "node:assert/strict";
import {inspectRigGraph} from "../../motion/rig_graph.mjs";
const fixture = () => ({nodes:[{children:[1]},{children:[2,3]},{},{skin:0,mesh:0}],skins:[{joints:[1,2],inverseBindMatrices:0}],accessors:[{type:"MAT4",count:2}],meshes:[{primitives:[{attributes:{JOINTS_0:1,WEIGHTS_0:2}}]}]});
const profile = {bone_nodes:{hips:1,head:2}};
test("自动读取父子关系与蒙皮, 拒绝环和不一致权重", () => {
  const graph = inspectRigGraph(fixture(),profile);
  assert.equal(graph.bone_parents.head,"hips"); assert.equal(graph.skinned_node_count,1);
  for (const mutate of [
    d => d.nodes = [], d => d.nodes[2].children = [0], d => d.nodes[0].children.push(2),
    d => d.nodes[1].children.push(2), d => d.nodes[1].children.push(99), d => d.skins = [],
    d => d.skins[0].joints.push(1), d => d.skins[0].joints = [], d => d.skins[0].joints[0] = -1,
    d => d.accessors[0].count = 1, d => d.nodes[3].skin = 2,
    d => delete d.meshes[0].primitives[0].attributes.JOINTS_0, d => delete d.nodes[3].skin
  ]) {const data = fixture(); mutate(data); assert.throws(() => inspectRigGraph(data,profile));}
});
