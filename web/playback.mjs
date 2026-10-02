import {decodeMotion} from "../motion/codec.mjs";
import {MotionSampler} from "../motion/clip_sampler.mjs";
import {MotionPlayer} from "../motion/player_clock.mjs";
import {updatePlayerView, setPlaybackMessage} from "./player_view.mjs";
const element = id => document.getElementById(id);
const MAX_BYTES = 32 * 1024 * 1024;
export async function bindPlayback(controller, viewer, refreshPanel) {
  const markup = await fetch("/web/playback.html");
  if (!markup.ok) throw new Error("播放器面板不可用.");
  element("playback").innerHTML = await markup.text();
  let player, apply, animation = null, loadVersion = 0;
  function cancel() {if (animation !== null) cancelAnimationFrame(animation); animation = null;}
  function draw() {
    const state = player.snapshot(false); apply(state.time, state.bridgeProgress);
    refreshPanel(); viewer.render(); updatePlayerView(player, state);
    return state;
  }
  function pause(redraw = true) {
    cancel(); if (!player) return;
    player.pause(); if (redraw) draw(); else updatePlayerView(player, player.snapshot(false));
  }
  function animate() {
    animation = null;
    try {if (draw().playing) animation = requestAnimationFrame(animate);}
    catch (error) {pause(false); setPlaybackMessage("播放已停止: " + error.message, true);}
  }
  function load(clip) {
    const sampler = new MotionSampler(clip), writer = controller.bindSampler(sampler);
    const next = new MotionPlayer(sampler);
    next.setSpeed(Number(element("motion-speed").value));
    next.setLoop(element("motion-loop").checked && sampler.duration > 0);
    pause(false); player = next; apply = writer;
    element("player-controls").disabled = false;
    if (sampler.duration === 0) element("motion-loop").checked = false;
    element("loop-note").textContent = "拖动定位和逐帧会暂停. 循环追加" + next.bridgeSeconds + "秒回接, 回接段不属于原始动作.";
    draw();
    setPlaybackMessage(sampler.source.id === "synthetic-playback-check"
      ? "程序生成的播放验证样例, 不用于评价动作自然度."
      : sampler.audio ? "动作已载入. 音频信息已保留, 当前仅回放骨骼与口型." : "动作已载入, 按原始时间戳回放.");
  }
  async function read(loadText) {
    const version = ++loadVersion; setPlaybackMessage("正在读取和校验动作文件.");
    try {const text = await loadText(); if (version === loadVersion) load(decodeMotion(text));}
    catch (error) {if (version === loadVersion) setPlaybackMessage("载入失败: " + error.message, true);}
  }
  element("motion-file").addEventListener("change", event => {
    const file = event.target.files[0]; if (!file) return;
    read(async () => {if (file.size > MAX_BYTES) throw new Error("文件超过32MiB, 请拆分片段."); return file.text();});
    event.target.value = "";
  });
  element("load-sample").addEventListener("click", () => read(async () => {
    const response = await fetch("/samples/playback_check.motion.json");
    if (!response.ok) throw new Error("播放验证样例不可用."); return response.text();
  }));
  element("play-pause").addEventListener("click", () => {
    if (player.snapshot(false).playing) pause(); else {player.play(); draw(); if (animation === null && player.snapshot(false).playing) animation = requestAnimationFrame(animate);}
  });
  element("motion-stop").addEventListener("click", () => {cancel(); player.stop(); draw();});
  for (const [id, direction] of [["motion-prev",-1],["motion-next",1]]) {
    element(id).addEventListener("click", () => {cancel(); player.step(direction); draw();});
  }
  for (const id of ["motion-seek","motion-time"]) element(id).addEventListener("input", event => {
    const value = Number(event.target.value);
    if (!Number.isFinite(value)) return;
    pause(false); player.seek(value); draw();
  });
  element("motion-speed").addEventListener("change", event => {player.setSpeed(Number(event.target.value)); draw();});
  element("motion-loop").addEventListener("change", event => {pause(false); player.setLoop(event.target.checked); draw();});
  element("control-panel").addEventListener("input", () => {
    if (player) {pause(false); setPlaybackMessage("手动姿态检查中. 再次播放将恢复动作文件的姿态.");}
  }, {capture:true});
  document.addEventListener("visibilitychange", () => {if (document.hidden) pause();});
  window.addEventListener("pagehide", () => {cancel(); ++loadVersion;}, {once:true});
}
