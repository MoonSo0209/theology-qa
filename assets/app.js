"use strict";
/*
 * 신학 문답 — 화면 상태 · 렌더 · 이벤트
 * 데이터는 data.js(AV, BAV, DATA, ORDER, CATVARS)에 정의되어 있습니다.
 *
 * [실제 AI 연동 시] submit() 안에서 DATA[state.cat]를 읽는 대신,
 * fetch("/api/ask", { method:"POST", body: JSON.stringify({ category, question }) })
 * 로 백엔드를 호출해 같은 스키마의 응답을 받아 renderResults()에 넘기면 됩니다.
 */

const THEME_KEY = "theology-qa-theme";

/* ---- 상태 (테마는 저장값 우선, 기본 다크) ---- */
function storedTheme() {
  try { return localStorage.getItem(THEME_KEY); } catch (e) { return null; }
}
const state = { cat: "qt", submitted: false, dark: storedTheme() ? storedTheme() === "dark" : true };

const root = document.documentElement;
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/* ---- 아바타 SVG ---- */
function avatar(av, size, withFace) {
  const eyes = withFace
    ? `<circle cx="27" cy="28" r="1.3" fill="#4a423a"></circle><circle cx="37" cy="28" r="1.3" fill="#4a423a"></circle>`
    : "";
  const glasses = withFace
    ? `<g fill="none" stroke="#5d544a" stroke-width="1.4" opacity="${av.glasses ? 1 : 0}"><circle cx="27" cy="28" r="4.2"></circle><circle cx="37" cy="28" r="4.2"></circle><path d="M31.2 28 h1.6"></path></g>`
    : "";
  const mt = withFace ? "margin-top:2px;" : "";
  return `<svg viewBox="0 0 64 64" style="width:${size}px;height:${size}px;flex:none;border-radius:50%;background:var(--av-bg);${mt}" aria-hidden="true">
    <path d="M4 64 q6-19 28-19 t28 19 Z" fill="${av.robe}"></path>
    <ellipse cx="32" cy="28" rx="12.5" ry="14.5" fill="${av.skin}"></ellipse>
    ${eyes}
    <path d="${av.hairD}" fill="${av.hair}"></path>
    <path d="${av.beardD}" fill="${av.hair}"></path>
    ${glasses}
  </svg>`;
}

const isQt = () => state.cat === "qt";

/* ---- 큐티 본문 표기 ---- */
function qtRef() {
  const b = $("book").value.trim(), c = $("chapter").value.trim();
  const f = $("vFrom").value.trim(), t = $("vTo").value.trim();
  if (!b || !c) return "";
  let s = `${b} ${c}장`;
  if (f) s += (t && t !== f) ? ` ${f}~${t}절` : ` ${f}절`;
  return s;
}
function updateRefPreview() {
  const s = qtRef();
  $("refPreview").textContent = s ? `묵상 본문 — ${s}` : "";
}

/* 연속된 절은 하나로 합치되, 절 경계를 유지해 번호를 붙일 수 있게 합니다. */
function mergeVerses(list) {
  const parse = (ref) => {
    const m = String(ref || "").match(/(\d+)\s*[:：]\s*(\d+)(?:\s*[-~–]\s*(\d+))?/);
    return m ? { ch: +m[1], s: +m[2], e: +(m[3] || m[2]) } : null;
  };
  const out = [];
  (list || []).forEach(v => {
    const cur = parse(v.ref);
    const prev = out[out.length - 1];
    const part = { n: cur ? cur.s : null, text: String(v.text || "").trim() };
    if (cur && prev && prev._p && prev._p.ch === cur.ch && cur.s === prev._p.e + 1) {
      prev._p.e = cur.e;
      prev.ref = prev._p.s === prev._p.e ? `${prev._p.ch}:${prev._p.s}` : `${prev._p.ch}:${prev._p.s}-${prev._p.e}`;
      prev.parts.push(part);
    } else {
      out.push({ ref: v.ref, parts: [part], _p: cur });
    }
  });
  return out;
}
function verseHtml(item) {
  const multi = item.parts.length > 1;
  return item.parts.map(p => (multi && p.n
    ? `<sup style="color:var(--cat);font-weight:700;font-size:10.5px;margin-right:2px">${p.n}</sup>` : "") + esc(p.text)).join(" ");
}

/* 견해 본문에서 용어가 처음 나온 자리에 각주 번호를 붙입니다. */
function annotate(text, terms) {
  let html = esc(text);
  (terms || []).forEach((t, i) => {
    const term = esc(String(t.term || "").trim());
    if (!term) return;
    const at = html.indexOf(term);
    if (at === -1) return;
    const end = at + term.length;
    html = html.slice(0, end) + `<sup style="color:var(--cat);font-weight:700;font-size:10px;padding-left:1px">${i + 1}</sup>` + html.slice(end);
  });
  return html;
}

