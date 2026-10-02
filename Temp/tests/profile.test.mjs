import test from "node:test";
import assert from "node:assert/strict";
import {inspectVrm} from "../../motion/vrm_profile.mjs";
import {REQUIRED_BONES} from "../../motion/bones.mjs";

function model() {
  return {
    nodes: REQUIRED_BONES.map(() => ({})),
    extensions: {VRMC_vrm: {
      humanoid: {humanBones: Object.fromEntries(REQUIRED_BONES.map((bone, node) => [bone, {node}]))},
      expressions: {preset: {aa: {}, oh: {}}}
    }}
  };
}
function container(data) {
  const json = Buffer.from(JSON.stringify(data));
  const padded = Math.ceil(json.length / 4) * 4;
  const result = Buffer.alloc(20 + padded, 32);
  result.writeUInt32LE(0x46546c67, 0);
  result.writeUInt32LE(2, 4);
  result.writeUInt32LE(result.length, 8);
  result.writeUInt32LE(padded, 12);
  result.writeUInt32LE(0x4e4f534a, 16);
  json.copy(result, 20);
  return result;
}
test("新版骨骼名称保持不变, 只记录存在的口型", () => {
  const profile = inspectVrm(container(model()));
  assert.equal(profile.vrm_version, "1");
  assert.equal(profile.requires_vrm0_adapter, false);
  assert.deepEqual(profile.expression_presets, {aa: "aa", oh: "oh"});
  assert.deepEqual(profile.bone_aliases, {});
});
test("支持浏览器字节数组, 缺少口型仍可使用身体骨架", () => {
  const data = model(); delete data.extensions.VRMC_vrm.expressions;
  const bytes = container(data);
  const profile = inspectVrm(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
  assert.deepEqual(profile.expression_presets, {});
});
const mutations = [
  ["未知骨骼", data => data.extensions.VRMC_vrm.humanoid.humanBones.unknown = {node: 0}],
  ["节点不存在", data => data.extensions.VRMC_vrm.humanoid.humanBones.hips.node = 200],
  ["节点非整数", data => data.extensions.VRMC_vrm.humanoid.humanBones.hips.node = 0.5],
  ["重复节点", data => data.extensions.VRMC_vrm.humanoid.humanBones.head.node = 0],
  ["缺少必需骨骼", data => delete data.extensions.VRMC_vrm.humanoid.humanBones.head],
  ["缺少模型扩展", data => delete data.extensions]
];
for (const [name, change] of mutations) {
  test("拒绝" + name, () => {
    const data = model(); change(data);
    assert.throws(() => inspectVrm(container(data)));
  });
}
test("拒绝错误容器头部和JSON块", () => {
  for (const offset of [0, 4, 8, 12, 16]) {
    const bytes = container(model()); bytes.writeUInt32LE(0xffffffff, offset);
    assert.throws(() => inspectVrm(bytes));
  }
  assert.throws(() => inspectVrm("模型"));
  assert.throws(() => inspectVrm(container("模型")));
});
