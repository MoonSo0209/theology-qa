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

/* 무료 등급 한도가 모델마다 크게 다릅니다 (2026-08 기준).
 *   gemini-3.6-flash        RPM 5  / RPD 20   — 품질 우선
 *   gemini-3.5-flash-lite   RPM 15 / RPD 500  — 물량 확보
 * 먼저 품질 좋은 모델로 시도하고, 한도(429)에 걸리면 Lite로 자동 전환합니다.
 * 그래야 하루 20회가 넘어가도 오류 대신 계속 답변이 나옵니다. */
const MODEL_PRIMARY = "gemini-3.6-flash";
const MODEL_FALLBACK = "gemini-3.5-flash-lite";
const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/interactions";

/* ---- 갈래별 신학자 패널 (순서 고정 — 프론트엔드가 이 순서로 초상을 매칭합니다) ---- */
const PANELS = {
  worry: {
    name: "고민",
    focus: "신앙과 삶의 의미에 대한 깊은 물음",
    members: [
      { name: "아우구스티누스", note: "고대 라틴 교부(354–430). 마음의 움직임과 사랑의 방향을 파고들어, 겉으로 드러난 문제 아래에 있는 갈망을 짚어 냅니다." },
      { name: "토마스 아퀴나스", note: "스콜라 신학(1225–1274). 개념을 구분하고 이성으로 차근차근 논증하며, 인간이 무엇을 향해 지어졌는가에서 출발합니다." },
      { name: "장 칼뱅", note: "개혁파(1509–1564). 성경 본문에 근거해 체계적으로 말하며, 하나님의 주권과 오늘 맡겨진 자리를 함께 짚습니다." },
      { name: "쇠렌 키르케고르", note: "실존적 신앙 사상(1813–1855). 값싼 위로를 거부하고 정직한 직면을 택하며, 설명보다 결단을 요구합니다." },
      { name: "디트리히 본회퍼", note: "고백교회·옥중 신학(1906–1945). 관념에 머물지 않고, 지금 눈앞의 사람을 향한 구체적 책임으로 말을 옮깁니다." }
    ]
  },
  life: {
    name: "삶",
    focus: "상처 · 관계 · 죄책감을 상담하듯 듣고 답함",
    members: [
      { name: "아우구스티누스", note: "고대 라틴 교부(354–430). 마음이 무엇에 매여 있는지를 짚고, 사랑의 순서를 다시 세우도록 이끕니다." },
      { name: "마르틴 루터", note: "루터파 종교개혁(1483–1546). 목회적이고 직설적입니다. 자기 노력의 굴레에서 꺼내어 하나님의 약속 쪽으로 돌려놓습니다." },
      { name: "C. S. 루이스", note: "성공회·변증가(1898–1963). 일상의 비유로 어려운 것을 누구나 알아듣게 풀어 설명합니다." },
      { name: "디트리히 본회퍼", note: "고백교회·옥중 신학(1906–1945). 혼자 버티는 대신 공동체 안에서 정직해지는 길을 말합니다." },
      { name: "헨리 나우웬", note: "가톨릭 영성·목회 상담(1932–1996). 판단하지 않고 먼저 듣습니다. 상처를 곧바로 죄나 믿음 부족으로 몰지 않습니다." }
    ]
  },
  doctrine: {
    name: "교리",
    focus: "전통마다 갈리는 답을 나란히 비교",
    members: [
      { name: "아우구스티누스", note: "고대 라틴 교부(354–430). 종교개혁과 동서 분열 이전, 서방 고대 교회가 이 물음을 어떻게 보았는지 기준선을 제시합니다. 뒤의 서방 신학자들이 모두 그를 근거로 삼되 서로 다르게 해석했음을 염두에 두십시오. 다만 그를 '초대교회 전체의 입장'으로 말하지는 마십시오 — 동방이 그와 갈라지는 지점이 있습니다." },
      { name: "다마스쿠스의 요한", note: "동방 정교 교부(약 675–749). 동방 교회의 시각에서 답하며, 아우구스티누스나 서방 전통과 갈라지는 지점이 있으면 분명히 드러냅니다." },
      { name: "토마스 아퀴나스", note: "로마 가톨릭·스콜라 신학(1225–1274). 이성과 계시를 함께 사용해 구분하고 정의하며, 교회의 전통과 성례적 질서를 전제로 답합니다." },
      { name: "마르틴 루터", note: "루터파 종교개혁(1483–1546). 목회적이고 직설적입니다. 정교한 체계보다 하나님의 약속과 흔들리는 양심의 위로를 앞세웁니다." },
      { name: "장 칼뱅", note: "개혁파(1509–1564). 성경 본문에 근거해 체계적으로 논증하며, 하나님의 주권을 출발점으로 삼습니다." },
      { name: "존 웨슬리", note: "감리교·웨슬리안(1703–1791). 하나님의 은혜가 인간의 실제 응답과 삶의 변화로 이어지는지를 중시합니다." }
    ]
  }
};

