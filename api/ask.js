/*
 * 신학 문답 — 질문 처리 서버리스 함수 (Vercel)
 *
 * 브라우저 → POST /api/ask { category, question }
 *          ← { analysis, tags, panel[], unified[] | positions[]+axes[], verses[], figures[] }
 *
 * API 키(GEMINI_API_KEY)는 Vercel 환경변수에서만 읽습니다.
 * 절대 프론트엔드로 내려보내지 않습니다.
 */

"use strict";

const MODEL = "gemini-3.6-flash";
const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/interactions";

/* ---- 갈래별 신학자 패널 (순서 고정 — 프론트엔드가 이 순서로 초상을 매칭합니다) ---- */
const PANELS = {
  worry: {
    name: "고민",
    focus: "신앙과 삶의 의미에 대한 깊은 물음",
    members: [
      { name: "아우구스티누스", note: "고대 라틴 교부. 욕망·사랑의 질서·은혜·내면의 불안." },
      { name: "토마스 아퀴나스", note: "스콜라 신학. 이성과 신앙, 궁극 목적, 자연법, 덕." },
      { name: "장 칼뱅", note: "개혁파. 하나님의 주권과 섭리, 성경, 소명." },
      { name: "쇠렌 키르케고르", note: "실존적 신앙. 절망, 불안, 자기기만, 신앙의 도약." },
      { name: "디트리히 본회퍼", note: "고백교회·옥중 신학. 제자도, 책임, 타자를 향한 존재." }
    ]
  },
  life: {
    name: "삶",
    focus: "상처 · 관계 · 죄책감을 상담하듯 듣고 답함",
    members: [
      { name: "아우구스티누스", note: "고대 라틴 교부. 무질서한 사랑, 인정욕구, 마음의 방향." },
      { name: "마르틴 루터", note: "루터파 종교개혁. 이신칭의, 죄책감, 율법과 복음, 확신." },
      { name: "C. S. 루이스", note: "성공회·변증. 쉬운 비유로 설명, 고통·갈망·겸손." },
      { name: "디트리히 본회퍼", note: "공동체와 책임. 함께 있음과 홀로 있음, 정직한 약함." },
      { name: "헨리 나우웬", note: "가톨릭 영성·목회 상담. 사랑받는 존재, 외로움, 상처." }
    ]
  },
  doctrine: {
    name: "교리",
    focus: "전통마다 갈리는 답을 나란히 비교",
    members: [
      { name: "다마스쿠스의 요한", note: "동방 정교. 신화(神化), 성상, 성찬의 신비, 협력." },
      { name: "토마스 아퀴나스", note: "가톨릭·스콜라. 은총과 자유의지, 성례, 전통과 성경." },
      { name: "마르틴 루터", note: "루터파. 이신칭의, 율법과 복음, 세례의 약속, 확신." },
      { name: "장 칼뱅", note: "개혁파. 예정, 섭리, 성도의 견인, 성경의 권위." },
      { name: "존 웨슬리", note: "감리교·웨슬리안. 선행은총, 저항 가능성, 성화." }
    ]
  }
};

/* ---- 응답 스키마 (구조화 출력) ---- */
function buildSchema(isDoctrine) {
  const base = {
    type: "object",
    properties: {
      analysis: { type: "string", description: "질문이 실제로 무엇을 묻는지, 어떤 신학적 쟁점이 걸려 있는지 3~5문장으로 정리" },
      tags: { type: "array", items: { type: "string" }, description: "핵심 쟁점 키워드 4~5개" },
      panel: {
        type: "array",
        description: "제시된 신학자 5명의 답변. 반드시 제시된 순서와 이름 그대로, 정확히 5개.",
        items: {
          type: "object",
          properties: {
            name: { type: "string", description: "제시된 신학자 이름 그대로" },
            summary: { type: "string", description: "그 신학자의 답을 한 문장으로 압축한 요지" },
            body: { type: "string", description: "그 신학자의 관점에서 3~5문장으로 답변" },
            plain: { type: "string", description: "위 답변을 신학 용어 없이 일상 언어로 풀어 쓴 해설. 2~3문장." },
            terms: {
              type: "array",
              description: "위 답변에 나온 어려운 신학 용어와 뜻풀이. 없으면 빈 배열.",
              items: {
                type: "object",
                properties: {
                  term: { type: "string", description: "용어" },
                  meaning: { type: "string", description: "그 용어의 뜻을 한 문장으로 쉽게" }
                },
                required: ["term", "meaning"]
              }
            }
          },
          required: ["name", "summary", "body", "plain", "terms"]
        }
      },
      verses: {
        type: "array",
        description: "참고 성경 구절 3개",
        items: {
          type: "object",
          properties: {
            ref: { type: "string", description: "책 장:절 (예: 로마서 8:28)" },
            text: { type: "string", description: "구절 본문. 확실히 아는 구절만 인용할 것." },
            note: { type: "string", description: "이 질문과 어떻게 연결되는지 한 문장" }
          },
          required: ["ref", "text", "note"]
        }
      },
      figures: {
        type: "array",
        description: "성경 속 인물 3명",
        items: {
          type: "object",
          properties: {
            name: { type: "string", description: "인물 이름" },
            ref: { type: "string", description: "해당 성경 본문 (예: 열왕기상 19장)" },
            note: { type: "string", description: "왜 이 인물인지 2~3문장 설명" }
          },
          required: ["name", "ref", "note"]
        }
      }
    },
    required: ["analysis", "tags", "panel", "verses", "figures"]
  };

  if (isDoctrine) {
    base.properties.positions = {
      type: "array",
      description: "교리적 입장 2~3개. 서로 양립하지 않는 답을 각각 별개로 제시할 것.",
      items: {
        type: "object",
        properties: {
          label: { type: "string", description: "입장 A / 입장 B / 입장 C" },
          claim: { type: "string", description: "그 입장의 주장을 한 문장으로" },
          detail: { type: "string", description: "그렇게 보는 이유 2~3문장" },
          who: { type: "string", description: "이 입장에 서는 신학자와 전통" }
        },
        required: ["label", "claim", "detail", "who"]
      }
    };
    base.properties.axes = {
      type: "array",
      items: { type: "string" },
      description: "입장이 갈리는 근본 쟁점 3~4개. 각 항목은 한 문장."
    };
    base.required.push("positions", "axes");
  } else {
    base.properties.unified = {
      type: "array",
      items: { type: "string" },
      description: "답변들을 종합한 결론. 문단 3개."
    };
    base.required.push("unified");
  }

  return base;
}

