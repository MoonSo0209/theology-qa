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
const state = { cat: "worry", submitted: false, dark: storedTheme() ? storedTheme() === "dark" : true };

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

/* ---- 갈래 반영 ---- */
function applyCat() {
  const [c, t, s] = CATVARS[state.cat];
  root.style.setProperty("--cat", c);
  root.style.setProperty("--cat-tint", t);
  root.style.setProperty("--cat-soft", s);

  const d = DATA[state.cat];

  // 좌측 신학자 명단
  $("roster").innerHTML = d.panel.map(r => `
    <div style="display:flex;align-items:center;gap:10px">
      ${avatar(r.av, 30, false)}
      <span style="display:flex;flex-direction:column;min-width:0">
        <span style="font-family:var(--serif);font-size:13.5px;line-height:1.4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(r.name)}</span>
        <span style="font-size:10.5px;color:var(--ink-40)">${esc(r.years)}</span>
      </span>
    </div>`).join("");

  // 갈래 pill
  $("pills").innerHTML = ORDER.map(k => {
    const dd = DATA[k], on = k === state.cat, pc = CATVARS[k][0], pt = CATVARS[k][1];
    return `<button class="pill-cat" data-k="${k}" aria-pressed="${on}" style="--pc:${pc};cursor:pointer;text-align:left;color:var(--color-text);background:${on ? pt : "var(--color-surface)"};border:1px solid ${on ? pc : "var(--color-divider)"};border-radius:999px;padding:8px 16px 8px 13px;display:flex;gap:9px;align-items:center">
      <span style="flex:none;width:8px;height:8px;border-radius:50%;background:${pc};opacity:${on ? 1 : .3}"></span>
      <span style="font-family:var(--serif);font-weight:700;font-size:15px;line-height:1.2">${esc(dd.name)}</span>
      <span style="font-size:11.5px;line-height:1.4;color:var(--ink-55);opacity:${on ? 1 : .6}">${esc(dd.desc)}</span>
    </button>`;
  }).join("");

  // 질문 박스 라벨 · 예시 칩
  $("qCatName").textContent = d.name;
  $("exampleChip").textContent = d.example;
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

  $("reaskBtn").addEventListener("click", () => {
    state.submitted = false;
    $("draft").value = "";
    $("results").classList.add("hidden");
    $("results").innerHTML = "";
    $("draft").focus();
  });
}

/* ---- 로딩 표시 ---- */
function showLoading(asked) {
  const meta = DATA[state.cat];
  const bar = `
    <div style="position:sticky;top:0;z-index:6;margin:-8px 0 -14px;padding:12px 0;background:var(--color-bg);border-bottom:1px solid var(--color-divider);display:flex;gap:10px;align-items:flex-start">
      <span style="flex:none;margin-top:2px;font-size:10.5px;font-family:var(--serif);font-weight:700;padding:3px 10px;border-radius:999px;background:var(--cat-tint);color:var(--cat)">${esc(meta.name)}</span>
      <span style="font-size:13.5px;line-height:1.6;color:var(--ink-70);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${esc(asked)}</span>
    </div>`;
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
        <p style="margin:0 0 6px;font-family:var(--serif);font-size:16px">다섯 사람이 질문을 읽고 있습니다</p>
        <p style="margin:0 0 8px;font-size:12.5px;color:var(--ink-40)">답변이 모두 도착하기까지 20초쯤 걸릴 수 있습니다.</p>
        ${rows}
      </section>
    </div>`;
  $("results").classList.remove("hidden");
}

function showError(asked, message, hint) {
  $("results").innerHTML = `
    <div style="animation:riseIn .45s both;background:var(--color-surface);border:1px solid var(--color-divider);border-left:4px solid var(--c-life);border-radius:24px;padding:22px 24px;box-shadow:var(--shadow-soft);display:flex;flex-direction:column;gap:10px">
      <p style="margin:0;font-family:var(--serif);font-weight:700;font-size:16px">답변을 가져오지 못했습니다</p>
      <p style="margin:0;font-size:14px;line-height:1.8;color:var(--ink-70)">${esc(message)}</p>
      ${hint ? `<p style="margin:0;font-size:12.5px;line-height:1.75;color:var(--ink-55)">${esc(hint)}</p>` : ""}
      <button id="retryBtn" class="hover-soft" style="align-self:flex-start;margin-top:4px;cursor:pointer;font-size:13px;color:var(--color-text);background:transparent;border:1px solid var(--color-divider);border-radius:999px;padding:9px 18px">다시 시도</button>
    </div>`;
  $("results").classList.remove("hidden");
  $("retryBtn").addEventListener("click", () => submit());
}

/* ---- 동작 ---- */
async function submit() {
  const meta = DATA[state.cat];
  const text = ($("draft").value || "").trim() || meta.example;
  $("draft").value = text;
  state.submitted = true;

  showLoading(text);
  $("results").scrollIntoView({ behavior: "smooth", block: "start" });

  $("submitBtn").disabled = true;
  $("submitBtn").style.opacity = ".5";

  try {
    const res = await fetch("/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category: state.cat, question: text })
    });

    if (!res.ok) {
      const info = await res.json().catch(() => ({}));
      // API 키 미설정 등 서버 준비 전이면 예시 답변으로 대체해 화면을 유지합니다.
      if (res.status === 503) {
        renderResults(text, meta, true);
        return;
      }
      showError(text, info.error || `서버 오류 (${res.status})`, info.hint || info.detail);
      return;
    }

    renderResults(text, await res.json(), false);
  } catch (err) {
    // 로컬에서 파일로 직접 열었거나 네트워크가 끊긴 경우 → 예시 답변으로 대체
    renderResults(text, meta, true);
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
  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); }
});
$("exampleChip").addEventListener("click", () => {
  $("draft").value = DATA[state.cat].example;
  $("draft").focus();
});
$("themeBtn").addEventListener("click", () => {
  state.dark = !state.dark;
  try { localStorage.setItem(THEME_KEY, state.dark ? "dark" : "light"); } catch (e) {}
  applyTheme();
});

/* ---- 초기화 ---- */
applyTheme();
applyCat();
