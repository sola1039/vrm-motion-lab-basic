import {readFile, mkdir, open, link, unlink} from "node:fs/promises";
import {dirname, join} from "node:path";
import {randomUUID} from "node:crypto";
import {encodeMotion, decodeMotion} from "./codec.mjs";

export async function readMotion(filePath) {
  try {
    return decodeMotion(await readFile(filePath, "utf8"));
  } catch (error) {
    throw new Error("读取动作失败: " + error.message, {cause: error});
  }
}
// 先在Temp中完整写入并同步, 再原子建立目标文件. 已有目标不覆盖.
export async function writeMotion(filePath, clip) {
  const text = encodeMotion(clip);
  const temporaryDirectory = join(dirname(filePath), "Temp");
  const temporaryPath = join(temporaryDirectory, randomUUID() + ".motion.json");
  let handle = null;
  let created = false;
  let failure = null;
  try {
    await mkdir(temporaryDirectory, {recursive: true});
    handle = await open(temporaryPath, "wx");
    created = true;
    await handle.writeFile(text, "utf8");
    await handle.sync();
    await handle.close();
    handle = null;
    await link(temporaryPath, filePath);
  } catch (error) {
    failure = error;
  } finally {
    try {
      if (handle) await handle.close();
    } catch (error) {
      failure ??= error;
    }
    try {
      if (created) await unlink(temporaryPath);
    } catch (error) {
      failure ??= error;
    }
  }
  if (failure) throw new Error("保存动作失败: " + failure.message, {cause: failure});
}
