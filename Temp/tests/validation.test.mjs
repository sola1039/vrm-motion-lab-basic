import test from "node:test";
import assert from "node:assert/strict";
import {validateMotion} from "../../motion/validate.mjs";
import {sampleMotion} from "./fixture.mjs";

test("非匀速时间戳, 未知置信度和口型合法且输入不被修改", () => {
  const clip = sampleMotion();
  const before = structuredClone(clip);
  assert.equal(validateMotion(clip), clip);
  assert.deepEqual(clip, before);
});
test("单帧和没有口型的身体动作合法", () => {
  const clip = sampleMotion();
  clip.frames = [clip.frames[0]];
  clip.expression_order = [];
  delete clip.audio; delete clip.action_ids;
  clip.frames[0].expressions = [];
  delete clip.frames[0].contacts; delete clip.frames[0].confidence;
  assert.equal(validateMotion(clip), clip);
});
const cases = [
  ["缺少版本", c => delete c.version, "version"],
  ["错误版本", c => c.version = 2, "version"],
  ["非整数版本", c => c.version = 1.2, "version"],
  ["格式错误", c => c.format = "other", "format"],
  ["未知字段", c => c.fps = 30, "fps"],
  ["空名称", c => c.name = "", "name"],
  ["名称过长", c => c.name = "长".repeat(257), "name"],
  ["左右手坐标错误", c => c.space.handedness = "left", "handedness"],
  ["坐标字段不完整", c => delete c.space.up, "up"],
  ["来源不明确", c => c.source.kind = "unknown", "kind"],
  ["来源字段错误", c => c.source.id = null, "id"],
  ["空骨骼表", c => c.bone_order = [], "bone_order"],
  ["重复骨骼", c => c.bone_order[1] = "hips", "bone_order"],
  ["未知骨骼", c => c.bone_order[1] = "leftThumbIntermediate", "bone_order"],
  ["旧口型名称", c => c.expression_order[0] = "a", "expression_order"],
  ["重复口型", c => c.expression_order[1] = "aa", "expression_order"],
  ["无帧", c => c.frames = [], "frames"],
  ["帧不是数组", c => c.frames = {}, "frames"],
  ["空帧对象", c => c.frames[0] = null, "frames"],
  ["首帧时间偏移", c => c.frames[0].time = 0.01, "time"],
  ["重复时间", c => c.frames[1].time = 0, "time"],
  ["倒序时间", c => c.frames[2].time = 0.02, "time"],
  ["负时间", c => c.frames[1].time = -1, "time"],
  ["时间字符串", c => c.frames[1].time = "0.037", "time"],
  ["无穷位移", c => c.frames[0].root_position[1] = Infinity, "root_position"],
  ["位移维数错误", c => c.frames[0].root_position.pop(), "root_position"],
  ["位移维数过多", c => c.frames[0].root_position.push(1), "root_position"],
  ["零四元数", c => c.frames[0].local_rotations[0] = [0, 0, 0, 0], "local_rotations"],
  ["旋转未归一化", c => c.frames[0].local_rotations[0][3] = 2, "local_rotations"],
  ["旋转含无效数", c => c.frames[0].local_rotations[0][0] = NaN, "local_rotations"],
  ["旋转行数错误", c => c.frames[0].local_rotations.pop(), "local_rotations"],
  ["口型数量错误", c => c.frames[0].expressions.pop(), "expressions"],
  ["口型越界", c => c.frames[0].expressions[0] = 1.1, "expressions"],
  ["置信度越界", c => c.frames[0].confidence.bones[0] = -0.1, "confidence"],
  ["置信度行数错误", c => c.frames[0].confidence.bones.pop(), "confidence"],
  ["口型置信度数量错误", c => c.frames[0].confidence.expressions.pop(), "confidence"],
  ["接触状态非布尔", c => c.frames[0].contacts.leftFoot = 0, "contacts"],
  ["音频偏移错误", c => c.audio.offset_seconds = -1, "offset_seconds"],
  ["音频绝对路径", c => c.audio.uri = "D:/source.mp4", "uri"],
  ["音频路径回退", c => c.audio.uri = "../source.mp4", "uri"],
  ["音频反斜杠", c => c.audio.uri = "Temp\\source.mp4", "uri"]
];
for (const [name, change, field] of cases) {
  test("拒绝" + name + "并定位字段", () => {
    const clip = sampleMotion(); change(clip);
    assert.throws(() => validateMotion(clip), error => error.message.includes(field));
  });
}
test("拒绝非对象输入", () => {
  for (const input of [null, [], "", undefined, 2]) assert.throws(() => validateMotion(input));
});
test("名称长度按Unicode字符计算, 与跨语言格式定义一致", () => {
  const clip = sampleMotion();
  const character = String.fromCodePoint(0x20000);
  clip.name = character.repeat(256);
  assert.equal(validateMotion(clip), clip);
  clip.name += character;
  assert.throws(() => validateMotion(clip), /name/);
});
