export function inspectRigGraph(data, profile) {
  const nodes = data.nodes;
  if (!Array.isArray(nodes) || !nodes.length) throw new Error("模型没有节点.");
  const parents = Array(nodes.length).fill(-1);
  for (let parent = 0; parent < nodes.length; parent++) {
    for (const child of nodes[parent].children ?? []) {
      if (!Number.isInteger(child) || child < 0 || child >= nodes.length || parents[child] !== -1) {
        throw new Error("骨架包含无效子节点或多父节点.");
      }
      parents[child] = parent;
    }
  }
  const queue = parents.flatMap((parent, index) => parent === -1 ? [index] : []);
  for (let index = 0; index < queue.length; index++) queue.push(...(nodes[queue[index]].children ?? []));
  if (queue.length !== nodes.length) throw new Error("骨架包含环, 无法进行父子跟随.");
  const names = new Map(Object.entries(profile.bone_nodes).map(([name, index]) => [index, name]));
  const boneParents = {};
  for (const [name, index] of Object.entries(profile.bone_nodes)) {
    let ancestor = parents[index];
    while (ancestor !== -1 && !names.has(ancestor)) ancestor = parents[ancestor];
    boneParents[name] = ancestor === -1 ? null : names.get(ancestor);
  }
  const skins = data.skins ?? [];
  if (!skins.length) throw new Error("模型没有蒙皮绑定.");
  for (const skin of skins) {
    if (!Array.isArray(skin.joints) || !skin.joints.length
      || new Set(skin.joints).size !== skin.joints.length
      || skin.joints.some(index => !Number.isInteger(index) || index < 0 || index >= nodes.length)) {
      throw new Error("蒙皮关节列表无效.");
    }
    if (skin.inverseBindMatrices !== undefined) {
      const accessor = data.accessors?.[skin.inverseBindMatrices];
      if (!accessor || accessor.type !== "MAT4" || accessor.count !== skin.joints.length) {
        throw new Error("蒙皮逆绑定矩阵与关节数量不一致.");
      }
    }
  }
  let skinned = 0;
  for (const node of nodes) {
    if (node.skin === undefined) continue;
    if (!Number.isInteger(node.skin) || !skins[node.skin]) throw new Error("蒙皮对象引用了不存在的绑定.");
    const mesh = data.meshes?.[node.mesh];
    if (!mesh?.primitives?.length || mesh.primitives.some(primitive =>
      primitive.attributes?.JOINTS_0 === undefined || primitive.attributes?.WEIGHTS_0 === undefined)) {
      throw new Error("蒙皮对象缺少关节索引或权重.");
    }
    skinned++;
  }
  if (!skinned) throw new Error("没有可用的蒙皮对象.");
  return {bone_parents: boneParents, skin_count: skins.length, skinned_node_count: skinned,
    skin_joint_counts: skins.map(skin => skin.joints.length), hierarchy_verified: true};
}
