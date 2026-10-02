import {Vector3, Quaternion, Euler, MathUtils} from "three";

export function runRigChecks(controller) {
  const {vrm, profile} = controller;
  const saved = controller.capture();
  const checks = [];
  const check = (name, pass, detail = "") => checks.push({name, pass, detail});
  const raw = name => vrm.humanoid.getRawBoneNode(name);
  const position = name => raw(name).getWorldPosition(new Vector3());
  try {
    controller.reset();
    const rest = profile.bone_order.map(name => raw(name).matrixWorld.clone());
    check("标准骨骼映射", profile.bone_order.every(name => raw(name) && vrm.humanoid.getNormalizedBoneNode(name)), profile.bone_order.length + "个");
    check("角色左右方向", position("leftHand").x > position("rightHand").x);
    const head = raw("head");
    const headRest = head.getWorldQuaternion(new Quaternion());
    for (let axis = 0; axis < 3; axis++) {
      const angles = [0, 0, 0]; angles[axis] = 20;
      controller.setRotation("head", angles);
      const delta = head.getWorldQuaternion(new Quaternion()).multiply(headRest.clone().invert());
      const expected = new Quaternion().setFromEuler(new Euler(...angles.map(MathUtils.degToRad), "XYZ"));
      check("局部" + ["X", "Y", "Z"][axis] + "轴方向", delta.angleTo(expected) < 1e-6);
      controller.reset();
    }
    const rightBefore = position("rightHand");
    const leftBefore = position("leftHand");
    controller.setRotation("rightUpperArm", [0, 0, 35]);
    check("父子跟随与左右独立", position("rightHand").distanceTo(rightBefore) > 0.05
      && position("leftHand").distanceTo(leftBefore) < 1e-7);
    controller.reset();
    let error = 0;
    profile.bone_order.forEach((name, index) => raw(name).matrixWorld.elements.forEach((value, element) =>
      error = Math.max(error, Math.abs(value - rest[index].elements[element]))));
    check("全部姿态复位", error < 1e-7, "最大误差 " + error.toExponential(1));
  } finally { controller.applyFrame(saved, 0); }
  return {passed: checks.every(item => item.pass), checks};
}
