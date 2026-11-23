#!/usr/bin/env node
/** No npm install required: Node.js built-in HTTP server for shared-device offline play. */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(fileURLToPath(new URL('../public/',import.meta.url)));
const port=Number(process.env.OFFLINE_PORT || 4173);
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.wav':'audio/wav','.ico':'image/x-icon'};
const server=http.createServer((req,res)=>{
  try{
    if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);res.end();return;}
    const url=new URL(req.url,'http://localhost');
    if(url.pathname==='/'){res.writeHead(302,{Location:'/index.html?offline=1'});res.end();return;}
    const pathname=decodeURIComponent(url.pathname);
    const target=path.resolve(root,`.${pathname}`);
    if(!target.startsWith(`${root}${path.sep}`) || pathname.includes('\0')){res.writeHead(403);res.end();return;}
    if(!fs.existsSync(target)||!fs.statSync(target).isFile()){res.writeHead(404);res.end('Not found');return;}
    const size=fs.statSync(target).size;let start=0,end=size-1,status=200;
    const headers={'Content-Type':types[path.extname(target)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Accept-Ranges':'bytes','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; media-src 'self' blob:; connect-src 'self'; object-src 'none'; base-uri 'self'"};
    if(req.headers.range){
      const match=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
      if(!match || (!match[1]&&!match[2])){res.writeHead(416,{'Content-Range':`bytes */${size}`});res.end();return;}
      if(!match[1])start=Math.max(0,size-Number(match[2]));
      else{start=Number(match[1]);if(match[2])end=Math.min(end,Number(match[2]));}
      if(start>end || start>=size || !Number.isSafeInteger(start)||!Number.isSafeInteger(end)){res.writeHead(416,{'Content-Range':`bytes */${size}`});res.end();return;}
      status=206;headers['Content-Range']=`bytes ${start}-${end}/${size}`;
    }
    headers['Content-Length']=Math.max(0,end-start+1);
    res.writeHead(status,headers);
    if(req.method==='HEAD'||!size){res.end();return;}
    fs.createReadStream(target,{start,end}).on('error',()=>res.destroy()).pipe(res);
  }catch{res.writeHead(400);res.end('Bad request');}
});
server.listen(port,'127.0.0.1',()=>console.log(`Chronicle Gate 오프라인: http://127.0.0.1:${port}/\n브라우저에서 위 주소를 열어 주세요. 이 창을 닫으면 게임 서버가 종료됩니다.\n외부 인터넷/회원가입/API 키가 필요하지 않습니다. 종료: Ctrl+C`));
