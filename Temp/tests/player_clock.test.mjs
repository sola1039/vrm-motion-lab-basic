import test from "node:test";
import assert from "node:assert/strict";
import {MotionSampler} from "../../motion/clip_sampler.mjs";
import {MotionPlayer} from "../../motion/player_clock.mjs";
import {playbackFixture} from "./playback_fixture.mjs";
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-8);
function setup() {
  let now = 0;
  const player = new MotionPlayer(new MotionSampler(playbackFixture()), () => now);
  return {player, at:time => {now = time;}};
}
test("暂停和恢复使用经过的时间, 不累计渲染帧数", () => {
  const {player, at} = setup();
  player.play(); at(0.1); near(player.snapshot().time, 0.1);
  player.pause(); at(5); near(player.snapshot().time, 0.1);
  player.play(); at(5.2); near(player.snapshot().time, 0.3);
  at(6); const end = player.snapshot(); assert.equal(end.playing, false); near(end.time, 1);
  player.play(); near(player.snapshot().time, 0);
});
test("改变速度和拖动时间轴保持锚点, 播放结束保留末帧", () => {
  const {player, at} = setup(); player.play(); at(0.1); player.setSpeed(2);
  at(0.2); near(player.snapshot().time, 0.3);
  player.seek(0.4); at(0.3); near(player.snapshot().time, 0.6);
  player.seek(-5); near(player.snapshot().time, 0);
  player.seek(9); near(player.snapshot().time, 1);
  player.pause(); player.stop(); near(player.snapshot().time, 0);
  for (const value of [0, 4, NaN]) assert.throws(() => player.setSpeed(value));
  assert.throws(() => player.seek(Infinity));
});
test("逐帧沿原始非均匀时间戳移动, 操作时暂停", () => {
  const {player} = setup(); player.seek(0.6); player.play();
  player.step(-1); near(player.snapshot().time, 0.2); assert.equal(player.snapshot().playing, false);
  player.step(-1); near(player.snapshot().time, 0);
  player.step(1); near(player.snapshot().time, 0.2);
  player.step(1); near(player.snapshot().time, 1);
  player.step(1); near(player.snapshot().time, 1);
  assert.throws(() => player.step(0));
});
test("循环追加回接段, 首尾姿态连续, 暂停回接与跳过多个周期均正确", () => {
  const {player, at} = setup(); player.setLoop(true); player.play();
  at(1); const last = player.snapshot(); assert.equal(last.transition, true); near(last.bridgeProgress, 0);
  at(1.1); const bridge = player.snapshot(); near(bridge.frame.root_position[0], 0.5);
  player.pause(); at(4); near(player.snapshot().frame.root_position[0], 0.5);
  player.play(); at(4.1); const start = player.snapshot(); near(start.time, 0); assert.equal(start.loops, 1);
  at(6.7); const skipped = player.snapshot(); near(skipped.time, 0.2); assert.equal(skipped.loops, 3);
  player.setLoop(false); assert.equal(player.snapshot().transition, false);
  assert.throws(() => player.setLoop("true"));
});
test("单帧不启动循环, 无效或倒退的时钟不会产生失控推进", () => {
  const clip = playbackFixture(); clip.frames.splice(1);
  const single = new MotionPlayer(new MotionSampler(clip), () => 0); single.setLoop(true);
  assert.equal(single.play(), false); assert.equal(single.snapshot().playing, false);
  const {player, at} = setup(); player.play(); at(0.2); near(player.snapshot().time, 0.2);
  at(0.1); near(player.snapshot().time, 0.2);
  at(NaN); assert.throws(() => player.snapshot());
  assert.throws(() => new MotionPlayer(new MotionSampler(clip), () => -1));
});
