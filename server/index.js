import {researchNeighborhood} from './cala.js';
import {buildContext} from './context.js';
import {createServer} from 'node:http';
import {readFile,realpath} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {neighborhoodChat,MODEL} from './chat.js';
import {InputError} from './context.js';

const root=fileURLToPath(new URL('../dist/',import.meta.url));
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.txt':'text/plain; charset=utf-8'};
const send=(res,status,body)=>{if(!res.destroyed){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(body));}};
export function createApp({chat=neighborhoodChat,configured=Boolean(process.env.OPENAI_API_KEY)}={}) {
  let active=0;const calls=[];
  return createServer(async(req,res)=>{
    res.setHeader('X-Content-Type-Options','nosniff');
    try {
      const url=new URL(req.url,'http://localhost');
      if(url.pathname==='/api/health') return send(res,200,{configured,model:configured?MODEL:null});
      if(url.pathname==='/api/neighborhood-chat'||url.pathname==='/api/neighborhood-research') {
        if(req.method!=='POST') return send(res,405,{error:'Use POST.'});
        if(req.headers.origin&&new URL(req.headers.origin).host!==req.headers.host) return send(res,403,{error:'Use chat from this app.'});
        if(!req.headers['content-type']?.startsWith('application/json')) return send(res,415,{error:'Send JSON.'});
        if(!configured) return send(res,503,{error:'Live chat is not configured on this server.'});
        while(calls.length&&Date.now()-calls[0]>60000) calls.shift();
        if(active>=4||calls.length>=20){res.setHeader('Retry-After','15');return send(res,429,{error:'The neighborhood is busy. Try again shortly.'});}
        const chunks=[];let bytes=0;
        for await(const chunk of req){bytes+=chunk.length;if(bytes>20000)return send(res,413,{error:'Question is too large.'});chunks.push(chunk);}
        let input;try{input=JSON.parse(Buffer.concat(chunks).toString());}catch{return send(res,400,{error:'Invalid JSON.'});}
        const controller=new AbortController();
        res.on('close',()=>{if(!res.writableEnded)controller.abort();});
        calls.push(Date.now());active++;
        try {if(url.pathname==='/api/neighborhood-research'){const context=buildContext(input);return send(res,200,await researchNeighborhood(context.question,{signal:controller.signal}));}return send(res,200,await chat(input,{signal:controller.signal}));}
        catch(error){
          if(error instanceof InputError)return send(res,400,{error:error.message});
          // Do not serialize provider errors: they may include request internals.
          console.error('Resident chat unavailable:',error.name||'Error');
          return send(res,502,{error:'Live replies could not be generated. Try again; no simulated answer has been substituted.'});
        }finally{active--;}
      }
      if(req.method!=='GET'&&req.method!=='HEAD')return send(res,405,{error:'Method not allowed.'});
      const file=path.resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));
      if(!file.startsWith(root)||!mime[path.extname(file)]||path.relative(root,file).split(path.sep).some(p=>p.startsWith('.'))) return send(res,404,{error:'Not found.'});
      const resolved=await realpath(file);
      if(!resolved.startsWith(root))return send(res,404,{error:'Not found.'});
      const body=await readFile(resolved);
      res.writeHead(200,{'Content-Type':mime[path.extname(file)],'Cache-Control':'no-cache'});
      res.end(req.method==='HEAD'?undefined:body);
    }catch{return send(res,404,{error:'Not found.'});}
  });
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const port=Number(process.env.PORT||8124);
  createApp().listen(port,'127.0.0.1',()=>console.log(`DataScape: http://127.0.0.1:${port} · live chat ${process.env.OPENAI_API_KEY?'configured':'unavailable'}`));
}
