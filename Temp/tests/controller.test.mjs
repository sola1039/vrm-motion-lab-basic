import test from "node:test";
import assert from "node:assert/strict";
import {Vector3, Quaternion, Euler} from "three";
import {PoseController} from "../../motion/pose_controller.mjs";
import {decodeMotion, encodeMotion} from "../../motion/codec.mjs";
import {rigFixture} from "./rig_fixture.mjs";

async function setup() {
  const fixture = await rigFixture();
  return {...fixture, controller: new PoseController(fixture.vrm, fixture.profile)};
}
test("合成骨架左右映射正确, 单关节旋转可导出标准四元数", async () => {
  const {vrm, controller} = await setup();
  const left = vrm.humanoid.getRawBoneNode("leftHand").getWorldPosition(new Vector3());
  const right = vrm.humanoid.getRawBoneNode("rightHand").getWorldPosition(new Vector3());
  assert.ok(left.x > right.x);
  controller.setRotation("head", [20, -15, 10]);
  const clip = controller.capture();
  const q = clip.frames[0].local_rotations[clip.bone_order.indexOf("head")];
  const expected = new Quaternion().setFromEuler(new Euler(20 * Math.PI / 180, -15 * Math.PI / 180, 10 * Math.PI / 180, "XYZ"));
  assert.ok(expected.angleTo(new Quaternion().fromArray(q)) < 1e-6);
  assert.ok(controller.getAngles("head").every((value, index) => Math.abs(value - [20, -15, 10][index]) < 1e-6));
});
test("上臂旋转带动手, 前臂局部姿态及另一侧手保持独立", async () => {
  const {vrm, controller} = await setup();
  const hand = vrm.humanoid.getRawBoneNode("rightHand");
  const other = vrm.humanoid.getRawBoneNode("leftHand");
  const before = hand.getWorldPosition(new Vector3());
  const otherBefore = other.getWorldPosition(new Vector3());
  const forearm = vrm.humanoid.getRawBoneNode("rightLowerArm").quaternion.clone();
  controller.setRotation("rightUpperArm", [0, 0, 35]);
  assert.ok(hand.getWorldPosition(new Vector3()).distanceTo(before) > 0.05);
  assert.ok(other.getWorldPosition(new Vector3()).distanceTo(otherBefore) < 1e-8);
  assert.ok(forearm.angleTo(vrm.humanoid.getRawBoneNode("rightLowerArm").quaternion) < 1e-6);
});
test("髋位移只施加一次, 方向转换和格式读写一致", async () => {
  const {vrm, controller} = await setup();
  const before = vrm.humanoid.getRawBoneNode("hips").getWorldPosition(new Vector3());
  controller.setRoot([0.1, 0.02, 0.3]);
  controller.setExpression("aa", 0.65);
  controller.setRotation("head", [12, 10, 0]);
  const moved = vrm.humanoid.getRawBoneNode("hips").getWorldPosition(new Vector3()).sub(before);
  assert.ok(moved.distanceTo(new Vector3(0.1, 0.02, 0.3)) < 1e-8);
  const clip = decodeMotion(encodeMotion(controller.capture()));
  controller.reset();
  controller.applyFrame(clip, 0);
  const restored = controller.capture();
  assert.ok(Math.abs(restored.frames[0].root_position[2] - 0.3) < 1e-8);
  assert.equal(restored.frames[0].expressions[0], 0.65);
  assert.deepEqual(restored.frames[0].local_rotations, clip.frames[0].local_rotations);
});
test("全部复位恢复真实骨骼, 当前关节复位不清空其他关节", async () => {
  const {vrm, profile, controller} = await setup();
  const rest = profile.bone_order.map(bone => vrm.humanoid.getRawBoneNode(bone).matrixWorld.clone());
  controller.setRotation("head", [25, 0, 0]);
  controller.setRotation("rightUpperArm", [0, 0, 25]);
  controller.resetBone("head");
  assert.ok(controller.getAngles("rightUpperArm")[2] > 20);
  controller.setRoot([0.2, 0.1, 0]); controller.setExpression("oh", 1);
  controller.reset();
  profile.bone_order.forEach((bone, index) => {
    const current = vrm.humanoid.getRawBoneNode(bone).matrixWorld.elements;
    assert.ok(current.every((value, element) => Math.abs(value - rest[index].elements[element]) < 1e-7));
  });
  assert.ok(controller.capture().frames[0].expressions.every(value => value === 0));
});
test("无效控制参数在修改角色前被拒绝", async () => {
  const {controller} = await setup();
  const before = controller.capture();
  for (const call of [
    () => controller.setRotation("missing", [0, 0, 0]),
    () => controller.setRotation("head", [Infinity, 0, 0]),
    () => controller.setRoot([0, 0]),
    () => controller.setExpression("unknown", 0.5),
    () => controller.setExpression("aa", 2),
    () => controller.applyFrame(before, 2)
  ]) assert.throws(call);
  assert.deepEqual(controller.capture(), before);
});
