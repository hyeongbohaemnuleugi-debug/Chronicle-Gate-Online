# CHRONICLE GATE ONLINE — TRPG EDITION v12.0

GitHub에서 직접 수정 가능한 **변경 파일 전용 PATCH**입니다. 기존 v11 프로젝트에 덮어씌워 적용합니다. 압축 파일 안의 경로는 GitHub 저장소 루트 기준입니다. 소스는 JS/HTML/CSS 및 WAV/WEBP 원본 파일이며, 실행 파일이나 암호화된 코드는 없습니다.

## 1. GitHub 배포 순서

1. GitHub의 기존 `Chronicle-Gate-Online` 저장소를 **복제 또는 백업 브랜치**로 보관합니다.
2. ZIP을 압축 해제합니다. `server.js`, `public/app.js` 등은 각각 GitHub 저장소 내 **같은 상대 경로**에 덮어씁니다. `dramatic-director.js` 같은 신규 파일은 저장소 루트에 새로 추가합니다.
3. `public/art/director/` 및 `public/audio/` 파일도 반드시 함께 추가합니다. 기존 캠페인용 `public/art/pixel/`과 `public/audio/bgm_ember.wav` 등 v11의 이미지/음악은 그대로 유지합니다.
4. `GitHub → Commit changes` 또는 로컬에서 `git add -A && git commit -m "TRPG v12 dramatic director" && git push`로 반영합니다. ZIP을 그대로 저장소에 올리기만 해서는 패치가 적용되지 않습니다.
5. Render에 기존 GitHub 저장소가 연결되어 있다면 **재배포 완료 후 새로고침**합니다. 서버 빌드는 `npm install` 후 `npm start`이며, 신규 API 키나 DB 테이블은 요구하지 않습니다.

**주의:** `dramatic-director.js`가 누락되면 서버가 시작되지 않습니다. `server.js`, `tabletop-rules.js`, `public/app.js`, `public/index.html`, `public/styles.css`도 세트로 교체하세요. 기존 `.env`, 계정 데이터, Supabase 설정, 저장된 방 데이터를 삭제하지 마세요.

## 2. 이번에 변경되는 파일

| 경로 | 용도 |
|---|---|
| `server.js` | 최대 4인 서버 검증, 긴장도, 유대, 숨 고르기, 2D20, 상태 영속화, 결말 반영 |
| `dramatic-director.js` | 세계 9종의 분위기 문장, 긴장·유대 판정 규칙. **스토리를 직접 수정하기 좋은 파일** |
| `tabletop-rules.js` | 위험 감수·영감 판정 외 극적 돌파 주사위 판정 추가 |
| `public/app.js` | 긴장도 UI, 극적 돌파 버튼, 동료 유대, 심리 컷씬, 배경음 전환 |
| `public/index.html` | TRPG 도구 패널 및 심리 장면 패널 |
| `public/styles.css` | 긴장/유대 시각화, 모바일 배치, 접근성 고려 |
| `public/art/director/*.webp` | 신규 오리지널 픽셀아트 장면 6종 |
| `public/audio/bgm_dread.wav` | 긴장도 위기 시 배경음 |
| `public/audio/heartbeat.wav`, `public/audio/resolve.wav` | 심장박동/회복 효과음 |
| `tests-release/v12-director.test.mjs` | 신규 규칙 및 파일 검증 단위 테스트 |
| `tests-v12/*` | npm 설치 없이 Socket.IO 동작을 모의한 4인 통합 테스트 |
| `package.json` | 버전 번호·설명 갱신 (기존 dependencies 유지) |

## 3. 실제 플레이 규칙

