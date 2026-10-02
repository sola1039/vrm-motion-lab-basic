import {boneLabel} from "./bone_labels.mjs";
import {encodeMotion} from "../motion/codec.mjs";
import {runRigChecks} from "./rig_checks.mjs";

const element = id => document.getElementById(id);
export function bindPanel(controller, viewer, graph) {
  const {profile} = controller;
  function option(select, value, label) {
    const node = document.createElement("option"); node.value = value; node.textContent = label; select.appendChild(node);
  }
  profile.bone_order.forEach(name => option(element("bone"), name, boneLabel(name)));
  element("bone").value = "head";
  const vowelLabels = {aa:"啊",ih:"衣",ou:"乌",ee:"诶",oh:"哦"};
  controller.expressions.forEach(name => option(element("expression"), name, vowelLabels[name]));
  element("expression").disabled = controller.expressions.length === 0;
  element("mouth-weight").disabled = controller.expressions.length === 0;
  function refreshAngles(render = true) {
    const name = element("bone").value;
    const values = controller.getAngles(name);
    ["x","y","z"].forEach((axis, index) => {
      element("angle-" + axis).value = String(Math.round(values[index]));
      element("value-" + axis).textContent = Math.round(values[index]) + "度";
    });
    const parent = graph.bone_parents[name];
    element("parent").textContent = "父骨骼: " + (parent ? boneLabel(parent) : "骨架根节点");
    if (render) viewer.select(name);
  }
  function refreshMouth() {
    const value = controller.expressions.length ? controller.vrm.expressionManager?.getValue(element("expression").value) ?? 0 : 0;
    element("mouth-weight").value = String(value); element("mouth-value").textContent = value.toFixed(2);
  }
  function verify() {
    const result = runRigChecks(controller);
    element("checks").replaceChildren();
    for (const item of result.checks) {
      const row = document.createElement("p");
      const label = document.createElement("span"); label.textContent = item.name;
      const state = document.createElement("span"); state.className = item.pass ? "pass" : "fail";
      state.textContent = (item.pass ? "通过" : "未通过") + (item.detail ? " / " + item.detail : "");
      row.append(label, state); element("checks").appendChild(row);
    }
    element("checks").dataset.passed = String(result.passed);
    viewer.render(); return result;
  }
  element("bone").addEventListener("change", refreshAngles);
  ["x","y","z"].forEach(axis => element("angle-" + axis).addEventListener("input", () => {
    const angles = ["x","y","z"].map(name => Number(element("angle-" + name).value));
    controller.setRotation(element("bone").value, angles); refreshAngles();
  }));
  element("reset-bone").addEventListener("click", () => {controller.resetBone(element("bone").value); refreshAngles();});
  element("reset-all").addEventListener("click", () => {controller.reset(); refreshAngles(); refreshMouth();});
  element("expression").addEventListener("change", refreshMouth);
  element("mouth-weight").addEventListener("input", () => {
    controller.setExpression(element("expression").value, Number(element("mouth-weight").value)); refreshMouth(); viewer.render();
  });
  element("show-bones").addEventListener("change", event => viewer.showBones(event.target.checked));
  element("show-axes").addEventListener("change", event => viewer.showAxes(event.target.checked));
  document.querySelectorAll("[data-view]").forEach(button => button.addEventListener("click", () => viewer.view(button.dataset.view)));
  element("verify").addEventListener("click", verify);
  element("export-pose").addEventListener("click", () => {
    const content = encodeMotion(controller.capture());
    element("pose-content").value = content; element("pose-preview").hidden = false; element("pose-preview").open = true;
    const blob = new Blob([content], {type:"application/json"});
    const url = URL.createObjectURL(blob); const anchor = document.createElement("a");
    anchor.href = url; anchor.download = "manual_pose.motion.json"; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  element("control-panel").disabled = false; element("verify").disabled = false;
  element("binding-summary").textContent = "模型已有蒙皮. 父骨骼带动子骨骼, 子骨骼可独立旋转.";
  refreshAngles(); refreshMouth();
  return {...verify(), refresh:() => {refreshAngles(false); refreshMouth();}};
}
