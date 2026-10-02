import test from "node:test";
import assert from "node:assert/strict";
import {mkdtemp, readFile, writeFile, readdir} from "node:fs/promises";
import {fileURLToPath} from "node:url";
import {join} from "node:path";
import {encodeMotion, decodeMotion, MAX_JSON_CHARACTERS} from "../../motion/codec.mjs";
import {readMotion, writeMotion} from "../../motion/file_io.mjs";
import {sampleMotion} from "./fixture.mjs";

test("序列化后姿态, 时间, 口型及置信度精确一致", () => {
  const clip = sampleMotion();
  assert.deepEqual(decodeMotion(encodeMotion(clip)), clip);
  assert.equal(encodeMotion(clip).charCodeAt(0), 123);
});
test("接受带字节顺序标记的合法输入", () => {
  const clip = sampleMotion();
  assert.deepEqual(decodeMotion("\uFEFF" + encodeMotion(clip)), clip);
});
test("拒绝非法文本和超长输入", () => {
  for (const input of [null, 1, "{", "", " ".repeat(MAX_JSON_CHARACTERS + 1)]) {
    assert.throws(() => decodeMotion(input));
  }
});
test("编码前拒绝无效动作", () => {
  const clip = sampleMotion(); clip.frames[0].root_position[0] = NaN;
  assert.throws(() => encodeMotion(clip), /root_position/);
});
test("负零按JSON规则保存为零, 原始输入保持不变", () => {
  const clip = sampleMotion(); clip.frames[0].root_position[0] = -0;
  assert.ok(Object.is(clip.frames[0].root_position[0], -0));
  const restored = decodeMotion(encodeMotion(clip));
  assert.ok(Object.is(restored.frames[0].root_position[0], 0));
  assert.ok(Object.is(clip.frames[0].root_position[0], -0));
});
test("动作文件端到端保存和读回, 已有文件保持完整", async () => {
  const directory = await mkdtemp(fileURLToPath(new URL("./outputs/读写-", import.meta.url)));
  const destination = join(directory, "动作.motion.json");
  const clip = sampleMotion();
  await writeMotion(destination, clip);
  assert.deepEqual(await readMotion(destination), clip);
  const original = await readFile(destination);
  await assert.rejects(writeMotion(destination, clip), /保存动作失败/);
  assert.deepEqual(await readFile(destination), original);
  assert.deepEqual(await readdir(join(directory, "Temp")), []);
});
test("输入无效时不生成目标文件", async () => {
  const directory = await mkdtemp(fileURLToPath(new URL("./outputs/无效-", import.meta.url)));
  const clip = sampleMotion(); clip.frames[1].time = 0;
  await assert.rejects(writeMotion(join(directory, "无效.json"), clip), /time/);
  assert.deepEqual(await readdir(directory), []);
});
test("读取缺失和损坏的文件有明确错误", async () => {
  const directory = await mkdtemp(fileURLToPath(new URL("./outputs/损坏-", import.meta.url)));
  await assert.rejects(readMotion(join(directory, "缺失.json")), /读取动作失败/);
  const bad = join(directory, "损坏.json");
  await writeFile(bad, "{", "utf8");
  await assert.rejects(readMotion(bad), /JSON/);
});