- **인원:** 1~4명, 5번째 참가자는 서버에서 거절합니다. 직업/능력치 생성, 개인 시작·합류, 장면 선택, 채팅, 아이템/저장은 기존 방식 유지.
- **긴장 0~6:** 평정(0~2), 불안(3~4: 지혜·매력 -1), 균열(5~6: 지혜·매력 -2). 캐릭터의 불안은 주관적 묘사이며, 이미 확정된 스토리 사실을 임의로 바꾸지 않습니다.
- **극적 돌파:** 긴장 3 이상에서만 활성화. D20 두 개 중 높은 값 적용. 판정 후 긴장 +1의 대가가 있으며, 실패 시 위협 추가 +2. 극적 돌파는 생존·위험 사이의 고민을 만들기 위한 선택입니다.
- **영감:** 기존대로 영감 1점 소모, 2D20 중 높은 값. **위험 감수:** 기존대로 D20 +2, 실패 시 위협 추가 +1.
- **동료 돕기/유대:** 같은 장소에 있어야 가능. 한 번의 판정에 서로 다른 동료 최대 3명이 +1씩 도움. 동료별 협력 횟수로 유대 0~3 증가. 한 차례의 최초 도움은 긴장 -1(긴장이 있을 때); 유대 2 이상인 동료의 지원은 실패 시 추가 긴장을 최대 1 완화. 최대 4명인 파티의 역할을 강조합니다.
- **숨 고르기:** 자기 차례에 긴장 2 이상이면 가능. 차례와 세계 시계 1을 사용하며 긴장 -2. 같은 장소에 다른 참가자가 없으면 위협 +1. 한 번 사용 후 최소 3세계 행동 간격.
- **스토리:** 원래 9개 캠페인의 장면/분기 구조는 유지. 각 세계별로 정신적 압박에 따라 다른 분위기 묘사와 캐릭터 중심 질문이 나타나고, 동료 간 유대가 최종 에필로그에 남습니다. 자유 행동 선언과 기존 조사·아이템 루트 유지.
- **연출:** v11의 9세계 메인 픽셀아트와 캠페인별 오리지널 음악은 유지. 이번 버전에 심리 클로즈업용 아트 6종 및 긴장용 배경음·효과음 3종 추가. 음량 설정·음소거·브라우저 사운드 허용 정책은 그대로 적용.

## 4. 코드 수정 포인트

- 캠페인별 심리 표현과 질문: `dramatic-director.js`의 `WORLD_DRAMA`, `PHASE_QUESTIONS`.
- 주사위 옵션·효과: `tabletop-rules.js`의 `HERO_MODES`, `rollTabletopCheck`.
- 긴장·유대·휴식 서버 권한: `server.js`의 `story:assist`, `story:regroup`, `parallelAdvance`.
- 게임 화면·연출: `public/app.js`의 `renderDirectorScene`, `AudioManager`, `renderRollModeButtons`.
- 스타일: `public/styles.css` 맨 아래 `v12.0 TABLETOP DIRECTOR` 섹션.
- 컷씬 이미지는 `public/art/director/`에서 파일을 교체할 수 있습니다.

## 5. 테스트

```
npm run verify
node --experimental-loader ./tests-v12/mock-loader.mjs ./tests-v12/four-player.integration.mjs
```

개발 환경에서 `npm run verify`의 30개 테스트가 통과했고, **게임 서버의 실제 Socket 이벤트 핸들러를 인메모리 Socket.IO 대역으로 실행**한 4인 흐름 테스트도 통과했습니다. 실제 Render/Supabase 배포 및 브라우저 4대 동시 접속을 통한 전 구간 플레이는 별도로 확인해야 합니다. 실환경 점검을 권합니다.

## 6. 참고 영상 활용 범위와 저작권

제공된 YouTube Shorts 링크의 공개 검색 결과에서 심리적 압박·캐릭터 정신 상태를 다룬 인디게임이라는 소개를 확인했습니다. Instagram 게시물 4개의 실제 장면·음성·내용은 로그인/접근 제한으로 직접 검증하지 못했습니다. 따라서 **원본 영상을 완전히 분석했다고 주장하지 않으며** 특정 영상의 화면·대사·사운드를 복제하지 않았습니다. 새 컷씬은 이번 프로젝트용 새 생성 이미지, 새 음원은 파형을 직접 합성한 오리지널 효과입니다.
