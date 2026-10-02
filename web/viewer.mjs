import * as THREE from "three";
import {OrbitControls} from "three/addons/controls/OrbitControls.js";

export function createViewer(container) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf3f6fa);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x687886, 2.4));
  const light = new THREE.DirectionalLight(0xffffff, 2.3); light.position.set(-1, 3, 2); scene.add(light);
  scene.add(new THREE.GridHelper(4, 20, 0xa9bbcb, 0xdce5ed));
  const renderer = new THREE.WebGLRenderer({antialias: true, alpha: false});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);
  const camera = new THREE.PerspectiveCamera(32, 1, 0.01, 30);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.minDistance = 0.3; controls.maxDistance = 9;
  const axes = new THREE.AxesHelper(0.16); axes.material.depthTest = false; axes.renderOrder = 10; scene.add(axes);
  let vrm, profile, graph, selected = "head", lines, radius = 3;
  const vector = new THREE.Vector3();
  const yaw = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);
  function render() {
    if (vrm) {
      vrm.humanoid.update(); vrm.expressionManager?.update();
      vrm.scene.updateMatrixWorld(true);
      const node = vrm.humanoid.getNormalizedBoneNode(selected);
      node.getWorldPosition(axes.position); node.getWorldQuaternion(axes.quaternion);
      if (profile.vrm_version === "0") axes.quaternion.multiply(yaw);
      if (lines) {
        const attribute = lines.geometry.getAttribute("position");
        let offset = 0;
        for (const [child, parent] of Object.entries(graph.bone_parents)) {
          if (!parent) continue;
          vrm.humanoid.getRawBoneNode(parent).getWorldPosition(vector); vector.toArray(attribute.array, offset); offset += 3;
          vrm.humanoid.getRawBoneNode(child).getWorldPosition(vector); vector.toArray(attribute.array, offset); offset += 3;
        }
        attribute.needsUpdate = true;
        lines.geometry.computeBoundingSphere();
      }
    }
    renderer.render(scene, camera);
  }
  function view(side = "front") {
    const directions = {front:[0,0,1],back:[0,0,-1],left:[1,0,0],right:[-1,0,0]};
    camera.position.copy(controls.target).add(new THREE.Vector3(...directions[side]).multiplyScalar(radius));
    controls.update(); render();
  }
  function resize() {
    const {width, height} = container.getBoundingClientRect();
    renderer.setSize(width, height); camera.aspect = width / Math.max(height, 1); camera.updateProjectionMatrix(); render();
  }
  const observer = new ResizeObserver(resize); observer.observe(container);
  controls.addEventListener("change", render);
  window.addEventListener("pagehide", () => { observer.disconnect(); controls.dispose(); renderer.dispose(); }, {once:true});
  resize();
  return {
    scene, render, view,
    attach(model, skeleton, binding) {
      vrm = model; profile = skeleton; graph = binding; scene.add(vrm.scene);
      const box = new THREE.Box3().setFromObject(vrm.scene);
      const size = box.getSize(new THREE.Vector3()); box.getCenter(controls.target);
      radius = Math.max(size.y, size.x / camera.aspect) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) * 1.18;
      lines = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({color:0x197e9d,depthTest:false}));
      const segments = Object.values(graph.bone_parents).filter(Boolean).length;
      lines.geometry.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(segments * 6), 3));
      lines.visible = false; lines.renderOrder = 8; scene.add(lines); view();
    },
    select(name) {selected = name; render();},
    showBones(show) {if (lines) lines.visible = show; render();},
    showAxes(show) {axes.visible = show; render();}
  };
}