/* ---- 갈래 반영 ---- */
function applyCat() {
  const [c, t, s] = CATVARS[state.cat];
  root.style.setProperty("--cat", c);
  root.style.setProperty("--cat-tint", t);
  root.style.setProperty("--cat-soft", s);

  const d = DATA[state.cat];

  // 갈래 pill (모든 갈래 공통)
  $("pills").innerHTML = ORDER.map(k => {
    const dd = DATA[k], on = k === state.cat, pc = CATVARS[k][0], pt = CATVARS[k][1];
    return `<button class="pill-cat" data-k="${k}" aria-pressed="${on}" style="--pc:${pc};cursor:pointer;text-align:left;color:var(--color-text);background:${on ? pt : "var(--color-surface)"};border:1px solid ${on ? pc : "var(--color-divider)"};border-radius:999px;padding:8px 16px 8px 13px;display:flex;gap:9px;align-items:center">
      <span style="flex:none;width:8px;height:8px;border-radius:50%;background:${pc};opacity:${on ? 1 : .3}"></span>
      <span style="font-family:var(--serif);font-weight:700;font-size:15px;line-height:1.2">${esc(dd.name)}</span>
      <span style="font-size:11.5px;line-height:1.4;color:var(--ink-55);opacity:${on ? 1 : .6}">${esc(dd.desc)}</span>
    </button>`;
  }).join("");

  $("qCatName").textContent = d.name;

  // 큐티는 입력·좌측 카드가 다릅니다
  $("qtFields").classList.toggle("hidden", !isQt());
  $("rosterCard").classList.toggle("hidden", isQt());
  $("standardCard").classList.toggle("hidden", !isQt());
  $("qCatSuffix").textContent = isQt() ? "— 오늘 묵상하실 본문을 적어 주세요" : "에 대해 묻는 중";
  $("sendHint").textContent = isQt()
    ? "Ctrl + Enter 로도 보낼 수 있습니다"
    : "Enter 로 보내기 · Shift + Enter 로 줄바꿈";
  $("draft").placeholder = isQt()
    ? "이 본문에서 무엇이 궁금하십니까?"
    : "마음에 걸리는 질문을 그대로 적어 주세요";
  $("submitBtn").textContent = isQt() ? "묵상 돕기" : "묻기";

  if (isQt()) {
    $("exampleChip").textContent = `${d.example.book} ${d.example.chapter}장 — ${d.example.question}`;
    updateRefPreview();
    return;   // 큐티는 신학자 명단이 없습니다
  }

  // 좌측 신학자 명단
  $("roster").innerHTML = d.panel.map(r => `
    <div style="display:flex;align-items:center;gap:10px">
      ${avatar(r.av, 30, false)}
      <span style="display:flex;flex-direction:column;min-width:0">
        <span style="font-family:var(--serif);font-size:13.5px;line-height:1.4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(r.name)}</span>
        <span style="font-size:10.5px;color:var(--ink-40)">${esc(r.years)}</span>
      </span>
    </div>`).join("");

  $("exampleChip").textContent = d.example;
}

