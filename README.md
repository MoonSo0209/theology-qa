# 신학 문답 (Theology Q&A)

고민 · 삶 · 교리 세 갈래 중 하나를 고르고 질문하면, 역사 속 신학자들이 각자의 관점으로 답하고
종합 결론(교리 갈래는 "쟁점 지도"), 참고 성경 구절, 그리고 비슷한 고민을 지나간 성경 인물까지
함께 보여 주는 웹 서비스입니다.

> **현재 단계: 정적 사이트 · 예시(mock) 답변**
> 답변은 갈래별로 미리 준비된 예시입니다. 실제 AI(Claude API) 연동은 다음 단계입니다.

## 구조

```
index.html          진입점 (SEO · 파비콘 · 폰트 + 화면 골격)
assets/
  styles.css        디자인 토큰 · 스타일 (라이트/다크)
  data.js           갈래별 콘텐츠 (신학자 · 성경 인물 · 구절) = 이후 API 응답 스키마
  app.js            상태 · 렌더 · 이벤트 (테마 저장 포함)
  favicon.svg
prototype/          초기 단일 파일 프로토타입 (참고용 보존)
```

## 로컬에서 보기

빌드 도구가 필요 없습니다. `index.html`을 브라우저로 바로 열면 됩니다.

```bash
start "" "index.html"
```

폰트(Gowun Batang · Noto Sans KR)는 Google Fonts에서 불러오므로 인터넷 연결이 있으면 의도한 서체로,
없으면 시스템 대체 서체로 표시됩니다.

## 배포 (정적 호스팅)

`index.html`과 `assets/` 폴더만 있으면 어떤 정적 호스팅에도 올릴 수 있습니다.

- **GitHub Pages**: 저장소에 푸시 후 Settings → Pages에서 브랜치를 지정
- **Netlify / Vercel / Cloudflare Pages**: 폴더를 드래그하거나 저장소를 연결 (빌드 명령 불필요, 배포 디렉터리 = 루트)

## 다음 단계 — 실제 AI 연동

`app.js`의 `submit()`이 지금은 `data.js`의 예시를 읽습니다. 실제 서비스에서는 이 지점을
백엔드 호출로 바꿉니다.

```js
// 예: submit() 내부
const res = await fetch("/api/ask", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ category: state.cat, question: text })
});
const data = await res.json(); // data.js의 항목과 동일한 스키마
renderResults(text, data);
```

백엔드가 돌려줄 응답 스키마는 `data.js`의 한 갈래 객체와 같습니다:
`{ name, desc, example, analysis, tags[], panel[], (unified[] | positions[]+axes[]), verses[], figures[] }`

### 연동 시 지켜야 할 원칙

- **교리 갈래는 하나의 정답으로 봉합하지 않는다.** 서로 다른 전통의 답을 나란히 보이고("쟁점 지도"),
  어느 교단도 정통으로 단정하지 않는다.
- 답변은 신학자의 사상에 근거한 **재구성**이며 직접 인용이 아님을 명시한다.
- **성경 구절 본문은 모델이 지어내지 않도록**, 참조(책·장·절)만 생성하고 실제 본문은 검증된
  성경 데이터에서 조회한다. 사용 번역본의 저작권도 확인한다.
- 위기 신호(자해 등) 감지 시 전문 도움을 안내한다. 이 서비스는 목회 상담을 대체하지 않는다.
