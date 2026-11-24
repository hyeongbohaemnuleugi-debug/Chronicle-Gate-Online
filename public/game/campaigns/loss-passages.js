/** Authored fatal variants and the next location reached only by survivors. */
export const LOSS_PASSAGES = {
  "last-train": {
    "platform/group-hold-door/failure": {
      "lossText": "붙들던 객차 문이 거세게 되튀어 팔과 어깨를 친다. 윤이 출입을 멈추자 승강장에는 비상 호출만 남는다.",
      "survivorArrival": "남은 일행은 윤이 가리킨 옆 매점으로 물러나, 처마까지 늘어난 열차의 연결 통로를 살핀다."
    },
    "platform/group-hold-door/fumble": {
      "lossText": "잠금쇠가 걸리며 팔을 낀 문이 몸까지 짓누른다. 윤이 비상 해제를 당기지만 문에 가해진 힘은 이미 너무 컸다.",
      "survivorArrival": "윤이 막아 둔 승강장 출입문을 피해 남은 일행은 옆 매점으로 가서 다른 연결 통로를 찾는다."
    },
    "baggage/help-wire/fumble": {
      "lossText": "차장실 전원선을 받치던 손으로 전류가 파고든다. 백이 차단기를 내리자 분실물 선반 위의 전등까지 한꺼번에 꺼진다.",
      "survivorArrival": "남은 일행은 백이 건넨 손전등으로 객차 사이 통로를 비추며, 종이 장부가 남아 있는 차장실로 간다."
    },
    "brake/rig-brake/fumble": {
      "lossText": "비스듬히 박힌 잠금핀이 꺾이며 튕긴 쇠가 손과 몸을 친다. 제동 손잡이가 다시 풀리고 윤이 급히 그 끝을 붙든다.",
      "survivorArrival": "윤이 제동을 대신 잡은 동안 남은 일행은 임시 정차 규정집을 챙겨 터널 쪽 연결 통로로 옮겨 간다."
    },
    "brake/hold-brake/failure": {
      "lossText": "힘을 받은 잠금 홈이 깨지고 되튄 손잡이가 몸을 세게 밀어붙인다. 떨어진 규정집 위로 관제 호출이 날카롭게 울린다.",
      "survivorArrival": "윤이 다시 제동을 붙든 틈에 남은 일행은 규정집을 주워 터널 쪽 통로로 물러난다."
    },
    "brake/hold-brake/fumble": {
      "lossText": "잠금 홈이 갈라지며 손잡이가 가슴을 짓누른다. 윤이 비상 완충기를 걸어도 부서진 고정대 아래의 충격은 가시지 않는다.",
      "survivorArrival": "열차가 느려진 동안 남은 일행은 바닥의 규정집을 챙기고 터널을 향한 연결 통로로 들어선다."
    },
    "brake/reverse-shortcut/failure": {
      "lossText": "동력을 거꾸로 돌리는 순간 객차가 요동쳐 일행을 바닥과 의자로 내던진다. 완충기가 탈선은 막지만, 분기기 곁에 세우려던 열차는 그대로 지나친다.",
      "survivorArrival": "남은 일행은 윤이 가리킨 우회 통로를 따라 터널 쪽 객차로 옮겨, 앞의 현장 분기기로 갈 길을 찾는다."
    },
    "brake/reverse-shortcut/fumble": {
      "lossText": "잠기지 못한 동력축이 객차를 선로 밖으로 비튼다. 뜯겨 나간 손잡이와 의자가 어둠 속으로 쏟아지고 윤의 호출이 끊어졌다 이어진다.",
      "survivorArrival": "남은 일행은 뒤틀린 객차에 이어진 정비 통로를 따라 터널 쪽으로 물러난다."
    },
    "signal/manual-signal/fumble": {
      "lossText": "잘못 물린 두 전선에서 섬광이 튀어 조작하던 손을 덮친다. 신호판 전체가 꺼지고 수화기에서는 비상 점검을 외치는 소리만 들린다.",
      "survivorArrival": "남은 일행은 종이 지도에서 현장 분기기의 위치를 확인하고 신호실 아래 터널 쪽 통로로 내려간다."
    },
    "tunnel/open-door/failure": {
      "lossText": "문이 열리는 순간 안전 고리가 끊어지고 되닫히는 문짝이 몸을 세게 친다. 아이가 내밀던 신청서는 닫힌 유리 바깥에 붙는다.",
      "survivorArrival": "남은 일행은 문짝을 피해 창가로 자리를 옮겨, 유리에 신청서를 붙인 아이의 말을 듣는다."
    },
    "tunnel/open-door/fumble": {
      "lossText": "끊어진 안전 고리가 손목에 감기고 닫히는 문이 몸을 끌어당긴다. 경보 너머로 아이가 유리에 신청서를 대는 소리가 작게 들린다.",
      "survivorArrival": "남은 일행은 안쪽 창가로 물러나 아이가 펼쳐 든 신청서와 빈 행선지 칸을 마주한다."
    },
    "witness/group-light-rail/fumble": {
      "lossText": "잇던 접점에서 전류가 튀어 손과 팔을 타고 흐른다. 난간의 비상등마저 꺼지자 아이는 신청서를 유리에 바짝 붙인다.",
      "survivorArrival": "남은 일행은 아이가 보여 준 신청서를 확인한 뒤 난간을 짚고 정비 통로를 건너 현장 분기기로 간다."
    },
    "switch/clear-lever/failure": {
      "lossText": "돌을 밀어내던 분기 레버가 부러지고 풀린 균형추가 조작하던 자리를 덮친다. 무전기에서는 윤이 비상 제동을 거는 소리가 들린다.",
      "survivorArrival": "윤이 열차를 정비 다리 입구에 세우자 남은 일행은 레일 옆 점검 통로를 따라 그곳으로 건너간다."
    },
    "switch/clear-lever/fumble": {
      "lossText": "돌에 걸린 균형추가 끊어져 몸을 덮치고 레버까지 꺾는다. 부서진 분기기 위로 관제의 비상 호출이 거듭 울린다.",
      "survivorArrival": "윤이 비상 제동으로 열차를 붙든 틈에 남은 일행은 점검 통로를 따라 정비 다리 입구로 물러난다."
    },
    "switch/relay-bridge/failure": {
      "lossText": "타 버린 릴레이에서 차량 손잡이로 전류가 번진다. 손을 떼기도 전에 무릎이 꺾이고, 바닥에는 끊어진 전선의 불꽃이 튄다.",
      "survivorArrival": "윤이 전원을 끊고 열차를 다리 입구에 세우자 남은 일행은 전선에서 떨어져 점검 통로로 그곳에 건너간다."
    },
    "switch/relay-bridge/fumble": {
      "lossText": "잘못 이은 귀환선으로 전류가 거슬러 올라와 손잡이마다 섬광을 터뜨린다. 윤이 외부 전원을 끊을 때까지 금속 바닥에서도 불꽃이 뛴다.",
      "survivorArrival": "남은 일행은 윤이 수동 제동으로 붙들어 둔 열차를 따라 정비 통로를 건너 다리 입구에 닿는다."
    },
    "reply-booth/call-confirmed-family/fumble": {
      "lossText": "잡음이 난 전화함 안에서 벗겨진 전선이 튀어나온다. 차단기가 내려가기 전에 전류가 젖은 비상전화 손잡이를 타고 흐른다.",
      "survivorArrival": "윤이 전원을 끊고 연결문을 열어 준다. 남은 일행은 전화에서 떨어져 마지막 객차로 건너간 뒤 방송대 앞에 멈춘다."
    }
  },
  "glass-hotel": {
    "ballroom/champagne-trick/failure": {
      "lossText": "경비의 시야를 가리려고 옮긴 샴페인 잔이 손안에서 깨진다. 날카로운 조각이 팔을 가르고 멈춘 연회장에 경보가 번진다.",
      "survivorArrival": "리가 악보 보관문을 열어 손짓하자 남은 일행은 깨진 잔을 피해 시간 금고 기록실로 몸을 피한다."
    },
    "ballroom/champagne-trick/fumble": {
      "lossText": "비튼 잔에 닿은 유리들이 한꺼번에 터져 조작하던 자리를 덮친다. 빈 원석 함의 기록을 읽기도 전에 경보가 경비를 부른다.",
      "survivorArrival": "남은 일행은 리가 열어 둔 악보 보관문을 지나 기록실로 피하고, 닫힌 문 뒤에 유리 파편을 남긴다."
    },
    "workshop/borrow-key/failure": {
      "lossText": "조정키를 돌리자 시험 장치의 시간이 거꾸로 흘러 몸속 박동을 조인다. 해린이 연결선을 뽑고 도면에 빠진 순서를 급히 적는다.",
      "survivorArrival": "남은 일행은 해린에게 수정한 도면을 받아 작업실 옆문을 나서고, 소라가 올라간 서비스 계단을 따른다."
    },
    "workshop/borrow-key/fumble": {
      "lossText": "두 번 되돌아간 시험 시간에 심장 박동이 붙잡힌다. 해린이 전원을 끊자 작업대의 빈 병만 길게 울린다.",
      "survivorArrival": "해린이 문턱에 놓은 올바른 도면을 챙겨 남은 일행은 소라를 찾으러 지붕 서비스 계단으로 올라간다."
    },
    "stair/distract-security/fumble": {
      "lossText": "수건을 당긴 표지판이 넘어지며 발을 걸고, 계단에 미끄러진 몸이 모서리를 세게 친다. 아래층에서 경비의 손전등이 올라온다.",
      "survivorArrival": "소라가 원석을 챙겨 회랑 문을 열자 남은 일행은 그 문을 지나 금고 앞의 거울 사이로 피한다."
    },
    "stair/group-hold-firedoor/failure": {
      "lossText": "닫으려던 방화문이 거세게 되튀어 붙들던 몸을 친다. 소라가 원석을 들어 깨뜨리면 시간을 돌려주지 못한다고 외친다.",
      "survivorArrival": "남은 일행은 소라가 가리킨 뒤쪽 문으로 계단참을 벗어나지만 경비의 발소리도 거울 회랑까지 따라온다."
    },
    "stair/group-hold-firedoor/fumble": {
      "lossText": "받침이 빠진 방화문 틈에 몸이 끼고 경비가 반대편에서 문을 밀어붙인다. 소라가 들어 보인 원석의 경고 위로 계단 경보가 울린다.",
      "survivorArrival": "남은 일행은 추격을 막지 못한 채 소라와 뒤쪽 회랑 문을 넘어 금고 앞 거울 사이로 들어간다."
    },
    "mirrorhall/cover-mirrors/failure": {
      "lossText": "커튼을 끌어내리는 팔 위로 무거운 잠금 날이 떨어진다. 소라가 카트를 밀어 넣자 좁아진 문틈에서 금속이 길게 운다.",
      "survivorArrival": "남은 일행은 소라의 카트가 버티는 틈으로 거울 회랑을 빠져나가 원석 금고 안에 들어선다."
    },
    "mirrorhall/cover-mirrors/fumble": {
      "lossText": "잠금 날에 걸린 커튼이 몸을 문 쪽으로 끌어당긴다. 날이 바닥을 치는 충격에 거울들이 흔들리고 금고 경보가 터진다.",
      "survivorArrival": "소라가 카트로 남겨 둔 문틈을 통해 남은 일행은 회랑에서 금고 안으로 몸을 옮긴다."
    },
    "mirrorhall/farewell/fumble": {
      "lossText": "거울 곁을 스치는 발목에 빛이 감겨든다. 조여드는 빛에 걸린 몸이 붉은 선 위로 쓰러지고 소라의 부름이 회랑에 울린다.",
      "survivorArrival": "남은 일행은 소라가 가리키는 문을 향해 거울에서 눈을 떼고 원석 금고의 문턱을 넘는다."
    },
    "vault/unlock/failure": {
      "lossText": "반환 잠금축이 갑자기 풀리며 역류한 시간이 금고 안의 가슴들을 누른다. 이름표가 달린 오후들이 번쩍이고 원석 옆 천창 문이 열린다.",
      "survivorArrival": "남은 일행은 되감기는 잠금축에서 떨어져 열린 천창 계단으로 금고를 벗어나 옥상에 오른다."
    },
    "vault/unlock/fumble": {
      "lossText": "반환축 대신 풀린 입금축이 금고 안의 심장 박동을 끌어당긴다. 소라가 바깥 전원을 내리자 회로의 울음이 겨우 멎는다.",
      "survivorArrival": "남은 일행은 소라가 열어 둔 천창 계단을 따라 금고에서 빠져나와 옥상의 원석 받침대로 간다."
    },
    "vault/unsafe-release/failure": {
      "lossText": "고리 하나가 늦게 빠지며 생명 시간이 정렬 회로로 샌다. 소라가 외부 전원을 끊지만 금고 바닥에 쓰러진 몸들의 박동은 이미 흐트러졌다.",
      "survivorArrival": "남은 일행은 멈춘 회로를 등지고 천창 계단으로 물러나, 원석을 놓을 옥상에 오른다."
    },
    "vault/unsafe-release/fumble": {
      "lossText": "서로 어긋나게 풀린 안전 고리들이 몸속 시간을 금고의 동력으로 당긴다. 소라의 손이 차단기에 닿기 전에 이름표마다 눈부신 빛이 번진다.",
      "survivorArrival": "남은 일행은 금고 옆의 천창 계단을 따라 옥상으로 물러나 정렬되지 않은 원석의 방향을 정하려 한다."
    },
    "spare-rooms/release-spare-latch/fumble": {
      "lossText": "잠금쇠를 받치던 문에서 경첩이 빠진다. 무거운 방문이 기울며 객실 문턱을 덮치고, 깨진 금속 소리가 복도 끝까지 울린다.",
      "survivorArrival": "소라가 기울어진 문 옆의 서비스 통로를 가리킨다. 남은 일행은 그 길로 복도를 벗어나 직원 식당에 닿는다."
    }
  },
  "moon-market": {
    "bridge/group-light-bridge/fumble": {
      "lossText": "고치던 바람막이가 갑자기 열리며 심지의 불꽃이 손과 몸을 덮친다. 소리에 감시꾼이 다가오자 토끼가 등불을 회수한다.",
      "survivorArrival": "남은 일행은 고치지 못한 등불을 토끼에게 맡기고 통행료를 다시 고르러 기억 저울 좌판으로 간다."
    },
    "stalls/umbrella/failure": {
      "lossText": "우산을 따라 지붕을 넘던 손이 미끄러지고 몸이 노점길 바닥에 떨어진다. 우산은 낮게 선회하며 종이 물고기가 모인 강 쪽을 가리킨다.",
      "survivorArrival": "남은 일행은 노점 사이를 빠져나가 우산이 가리킨 종이 물고기 나루로 내려간다."
    },
    "stalls/umbrella/fumble": {
      "lossText": "솟아오른 우산에서 손이 떨어지고 아래 난간이 몸을 세게 받는다. 소리에 달려온 나루지기 담이 감시꾼보다 먼저 노점 사이에 멈춰 선다.",
      "survivorArrival": "남은 일행은 담의 안내로 노점길을 벗어나, 종이 물고기의 편지가 모여드는 그의 나루로 간다."
    },
    "auction/shatter-rig/failure": {
      "lossText": "깨진 유리 고리와 함께 발판이 기울어 경매장 난간에 몸들이 부딪친다. 달은 자신을 판 적 없다고 외치며 하역대 쪽 소원 끈을 늘인다.",
      "survivorArrival": "남은 일행은 달이 늘인 끈을 잡고 무대 아래 하역대로 내려가, 아직 달을 묶고 있는 물레에 다가간다."
    },
    "auction/shatter-rig/fumble": {
      "lossText": "유리 고리와 발판을 받치던 축이 함께 부서진다. 바닥이 무너진 자리에 파편과 몸들이 쏟아지고 강물이 거세게 솟는다.",
      "survivorArrival": "남은 일행은 무대에서 이어진 소원 끈을 따라 하역대 난간 쪽으로 몸을 옮긴다."
    },
    "backstage/stamp-witness/failure": {
      "lossText": "봉인 장치가 첨부한 진술을 허위 입찰로 읽고 불꽃을 뿜는다. 솔이 불을 끄지만 봉인 손잡이 앞까지 번진 열기는 쉽게 가라앉지 않는다.",
      "survivorArrival": "남은 일행은 솔이 구해 낸 달의 거절 원본을 받아 계약실 문을 나서고, 공개 장부 단상으로 가져간다."
    },
    "backstage/stamp-witness/fumble": {
      "lossText": "취소 칸에 닿은 봉인에서 서류를 태울 불꽃이 치솟아 몸까지 덮친다. 솔이 불을 끈 뒤에도 자동 수정 장치에는 잠금 표시가 남는다.",
      "survivorArrival": "남은 일행은 타지 않은 빈 동의란 사본을 챙겨 계약실에서 나와, 경매를 멈출 증거로 공개 단상에 펼친다."
    },
    "crane/unwind/failure": {
      "lossText": "거꾸로 튄 물레가 끈을 감아 하역대의 몸들을 찬 강물로 끌어당긴다. 풀린 틈으로 달이 빠져나오고 토끼는 긴 귀를 물가까지 늘인다.",
      "survivorArrival": "남은 일행은 토끼가 내민 귀를 붙들고 물가로 돌아와, 달이 내려앉은 공동 나루로 건너간다."
    },
    "crane/unwind/fumble": {
      "lossText": "역회전한 물레가 난간째 소원 끈을 감아 깊은 물속으로 끌고 간다. 달을 묶던 줄은 풀리지만 강물에는 부서진 난간이 떠오른다.",
      "survivorArrival": "토끼의 귀와 담의 배에 의지해 남은 일행은 물에서 빠져나와 공동 나루로 돌아간다."
    },
    "crane/share-weight/failure": {
      "lossText": "작은 몫을 고르려던 손 위로 풀리지 않은 소원들이 한꺼번에 쏟아진다. 하역대가 흔들리는 동안 상인들이 나머지 끈을 나눠 잡아 달을 내린다.",
      "survivorArrival": "남은 일행은 상인들이 붙든 난간을 따라 하역대에서 내려와 달이 기다리는 공동 나루로 간다."
    },
    "crane/share-weight/fumble": {
      "lossText": "풀리지 않은 매듭에서 소원의 무게가 한꺼번에 쏟아지고 되튄 줄이 하역대 전체를 휩쓴다. 상인들이 달의 끈을 잡을 때까지 난간은 계속 흔들린다.",
      "survivorArrival": "남은 일행은 상인들이 물레를 붙들어 준 틈에 하역대에서 벗어나, 내려온 달과 만날 공동 나루로 옮겨 간다."
    },
    "echo-alley/match-outside-marks/fumble": {
      "lossText": "창구 위에서 낡은 등불 고리가 떨어진다. 무거운 쇠고리가 좁은 골목을 가로지르며 표식을 읽던 자리로 내려꽂힌다.",
      "survivorArrival": "나비가 등불을 들어 골목 안쪽의 빈 길을 비춘다. 남은 일행은 부서진 창구에서 물러나 미확인 병 보관대에 닿는다."
    }
  },
  "deep-sea": {
    "deck/brief/fumble": {
      "lossText": "누리와 잠수종에 올라 하강하던 중 윈치 소리가 정지 신호를 덮는다. 정상 접안 지점을 놓친 잠수종이 외벽에 부딪혀 안의 몸을 거세게 친다.",
      "survivorArrival": "남은 일행은 누리가 바깥에 건 비상 줄로 잠수종을 나와 가까운 화물 투입구의 발판까지 내려간다."
    },
    "deck/winch/fumble": {
      "lossText": "인양줄을 타고 내려가던 몸이 걸린 고정쇠에 끌려 외벽에 부딪친다. 팽팽해진 줄 너머에서 누리가 외부 진입 중단 신호를 보낸다.",
      "survivorArrival": "남은 일행은 누리의 비상 줄을 따라 잠수종에 올라 문을 잠그고 정상 접안문 앞으로 이동한다."
    },
    "deck/solo-return-name/fumble": {
      "lossText": "잠수종으로 하강하며 끊긴 무전을 붙잡는 사이 정지 표시를 놓친다. 외벽에 부딪힌 잠수종이 어깨를 짓누르고, 항해사의 귀환 확인은 끝내 들리지 않는다.",
      "survivorArrival": "남은 일행은 누리가 건 비상 줄로 잠수종 바깥에 나가 정상 접안문 옆 화물 투입구까지 내려간다."
    },
    "deck/group-spare-line/fumble": {
      "lossText": "먼저 내려가 당기던 예비 줄의 고정쇠가 빠져 몸이 외벽을 친다. 풀린 줄은 검은 물속으로 흘러가고 누리가 비상 회수 줄을 건다.",
      "survivorArrival": "남은 일행은 누리가 대어 준 잠수종에 올라 문을 닫고, 예비 줄 대신 정상 접안문을 통해 들어가려 한다."
    },
    "bell/crank/failure": {
      "lossText": "고정핀을 받친 손잡이 축이 꺾여 조작하던 손을 때린다. 누리가 외부 유압을 모두 밀어 넣자 문은 열리지만 잠수종은 기지에 붙어 버린다.",
      "survivorArrival": "남은 일행은 열린 두 문을 차례로 지나 건조 통로를 따라 생체 신호가 모인 식당으로 들어간다."
    },
    "bell/crank/fumble": {
      "lossText": "갈라진 축에서 고정핀과 손잡이가 함께 튀어 몸을 세게 때린다. 누리가 마지막 외부 유압을 넣자 접안부의 불이 꺼지고 안쪽 문만 열린다.",
      "survivorArrival": "남은 일행은 누리의 손전등을 따라 잠수종을 떠나 안쪽 통로로 식당까지 피한다."
    },
    "cargo/drain/failure": {
      "lossText": "고정핀으로 받친 밸브가 꺾이며 역류한 물이 몸을 밀쳐 벽에 부딪친다. 미연이 밀어 넣은 청소용 에어백에서 비상 공기가 빠져나간다.",
      "survivorArrival": "남은 일행은 미연의 에어백이 받친 출구로 화물구를 벗어나 건조 통로를 따라 식당으로 간다."
    },
    "cargo/drain/fumble": {
      "lossText": "고정핀 주위의 부식된 축이 깨져 물기둥이 조작하던 자리를 덮친다. 미연이 에어백을 펼치지만 화물 통로와 귀환용 공기는 함께 사라진다.",
      "survivorArrival": "남은 일행은 에어백이 받쳐 준 안쪽 계단으로 빠져나와 식당으로 이어진 뒷계단을 오른다."
    },
    "hydroponics/disconnect/fumble": {
      "lossText": "엉겨 붙은 전선들이 함께 뜯기며 감전 불꽃이 손을 덮친다. 소각과 자동 순환이 모두 꺼지자 백연이 수동 펌프를 붙든다.",
      "survivorArrival": "남은 일행은 수조를 백연에게 맡기고 보육실을 나와, 끊긴 제어의 실마리를 찾으러 복도 끝 중앙 기록실로 간다."
    },
    "signal/pressure-shortcut/failure": {
      "lossText": "고속 분리기의 우회관이 잠기는 대신 거꾸로 열린다. 격벽이 내려오기 전에 바다가 통신실과 공용 통로를 채우고 수압이 몸들을 덮친다.",
      "survivorArrival": "남은 일행은 누리가 표시해 둔 점검 계단 쪽으로 물러나 상승 구획 연결교를 향해 올라간다."
    },
    "signal/pressure-shortcut/fumble": {
      "lossText": "우회관과 비상 격벽의 전원이 함께 풀린다. 통로를 덮친 바닷물이 복원 틀의 유리까지 깨뜨리며 몸과 장비를 몰아친다.",
      "survivorArrival": "남은 일행은 잠긴 공용 통로를 벗어나 점검 계단을 따라 위쪽 상승 구획의 연결교로 향한다."
    },
    "ballast/lift/failure": {
      "lossText": "기중기로 당기던 고정대가 내려앉아 철판이 구조하던 몸을 친다. 누리가 마지막 예비 부력통을 써 은재를 철판 아래에서 빼낸다.",
      "survivorArrival": "남은 일행은 은재를 간호사 도윤에게 맡긴 뒤 누리와 점검 계단을 따라 하부 반응로로 내려간다."
    },
    "ballast/lift/fumble": {
      "lossText": "체인 고리가 뜯어지며 철판이 기중기 앞을 덮친다. 누리가 예비 부력통을 터뜨려 은재를 빼내지만 무너진 고정대는 다시 들리지 않는다.",
      "survivorArrival": "남은 일행은 구해 낸 은재를 간호사 도윤에게 보내고 마지막 복원 틀이 있는 반응로 순환실로 내려간다."
    },
    "ballast/signal/fumble": {
      "lossText": "멈춤 손짓을 놓친 밸브가 보조 탱크의 공기를 비운다. 은재가 비상 밸브로 빠져나오는 사이 밀려든 물이 구조하던 몸을 세게 친다.",
      "survivorArrival": "남은 일행은 은재를 간호사 도윤에게 맡기고 누리가 연 점검문을 지나 반응로 순환실로 내려간다."
    },
    "reactor/listen-cycle/failure": {
      "lossText": "제어기가 입력한 기다림을 건너뛰자 높아진 압력이 일행을 바닥과 배관에 내던진다. 자동 격리관이 반응로를 떼어 내고 수조에는 독립 전지만 남는다.",
      "survivorArrival": "남은 일행은 누리가 연 비상 통로를 따라 떨어져 나가는 반응로에서 벗어나 위쪽 상승 구획 연결교로 올라간다."
    },
    "reactor/listen-cycle/fumble": {
      "lossText": "회수한 압력이 다시 펌프로 밀려들어 은색 관들이 잇달아 터진다. 충격이 일행과 순환도를 덮친 뒤에야 자동 격리관이 반응로를 떼어 낸다.",
      "survivorArrival": "남은 일행은 수조 제어를 더 붙들지 못한 채 누리의 비상 통로로 올라가 상승 구획 앞에 닿는다."
    },
    "reactor/solo-signed-release/failure": {
      "lossText": "끝까지 내리지 못한 차단기의 반동이 손을 찧고 몸을 제어판에 밀어붙인다. 누리가 예비 케이블로 분리를 마치지만, 쓰러진 사람은 작업 기록에 서명하지 못한다.",
      "survivorArrival": "남은 일행은 누리가 연 비상 통로를 통해 반응로를 벗어나 상승 구획의 연결교까지 올라간다."
    },
    "reactor/solo-signed-release/fumble": {
      "lossText": "차단기의 고정쇠가 터져 가슴을 세게 때리고 서명판을 부순다. 누리가 배기 공기와 예비 케이블을 써 반응로의 마지막 연결을 끊는다.",
      "survivorArrival": "남은 일행은 분리되는 반응로에서 누리가 확보한 비상 통로로 빠져나와 상승 구획 앞까지 올라간다."
    },
    "reactor/group-return-lane/failure": {
      "lossText": "통로를 비우던 손에 당겨진 케이블이 튀고 작업 상자가 길을 막는다. 누리가 예비 줄로 반응로를 분리하지만 준비하던 귀환로는 쓸 수 없게 된다.",
      "survivorArrival": "남은 일행은 누리가 새로 연 비상 통로로 방향을 바꾸어 상승 구획 연결교까지 올라간다."
    },
    "reactor/group-return-lane/fumble": {
      "lossText": "빼낸 상자 뒤에서 분리관이 터져 통로에 있던 몸들을 밀쳐 낸다. 누리의 비상 격리가 반응로를 떼어 놓지만 공기와 준비하던 길을 함께 잃는다.",
      "survivorArrival": "남은 일행은 막힌 귀환로 대신 비상 통로를 따라 위로 올라가 상승 구획의 연결교에 닿는다."
    },
    "lifeboat/throw/failure": {
      "lossText": "풀린 캐비닛이 교각을 끌어당겨 발밑의 연결교가 무너진다. 떨어지는 몸을 잡으려던 안전줄마저 끊어져 검은 물속으로 가라앉는다.",
      "survivorArrival": "남은 일행은 누리가 건 보조 줄로 무너진 구간을 건너 상승 구획에 들어가고 바깥 문을 잠근다."
    },
    "lifeboat/throw/fumble": {
      "lossText": "버리려던 캐비닛이 안전줄을 감고 바닥까지 뜯어 낸다. 작업하던 자리가 바다로 꺼지고 예비 부력통에서도 공기가 샌다.",
      "survivorArrival": "남은 일행은 누리의 보조 줄을 붙들고 끊어진 연결교를 건너 상승 구획 안으로 들어가 문을 닫는다."
    },
    "sea-listening-room/repair-relay/fumble": {
      "lossText": "청음실에서 중계기의 역전류가 마지막 기력을 앗아 갔다. 누리가 전원을 끊었을 때 접점 위의 손은 더 움직이지 않았다.",
      "survivorArrival": "남은 동료는 누리에게 청음실의 자리를 알리고, 옆문 너머 복도를 걸어 외벽 관측창으로 옮겼다."
    },
    "sea-release-lock/prepare-outlet/fumble": {
      "lossText": "방류 조작실에서 튀어 오른 손잡이가 마지막 기력을 앗아 갔다. 잠금은 닫힌 채였고, 누리는 반응이 없는 팔에서 손잡이를 떼어 냈다.",
      "survivorArrival": "남은 동료는 누리가 수조의 보조관을 닫는 것을 확인한 뒤, 같은 조작실 안의 최종 응답판으로 옮겼다."
    }
  },
  "dragon-banquet": {
    "gate/solo-test-steam/failure": {
      "lossText": "시험할 은그릇을 너무 가까이 대자 뜨거운 김이 손을 덮친다. 색을 비교하기도 전에 경비가 솥 앞으로 들어와 조사를 막는다.",
      "survivorArrival": "남은 일행은 경비의 안내로 솥 앞에서 물러나 다른 관계자의 말을 들으러 귀빈 응접실에 들어간다."
    },
    "gate/solo-test-steam/fumble": {
      "lossText": "미끄러진 은그릇 사이로 솥의 뜨거운 김이 얼굴과 손을 덮친다. 경비가 시험을 멈추고 재상은 소란의 원인을 묻기 시작한다.",
      "survivorArrival": "남은 일행은 직원의 안내로 솥에서 떨어져 왕녀가 마련한 귀빈 응접실로 옮겨 다른 단서를 찾는다."
    },
    "gate/group-hold-lid/failure": {
      "lossText": "받치던 뚜껑이 미끄러져 뜨거운 가장자리가 팔을 누른다. 경비가 주방 문 앞을 막자 솥의 김이 그 사이로 새어 나온다.",
      "survivorArrival": "남은 일행은 막힌 주방으로 더 들어가지 않고 귀빈 응접실로 가 푸른 김에 관한 다른 설명을 구한다."
    },
    "gate/group-hold-lid/fumble": {
      "lossText": "받치던 솥뚜껑이 넘어지며 뜨거운 김이 몸을 덮친다. 경비가 솥 앞을 비우라고 외치고 직원들이 구호용 천을 들고 달려온다.",
      "survivorArrival": "남은 일행은 직원들을 따라 솥 앞에서 물러나 왕녀가 연 응접실로 들어가 재료를 아는 사람을 찾는다."
    },
    "dragon/group-test-hearth/failure": {
      "lossText": "시험 화로의 열이 한쪽 받침에 몰려 손과 팔을 태운다. 아르단이 불을 멈추고 도면을 펴지만 시험도 예산 승인도 끝나지 않는다.",
      "survivorArrival": "남은 일행은 원본 도면을 받아 왕의 대기실을 나서고 막힌 굴뚝을 봐 달라는 전갈을 따라 배출구로 간다."
    },
    "dragon/group-test-hearth/fumble": {
      "lossText": "막힌 구멍에 닿은 불이 되튀어 화로를 받친 몸을 덮친다. 왕이 급히 불을 거두고 시종이 구호 상자를 펼치자 시험은 그대로 중단된다.",
      "survivorArrival": "남은 일행은 왕이 건넨 원본 도면만 챙겨 대기실을 떠나고 과열 경보가 울리는 연회장 배출 굴뚝으로 간다."
    },
    "kitchen/cook-team/fumble": {
      "lossText": "화덕 손잡이를 잡는 순간 솥이 기울어 뜨거운 김이 손과 몸을 덮친다. 피프가 솥을 받치는 동안 기술자의 차단 요청이 주방을 가른다.",
      "survivorArrival": "남은 일행은 피프에게 조리대를 맡기고 기술자가 부르는 대형 화덕 쪽으로 가 압력계를 마주한다."
    },
    "ovens/restore-plan/failure": {
      "lossText": "도면에 넣을 치수를 재는 사이 과열된 배관이 몸에 닿는다. 델이 불을 줄이고 바닥에 떨어진, 아직 계산을 마치지 못한 도면을 줍는다.",
      "survivorArrival": "남은 일행은 델에게 원본 도면을 받아 뜨거운 배관 곁을 벗어나 구호 자리가 있는 시식실로 간다."
    },
    "ovens/restore-plan/fumble": {
      "lossText": "압력계 가까이 몸을 기울이는 순간 배관에서 뜨거운 기류가 터진다. 델이 화력을 낮추지만 도면을 받치던 자리에는 열기가 오래 남는다.",
      "survivorArrival": "남은 일행은 델이 챙긴 미완성 도면을 받아 그의 안내로 화덕을 떠나 시식실 구호 자리로 간다."
    },
    "ovens/stabilize-fire/failure": {
      "lossText": "압력을 빼던 이음새에서 뜨거운 증기가 쏟아져 밸브 앞의 몸을 덮친다. 델이 비상 밸브를 닫자 서랍의 대체 도면이 바람에 떨린다.",
      "survivorArrival": "남은 일행은 델이 내민 도면을 챙겨 화덕 통로에서 빠져나와 구호대가 기다리는 시식실로 옮겨 간다."
    },
    "ovens/stabilize-fire/fumble": {
      "lossText": "덜 식은 이음쇠가 벌어지며 고압 증기가 조작하던 자리를 집어삼킨다. 델이 비상 밸브를 닫을 때까지 화덕 앞은 한 치 앞도 보이지 않는다.",
      "survivorArrival": "남은 일행은 델이 지킨 도면을 가지고 화덕을 벗어나 불사조 재 항아리가 있는 시식실로 간다."
    },
    "chimney/open-plug/failure": {
      "lossText": "수정 마개를 잡으려는 순간 외벽 발판이 부서진다. 추락한 몸이 아래 장식물에 부딪치고 직원들이 굴뚝 곁에 구조줄을 내린다.",
      "survivorArrival": "남은 일행은 직원들의 구조줄을 짚고 열린 보조 창을 통해 준비 회랑으로 돌아간다."
    },
    "chimney/open-plug/fumble": {
      "lossText": "갈라진 발판 위로 균형추가 쏠리며 작업하던 몸을 밀어 떨어뜨린다. 수정 마개가 다시 닫히고 성 안에 굴뚝 경보가 번진다.",
      "survivorArrival": "남은 일행은 직원들이 내린 구조줄과 비상 창을 이용해 굴뚝 외벽을 벗어나 준비 회랑으로 돌아간다."
    },
    "chimney/split-heat/failure": {
      "lossText": "열을 나누던 밸브가 터져 뜨거운 증기가 굴뚝 안의 몸들을 훑는다. 직원들이 비상 창을 열어 압력이 더 쌓이는 것을 막는다.",
      "survivorArrival": "남은 일행은 증기가 빠져나가는 쪽을 피해 직원들이 열어 둔 문으로 준비 회랑에 돌아간다."
    },
    "chimney/split-heat/fumble": {
      "lossText": "닫힌 배관으로 몰린 열이 안전 밸브를 부수고 굴뚝 안을 덮친다. 직원들이 보조 창을 모두 연 뒤에야 압력계가 내려오기 시작한다.",
      "survivorArrival": "남은 일행은 직원들의 안내를 받아 뜨거운 배관에서 떨어져 준비 회랑으로 물러난다."
    },
    "chimney/direct-flame/failure": {
      "lossText": "늦게 열린 직결문 틈으로 열기가 새어 들어 안전벽 안의 몸들을 태운다. 바깥 직원들이 차단기를 내리지만 새 화덕에는 불이 붙지 않는다.",
      "survivorArrival": "남은 일행은 차단된 직결문에서 떨어져 준비 회랑으로 돌아가, 왕실 화염 없이 식사를 마련할 방법을 찾는다."
    },
    "chimney/direct-flame/fumble": {
      "lossText": "거꾸로 열린 직결문에서 화염이 밀려와 안전벽 안을 가득 채운다. 만찬 종이 멎고 바깥 직원들이 달아오른 벽의 해제 장치를 붙든다.",
      "survivorArrival": "남은 일행은 직원들이 연 비상 출구를 통해 굴뚝에서 벗어나 준비 회랑으로 물러난다."
    },
    "bell/new-service/fumble": {
      "lossText": "옮기던 뜨거운 그릇이 손에서 미끄러져 몸에 쏟아진다. 경비가 상 교체를 멈추자 도란이 이전 국까지 거두어 손님들의 손이 닿지 않게 한다.",
      "survivorArrival": "남은 일행은 비워진 식탁 쪽 문으로 연회장에 들어가 음식 교체가 중단된 사정을 설명하려 한다."
    },
    "winter-yard/clear-shed-door/fumble": {
      "lossText": "안뜰의 썰매 날이 눈 위에서 미끄러지고, 기울어진 차체가 창고 문 앞을 거세게 친다.",
      "survivorArrival": "모스가 썰매에 돌을 받친다. 남은 일행은 옆 통로로 돌아 작은 문을 통해 땔감 창고 안으로 들어간다."
    },
    "fuel-house/prepare-winter-rooms/fumble": {
      "lossText": "땔감 창고의 시험 난로 뚜껑이 튀고, 달아오른 손잡이와 불티가 가까운 몸을 덮친다.",
      "survivorArrival": "모스가 불을 끈다. 남은 일행은 창고 안쪽 계단으로 내려가, 연기가 닿지 않는 아래층 회랑에 도착한다."
    },
    "fuel-house/load-winter-sleds/fumble": {
      "lossText": "땔감 창고에서 묶음 끈이 끊어지고, 기울어진 썰매 위의 장작이 바닥으로 쏟아진다.",
      "survivorArrival": "모스가 수레를 고정하고 통로를 연다. 남은 일행은 창고 안쪽 계단을 내려가 아래층 회랑에 도착한다."
    },
    "lower-hall/test-winter-flues/fumble": {
      "lossText": "아래층 객실에서 열린 댐퍼가 묵은 재를 토하고, 역류한 연기가 얼굴 높이를 가득 채운다.",
      "survivorArrival": "델이 시험 불을 끄고 복도 창을 연다. 남은 일행은 객실을 벗어나 계단 아래의 왕궁 남문으로 나온다."
    }
  },
  "clock-city": {
    "square/tram-first/fumble": {
      "lossText": "팽팽하던 비상 제동줄이 끊어져 손목과 몸을 후려친다. 윤의 정지판이 앞바퀴를 받지만 창문 속 승객들의 손은 더 멀어진다.",
      "survivorArrival": "남은 일행은 윤이 바퀴를 붙든 동안 광장에서 전차 옆 점검판으로 내려가 승객들을 구할 문을 찾는다."
    },
    "square/alley-first/fumble": {
      "lossText": "안전줄을 건 빵집 문짝이 접히며 어깨를 세게 친다. 창살을 붙든 주인이 손을 내미는 사이 출구는 단단한 벽으로 변한다.",
      "survivorArrival": "남은 일행은 닫힌 출구를 돌아 백색 우편 골목으로 들어가 빵집 창문에 닿을 다른 길을 찾는다."
    },
    "square/solo-name-appeal/fumble": {
      "lossText": "이름을 다시 접수하려는 사이 팽팽해진 줄이 손목을 후려친다. 윤이 빈 접수창을 끄고 전차 앞바퀴에 철제 정지판을 끼운다.",
      "survivorArrival": "남은 일행은 윤의 제동 신호를 따라 전차 옆으로 내려가 아직 내리지 못한 승객들에게 다가간다."
    },
    "square/group-route-mark/fumble": {
      "lossText": "표지를 새기던 문틀이 접히며 손을 찍는다. 문과 함께 틀어진 화살표 위로 윤의 전차 제동 신호가 들려온다.",
      "survivorArrival": "남은 일행은 지워지는 표지를 따라가지 않고 윤의 신호 쪽으로 돌아서 전차의 열린 점검판 앞에 선다."
    },
    "tram/brake/failure": {
      "lossText": "고정쐐기를 밀어 넣은 축이 비틀리며 손을 찧는다. 세란이 비상 차창을 열어 승객들을 내보내지만 보조 바퀴는 고정되지 않는다.",
      "survivorArrival": "남은 일행은 세란이 건넨 외곽 선로 도면을 따라 전차에서 물러나 여섯 승객과 기록관 현관으로 간다."
    },
    "tram/brake/fumble": {
      "lossText": "쐐기 받침이 뜯어져 제동 장치 앞의 몸을 세게 때린다. 세란이 연 비상 차창으로 여섯 승객이 기어 나오는 동안 차체는 계속 흔들린다.",
      "survivorArrival": "전차에서 벗어난 승객들을 따라 남은 일행은 옛 선로를 걸어 기록관 현관으로 물러난다."
    },
    "tram/guide/fumble": {
      "lossText": "서로 다른 박자로 닫히는 문턱이 승객을 받치던 팔과 몸을 조인다. 세란이 차창을 깨고 남은 승객들의 손을 하나씩 받아 낸다.",
      "survivorArrival": "여섯 승객이 전차를 빠져나오자 남은 일행도 그들과 함께 비를 피할 기록관으로 걸어간다."
    },
    "alley/present-door/fumble": {
      "lossText": "분필을 대던 문틀이 닫히며 손을 찍고 몸을 벽에 밀어붙인다. 표시는 사라지고 창문 아래에는 준우의 사다리만 남는다.",
      "survivorArrival": "남은 일행은 준우가 사다리로 데리고 나온 주민들을 따라 골목 끝 기록관으로 들어간다."
    },
    "vault/separate/fumble": {
      "lossText": "전원선과 고정선을 함께 당기자 날카로운 전자판이 손등을 가른다. 원본과 도면은 유리 뒤로 접히고 거부 조항 한 장만 서랍 밖에 떨어진다.",
      "survivorArrival": "남은 일행은 남겨진 거부 조항을 챙겨 황동 보관실을 나와 주민들의 뜻을 물으러 의회 현관으로 간다."
    },
    "roof/bind/failure": {
      "lossText": "종추를 감은 사슬이 끊어져 지붕 위의 몸들을 난간에 내던진다. 첫 종소리가 울리는 사이 점검문이 흔들리며 벌어진다.",
      "survivorArrival": "남은 일행은 열린 점검문을 붙들고 지붕에서 시계탑 안으로 넘어가 시간 금고에 들어선다."
    },
    "roof/bind/fumble": {
      "lossText": "당긴 사슬에 기둥까지 뽑혀 나와 지붕 위를 덮친다. 종이 한 번 울리고 윤이 점검문에서 손을 뻗는다.",
      "survivorArrival": "남은 일행은 윤이 붙들어 준 점검문을 통해 지붕을 벗어나 시간 금고 안으로 들어간다."
    },
    "roof/cross/failure": {
      "lossText": "발을 디딘 지붕이 어제 속으로 접히며 건너던 몸이 빈 공간으로 떨어진다. 안전줄의 끝도 붙어 있을 오늘의 발판을 찾지 못한다.",
      "survivorArrival": "남은 일행은 윤이 연 우회 점검문을 지나 시간 금고로 들어가 반환구를 찾는다."
    },
    "roof/cross/fumble": {
      "lossText": "뛰어든 순간 발판과 줄 고정대가 함께 과거로 사라진다. 빈 지붕 사이로 몸이 떨어지고 윤이 비상 사다리를 풀어 내린다.",
      "survivorArrival": "남은 일행은 윤이 내린 사다리로 남은 점검문에 닿아 시간 금고의 반환구를 향해 들어간다."
    },
    "gearworks/remove/failure": {
      "lossText": "뽑으려던 갱신 축이 뜨겁게 튀어 파편을 날린다. 기계실 바닥에 금속이 쏟아지고 황동 안전 링은 꺼진 채 남는다.",
      "survivorArrival": "남은 일행은 윤이 연 우회 통로의 계단을 올라 위층 시간 금고에서 남은 분리 방법을 찾는다."
    },
    "gearworks/remove/fumble": {
      "lossText": "축을 당긴 순간 남은 톱니가 파편을 뿜어 작업하던 자리를 덮친다. 황동 안전 링의 손잡이에는 아무 움직임도 돌아오지 않는다.",
      "survivorArrival": "남은 일행은 윤의 우회 계단을 따라 구동 기계실을 떠나 위층 시간 금고로 올라간다."
    },
    "gearworks/crank/failure": {
      "lossText": "쐐기가 받친 고정핀이 부러져 조작하던 손과 몸을 때린다. 멎은 링 아래로 떨어진 핀 조각에 위층 제어기의 홈과 같은 모양이 드러난다.",
      "survivorArrival": "남은 일행은 핀 조각을 챙겨 윤의 우회 계단을 오르고 시간 금고에서 다른 조작 방법을 찾는다."
    },
    "gearworks/crank/fumble": {
      "lossText": "쐐기를 밀어 넣은 홈이 깨지며 되튄 손잡이가 가슴을 친다. 돌지 못한 안전 링 뒤에서 윤이 위층 제어기 쪽을 가리킨다.",
      "survivorArrival": "남은 일행은 부서진 손잡이를 놓고 윤이 가리킨 우회 계단으로 올라 시간 금고에 들어선다."
    },
    "gearworks/anchor-shortcut/failure": {
      "lossText": "맞추려던 입장 순간들이 반환 연동기 안에서 하나의 빈칸으로 겹친다. 그 빛이 현재의 몸과 돌아올 기록의 경계를 함께 지운다.",
      "survivorArrival": "남은 일행은 연동기의 빛에서 빠져나와 연결된 심의석 문턱으로 건너가고, 기계실 쪽 연결을 놓는다."
    },
    "gearworks/anchor-shortcut/fumble": {
      "lossText": "기준 시각을 읽기 전에 연동기가 빈칸을 일행의 입장 기록으로 확정한다. 몸의 윤곽과 반환 기록이 함께 흐려지며 안전 링의 불도 꺼진다.",
      "survivorArrival": "남은 일행은 열린 심의석 쪽으로 연동기의 문턱을 넘어 시간 금고 안에 몸을 옮긴다."
    },
    "still-platform/restore-return-track/fumble": {
      "lossText": "반환 승강장에서 받침대가 기울고, 잠금쇠를 받치던 철봉이 사람 쪽으로 튀어 오른다.",
      "survivorArrival": "준우가 수동 손잡이를 놓고 전차를 멈춘다. 남은 일행은 옆 점검문을 지나 주소 서가로 들어간다."
    },
    "still-platform/clear-return-carriage/fumble": {
      "lossText": "반환 전차의 뒷칸에서 쌓인 철제 상자가 무너지고, 막힌 통로 쪽으로 모서리가 쏟아진다.",
      "survivorArrival": "준우가 남은 상자를 고정한다. 남은 일행은 전차에서 내려 옆 점검문을 지나 주소 서가로 피한다."
    }
  },
  "snow-radio": {
    "hut/power-first/fumble": {
      "lossText": "받치던 난방 배관이 떨어져 팔과 몸을 친다. 담요 틈으로 증기가 새고 젖은 발전실 통로가 얼어붙기 시작한다.",
      "survivorArrival": "남은 일행은 아직 움직이는 수동 레버로 발전실 문을 열고 안으로 들어가 주 배전반을 찾는다."
    },
    "hut/signal-first/fumble": {
      "lossText": "밀어 올리던 얼음 덮개가 깨져 팔을 때리고 외부 점검구를 다시 막는다. 무너진 눈 너머로 안테나의 진동음만 들린다.",
      "survivorArrival": "남은 일행은 바깥 진입을 멈추고 발전실의 수동 문을 열어, 얼음을 녹일 전력을 찾으러 안으로 들어간다."
    },
    "generator/reroute/failure": {
      "lossText": "연결한 축전지에서 역류한 불꽃이 손과 몸을 친다. 난방선은 켜지지 않고 휴대 전지를 쓰는 무전기만 낮게 울린다.",
      "survivorArrival": "남은 일행은 무전기와 구조 지도를 챙겨 발전실 바깥 문을 나서고 가람의 좌표와 지하 길이 갈리는 눈밭으로 간다."
    },
    "generator/reroute/fumble": {
      "lossText": "축전지 접점과 보호판이 함께 타며 조작하던 팔을 세게 때린다. 전지의 불꽃이 꺼진 뒤에도 난방선에는 전력이 돌아오지 않는다.",
      "survivorArrival": "남은 일행은 타 버린 전지를 남기고 휴대 무전기를 챙겨 밖으로 나가, 지하 입구를 찾을 눈길의 갈림점에 닿는다."
    },
    "generator/crank/failure": {
      "lossText": "당기던 고정대가 부러져 얼음 조각이 몸을 덮친다. 끊어지는 출력 틈에 휴대 난방기만 충전되고 방의 온기는 돌아오지 않는다.",
      "survivorArrival": "남은 일행은 충전된 휴대 난방기를 챙겨 발전실을 나서고 구조 지도에 표시된 눈길의 갈림점으로 간다."
    },
    "generator/crank/fumble": {
      "lossText": "고정대가 통째로 부러져 튄 금속 조각이 옷을 뚫는다. 미완성 배전반 옆에서 휴대 난방기 한 대만 작은 불을 켠다.",
      "survivorArrival": "남은 일행은 휴대 난방기를 가지고 바깥으로 나가 지하의 바람막이를 찾을 갈림길까지 걸어간다."
    },
    "antenna/climb/failure": {
      "lossText": "반사판에 손을 뻗는 순간 녹슨 난간 고정대가 부러진다. 추락하는 몸을 받쳐야 할 안전줄까지 발판에서 떨어져 나온다.",
      "survivorArrival": "남은 일행은 단말기에 남은 좌표를 확인한 뒤 안테나를 떠나 지하 입구로 이어지는 눈밭의 갈림길로 간다."
    },
    "antenna/climb/fumble": {
      "lossText": "돌풍에 반사판과 난간이 함께 떨어져 작업하던 몸을 밀어 낸다. 끊어진 전선이 눈밭에 흩어지고 안테나의 불도 꺼진다.",
      "survivorArrival": "남은 일행은 구조 지도의 두 길을 찾아 안테나 아래에서 물러나고 지하 기지로 향하는 갈림점에 선다."
    },
    "cableway/secure/failure": {
      "lossText": "낡은 윈치가 당기던 힘을 놓아 튀어 오른 케이블이 몸을 친다. 붙들지 못한 정비 발판이 다시 바람에 흔들린다.",
      "survivorArrival": "남은 일행은 아래 난간에 개인 보조 줄을 걸어 지하 검문소까지 내려가지만 뒤따를 대피로는 남기지 못한다."
    },
    "cableway/secure/fumble": {
      "lossText": "도르래를 받치던 지지대가 뜯겨 케이블이 조작하던 자리를 후려친다. 고정하려던 발판과 윈치가 눈바람 속에서 따로 흔들린다.",
      "survivorArrival": "남은 일행은 개인 줄을 아래 난간에 걸어 부서진 대피로를 피해 내려가고 지하 검문소 문을 연다."
    },
    "cableway/balance/failure": {
      "lossText": "발을 디딘 정비판이 무너지며 몸이 아래로 떨어진다. 안전줄이 추락을 멈추지만 얼음벽에 부딪히는 충격까지 막지는 못한다.",
      "survivorArrival": "남은 일행은 남아 있는 난간과 안전줄을 따라 낮은 발판으로 옮겨 지하 검문소 안으로 들어간다."
    },
    "cableway/balance/fumble": {
      "lossText": "마지막 발판과 줄 받침이 함께 떨어져 몸이 얼음벽을 친다. 아래 난간에는 별도로 걸린 보조 줄만 바람에 흔들린다.",
      "survivorArrival": "남은 일행은 아래 난간의 보조 줄을 타고 검문소에 닿아 안쪽의 복원 장치로 갈 길을 찾는다."
    },
    "crevasse/person-first/failure": {
      "lossText": "배낭 고리를 끊자 얼음턱이 내려앉는다. 가람은 보조 줄로 먼저 올라오지만 뒤따르던 구조자의 몸이 얼음벽에 부딪친다.",
      "survivorArrival": "남은 일행은 가람이 펼친 수첩의 경로를 따라 빙하 틈을 벗어나 지하 검문소로 내려간다."
    },
    "crevasse/person-first/fumble": {
      "lossText": "끊어진 고리 아래 얼음이 꺼져 가람을 받치던 몸이 줄에 매달린다. 먼저 올라온 가람이 줄을 고정해도 얼음턱에 부딪힌 충격은 크다.",
      "survivorArrival": "남은 일행은 기록 배낭을 포기하고 가람이 가리킨 아래 통로로 돌아 지하 검문소에 피한다."
    },
    "crevasse/both/failure": {
      "lossText": "가람을 첫 줄로 올린 뒤 배낭을 받치던 얼음이 깨진다. 두 번째 줄을 잡은 몸과 실종자들의 사본이 빙하 틈 아래로 떨어진다.",
      "survivorArrival": "남은 일행은 구해 낸 가람의 안내를 따라 빙하 틈을 떠나 복원 틀로 이어지는 지하 검문소로 간다."
    },
    "crevasse/both/fumble": {
      "lossText": "두 줄 사이의 얼음 고정점이 갈라진다. 가람이 먼저 올라선 뒤 배낭 쪽 발판이 무너져 구조하던 몸과 기록 사본이 아래로 떨어진다.",
      "survivorArrival": "남은 일행은 가람이 내민 수첩을 따라 아래 통로를 찾아 지하 검문소로 내려간다."
    },
    "ward/inside-control/failure": {
      "lossText": "새 접점이 닿자 낡은 제어기가 불꽃을 뿜어 손과 몸을 태운다. 중단 회로는 이어지지 않고 자동 시작만 꺼진 채 의식 보관함의 불빛이 남는다.",
      "survivorArrival": "남은 일행은 남아 있는 의식 보관함을 두고 병동의 안쪽 연결문을 지나 다른 전력 경로를 찾을 송신실로 간다."
    },
    "ward/inside-control/fumble": {
      "lossText": "단락된 제어기에서 역전류가 흘러 팔을 세게 태우고 복원 틀 두 개를 꺼뜨린다. 자동 시작이 차단된 병동에는 의식 보관함만 빛을 유지한다.",
      "survivorArrival": "남은 일행은 꺼진 복원 틀 곁에서 공구를 거두고 안쪽 문을 지나 송신실의 다른 배선을 찾아간다."
    },
    "ward/solo-return-request/fumble": {
      "lossText": "중단선을 건드린 순간 튄 불꽃이 손과 몸을 친다. 녹음기는 꺼지고 이안이 붙든 의식 보관함의 예비 전원만 남는다.",
      "survivorArrival": "남은 일행은 고치지 못한 선의 다른 끝을 찾으러 병동의 연결문을 지나 송신실로 들어간다."
    },
    "ward/group-empty-answers/failure": {
      "lossText": "손잡이 선을 잇던 공구가 미끄러져 접점의 불꽃이 손을 덮친다. 이안이 보관함을 지키지만 안쪽 중단 손잡이는 끊긴 채 남는다.",
      "survivorArrival": "남은 일행은 병동 안쪽 연결문을 넘어 송신실 분배판으로 가서 다른 연결 방법을 찾는다."
    },
    "ward/group-empty-answers/fumble": {
      "lossText": "중단 손잡이를 당긴 순간 역전류가 팔과 가슴을 때린다. 이안이 보관함 전원을 떼어 의식을 지키지만 제어선은 다시 이어지지 않는다.",
      "survivorArrival": "남은 일행은 복원 틀에서 물러나 안쪽 문을 지나 송신실로 들어가 남아 있는 배선을 살핀다."
    },
    "transmitter/split/failure": {
      "lossText": "세 갈래로 나누던 분배판에서 충격파가 터져 송신실의 몸들을 내던진다. 차단기가 폭발을 막은 뒤 난방등까지 모두 꺼진다.",
      "survivorArrival": "남은 일행은 송신실 옆 복도로 나가 소미가 연 대피소 문 안으로 피한다."
    },
    "transmitter/split/fumble": {
      "lossText": "빠진 접지선에서 냉각 충격이 번져 송신실 바닥부터 몸들을 덮친다. 망가진 분배판 뒤로 난방 전력도 끊긴다.",
      "survivorArrival": "남은 일행은 벽을 짚고 송신실에서 복도로 나온 뒤 기침 소리가 나는 대피소 문을 두드려 안으로 들어간다."
    },
    "shelter/share-power/failure": {
      "lossText": "나눠 넣은 전력이 모자라 난방이 꺼지고 대피소 안의 체온이 빠르게 떨어진다. 소미는 삭제 승인서를 내려놓고 휴대 난로부터 모은다.",
      "survivorArrival": "남은 일행은 소미가 내준 휴대 난로를 받아 그녀가 연 안쪽 문을 지나 수동 중계실로 피한다."
    },
    "shelter/share-power/fumble": {
      "lossText": "전원을 끄는 순서가 앞당겨져 냉기가 발밑부터 밀려온다. 감각을 잃어 가는 손들 사이에서 소미가 휴대 난로를 들어 올린다.",
      "survivorArrival": "남은 일행은 소미가 모은 난로를 챙겨 열린 안쪽 문으로 넘어가 수동 중계실로 피한다."
    },
    "snow-post-room/repair-case/fumble": {
      "lossText": "우편실에서 보관함의 역전류가 마지막 온기를 앗아 갔다. 꺼진 보온판 옆에 미배달 목록이 떨어졌고, 그 위로 뻗은 손은 멎었다.",
      "survivorArrival": "남은 동료는 우편실 전원을 끊고 떨어진 목록을 챙겨, 벽 너머 청취 부스로 옮겼다."
    },
    "snow-carry-room/move-anchors/fumble": {
      "lossText": "인계 준비실의 시험 접점에서 튄 전류가 마지막 기력을 앗아 갔다. 원래 보관함의 불은 켜져 있었지만, 휴대함을 받친 손은 더 움직이지 않았다.",
      "survivorArrival": "남은 동료는 소미에게 원본 연결을 확인받고, 인계 준비실 옆 방풍문을 지나 대기실로 옮겼다."
    }
  }
};