/* ---- 큐티 결과 렌더 ---- */
function renderQt(asked, d, isMock) {
  const sec = (num, title, hint, inner, delay) => `
    <section style="animation:riseIn .45s ${delay}s both;display:flex;flex-direction:column;gap:13px">
      <div style="display:flex;align-items:baseline;gap:9px;flex-wrap:wrap">
        <span style="font-family:var(--serif);font-size:17px;color:var(--cat)">${num}</span>
        <h2 style="margin:0;font-family:var(--serif);font-weight:700;font-size:18px">${title}</h2>
        ${hint ? `<span style="font-size:11.5px;color:var(--ink-40)">${hint}</span>` : ""}
      </div>${inner}</section>`;
  const card = (inner, extra) =>
    `<div style="background:var(--color-surface);border:1px solid var(--color-divider);border-radius:22px;padding:20px 22px;box-shadow:var(--shadow-soft);${extra || ""}">${inner}</div>`;

  const merged = mergeVerses(d.keyVerses);
  const verses = merged.length
    ? card(`${merged.map((v, i) => `
        <div style="display:flex;flex-direction:column;gap:7px;padding:${i ? "16px" : "0"} 0 ${i === merged.length - 1 ? "4px" : "16px"};border-top:${i ? "1px solid var(--color-divider)" : "0"}">
          <span style="font-family:var(--serif);font-weight:700;font-size:13px;color:var(--cat)">${esc(v.ref)}</span>
          <p style="margin:0;font-family:var(--serif);font-size:16px;line-height:1.95;padding-left:13px;border-left:3px solid var(--cat-tint)">${verseHtml(v)}</p>
        </div>`).join("")}
        <p style="margin:0;padding-top:12px;border-top:1px dotted var(--color-divider);font-size:11.5px;line-height:1.7;color:var(--ink-40)">위 본문은 AI가 옮긴 것입니다. 묵상 전에 실제 성경과 대조해 주세요.</p>`)
    : card(`<p style="margin:0;font-size:14px;color:var(--ink-55)">질문과 직접 맞닿는 구절을 특정하지 못했습니다. 질문을 조금 더 구체적으로 적어 보시면 도움이 됩니다.</p>`);

  const views = (d.views || []).map(v => {
    const notes = (v.terms || []).length
      ? `<div style="display:flex;flex-direction:column;gap:5px;margin-top:11px;padding:11px 14px;background:var(--cat-soft);border-radius:12px">
           ${v.terms.map((t, n) => `<span style="font-size:12.5px;line-height:1.8;color:var(--ink-55)"><sup style="color:var(--cat);font-weight:700;font-size:10px">${n + 1}</sup> <b style="font-family:var(--serif);font-weight:700;color:var(--cat)">${esc(t.term)}</b> — ${esc(t.meaning)}</span>`).join("")}
         </div>` : "";
    const srcs = (v.sources || []).length
      ? `<div style="display:flex;flex-direction:column;gap:5px;margin-top:11px;padding-top:10px;border-top:1px dotted var(--color-divider)">
           <span style="font-size:10.5px;letter-spacing:.1em;font-weight:700;color:var(--ink-40)">확인할 수 있는 자료</span>
           ${v.sources.map(s => `<span style="font-size:12.5px;line-height:1.8;color:var(--ink-55)"><b style="font-family:var(--serif);font-weight:700;color:var(--cat)">${esc(s.work)}</b><span style="font-size:10.5px;padding:1px 7px;border-radius:999px;background:var(--cat-tint);color:var(--cat);margin:0 5px">${esc(s.kind)}</span>${esc(s.note)}</span>`).join("")}
         </div>`
      : `<p style="margin:11px 0 0;padding-top:10px;border-top:1px dotted var(--color-divider);font-size:12px;color:var(--ink-40)">이 견해에 대해서는 확실한 출처를 제시하지 않았습니다. 직접 확인이 필요합니다.</p>`;
    return card(`
      <div style="display:flex;align-items:baseline;gap:9px;flex-wrap:wrap;margin-bottom:8px">
        <span style="font-family:var(--serif);font-weight:700;font-size:16.5px">${esc(v.theologian)}</span>
        <span style="font-size:10.5px;padding:2px 9px;border-radius:999px;background:var(--cat-tint);color:var(--cat)">${esc(v.tradition)}</span>
      </div>
      <p style="margin:0;font-size:14.5px;line-height:1.9;color:var(--ink-70)">${annotate(v.view, v.terms)}</p>
      ${notes}${srcs}`, "margin-bottom:10px");
  }).join("");

  const reflection = (d.reflection || []).map(r =>
    `<div style="display:flex;gap:10px;padding:9px 0;border-top:1px dotted var(--color-divider)">
       <span style="color:var(--cat);flex:none">묵상</span>
       <span style="font-size:14.5px;line-height:1.85">${esc(r)}</span>
     </div>`).join("");

  const mockNotice = isMock ? `
    <div style="background:var(--cat-soft);border:1px dashed var(--color-divider);border-radius:16px;padding:12px 16px;font-size:12.5px;line-height:1.7;color:var(--ink-55)">
      지금은 <b>예시 답변</b>을 보여드리고 있습니다. 입력하신 본문과 무관하게 미리 준비된 내용입니다.
    </div>` : "";

  $("results").innerHTML = `
    <div style="display:flex;flex-direction:column;gap:30px">
      <div style="position:sticky;top:0;z-index:6;margin:-8px 0 -14px;padding:12px 0;background:var(--color-bg);border-bottom:1px solid var(--color-divider);display:flex;gap:10px;align-items:baseline;flex-wrap:wrap">
        <span style="flex:none;font-size:10.5px;font-family:var(--serif);font-weight:700;padding:3px 10px;border-radius:999px;background:var(--cat-tint);color:var(--cat)">${esc(d.reference || asked)}</span>
        <span style="font-size:13px;color:var(--ink-55)">연구와 묵상</span>
        <span style="margin-left:auto;font-size:11px;color:var(--ink-40);white-space:nowrap">예장 합동 · 개혁주의 기준</span>
      </div>
      ${mockNotice}
      ${sec("①", "질문과 맞닿은 구절", "지정하신 본문 안에서 질문과 직접 관련된 부분입니다", verses, .04)}
      ${sec("②", "본문의 자리", "이 본문이 놓인 문맥", card(`<p style="margin:0;font-size:15px;line-height:1.9;color:var(--ink-70)">${esc(d.passage)}</p>`), .14)}
      ${sec("③", "신학자들의 견해", `${(d.views || []).length}명의 견해를 참고했습니다`, views, .24)}
      ${d.caution ? sec("④", "해석할 때 주의할 점", "", card(`<p style="margin:0;font-size:14.5px;line-height:1.9;color:var(--ink-70)">${esc(d.caution)}</p>`), .34) : ""}
      ${sec(d.caution ? "⑤" : "④", "묵상을 위한 질문", "이제 적용으로 넘어가 보십시오", card(reflection), .44)}
      <div style="display:flex;gap:10px;flex-wrap:wrap;animation:fadeIn .5s .5s both">
        <button id="reaskBtn" class="hover-soft" style="cursor:pointer;font-size:13px;color:var(--color-text);background:transparent;border:1px solid var(--color-divider);border-radius:999px;padding:9px 18px">다른 본문으로 묵상하기</button>
      </div>
    </div>`;
  $("results").classList.remove("hidden");
  $("reaskBtn").addEventListener("click", resetAsk);
}

