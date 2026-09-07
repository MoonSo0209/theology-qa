"use strict";
const $=id=>document.getElementById(id);
const escapeHtml=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const E=escapeHtml;
const config={
qt:{english:"DAILY DEVOTION",subtitle:"연구와 묵상",title:"말씀 곁에 머무는,<br><em>고요한 시간.</em>",description:"오늘 읽은 말씀에 질문을 건네 보십시오.<br>문맥과 신학자의 견해를 따라, 묵상이 한 걸음 깊어집니다.",meta:["D형 큐티","연구와 묵상"],form:"어떤 말씀을 묵상하고 계십니까?",label:"말씀을 읽으며 떠오른 질문",placeholder:"마음에 남은 구절이나 이해하기 어려운 부분을 적어 주십시오.",action:"함께 묵상하기"},
worry:{english:"QUESTIONS OF FAITH",subtitle:"신앙과 마음의 물음",title:"마음에 남은 질문,<br><em>함께 바라봅니다.</em>",description:"믿음과 의심 사이에서 쉽게 꺼내지 못한 이야기.<br>다섯 신학자의 시선과 함께 천천히 살펴봅니다.",meta:["신앙과 의미","다섯 사람의 시선"],form:"어떤 물음이 마음에 남아 있습니까?",label:"마음에 담아 두었던 질문",placeholder:"잘 정리되지 않아도 좋습니다. 지금의 고민을 그대로 적어 주십시오.",action:"함께 살펴보기"},
life:{english:"FAITH IN EVERYDAY LIFE",subtitle:"일상과 관계의 이야기",title:"삶의 무게를 잠시,<br><em>여기에 내려놓습니다.</em>",description:"관계의 어려움부터 혼자 감당해 온 마음까지.<br>신앙의 언어로 당신의 일상을 함께 살펴봅니다.",meta:["일상과 관계","다섯 사람의 시선"],form:"오늘의 삶에서 무엇이 어렵습니까?",label:"나누고 싶은 삶의 이야기",placeholder:"관계, 상처, 외로움처럼 지금 마주한 이야기를 적어 주십시오.",action:"이야기 나누기"},
doctrine:{english:"TRADITIONS IN CONVERSATION",subtitle:"전통과 해석의 차이",title:"같은 물음 앞에,<br><em>여섯 개의 시선.</em>",description:"서로 다른 신학 전통은 어디에서 만나고 갈라질까요.<br>각자의 근거를 나란히 읽으며 이해를 넓혀 갑니다.",meta:["교리와 전통","여섯 사람의 시선"],form:"어떤 가르침을 더 알고 싶으십니까?",label:"함께 비교해 보고 싶은 교리",placeholder:"구원, 성례, 은총과 자유 등 궁금한 교리를 적어 주십시오.",action:"견해 비교하기"}
};
function icon(name){
const paths={qt:'<path d="M3 5c3-1 6 0 9 2 3-2 6-3 9-2v14c-3-1-6 0-9 2-3-2-6-3-9-2Z M12 7v14"/>',worry:'<path d="M8 18 3 21v-6a8 8 0 1 1 5 3Z M9 9a3 3 0 0 1 5-2c2 2-2 3-2 5 M12 15v.3"/>',life:'<path d="M20 4c-3-2-6 0-8 2-2-2-5-4-8-2-7 6 8 16 8 16S27 10 20 4Z"/>',doctrine:'<path d="M3 4h5v16H3Zm8 0h4v16h-4Zm7 1 3-1 3 15-3 1Z M4 8h3m5 0h2"/>',sun:'<circle cx="12" cy="12" r="4"/><path d="M12 1v3m0 16v3M1 12h3m16 0h3M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2"/>',moon:'<path d="M20 14A9 9 0 0 1 10 3a9 9 0 1 0 10 11Z"/>',book:'<path d="M4 3h13a2 2 0 0 1 2 2v16H6a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3 M3 17h16 M8 7h6 M11 5v7"/>'};
return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(paths[name]||paths.book)+'</svg>';
}
function portrait(av,size=46){
const a=av||figureAvatar("참고 신학자");
return '<svg class="portrait" width="'+size+'" height="'+size+'" viewBox="0 0 64 64" aria-hidden="true"><path d="M4 64q6-19 28-19t28 19Z" fill="'+E(a.robe)+'"/><ellipse cx="32" cy="28" rx="12.5" ry="14.5" fill="'+E(a.skin)+'"/><circle cx="27" cy="28" r="1.3" fill="#4a423a"/><circle cx="37" cy="28" r="1.3" fill="#4a423a"/><path d="'+E(a.hairD)+'" fill="'+E(a.hair)+'"/><path d="'+E(a.beardD)+'" fill="'+E(a.hair)+'"/>'+(a.glasses?'<g fill="none" stroke="#5d544a" stroke-width="1.4"><circle cx="27" cy="28" r="4.2"/><circle cx="37" cy="28" r="4.2"/><path d="M31 28h2"/></g>':'')+'</svg>';
}
function scholarAvatar(name){
for(const k of ["worry","life","doctrine"]){const match=DATA[k].panel.find(p=>p.name===name||(["존 칼빈","장 칼뱅"].includes(name)&&p.name==="장 칼뱅"));if(match)return match.av;}
return figureAvatar(name);
}
const isLocalPreview=location.protocol==="file:"||["localhost","127.0.0.1"].includes(location.hostname);
document.documentElement.dataset.environment=isLocalPreview?"local":"production";
const state={cat:"qt",mode:isLocalPreview?"demo":"live",request:0,busy:false,controller:null,timer:null,cooldown:0,dayLimit:false,drafts:{},observer:null,context:[],completed:null};
let dark=false;try{dark=localStorage.getItem("theology-design-theme")==="dark";}catch{}
function theme(){document.documentElement.dataset.theme=dark?"dark":"light";$("themeToggle").innerHTML=icon(dark?"sun":"moon");$("themeToggle").setAttribute("aria-label",dark?"밝게 보기":"어둡게 보기");$("themeToggle").title=dark?"밝게 보기":"어둡게 보기";try{localStorage.setItem("theology-design-theme",dark?"dark":"light");}catch{}}
function refLabel(values=valuesNow()){
if(!values.book||!values.chapter)return "";
return values.book+" "+values.chapter+"장"+(values.verseFrom?" "+values.verseFrom+(values.verseTo&&values.verseTo!==values.verseFrom?"~"+values.verseTo:"")+"절":"");
}
function valuesNow(){return {category:state.cat,book:$("book").value.trim(),chapter:$("chapter").value.trim(),verseFrom:$("verseFrom").value.trim(),verseTo:$("verseTo").value.trim(),question:$("question").value.trim()};}
function updateInput(){$("characterCount").textContent=$("question").value.length+" / "+$("question").maxLength.toLocaleString();$("refPreview").textContent=refLabel()||"장만 입력하시면 해당 장 전체를 살펴봅니다.";}
function historyMarkup(history){return '<details><summary>이전 질문과 답변 '+history.length+'개 살펴보기</summary>'+history.map(t=>'<article><span class="kicker">'+E(t.reference||DATA[t.category].name)+(t.isDemo?' · 예시':'')+'</span><h4>'+E(t.question)+'</h4><p>'+E(t.answer)+'</p></article>').join('')+'</details>';}
function syncContext(){
const active=state.context.length>0;
$("question").maxLength=active?Conversation.MAX_FOLLOWUP:1000;
$("followupContext").hidden=!active;
$("followupContext").innerHTML=active?'<div class="followup-heading"><strong>앞선 이야기에서 이어갑니다</strong><button type="button" class="text-button" id="detachContext">연결 해제</button></div><p>최근 '+state.context.length+'개의 질문과 답변에서 핵심을 발췌해 함께 참고합니다. 새 질문은 700자까지 적을 수 있습니다.</p>'+historyMarkup(state.context):'';
if($("detachContext"))$("detachContext").onclick=()=>{state.context=[];syncContext();updateInput();};
$("questionLabel").textContent=active?'이어서 묻고 싶은 질문':config[state.cat].label;
updateInput();
}
function updateDock(){
const visible=!$("resultArea").hidden&&document.querySelector('.reading-header').getBoundingClientRect().bottom<0;
$("questionDock").hidden=!visible;
}
function beginFollowup(){
const previous=state.completed;if(!previous)return;
cancelRequest();
// A sample answer must never enter the real AI conversation as if it were generated.
if(previous.isDemo!==(state.mode==='demo')){state.context=[];syncContext();$("validation").textContent='답변 모드가 바뀌었습니다. 현재 모드에서 답변을 받은 뒤 이어서 질문해 주십시오.';$("validation").hidden=false;$("editQuestion").click();return;}
state.context=[...(previous.payload.history||[]),{category:state.cat,question:previous.payload.question,reference:state.cat==='qt'?refLabel(previous.payload):'',answer:Conversation.summarize(previous.data,state.cat),isDemo:previous.isDemo}].slice(-Conversation.MAX_HISTORY);
for(const id of ['book','chapter','verseFrom','verseTo'])$(id).value=previous.payload[id]||'';
$("question").value='';state.completed=null;$("resultArea").hidden=true;$("readingGuide").hidden=true;$("validation").hidden=true;syncContext();updateDock();
$("questionForm").scrollIntoView({behavior:'smooth'});$("question").focus({preventScroll:true});
}
function cancelRequest(){state.request++;if(state.controller)state.controller.abort();state.controller=null;state.busy=false;if(state.observer)state.observer.disconnect();updateSubmitButton();}
function updateSubmitButton(){const secs=Math.ceil((state.cooldown-Date.now())/1000);$("submitButton").disabled=state.busy||(state.mode==="live"&&(secs>0||state.dayLimit));$("submitButton").innerHTML=state.busy?"답변을 준비하고 있습니다…":(state.mode==="live"&&secs>0?"잠시 기다려 주십시오 ("+secs+"초)":E(config[state.cat].action)+' <span aria-hidden="true">↗</span>');}
function pickCategory(cat){
if(!ORDER.includes(cat))return;
state.drafts[state.cat]={...valuesNow(),history:state.context};cancelRequest();state.cat=cat;state.completed=null;
document.documentElement.dataset.category=cat;
const c=config[cat],meta=DATA[cat],qt=cat==="qt";
$("categories").innerHTML=ORDER.map((k,i)=>'<button type="button" class="category" data-category="'+k+'"'+(k===cat?' aria-current="page"':'')+'>'+icon(k)+'<span><strong>'+E(DATA[k].name)+'</strong><small>'+E(config[k].subtitle)+'</small></span><span class="cat-index">0'+(i+1)+'</span></button>').join("");
$("crumb").textContent=meta.name;$("eyebrow").textContent=c.english;$("heroTitle").innerHTML=c.title;$("heroDescription").innerHTML=c.description;$("heroMeta").innerHTML=c.meta.map(E).join("<i></i>");
$("formKicker").textContent=qt?"오늘의 본문":meta.name+"의 자리";$("formTitle").textContent=c.form;$("questionLabel").textContent=c.label;$("question").placeholder=c.placeholder;
$("qtFields").hidden=!qt;$("refPreview").hidden=!qt;
$("keyboardHint").innerHTML=qt?"<kbd>Ctrl</kbd> + <kbd>Enter</kbd>로도 보낼 수 있습니다.":"<kbd>Enter</kbd>로 전송 · <kbd>Shift + Enter</kbd>로 줄바꿈";
$("sidebarNote").innerHTML=qt?"<b>오늘의 묵상 안내</b>본문을 읽고 질문한 뒤,<br>나의 삶에 비추어 봅니다.":"<b>"+meta.panel.length+"명의 신학자와 함께합니다</b>서로의 시선을 나란히 읽고,<br>질문에 한 걸음 다가갑니다.";
$("guide").innerHTML=qt?'<div class="guide-icon">'+icon("book")+'</div><span class="kicker">OUR FOUNDATION</span><h3>말씀을 살피는 기준</h3><p><strong>대한예수교장로회 합동</strong>의<br>개혁주의 전통을 기준으로 합니다.</p><p class="guide-foot">웨스트민스터 신앙고백서와 대·소요리문답을 따르며, 본문에 따라 1~3인의 견해를 살펴봅니다.<br><br>다른 전통에서는 해석이 달라질 수 있습니다.</p>':'<span class="kicker">IN CONVERSATION</span><h3>함께 답하는 신학자</h3><div class="roster">'+meta.panel.map(p=>'<div class="roster-person">'+portrait(p.av,32)+'<div><strong>'+E(p.name)+'</strong><small>'+E(p.years)+'</small></div></div>').join("")+'</div><p class="guide-foot">'+(cat==="doctrine"?"교단의 차이를 비교하며, 서로 다른 주장을 하나의 결론으로 합치지 않습니다.":"사상에 근거해 재구성한 답변으로, 실제 저작의 직접 인용은 아닙니다.")+'</p>';
const saved=state.drafts[cat]||{};
state.context=saved.history||[];
for(const id of ["book","chapter","verseFrom","verseTo","question"])$(id).value=saved[id]||"";
$("fillExample").textContent=(qt?"창세기 22장 · "+meta.example.question:meta.example)+" ↗";
$("validation").hidden=true;$("resultArea").hidden=true;$("readingGuide").hidden=false;$("results").innerHTML="";$("responseState").innerHTML="";$("contents").innerHTML="";
syncContext();updateInput();updateSubmitButton();updateDock();
}
function fillExample(){const ex=DATA[state.cat].example;if(state.cat==="qt"){for(const id of ["book","chapter","verseFrom","verseTo","question"])$(id).value=ex[id];}else{$("question").value=ex;}updateInput();$("validation").hidden=true;$("question").focus();}
function footnotes(text,terms=[],uid){
text=String(text||"");const intervals=[];
terms.forEach((t,i)=>{const word=String(t.term||"").trim();if(!word)return;const start=text.indexOf(word);if(start<0)return;const end=start+word.length;if(!intervals.some(x=>start<x.end&&end>x.start))intervals.push({start,end,index:i});});
intervals.sort((a,b)=>a.start-b.start);let last=0,html="";
for(const x of intervals){html+=E(text.slice(last,x.end))+'<a id="'+uid+'-ref-'+x.index+'" class="footnote-ref" href="#'+uid+'-term-'+x.index+'" aria-label="'+E(terms[x.index].term)+' 용어 풀이 '+(x.index+1)+'">'+(x.index+1)+'</a>';last=x.end;}
html+=E(text.slice(last));
const notes=terms.length?'<div class="term-notes"><h4>용어 풀이</h4><ol>'+terms.map((t,i)=>'<li id="'+uid+'-term-'+i+'"><b>'+E(t.term)+'</b> — '+E(t.meaning)+(intervals.some(x=>x.index===i)?'<a href="#'+uid+'-ref-'+i+'" aria-label="본문으로 돌아가기">↩</a>':'')+'</li>').join("")+'</ol></div>':"";
return {html,notes};
}
function mergeVerses(list=[]){
const groups=[];for(const v of list){const m=String(v.ref||"").match(/^(.*?)(\d+)\s*[:장]\s*(\d+)(?:\s*[-~–]\s*(\d+))?\s*절?$/);
const p=m?{book:m[1].trim(),ch:+m[2],start:+m[3],end:+(m[4]||m[3])}:null;
const part={number:p&&p.start===p.end?p.start:null,text:v.text};const prev=groups.at(-1);
if(p&&prev&&prev.p&&p.book===prev.p.book&&p.ch===prev.p.ch&&p.start===prev.p.end+1){prev.p.end=p.end;prev.parts.push(part);prev.ref=(p.book?p.book+" ":"")+p.ch+":"+prev.p.start+"–"+p.end;}else groups.push({ref:v.ref,p,parts:[part]});}return groups;
}
function verseBlock(v){return '<div class="verse-block"><span class="verse-ref">'+E(v.ref)+'</span><p class="verse-text">'+v.parts.map(p=>(v.parts.length>1&&p.number?'<sup aria-label="'+p.number+'절">'+p.number+'</sup>':"")+E(p.text)).join(" ")+'</p></div>';}
function panelCard(person,i,qt){
const name=qt?person.theologian:person.name;const base=qt?{}:DATA[state.cat].panel.find(p=>p.name===name)||DATA[state.cat].panel[i]||{};
const terms=person.terms||[],uid="view-"+i,note=footnotes(qt?person.view:person.body,terms,uid);
const sources=qt?'<div class="sources"><h4>확인할 수 있는 자료</h4>'+((person.sources||[]).length?person.sources.map(s=>'<div class="source-item"><strong>'+E(s.work)+'<span class="source-kind">'+E(s.kind)+'</span></strong><p>'+E(s.note)+'</p></div>').join(""):'<p>확실한 출처가 제시되지 않았습니다. 원문 확인이 필요합니다.</p>')+'</div>':"";
return '<article class="reading-card thinker" data-thinker="'+E(name)+'"><div class="thinker-top">'+portrait(person.av||base.av||scholarAvatar(name),48)+'<div><h4 class="thinker-name">'+E(name)+'</h4><div class="thinker-meta"><span>'+E(person.tradition||base.tradition)+'</span><span>'+E(base.years)+'</span></div></div><span class="thinker-number">0'+(i+1)+'</span></div><div class="thinker-body">'+(!qt?'<p class="thinker-summary">'+E(person.summary)+'</p>':'')+'<p class="prose">'+note.html+'</p>'+(!qt&&person.plain?'<div class="plain"><b>쉽게 말하면</b>'+E(person.plain)+'</div>':'')+note.notes+sources+'</div></article>';
}
function section(i,title,html,hint=""){return '<section class="result-section" id="section-'+i+'" data-title="'+E(title)+'"><div class="section-heading"><span>0'+i+'</span><h3>'+E(title)+'</h3></div>'+(hint?'<p class="section-hint">'+E(hint)+'</p>':'')+html+'</section>';}
function renderAnswer(data,payload,isDemo){
state.completed={data,payload,isDemo};
const qt=payload.category==="qt",doc=payload.category==="doctrine";let html="",i=1;
if(qt){
html+=section(i++,"질문과 맞닿은 구절",'<div class="reading-card scripture-card">'+(mergeVerses(data.keyVerses).map(verseBlock).join("")||'<p class="prose">질문과 직접 관련된 구절을 특정하지 못했습니다.</p>')+'</div><p class="source-note">본문은 실제 성경과 대조해 주십시오.</p>',"연속된 구절은 함께 읽고, 작은 절 번호로 경계를 확인합니다.");
html+=section(i++,"본문의 자리",'<div class="reading-card"><p class="prose">'+E(data.passage)+'</p></div>');
html+=section(i++,"신학자들의 견해",(data.views||[]).map((v,n)=>panelCard(v,n,true)).join(""),(data.views||[]).length+"인의 견해 · 예장 합동 개혁주의 기준");
if(data.caution)html+=section(i++,"해석할 때 주의할 점",'<div class="caution-card"><p class="prose">'+E(data.caution)+'</p></div>');
html+=section(i++,"묵상을 위한 질문",'<div class="reading-card">'+(data.reflection||[]).map((r,n)=>'<div class="reflection-item"><span>0'+(n+1)+'</span><p>'+E(r)+'</p></div>').join("")+'</div>');
}else{
html+=section(i++,"질문 분석",'<div class="reading-card"><p class="prose">'+E(data.analysis)+'</p><div class="tags">'+(data.tags||[]).map(t=>'<span class="tag">'+E(t)+'</span>').join("")+'</div></div>');
html+=section(i++,"신학자별 답변",(data.panel||[]).map((v,n)=>panelCard(v,n,false)).join("")+'<p class="source-note">각 신학자의 사상에 근거한 재구성이며, 실제 저작의 직접 인용이 아닙니다.</p>',(data.panel||[]).length+"명이 같은 질문에 답합니다.");
html+=doc?section(i++,"쟁점 지도",'<div class="reading-card" style="padding:0">'+(data.positions||[]).map(p=>'<div class="position"><p class="position-label">'+E(p.label)+'</p><h4>'+E(p.claim)+'</h4><p class="prose">'+E(p.detail)+'</p><p class="who">'+E(p.who)+'</p></div>').join("")+'</div><div class="axes"><h4>해석이 갈리는 지점</h4><ul>'+(data.axes||[]).map(a=>'<li>'+E(a)+'</li>').join("")+'</ul></div><p class="source-note">이 갈래는 특정 교단을 정통으로 전제하지 않으며, 양립할 수 없는 주장을 하나로 합치지 않습니다.</p>'):section(i++,"복합적 결론",'<div class="reading-card">'+(Array.isArray(data.unified)?data.unified:[data.unified]).map(p=>'<p class="prose" style="margin-bottom:14px">'+E(p)+'</p>').join("")+'</div>');
html+=section(i++,"참고 성경 구절",'<div class="reading-card scripture-card">'+(data.verses||[]).map(v=>'<div class="verse-block"><span class="verse-ref">'+E(v.ref)+'</span><p class="verse-text">'+E(v.text)+'</p>'+(v.note?'<p class="verse-note">'+E(v.note)+'</p>':'')+'</div>').join("")+'</div><p class="source-note">인용한 본문은 실제 성경에서 확인해 주십시오.</p>');
html+=section(i++,doc?"질문과 관련된 성경 인물":"비슷한 고민을 했던 성경 속 인물",'<div class="figures">'+(data.figures||[]).map(f=>'<article class="reading-card figure">'+portrait(f.av||figureAvatar(f.name),52)+'<div><h4>'+E(f.name)+'</h4><span class="verse-ref">'+E(f.ref)+'</span><p>'+E(f.note)+'</p></div></article>').join("")+'</div><p class="source-note">인물의 초상은 단순화한 일러스트이며 실제 모습이 아닙니다.</p>');
}
$("results").innerHTML=html+'<div class="result-end"><div class="result-actions"><button class="secondary" data-action="reset">질문 지우고 다시 묻기 ↗</button><button class="primary" data-action="followup">이어서 질문하기 <span aria-hidden="true">↗</span></button></div><a href="#resultArea">처음으로 ↑</a></div>';
$("responseState").innerHTML='<div class="notice">'+(isDemo?'<b>예시 답변입니다.</b> '+(qt?'창세기 22장 1~14절의 준비된 내용입니다.':'이 갈래에 준비된 내용입니다.')+' 입력한 질문에 맞추어 새로 생성된 답변은 아닙니다.':'<b>AI가 생성한 답변입니다.</b> 안내된 자료는 직접 검색·대조한 인용이 아니므로 원문에서 확인해 주십시오.')+'</div>';
const sections=[...$("results").querySelectorAll(".result-section")];
$("contents").innerHTML='<span class="kicker">CONTENTS</span>'+sections.map((s,n)=>'<a href="#'+s.id+'"><span>0'+(n+1)+'</span>'+E(s.dataset.title)+'</a>').join("")+'<p class="contents-note">'+(qt?'예장 합동 · 개혁주의 기준<br>연구에서 묵상으로 이어집니다.':'서로 다른 시선으로<br>하나의 질문을 살펴봅니다.')+'</p>';
if(document.activeElement===$("resultArea"))$("resultArea").scrollIntoView({behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth"});
if(state.observer)state.observer.disconnect();
if("IntersectionObserver" in window){state.observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){for(const a of $("contents").querySelectorAll("a"))a.classList.toggle("active",a.hash==="#"+entry.target.id);}}, {rootMargin:"-10% 0px -65% 0px"});sections.forEach(s=>state.observer.observe(s));}
}
function showResultShell(payload){
state.completed=null;
$("resultArea").hidden=false;$("readingGuide").hidden=true;$("results").innerHTML="";$("contents").innerHTML="";
$("conversationTrail").hidden=!payload.history?.length;$("conversationTrail").innerHTML=payload.history?.length?historyMarkup(payload.history):'';
$("dockIcon").innerHTML=icon(payload.category);$("dockLabel").textContent=DATA[payload.category].name+' · '+(payload.category==='qt'?refLabel(payload)+' · ':'')+(payload.history?.length?'이어서 묻는 질문':'지금의 질문');
$("dockQuestion").textContent=Conversation.clip(payload.question,140);$("dockQuestion").title=payload.question;
$("resultKicker").textContent=config[state.cat].english+" / "+(state.mode==="demo"?"예시 답변":"연구와 묵상");
$("resultTitle").textContent=state.cat==="qt"?refLabel(payload):DATA[state.cat].name+"에 관한 문답";
$("resultQuestion").textContent=payload.question;$("resultArea").focus({preventScroll:true});$("resultArea").scrollIntoView({behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth"});
}
function scheduleCooldown(seconds,day){
clearInterval(state.timer);state.dayLimit=Boolean(day);state.cooldown=day?0:Date.now()+Math.min(Math.max(Number(seconds)||0,0),86400)*1000;
const tick=()=>{updateSubmitButton();const b=$("retryButton"),left=Math.ceil((state.cooldown-Date.now())/1000);if(b){b.disabled=left>0;b.textContent=left>0?"다시 시도 ("+left+"초)":"다시 시도";}if(left<=0){clearInterval(state.timer);state.timer=null;}};
tick();if(!day&&seconds>0)state.timer=setInterval(tick,250);
}
function showError(info,status,payload){
const day=info.quotaKind==="day";const message=info.error||(status===429?"사용량 제한으로 답변을 가져오지 못했습니다. 잠시 후 다시 시도해 주십시오.":"답변을 가져오지 못했습니다. 잠시 후 다시 시도해 주십시오.");
$("results").innerHTML="";$("contents").innerHTML="";$("responseState").innerHTML='<div class="error-state"><span class="kicker">잠시 멈추어 갑니다</span><h3>답변을 가져오지 못했습니다</h3><p>'+E(message)+'</p>'+(info.detail?'<p>'+E(info.detail)+'</p>':'')+(day?'<p>일일 한도 초기화 후 다시 이용하실 수 있습니다. 예시 답변은 계속 확인할 수 있습니다.</p>':'<button class="primary" id="retryButton">다시 시도</button>')+' <button class="secondary" id="showDemo">예시로 화면 살펴보기</button></div>';
if($("retryButton"))$("retryButton").onclick=()=>submitQuestion();
$("showDemo").onclick=()=>renderAnswer(DATA[state.cat],payload,true);
if(status===429)scheduleCooldown(info.retryAfter,day);
}
function validate(payload){
if(!payload.question)return ["question","질문을 적어 주십시오. 예시 질문을 눌러 시작할 수도 있습니다."];
if(payload.question.length>(state.context.length?Conversation.MAX_FOLLOWUP:1000))return ["question",state.context.length?"이어서 묻는 질문은 700자 이내로 적어 주십시오.":"질문은 1,000자 이내로 적어 주십시오."];
if(payload.category!=="qt")return null;
if(!BIBLE_BOOKS.includes(payload.book))return ["book","성경 책 이름을 확인해 주십시오. 목록에서 선택할 수 있습니다."];
if(!/^\d+$/.test(payload.chapter)||+payload.chapter<1||+payload.chapter>150)return ["chapter","장을 1 이상의 숫자로 적어 주십시오."];
for(const id of ["verseFrom","verseTo"]){if(payload[id]&&(!/^\d+$/.test(payload[id])||+payload[id]<1||+payload[id]>176))return [id,"절을 1 이상의 숫자로 적어 주십시오."];}
if(payload.verseTo&&!payload.verseFrom)return ["verseFrom","시작 절을 함께 적어 주십시오."];
if(payload.verseFrom&&payload.verseTo&&+payload.verseTo<+payload.verseFrom)return ["verseTo","마지막 절은 시작 절과 같거나 커야 합니다."];
return null;
}
async function submitQuestion(){
if(state.busy||(state.mode==="live"&&(state.dayLimit||Date.now()<state.cooldown)))return;
const payload={...valuesNow(),...(state.context.length?{history:state.context.map(t=>({...t}))}:{})},error=validate(payload);
if(error){$("validation").textContent=error[1];$("validation").hidden=false;$(error[0]).focus();return;}
$("validation").hidden=true;state.drafts[state.cat]=payload;cancelRequest();const req=++state.request;state.busy=true;updateSubmitButton();showResultShell(payload);
$("responseState").innerHTML='<div class="loading"><div class="loader"></div><h3>'+(state.mode==="demo"?"준비된 이야기를 펼칩니다.":"질문과 말씀을 살펴보고 있습니다.")+'</h3><p>'+(state.mode==="demo"?"예시 데이터로 화면의 흐름을 확인합니다.":"본문과 견해, 용어 풀이를 준비합니다. 잠시 기다려 주십시오.")+'</p><div class="loading-lines"><i></i><i></i><i></i></div><button type="button" class="secondary" id="cancelButton">그만 기다리기</button></div>';
$("cancelButton").onclick=()=>{cancelRequest();$("responseState").innerHTML='<p class="notice">답변 기다리기를 취소했습니다. 입력한 질문은 그대로 남아 있습니다.</p>';};
try{
if(state.mode==="demo"){await new Promise(r=>setTimeout(r,650));if(req!==state.request)return;renderAnswer(DATA[payload.category],payload,true);}
else{
state.controller=new AbortController();const timeout=setTimeout(()=>state.controller?.abort(),150000);
try{const response=await fetch("/api/ask",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload),signal:state.controller.signal});const body=await response.json();if(req!==state.request)return;
if(!response.ok){showError(body,response.status,payload);return;}
if((payload.category==="qt"&&!Array.isArray(body.views))||(payload.category!=="qt"&&!Array.isArray(body.panel)))throw new Error("답변 형식을 확인하지 못했습니다.");
renderAnswer(body,payload,false);
}finally{clearTimeout(timeout);}
}
}catch(err){if(req===state.request)showError({error:err.name==="AbortError"?"응답 대기 시간이 길어졌습니다. 잠시 후 다시 시도해 주십시오.":"AI 서버에 연결하지 못했습니다. 로컬 실행 여부와 인터넷 연결을 확인해 주십시오."},0,payload);}
finally{if(req===state.request){state.busy=false;state.controller=null;updateSubmitButton();}}
}
function reset(){cancelRequest();state.context=[];state.completed=null;state.drafts[state.cat]={};syncContext();for(const id of ["book","chapter","verseFrom","verseTo","question"])$(id).value="";$("resultArea").hidden=true;$("readingGuide").hidden=false;$("validation").hidden=true;updateInput();updateDock();$("questionForm").scrollIntoView({behavior:"smooth"});$(state.cat==="qt"?"book":"question").focus({preventScroll:true});}
$("books").innerHTML=BIBLE_BOOKS.map(b=>'<option value="'+E(b)+'"></option>').join("");
$("categories").onclick=e=>{const b=e.target.closest("[data-category]");if(b)pickCategory(b.dataset.category);};
$("themeToggle").onclick=()=>{dark=!dark;theme();};
$("fillExample").onclick=fillExample;
$("questionForm").onsubmit=e=>{e.preventDefault();submitQuestion();};
$("question").onkeydown=e=>{if(e.isComposing||e.keyCode===229)return;if(e.key==="Enter"&&(state.cat==="qt"?(e.ctrlKey||e.metaKey):!e.shiftKey)){e.preventDefault();submitQuestion();}};
for(const id of ["book","chapter","verseFrom","verseTo","question"])$(id).addEventListener("input",updateInput);
for(const id of ["chapter","verseFrom","verseTo"])$(id).addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.isComposing){e.preventDefault();submitQuestion();}});
$("editQuestion").onclick=()=>{$("questionForm").scrollIntoView({behavior:"smooth"});$("question").focus({preventScroll:true});};
$("results").onclick=e=>{if(e.target.closest('[data-action="reset"]'))reset();if(e.target.closest('[data-action="followup"]'))beginFollowup();};
$("viewFullQuestion").onclick=()=>{$("resultArea").scrollIntoView({behavior:'smooth'});$("resultArea").focus({preventScroll:true});};
let dockFrame=0;window.addEventListener('scroll',()=>{if(!dockFrame)dockFrame=requestAnimationFrame(()=>{dockFrame=0;updateDock();});},{passive:true});window.addEventListener('resize',updateDock);
$("mode").onchange=()=>{
if($("mode").value==="live"&&location.protocol==="file:"){$("mode").value=state.mode;$("modeDialog").showModal();return;}
cancelRequest();state.mode=$("mode").value;
state.context=[];for(const draft of Object.values(state.drafts))delete draft.history;syncContext();
$("modeNote").innerHTML='<span class="status-dot"></span>'+(state.mode==="demo"?"예시 모드입니다. 질문을 보내면 갈래별로 준비된 답변이 표시됩니다.":"실제 AI 모드입니다. 질문은 현재 홈페이지 서버로 전송되며 기존 AI 사용량에 포함됩니다.");
updateSubmitButton();
};
$("closeDialog").onclick=$("dialogOk").onclick=()=>$("modeDialog").close();
$("mode").value=state.mode;
$("modeNote").innerHTML='<span class="status-dot"></span>'+(isLocalPreview?"예시 모드입니다. 질문을 보내면 갈래별로 준비된 답변이 표시됩니다.":"실제 AI 답변 모드입니다. 질문을 보내면 본문과 여러 견해를 함께 살펴봅니다.");
theme();pickCategory("qt");
