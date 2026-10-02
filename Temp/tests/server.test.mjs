import test from "node:test";
import assert from "node:assert/strict";
import {request} from "node:http";
import {createBasicServer} from "../../service/basic_server.mjs";
test("公共基础平台只提供本机预览所需的静态文件",async () => {
  const lab = await createBasicServer(0);
  try {
    for (const path of ["/","/web/app.mjs","/motion/vrm_profile.mjs","/samples/playback_check.motion.json","/vendor/three/build/three.module.js"]) {
      const response = await fetch(lab.url+path); assert.equal(response.status,200); await response.arrayBuffer();
    }
    for (const path of ["/.env","/package.json","/Temp/tests/fixture.mjs","/capture-api/start","/configs/rig_profile.json","/web/%2e%2e%2fpackage.json"]) assert.equal((await fetch(lab.url+path)).status,404);
    assert.equal((await fetch(lab.url,{method:"POST",body:"{}"})).status,405);
    assert.equal((await fetch(lab.url,{headers:{Origin:"https://example.com"}})).status,403);
    const foreignHost = await new Promise((accept,reject) => {const call = request(lab.url,{headers:{Host:"example.com"}},response => {response.resume(); response.on("end",() => accept(response.statusCode));}); call.on("error",reject); call.end();});
    assert.equal(foreignHost,403);
    const head = await fetch(lab.url,{method:"HEAD"}); assert.equal((await head.arrayBuffer()).byteLength,0);
    assert.ok(!head.headers.get("content-security-policy").includes("unsafe-inline"));
    assert.equal((await fetch(lab.url+"/%ZZ")).status,400);
    await assert.rejects(createBasicServer(-1));
  } finally {await lab.close();}
});