/* ---- 결과 렌더 ----
 * d = 답변 데이터(AI 응답 또는 예시). 갈래 이름·신학자 초상 등 고정 정보는 DATA에서 가져옵니다. */
function renderResults(asked, d, isMock) {
  const meta = DATA[state.cat];
  const isDoctrine = state.cat === "doctrine";

  const analysisSec = `
    <section style="animation:riseIn .45s .04s both;background:var(--color-surface);box-shadow:var(--shadow-soft);border:1px solid var(--color-divider);border-radius:24px;padding:22px 24px;display:flex;flex-direction:column;gap:12px">
      <div style="display:flex;align-items:baseline;gap:9px">
        <span style="font-family:var(--serif);font-size:17px;color:var(--cat)">①</span>
        <h2 style="margin:0;font-family:var(--serif);font-weight:700;font-size:18px">질문 분석</h2>
      </div>
      <p style="margin:0;font-size:15px;line-height:1.9;color:var(--ink-70)">${esc(d.analysis)}</p>
      <div style="display:flex;flex-wrap:wrap;gap:7px;margin-top:2px">
        ${d.tags.map(t => `<span style="font-size:11.5px;padding:4px 12px;border-radius:999px;background:var(--cat-tint);color:var(--cat);font-weight:500">${esc(t)}</span>`).join("")}
      </div>
    </section>`;

  const panelSec = `
    <section style="animation:riseIn .45s .14s both;display:flex;flex-direction:column;gap:14px">
      <div style="display:flex;align-items:baseline;gap:9px;flex-wrap:wrap">
        <span style="font-family:var(--serif);font-size:17px;color:var(--cat)">②</span>
        <h2 style="margin:0;font-family:var(--serif);font-weight:700;font-size:18px">신학자별 답변</h2>
        <span style="font-size:11.5px;color:var(--ink-40)">${d.panel.length}명이 같은 질문에 차례로 답합니다</span>
      </div>
      <div style="display:flex;flex-direction:column;gap:10px">
        ${d.panel.map((t, i) => {
          const base = meta.panel[i] || {};   // 초상·생몰년·전통은 고정 정보에서
          return `
          <div style="background:var(--color-surface);border:1px solid var(--color-divider);border-radius:22px;box-shadow:var(--shadow-soft)">
            <div style="padding:16px 20px 18px;display:flex;gap:14px;align-items:flex-start">
              ${avatar(t.av || base.av, 46, true)}
              <div style="flex:1;display:flex;flex-direction:column;gap:7px;min-width:0">
                <div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap">
                  <span style="font-family:var(--serif);font-weight:700;font-size:16.5px">${esc(t.name || base.name)}</span>
                  <span style="font-size:10.5px;color:var(--ink-40)">${esc(base.years || "")}</span>
                  <span style="font-size:10.5px;padding:2px 9px;border-radius:999px;background:var(--cat-tint);color:var(--cat)">${esc(base.tradition || "")}</span>
                </div>
                <p style="margin:0;font-family:var(--serif);font-size:14px;line-height:1.6;color:var(--cat)">${esc(t.summary)}</p>
                <p style="margin:0;font-size:14.5px;line-height:1.9;color:var(--ink-70)">${esc(t.body)}</p>
                ${t.plain ? `
                <div style="margin-top:3px;background:var(--cat-soft);border-radius:14px;padding:12px 14px;display:flex;flex-direction:column;gap:5px">
                  <span style="font-size:10.5px;letter-spacing:.1em;font-weight:700;color:var(--cat)">쉽게 말하면</span>
                  <p style="margin:0;font-size:13.5px;line-height:1.85;color:var(--ink-70)">${esc(t.plain)}</p>
                </div>` : ""}
                ${(t.terms && t.terms.length) ? `
                <div style="display:flex;flex-direction:column;gap:5px;margin-top:3px;padding-top:9px;border-top:1px dotted var(--color-divider)">
                  <span style="font-size:10.5px;letter-spacing:.1em;font-weight:700;color:var(--ink-40)">용어 풀이</span>
                  ${t.terms.map(x => `
                    <span style="font-size:12.5px;line-height:1.75;color:var(--ink-55)"><b style="font-family:var(--serif);font-weight:700;color:var(--cat)">${esc(x.term)}</b> — ${esc(x.meaning)}</span>`).join("")}
                </div>` : ""}
              </div>
            </div>
          </div>`;
        }).join("")}
      </div>
      <p style="margin:0;font-size:11.5px;line-height:1.65;color:var(--ink-40)">각 답변은 해당 신학자의 사상에 근거해 재구성한 것이며, 실제 저작의 직접 인용이 아닙니다. 초상은 인물의 특징을 단순화한 일러스트입니다.</p>
    </section>`;

  let conclBody;
  if (!isDoctrine) {
    conclBody = `
      <div style="background:var(--color-surface);border:1px solid var(--color-divider);border-left:4px solid var(--cat);box-shadow:var(--shadow-soft);border-radius:24px;padding:24px 26px;display:flex;flex-direction:column;gap:12px">
        ${d.unified.map(p => `<p style="margin:0;font-size:15px;line-height:1.95">${esc(p)}</p>`).join("")}
      </div>`;
  } else {
    conclBody = `
      <div style="display:flex;flex-direction:column;gap:13px">
        <p style="margin:0;font-size:14px;color:var(--ink-55)">이 물음은 전통에 따라 답이 실제로 갈립니다. 하나로 봉합하는 대신, 누가 어디에 서 있는지 지도로 펼칩니다.</p>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px">
          ${d.positions.map(p => `
            <div style="background:var(--color-surface);border:1px solid var(--color-divider);border-top:3px solid var(--c-doc);border-radius:20px;padding:18px;display:flex;flex-direction:column;gap:9px;box-shadow:var(--shadow-soft)">
              <span style="font-size:10.5px;letter-spacing:.1em;font-weight:700;color:var(--c-doc)">${esc(p.label)}</span>
              <span style="font-family:var(--serif);font-weight:700;font-size:16px;line-height:1.4">${esc(p.claim)}</span>
              <span style="font-size:13px;color:var(--ink-55);line-height:1.75">${esc(p.detail)}</span>
              <span style="margin-top:auto;padding-top:9px;border-top:1px solid var(--color-divider);font-family:var(--serif);font-size:12.5px;color:var(--c-doc)">${esc(p.who)}</span>
            </div>`).join("")}
        </div>
        <div style="display:flex;flex-direction:column;gap:7px;background:var(--color-surface);border:1px solid var(--color-divider);border-radius:20px;padding:16px 20px">
          <span style="font-size:10.5px;letter-spacing:.1em;font-weight:700;color:var(--c-doc)">갈림의 축</span>
          ${d.axes.map(ax => `<span style="font-size:13.5px;line-height:1.8;color:var(--ink-70)">· ${esc(ax)}</span>`).join("")}
        </div>
        <p style="margin:0;font-size:12px;line-height:1.75;color:var(--ink-55);border-left:2px solid var(--color-divider);padding-left:12px">
          이 지도는 어느 교단이나 전통을 정통으로 단정하지 않습니다. 각 입장은 그 전통 안에서 오랜 성찰을 거친 것이며, 판단은 독자와 그가 속한 신앙 공동체의 몫으로 남겨 둡니다.
        </p>
      </div>`;
  }

  const conclusionSec = `
    <section style="animation:riseIn .45s .24s both;display:flex;flex-direction:column;gap:14px">
      <div style="display:flex;align-items:baseline;gap:9px">
        <span style="font-family:var(--serif);font-size:17px;color:var(--cat)">③</span>
        <h2 style="margin:0;font-family:var(--serif);font-weight:700;font-size:18px">${isDoctrine ? "쟁점 지도" : "복합적 결론"}</h2>
      </div>
      ${conclBody}
    </section>`;

  const versesSec = `
    <section style="animation:riseIn .45s .34s both;display:flex;flex-direction:column;gap:14px">
      <div style="display:flex;align-items:baseline;gap:9px">
        <span style="font-family:var(--serif);font-size:17px;color:var(--cat)">④</span>
        <h2 style="margin:0;font-family:var(--serif);font-weight:700;font-size:18px">참고 성경 구절</h2>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px">
        ${d.verses.map(v => `
          <div style="background:var(--color-surface);border:1px solid var(--color-divider);border-radius:20px;padding:18px 20px;display:flex;flex-direction:column;gap:9px;box-shadow:var(--shadow-soft)">
            <span style="font-family:var(--serif);font-weight:700;font-size:13px;color:var(--cat)">${esc(v.ref)}</span>
            <span style="font-family:var(--serif);font-size:15px;line-height:1.85">${esc(v.text)}</span>
            <span style="font-size:12.5px;line-height:1.75;color:var(--ink-55);border-top:1px solid var(--color-divider);padding-top:9px">${esc(v.note)}</span>
          </div>`).join("")}
      </div>
      ${isMock ? "" : `<p style="margin:0;font-size:11.5px;line-height:1.65;color:var(--ink-40)">구절 본문은 AI가 생성한 것입니다. 인용이 정확한지 실제 성경에서 확인해 주세요.</p>`}
    </section>`;

  const figuresTitle = isDoctrine ? "질문과 관련된 성경 인물" : "비슷한 고민을 했던 성경 속 인물";
  const figuresHint = isDoctrine ? "이 물음을 논할 때 성경이 실제로 거론하는 사람들입니다" : "성경 속에서도 같은 자리를 지나간 사람들이 있습니다";
  const figuresSec = `
    <section style="animation:riseIn .45s .44s both;display:flex;flex-direction:column;gap:14px">
      <div style="display:flex;align-items:baseline;gap:9px;flex-wrap:wrap">
        <span style="font-family:var(--serif);font-size:17px;color:var(--cat)">⑤</span>
        <h2 style="margin:0;font-family:var(--serif);font-weight:700;font-size:18px">${figuresTitle}</h2>
        <span style="font-size:11.5px;color:var(--ink-40)">${figuresHint}</span>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:12px">
        ${d.figures.map(f => `
          <div style="background:var(--color-surface);border:1px solid var(--color-divider);border-radius:22px;padding:18px 20px;display:flex;flex-direction:column;gap:11px;box-shadow:var(--shadow-soft)">
            <div style="display:flex;gap:12px;align-items:center">
              ${avatar(f.av || figureAvatar(f.name), 42, true)}
              <span style="display:flex;flex-direction:column;gap:2px;min-width:0">
                <span style="font-family:var(--serif);font-weight:700;font-size:16px;line-height:1.3">${esc(f.name)}</span>
                <span style="font-size:11px;color:var(--cat)">${esc(f.ref)}</span>
              </span>
            </div>
            <p style="margin:0;font-size:13.5px;line-height:1.85;color:var(--ink-70)">${esc(f.note)}</p>
          </div>`).join("")}
      </div>
      <p style="margin:0;font-size:11.5px;line-height:1.65;color:var(--ink-40)">초상은 인물의 특징을 단순화한 일러스트이며 실제 모습이 아닙니다.</p>
    </section>`;

  const stickyBar = `
    <div style="position:sticky;top:0;z-index:6;margin:-8px 0 -14px;padding:12px 0;background:var(--color-bg);border-bottom:1px solid var(--color-divider);display:flex;gap:10px;align-items:flex-start">
      <span style="flex:none;margin-top:2px;font-size:10.5px;font-family:var(--serif);font-weight:700;padding:3px 10px;border-radius:999px;background:var(--cat-tint);color:var(--cat)">${esc(meta.name)}</span>
      <span style="font-size:13.5px;line-height:1.6;color:var(--ink-70);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${esc(asked)}</span>
    </div>`;

  const reask = `
    <div style="display:flex;gap:10px;flex-wrap:wrap;animation:fadeIn .5s .45s both">
      <button id="reaskBtn" class="hover-soft" style="cursor:pointer;font-size:13px;color:var(--color-text);background:transparent;border:1px solid var(--color-divider);border-radius:999px;padding:9px 18px">질문 지우고 다시 묻기</button>
    </div>`;

  const mockNotice = isMock ? `
    <div style="animation:riseIn .45s both;background:var(--cat-soft);border:1px dashed var(--color-divider);border-radius:16px;padding:12px 16px;font-size:12.5px;line-height:1.7;color:var(--ink-55)">
      지금은 <b>예시 답변</b>을 보여드리고 있습니다. 질문 내용과 무관하게 미리 준비된 내용이며, AI 연결이 준비되면 질문마다 실제 답변이 생성됩니다.
    </div>` : "";

  $("results").innerHTML = `<div style="display:flex;flex-direction:column;gap:34px">${stickyBar}${mockNotice}${analysisSec}${panelSec}${conclusionSec}${versesSec}${figuresSec}${reask}</div>`;
  $("results").classList.remove("hidden");

  $("reaskBtn").addEventListener("click", resetAsk);
}

