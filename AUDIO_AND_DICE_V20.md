# v20 음악·주사위 편집 안내

## 음악을 다시 만들 때

이미 렌더한 MP3가 포함되어 있어 일반 게임 실행에는 Python이나 ffmpeg가 필요하지 않습니다. 직접 악보를 편집해 음원을 다시 만들 때만 Python 3, NumPy, SciPy, ffmpeg, ffprobe를 준비하세요.

```bash
python -m pip install numpy scipy
npm run build:audio
```

위 명령은 `scripts/score-v20.json`을 읽어 42곡을 렌더하고, `audio-loops.js`와 manifest를 함께 갱신합니다. 기존 13개 효과음은 다시 만들지 않고 검증·보존합니다.

악보 JSON의 각 연주 이벤트에는 음 이름, 시작 박자, 길이, 악기와 세기가 있습니다. JSON을 편집한 뒤에는 일반 빌드 명령을 사용하세요. **`--write-score`는 코드에 적힌 초기 악보로 JSON을 다시 만드는 옵션이므로, 직접 고친 음표를 보존하려면 사용하지 않습니다.**

```bash
# 일부 곡을 별도 폴더에 렌더
python scripts/build-score-v20.py --themes last-train --moods calm,grief --output ./music-preview

# 선택적으로 PCM 원본을 배포 폴더 밖에 보관
python scripts/build-score-v20.py --masters-dir ./audio-masters

# 전달 MP3 42개를 다시 디코딩하여 검사
python scripts/audit-audio-loops-v20.py
```

`--baseline`에는 이전 버전의 `public/game/audio` 폴더를 지정할 수 있습니다. 이 경우 기존 효과음 13개의 보존 여부도 비교합니다. 검증 보고서는 `AUDIO_LOOP_AUDIT_V20.json`입니다.

## 반복 구간의 의미

`public/game/audio-loops.js`는 런타임에 필요한 작은 인덱스입니다.

```js
{
  sampleRate: 32000,
  startFrame: 16000,
  endFrame: 803692,
  sourceFrames: 819692
}
```

이 예에서는 0.5초부터 25.115375초 직전까지 약 24.615375초를 반복합니다. 앞뒤 0.5초는 연결 여유 음입니다. 반복 시간은 `startFrame / sampleRate`, `endFrame / sampleRate`로 계산합니다. 기기의 디코딩 샘플레이트가 달라도 시간 기준은 같습니다.

곡의 시작점을 옮기는 처리는 한 주기 전체를 회전시키는 방식입니다. 마디 길이를 줄이거나 음표를 삭제하지 않으며, 매 주기의 끝에서 0음량으로 사라졌다가 다시 커지게 만들지도 않습니다. 원래 곡의 첫 강박은 곡 내부에 남습니다.

외부에서 MP3를 교체할 때는 파일만 덮어쓰면 안 됩니다. 새 음원에 맞는 반복 인덱스와 manifest, 캐시 버전도 함께 갱신해야 합니다. v20 파일 전체를 미디어 플레이어에서 반복하는 것과 게임이 지정된 내부 구간만 반복하는 것은 서로 다릅니다.

## 재생기의 연결 방식

`audio.js`는 소리를 켠 뒤 필요한 곡을 가져와 디코딩하고, `AudioBufferSourceNode`의 반복 시작·끝을 지정합니다. 음량 전환은 오디오 시계의 `GainNode` 자동화로 계산합니다. 화면 프레임 수에 따라 곡을 다시 시작하지 않습니다.

새 곡이 늦게 로드되거나 실패하면 기존 곡을 유지합니다. 같은 장면을 다시 그리는 것만으로 음악을 재시작하지 않습니다. 빠르게 세 번째 분위기가 도착하면 진행 중인 전환을 마친 뒤 이어서 전환하여 동시에 세 곡이 겹치지 않게 합니다. 재접속과 관찰 등은 기존 `music-director.js`의 감정 규칙을 따릅니다.

주사위가 구를 때 `sound.duck(true)`, 숫자 공개 때 `sound.duck(false)`로 배경음만 일시적으로 낮춥니다. 효과음 크기와 사용자의 음량 설정은 유지합니다. 사망·부활 효과는 다른 결과 효과보다 우선합니다.

버퍼 반복 기능의 기준은 [Web Audio API 명세](https://www.w3.org/TR/2021/REC-webaudio-20210617/)와 [AudioBufferSourceNode.loopStart 문서](https://developer.mozilla.org/en-US/docs/Web/API/AudioBufferSourceNode/loopStart)입니다. 실제 앱의 오류 처리·캐시·감정 선택은 이 프로젝트의 코드와 테스트에서 확인합니다.

## 파일 더블클릭 재생

`file://`에서는 파일 읽기 제약 때문에 `audio-fallback.js`를 사용합니다. 내부 반복 구간의 끝에 다가가면 다음 미디어를 미리 준비하고 약 240ms 동안 겹쳐 연결합니다. 최대 두 음악 요소를 유지합니다. 브라우저의 미디어 시작·탐색과 화면 스케줄링 영향을 받으므로, 정밀 반복이 중요하면 인터넷 없이 작동하는 `START_OFFLINE_WINDOWS.bat` 또는 로컬 HTTP 실행기를 사용하세요.

## 주사위의 책임 범위

`dice.js`는 게임의 판정 값을 받는 표시 모듈입니다. 주사위 결과를 생성하거나 엔진 확률·목표값을 바꾸지 않습니다. 20면체의 각 면에 1~20을 한 번씩 쓰고, 맞은편 숫자의 합이 21이 되도록 구성했습니다.

`ROLL_DURATION`은 기본 1,700ms입니다. `diceFrame`은 실제 화면과 SVG 점검 그림이 공통으로 사용하는 입체 투영 함수입니다. 미리보기 GIF 역시 이 함수의 실제 프레임을 이용해 만든 것으로, 전체 브라우저 화면을 촬영한 영상은 아닙니다.

공유 결과가 도착하면 결과 본문을 잠시 보류하고 주사위부터 보여 줍니다. 연출이 끝난 뒤 정확한 판정과 해당 행동의 문장을 읽으며, 다음 상태가 도착해도 지금 읽는 결과를 덮어쓰지 않습니다. 취소·건너뛰기·움직임 줄이기·페이지 가림에서 정리하고 기존 판정은 그대로 유지합니다.

## 미리듣기 구간

별도 제공한 `Chronicle_Gate_v20_Continuous_Loop.mp3`는 막차 평상 음악을 **세 주기** 이어 붙인 약 73.85초 파일입니다. 반복 경계는 **24.615375초와 49.23075초**입니다. 이 두 경계에 별도의 페이드·겹치기·무음을 추가하지 않았습니다.

`Chronicle_Gate_v20_Music_Transitions.mp3`는 **평상 → 긴장 → 슬픔**을 1.25초 전환으로 연결한 약 33.5초 파일입니다. 두 미리듣기 모두 실제 전달 MP3의 내부 구간을 디코딩해 구성했으며, 브라우저 재생이나 스피커 출력을 녹음한 파일은 아닙니다.