/* ---- 프롬프트 ---- */
function buildPrompt(cat, question) {
  const panel = PANELS[cat];
  const isDoctrine = cat === "doctrine";
  const roster = panel.members.map((m, i) => `${i + 1}. ${m.name} — ${m.note}`).join("\n");

  const conclusionRule = isDoctrine
    ? `[결론 — 매우 중요]
이 갈래에서는 절대로 하나의 통합된 결론을 내리지 마십시오.
전통마다 답이 실제로 갈리는 물음이므로, positions에 서로 양립하지 않는 입장을 각각 별개로 세우고,
axes에는 그 입장들이 갈라지는 근본 쟁점을 적으십시오.
어느 교단이나 전통도 정통으로 단정하지 마십시오. 판단은 독자의 몫으로 남겨 두십시오.
"모두 각자의 정답"이라는 식으로 얼버무리지도 마십시오 — 무엇이 어떻게 다른지 분명히 하되, 심판하지 마십시오.`
    : `[결론]
unified에 세 문단으로 종합하십시오.
첫 문단: 다섯 사람이 공통으로 보는 지점.
둘째 문단: 그들이 서로 다르게 가리키는 출구.
셋째 문단: 질문자가 오늘 실제로 붙들 수 있는 것.`;

  const figureRule = isDoctrine
    ? `[성경 인물]
이 교리 논쟁에서 실제로 거론되는 인물을 고르십시오.
각 인물이 어느 입장의 근거로 인용되는지 설명하되, 어느 쪽이 옳다고 단정하지 마십시오.`
    : `[성경 인물]
질문자와 비슷한 고민·상황을 지나간 인물을 고르십시오.
그 사람이 무엇을 겪었고 어떻게 다루어졌는지 설명하십시오.`;

  return `당신은 기독교 신학 Q&A 서비스의 응답 생성기입니다. 아래 규칙을 지켜 한국어로 답하십시오.

[질문 갈래] ${panel.name} — ${panel.focus}

[답변할 신학자 5명 — 이 순서와 이름 그대로, 정확히 5명]
${roster}

[사용자 질문]
${question}

[신학자별 답변 규칙]
- 각 신학자가 자기 사상에 근거해 직접 말하듯 답하되, 실제 저작을 인용하는 것처럼 꾸며내지 마십시오.
- 다섯 답변이 서로 뚜렷이 달라야 합니다. 비슷한 말을 다르게 표현한 것에 그치면 실패입니다.
- 그 신학자가 실제로 주장한 내용과, 후대 교단이 그를 해석한 방식을 혼동하지 마십시오.
- 역사적 신학자를 현대 교파의 입장과 동일시하지 마십시오.
- 존댓말로, 질문자에게 직접 말하듯 쓰십시오.

[쉬운 해설 규칙 — 중요]
신학을 처음 접하는 사람도 읽을 수 있어야 합니다. 신학자별로 다음 두 가지를 반드시 채우십시오.

1) plain — "쉽게 말하면"에 해당하는 해설
   - 신학 용어를 쓰지 말고, 일상에서 쓰는 말로 2~3문장.
   - body를 짧게 줄인 요약이 아니라, 어려운 개념을 풀어서 다시 설명한 것이어야 합니다.
   - 중학생이 읽어도 무슨 말인지 알 수 있어야 합니다.
   - 화면에 이미 "쉽게 말하면"이라는 제목이 붙습니다. 그러므로 "쉽게 말해", "쉽게 말하면",
     "한마디로" 같은 서두를 쓰지 말고 곧바로 설명을 시작하십시오.

2) terms — 용어 뜻풀이 (0~3개)
   - body에 실제로 등장한 말 중, 설명 없이는 이해하기 어려운 것만 고르십시오.
   - 예: 칭의, 선행은총, 신화(神化), 성도의 견인, 대죄, 이신칭의, 섭리, 코람 데오.
   - 일반 신자에게 익숙한 말(믿음, 은혜, 기도, 회개, 사랑 등)은 넣지 마십시오.
   - body에 어려운 용어가 없으면 빈 배열로 두십시오. 억지로 채우지 마십시오.
   - 뜻풀이도 신학 용어로 설명하지 말고 쉬운 말로 한 문장.

${conclusionRule}

[성경 구절 규칙 — 매우 중요]
- 확실히 아는 구절만 인용하십시오. 기억이 불확실하면 그 구절을 넣지 말고 다른 구절을 고르십시오.
- 존재하지 않는 구절이나 장절을 절대 만들어내지 마십시오.
- 문맥을 무시하고 구절을 따오지(프루프텍스팅) 마십시오.

${figureRule}

[안전]
질문에 자해·자살·학대 등 위기 신호가 보이면, 신학적 논의보다 먼저
전문 상담과 도움을 구하도록 분명히 안내하는 내용을 analysis에 포함하십시오.

[금지]
- 특정 교단을 정통으로 전제하지 마십시오.
- 서로 양립할 수 없는 교리를 "둘 다 맞다"로 봉합하지 마십시오.
- 질문자를 훈계하거나 판단하지 마십시오.`;
}

