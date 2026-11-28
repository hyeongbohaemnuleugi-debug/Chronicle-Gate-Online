/** Explicit story identities and atlas cells. Each active addition has its own illustration.
 * Crops are presentation only; neither art nor translated labels decide gameplay. */
export const NEW_ENEMY_APPEARANCES = Object.freeze({
  "train-tag-beast": {
    "id": "train-tag-beast",
    "campaignId": "last-train",
    "name": "짐표를 두른 분실물 짐승",
    "alt": "낡은 여행 가방과 접힌 우산이 네 발로 뭉친 짐승. 목에 달린 짐표들을 지키려 합니다. 가방 끈을 풀어 흩어 놓으면 주저앉으며, 살아 있는 승객이 변한 모습은 아닙니다.",
    "kind": "creature",
    "accent": "#d3ae6d",
    "motion": "stalk",
    "src": "/game/art/enemies/last-train-v24.webp?v=24000",
    "crop": {
      "columns": 2,
      "rows": 2,
      "index": 0
    }
  },
  "train-track-blockade": {
    "id": "train-track-blockade",
    "campaignId": "last-train",
    "name": "관제 선로 봉쇄조",
    "alt": "남색 철도 작업복과 호박빛 손전등을 든 실제 관제 요원들. 무단 분기 조작으로 사고가 날까 두려워 긴 절연 봉과 접이 방벽으로 길을 막습니다. 대열과 장비를 무력화하면 물러납니다.",
    "kind": "person",
    "accent": "#d3ae6d",
    "motion": "stalk",
    "src": "/game/art/enemies/human-opponents-v24.webp?v=24000",
    "crop": {
      "columns": 3,
      "rows": 3,
      "index": 0
    }
  },
  "train-voice-moth": {
    "id": "train-voice-moth",
    "campaignId": "last-train",
    "name": "목소리를 삼킨 방송나방",
    "alt": "녹음테이프 날개와 검은 솜털을 가진 나방. 버려진 안내의 끝마디를 먹으며, 크게 말할수록 목소리를 향해 날아듭니다.",
    "kind": "creature",
    "accent": "#d3ae6d",
    "motion": "hover",
    "src": "/game/art/enemies/last-train-v24.webp?v=24000",
    "crop": {
      "columns": 2,
      "rows": 2,
      "index": 2
    }
  },
  "train-sleeper-spider": {
    "id": "train-sleeper-spider",
    "campaignId": "last-train",
    "name": "침목 아래의 신호거미",
    "alt": "침목 조각과 신호봉으로 이루어진 여덟 다리의 거미. 버려진 구리선으로 진동을 느끼며, 등에는 금 간 신호등이 달렸습니다.",
    "kind": "creature",
    "accent": "#d3ae6d",
    "motion": "stalk",
    "src": "/game/art/enemies/last-train-v24.webp?v=24000",
    "crop": {
      "columns": 2,
      "rows": 2,
      "index": 3
    }
  },
  "hotel-night-security": {
    "id": "hotel-night-security",
    "campaignId": "glass-hotel",
    "name": "유리 호텔 야간 보안반",
    "alt": "바랜 자주색 제복과 황동 명찰을 단 실제 호텔 보안 직원들. 주인의 봉쇄 지시와 동료들의 기록을 지켜야 한다는 마음 사이에서 서 있습니다. 수하물 방패와 짧은 봉을 쓰며 무장해제되면 추격을 멈춥니다.",
    "kind": "person",
    "accent": "#b9b1d6",
    "motion": "stalk",
    "src": "/game/art/enemies/human-opponents-v24.webp?v=24000",
    "crop": {
      "columns": 3,
      "rows": 3,
      "index": 1
    }
  },
  "hotel-glass-bellkeeper": {
    "id": "hotel-glass-bellkeeper",
    "campaignId": "glass-hotel",
    "name": "유리 날개 종지기",
    "alt": "샹들리에 조각이 날개처럼 펼쳐진 종지기. 작은 서비스 종이 몸통에 매달려 있으며 종을 칠 때마다 유리 날개가 닫힙니다.",
    "kind": "creature",
    "accent": "#b9b1d6",
    "motion": "hover",
    "src": "/game/art/enemies/glass-hotel-v24.webp?v=24000",
    "crop": {
      "columns": 2,
      "rows": 2,
      "index": 1
    }
  },
  "hotel-clockwork-magpie": {
    "id": "hotel-clockwork-magpie",
    "campaignId": "glass-hotel",
    "name": "시간표를 쪼는 태엽까치",
    "alt": "검은 깃과 시곗바늘 꼬리를 가진 황동 자동인형. 직원의 빈 시간을 작업 예약으로 채우려 하며 가슴의 태엽이 빠르게 되감깁니다.",
    "kind": "creature",
    "accent": "#b9b1d6",
    "motion": "hover",
    "src": "/game/art/enemies/glass-hotel-v24.webp?v=24000",
    "crop": {
      "columns": 2,
      "rows": 2,
      "index": 2
    }
  },
  "hotel-key-warden": {
    "id": "hotel-key-warden",
    "campaignId": "glass-hotel",
    "name": "객실 열쇠의 문지기",
    "alt": "큰 열쇠 고리와 황동 객실 열쇠들이 문지기 형태로 매달린 존재. 빈 고리가 몸통이고 열쇠 다발이 팔과 치마를 이룹니다. 얼굴이나 살아 있는 몸은 없습니다.",
    "kind": "creature",
    "accent": "#b9b1d6",
    "motion": "hover",
    "src": "/game/art/enemies/glass-hotel-v24.webp?v=24000",
    "crop": {
      "columns": 2,
      "rows": 2,
      "index": 3
    }
  },
  "market-pier-enforcers": {
    "id": "market-pier-enforcers",
    "campaignId": "moon-market",
    "name": "나루 통행세 징수꾼",
    "alt": "기운 방수 외투와 젖은 장화를 신은 인간 징수꾼들. 맡았던 발판 수리비를 핑계로 공동 나루를 사유화하려 합니다. 긴 배 갈고리와 그물로 길을 막으며 대열이 무너지면 달아납니다.",
    "kind": "person",
    "accent": "#ceb18b",
    "motion": "stalk",
    "src": "/game/art/enemies/human-opponents-v24.webp?v=24000",
    "crop": {
      "columns": 3,
      "rows": 3,
      "index": 2
    }
  },
  "market-paper-serpent": {
    "id": "market-paper-serpent",
    "campaignId": "moon-market",
    "name": "장부를 감은 종이구렁이",
    "alt": "반납된 빈 장부와 붉은 밀랍 봉인이 긴 몸으로 엮인 구렁이. 젖는 것을 피하려 하역문을 휘감고 있습니다. 달의 원본 계약과는 다른 창고용 빈 종이입니다.",
    "kind": "creature",
    "accent": "#ceb18b",
    "motion": "stalk",
    "src": "/game/art/enemies/moon-market-v24.webp?v=24000",
    "crop": {
      "columns": 2,
      "rows": 2,
      "index": 1
    }
  },
  "market-shadow-fox": {
    "id": "market-shadow-fox",
    "campaignId": "moon-market",
    "name": "등불 기름을 핥는 그림자여우",
    "alt": "젖은 먹빛 털과 세 갈래 리본 꼬리를 가진 그림자 짐승. 등불 기름과 빛에 붙은 작은 소원을 먹습니다. 밝은 곳을 벗어나면 몸이 얇아집니다.",
    "kind": "creature",
    "accent": "#ceb18b",
    "motion": "stalk",
    "src": "/game/art/enemies/moon-market-v24.webp?v=24000",
    "crop": {
      "columns": 2,
      "rows": 2,
      "index": 2
    }
  },
  "market-wish-crab": {
    "id": "market-wish-crab",
    "campaignId": "moon-market",
    "name": "소원표를 두른 강게",
    "alt": "젖은 소원표와 붉은 끈을 등딱지에 두른 큰 강게. 물에 떠내려온 표를 모아 보호하지만 끝난 부탁과 남은 부탁을 가리지 않습니다.",
    "kind": "creature",
    "accent": "#ceb18b",
    "motion": "stalk",
    "src": "/game/art/enemies/moon-market-v24.webp?v=24000",
    "crop": {
      "columns": 2,
      "rows": 2,
      "index": 3
    }
  },
  "sea-quarantine-team": {
    "id": "sea-quarantine-team",
    "campaignId": "deep-sea",
    "name": "본사 격리 집행반",
    "alt": "회청색 밀폐 작업복 안에 사람이 들어 있는 본사 검역 요원들. 외부 장비를 모두 검사하라는 명령으로 구조대까지 대기시킵니다. 넓은 제압 집게와 이동 차수판을 쓰며 장비를 잃으면 물러납니다.",
    "kind": "person",
    "accent": "#90c5bd",
    "motion": "stalk",
    "src": "/game/art/enemies/human-opponents-v24.webp?v=24000",
    "crop": {
      "columns": 3,
      "rows": 3,
      "index": 3
    }
  },
  "sea-armored-eel": {
    "id": "sea-armored-eel",
    "campaignId": "deep-sea",
    "name": "구명줄을 감은 철갑장어",
    "alt": "검푸른 갑옷 비늘과 청록 발광선을 가진 큰 장어. 연결교 아래 물길로 들어와 떠내려온 주황 구명줄에 몸이 감겼습니다. 줄을 당길수록 더 세게 버팁니다.",
    "kind": "creature",
    "accent": "#90c5bd",
    "motion": "hover",
    "src": "/game/art/enemies/deep-sea-v24.webp?v=24000",
    "crop": {
      "columns": 2,
      "rows": 2,
      "index": 1
    }
  },
  "sea-pipe-crab": {
    "id": "sea-pipe-crab",
    "campaignId": "deep-sea",
    "name": "압력관을 기는 관따개게",
    "alt": "부식된 배관 마개를 등딱지로 쓰는 게. 한 집게는 렌치처럼, 다른 집게는 절단기처럼 휘었습니다. 침전물을 먹으려고 작은 배수관을 벌립니다.",
    "kind": "creature",
    "accent": "#90c5bd",
    "motion": "stalk",
    "src": "/game/art/enemies/deep-sea-v24.webp?v=24000",
    "crop": {
      "columns": 2,
      "rows": 2,
      "index": 2
    }
  },
  "sea-suit-collector": {
    "id": "sea-suit-collector",
    "campaignId": "deep-sea",
    "name": "빈 잠수복 수거기",
    "alt": "사람 없이 움직이는 산업용 잠수복과 회수 장치. 검은 빈 헬멧, 황동 연결부, 밧줄 감개, 넓은 수거 손을 지녔습니다. 장비 정리 시각만 보고 사람이 입은 잠수복까지 회수하려 합니다.",
    "kind": "creature",
    "accent": "#90c5bd",
    "motion": "machine",
    "src": "/game/art/enemies/deep-sea-v24.webp?v=24000",
    "crop": {
      "columns": 2,
      "rows": 2,
      "index": 3
    }
  },
  "feast-royal-guard": {
    "id": "feast-royal-guard",
    "campaignId": "dragon-banquet",
    "name": "왕실 배식 경비대",
    "alt": "구리빛 예식 갑옷과 푸른 어깨천을 두른 실제 왕실 경비원들. 독살을 막으려 봉인되지 않은 시료 반입을 막습니다. 둥근 방패와 끝이 뭉툭한 배식 통로 봉을 쓰며 대열이 무너지면 물러납니다.",
    "kind": "person",
    "accent": "#e0bc75",
    "motion": "stalk",
    "src": "/game/art/enemies/human-opponents-v24.webp?v=24000",
    "crop": {
      "columns": 3,
      "rows": 3,
      "index": 4
    }
  },
  "feast-coal-salamander": {
    "id": "feast-coal-salamander",
    "campaignId": "dragon-banquet",
    "name": "숯비늘 화덕도마뱀",
    "alt": "검은 숯비늘 사이로 주황빛이 새는 화덕 도마뱀. 굴뚝 안의 압력이 높아져 살던 벽 틈에서 밀려 나왔으며, 남은 온기를 빼앗기지 않으려 통로를 지킵니다.",
    "kind": "creature",
    "accent": "#e0bc75",
    "motion": "stalk",
    "src": "/game/art/enemies/dragon-banquet-v24.webp?v=24000",
    "crop": {
      "columns": 2,
      "rows": 2,
      "index": 1
    }
  },
  "feast-sugar-wasp": {
    "id": "feast-sugar-wasp",
    "campaignId": "dragon-banquet",
    "name": "설탕 날개 주전자말벌",
    "alt": "찌그러진 은주전자에 설탕 결정 날개가 붙은 주전자말벌. 남은 꿀차를 빼앗기지 않으려 주둥이로 뜨거운 방울을 쏩니다. 왕의 국이나 조사 시료와는 관계없는 오래된 찻주전자입니다.",
    "kind": "creature",
    "accent": "#e0bc75",
    "motion": "hover",
    "src": "/game/art/enemies/dragon-banquet-v24.webp?v=24000",
    "crop": {
      "columns": 2,
      "rows": 2,
      "index": 2
    }
  },
  "feast-ash-golem": {
    "id": "feast-ash-golem",
    "campaignId": "dragon-banquet",
    "name": "재를 두른 굴뚝골렘",
    "alt": "갈라진 화덕 벽돌과 눌린 재로 만들어진 작은 굴뚝 수호 골렘. 가슴에는 낮은 불씨가 있는 화격자가 달렸습니다. 낡은 안전 명령 때문에 복귀 밸브를 손으로 붙잡고 있습니다.",
    "kind": "creature",
    "accent": "#e0bc75",
    "motion": "machine",
    "src": "/game/art/enemies/dragon-banquet-v24.webp?v=24000",
    "crop": {
      "columns": 2,
      "rows": 2,
      "index": 3
    }
  },
  "clock-bronze-lion": {
    "id": "clock-bronze-lion",
    "campaignId": "clock-city",
    "name": "미납 시간을 지키는 청동 사자",
    "alt": "톱니 갈기와 열쇠 모양 발톱을 지닌 청동 사자. 목에는 회수한 회중시계 사슬이 걸려 있고, 금고 문을 지키는 황색 렌즈가 눈을 대신한다.",
    "kind": "creature",
    "accent": "#bfcbb0",
    "motion": "stalk",
    "src": "/game/art/enemies/clock-city-v24.webp?v=24000",
    "crop": {
      "columns": 2,
      "rows": 2,
      "index": 0
    }
  },
  "clock-debt-collector": {
    "id": "clock-debt-collector",
    "campaignId": "clock-city",
    "name": "시간 금고의 채권 회수인",
    "alt": "젖은 갈색 우비 위에 금고 직원을 뜻하는 황동 배지를 단 사람. 접이식 서류철과 짧은 경비봉을 들었다. 회수 실적을 채우지 못하면 자기 집의 유예도 끝나는 처지여서 빈 대표 서명에 매달린다.",
    "kind": "person",
    "accent": "#bfcbb0",
    "motion": "stalk",
    "src": "/game/art/enemies/human-opponents-v24.webp?v=24000",
    "crop": {
      "columns": 3,
      "rows": 3,
      "index": 5
    }
  },
  "clock-second-moth-swarm": {
    "id": "clock-second-moth-swarm",
    "campaignId": "clock-city",
    "name": "초침을 갉는 종이 나방 떼",
    "alt": "찢어진 양피지 날개와 가느다란 초침 더듬이를 가진 나방 무리. 황동 몸통 사이로 빼앗은 초가 모래처럼 떨어지며, 밝은 기록판의 가장자리를 갉는다.",
    "kind": "creature",
    "accent": "#bfcbb0",
    "motion": "swarm",
    "src": "/game/art/enemies/clock-city-v24.webp?v=24000",
    "crop": {
      "columns": 2,
      "rows": 2,
      "index": 2
    }
  },
  "clock-rewinding-watchman": {
    "id": "clock-rewinding-watchman",
    "campaignId": "clock-city",
    "name": "뒤로 걷는 야간 경비",
    "alt": "빛바랜 남색 제복의 야간 경비 잔상. 꺼진 손전등과 열쇠를 쥐고 있으며, 한 걸음 전의 자세가 몸 뒤에 여러 겹 남아 복도를 거꾸로 훑는다.",
    "kind": "creature",
    "accent": "#bfcbb0",
    "motion": "hover",
    "src": "/game/art/enemies/clock-city-v24.webp?v=24000",
    "crop": {
      "columns": 2,
      "rows": 2,
      "index": 3
    }
  },
  "snow-whiteout-stragglers": {
    "id": "snow-whiteout-stragglers",
    "campaignId": "snow-radio",
    "name": "눈길을 막은 고립 대원들",
    "alt": "보급대에서 낙오한 두 사람. 앞선 대원은 바랜 주황색 방한복에 신호봉과 로프를 들었고, 뒤의 대원은 빈 썰매를 붙든다. 잘못된 방송을 따라 동료를 잃어 켜진 무전기부터 의심한다.",
    "kind": "person",
    "accent": "#a0c5d9",
    "motion": "stalk",
    "src": "/game/art/enemies/human-opponents-v24.webp?v=24000",
    "crop": {
      "columns": 3,
      "rows": 3,
      "index": 6
    }
  },
  "snow-heating-frostbear": {
    "id": "snow-heating-frostbear",
    "campaignId": "snow-radio",
    "name": "난방관을 감싼 서리곰",
    "alt": "난방관 주위에 쌓인 성에가 거대한 곰 모양으로 자란 형체. 갈라진 가슴 안에는 검은 물이 흐르고, 두 앞발은 녹슨 배관 한 토막을 끌어안고 있다.",
    "kind": "creature",
    "accent": "#a0c5d9",
    "motion": "stalk",
    "src": "/game/art/enemies/snow-radio-v24.webp?v=24000",
    "crop": {
      "columns": 2,
      "rows": 2,
      "index": 1
    }
  },
  "snow-retrieval-spider": {
    "id": "snow-retrieval-spider",
    "campaignId": "snow-radio",
    "name": "회수통을 끄는 정비 거미",
    "alt": "작은 원통형 회수통을 끌고 다니는 여섯 다리 정비 기계. 녹슨 관절과 두 집게, 흐린 작업등을 달았으며 사람의 발자국까지 회수 표식으로 잘못 읽는다.",
    "kind": "creature",
    "accent": "#a0c5d9",
    "motion": "machine",
    "src": "/game/art/enemies/snow-radio-v24.webp?v=24000",
    "crop": {
      "columns": 2,
      "rows": 2,
      "index": 2
    }
  },
  "snow-return-patrol": {
    "id": "snow-return-patrol",
    "campaignId": "snow-radio",
    "name": "귀환을 기다리는 순찰 잔상",
    "alt": "성에 낀 고글과 낡은 방한복을 쓴 순찰대 세 사람의 잔상. 앞선 사람이 유도봉을 들었고, 뒤의 둘은 대답 없는 무전기를 붙든 채 매번 같은 발자국을 밟는다.",
    "kind": "creature",
    "accent": "#a0c5d9",
    "motion": "hover",
    "src": "/game/art/enemies/snow-radio-v24.webp?v=24000",
    "crop": {
      "columns": 2,
      "rows": 2,
      "index": 3
    }
  },
  "apartment-floor-patrol": {
    "id": "apartment-floor-patrol",
    "campaignId": "hollow-apartment",
    "name": "폐쇄동 야간 순찰원",
    "alt": "짙은 남색 경비 점퍼와 장화를 착용한 실제 사람. 손전등과 고무 경비봉을 들었다. 동료가 404호의 목소리를 따라 사라진 뒤 누구도 그 문에 접근하지 못하게 막고 있다.",
    "kind": "person",
    "accent": "#aaa4c1",
    "motion": "stalk",
    "src": "/game/art/enemies/human-opponents-v24.webp?v=24000",
    "crop": {
      "columns": 3,
      "rows": 3,
      "index": 7
    }
  },
  "apartment-drain-tangle": {
    "id": "apartment-drain-tangle",
    "campaignId": "hollow-apartment",
    "name": "배수구에 엉킨 머리카락",
    "alt": "배수구 덮개를 중심으로 젖은 검은 머리카락이 거미 다리처럼 갈라져 뻗은 형체. 낡은 빗과 열쇠가 엉켜 있지만 머리나 몸은 없고, 물이 역류할 때만 길게 일어난다.",
    "kind": "creature",
    "accent": "#aaa4c1",
    "motion": "swarm",
    "src": "/game/art/enemies/hollow-apartment-v24.webp?v=24000",
    "crop": {
      "columns": 2,
      "rows": 2,
      "index": 1
    }
  },
  "apartment-rocking-horse": {
    "id": "apartment-rocking-horse",
    "campaignId": "hollow-apartment",
    "name": "혼자 흔들리는 목마",
    "alt": "칠이 벗겨진 크림색 나무 목마. 빈 눈구멍과 낡은 천 고삐를 달았고, 아무도 타지 않았는데도 곡선 받침이 바닥을 찍으며 조금씩 가까워진다.",
    "kind": "creature",
    "accent": "#aaa4c1",
    "motion": "machine",
    "src": "/game/art/enemies/hollow-apartment-v24.webp?v=24000",
    "crop": {
      "columns": 2,
      "rows": 2,
      "index": 2
    }
  },
  "apartment-under-table-guest": {
    "id": "apartment-under-table-guest",
    "campaignId": "hollow-apartment",
    "name": "식탁 아래 숨은 손님",
    "alt": "낡은 의자 아래 모인 몸 없는 짙은 그림자. 얼굴 없이 긴 팔 두 개가 뻗어 빈 밥그릇과 숟가락을 내밀며, 식탁 아래의 어둠보다 더 깊은 자리를 만든다.",
    "kind": "creature",
    "accent": "#aaa4c1",
    "motion": "hover",
    "src": "/game/art/enemies/hollow-apartment-v24.webp?v=24000",
    "crop": {
      "columns": 2,
      "rows": 2,
      "index": 3
    }
  },
  "broadcast-record-removal-crew": {
    "id": "broadcast-record-removal-crew",
    "campaignId": "drowned-broadcast",
    "name": "폐국 기록 회수반",
    "alt": "철거 정리 명령을 받고 원본 릴을 반출하러 온 두 직원. 앞선 여성은 회색 작업 코트에 운반 케이스를 들었고, 안전모를 쓴 동료는 릴 운반대를 붙든다. 방송이 끝났다는 서류를 믿고 현재의 구조 신호를 무시한다.",
    "kind": "person",
    "accent": "#92bcc8",
    "motion": "stalk",
    "src": "/game/art/enemies/human-opponents-v24.webp?v=24000",
    "crop": {
      "columns": 3,
      "rows": 3,
      "index": 8
    }
  },
  "broadcast-blackwater-eel": {
    "id": "broadcast-blackwater-eel",
    "campaignId": "drowned-broadcast",
    "name": "검은 물의 송신 장어",
    "alt": "검은 물과 송신 케이블이 긴 장어 모양을 이룬 형체. 옆구리에 작은 진공관이 박혀 있고 꼬리는 동축선처럼 갈라진다. 눈과 수염에서 흐린 청록빛이 흐른다.",
    "kind": "creature",
    "accent": "#92bcc8",
    "motion": "hover",
    "src": "/game/art/enemies/drowned-broadcast-v24.webp?v=24000",
    "crop": {
      "columns": 2,
      "rows": 2,
      "index": 1
    }
  },
  "broadcast-applauding-seats": {
    "id": "broadcast-applauding-seats",
    "campaignId": "drowned-broadcast",
    "name": "박수 치는 빈 좌석들",
    "alt": "낡은 자줏빛 극장 의자 세 개. 텅 빈 좌석마다 흰 장갑 한 쌍이 팔걸이 위에서 박수를 치며, 비틀린 금속 다리가 접혔다 펴지며 앞으로 기어온다.",
    "kind": "creature",
    "accent": "#92bcc8",
    "motion": "swarm",
    "src": "/game/art/enemies/drowned-broadcast-v24.webp?v=24000",
    "crop": {
      "columns": 2,
      "rows": 2,
      "index": 2
    }
  },
  "broadcast-ahead-cameraman": {
    "id": "broadcast-ahead-cameraman",
    "campaignId": "drowned-broadcast",
    "name": "한 박자 먼저 움직이는 촬영기사",
    "alt": "옛 회색 작업 코트를 입은 촬영기사의 잔상. 어깨 카메라의 작은 붉은 등이 켜져 있고 몸이 취할 다음 자세가 앞쪽에 희미하게 겹친다. 바닥에 닿지 않는 장비 끈이 길게 늘어져 있다.",
    "kind": "creature",
    "accent": "#92bcc8",
    "motion": "hover",
    "src": "/game/art/enemies/drowned-broadcast-v24.webp?v=24000",
    "crop": {
      "columns": 2,
      "rows": 2,
      "index": 3
    }
  }
});
