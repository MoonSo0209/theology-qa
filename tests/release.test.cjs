'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),{createRequire}=require('node:module');
const root=path.resolve(__dirname,'..'),conversation=require('../assets/conversation.js');
const sampleScope=vm.createContext({});vm.runInContext(fs.readFileSync(path.join(root,'assets/data.js'),'utf8'),sampleScope);const data=vm.runInContext('DATA',sampleScope);
const history=category=>[{category,question:'이전 질문에서 말한 은혜는 무엇입니까?',answer:'이전 답변은 은혜가 하나님의 선물이라는 설명입니다.',isDemo:false}];
function backend(options={}){
  const requests=[];const apiScope={module:{exports:{}},require:createRequire(path.join(root,'api/ask.js')),process:{env:{GEMINI_API_KEY:'test-only-placeholder'}},console,fetch:async(url,init)=>{
    const request=JSON.parse(init.body);requests.push(request);
    if(options.quota&&requests.length===1)return {ok:false,status:429,text:async()=>JSON.stringify({error:{message:'quota'}})};
    return {ok:true,status:200,text:async()=>JSON.stringify({output_text:JSON.stringify(data[options.category||'qt'])})};
  }};
  vm.runInNewContext(fs.readFileSync(path.join(root,'api/ask.js'),'utf8'),apiScope);
  return {requests,async ask(body){const res={status(n){this.code=n;return this;},json(d){this.body=d;return this;}};await apiScope.module.exports({method:'POST',body},res);return res;}};
}
test('context fits API limit and preserves the entire new question',()=>{
  for(let n=1;n<=3;n++)for(const length of [1,100,700]){
    const h=Array.from({length:n},()=>({...history('qt')[0],question:'질'.repeat(1000),answer:'답'.repeat(650)}));
    const q='문'.repeat(length),packed=conversation.packQuestion(q,h,'qt');assert.ok(packed.length<=1000);assert.ok(packed.includes(q));
  }
  assert.throws(()=>conversation.packQuestion('문'.repeat(701),history('qt'),'qt'),/700/);
});
test('all four categories deliver prior question and answer to the model',async()=>{
  for(const category of ['qt','worry','life','doctrine']){
    const app=backend({category}),h=history(category);
    const result=await app.ask({category,question:'그것을 일상에 어떻게 적용합니까?',book:'창세기',chapter:'22',verseFrom:'1',verseTo:'14',history:h});
    assert.equal(result.code,200);assert.equal(app.requests.length,1);
    const prompt=app.requests[0].input;assert.ok(prompt.includes(h[0].question));assert.ok(prompt.includes(h[0].answer));assert.ok(prompt.includes('그것을 일상에 어떻게 적용합니까?'));
    assert.ok(category==='qt'?result.body.views.length:result.body.panel.length);
  }
});
test('sample answers and other categories never enter live context',async()=>{
  for(const h of [history('life'),[{...history('qt')[0],isDemo:true}]]){
    const app=backend(),result=await app.ask({category:'qt',question:'다음 질문',history:h});assert.equal(result.code,400);assert.equal(app.requests.length,0);
  }
});
test('invalid question is rejected and existing quota fallback still works',async()=>{
  const bad=backend();assert.equal((await bad.ask({category:'qt',question:{}})).code,400);assert.equal(bad.requests.length,0);
  const app=backend({category:'qt',quota:true});assert.equal((await app.ask({category:'qt',question:'본문의 뜻은 무엇입니까?',book:'창세기',chapter:'22'})).code,200);assert.equal(app.requests.length,2);assert.notEqual(app.requests[0].model,app.requests[1].model);
});
test('homepage assets exist and backups are excluded from release',()=>{
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');for(const match of html.matchAll(/(?:src|href)="(assets\/[^\"]+)"/g))assert.ok(fs.existsSync(path.join(root,match[1])));
  assert.ok(fs.readFileSync(path.join(root,'.gitignore'),'utf8').includes('backups/'));assert.ok(fs.readFileSync(path.join(root,'.vercelignore'),'utf8').includes('backups/'));
});