/* ---- 로딩 표시 ---- */
function showLoading(asked) {
  const meta = DATA[state.cat];
  const bar = `
    <div style="position:sticky;top:0;z-index:6;margin:-8px 0 -14px;padding:12px 0;background:var(--color-bg);border-bottom:1px solid var(--color-divider);display:flex;gap:10px;align-items:flex-start">
      <span style="flex:none;margin-top:2px;font-size:10.5px;font-family:var(--serif);font-weight:700;padding:3px 10px;border-radius:999px;background:var(--cat-tint);color:var(--cat)">${esc(meta.name)}</span>
      <span style="font-size:13.5px;line-height:1.6;color:var(--ink-70);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${esc(asked)}</span>
    </div>`;
  // 큐티는 고정 패널이 없습니다
  if (isQt()) {
    $("results").innerHTML = `
      <div style="display:flex;flex-direction:column;gap:34px">
        ${bar}
        <section style="animation:riseIn .45s both;background:var(--color-surface);border:1px solid var(--color-divider);border-radius:24px;padding:22px 24px;box-shadow:var(--shadow-soft);display:flex;flex-direction:column;gap:7px">
          <p style="margin:0;font-family:var(--serif);font-size:16px">${esc(asked)} 을(를) 살펴보고 있습니다</p>
          <p style="margin:0;font-size:12.5px;color:var(--ink-40)">본문의 문맥을 짚고, 질문에 필요한 신학자의 견해를 찾는 중입니다. 20초쯤 걸릴 수 있습니다.</p>
        </section>
      </div>`;
    $("results").classList.remove("hidden");
    return;
  }

  const rows = meta.panel.map((p, i) => `
    <div style="display:flex;align-items:center;gap:12px;padding:12px 0;border-top:${i ? "1px solid var(--color-divider)" : "0"}">
      ${avatar(p.av, 34, true)}
      <span style="font-family:var(--serif);font-size:14.5px;color:var(--ink-55)">${esc(p.name)}</span>
      <span class="dots" style="margin-left:auto;font-size:12px;color:var(--ink-40)">생각하는 중…</span>
    </div>`).join("");

  $("results").innerHTML = `
    <div style="display:flex;flex-direction:column;gap:34px">
      ${bar}
      <section style="animation:riseIn .45s both;background:var(--color-surface);border:1px solid var(--color-divider);border-radius:24px;padding:22px 24px;box-shadow:var(--shadow-soft);display:flex;flex-direction:column;gap:6px">
        <p style="margin:0 0 6px;font-family:var(--serif);font-size:16px">${meta.panel.length}명이 질문을 읽고 있습니다</p>
        <p style="margin:0 0 8px;font-size:12.5px;color:var(--ink-40)">답변이 모두 도착하기까지 20초쯤 걸릴 수 있습니다.</p>
        ${rows}
      </section>
    </div>`;
  $("results").classList.remove("hidden");
}

