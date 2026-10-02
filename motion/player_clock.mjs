export class MotionPlayer {
  #phase = 0; #anchor; #playing = false; #speed = 1; #loop = false; #loops = 0;
  constructor(sampler, clock = () => performance.now() / 1000) {
    this.sampler = sampler; this.clock = clock; this.bridgeSeconds = 0.2;
    this.#anchor = this.#read();
  }
  #read() {
    const reading = this.clock();
    if (!Number.isFinite(reading) || reading < 0) throw new Error("播放时钟无效.");
    return Math.max(reading, this.#anchor ?? 0);
  }
  #advance() {
    const now = this.#read();
    if (this.#playing) {
      this.#phase += (now - this.#anchor) * this.#speed;
      const duration = this.sampler.duration;
      if (this.#loop) {
        const cycle = duration + this.bridgeSeconds;
        const crossed = Math.floor((this.#phase + 1e-12) / cycle);
        this.#loops += crossed; this.#phase = Math.max(0, this.#phase - crossed * cycle);
      } else if (this.#phase >= duration) {this.#phase = duration; this.#playing = false;}
    }
    this.#anchor = now;
  }
  snapshot(includeFrame = true) {
    this.#advance();
    const time = Math.min(this.#phase, this.sampler.duration);
    const transition = this.#loop && this.sampler.duration > 0 && this.#phase >= this.sampler.duration;
    const bridgeProgress = transition ? (this.#phase - this.sampler.duration) / this.bridgeSeconds : null;
    return {time,transition,bridgeProgress,playing:this.#playing,speed:this.#speed,loop:this.#loop,loops:this.#loops,
      index:this.sampler.frameIndex(time), frame:includeFrame ? (transition ? this.sampler.bridge(bridgeProgress) : this.sampler.sample(time)) : null};
  }
  play() {
    this.#advance();
    if (this.sampler.duration === 0) return false;
    const end = this.sampler.duration + (this.#loop ? this.bridgeSeconds : 0);
    if (this.#phase >= end) this.#phase = 0;
    this.#playing = true; return true;
  }
  pause() {this.#advance(); this.#playing = false;}
  seek(time) {
    if (!Number.isFinite(time)) throw new Error("播放位置必须是有限数值.");
    this.#advance(); this.#phase = Math.max(0, Math.min(time, this.sampler.duration));
  }
  stop() {this.pause(); this.#phase = 0; this.#loops = 0;}
  setSpeed(value) {
    if (!Number.isFinite(value) || value < 0.1 || value > 3) throw new Error("播放速度需在0.1到3之间.");
    this.#advance(); this.#speed = value;
  }
  setLoop(value) {
    if (typeof value !== "boolean") throw new Error("循环开关无效.");
    this.#advance(); if (value === this.#loop) return; this.#loop = value;
    this.#phase = Math.min(this.#phase, this.sampler.duration);
  }
  step(direction) {
    if (direction !== -1 && direction !== 1) throw new Error("逐帧方向无效.");
    this.pause();
    const time = Math.min(this.#phase, this.sampler.duration);
    let index = this.sampler.frameIndex(time);
    if (direction === 1) index++; else if (time === this.sampler.times[index]) index--;
    index = Math.max(0, Math.min(index, this.sampler.times.length - 1));
    this.seek(this.sampler.times[index]);
  }
}
