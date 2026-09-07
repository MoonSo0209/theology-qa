"use strict";
const http=require("node:http"),fs=require("node:fs"),path=require("node:path");
const {packQuestion}=require("../assets/conversation.js");
const root=path.resolve(__dirname,".."),port=4187,site="https://theology-qa.vercel.app";
const mime={".html":"text/html; charset=utf-8",".css":"text/css; charset=utf-8",".js":"text/javascript; charset=utf-8",".svg":"image/svg+xml"};
function send(res,status,data){res.writeHead(status,{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"});res.end(JSON.stringify(data));}
http.createServer(async(req,res)=>{
  const url=new URL(req.url,"http://127.0.0.1:"+port);
  if(!["127.0.0.1:"+port,"localhost:"+port].includes(req.headers.host))return send(res,403,{error:"Local host only"});
  if(url.pathname==="/health")return send(res,200,{app:"theology-design-preview",mode:"local"});
  if(url.pathname==="/api/ask"){
    if(req.method!=="POST")return send(res,405,{error:"POST only"});
    if(req.headers.origin&&!["http://127.0.0.1:"+port,"http://localhost:"+port].includes(req.headers.origin))return send(res,403,{error:"Local origin only"});
    if(!String(req.headers["content-type"]).includes("application/json"))return send(res,415,{error:"JSON required"});
    let body="",size=0;const chunks=[];
    try{
      for await(const c of req){size+=c.length;if(size>16384)return send(res,413,{error:"Question too long"});chunks.push(c);}
      body=Buffer.concat(chunks).toString("utf8");const d=JSON.parse(body);if(!["qt","worry","life","doctrine"].includes(d.category)||typeof d.question!=="string"||d.question.length>1000)return send(res,400,{error:"Invalid question"});
      // Only the existing public question endpoint is used. No credentials or upstream headers are relayed.
      let question;try{question=packQuestion(d.question,d.history,d.category);}catch(error){return send(res,400,{error:error.message});}
      const payload={category:d.category,question:d.question,...(d.history?{history:d.history}:{})};
      if(d.category==="qt")for(const key of ["book","chapter","verseFrom","verseTo"])payload[key]=String(d[key]||"").slice(0,40);
      const upstream=await fetch(site+"/api/ask",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload),signal:AbortSignal.timeout(145000)});
      res.writeHead(upstream.status,{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"});res.end(await upstream.text());
    }catch(e){send(res,502,{error:"AI 연결을 완료하지 못했습니다. 잠시 후 다시 시도해 주십시오."});}
    return;
  }
  if(!["GET","HEAD"].includes(req.method))return send(res,405,{error:"Method not allowed"});
  const pages=new Set(["index.html","assets/design.css","assets/design.js","assets/data.js","assets/conversation.js","assets/mark.svg"]);
  const file=url.pathname==="/"?"index.html":url.pathname.slice(1);
  if(!pages.has(file))return send(res,404,{error:"Not found"});
  fs.readFile(path.join(root,file),(err,data)=>{if(err)return send(res,404,{error:"Not found"});res.writeHead(200,{"Content-Type":mime[path.extname(file)],"Cache-Control":"no-store","X-Content-Type-Options":"nosniff","Referrer-Policy":"no-referrer"});res.end(req.method==="HEAD"?undefined:data);});
}).listen(port,"127.0.0.1",()=>console.log("Local preview: http://127.0.0.1:"+port));