function showError(asked, message, hint, retryAfter) {
  const isDaily = retryAfter === "day";
  $("results").innerHTML = `
    <div style="animation:riseIn .45s both;background:var(--color-surface);border:1px solid var(--color-divider);border-left:4px solid var(--c-life);border-radius:24px;padding:22px 24px;box-shadow:var(--shadow-soft);display:flex;flex-direction:column;gap:10px">
      <p style="margin:0;font-family:var(--serif);font-weight:700;font-size:16px">답변을 가져오지 못했습니다</p>
      <p style="margin:0;font-size:14px;line-height:1.8;color:var(--ink-70)">${esc(message)}</p>
      ${hint ? `<p style="margin:0;font-size:12.5px;line-height:1.75;color:var(--ink-55)">${esc(hint)}</p>` : ""}
      ${isDaily ? "" : `<button id="retryBtn" class="hover-soft" style="align-self:flex-start;margin-top:4px;cursor:pointer;font-size:13px;color:var(--color-text);background:transparent;border:1px solid var(--color-divider);border-radius:999px;padding:9px 18px">다시 시도</button>`}
    </div>`;
  $("results").classList.remove("hidden");

  const btn = $("retryBtn");
  if (!btn) return;

  // 대기 시간이 안내된 경우, 그 시간 동안 버튼을 잠가 한도를 더 소모하지 않게 합니다.
  let left = typeof retryAfter === "number" ? retryAfter : 0;
  if (left > 0) {
    btn.disabled = true;
    btn.style.opacity = ".5";
    const tick = () => {
      btn.textContent = left > 0 ? `다시 시도 (${left}초)` : "다시 시도";
      if (left-- <= 0) { clearInterval(timer); btn.disabled = false; btn.style.opacity = ""; }
    };
    tick();
    var timer = setInterval(tick, 1000);
  }
  btn.addEventListener("click", () => { if (!btn.disabled) submit(); });
}

