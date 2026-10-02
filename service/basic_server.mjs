import {createServer} from "node:http";
import {readFile,stat,realpath} from "node:fs/promises";
import {createReadStream} from "node:fs";
import {fileURLToPath} from "node:url";
import {resolve,relative,sep,extname,isAbsolute} from "node:path";
import {createHash} from "node:crypto";
const root = fileURLToPath(new URL("../",import.meta.url));
const files = new Map([["/","web/index.html"],["/assets/model.vrm","assets/model.vrm"],["/samples/playback_check.motion.json","samples/playback_check.motion.json"]]);
for (const name of ["app","viewer","panel","model_input","bone_labels","rig_checks","playback","player_view"]) files.set("/web/"+name+".mjs","web/"+name+".mjs");
for (const name of ["style.css","player.css","playback.html"]) files.set("/web/"+name,"web/"+name);
for (const name of ["bones","schema","schema_validate","validate","codec","pose_controller","pose_frame","clip_sampler","player_clock","vrm_profile","rig_graph"]) files.set("/motion/"+name+".mjs","motion/"+name+".mjs");
const vendors = new Map([["/vendor/three/","node_modules/three"],["/vendor/vrm/","node_modules/@pixiv/three-vrm/lib"]]);
const types = {".html":"text/html; charset=utf-8",".css":"text/css; charset=utf-8",".js":"text/javascript; charset=utf-8",".mjs":"text/javascript; charset=utf-8",".json":"application/json; charset=utf-8",".vrm":"model/gltf-binary"};
export async function createBasicServer(port = 8766) {
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error("本地端口无效.");
  const html = await readFile(resolve(root,"web/index.html"),"utf8");
  const importMap = html.match(/<script type="importmap">([\s\S]*?)<\/script>/)?.[1];
  if (!importMap) throw new Error("页面缺少依赖映射.");
  const hash = createHash("sha256").update(importMap).digest("base64");
  const server = createServer(async (request,response) => {
    const finish = (status,text) => {response.writeHead(status,{"content-type":"text/plain; charset=utf-8"}); response.end(text);};
    const hosts = ["127.0.0.1:"+server.address().port,"localhost:"+server.address().port];
    if (!hosts.includes(request.headers.host) || (request.headers.origin && request.headers.origin !== "http://"+request.headers.host)) return finish(403,"仅允许本机页面访问.");
    if (!["GET","HEAD"].includes(request.method)) return finish(405,"只提供读取服务.");
    let path;
    try {path = decodeURIComponent(new URL(request.url,"http://"+request.headers.host).pathname);} catch {return finish(400,"地址无效.");}
    if (path.includes("\\") || path.includes("\0") || path.split("/").includes("..")) return finish(404,"文件不存在.");
    let candidate = files.has(path) ? resolve(root,files.get(path)) : null, boundary = root;
    if (!candidate) for (const [prefix,directory] of vendors) {
      if (path.startsWith(prefix) && extname(path) === ".js") {boundary = resolve(root,directory); candidate = resolve(boundary,path.slice(prefix.length)); break;}
    }
    if (!candidate) return finish(404,"文件不存在.");
    try {
      const physical = await realpath(candidate), rest = relative(await realpath(boundary),physical);
      if (isAbsolute(rest) || rest === ".." || rest.startsWith(".."+sep)) return finish(404,"文件不存在.");
      const info = await stat(physical); if (!info.isFile()) return finish(404,"文件不存在.");
      response.writeHead(200,{"content-type":types[extname(physical)],"content-length":info.size,"cache-control":"no-store","x-content-type-options":"nosniff","cross-origin-resource-policy":"same-origin","referrer-policy":"no-referrer","content-security-policy":"default-src 'self'; script-src 'self' 'sha256-"+hash+"'; style-src 'self'; img-src 'self' blob: data:; connect-src 'self' blob:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"});
      if (request.method === "HEAD") return response.end();
      const stream = createReadStream(physical); stream.on("error",() => response.destroy()); response.on("close",() => stream.destroy()); stream.pipe(response);
    } catch {finish(404,"文件不存在.");}
  });
  await new Promise((accept,reject) => {server.once("error",reject); server.listen(port,"127.0.0.1",accept);});
  return {server,url:"http://127.0.0.1:"+server.address().port,close:() => new Promise((accept,reject) => server.close(error => error ? reject(error) : accept()))};
}