/* ---- 응답 스키마 (구조화 출력) ---- */
function buildSchema(isDoctrine, panelCount) {
  const base = {
    type: "object",
    properties: {
      analysis: { type: "string", description: "질문이 실제로 무엇을 묻는지, 어떤 신학적 쟁점이 걸려 있는지 3~5문장으로 정리" },
      tags: { type: "array", items: { type: "string" }, description: "핵심 쟁점 키워드 4~5개" },
      panel: {
        type: "array",
        description: `제시된 신학자 ${panelCount}명의 답변. 반드시 제시된 순서와 이름 그대로, 정확히 ${panelCount}개.`,
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

[답변할 신학자 ${panel.members.length}명 — 이 순서와 이름 그대로, 정확히 ${panel.members.length}명]
${roster}

[신학자별 답변 규칙]
- 각 신학자가 자기 사상에 근거해 직접 말하듯 답하되, 실제 저작을 인용하는 것처럼 꾸며내지 마십시오.
- 답변들이 서로 뚜렷이 달라야 합니다. 비슷한 말을 다르게 표현한 것에 그치면 실패입니다.
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
   - 아래는 '이 정도로 어려운 말'이라는 난이도 예시일 뿐, 다룰 주제를 뜻하지 않습니다:
     칭의 / 신화(神化) / 화체설 / 코람 데오 / 지복직관.
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
- 질문자를 훈계하거나 판단하지 마십시오.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[사용자 질문 — 오직 이 물음에만 답하십시오]

${question}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
위 물음이 실제로 묻는 것에 답하십시오.
앞의 규칙에 등장한 신학 용어나 예시는 답변 형식을 설명하기 위한 것일 뿐,
다룰 주제를 지정한 것이 아닙니다. 질문에 없는 주제로 옮겨가지 마십시오.
analysis는 위 물음을 다시 진술하는 것으로 시작하십시오.`;
}

/* ============================================================
 * 큐티(QT) 갈래 — 다른 갈래와 구조가 완전히 다릅니다.
 *  · 고정 패널 없음. 질문에 따라 1~3인의 견해를 AI가 선택.
 *  · 대한예수교장로회 합동 측이 표준으로 삼는 개혁주의 전통 기준.
 *  · 출처는 "실존 저작 안내"까지만. 직접 인용·쪽수는 금지(날조 방지).
 * ============================================================ */

const QT_SCHEMA = {
  type: "object",
  properties: {
    keyVerses: {
      type: "array",
      description: "지정된 본문 범위 안에서 사용자의 질문과 직접 맞닿은 구절 2~4개. 질문과 상관없는 구절은 넣지 마십시오.",
      items: {
        type: "object",
        properties: {
          ref: { type: "string", description: "장:절 형식으로 한 절씩 (예: 22:1). 반드시 사용자가 지정한 본문 범위 안에 있어야 합니다." },
          text: { type: "string", description: "그 한 절의 본문만. 확실히 아는 구절만 옮기고, 기억이 불확실하면 그 구절을 빼십시오." }
        },
        required: ["ref", "text"]
      }
    },
    passage: {
      type: "string",
      description: "이 본문이 놓인 문맥 개관. 저자·수신자·앞뒤 흐름 속 위치를 3~4문장으로."
    },
    views: {
      type: "array",
      description: "질문을 해석하는 데 필요한 신학자 견해 1~3개. 억지로 3개를 채우지 말고 실제로 필요한 만큼만.",
      items: {
        type: "object",
        properties: {
          theologian: { type: "string", description: "신학자 또는 저자 이름" },
          tradition: { type: "string", description: "그가 선 전통 (예: 한국 개혁주의, 종교개혁 개혁파, 청교도)" },
          view: { type: "string", description: "그의 관점에서 사용자의 질문에 직접 답하는 해석. 배경 설명이 아니라 답이어야 합니다. 4~6문장." },
          terms: {
            type: "array",
            description: "위 view에 나온 어려운 신학 용어와 뜻풀이. 없으면 빈 배열.",
            items: {
              type: "object",
              properties: {
                term: { type: "string", description: "view에 실제로 등장한 표기 그대로" },
                meaning: { type: "string", description: "그 용어의 뜻을 신학 용어 없이 한두 문장으로 쉽게" }
              },
              required: ["term", "meaning"]
            }
          },
          sources: {
            type: "array",
            description: "이 견해가 담긴 실존 저작. 확실하지 않으면 빈 배열로 두십시오.",
            items: {
              type: "object",
              properties: {
                work: { type: "string", description: "저작명. 실제로 존재하는 것만." },
                kind: { type: "string", description: "성경주석 / 조직신학 / 신앙고백 / 설교집 중 하나" },
                note: { type: "string", description: "이 저작에서 어느 부분을 찾아보면 되는지 한 문장 안내" }
              },
              required: ["work", "kind", "note"]
            }
          }
        },
        required: ["theologian", "tradition", "view", "terms", "sources"]
      }
    },
    reflection: {
      type: "array",
      items: { type: "string" },
      description: "묵상과 적용으로 넘어가도록 돕는 질문 2~3개. 설명이 아니라 질문 형태로."
    },
    caution: {
      type: "string",
      description: "이 본문을 해석할 때 흔히 빠지는 오해나 주의할 점. 없으면 빈 문자열."
    }
  },
  required: ["keyVerses", "passage", "views", "reflection", "caution"]
};

function buildQtPrompt(ref, question) {
  return `당신은 개인 큐티(경건의 시간)를 돕는 성경 연구 도우미입니다. 한국어로 답하십시오.
사용자는 지금 D형 큐티의 '연구와 묵상' 단계에 있습니다. 설교가 아니라 본문 이해를 돕는 것이 목적입니다.

[해석 기준 — 반드시 지킬 것]
대한민국 대한예수교장로회 합동 측이 표준으로 삼는 개혁주의 신학 전통에 서서 해석하십시오.
- 교리 표준: 웨스트민스터 신앙고백서와 대·소요리문답.
- 성경의 무오성과 성경이 성경을 해석한다는 원칙을 전제합니다.
- 이 전통 안에서도 해석이 갈리는 지점이 있으면 갈리는 대로 보여주되,
  전통 밖의 해석을 주된 답으로 세우지는 마십시오.
  (다른 전통을 언급해야 한다면 "이 전통 밖에서는 이렇게 본다"고 분명히 구분하십시오.)

[신학자 선정]
- 고정된 패널이 없습니다. 이 본문과 질문을 푸는 데 실제로 도움이 되는 사람만 고르십시오.
- 1명으로 충분하면 1명만, 견해가 갈리면 2~3명. 억지로 채우지 마십시오.
- 아래는 울타리가 아니라 우선순위 안내입니다. 본문에 더 적합한 사람이 있으면
  이 목록 밖에서 골라도 됩니다. 다만 합동 측 개혁주의 전통 안에 머무십시오.
  · 한국 개혁주의: 박윤선(주석), 박형룡(조직신학)
  · 종교개혁·개혁파: 존 칼빈, 헤르만 바빙크, 아브라함 카이퍼
  · 구 프린스턴: 찰스 하지, 벤저민 워필드, 게할더스 보스(성경신학)
  · 미국 개혁파: 루이스 벌코프, 존 머레이, 윌리엄 헨드릭슨(신약 주석)
  · 청교도: 매튜 헨리, 존 오웬, 토마스 왓슨
- 본문의 성격에 맞는 사람을 고르십시오. 예컨대 히브리서라면 존 오웬,
  구속사적 흐름을 묻는다면 게할더스 보스가 더 적합할 수 있습니다.

[출처 규칙 — 이 갈래에서 가장 중요합니다]
당신은 원문을 직접 확인할 수 없습니다. 그러므로:
- 실제로 존재하는 저작만 언급하십시오. 제목·저자를 지어내지 마십시오.
- 조금이라도 확실하지 않으면 그 저작을 빼고, sources를 빈 배열로 두십시오.
  출처가 없는 것이 가짜 출처보다 낫습니다.
- 쪽수를 쓰지 마십시오. 문장을 그대로 옮겼다고 표시하지 마십시오. 따옴표로 직접 인용하지 마십시오.
- sources는 "이 견해를 확인하려면 이 자료를 보십시오"라는 안내입니다. 인용이 아닙니다.
- note에는 그 저작에서 어느 대목을 찾아보면 되는지를 적으십시오 (예: "해당 본문 주석 부분").

[용어 각주 규칙]
견해(view)에 어려운 신학 용어가 나오면 terms에 뜻풀이를 다십시오.
- view에 실제로 등장한 표기 그대로 term에 적으십시오(화면에서 그 자리에 각주 번호가 붙습니다).
- 설명 없이는 이해하기 어려운 말만 고르십시오. 견해당 0~3개.
  난이도 예시: 예표 / 모형론 / 대속 / 구속사 / 연단 / 언약 / 칭의 / 유기(遺棄).
- 익숙한 말(믿음, 은혜, 순종, 시험, 기도 등)은 넣지 마십시오.
- 뜻풀이는 또 다른 신학 용어로 설명하지 말고 일상 언어로 쓰십시오.
- 어려운 용어가 없으면 빈 배열로 두십시오. 억지로 채우지 마십시오.
- 용어를 피하려고 견해를 뭉뚱그리지는 마십시오. 정확히 쓰고 각주로 풀어 주는 편이 낫습니다.

[맞닿은 구절(keyVerses) 규칙 — 중요]
사용자가 지정한 본문 범위 안에서, 질문과 직접 관련된 구절만 2~4개 고르십시오.
- 반드시 지정된 범위 안의 구절이어야 합니다. 범위 밖으로 나가지 마십시오.
- text에는 그 구절의 본문을 옮기되, **확실히 아는 구절만** 넣으십시오.
  한 글자라도 자신이 없으면 그 구절을 빼고 다른 구절을 고르십시오.
  기억이 흐린 채로 비슷하게 지어 쓰는 것이 가장 나쁩니다.
- 장절 번호를 지어내지 마십시오.
- **반드시 한 절씩 따로 항목을 만드십시오.** 1절과 2절이 모두 필요하면
  {ref:"22:1"}, {ref:"22:2"} 두 항목으로 내놓으십시오.
  여러 절을 한 항목에 묶어 넣지 마십시오 — 화면이 연속된 절을 자동으로 이어 붙이고
  그 자리에 절 번호를 표시하므로, 절 경계가 살아 있어야 합니다.
- text에는 그 한 절의 본문만 넣고, 절 번호를 문장 안에 쓰지 마십시오(화면이 붙입니다).
- 설명을 덧붙이지 마십시오. 이 항목은 구절 본문만 보여 주는 자리입니다.
  해석은 뒤의 신학자 견해에서 다룹니다.
- 절 단위로 세면 2~6절 정도가 적당합니다. 질문과 직접 관련된 것만 고르십시오.
- 본문 전체를 나열하지 마십시오. 질문과 직접 관련된 것만 고르는 것이 이 항목의 목적입니다.

[답변 방식]
- 이 갈래에는 별도의 '종합 답변' 항목이 없습니다.
- 사용자의 질문에 대한 답은 각 신학자의 view가 직접 담당합니다.
  view를 배경 설명으로 채우지 말고, 질문에 답하는 내용으로 쓰십시오.
- passage는 답이 아니라, 그 답을 이해하기 위한 문맥 배경입니다.

[문체]
- 존댓말. 신학 용어를 쓸 때는 곧바로 쉬운 말로 풀어 주십시오.
- 훈계하거나 정죄하지 마십시오. 묵상하는 사람을 돕는 자리입니다.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[묵상 본문]
${ref}

[사용자의 질문 — 오직 이 물음에만 답하십시오]
${question}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
keyVerses는 지정된 범위 안에서 위 질문과 직접 맞닿은 구절만 고르십시오.
passage는 위 본문의 문맥을 짚고, views는 위 질문에 직접 답하십시오.
질문에 없는 주제로 옮겨가지 마십시오.`;
}

/* 429 응답에서 '어느 한도에 걸렸는지 / 얼마나 기다려야 하는지'를 뽑아냅니다.
   Gemini는 QuotaFailure / RetryInfo 를 함께 돌려주는 경우가 많습니다. */
function describeQuota(raw) {
  const out = {};
  const s = String(raw || "");

  // 재시도 대기 시간 (예: "retryDelay":"32s")
  const delay = s.match(/"retryDelay"\s*:\s*"(\d+)(?:\.\d+)?s"/);
  if (delay) out.retryAfter = parseInt(delay[1], 10);

  // 어떤 한도인지 (분당 요청 / 하루 요청 / 분당 토큰)
  const idText = (s.match(/"quotaId"\s*:\s*"([^"]+)"/g) || []).join(" ") + " " + s;
  if (/PerDay|per_day|RequestsPerDay/i.test(idText)) out.quotaKind = "day";
  else if (/InputToken|TokensPerMinute|per_minute_input/i.test(idText)) out.quotaKind = "tokens";
  else if (/PerMinute|per_minute|RequestsPerMinute/i.test(idText)) out.quotaKind = "minute";

  return out;
}

function quotaMessage(err) {
  const wait = err.retryAfter
    ? `약 ${err.retryAfter}초 뒤에 다시 시도해 주세요.`
    : "잠시 후 다시 시도해 주세요.";
  switch (err.quotaKind) {
    case "day":
      return "오늘 사용할 수 있는 무료 한도를 모두 썼습니다. 한도는 매일 초기화되므로 내일 다시 이용해 주세요.";
    case "tokens":
      return `짧은 시간에 처리량이 몰렸습니다. ${wait}`;
    case "minute":
      return `짧은 시간에 요청이 몰렸습니다. ${wait}`;
    default:
      return `무료 사용량 한도에 도달했습니다. ${wait}`;
  }
}

/* ---- Gemini 호출 ---- */
/* 품질 모델 → (한도 초과 시) 경량 모델 순으로 시도합니다. */
async function callGeminiWithFallback(apiKey, prompt, schema) {
  try {
    return await callGemini(apiKey, prompt, schema, MODEL_PRIMARY);
  } catch (err) {
    if (err.status !== 429) throw err;
    try {
      return await callGemini(apiKey, prompt, schema, MODEL_FALLBACK);
    } catch (err2) {
      // 두 모델 모두 한도에 걸린 경우, 경량 모델 쪽 사유를 전달합니다.
      throw err2.status === 429 ? err2 : err;
    }
  }
}

async function callGemini(apiKey, prompt, schema, model) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "x-goog-api-key": apiKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: model,
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
    err.detail = raw.slice(0, 800);
    if (res.status === 429) Object.assign(err, describeQuota(raw));
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

  if (category !== "qt" && !PANELS[category]) {
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

  /* ---- 큐티 갈래 (고정 패널 없음, 구조가 다름) ---- */
  if (category === "qt") {
    const book = (body.book || "").trim();
    const chapter = String(body.chapter || "").trim();
    const vFrom = String(body.verseFrom || "").trim();
    const vTo = String(body.verseTo || "").trim();

    if (!book) { res.status(400).json({ error: "본문(성경 책 이름)을 적어 주세요." }); return; }
    if (!chapter) { res.status(400).json({ error: "장을 적어 주세요." }); return; }

    let ref = `${book} ${chapter}장`;
    if (vFrom) ref += vTo && vTo !== vFrom ? ` ${vFrom}~${vTo}절` : ` ${vFrom}절`;

    try {
      const data = await callGeminiWithFallback(apiKey, buildQtPrompt(ref, question), QT_SCHEMA);
      data.reference = ref;
      res.status(200).json(data);
    } catch (err) {
      const status = err.status === 429 ? 429 : 502;
      res.status(status).json({
        error: status === 429 ? quotaMessage(err) : "답변을 생성하지 못했습니다.",
        retryAfter: err.retryAfter || null,
        quotaKind: err.quotaKind || null,
        detail: status === 429 ? null : err.message
      });
    }
    return;
  }

  try {
    const isDoctrine = category === "doctrine";
    const panelCount = PANELS[category].members.length;
    const data = await callGeminiWithFallback(apiKey, buildPrompt(category, question), buildSchema(isDoctrine, panelCount));

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