/* ---- 동작 ---- */
function resetAsk() {
  state.submitted = false;
  $("draft").value = "";
  $("results").classList.add("hidden");
  $("results").innerHTML = "";
  (isQt() ? $("book") : $("draft")).focus();
}

async function submit() {
  const meta = DATA[state.cat];
  const qt = isQt();
  let payload, asked;

  if (qt) {
    // 비어 있으면 예시로 채워 보여 줍니다
    if (!$("book").value.trim() || !$("chapter").value.trim()) {
      const ex = meta.example;
      $("book").value = ex.book; $("chapter").value = ex.chapter;
      $("vFrom").value = ex.verseFrom; $("vTo").value = ex.verseTo;
      if (!$("draft").value.trim()) $("draft").value = ex.question;
      updateRefPreview();
    }
    const question = ($("draft").value || "").trim() || meta.example.question;
    $("draft").value = question;
    asked = qtRef();
    payload = {
      category: "qt", book: $("book").value.trim(), chapter: $("chapter").value.trim(),
      verseFrom: $("vFrom").value.trim(), verseTo: $("vTo").value.trim(), question
    };
  } else {
    asked = ($("draft").value || "").trim() || meta.example;
    $("draft").value = asked;
    payload = { category: state.cat, question: asked };
  }

  state.submitted = true;
  showLoading(asked);
  $("results").scrollIntoView({ behavior: "smooth", block: "start" });
  $("submitBtn").disabled = true;
  $("submitBtn").style.opacity = ".5";

  const fallback = () => qt ? renderQt(asked, meta, true) : renderResults(asked, meta, true);

  try {
    const res = await fetch("/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const info = await res.json().catch(() => ({}));
      // API 키 미설정 등 서버 준비 전이면 예시 답변으로 대체해 화면을 유지합니다.
      if (res.status === 503) { fallback(); return; }
      const wait = info.quotaKind === "day" ? "day" : (info.retryAfter || 0);
      const hint = res.status === 429
        ? "이 서비스는 Google Gemini의 무료 등급을 사용합니다. 짧은 시간에 여러 번 요청하면 일시적으로 제한될 수 있습니다."
        : (info.hint || info.detail);
      showError(asked, info.error || `서버 오류 (${res.status})`, hint, wait);
      return;
    }

    const data = await res.json();
    qt ? renderQt(asked, data, false) : renderResults(asked, data, false);
  } catch (err) {
    // 로컬에서 파일로 직접 열었거나 네트워크가 끊긴 경우 → 예시 답변으로 대체
    fallback();
  } finally {
    $("submitBtn").disabled = false;
    $("submitBtn").style.opacity = "";
  }
}

