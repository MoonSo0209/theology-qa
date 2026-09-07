/* Shared by the local page and proxy. The public API accepts a 1,000-character question. */
(function(root){
"use strict";
const MAX_FOLLOWUP=700,MAX_HISTORY=3;
function clip(value,max){const text=String(value??"").replace(/\s+/g," ").trim();return text.length>max?text.slice(0,Math.max(0,max-1))+"…":text;}
function summarize(data,category){
  let parts=[];
  if(category==="qt")parts=(data.views||[]).map(v=>v.theologian+": "+clip(v.view,150));
  else if(category==="doctrine")parts=(data.positions||[]).map(p=>p.label+": "+clip(p.claim,140));
  else parts=(Array.isArray(data.unified)?data.unified:[data.unified]).filter(Boolean);
  if(!parts.length)parts=[data.passage||data.analysis||""];
  return clip(parts.join(" / "),650);
}
function normalize(history,category){
  if(!Array.isArray(history))throw new Error("이전 대화의 형식을 확인해 주십시오.");
  return history.slice(-MAX_HISTORY).map(turn=>{
    if(!turn||turn.category!==category||typeof turn.question!=="string"||typeof turn.answer!=="string")throw new Error("같은 갈래의 이전 대화만 연결할 수 있습니다.");
    if(turn.isDemo)throw new Error("예시 답변은 실제 AI 대화의 근거로 전달할 수 없습니다. 새 질문으로 시작해 주십시오.");
    return {question:clip(turn.question,1000),answer:clip(turn.answer,650),reference:clip(turn.reference,60)};
  });
}
function packQuestion(question,history,category){
  if(typeof question!=="string"||!question.trim()||question.length>1000)throw new Error("질문을 1,000자 이내로 적어 주십시오.");
  if(!history?.length)return question;
  if(question.length>MAX_FOLLOWUP)throw new Error("이어서 묻는 질문은 이전 대화와 함께 전달할 수 있도록 700자 이내로 적어 주십시오.");
  const turns=normalize(history,category);
  const lead="[이전 대화의 발췌 요약 · 참고 맥락]\n";
  const tail="\n[지금 이어서 묻는 질문]\n"+question+"\n이전 맥락을 참고하여 지금 질문에 답해 주십시오.";
  const available=1000-lead.length-tail.length;
  // The most recent exchange gets the most room; no part of the new question is cut.
  const weights=turns.map((_,i)=>i+1),total=weights.reduce((a,b)=>a+b,0);
  const lines=turns.map((turn,i)=>{
    const room=Math.floor(available*weights[i]/total)-1;
    const prefix=(i+1)+". ";
    const labels="질문: ".length+" / 답변: ".length;
    const questionBudget=Math.floor((room-prefix.length-labels)*.45);
    const q=clip((turn.reference?turn.reference+" · ":"")+turn.question,questionBudget);
    const a=clip(turn.answer,room-prefix.length-q.length-labels);
    return prefix+"질문: "+q+" / 답변: "+a;
  });
  return lead+lines.join("\n")+tail;
}
const api={MAX_FOLLOWUP,MAX_HISTORY,clip,summarize,packQuestion};
if(typeof module!=="undefined"&&module.exports)module.exports=api;else root.Conversation=api;
})(typeof globalThis!=="undefined"?globalThis:this);
