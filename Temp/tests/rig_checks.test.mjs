import test from "node:test";
import assert from "node:assert/strict";
import {PoseController} from "../../motion/pose_controller.mjs";
import {runRigChecks} from "../../web/rig_checks.mjs";
import {rigFixture} from "./rig_fixture.mjs";

test("三轴方向, 父子跟随和复位自动检查通过, 保留检查前姿态", async () => {
  const {vrm, profile} = await rigFixture();
  const controller = new PoseController(vrm, profile);
  controller.setRotation("head", [10, 5, 0]);
  const before = controller.capture();
  const result = runRigChecks(controller);
  assert.ok(result.passed, JSON.stringify(result));
  assert.equal(result.checks.length, 7);
  assert.deepEqual(controller.capture(), before);
});