/* ---- Gemini 호출 ---- */
async function callGemini(apiKey, prompt, schema) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "x-goog-api-key": apiKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: MODEL,
      input: prompt,
      response_format: {
        type: "text",
        mime_type: "application/json",
        schema: schema
      }
    })
  });

  const raw = await res.text();

  if (!res.ok) {
    const err = new Error(`Gemini API ${res.status}`);
    err.status = res.status;
    err.detail = raw.slice(0, 500);
    throw err;
  }

  let payload;
  try {
    payload = JSON.parse(raw);
  } catch (e) {
    throw new Error("Gemini 응답을 JSON으로 읽지 못했습니다.");
  }

  // 구조화 출력은 output_text에 담깁니다. 형식이 바뀔 경우를 대비해 steps도 탐색합니다.
  let text = payload.output_text;
  if (!text && Array.isArray(payload.steps)) {
    for (const step of payload.steps) {
      for (const block of step.content || []) {
        if (block && typeof block.text === "string") { text = block.text; break; }
      }
      if (text) break;
    }
  }
  if (!text) throw new Error("Gemini 응답에서 본문을 찾지 못했습니다.");

  try {
    return JSON.parse(text);
  } catch (e) {
    throw new Error("생성된 답변이 올바른 JSON 형식이 아닙니다.");
  }
}

/* ---- 핸들러 ---- */
module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "POST 요청만 받습니다." });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(503).json({
      error: "서버에 API 키가 설정되지 않았습니다.",
      hint: "Vercel 프로젝트 설정 → Environment Variables 에 GEMINI_API_KEY 를 추가해 주세요."
    });
    return;
  }

  const body = typeof req.body === "string" ? safeParse(req.body) : (req.body || {});
  const category = body.category;
  const question = (body.question || "").trim();

  if (!PANELS[category]) {
    res.status(400).json({ error: "알 수 없는 갈래입니다." });
    return;
  }
  if (!question) {
    res.status(400).json({ error: "질문이 비어 있습니다." });
    return;
  }
  if (question.length > 1000) {
    res.status(400).json({ error: "질문이 너무 깁니다. 1000자 이내로 적어 주세요." });
    return;
  }

  try {
    const isDoctrine = category === "doctrine";
    const data = await callGemini(apiKey, buildPrompt(category, question), buildSchema(isDoctrine));

    // 신학자 순서·인원 검증 (프론트엔드가 순서로 초상을 매칭하므로 중요)
    const expected = PANELS[category].members;
    if (!Array.isArray(data.panel) || data.panel.length !== expected.length) {
      throw new Error("신학자 답변 수가 맞지 않습니다.");
    }
    data.panel = data.panel.map((p, i) => ({ ...p, name: expected[i].name }));

    res.status(200).json(data);
  } catch (err) {
    const status = err.status === 429 ? 429 : 502;
    res.status(status).json({
      error: status === 429
        ? "무료 사용량 한도에 도달했습니다. 잠시 후 다시 시도해 주세요."
        : "답변을 생성하지 못했습니다.",
      detail: err.message
    });
  }
};

function safeParse(s) {
  try { return JSON.parse(s); } catch (e) { return {}; }
}
