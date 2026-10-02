import {BONE_NAMES, REQUIRED_BONES, canonicalBoneName} from "./bones.mjs";

export function parseGlbDocument(input) {
  const bytes = input instanceof ArrayBuffer ? new Uint8Array(input) : input;
  if (!(bytes instanceof Uint8Array) || bytes.byteLength < 20) throw new Error("模型容器不完整.");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint32(0, true) !== 0x46546c67 || view.getUint32(4, true) !== 2
    || view.getUint32(8, true) !== bytes.byteLength) throw new Error("模型容器头部无效.");
  const length = view.getUint32(12, true);
  if (view.getUint32(16, true) !== 0x4e4f534a || length + 20 > bytes.byteLength) {
    throw new Error("模型JSON块无效.");
  }
  return JSON.parse(new TextDecoder().decode(bytes.subarray(20, 20 + length)));
}
export function inspectVrm(input) {
  const data = parseGlbDocument(input);
  const legacy = data.extensions?.VRM;
  const modern = data.extensions?.VRMC_vrm;
  if (!legacy && !modern) throw new Error("没有找到人形模型扩展.");
  const version = modern ? "1" : "0";
  const bones = modern ? Object.entries(modern.humanoid.humanBones).map(([bone, entry]) => ({bone, node: entry.node}))
    : legacy.humanoid.humanBones;
  const boneNodes = {};
  const aliases = {};
  for (const entry of bones) {
    const name = canonicalBoneName(entry.bone, version);
    if (!BONE_NAMES.includes(name) || Object.hasOwn(boneNodes, name)
      || !Number.isInteger(entry.node) || !data.nodes?.[entry.node]) throw new Error("模型骨骼定义无效.");
    boneNodes[name] = entry.node;
    if (name !== entry.bone) aliases[entry.bone] = name;
  }
  if (new Set(Object.values(boneNodes)).size !== Object.keys(boneNodes).length) {
    throw new Error("模型骨骼重复绑定同一节点.");
  }
  const missing = REQUIRED_BONES.filter(bone => !Object.hasOwn(boneNodes, bone));
  if (missing.length) throw new Error("模型缺少必需骨骼: " + missing.join(", "));
  const expressions = {};
  const vowels = {aa: "a", ih: "i", ou: "u", ee: "e", oh: "o"};
  for (const [name, oldName] of Object.entries(vowels)) {
    if (modern ? Object.hasOwn(modern.expressions?.preset ?? {}, name)
      : legacy.blendShapeMaster?.blendShapeGroups.some(group => group.presetName === oldName)) {
      expressions[name] = modern ? name : oldName;
    }
  }
  return {
    vrm_version: version, bone_nodes: boneNodes, bone_aliases: aliases,
    bone_order: BONE_NAMES.filter(bone => Object.hasOwn(boneNodes, bone)),
    missing_optional: BONE_NAMES.filter(bone => !Object.hasOwn(boneNodes, bone)),
    expression_presets: expressions, requires_vrm0_adapter: version === "0",
    normalized_pose_verified: false
  };
}
