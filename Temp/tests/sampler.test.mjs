import test from "node:test";
import assert from "node:assert/strict";
import {MotionSampler} from "../../motion/clip_sampler.mjs";
import {playbackFixture} from "./playback_fixture.mjs";
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9);
test("按原时间戳插值, 旋转走球面最短路径, 位移与口型同步", () => {
  const sampler = new MotionSampler(playbackFixture());
  const frame = sampler.sample(0.6);
  near(frame.root_position[0], 0.6); near(frame.expressions[0], 0.5);
  near(frame.local_rotations[0][2], Math.sin(3 * Math.PI / 8));
  near(Math.hypot(...frame.local_rotations[0]), 1);
  assert.equal(sampler.frameIndex(0.6), 1);
  assert.deepEqual(sampler.times, [0, 0.2, 1]);
});
test("四元数符号相反时保持同一姿态, 不绕远路", () => {
  const clip = playbackFixture();
  clip.frames[1].local_rotations[0] = [0,0,0,-1];
  const frame = new MotionSampler(clip).sample(0.1);
  assert.deepEqual(frame.local_rotations[0], [0,0,0,1]);
});
test("超出时间范围被截断, 单帧动作可检查, 原始数据不会被外部修改", () => {
  const clip = playbackFixture(); const sampler = new MotionSampler(clip);
  clip.frames[0].root_position[0] = 99;
  assert.equal(sampler.sample(-1).root_position[0], 0);
  assert.equal(sampler.sample(9).time, 1);
  const changed = sampler.sample(0); changed.root_position[0] = 99;
  assert.equal(sampler.sample(0).root_position[0], 0);
  clip.frames.splice(1); clip.frames[0].root_position[0] = 0;
  const single = new MotionSampler(clip);
  assert.equal(single.duration, 0); assert.equal(single.sample(1).time, 0);
  assert.throws(() => single.sample(Infinity));
  const bad = playbackFixture(); bad.frames[1].time = 0;
  assert.throws(() => new MotionSampler(bad));
});
test("接触和源置信度保持离散采样, 循环回接的两端精确一致", () => {
  const clip = playbackFixture();
  clip.frames[0].contacts = {leftFoot:true,rightFoot:false};
  clip.frames[0].confidence = {root:0.8,bones:[null],expressions:[0.6]};
  const sampler = new MotionSampler(clip);
  assert.deepEqual(sampler.sample(0.1).contacts, clip.frames[0].contacts);
  assert.deepEqual(sampler.sample(0.1).confidence, clip.frames[0].confidence);
  near(sampler.bridge(0).root_position[0], 1);
  near(sampler.bridge(1).root_position[0], 0);
  near(sampler.bridge(0.5).root_position[0], 0.5);
  assert.throws(() => sampler.bridge(NaN));
});
test("允许的舍入误差会在采样时归一化, 回接段不继承动捕质量标签", () => {
  const clip = playbackFixture(); clip.frames[0].local_rotations[0] = [0,0,0,0.99996];
  clip.frames[2].contacts = {leftFoot:true,rightFoot:true};
  clip.frames[2].confidence = {root:0.9,bones:[0.9],expressions:[0.9]};
  const sampler = new MotionSampler(clip);
  assert.equal(Math.hypot(...sampler.sample(0).local_rotations[0]), 1);
  assert.equal(sampler.bridge(0.5).contacts.leftFoot, null);
  assert.equal(sampler.bridge(0.5).confidence.root, null);
});
