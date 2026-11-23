# Chronicle Gate v15

친구들과 즐기는 1–4인 온라인·로컬 텍스트 TRPG입니다. 7개 이야기, 이야기마다 다른 직업 4개(총28개), 기본 공격과 고유 기술 하나를 사용하는 중간 전투, 선택에 따른 결말·사망·부활을 제공합니다.

- [설치와 플레이 안내](README_V15_KO.md)
- [직업 28종과 기본 공격·기술](CLASS_GUIDE_V15.md)
- [검증 결과와 범위](VALIDATION_V15.md)
- [그림·음향의 제작 기록](ASSET_AND_DESIGN_NOTES_V15.md)

```bash
npm ci
npm run verify
npm start
```

Node.js22 또는24를 사용합니다. 한 기기에서 빠르게 실행하려면 압축을 완전히 풀고 `PLAY_OFFLINE.html`을 열거나 `node scripts/offline-server.mjs`를 실행합니다. 소스 수정 뒤에는 `npm run build:offline`으로 오프라인 묶음을 갱신하세요.

이 배포물은 기존 저장소에 덮어쓰는 누적 패치입니다. 온라인 서버는 원본 프로젝트 위에 적용합니다. 기존 v14 저장은 읽을 수 있으며 새 전투를 처음부터 경험하려면 새 이야기를 시작합니다.
