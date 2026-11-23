# Chronicle Gate v16

친구들과 즐기는 1–4인 온라인·로컬 텍스트 TRPG입니다. 7개 이야기, 이야기마다 다른 직업 4개(총 28개), 기본 공격과 고유 기술을 사용하는 전투, 선택에 따른 결말·사망·부활을 제공합니다.

v16은 **CHRONICLE GATE에 어울리는 연대기 디자인**과 **가벼운 기본 서버**를 적용합니다. 짙은 잉크색·고금색, 커다란 제목, 아치형 장면 창과 기록집 표지를 사용하며, 본문과 선택지는 읽기 쉽게 유지합니다. 그림과 이야기·전투 규칙은 v15와 같습니다. 음원 46개는 모두 유지하고 원본과 같은 22.05kHz·모노의 96kbps MP3로 제공합니다.

- [설치와 플레이 안내](README_V16_KO.md)
- [서버·Supabase·용량 운영 안내](SERVER_AND_STORAGE_V16.md)
- [직업 28종과 기본 공격·기술](CLASS_GUIDE_V16.md)
- [검증 결과와 범위](VALIDATION_V16.md)
- [그림·음향의 제작 기록](ASSET_AND_DESIGN_NOTES_V16.md)
- [실측 용량·보존 검사](RESOURCE_REPORT_V16.json)

```bash
npm ci
npm run verify
npm start
```

Node.js 22 또는 24를 사용합니다. 기본 서버는 Supabase API 키나 SQL 설치 없이 실행됩니다. `/health`에서 버전 16.0.0과 `supabase.enabled: false`를 확인할 수 있습니다. 실제 계정의 기존 Supabase 사용량을 측정하는 지표는 아닙니다.

한 기기 플레이는 `node scripts/offline-server.mjs` 실행 후 `http://127.0.0.1:4173/`를 엽니다. 이 경로에는 npm 패키지 설치가 필요하지 않습니다. 파일 직접 실행용 `PLAY_OFFLINE.html`도 포함하며, 소스 수정 뒤에는 `npm run build:offline`으로 갱신합니다.

이 배포물은 기존 GitHub 저장소에 같은 경로로 덮어쓰는 누적 패치입니다. `npm run verify`는 자동 검사 전에 원본이 확인된 예전 WAV 중 정상 MP3로 교체된 파일만 정리합니다. 구형 계정 모드는 `npm run start:legacy`로 별도 실행할 수 있으며, 이 모드에서는 예전 Supabase 설정과 사용량이 적용됩니다. v14·v15 저장을 읽을 수 있으며 새 전투를 처음부터 경험하려면 새 이야기를 시작합니다.
