import {Quaternion} from "three";
import {validateMotion} from "./validate.mjs";
const clamp = (value, maximum) => Math.max(0, Math.min(value, maximum));
const quaternion = values => new Quaternion().fromArray(values).normalize();
const rotationArray = value => value.toArray().map(component => component === 0 ? 0 : component);
function copyFrame(frame) {
  const result = structuredClone(frame);
  result.local_rotations = result.local_rotations.map(values => rotationArray(quaternion(values)));
  return result;
}
function finite(value) {
  if (!Number.isFinite(value)) throw new Error("采样时间或回接进度必须是有限数值.");
}
function interpolate(a, b, amount, time) {
  const frame = structuredClone(a);
  const linear = (left, right) => left.map((value, index) => value + (right[index] - value) * amount);
  frame.time = time;
  frame.root_position = linear(a.root_position, b.root_position);
  frame.expressions = linear(a.expressions, b.expressions);
  frame.local_rotations = a.local_rotations.map((rotation, index) => {
    return rotationArray(quaternion(rotation).slerp(quaternion(b.local_rotations[index]), amount).normalize());
  });
  return frame;
}
export class MotionSampler {
  #frames;
  constructor(clip) {
    validateMotion(clip);
    this.#frames = structuredClone(clip.frames);
    this.name = clip.name; this.source = Object.freeze({...clip.source});
    this.audio = clip.audio ? Object.freeze({...clip.audio}) : null;
    this.boneOrder = Object.freeze([...clip.bone_order]);
    this.expressionOrder = Object.freeze([...clip.expression_order]);
    this.times = Object.freeze(this.#frames.map(frame => frame.time));
    this.duration = this.times.at(-1);
    Object.freeze(this);
  }
  frameIndex(time) {
    finite(time);
    let low = 0, high = this.times.length - 1;
    while (low < high) {
      const middle = Math.ceil((low + high) / 2);
      if (this.times[middle] <= time) low = middle; else high = middle - 1;
    }
    return low;
  }
  sample(time) {
    finite(time); time = clamp(time, this.duration);
    const index = this.frameIndex(time), a = this.#frames[index], b = this.#frames[index + 1];
    if (!b || time === a.time) return copyFrame(a);
    return interpolate(a, b, (time - a.time) / (b.time - a.time), time);
  }
  bridge(progress) {
    finite(progress); progress = clamp(progress, 1);
    if (progress === 0) return copyFrame(this.#frames.at(-1));
    if (progress === 1) {const first = copyFrame(this.#frames[0]); first.time = this.duration; return first;}
    const frame = interpolate(this.#frames.at(-1), this.#frames[0], progress, this.duration);
    if (frame.contacts) frame.contacts = {leftFoot:null,rightFoot:null};
    if (frame.confidence) frame.confidence = {root:null,bones:this.boneOrder.map(() => null),expressions:this.expressionOrder.map(() => null)};
    return frame;
  }
}
