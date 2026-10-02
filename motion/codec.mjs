import {validateMotion} from "./validate.mjs";
import {fail} from "./schema_validate.mjs";

export const MAX_JSON_CHARACTERS = 32 * 1024 * 1024;
export function encodeMotion(clip) {
  validateMotion(clip);
  const text = JSON.stringify(clip) + "\n";
  if (text.length > MAX_JSON_CHARACTERS) fail("$", "动作文件超过32Mi字符, 请分段保存");
  return text;
}
export function decodeMotion(text) {
  if (typeof text !== "string" || text.length > MAX_JSON_CHARACTERS) {
    fail("$", "需要长度不超过32Mi字符的JSON文本");
  }
  let clip;
  try {
    clip = JSON.parse(text.charCodeAt(0) === 0xfeff ? text.slice(1) : text);
  } catch {
    fail("$", "JSON文本无法解析");
  }
  return validateMotion(clip);
}
