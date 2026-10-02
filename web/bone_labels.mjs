const core = {hips:"髋部",spine:"脊柱",chest:"胸部",upperChest:"上胸部",neck:"颈部",head:"头部",jaw:"下颌"};
const parts = {Shoulder:"肩部",UpperArm:"上臂",LowerArm:"前臂",Hand:"手腕",UpperLeg:"大腿",LowerLeg:"小腿",Foot:"脚",Toes:"脚趾",Eye:"眼球"};
const fingers = {Thumb:"拇指",Index:"食指",Middle:"中指",Ring:"无名指",Little:"小指"};
const segments = {Metacarpal:"掌骨",Proximal:"近节",Intermediate:"中节",Distal:"远节"};
export function boneLabel(name) {
  if (core[name]) return core[name];
  const side = name.startsWith("left") ? "左" : "右";
  const part = name.replace(/^(left|right)/, "");
  if (parts[part]) return side + parts[part];
  const finger = part.match(/^(Thumb|Index|Middle|Ring|Little)(Metacarpal|Proximal|Intermediate|Distal)$/);
  return finger ? side + fingers[finger[1]] + segments[finger[2]] : name;
}
