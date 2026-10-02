const element = id => document.getElementById(id);
export function updatePlayerView(player, state) {
  const {sampler} = player;
  element("motion-name").textContent = sampler.name;
  element("motion-position").textContent = state.time.toFixed(3) + " / " + sampler.duration.toFixed(3) + "秒";
  element("motion-frame").textContent = "左侧关键帧: " + (state.index + 1) + " / " + sampler.times.length;
  element("motion-seek").max = String(sampler.duration); element("motion-seek").value = String(state.time);
  element("motion-time").max = String(sampler.duration); element("motion-time").value = state.time.toFixed(3);
  element("play-pause").textContent = state.playing ? "暂停" : "播放";
  element("motion-state").textContent = state.transition ? "回接首帧" : state.playing ? "播放中" : "已暂停";
  element("motion-loop-count").textContent = "循环次数: " + state.loops;
  element("control-panel").disabled = state.playing; element("verify").disabled = state.playing;
  element("play-pause").disabled = sampler.duration === 0;
  element("motion-loop").disabled = sampler.duration === 0;
}
export function setPlaybackMessage(text, error = false) {
  element("motion-message").textContent = text;
  element("motion-message").className = error ? "small fail" : "small muted";
}
