import {GLTFLoader} from "three/addons/loaders/GLTFLoader.js";
import {VRMLoaderPlugin,VRMUtils} from "@pixiv/three-vrm";
import {parseGlbDocument,inspectVrm} from "../motion/vrm_profile.mjs";
import {inspectRigGraph} from "../motion/rig_graph.mjs";
import {PoseController} from "../motion/pose_controller.mjs";
import {assertEmbeddedResources} from "./model_input.mjs";
import {createViewer} from "./viewer.mjs";
import {bindPanel} from "./panel.mjs";
import {bindPlayback} from "./playback.mjs";
const element = id => document.getElementById(id);
let busy = false, loaded = false, viewer;
const loader = new GLTFLoader(); loader.register(parser => new VRMLoaderPlugin(parser));
async function load(read,name) {
  if (busy || loaded) return;
  busy = true; element("model-file").disabled = true; element("load-model").disabled = true;
  let vrm, attached = false;
  try {
    element("status").textContent = "正在读取模型"; element("status").className = "";
    const bytes = await read();
    if (bytes.byteLength > 128*1024*1024) throw new Error("模型超过128MiB, 请先缩减资源.");
    const modelDocument = parseGlbDocument(bytes); assertEmbeddedResources(modelDocument);
    const profile = inspectVrm(bytes), graph = inspectRigGraph(modelDocument,profile);
    const gltf = await loader.parseAsync(bytes,""); vrm = gltf.userData.vrm;
    if (!vrm) throw new Error("无法读取人形模型.");
    VRMUtils.rotateVRM0(vrm); VRMUtils.combineSkeletons(vrm.scene);
    if (vrm.lookAt) vrm.lookAt.autoUpdate = false;
    vrm.scene.traverse(object => {if (object.isMesh) object.frustumCulled = false;});
    const controller = new PoseController(vrm,profile); controller.reset();
    viewer ??= createViewer(element("stage")); viewer.attach(vrm,profile,graph); attached = true;
    const result = bindPanel(controller,viewer,graph);
    await bindPlayback(controller,viewer,result.refresh);
    element("loading").remove(); loaded = true;
    element("model-info").textContent = name+" / "+profile.bone_order.length+"个标准骨骼";
    element("status").textContent = result.passed ? "角色就绪 / 验证通过" : "角色就绪 / 请核对方向提示";
    element("status").className = result.passed ? "ready" : "error";
    document.body.dataset.ready = "true";
  } catch (error) {
    loaded = attached;
    if (vrm) VRMUtils.deepDispose(vrm.scene);
    element("status").textContent = "模型载入失败"; element("status").className = "error";
    element("loading").textContent = error.message + (attached ? " 请刷新页面后重试." : "");
  } finally {busy = false; element("model-file").disabled = loaded; element("load-model").disabled = loaded;}
}
element("model-file").onchange = event => {
  const file = event.target.files[0]; if (!file) return;
  load(() => {if (file.size > 128*1024*1024) throw new Error("模型超过128MiB."); return file.arrayBuffer();},file.name); event.target.value = "";
};
element("load-model").onclick = () => load(async () => {
  const response = await fetch("/assets/model.vrm");
  if (!response.ok) throw new Error("请把自己的模型放到assets/model.vrm, 或直接选择本地文件.");
  return response.arrayBuffer();
},"本地默认模型");
