import {createBasicServer} from "../service/basic_server.mjs";
const lab = await createBasicServer(Number(process.argv[2] ?? 8766));
console.log("基础平台已启动: "+lab.url);
let stopping = false;
async function stop() {if (stopping) return; stopping = true; await lab.close();}
process.once("SIGINT",stop); process.once("SIGTERM",stop);
