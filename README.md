# Chronicle Gate v17

친구들과 즐기는 1–4인 온라인·로컬 텍스트 TRPG입니다. 일곱 이야기, 이야기별 네 직업, 실제 전투·사망·부활, 여러 결말을 제공합니다.

v17은 **읽기 쉬운 사건 설명과 선택의 인과관계**를 중심으로 수정했습니다. 직접 입력하는 자유 행동을 없애고, 미리 작성한 위험 선택에 대성공·성공·실패·대실패의 서로 다른 결과를 적용합니다. 단서 기록과 함께 쓰는 소지품 가방을 구분하고, 물건의 획득·사용·소모가 다음 장면과 저장에 반영됩니다. v16 디자인과 미디어 파일, 기본 서버의 자원 제한은 유지합니다.

- [설치와 플레이](README_V17_KO.md)
- [이야기·분기·소지품 작성 안내](STORY_GUIDE_V17.md)
- [직업 28종과 전투](CLASS_GUIDE_V17.md)
- [서버·저장·Supabase 운영](SERVER_AND_STORAGE_V17.md)
- [검증 결과와 범위](VALIDATION_V17.md)
- [그림·음향 제작 기록](ASSET_AND_DESIGN_NOTES_V17.md)
- [실측 용량과 미디어 보존](RESOURCE_REPORT_V17.json)
- [실제 규칙으로 도달한 결말 경로](NARRATIVE_REACHABILITY_V17.json)

```bash
npm ci
npm run verify
npm start
```

Node.js 22 또는 24를 사용합니다. 기본 서버는 Supabase나 외부 AI API 키 없이 실행되며 `/health`에서 버전 `17.0.0`을 확인할 수 있습니다. 한 기기 플레이는 npm 설치 없이 `node scripts/offline-server.mjs`로 실행합니다. 직접 파일 실행용 `PLAY_OFFLINE.html`도 포함되어 있습니다.

이 배포물은 기존 GitHub 저장소의 같은 경로에 덮어쓰는 누적 변경 패치입니다. ZIP 자체를 업로드하지 말고 안의 파일들을 적용합니다. 구형 계정 모드는 명시적으로 `npm run start:legacy`로 실행하며 이 모드에서는 이전 Supabase 설정이 적용됩니다. v14·v15·v16 저장을 읽지만, 다시 쓴 이야기의 도입과 분기를 경험하려면 새 이야기로 시작하세요.