function pick(k) {
  state.cat = k;
  state.submitted = false;
  $("draft").value = "";
  $("results").classList.add("hidden");
  $("results").innerHTML = "";
  applyCat();
}

/* 큐티 예시 채우기 */
function fillQtExample() {
  const ex = DATA.qt.example;
  $("book").value = ex.book; $("chapter").value = ex.chapter;
  $("vFrom").value = ex.verseFrom; $("vTo").value = ex.verseTo;
  $("draft").value = ex.question;
  updateRefPreview();
  $("draft").focus();
}

function applyTheme() {
  root.classList.toggle("dark", state.dark);
  $("themeBtn").textContent = state.dark ? "밝게 보기" : "어둡게 보기";
  $("themeBtn").setAttribute("aria-pressed", String(state.dark));
}

/* ---- 이벤트 바인딩 ---- */
$("pills").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-k]");
  if (btn) pick(btn.dataset.k);
});
$("submitBtn").addEventListener("click", submit);
$("draft").addEventListener("keydown", (e) => {
  if (e.key !== "Enter") return;
  // 큐티는 여러 줄로 적을 수 있도록 Ctrl/⌘+Enter 로 보냅니다
  if (isQt()) { if (e.ctrlKey || e.metaKey) { e.preventDefault(); submit(); } return; }
  if (!e.shiftKey) { e.preventDefault(); submit(); }
});
$("exampleChip").addEventListener("click", () => {
  if (isQt()) { fillQtExample(); return; }
  $("draft").value = DATA[state.cat].example;
  $("draft").focus();
});
["book", "chapter", "vFrom", "vTo"].forEach(id => $(id).addEventListener("input", updateRefPreview));
["chapter", "vFrom", "vTo"].forEach(id => $(id).addEventListener("keydown", (e) => {
  if (e.key === "Enter") { e.preventDefault(); submit(); }
}));
$("books").innerHTML = BIBLE_BOOKS.map(b => `<option value="${b}"></option>`).join("");
$("themeBtn").addEventListener("click", () => {
  state.dark = !state.dark;
  try { localStorage.setItem(THEME_KEY, state.dark ? "dark" : "light"); } catch (e) {}
  applyTheme();
});

/* ---- 초기화 ---- */
applyTheme();
applyCat();
