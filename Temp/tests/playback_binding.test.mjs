import test from "node:test";
import assert from "node:assert/strict";
import {Vector3} from "three";
import {MotionSampler} from "../../motion/clip_sampler.mjs";
import {PoseController} from "../../motion/pose_controller.mjs";
import {rigFixture} from "./rig_fixture.mjs";
import {playbackFixture} from "./playback_fixture.mjs";
test("时间采样驱动实际骨架, 根位移一次生效, 未声明通道恢复参考姿态", async () => {
  const {vrm, profile} = await rigFixture(); const controller = new PoseController(vrm, profile);
  const root = vrm.humanoid.getRawBoneNode("hips").getWorldPosition(new Vector3());
  controller.setRotation("rightUpperArm", [0,0,30]);
  const apply = controller.bindSampler(new MotionSampler(playbackFixture())); apply(0.6);
  const moved = vrm.humanoid.getRawBoneNode("hips").getWorldPosition(new Vector3()).sub(root);
  assert.ok(Math.abs(moved.x - 0.6) < 1e-8);
  assert.ok(Math.abs(controller.getAngles("head")[2] - 135) < 1e-6);
  assert.ok(Math.abs(controller.getAngles("rightUpperArm")[2]) < 1e-6);
  assert.equal(controller.capture().frames[0].expressions[0], 0.5);
  apply(1, 0.5); assert.ok(Math.abs(controller.capture().frames[0].root_position[0] - 0.5) < 1e-8);
});
test("不支持的动作通道在绑定阶段被拒绝, 不改写当前姿态", async () => {
  const {vrm, profile} = await rigFixture(); const controller = new PoseController(vrm, profile);
  controller.setRotation("head", [15,0,0]); const before = controller.capture();
  const clip = playbackFixture(); clip.bone_order[0] = "upperChest";
  assert.throws(() => controller.bindSampler(new MotionSampler(clip)));
  assert.deepEqual(controller.capture(), before);
});
