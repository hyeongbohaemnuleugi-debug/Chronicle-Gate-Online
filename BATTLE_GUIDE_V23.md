# v23 전투 화면·적·효과음 편집 안내

## 코드 연결

`combat.js`가 실제 주사위와 피해를 확정합니다. `combat-presentation.js`는 이미 확정된 전투 결과를 표시용 이벤트로 바꿉니다. `app.js`가 기존 D20과 전투 연출 순서를 관리하고 `battle-presenter.js`가 화면 반응과 효과음을 실행합니다. `battle-ui.js`는 전투 화면의 구조, `styles.css` 마지막 전투 구역은 배치와 움직임을 담당합니다.

연출 파일에서 새 주사위를 굴리거나 체력·차례를 바꾸지 마세요. 온라인 판정의 기준은 기존 엔진과 서버입니다. 플레이어 이름이 같을 수 있으므로 대상 선택과 표시 연결에는 `actorId`·`targetId`를 사용합니다.

| 바꾸려는 것 | 편집할 파일 |
|---|---|
| 전투 화면의 구성·문구 | `public/game/battle-ui.js` |
| 배치·색·반응형·공격 움직임 | `public/game/styles.css` 전투 구역 |
| 연출 순서·길이·결과별 문구 | `public/game/combat-presentation.js` |
| 체력 숫자·피격·회복·승패 표시 | `public/game/battle-presenter.js` |
| 각 적과 이미지 연결·대체 설명 | `public/game/battle-assets.js` |
| 실제 적 그림 | `public/game/art/enemies/*.webp` |
| 새 효과음 이름·음량·주소 | `public/game/battle-audio-assets.js` |
| 새 효과음 원본 제작 코드 | `scripts/build-battle-audio-v23.py` |
| 음악·효과음 재생과 취소 | `public/game/audio.js`, `public/game/audio-fallback.js` |
| 실제 전투 규칙과 결과 영수증 | `public/game/combat.js` |
| 이야기별 적·공격 패턴 | `public/game/campaigns/combat-data.js`, `horror-data.js` |

## 그림 교체

각 파일은 투명 배경 WebP, 최대 384×384입니다. `battle-assets.js`의 키는 실제 `encounter.id`와 같아야 합니다. 예전 내부 이름에 `puppet`이나 `clockwork`가 남아 있어도 등장하는 적은 각각 담보 사냥꾼 일당과 거울 분신입니다. 실제 이야기의 `enemyName`·`enemyDescription`을 먼저 확인하세요.

원래 장면 삽화는 `public/game/art/{campaignId}.webp`의 2×2 그림입니다. 기존 삽화를 다시 제작할 필요 없이 적 그림만 바꿀 수 있습니다. 생성 프롬프트와 참조 파일은 `scripts/battle-art/prompts-v23.json`, 파일 크기·SHA-256은 `scripts/battle-art/manifest-v23.json`에 있습니다. 제작에는 내장 이미지 생성 도구를 썼고, 투명도를 유지한 채 크기만 줄여 WebP로 인코딩했습니다.

직접 편집한 PNG 원본은 `<encounter-id>.png`라는 이름으로 별도 폴더에 모은 뒤 다음처럼 인코딩할 수 있습니다. 기존 원본 PNG나 고용량 WAV를 게임의 `public/` 폴더에 추가할 필요는 없습니다.

```bash
python3 scripts/encode-battle-art-v23.py /path/to/masters
```

이 제작 단계만 Pillow가 필요합니다. 그림 모양을 자동 수정하는 스크립트가 아니라 크기·포맷 변환용입니다. 최종 게임 실행에는 Python이 필요하지 않습니다. 새 파일로 교체하면 캐시 번호도 새 버전으로 올리고 `game-server/http-service.js`의 정적 캐시 정책을 함께 확인하세요.

## 효과음 편집

`scripts/build-battle-audio-v23.py`의 각 효과음 제작 함수는 외부 샘플 없이 소리를 합성합니다. 재생용 파일은 13개의 짧은 MP3이며 `scripts/battle-audio-v23.json`에 길이·크기·해시·디코딩 측정이 기록됩니다. 생성 도구 의존성은 스크립트 머리말을 확인하세요.

```bash
npm run build:battle-audio
npm run test:battle
```

효과음은 `sound.effect(name, {scope:'battle'})`로 시작하고, 화면 이탈·복원·취소 때 `sound.stopBattleEffects()`로 정리합니다. 정상 완료 때까지 무조건 정리하면 승리·전멸 소리의 꼬리가 잘리므로 자연 종료를 허용합니다. 배경음 전환은 기존 음악 감독 모듈을 사용하고 사망 연출 시점에 슬픈 음악으로 전환합니다.

움직임 줄이기 모드는 모든 효과음을 한꺼번에 재생하지 않고 실제 결과를 대표하는 소리 하나를 사용합니다. 회복·방어·제압은 `abilityType`으로 구분하고, 전멸·사망·대실패를 우선합니다.

## 검증과 보고서

`tests-v23/`는 전투 표시·오디오·이미지 검증이며, 이전 폴더의 규칙·저장·온라인 검사를 함께 유지합니다. 폴더 이름을 합치거나 바꾸지 않아도 됩니다.

```bash
npm run build:offline
npm run test:all
node scripts/report-v23.mjs
```

`scripts/baseline-v22_1.json`은 전달된 v22.1 파일에서 고정한 해시 기준입니다. 원래 이야기·음원·그림을 의도적으로 변경한다면 기준 해시를 덮어써 통과시키지 말고, 새 릴리스에서 변경 이유와 범위를 기록하세요. 이전 `report-v22.mjs`는 v22 릴리스용이며 v23 자원 보고서는 새 명령을 사용합니다.
