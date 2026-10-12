import http from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname } from "node:path";
import { root, dist } from "../scripts/common.mjs";
import { keccak256, toHex } from "viem";
const deployment = JSON.parse(
  await readFile(resolve(dist, "imd-deployment.json")),
);
const product = JSON.parse(
  await readFile(resolve(root, "web/config/product.json")),
);
const rulesHash = keccak256(
  await readFile(resolve(dist, "sdk/arcade-engine.mjs")),
);
export const testHashes = {
  session: keccak256(toHex("skyline-test-session-only")),
  releaseHash: keccak256(toHex("skyline-test-release-only")),
  transactionHash: keccak256(toHex("skyline-test-transaction-only")),
  blockHash: keccak256(toHex("skyline-test-block-only")),
};
export function hostPage() {
  return `<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Local bridge test harness — no real wallet</title><style>html,body{margin:0;background:#0b141b;height:100%}iframe{display:block;border:0;width:100%;height:100vh}</style></head><body><iframe title="SKYLINE HEIST test iframe" sandbox="allow-scripts allow-pointer-lock" src="/preview/index.html"></iframe><script type="module">
import {verifyRun} from '/preview/sdk/arcade-engine.mjs';
const params=new URLSearchParams(location.search),frame=document.querySelector('iframe'),channel='skyline-test-channel';
window.fixture={calls:[],ready:false,connected:params.get('connected')!=='false',chainId:params.get('wrongChain')?137:1,preview:params.get('preview')==='true',startState:params.get('state')||'playing',startError:params.get('startError')||'',claimError:params.get('claimError')||'',statusState:params.get('status')||'signed',claimed:false,empty:false,expired:params.has('expired'),wrongWallet:params.has('wrongWallet'),tamper:params.has('tamper'),zero:params.has('zero'),score:7,result:null,inputs:'',seed:20261012,holdStart:false,holdClaim:false};
const f=window.fixture,send=data=>frame.contentWindow.postMessage({protocol:'pepe-game/1',channel,...data},'*');
const session=()=>({state:'playing',id:'local-test-session',seed:f.seed,rulesHash:'${rulesHash}',tickRate:30,maxTicks:1800,expiresAt:window.sessionExpires??(window.sessionExpires=Date.now()+300000)});
const voucher=()=>({session:'${testHashes.session}',player:f.wrongWallet?'${deployment.contracts[0].address}':'${product.creator}',releaseHash:'${testHashes.releaseHash}',rulesHash:f.tamper?'${testHashes.releaseHash}':'${rulesHash}',amount:(BigInt(f.score)*10n**18n).toString(),deadline:Math.floor(Date.now()/1000)+(f.expired?-60:240)});
const result=state=>({state,result:f.result??{score:f.zero?0:f.score,ticks:1800,hp:2},voucher:state==='signed'&&!f.zero?voucher():null,claimed:f.claimed});
const init=()=>send({type:'init',preview:f.preview});const timer=params.has('once')?null:setInterval(init,100);frame.addEventListener('load',init);
window.reply=(id,result,error)=>send({type:'chain-result',id,result,error});
window.hostPause=()=>send({type:'pause'});window.hostResume=()=>send({type:'resume'});window.rebind=()=>frame.contentWindow.postMessage({protocol:'pepe-game/1',channel:'changed-test-channel',type:'init',preview:f.preview},'*');
window.addEventListener('message',async e=>{const m=e.data;if(e.source!==frame.contentWindow||m?.protocol!=='pepe-game/1'||m.channel!==channel)return;if(m.type==='ready'){f.ready=true;clearInterval(timer);return;}if(m.type!=='chain')return;f.calls.push(m.request);try{let answer;switch(m.request.type){case 'account':answer={address:f.connected?'${product.creator}':null,chainId:f.chainId};break;case 'arcade.start':if(f.holdStart){f.pendingStart=m.id;return;}if(f.startError)throw Error(f.startError);f.connected=true;answer=f.startState==='playing'?session():result(f.startState);break;case 'arcade.finish':f.inputs=m.request.inputs;f.result=verifyRun(f.seed,f.inputs);f.score=f.result.score;answer=result('queued');break;case 'arcade.status':answer=result(f.statusState);break;case 'arcade.claim':if(f.holdClaim){f.pendingClaim=m.id;return;}if(f.claimError)throw Error(f.claimError);f.claimed=true;answer='${testHashes.transactionHash}';break;default:throw Error('Unsupported fixture request');}window.reply(m.id,answer);}catch(e){window.reply(m.id,null,e.message);}});
</script></body></html>`;
}
export async function startServer(port = 0) {
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://localhost");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Cache-Control", "no-store");
      if (url.pathname === "/host") {
        res.setHeader("Content-Type", "text/html");
        res.end(hostPage());
        return;
      }
      if (!url.pathname.startsWith("/preview/")) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }
      const path = resolve(
        dist,
        decodeURIComponent(url.pathname.slice("/preview/".length)) ||
          "index.html",
      );
      if (!path.startsWith(dist + "/")) {
        res.writeHead(403);
        res.end();
        return;
      }
      const body = await readFile(path);
      res.setHeader(
        "Content-Type",
        {
          ".html": "text/html",
          ".js": "text/javascript",
          ".mjs": "text/javascript",
          ".css": "text/css",
          ".json": "application/json",
          ".svg": "image/svg+xml",
          ".webp": "image/webp",
          ".woff2": "font/woff2",
          ".woff": "font/woff",
          ".txt": "text/plain",
        }[extname(path)] || "application/octet-stream",
      );
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end("Not found");
    }
  });
  await new Promise((resolve) => server.listen(port, "127.0.0.1", resolve));
  return {
    url: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === resolve(root, "web/tests/server.mjs")
) {
  const server = await startServer(Number(process.argv[2] || 4173));
  console.log(server.url + "/preview/");
}
