// Original authored scenario for Chronicle Gate v18.1.
// Stable v18 graph and rules; clarified speakers, writing, and introductions.
const campaign = {
  "id": "dragon-banquet",
  "title": "용의 마지막 만찬",
  "subtitle": "왕은 은퇴하고 싶고, 요리사는 국이 식기 전에 누명을 벗고 싶다.",
  "genre": "판타지 희극 · 요리와 왕위",
  "accent": "#c89c62",
  "description": "용왕의 은퇴식에서 푸른 김이 나는 국을 보고 재상이 독살이라고 외친다. 요리사는 끌려갈 처지다. 새로 들어온 소금과 고쳐 쓴 연설문을 따라가면, 누가 왕을 성에 붙잡으려 하는지 드러난다. 용왕을 떠나보내면서 마을의 겨울도 지킬 수 있을까?",
  "estimatedMinutes": "35–60",
  "contentNotes": [
    "독살 의혹",
    "화상 위험",
    "정치적 갈등"
  ],
  "objective": "국에 든 소금과 바뀐 맹세의 관계를 밝히고, 용왕이 떠난 뒤 마을을 데울 방법을 고른다.",
  "art": "dragon-banquet",
  "pressureLabel": "왕실의 의심",
  "pressureMax": 8,
  "start": "gate",
  "roles": [
    {
      "title": "임시 궁정 시식관",
      "secret": "당신은 절대 미각이 아니라 미각이 둔한 덕에 어려운 음식을 잘 먹는 사람이다. 이번 고용주에게 그 차이를 설명할 기회를 놓쳤다.",
      "goal": "혼자 독을 먹어 증명하기보다 모두가 검증할 방법을 찾는다.",
      "reveal": "저는 독을 맛으로 알아내는 사람이 아니에요. 웬만한 음식에 표정이 안 바뀔 뿐이에요.",
      "epilogues": [
        {
          "when": {
            "flag": "salt_seized"
          },
          "text": "임시 시식관은 무작정 먹어 보지 않고도 원본 시료로 진실을 밝혔다. 둔한 미각 대신 검증 과정을 자기 경력에 적는다."
        },
        {
          "when": {
            "notFlag": "salt_seized"
          },
          "text": "시식관은 다음 계약서에 「독 감별 능력 없음」을 크게 쓴다. 웃음을 사더라도 살아서 일하는 쪽을 택한다."
        }
      ],
      "deadEpilogue": "시식관의 빈 그릇에는 음식을 먹어 위험을 증명하게 하지 말라는 메모가 붙는다. 다른 사람의 목숨 대신 검증할 방법을 찾는 일이 남는다."
    },
    {
      "title": "왕실 난방 기술자",
      "secret": "왕국의 난방은 용왕의 불꽃에 기대고 있다. 그러나 오래된 설계에는 마을 화덕을 연결하는 대체 방식이 있었다. 재상이 예산을 막았다.",
      "goal": "용왕의 자유와 주민의 겨울을 동시에 해결할 자료를 찾는다.",
      "reveal": "용왕이 떠나도 난방을 이어 갈 설계는 있어요. 돈과 책임을 아무도 나누려 하지 않았어요.",
      "epilogues": [
        {
          "when": {
            "flag": "heating_plan"
          },
          "text": "난방 기술자는 묻혀 있던 설계를 실제 일정과 예산이 붙은 일로 바꾸었다. 사람들은 다음 고장을 왕의 기분 대신 설비에서 찾기 시작한다."
        },
        {
          "when": {
            "notFlag": "heating_plan"
          },
          "text": "난방 기술자는 아직 검증하지 못한 부분을 정직하게 남긴다. 겨울이 오기 전에 현장 시험을 하는 것이 다음 과제다."
        }
      ],
      "deadEpilogue": "난방 기술자의 이름은 왕국이 한 불꽃에만 기대던 시대를 돌아보는 기록에 남는다. 누구도 영원한 설비가 되어서는 안 된다는 경고다."
    },
    {
      "title": "요리사의 외상 친구",
      "secret": "주방장 도란이 당신에게 빌린 돈은 독약이 아니라 퇴직 후 열 국밥집 보증금이다. 그의 비밀 장부를 보면 오해할 만하다.",
      "goal": "도란을 도우면서 증거까지 감추는 행동은 피한다.",
      "reveal": "도란의 이상한 지출은 국밥집 보증금이에요. 그렇다고 제가 모든 조리를 지켜본 건 아니니 확인은 해야 해요.",
      "epilogues": [
        {
          "when": {
            "flag": "chef_safe"
          },
          "text": "도란은 외상 친구를 자기 가게의 첫 손님으로 부른다. 빚을 없애 달라는 대신 첫 국밥 값만큼은 받지 않겠다고 한다."
        },
        {
          "when": {
            "notFlag": "chef_safe"
          },
          "text": "외상 친구는 도란의 구금 기록을 정정하는 일을 돕는다. 결백을 아는 것과 남들이 확인할 증거를 남기는 일이 달랐음을 배웠다."
        }
      ],
      "deadEpilogue": "도란은 외상 장부의 그 이름 옆에 값을 쓰지 않는다. 믿어 주려 했던 사람을 거래로 끝내지 않겠다는 표시다."
    },
    {
      "title": "왕녀의 가짜 구혼자",
      "secret": "왕녀 이리스는 왕위를 피하려고 당신을 외국 구혼자로 소개했다. 그녀는 빵집을 하고 싶다. 만찬이 끝나기 전에 당신도 가짜 신분을 정리해야 한다.",
      "goal": "왕녀의 선택을 지키되 그녀 대신 모든 책임을 지겠다고 약속하지 않는다.",
      "reveal": "이리스와 저는 결혼할 사이가 아니에요. 왕위를 피할 시간을 벌려고 함께 꾸민 일이에요.",
      "epilogues": [
        {
          "when": {
            "flag": "charter_agreed"
          },
          "text": "가짜 구혼자는 왕녀와의 위장 약속을 공개적으로 끝낸다. 이리스는 왕위 대신 빵집을 택할 수 있는 나라의 협약에 자기 이름으로 서명한다."
        },
        {
          "when": {
            "notFlag": "charter_agreed"
          },
          "text": "가짜 구혼자는 이리스에게 더는 자기 신분을 방패로 삼지 않겠다고 말한다. 그녀가 직접 원하는 미래를 말할 자리를 함께 만든다."
        }
      ],
      "deadEpilogue": "이리스는 가짜 구혼자의 이름을 허위 혼약서에서 지우고 자기 수첩으로 옮긴다. 누군가의 방패가 아니라 선택을 함께 고민한 사람으로 기억한다."
    }
  ],
  "clues": {
    "menu": {
      "title": "마지막 만찬 메뉴",
      "text": "용왕의 은퇴를 축하하는 국이다. 독이라고 지목된 푸른 김은 발효 버섯이 왕실 은식기에 닿을 때 생긴다."
    },
    "salt": {
      "title": "서약 소금",
      "text": "재상의 인장이 찍힌 향신료다. 왕실 문양의 그릇에 넣어 먹으면, 먹기 직전에 한 맹세를 어길 수 없게 만든다."
    },
    "ledger": {
      "title": "도란의 지출 장부",
      "text": "수상한 지출은 독약이 아니라 성 밖 국밥집 임차 보증금과 큰 솥 구입비였다."
    },
    "heating": {
      "title": "분산 화덕 설계",
      "text": "마을 화덕들을 연결하면 용왕 한 명에게 기대지 않고 겨울 난방을 이어 갈 수 있다. 예산 거부 인장은 재상의 것이다."
    },
    "portrait": {
      "title": "수정된 왕의 맹세",
      "text": "옛 맹세는 「백성이 겨울을 나도록 돕는다」. 현재 연회 대본에는 「겨울이 끝나기 전에는 떠나지 않는다」로 바뀌었다."
    },
    "order": {
      "title": "향신료 교체 명령",
      "text": "재상 오르가 요리사 몰래 서약 소금을 지급했다. 독살이 아니라 용왕을 끝나지 않는 재위에 묶으려는 계획이다."
    },
    "wish": {
      "title": "용왕의 은퇴 계획",
      "text": "용왕은 자기 화염이 약해지는 것을 알았다. 은퇴는 도망이 아니라, 다음 겨울 전에 다른 난방을 만들 마지막 기회다."
    },
    "charter": {
      "title": "화덕 공동 관리안",
      "text": "각 마을이 기술자와 연료를 나누고 궁정이 비용을 부담한다. 왕의 불꽃 대신 검증 가능한 설비로 겨울을 지킨다."
    }
  },
  "flags": {
    "chef_safe": "요리사 도란을 현장에서 체포하지 못하게 했다",
    "cook_friend": "주방 직원들이 파티를 돕는다",
    "salt_seized": "서약 소금 원본을 확보했다",
    "heating_plan": "대체 난방 설계를 복원했다",
    "regent_exposed": "재상의 향신료 교체 명령을 공개했다",
    "dragon_truth": "용왕에게 은퇴 이유를 직접 들었다",
    "charter_agreed": "공동 화덕의 예산과 관리안에 왕실이 동의했다",
    "vent_open": "왕실 화염 배출구를 열었다",
    "feast_saved": "일반 솥으로 안전한 음식을 다시 만들었다",
    "solo_tested_steam": "국을 먹지 않고 빈 은그릇으로 푸른 김의 원인을 직접 시험했다",
    "group_steadied_pot": "뜨거운 솥뚜껑을 받쳐 동료들이 주방을 살필 틈을 만들었다",
    "solo_invited_king": "은퇴한 아르단을 왕관 없는 손님으로 식사에 초대했다",
    "group_shared_flame": "시험 화로를 받쳐 용왕의 작은 불꽃을 나누는 모습을 보였다"
  },
  "nodes": {
    "gate": {
      "id": "gate",
      "title": "경호 대상은 국솥입니다",
      "chapter": 1,
      "location": "눈 내리는 용왕성 문",
      "art": 0,
      "mood": "mystery",
      "text": [
        "초대장 아래에 「은퇴식입니다. 장례용 꽃은 보내지 마십시오」라고 적혀 있다. 성문 앞에는 이미 화환 세 개가 섰다. 그 안에서 경비들이 사람 대신 커다란 국솥을 포위하고 있다.",
        "푸른 김을 보고 독살이라 외친 재상 오르에게 주방장 도란이 국자를 흔든다. “발효 버섯을 은그릇에 담으면 원래 이래요!” 색만으로는 어느 말이 맞는지 모른다. 용왕 아르단이 멀리서 부탁한다. “조사는 하되 국은 더 식지 않게 해 주게.”"
      ],
      "entities": [
        {
          "id": "chef",
          "label": "주방장 도란",
          "kind": "person",
          "aliases": [
            "도란",
            "요리사",
            "주방장"
          ]
        },
        {
          "id": "regent",
          "label": "재상 오르",
          "kind": "person",
          "aliases": [
            "오르",
            "재상"
          ]
        },
        {
          "id": "kitchen",
          "label": "왕실 주방",
          "kind": "place",
          "aliases": [
            "주방"
          ]
        },
        {
          "id": "salon",
          "label": "귀빈 응접실",
          "kind": "place",
          "aliases": [
            "응접실",
            "귀빈"
          ]
        },
        {
          "id": "steam",
          "label": "국솥 위의 푸른 김",
          "kind": "object",
          "aliases": [
            "김",
            "증기"
          ]
        },
        {
          "id": "pot",
          "label": "뜨거운 국솥과 뚜껑",
          "kind": "object",
          "aliases": [
            "솥",
            "국솥",
            "뚜껑"
          ]
        }
      ],
      "choices": [
        {
          "id": "stop-arrest",
          "label": "검증 전에는 요리사를 체포하지 말자고 중재한다",
          "intent": "talk",
          "target": "regent",
          "stat": "heart",
          "dc": 11,
          "risk": "중재에 실패하면 도란이 경비 감시 아래 조사를 받는다.",
          "outcomes": {
            "critical": {
              "text": "조리 주의문을 펴며 색과 독은 따로 확인하자고 말한다. 재상이 체포와 경계를 늦추자 주방 보조 피프가 장갑을 내민다. “직접 봐 주세요.” 피프의 안내로 도란과 주방에 들어간다.",
              "next": "kitchen",
              "set": [
                "chef_safe",
                "cook_friend"
              ],
              "clues": [
                "menu"
              ],
              "gainItems": [
                "oven-mitts"
              ],
              "pressure": -1
            },
            "success": {
              "text": "국을 시험하기도 전에 사람부터 잡겠느냐고 묻자 재상이 체포를 미룬다. 도란이 결백을 보이겠다며 국자를 들다가 다시 내려놓는다. 직접 살펴봐 달라며 주방 문을 여는 도란을 따라 안으로 들어간다.",
              "next": "kitchen",
              "set": [
                "chef_safe"
              ]
            },
            "failure": {
              "text": "중재를 마치기 전에 재상이 도란을 감시 아래 시식실로 보내 조사하라 명한다. 일행에게는 귀빈 응접실에서 설명하라는 지시가 온다. 경비 뒤의 도란을 남겨 두고, 다른 관계자의 말을 찾으러 간다.",
              "next": "salon",
              "pressure": 1
            },
            "fumble": {
              "text": "체포를 막는 말이 재상을 비난하는 말로 들려 경비가 도란을 붙잡는다. 그는 시식실에서 감시받으며 답하게 되고 일행도 조사 대상이 된다. 왕녀가 귀빈 응접실에 자리를 마련해, 그곳에서 설명할 길만 남는다.",
              "next": "salon",
              "pressure": 3,
              "unset": [
                "chef_safe"
              ]
            }
          }
        },
        {
          "id": "guest-route",
          "label": "귀빈 응접실에서 만찬 관계자들의 말을 듣는다",
          "intent": "choose",
          "target": "salon",
          "automatic": true,
          "outcomes": {
            "success": {
              "text": "솥 앞의 소란을 지나 하인의 안내로 귀빈 응접실에 들어간다. 왕녀 이리스가 대본과 납품 전표를 내민다. “재상이 식순을 고친 날, 향신료도 바뀌었어요.” 두 종이를 놓을 자리를 찾는다.",
              "next": "salon"
            }
          }
        },
        {
          "id": "solo-test-steam",
          "label": "국은 먹지 않고 빈 은그릇에 김만 받아 푸른색을 시험한다",
          "intent": "investigate",
          "target": "steam",
          "stat": "wit",
          "dc": 11,
          "requires": {
            "partyMax": 1
          },
          "risk": "뜨거운 솥에 직접 다가간다. 실패하면 행동자 생명 1, 대실패하면 생명 2를 잃고 조사가 중단된다.",
          "outcomes": {
            "critical": {
              "text": "빈 은그릇을 김에 대고 메뉴를 맞추자 버섯이 내는 색이 확인된다. 재상이 체포를 미루고 주방 보조 피프가 장갑을 건넨다. 아무에게도 국을 먹이지 않은 채, 도란과 주방으로 들어가 다른 재료도 살핀다.",
              "next": "kitchen",
              "set": [
                "solo_tested_steam",
                "chef_safe",
                "cook_friend"
              ],
              "clues": [
                "menu"
              ],
              "gainItems": [
                "oven-mitts"
              ],
              "pressure": -1
            },
            "success": {
              "text": "은그릇에 닿은 김이 파래지는 것을 메뉴의 주의문과 맞춘다. 색만으로 잡을 수 없게 되자 재상이 체포를 미룬다. 그릇을 내려놓고 도란을 따라 주방으로 들어가 국에 더 들어간 것을 확인한다.",
              "next": "kitchen",
              "set": [
                "solo_tested_steam",
                "chef_safe"
              ],
              "clues": [
                "menu"
              ]
            },
            "failure": {
              "text": "그릇을 너무 가까이 대어 뜨거운 김에 손을 덴다. 색을 제대로 비교하기 전에 경비가 솥 앞을 막는다. 구호용 천을 받고 귀빈 응접실로 안내되어, 다른 관계자의 설명을 들어야 한다.",
              "next": "salon",
              "harm": 1,
              "pressure": 1
            },
            "fumble": {
              "text": "그릇이 미끄러지며 솥의 김이 얼굴과 손을 덮친다. 경비가 조사를 막고 재상은 소란을 의심한다. 구호를 받은 뒤 왕녀가 마련한 응접실로 옮겨, 실패한 시험 대신 다른 단서를 찾는다.",
              "next": "salon",
              "harm": 2,
              "pressure": 3
            }
          }
        },
        {
          "id": "group-hold-lid",
          "label": "솥뚜껑을 받쳐 뜨거운 김을 동료들이 서 있는 곳에서 돌린다",
          "intent": "help",
          "target": "pot",
          "stat": "might",
          "dc": 11,
          "requires": {
            "partyMin": 2,
            "aliveMin": 2
          },
          "risk": "뚜껑이 미끄러지면 행동자가 실패 시 생명 1, 대실패 시 생명 2를 잃는다. 경비가 주방 앞을 막을 수 있다.",
          "outcomes": {
            "critical": {
              "text": "뚜껑을 받치고 김을 빈 쪽으로 돌리자 메뉴의 주의문까지 읽을 자리가 난다. 주방 보조 피프가 장갑을 건네고 경비에게 조사를 거들러 왔다고 설명한다. 솥을 안정시킨 뒤 일행과 주방으로 들어간다.",
              "next": "kitchen",
              "set": [
                "group_steadied_pot",
                "cook_friend"
              ],
              "clues": [
                "menu"
              ],
              "gainItems": [
                "oven-mitts"
              ],
              "pressure": -1
            },
            "success": {
              "text": "뜨거운 뚜껑을 비스듬히 받치자 김이 사람들 없는 쪽으로 빠진다. 주방 보조 피프가 솥을 고정하고 안에서 재료를 봐 달라며 주방 문을 연다. 동료들이 갈 틈을 남긴 뒤 손을 떼고 함께 들어간다.",
              "next": "kitchen",
              "set": [
                "group_steadied_pot",
                "cook_friend"
              ]
            },
            "failure": {
              "text": "뚜껑이 미끄러져 뜨거운 가장자리에 팔을 덴다. 경비가 더 다가오지 말라며 주방 문을 막는다. 주방 보조 피프에게 찬 천을 받은 뒤, 일행과 귀빈 응접실로 가 다른 설명을 찾는다.",
              "next": "salon",
              "harm": 1,
              "pressure": 1
            },
            "fumble": {
              "text": "받치던 뚜껑이 넘어지며 뜨거운 김이 몸을 덮친다. 경비가 솥 앞을 비우고 일행까지 수상하게 여긴다. 직원의 구호를 받고 왕녀가 연 응접실로 옮겨, 직접 보지 못한 재료를 다른 사람에게 묻는다.",
              "next": "salon",
              "harm": 2,
              "pressure": 3
            }
          }
        }
      ],
      "dialogue": {
        "who": "용왕 아르단",
        "text": "범인을 잡는 동안 국을 다시 데우는 건 가능하겠는가?"
      },
      "objective": "먼저 시험하자며 체포를 늦추거나 응접실에서 다른 설명을 듣는다.",
      "details": [
        {
          "id": "read-menu",
          "label": "만찬 메뉴의 조리 주의 사항을 읽는다",
          "text": "발효 버섯은 왕실 은식기에 닿으면 푸른 김을 낸다. 색만으로 독이라고 판단할 수 없다.",
          "clue": "menu"
        }
      ],
      "summary": "은퇴식 국에서 푸른 김이 나자 재상이 요리사를 잡으려 한다.",
      "stakes": "체포를 못 막으면 도란이 감시받으며 조사에 답한다.",
      "partyText": {
        "solo": [
          "혼자 들고 온 초대장에는 「은퇴식입니다. 장례용 꽃은 보내지 마십시오」라고 적혔다. 세 번째 화환 옆에서 그 종이를 접는다. 성 안에서는 재상 오르가 푸른 김이 나는 국솥을 가리키며 독살이라 외치고, 경비가 주방장 도란을 둘러싼다.",
          "도란은 발효 버섯과 은그릇 때문에 푸른 김이 난다며 빈 접시와 국자를 내민다. 국을 삼키지 않고도 살펴볼 수 있을 듯하다. 용왕 아르단이 멀리서 조사는 하되 국을 더 식히지 말아 달라고 한다. 시험에 손을 내밀 사람도, 다른 말을 찾으러 갈 사람도 지금은 하나다."
        ],
        "group": [
          "일행이 은퇴식 초대장을 들고 성문을 지나는데 장례 화환 세 개가 길을 막는다. 안에서는 재상 오르가 독살이라 외친다. 경비가 둘러싼 것은 용왕보다 푸른 김을 뿜는 국솥과 주방장 도란이다.",
          "도란은 버섯을 은그릇에 담으면 그런 색이 난다고 맞선다. 솥뚜껑이 들썩여 그 앞에서 오래 보기도 어렵다. 누군가 뚜껑을 받치면 김을 옆으로 돌릴 수 있다. 용왕 아르단은 조사는 하되 국은 식히지 말라며, 싸우는 사람들 너머 일행을 본다."
        ]
      }
    },
    "kitchen": {
      "id": "kitchen",
      "title": "왕실 레시피의 가장 작은 글씨",
      "chapter": 1,
      "location": "분주한 왕실 주방",
      "art": 1,
      "mood": "calm",
      "text": [
        "주방에서는 은퇴하는 왕보다 남은 접시 수를 먼저 센다. 도란의 조리대에는 국자 여섯 개와 국밥집 간판 시안이 놓였다. 독약 값이라는 소문이 돈 지출 장부에는 기름 묻은 손자국이 있다.",
        "주방 보조 피프가 낮에 바뀐 향신료 상자의 전표를 내민다. “창고에서 새로 보냈어요.” 말하는 동안 솥 밑 불꽃이 높아졌다 꺼진다. 피프의 다른 손에는 빌려 줄 방열 장갑이 들려 있다. 창고와 화덕 양쪽에서 피프를 부르는 소리가 난다."
      ],
      "entities": [
        {
          "id": "assistant",
          "label": "주방 보조 피프",
          "kind": "person",
          "aliases": [
            "피프",
            "조리 보조"
          ]
        },
        {
          "id": "ledger",
          "label": "도란의 지출 장부",
          "kind": "object",
          "aliases": [
            "장부",
            "지출"
          ]
        },
        {
          "id": "pantry",
          "label": "향신료 창고",
          "kind": "place",
          "aliases": [
            "창고"
          ]
        },
        {
          "id": "ovens",
          "label": "대형 화덕",
          "kind": "place",
          "aliases": [
            "화덕"
          ]
        }
      ],
      "choices": [
        {
          "id": "ingredients",
          "label": "교체된 향신료 상자를 따라 창고로 간다",
          "intent": "choose",
          "target": "pantry",
          "automatic": true,
          "outcomes": {
            "success": {
              "text": "상자가 온 곳을 묻자 피프가 전표의 번호를 짚는다. 조리대의 소문 대신 그 번호를 따라가 보기로 한다. 납품 창고 문을 밀자 안에서 상자 옮기는 소리와 함께 누가 찾느냐는 말이 들린다.",
              "next": "pantry"
            }
          }
        },
        {
          "id": "cook-team",
          "label": "조리 보조들과 화덕을 점검하며 주방의 협조를 얻는다",
          "intent": "help",
          "target": "assistant",
          "stat": "might",
          "dc": 10,
          "risk": "솥을 잘못 옮기면 경비가 소란을 확인하러 온다. 대실패하면 뜨거운 김에 생명 1을 잃는다.",
          "outcomes": {
            "critical": {
              "text": "솥을 받치고 받침까지 고정하자 피프가 장부와 화덕 청원서를 펼친다. 가게 보증금이라는 영수증에 도란의 혐의가 풀리고 다른 난방 도면도 나온다. 장갑과 도면을 빌려 화덕 쪽으로 함께 간다.",
              "next": "ovens",
              "set": [
                "cook_friend",
                "chef_safe"
              ],
              "clues": [
                "ledger",
                "heating"
              ],
              "gainItems": [
                "oven-mitts",
                "hearth-blueprint"
              ]
            },
            "success": {
              "text": "무거운 솥을 거들어 옮기자 피프가 도란의 가게 지출 장부를 보인다. 옆 직원은 요즘 왕의 불이 자주 꺼진다고 말을 보탠다. 솥을 내려놓고, 그 불을 받는 화덕을 살피러 간다.",
              "next": "ovens",
              "set": [
                "cook_friend"
              ],
              "clues": [
                "ledger"
              ]
            },
            "failure": {
              "text": "솥 손잡이가 미끄러지자 피프가 반대편을 급히 받친다. 놀란 외침에 경비가 고개를 돌린다. “화덕부터 잠가요!” 피프가 턱으로 가리킨 불길 쪽에 솥을 내려놓고 달려간다.",
              "next": "ovens",
              "pressure": 1
            },
            "fumble": {
              "text": "손잡이를 잡는 순간 솥이 기울고 뜨거운 김이 손을 덮는다. 피프가 버티는 동안 경비가 소란을 보러 온다. 기술자가 화덕을 잠가야 한다고 외쳐, 아픈 손을 감싸며 그쪽으로 움직인다.",
              "next": "ovens",
              "harm": 1,
              "pressure": 2
            }
          }
        }
      ],
      "objective": "상자가 온 창고를 보거나 솥을 옮겨 화덕부터 살핀다.",
      "details": [
        {
          "id": "chef-ledger",
          "label": "도란의 지출 장부를 확인한다",
          "text": "독약 구매 내역은 없다. 큰 지출은 성 밖 국밥집 보증금과 장사에 쓸 솥 값이다.",
          "clue": "ledger"
        },
        {
          "id": "borrow-mitts",
          "label": "피프에게 왕실 방열 장갑을 빌린다",
          "text": "피프가 손 크기를 보고 장갑을 골라 준다. “이걸 끼면 뜨거운 그릇은 옮길 수 있어요. 경비 허가는 제가 따로 말해 볼게요.”",
          "gainItems": [
            "oven-mitts"
          ]
        }
      ],
      "summary": "새 향신료 전표와 도란의 지출 장부가 있다. 솥 밑 불은 들쭉날쭉하다.",
      "stakes": "급히 잡은 손잡이나 증기에 데일 수 있다. 방열 장갑을 빌려 둘 수 있다.",
      "callbacks": [
        {
          "when": {
            "flag": "solo_tested_steam"
          },
          "text": "비워 둔 은그릇 가장자리에 푸른 김의 자국이 남아 있다. 도란은 누군가 국을 삼켜 증명하는 대신 그 흔적부터 보게 한다."
        },
        {
          "when": {
            "flag": "group_steadied_pot"
          },
          "text": "피프가 잘 고정된 솥뚜껑을 톡 두드린다. 누군가 김을 받아 낸 덕에 주방 사람들도 눈을 뜨고 조리대를 살필 수 있다."
        }
      ]
    },
    "salon": {
      "id": "salon",
      "title": "구혼자와 장례용 꽃",
      "chapter": 1,
      "location": "귀빈 응접실",
      "art": 0,
      "mood": "calm",
      "text": [
        "왕녀 이리스가 장례 화환의 흰 리본을 빵집 포장끈으로 자른다. “아버지가 은퇴한다고 제가 자동으로 왕이 되는 건 아니잖아요.” 귀족들은 못 들은 척 자녀들의 초상화를 더 가까이 놓는다.",
        "가위 옆에는 재상 오르가 고쳐 쓴 만찬 대본과 향신료 납품 전표가 있다. 이리스가 맹세 한 줄을 짚는다. “어릴 때 들었던 말과 달라요.” 옛 문장은 초상화 회랑에, 같은 날 들어온 재료는 창고에 남아 있다."
      ],
      "entities": [
        {
          "id": "princess",
          "label": "왕녀 이리스",
          "kind": "person",
          "aliases": [
            "왕녀",
            "이리스"
          ]
        },
        {
          "id": "script",
          "label": "수정된 만찬 대본",
          "kind": "object",
          "aliases": [
            "대본",
            "문장"
          ]
        },
        {
          "id": "gallery",
          "label": "왕실 초상화 회랑",
          "kind": "place",
          "aliases": [
            "회랑",
            "초상화"
          ]
        },
        {
          "id": "pantry",
          "label": "향신료 창고",
          "kind": "place",
          "aliases": [
            "창고"
          ]
        }
      ],
      "choices": [
        {
          "id": "old-oath",
          "label": "옛 왕의 맹세가 적힌 초상화 회랑으로 간다",
          "intent": "choose",
          "target": "gallery",
          "automatic": true,
          "outcomes": {
            "success": {
              "text": "옛 맹세를 보겠다고 하자 이리스가 빵집 간판을 그리던 펜을 멈춘다. “거기에 제가 왕이 돼야 한다는 말도 있나 봐 주세요.” 그녀가 대본을 접어 들고 초상화 회랑으로 안내한다.",
              "next": "gallery"
            }
          }
        },
        {
          "id": "delivery-story",
          "label": "왕녀에게 전표를 빌려 납품 창고 출입을 허가받는다",
          "intent": "talk",
          "target": "princess",
          "stat": "heart",
          "dc": 10,
          "risk": "귀족들이 월권이라고 시비를 걸어 경계가 높아진다.",
          "outcomes": {
            "critical": {
              "text": "전표로 무엇을 확인하고 언제 돌려줄지 먼저 약속한다. 이리스는 허가에 서명하고 마을 화덕 청원서와 도면도 건넨다. “돈이 갈 곳도 봐 주세요.” 귀족들이 비킨 틈으로 창고에 간다.",
              "next": "pantry",
              "clues": [
                "heating"
              ],
              "gainItems": [
                "hearth-blueprint"
              ],
              "pressure": -1
            },
            "success": {
              "text": "전표를 빌려 달라 청하자 이리스가 자기 서명을 크게 쓴다. “적어도 제 이름을 어디 쓸지는 정할 수 있죠.” 그 종이를 받아 창고에 내미니, 막고 있던 직원이 문을 열어 준다.",
              "next": "pantry"
            },
            "failure": {
              "text": "전표를 청하자 귀족들이 월권이라며 사이를 막는다. 이리스는 말다툼 대신 빵 봉투에 전표를 넣어 창고 직원에게 보낸다. 그를 따라가라는 눈짓을 받아 소란스러운 응접실에서 나온다.",
              "next": "pantry",
              "pressure": 1
            },
            "fumble": {
              "text": "허가를 설명하는 말이 어긋나자 귀족들이 위조라며 큰소리를 낸다. 이리스는 전표를 창고 직원에게 직접 보내 정식 조사로 돌린다. 빌린 서류 대신 경비의 시선을 달고 그 전표를 따라간다.",
              "next": "pantry",
              "pressure": 3
            }
          }
        }
      ],
      "objective": "옛 문장을 보러 가거나 새 향신료의 납품 전표를 빌린다.",
      "details": [
        {
          "id": "script-edit",
          "label": "만찬 대본에서 고친 문장을 살핀다",
          "text": "연회 대본의 맹세는 「겨울이 끝나기 전에는 떠나지 않는다」. 이전 문장을 확인할 필요가 있다.",
          "clue": "portrait"
        }
      ],
      "summary": "왕녀는 은퇴식 대본의 맹세가 예전과 달라졌다고 한다.",
      "stakes": "귀족들 앞에서 말이 꼬이면 감시가 붙는다. 왕녀가 다른 조사 길을 내줄 수 있다."
    },
    "pantry": {
      "id": "pantry",
      "title": "소금에 적힌 재상의 이름",
      "chapter": 2,
      "location": "왕실 향신료 창고",
      "art": 1,
      "mood": "mystery",
      "text": [
        "식재료 창고 담당 모스가 재상 오르의 인장이 찍힌 소금 상자를 연다. 바닥에는 「서약 소금」이라 적혔다. 왕실 문양의 그릇으로 먹으면 먹기 직전의 맹세를 어길 수 없게 만든다는 설명이다. 「독성 없음」보다 훨씬 작은 글씨다.",
        "모스는 그 줄까지 읽지 않았다고 한다. 교체 명령서와 봉인용 병이 보관함에 있다. 소금을 직접 먹을 필요는 없다. 시식실에서 문양 있는 그릇과 없는 그릇을 비교하면 작용을 볼 수 있다고 그가 조심스럽게 덧붙인다."
      ],
      "entities": [
        {
          "id": "salt",
          "label": "서약 소금 상자",
          "kind": "object",
          "aliases": [
            "소금",
            "향신료",
            "상자"
          ]
        },
        {
          "id": "keeper",
          "label": "식재료 창고 담당 모스",
          "kind": "person",
          "aliases": [
            "모스",
            "담당자"
          ]
        },
        {
          "id": "orders",
          "label": "납품 명령서",
          "kind": "object",
          "aliases": [
            "명령서",
            "전표"
          ]
        }
      ],
      "choices": [
        {
          "id": "seize-sample",
          "label": "원본 소금과 납품 명령서를 봉인해 증거로 챙긴다",
          "intent": "investigate",
          "target": "salt",
          "stat": "wit",
          "dc": 11,
          "risk": "봉인을 잘못 떼면 증거 훼손 경보가 울린다.",
          "outcomes": {
            "critical": {
              "text": "모스가 보는 앞에서 소금과 인장을 나누어 봉인하고 출처에 서명을 받는다. 명령서까지 맞자 도란을 의심하던 경비도 물러선다. 봉인 표본을 들고, 아무에게도 먹이지 않을 비교 시험을 하러 간다.",
              "next": "tasting",
              "set": [
                "salt_seized",
                "chef_safe"
              ],
              "clues": [
                "salt",
                "order"
              ],
              "gainItems": [
                "salt-vial"
              ],
              "pressure": -1
            },
            "success": {
              "text": "소금을 병에 옮기고 인장과 명령서를 따로 봉한다. 모스가 출처를 확인하자 재상의 지시와 내용물이 같은 증거로 남는다. 봉인한 표본을 챙겨 두 그릇이 준비된 시식실로 간다.",
              "next": "tasting",
              "set": [
                "salt_seized"
              ],
              "clues": [
                "salt",
                "order"
              ],
              "gainItems": [
                "salt-vial"
              ]
            },
            "failure": {
              "text": "봉인을 떼는 순간 금이 가며 경보가 울린다. 모스가 원본 상자를 다시 닫아 반출을 막는다. 명령서와 성분표만 가져가, 시식실에 있는 시험 재료로 작용을 확인하기로 한다.",
              "next": "tasting",
              "clues": [
                "salt",
                "order"
              ],
              "pressure": 1
            },
            "fumble": {
              "text": "비튼 봉인이 터지며 소금이 바닥에 쏟아져 챙긴 표본까지 오염된다. 훼손 경보 아래 모스는 성분표와 명령서 사본만 보증한다. 못 쓰게 된 표본을 두고 시식실의 별도 재료를 찾으러 간다.",
              "next": "tasting",
              "clues": [
                "salt",
                "order"
              ],
              "loseItems": [
                "salt-vial"
              ],
              "unset": [
                "salt_seized"
              ],
              "pressure": 3
            }
          }
        },
        {
          "id": "keeper-testimony",
          "label": "창고 담당자에게 누가 상자를 교체했는지 증언을 부탁한다",
          "intent": "talk",
          "target": "keeper",
          "stat": "heart",
          "dc": 11,
          "risk": "그가 겁을 먹으면 재상에게 먼저 연락한다.",
          "outcomes": {
            "critical": {
              "text": "모스가 읽은 줄과 놓친 줄을 차례로 묻자 그가 교체 경위를 적는다. 자기 실수도 숨기지 않겠다며 원본 표본을 봉인한다. 서명과 소금을 나란히 챙겨, 그와 시식실로 확인하러 간다.",
              "next": "tasting",
              "set": [
                "salt_seized",
                "cook_friend"
              ],
              "clues": [
                "order",
                "salt"
              ],
              "gainItems": [
                "salt-vial"
              ]
            },
            "success": {
              "text": "상자를 누가 바꾸었는지 묻자 모스가 재상의 직접 명령이었다고 답한다. 읽지 않은 주의 사항까지 짚은 뒤 모자를 고쳐 쓴다. “시험하는 곳까지 같이 가죠.” 그와 시식실로 향한다.",
              "next": "tasting",
              "clues": [
                "order",
                "salt"
              ]
            },
            "failure": {
              "text": "교체 경위를 묻자 모스는 답 대신 재상에게 연락한다. 공개된 성분표와 인장까지 가리지는 못한다. 그 내용을 적어 두고, 시식실에서 소금의 작용부터 확인하기로 한다.",
              "next": "tasting",
              "clues": [
                "salt"
              ],
              "pressure": 2
            },
            "fumble": {
              "text": "질문이 거듭되자 모스가 재상에게 위치와 대화까지 전한다. 증언도 원본 반출도 거절한 그 앞에서 공개 성분표만 베낀다. 감시를 받으며 창고를 나와 시식실의 시험 재료를 찾는다.",
              "next": "tasting",
              "clues": [
                "salt"
              ],
              "pressure": 3
            }
          }
        }
      ],
      "objective": "소금과 명령서를 봉인하거나 담당자에게 교체 경위를 묻는다.",
      "details": [
        {
          "id": "salt-label",
          "label": "소금 상자 바닥의 성분표를 읽는다",
          "text": "독은 아니다. 왕실 문양의 식기로 먹으면 마지막 맹세를 고정하는 서약 소금이다.",
          "clue": "salt"
        },
        {
          "id": "take-sample",
          "label": "모스가 보는 앞에서 시험용 소금 표본을 봉인한다",
          "text": "모스가 표본용 봉투를 꺼내 원본 인장과 같은 출처임을 적고 서명한다. 작은 병을 시식실에서 비교 시험에 쓸 수 있도록 챙긴다.",
          "gainItems": [
            "salt-vial"
          ],
          "clue": "salt"
        }
      ],
      "summary": "재상이 보낸 소금은 왕실 그릇으로 먹기 전에 한 맹세를 거스를 수 없게 만든다.",
      "stakes": "표본을 쏟으면 증거로 쓸 수 없다. 사람이 먹지 않고 그릇끼리 비교할 수 있다."
    },
    "ovens": {
      "id": "ovens",
      "title": "왕의 불꽃은 자꾸 졸았다",
      "chapter": 2,
      "location": "왕실 대형 화덕",
      "art": 1,
      "mood": "tension",
      "text": [
        "여러 화덕의 불이 같은 박자로 커졌다 줄어든다. 전부 용왕의 숨에서 오는 불꽃이라고 화덕 기술자 델이 말한다. 왕이 한숨을 쉬는지 불끝이 낮아지자, 델은 말없이 압력계를 두드린다.",
        "뒤쪽 서랍에는 마을 화덕들을 배관으로 잇는 도면이 쌓였다. 해마다 찍힌 반려 도장 아래 이유는 같다. 「왕실 화염으로 충분함.」 델은 도면에서 눈을 떼고 뜨거운 배관을 본다. 종이 위의 충분한 불이 오늘도 고르게 타지 않는다."
      ],
      "entities": [
        {
          "id": "furnace",
          "label": "왕실 화염 배관",
          "kind": "object",
          "aliases": [
            "화덕",
            "배관",
            "불꽃"
          ]
        },
        {
          "id": "plans",
          "label": "분산 화덕 설계도",
          "kind": "object",
          "aliases": [
            "설계도",
            "난방",
            "도면"
          ]
        },
        {
          "id": "engineer",
          "label": "화덕 기술자 델",
          "kind": "person",
          "aliases": [
            "델",
            "기술자"
          ]
        }
      ],
      "choices": [
        {
          "id": "restore-plan",
          "label": "마을 화덕을 잇는 도면에 실제 배관 길이를 넣어 계산한다",
          "intent": "investigate",
          "target": "plans",
          "stat": "wit",
          "dc": 12,
          "risk": "가동 중인 배관을 가까이 조사한다. 실패하면 화상으로 생명 1, 대실패하면 생명 2를 잃는다.",
          "outcomes": {
            "critical": {
              "text": "실제 배관 치수를 넣자 남는 열까지 마을에 나눌 계산이 맞는다. 델이 장갑을 건네고 직원들에게 조사에 협조하라 알린다. 검증한 도면을 품고, 의심하던 눈길이 잦아든 주방을 지나 시식실로 간다.",
              "next": "tasting",
              "set": [
                "heating_plan",
                "cook_friend"
              ],
              "clues": [
                "heating"
              ],
              "gainItems": [
                "hearth-blueprint",
                "oven-mitts"
              ],
              "pressure": -2
            },
            "success": {
              "text": "배관 길이를 다시 계산하자 새 화덕 몇 개로 이어질 선이 나온다. 델이 겨울 전에 시작할 수 있겠다고 도면에 표시한다. 왕의 불꽃이 더 약해지기 전에 쓸 계획을 챙겨 시식실로 향한다.",
              "next": "tasting",
              "set": [
                "heating_plan"
              ],
              "clues": [
                "heating"
              ],
              "gainItems": [
                "hearth-blueprint"
              ]
            },
            "failure": {
              "text": "치수를 재는 사이 과열된 배관이 몸을 스친다. 델이 불을 줄이고 떨어뜨린 도면을 주워 준다. 계산은 끝내지 못했지만 원본을 지닌 채, 다친 곳을 돌볼 시식실로 이동한다.",
              "next": "tasting",
              "clues": [
                "heating"
              ],
              "pressure": 1,
              "harm": 1,
              "gainItems": [
                "hearth-blueprint"
              ]
            },
            "fumble": {
              "text": "압력계를 가까이 보던 순간 배관에서 열기가 터져 큰 화상을 입는다. 델이 불을 낮추고 검증을 마치지 못한 도면을 챙긴다. 그가 부축해 가리킨 시식실의 구호 자리가 가까워진다.",
              "next": "tasting",
              "clues": [
                "heating"
              ],
              "gainItems": [
                "hearth-blueprint"
              ],
              "harm": 2,
              "pressure": 2
            }
          }
        },
        {
          "id": "stabilize-fire",
          "label": "기술자와 함께 과열 배관의 압력을 뺀다",
          "intent": "help",
          "target": "furnace",
          "stat": "might",
          "dc": 12,
          "risk": "압력 배관이 터지면 실패 시 생명 2, 대실패 시 생명 3을 잃는다. 생명이 부족하면 사망한다.",
          "outcomes": {
            "critical": {
              "text": "델의 신호에 맞춰 압력을 나누어 빼니 화덕들이 고르게 타오른다. 그가 검증한 대체 도면과 장갑을 건네며 직원들에게 일행을 믿어도 좋다고 말한다. 덜 뜨거워진 통로를 지나 시식실로 간다.",
              "next": "tasting",
              "set": [
                "heating_plan",
                "cook_friend"
              ],
              "clues": [
                "heating"
              ],
              "gainItems": [
                "hearth-blueprint",
                "oven-mitts"
              ],
              "pressure": -2
            },
            "success": {
              "text": "밸브를 함께 돌려 압력을 낮추자 델의 어깨가 내려간다. 그는 같은 원리로 마을 화덕을 잇는 도면을 꺼내 설명한다. 그 종이를 받아 들고 델과 시식실로 걸어간다.",
              "next": "tasting",
              "set": [
                "heating_plan",
                "cook_friend"
              ],
              "clues": [
                "heating"
              ],
              "gainItems": [
                "hearth-blueprint"
              ]
            },
            "failure": {
              "text": "압력을 빼던 이음새에서 뜨거운 증기가 몸을 덮는다. 델이 비상 밸브를 닫고 대체 도면을 내민다. 원본은 지켰지만 깊은 화상을 입어, 그의 안내를 받아 시식실 구호 자리로 향한다.",
              "next": "tasting",
              "clues": [
                "heating"
              ],
              "pressure": 2,
              "harm": 2,
              "gainItems": [
                "hearth-blueprint"
              ]
            },
            "fumble": {
              "text": "덜 식은 이음쇠가 열리며 증기가 몸을 집어삼킨다. 델이 비상 밸브를 닫아도 그 아래에서 숨은 돌아오지 않는다. 남겨진 도면과 불사조 재가 있는 시식실까지의 길은 살아남은 동료에게 남는다.",
              "next": "tasting",
              "clues": [
                "heating"
              ],
              "gainItems": [
                "hearth-blueprint"
              ],
              "harm": 3,
              "pressure": 3
            }
          }
        }
      ],
      "objective": "마을 화덕을 잇는 도면을 계산하거나 뜨거운 배관의 압력을 뺀다.",
      "details": [
        {
          "id": "heating-drawing",
          "label": "반려 도장이 찍힌 공동 화덕 도면을 복사한다",
          "text": "마을 화덕을 연결하는 대체 설계가 있다. 기술 문제가 아니라 예산과 책임 분담 때문에 막혔다.",
          "clue": "heating",
          "gainItems": [
            "hearth-blueprint"
          ]
        },
        {
          "id": "engineer-mitts",
          "label": "기술자 델에게 여분의 방열 장갑을 받는다",
          "text": "델이 뜨거운 손잡이에 맨손을 대지 말라며 장갑을 내준다. “화상은 용감하다고 안 생기는 게 아닙니다.”",
          "gainItems": [
            "oven-mitts"
          ]
        }
      ],
      "summary": "성의 화덕은 모두 용왕의 약해지는 숨에서 불을 받는다.",
      "stakes": "증기가 터지면 큰 화상을 입거나 죽을 수 있다."
    },
    "gallery": {
      "id": "gallery",
      "title": "초상화 속 왕은 모두 피곤했다",
      "chapter": 2,
      "location": "옛 왕들의 수정 회랑",
      "art": 1,
      "mood": "mystery",
      "text": [
        "역대 용왕의 초상화가 천장까지 걸렸다. 첫해의 왕들은 늠름하고 마지막 해의 왕들은 제각기 다른 자세로 졸고 있다. 액자 아래에는 「백성이 겨울을 나도록 돕는다」는 같은 맹세가 새겨져 있다.",
        "이리스가 새 대본을 나란히 놓는다. 「겨울이 끝나기 전에는 떠나지 않는다.」 난방을 계속 왕에게 맡기면 떠날 날도 미뤄지는 말이다. 왕녀는 두 문장을 손가락으로 따라 읽다가, 마을 화덕 청원서를 액자 아래에 꺼내 놓는다."
      ],
      "entities": [
        {
          "id": "portraits",
          "label": "역대 왕의 초상화",
          "kind": "object",
          "aliases": [
            "초상화",
            "그림"
          ]
        },
        {
          "id": "oath",
          "label": "옛 왕의 맹세",
          "kind": "object",
          "aliases": [
            "맹세",
            "문장"
          ]
        },
        {
          "id": "princess",
          "label": "왕녀 이리스",
          "kind": "person",
          "aliases": [
            "이리스",
            "왕녀"
          ]
        }
      ],
      "choices": [
        {
          "id": "compare-oaths",
          "label": "옛 맹세와 현재 대본의 차이를 증명할 사본을 만든다",
          "intent": "investigate",
          "target": "oath",
          "stat": "wit",
          "dc": 10,
          "risk": "복사 장치가 왕실 경보에 연결돼 있어 기록이 남는다.",
          "outcomes": {
            "critical": {
              "text": "바뀐 단어와 작성일을 나란히 베끼자 이리스가 마을 화덕 도면도 펼친다. 떠나지 못하게 묶지 않고도 옛 맹세를 지킬 방법이다. 두 자료를 묶어, 오늘 음식과 어떤 관계가 있는지 시식실에서 확인하기로 한다.",
              "next": "tasting",
              "clues": [
                "portrait",
                "heating"
              ],
              "gainItems": [
                "hearth-blueprint"
              ],
              "pressure": -1
            },
            "success": {
              "text": "두 문장을 같은 종이에 옮기자 바꾼 단어들이 또렷해진다. 백성을 돕는 맹세가 왕의 발을 묶는 맹세로 바뀌었다. 대본과 함께 들어온 재료도 이 말과 관련이 있는지 시식실로 확인하러 간다.",
              "next": "tasting",
              "clues": [
                "portrait"
              ]
            },
            "failure": {
              "text": "복사 장치가 멈추자 이리스가 펜을 집는다. 그녀가 직접 두 문장을 베껴 서명하는 동안 경비의 눈길이 모인다. 덜 화려해도 읽을 수 있는 사본을 챙겨 시식실로 자리를 옮긴다.",
              "next": "tasting",
              "clues": [
                "portrait"
              ],
              "pressure": 1
            },
            "fumble": {
              "text": "복사 장치가 원본 훼손 경보를 켜고 경비가 종이를 압수하려 한다. 이리스가 핵심 문장을 손으로 베껴 자기 서명을 넣는다. 내용만은 지킨 사본을 품고, 시선이 몰린 회랑을 떠나 시식실로 간다.",
              "next": "tasting",
              "clues": [
                "portrait"
              ],
              "pressure": 3
            }
          }
        },
        {
          "id": "portrait-roast",
          "label": "옛 왕들의 졸린 초상화를 흉내 내며 왕녀의 긴장을 푼다",
          "intent": "perform",
          "target": "portraits",
          "stat": "heart",
          "dc": 11,
          "risk": "귀족이 들으면 왕실 모독이라는 소문이 난다.",
          "outcomes": {
            "critical": {
              "text": "졸린 얼굴을 흉내 내다가 왕 혼자 맡은 일도 함께 짚는다. 웃음을 터뜨린 이리스가 화덕 도면을 주고 도란을 풀어 주라는 전갈을 보낸다. 그 지원을 안고, 초상화들의 졸음을 뒤에 남기며 시식실로 간다.",
              "next": "tasting",
              "clues": [
                "heating"
              ],
              "gainItems": [
                "hearth-blueprint"
              ],
              "set": [
                "cook_friend",
                "chef_safe"
              ],
              "pressure": -1
            },
            "success": {
              "text": "왕들의 졸린 표정을 차례로 따라 하자 이리스가 크게 웃는다. 그녀는 왕의 불 대신 마을 화덕을 잇자는 청원과 도면을 꺼낸다. 자신도 돕겠다며 그 자료를 들고 시식실까지 함께 간다.",
              "next": "tasting",
              "clues": [
                "heating"
              ],
              "set": [
                "cook_friend"
              ],
              "gainItems": [
                "hearth-blueprint"
              ]
            },
            "failure": {
              "text": "흉내가 지나치게 닮았는지 귀족들이 놀라 말을 멈춘다. 이리스가 급히 정식 공연 연습이라 둘러댄다. 더 보여 달라는 말이 나오기 전에 그녀의 안내를 따라 시식실로 빠져나간다.",
              "next": "tasting",
              "pressure": 1
            },
            "fumble": {
              "text": "졸린 자세를 따라 하다 초상화 받침을 건드리자 귀족들이 모독이라 외친다. 이리스가 수리비는 설명하겠다며 앞을 막는다. 그녀의 도움까지 의심받게 된 채, 증거부터 보라는 당부를 듣고 시식실로 물러난다.",
              "next": "tasting",
              "pressure": 3,
              "unset": [
                "cook_friend"
              ]
            }
          }
        }
      ],
      "objective": "두 문장을 나란히 남기거나 왕녀와 다른 난방 방법을 찾는다.",
      "details": [
        {
          "id": "old-oath",
          "label": "초상화 밑의 원래 맹세를 읽는다",
          "text": "원래 문장은 「백성이 겨울을 나도록 돕는다」. 영원히 왕위에 남겠다는 약속이 아니다.",
          "clue": "portrait"
        }
      ],
      "summary": "백성의 겨울을 돕는 맹세가 겨울이 끝나기 전엔 못 떠난다는 말로 바뀌었다.",
      "stakes": "왕실 기록을 건드리거나 왕의 모습을 흉내 내면 경비와 귀족의 시선이 몰린다."
    },
    "tasting": {
      "id": "tasting",
      "title": "국보다 위험한 건 접시였다",
      "chapter": 2,
      "location": "왕실 시식실",
      "art": 1,
      "mood": "tension",
      "text": [
        "책상 위 은접시와 토기에 시험용 소금을 나누어 넣는다. 약속을 소리 내 읽자 왕실 문양 쪽에만 그 문장이 붙는다. 푸른 김은 버섯 때문이었지만 이 소금은 달랐다. 왕이 새 대본을 읽고 먹으면 떠나지 않겠다는 맹세를 거스를 수 없게 된다.",
        "도란이 빈 국자를 내려놓는다. 재상에게 소금을 바꾼 이유를 물을지, 왕에게 먼저 뜻을 들을지 정할 차례다. 구호대의 불사조 재 항아리가 희미하게 빛난다. 살아 있는 동료가 불씨와 이름을 나누면 죽은 이를 부를 수 있다는 글이 붙어 있다."
      ],
      "entities": [
        {
          "id": "bowls",
          "label": "은접시와 토기 그릇",
          "kind": "object",
          "aliases": [
            "접시",
            "그릇",
            "국"
          ]
        },
        {
          "id": "council",
          "label": "재상의 집무실",
          "kind": "place",
          "aliases": [
            "재상",
            "집무실"
          ]
        },
        {
          "id": "dragon",
          "label": "용왕의 대기실",
          "kind": "place",
          "aliases": [
            "용왕",
            "대기실"
          ]
        }
      ],
      "choices": [
        {
          "id": "confront-regent",
          "label": "두 그릇의 시식 결과를 가지고 재상에게 교체 이유를 묻는다",
          "intent": "choose",
          "target": "council",
          "automatic": true,
          "outcomes": {
            "success": {
              "text": "두 그릇의 반응을 적어 재상의 집무실을 찾아간다. 그 종이를 책상에 놓자 오르가 문을 닫는다. 독이 아니라 맹세를 붙잡는 일이 왜 필요했는지 말하겠다며 맞은편 의자를 가리킨다.",
              "next": "council"
            }
          }
        },
        {
          "id": "hear-dragon",
          "label": "용왕에게 직접 은퇴 이유와 맹세에 관해 묻는다",
          "intent": "choose",
          "target": "dragon",
          "automatic": true,
          "outcomes": {
            "success": {
              "text": "은접시를 내려놓고 왕의 대기실을 찾아가 방문을 알린다. 낮은 기침이 멎은 뒤 들어오라는 답이 들린다. 문을 열고 들어서며, 왕을 위한 계획이라는 말에서 빠져 있던 그의 뜻을 묻기로 한다.",
              "next": "dragon"
            }
          }
        },
        {
          "id": "prove-sample",
          "label": "봉인한 소금을 두 그릇에 나눠 공개 비교 실험을 한다",
          "intent": "use",
          "target": "bowls",
          "automatic": true,
          "useItems": [
            "salt-vial"
          ],
          "requires": {
            "item": "salt-vial"
          },
          "lockedHint": "향신료 창고에서 모스와 표본을 봉인하거나 원본 소금을 확보해야 한다.",
          "outcomes": {
            "success": {
              "text": "봉인을 확인받은 표본을 두 그릇에 모두 나누자 은접시에만 맹세가 남아 도란의 독살 혐의가 풀린다. 빈 표본병을 내려놓는다. 시험 기록을 챙겨 증인들과 재상의 집무실로 가, 소금을 바꾼 이유를 묻는다.",
              "next": "council",
              "set": [
                "chef_safe",
                "salt_seized"
              ],
              "clues": [
                "salt",
                "order"
              ],
              "pressure": -1
            }
          },
          "consumeItems": [
            "salt-vial"
          ]
        }
      ],
      "objective": "표본으로 도란의 결백을 보이거나 재상과 용왕에게 이유를 묻는다.",
      "details": [
        {
          "id": "bowl-test",
          "label": "빈 그릇에 소금만 넣어 반응을 비교한다",
          "text": "왕실 문양에 소금이 닿을 때만 마지막 맹세를 붙잡는 회로가 나타난다. 먹어 볼 필요가 없는 검증이다.",
          "clue": "salt"
        }
      ],
      "callbacks": [
        {
          "when": {
            "notFlag": "chef_safe"
          },
          "text": "도란 곁에는 경비가 남아 있다. 용왕이 안전한 조리를 계속 맡으라 해 시식에 협조하는 중이다. 일할 손은 풀렸지만 혐의를 벗은 것은 아직 아니다."
        },
        {
          "when": {
            "flag": "salt_seized"
          },
          "text": "챙긴 소금의 봉인과 교체 명령서에 같은 인장이 찍혀 있다. 재상의 이름은 그릇에서 본 작용과 떨어뜨려 둘 수 없게 됐다."
        }
      ],
      "resurrection": {
        "label": "왕실 불사조 재에 동료의 이름을 새긴다",
        "text": "왕실에는 화염 사고로 죽은 이를 되돌릴 수 있는 불사조 재가 남아 있다. 살아 있는 동료가 자신의 불씨를 나눠 재를 깨우는 판정을 한다. 운명 1개와 왕실 의심 2를 지불한다. 실패하면 죽은 사람은 아직 돌아오지 않는다.",
        "sparkCost": 1,
        "pressureCost": 2,
        "dc": 12
      },
      "summary": "왕실 문양이 있는 그릇에서만 소금에 말로 한 약속이 새겨진다.",
      "stakes": "독이 아니어도 그대로 먹으면 맹세에 묶인다. 소금과 왕실 식기를 함께 치워야 한다."
    },
    "council": {
      "id": "council",
      "title": "재상의 아주 합리적인 감옥",
      "chapter": 3,
      "location": "재상 오르의 집무실",
      "art": 2,
      "mood": "tension",
      "text": [
        "재상 오르는 독 이야기를 그만하고 창밖의 눈을 가리킨다. “폐하가 떠나면 백성이 얼어 죽습니다.” 책상 아래에는 그가 반려한 화덕 예산서가, 위에는 도란 몰래 소금을 바꾸라는 명령서가 놓였다.",
        "“죽이려던 건 아닙니다.” 오르가 말한다. 왕을 떠나지 못하게 하려 했다는 말은 지우지 않는다. 마을 화덕 도면 옆에 결재용 펜이 있다. 창밖의 눈이 쌓이는 동안, 누구에게 얼마를 맡길지 적을 칸은 여전히 비어 있다."
      ],
      "entities": [
        {
          "id": "regent",
          "label": "재상 오르",
          "kind": "person",
          "aliases": [
            "오르",
            "재상"
          ]
        },
        {
          "id": "budget",
          "label": "반려된 화덕 예산서",
          "kind": "object",
          "aliases": [
            "예산",
            "화덕",
            "서류"
          ]
        },
        {
          "id": "bell",
          "label": "왕실 전령 호출종",
          "kind": "object",
          "aliases": [
            "종",
            "전령"
          ]
        }
      ],
      "choices": [
        {
          "id": "shared-budget",
          "label": "화덕 도면을 펴고 공사비와 관리할 사람을 정하자고 한다",
          "intent": "talk",
          "target": "regent",
          "stat": "heart",
          "dc": 13,
          "risk": "그가 거부하면 친위대를 불러 연회장을 봉쇄한다.",
          "outcomes": {
            "critical": {
              "text": "도면에 화덕별 비용과 맡을 자리를 적자 오르가 펜을 든다. 그는 예산 승인과 소금 교체 명령 공개에 함께 서명한다. 협약을 챙기는 순간 굴뚝 압력이 높다는 전갈이 와, 연회장 쪽으로 움직인다.",
              "next": "chimney",
              "set": [
                "heating_plan",
                "charter_agreed",
                "regent_exposed"
              ],
              "clues": [
                "heating",
                "charter",
                "order"
              ],
              "pressure": -1
            },
            "success": {
              "text": "화덕 도면을 펴고 비용을 따져 묻자 오르가 반려했던 서류를 다시 읽는다. 공동 관리안에 서명이 남는다. 승인서를 챙긴 일행에게 굴뚝 과열 전갈이 닿아, 합의한 불부터 지키러 간다.",
              "next": "chimney",
              "set": [
                "heating_plan",
                "charter_agreed"
              ],
              "clues": [
                "heating",
                "charter"
              ]
            },
            "failure": {
              "text": "도면의 예산을 요구하자 오르가 친위대를 부른다. 대체 난방이 가능하다는 계산은 남았지만 서명은 없다. 원본을 품고 연회장 쪽으로 나와, 압력이 오른 굴뚝부터 살핀 뒤 공개석상에서 다시 묻기로 한다.",
              "next": "chimney",
              "set": [
                "heating_plan"
              ],
              "clues": [
                "heating"
              ],
              "pressure": 2
            },
            "fumble": {
              "text": "비용 분담 숫자를 잘못 읽은 틈에 오르가 협상을 끝내고 친위대를 부른다. 도면은 되찾았지만 승인 칸은 비어 있다. 연회장으로 물러나, 먼저 과열 굴뚝을 막고 사람들 앞에서 다시 설명할 길을 찾는다.",
              "next": "chimney",
              "set": [
                "heating_plan"
              ],
              "clues": [
                "heating"
              ],
              "gainItems": [
                "hearth-blueprint"
              ],
              "pressure": 3,
              "unset": [
                "charter_agreed"
              ]
            }
          },
          "useItems": [
            "hearth-blueprint"
          ],
          "requires": {
            "item": "hearth-blueprint"
          },
          "lockedHint": "왕실 화덕의 설계나 이 집무실 책상의 첨부 도면을 챙겨야 구체적인 예산을 요구할 수 있다."
        },
        {
          "id": "summon-witnesses",
          "label": "전령을 불러 향신료 교체 명령을 공개한다",
          "intent": "perform",
          "target": "bell",
          "stat": "heart",
          "dc": 12,
          "risk": "재상이 전령을 막으려 해 경계가 높아진다.",
          "outcomes": {
            "critical": {
              "text": "교체 명령과 반려한 화덕 도면을 함께 읽게 하자 서기가 오르의 책임을 적는다. 전령 앞에서 오르가 대체 난방 예산에 서명한다. 승인서와 도면을 챙겨, 연회를 열기 전 굴뚝의 압력 문제부터 보러 간다.",
              "next": "chimney",
              "set": [
                "regent_exposed",
                "charter_agreed",
                "heating_plan"
              ],
              "clues": [
                "order",
                "charter",
                "heating"
              ],
              "gainItems": [
                "hearth-blueprint"
              ]
            },
            "success": {
              "text": "전령에게 원본을 건네자 왕실 인장 아래의 소금 교체 명령이 복도로 울린다. 오르는 더는 방 안에서만 설명할 수 없다. 기록을 지닌 채 밖으로 나와, 연회장 굴뚝이 과열됐다는 전갈을 따라간다.",
              "next": "chimney",
              "set": [
                "regent_exposed"
              ],
              "clues": [
                "order"
              ]
            },
            "failure": {
              "text": "전령을 부르려던 종을 오르가 빼앗아 친위대를 호출한다. 원본 명령서를 챙겨 문을 나서자 연회장 쪽에서 압력 경보가 난다. 굴뚝을 먼저 살핀 뒤, 그 자리의 사람들에게 직접 말하기로 한다.",
              "next": "chimney",
              "clues": [
                "order"
              ],
              "pressure": 2
            },
            "fumble": {
              "text": "전령보다 먼저 친위대가 모이고 오르가 출입문을 막는다. 공개하지 못한 교체 명령을 베껴 품고 비상 통로로 나온다. 통로가 닿는 연회장 굴뚝에서 경보가 울려, 그쪽에서 다음 기회를 찾아야 한다.",
              "next": "chimney",
              "clues": [
                "order"
              ],
              "pressure": 3,
              "unset": [
                "regent_exposed"
              ]
            }
          }
        }
      ],
      "objective": "도면을 펴서 공사비를 요구하거나 소금 교체 명령을 공개한다.",
      "details": [
        {
          "id": "rejected-budget",
          "label": "반려된 예산서와 첨부 화덕 도면을 챙긴다",
          "text": "난방 대안이 기술적으로 불가능했던 것이 아니다. 비용과 권한을 나누는 일을 재상이 거부했다.",
          "clue": "heating",
          "gainItems": [
            "hearth-blueprint"
          ]
        },
        {
          "id": "original-order",
          "label": "책상의 향신료 교체 명령서를 읽는다",
          "text": "재상 오르의 인장으로 기존 소금을 서약 소금으로 바꾸라는 지시가 적혀 있다. 도란에게 작용을 알리지 말라는 문장도 확인한다.",
          "gainItems": [],
          "clue": "order"
        }
      ],
      "summary": "재상은 왕을 떠나지 못하게 하려 소금을 바꿨다. 다른 화덕 예산은 자기가 막았다.",
      "stakes": "재상이 거부하면 친위대가 온다. 증거를 들고 연회장으로 갈 길은 남는다."
    },
    "dragon": {
      "id": "dragon",
      "title": "왕관보다 무거운 담요",
      "chapter": 3,
      "location": "용왕의 수정 대기실",
      "art": 2,
      "mood": "calm",
      "text": [
        "용왕 아르단은 왕좌 대신 두툼한 담요에 몸을 말고 있다. 자리 찾는 소리를 듣고 꼬리를 조금 치워 준다. 콧김은 뜨겁지만 불꽃 끝은 금세 사라진다. 그는 그 짧은 빛을 숨기지 않는다.",
        "아르단이 말한다. “다음 겨울 전에 다른 불을 만들어야 하네.” 그것이 은퇴를 알린 까닭이었다. 담요 아래에서 마을 화덕 도면과 청원서가 나온다. 왕실 비용으로 화덕들을 잇자는 계획이다. 아르단은 종이를 내민 뒤 빈 찻잔을 양손으로 감싼다."
      ],
      "entities": [
        {
          "id": "dragon",
          "label": "용왕 아르단",
          "kind": "person",
          "aliases": [
            "용왕",
            "아르단",
            "왕"
          ]
        },
        {
          "id": "blanket",
          "label": "왕의 담요",
          "kind": "object",
          "aliases": [
            "담요"
          ]
        },
        {
          "id": "plans",
          "label": "왕이 감춘 화덕 청원서",
          "kind": "object",
          "aliases": [
            "청원",
            "설계",
            "화덕"
          ]
        },
        {
          "id": "test-hearth",
          "label": "대기실의 작은 시험 화로",
          "kind": "object",
          "aliases": [
            "시험 화로",
            "작은 화로"
          ]
        }
      ],
      "choices": [
        {
          "id": "honest-council",
          "label": "불꽃이 약해지는 사실을 만찬에서 직접 말해 달라고 부탁한다",
          "intent": "talk",
          "target": "dragon",
          "stat": "heart",
          "dc": 11,
          "risk": "왕이 망설이는 동안 친위대가 연회장을 통제한다.",
          "outcomes": {
            "critical": {
              "text": "혼자 더 버티겠다는 말 대신 누구와 언제 준비할지 말해 달라고 한다. 아르단이 예산에 서명하고 직원들에게 일행을 도우라 청한다. 왕의 설명과 도면을 들고 나서자, 과열된 굴뚝을 봐 달라는 호출이 온다.",
              "next": "chimney",
              "set": [
                "dragon_truth",
                "heating_plan",
                "charter_agreed",
                "cook_friend"
              ],
              "clues": [
                "wish",
                "charter",
                "heating"
              ],
              "gainItems": [
                "hearth-blueprint"
              ],
              "pressure": -2
            },
            "success": {
              "text": "약해진 불을 직접 말해 달라는 부탁에 아르단이 고개를 끄덕인다. 화덕 도면과 예산 승인서를 건네며 자기 입으로 설명하겠다고 한다. 그 약속을 들고, 전갈이 온 연회장 굴뚝으로 향한다.",
              "next": "chimney",
              "set": [
                "dragon_truth",
                "heating_plan",
                "charter_agreed"
              ],
              "clues": [
                "wish",
                "charter"
              ],
              "gainItems": [
                "hearth-blueprint"
              ]
            },
            "failure": {
              "text": "만찬에서 말해 달라고 하자 아르단이 입을 열지 못한다. 그래도 약해진 불꽃을 보이고 도면은 건넨다. 공개 약속 없이 문을 나서니 굴뚝 과열 전갈이 와, 알게 된 사실을 품고 그쪽으로 간다.",
              "next": "chimney",
              "set": [
                "dragon_truth"
              ],
              "clues": [
                "wish",
                "heating"
              ],
              "pressure": 1,
              "gainItems": [
                "hearth-blueprint"
              ]
            },
            "fumble": {
              "text": "말을 재촉하자 왕이 기침하고 시종들이 대화를 끝내려 한다. 아르단은 약해진 불을 숨기지 않고 도면만 내민다. 승인도 공개 약속도 얻지 못한 채, 굴뚝이 막혔다는 호출을 따라 대기실을 나온다.",
              "next": "chimney",
              "set": [
                "dragon_truth"
              ],
              "clues": [
                "wish",
                "heating"
              ],
              "gainItems": [
                "hearth-blueprint"
              ],
              "pressure": 3
            }
          }
        },
        {
          "id": "small-future",
          "label": "은퇴한 첫날 무엇을 먹고 싶은지 묻는다",
          "intent": "choose",
          "target": "dragon",
          "automatic": true,
          "outcomes": {
            "success": {
              "text": "첫날 먹고 싶은 것을 묻자 왕이 이름을 밝히지 않고 국밥을 먹고 싶다고 한다. 짧아진 불꽃과 화덕 도면을 내보이며 그 내일을 부탁한다. 굴뚝이 막혔다는 전갈이 와, 도면을 챙겨 연회장 배출구로 간다.",
              "next": "chimney",
              "set": [
                "dragon_truth",
                "heating_plan"
              ],
              "clues": [
                "wish",
                "heating"
              ],
              "gainItems": [
                "hearth-blueprint"
              ]
            }
          }
        },
        {
          "id": "solo-invite-supper",
          "label": "왕관을 놓고 나온 첫날, 국밥 한 그릇을 대접하겠다고 한다",
          "intent": "talk",
          "target": "dragon",
          "stat": "heart",
          "dc": 12,
          "requires": {
            "partyMax": 1
          },
          "risk": "왕이 약속을 받아들이지 못하면 예산 승인은 미뤄진다. 대화가 늦어질수록 연회장의 경계가 높아진다.",
          "outcomes": {
            "critical": {
              "text": "왕관 없이 식사하러 오라 청하자 아르단이 빈 그릇을 끌어당긴다. 그날을 준비하겠다며 화덕 도면과 예산에 서명한다. 초대를 받아 둔 왕을 뒤로하고, 굴뚝이 막혔다는 호출을 따라 승인서를 들고 나간다.",
              "next": "chimney",
              "set": [
                "solo_invited_king",
                "dragon_truth",
                "heating_plan",
                "charter_agreed"
              ],
              "clues": [
                "wish",
                "heating",
                "charter"
              ],
              "gainItems": [
                "hearth-blueprint"
              ],
              "pressure": -2
            },
            "success": {
              "text": "첫 국밥은 대접하겠다 하자 왕이 고기 많은 것으로 부탁한다. 약해진 불 대신 만들 화덕 도면을 설명하며 그날을 준비하겠다고 한다. 종이를 받아 들고, 전갈이 온 연회장 굴뚝으로 향한다.",
              "next": "chimney",
              "set": [
                "solo_invited_king",
                "dragon_truth",
                "heating_plan"
              ],
              "clues": [
                "wish",
                "heating"
              ],
              "gainItems": [
                "hearth-blueprint"
              ],
              "pressure": -1
            },
            "failure": {
              "text": "식사를 청해도 아르단은 아직 떠나는 날을 정하지 못한다. 짧은 불꽃을 보인 뒤 검토할 도면만 내민다. 굴뚝 과열 전갈이 들어와, 답을 받지 못한 초대를 남기고 그 도면과 함께 밖으로 나선다.",
              "next": "chimney",
              "set": [
                "dragon_truth"
              ],
              "clues": [
                "wish",
                "heating"
              ],
              "gainItems": [
                "hearth-blueprint"
              ],
              "pressure": 1
            },
            "fumble": {
              "text": "약속할 날을 재촉하자 왕의 기침이 길어지고 시종이 대화를 막는다. 아르단은 약해진 불을 숨기지 않고 도면만 건넨다. 식사 약속도 승낙받지 못한 채, 급해진 굴뚝 호출을 따라 연회장 쪽으로 간다.",
              "next": "chimney",
              "set": [
                "dragon_truth"
              ],
              "clues": [
                "wish",
                "heating"
              ],
              "gainItems": [
                "hearth-blueprint"
              ],
              "pressure": 3
            }
          }
        },
        {
          "id": "group-test-hearth",
          "label": "작은 시험 화로를 받쳐 용왕의 불꽃을 나누어 보게 돕는다",
          "intent": "help",
          "target": "test-hearth",
          "stat": "wit",
          "dc": 12,
          "requires": {
            "partyMin": 2,
            "aliveMin": 2
          },
          "risk": "화로의 열을 잘못 받으면 행동자가 실패 시 생명 1, 대실패 시 생명 2를 잃는다. 다른 난방 예산도 승인받지 못한다.",
          "outcomes": {
            "critical": {
              "text": "시험 화로를 고정하고 구멍을 나누어 열자 작은 불이 고르게 퍼진다. 아르단은 일행 앞에서 같은 방식의 화덕 예산을 승인한다. 도면에 시험값을 적어 들고, 호출이 온 연회장 굴뚝의 열도 나누러 간다.",
              "next": "chimney",
              "set": [
                "group_shared_flame",
                "dragon_truth",
                "heating_plan",
                "charter_agreed"
              ],
              "clues": [
                "wish",
                "heating",
                "charter"
              ],
              "gainItems": [
                "hearth-blueprint"
              ],
              "pressure": -2
            },
            "success": {
              "text": "화로를 받쳐 방향을 맞추니 왕의 짧은 불꽃이 여러 구멍으로 나뉜다. 아르단이 그 원리를 도면에 짚어 일행에게 보인다. 확인한 종이를 받아, 과열 전갈이 온 연회장 굴뚝으로 움직인다.",
              "next": "chimney",
              "set": [
                "group_shared_flame",
                "dragon_truth",
                "heating_plan"
              ],
              "clues": [
                "wish",
                "heating"
              ],
              "gainItems": [
                "hearth-blueprint"
              ],
              "pressure": -1
            },
            "failure": {
              "text": "화로의 열을 한쪽으로 몰아 손을 덴다. 아르단이 불을 멈추고 도면을 내밀지만 시험도 예산 승인도 끝내지 못했다. 손을 감싼 뒤, 굴뚝이 막혔다는 전갈을 따라 일행과 밖으로 나간다.",
              "next": "chimney",
              "set": [
                "dragon_truth"
              ],
              "clues": [
                "wish",
                "heating"
              ],
              "gainItems": [
                "hearth-blueprint"
              ],
              "harm": 1,
              "pressure": 1
            },
            "fumble": {
              "text": "막힌 구멍을 향한 불이 되튀어 화로를 잡은 몸을 태운다. 왕이 급히 불을 거두고 시종이 치료하는 동안 시험은 중단된다. 원본 도면만 받아 든 채, 과열된 굴뚝을 봐 달라는 호출에 일행과 이동한다.",
              "next": "chimney",
              "set": [
                "dragon_truth"
              ],
              "clues": [
                "wish",
                "heating"
              ],
              "gainItems": [
                "hearth-blueprint"
              ],
              "harm": 2,
              "pressure": 3
            }
          }
        }
      ],
      "dialogue": {
        "who": "용왕 아르단",
        "text": "내가 떠나고 싶은 게 아니라, 떠날 수 있을 때 준비하고 싶은 걸세."
      },
      "objective": "그 사실을 직접 알리도록 부탁하거나 은퇴 뒤 하고 싶은 일을 묻는다.",
      "details": [
        {
          "id": "weak-flame",
          "label": "용왕이 내보이는 불꽃을 살핀다",
          "text": "불꽃이 약해졌다. 은퇴를 막아도 왕국의 기존 난방은 영원히 유지되지 않는다.",
          "clue": "wish"
        }
      ],
      "resurrection": {
        "label": "왕실 불사조 재에 동료의 이름을 새긴다",
        "text": "왕실에는 화염 사고로 죽은 이를 되돌릴 수 있는 불사조 재가 남아 있다. 살아 있는 동료가 자신의 불씨를 나눠 재를 깨우는 판정을 한다. 운명 1개와 왕실 의심 2를 지불한다. 실패하면 죽은 사람은 아직 돌아오지 않는다.",
        "sparkCost": 1,
        "pressureCost": 2,
        "dc": 12
      },
      "summary": "용왕의 불이 약해졌다. 은퇴를 미뤄도 같은 화덕으로 영원히 겨울을 날 수는 없다.",
      "stakes": "왕실 예산 승인이 없으면 마을 화덕 공사를 곧바로 시작할 수 없다.",
      "partyText": {
        "solo": [
          "용왕 아르단이 꼬리를 비켜 의자 하나를 내준다. 혼자 찾아온 손님 앞에서도 그는 담요를 벗지 않는다. 짧아진 불꽃이 찻잔 가장자리를 데우다 사라진다. “더 버틴다고 내년에도 같은 불이 나오는 건 아니라네.”",
          "왕은 마을 화덕 도면을 펴고, 겨울 전에 다른 불을 준비하려고 은퇴를 알렸다고 한다. 하지만 쉬는 첫날 이야기를 먼저 꺼내지는 못한다. 찻잔 맞은편 자리는 조용하다. 왕실의 미래를 물을 수도, 왕관 없는 한 사람을 식사에 초대할 수도 있다."
        ],
        "group": [
          "용왕 아르단의 대기실에는 일행을 위해 여러 의자가 놓였다. 왕은 초대장에 적힌 이름들을 보고 꼬리를 옆으로 치운다. 담요 밖으로 낸 짧은 불꽃이 금세 꺼진다. 더 늦기 전에 다른 난방을 준비하려고 은퇴를 알렸다고 한다.",
          "마을 화덕 도면 옆에는 작은 시험 화로가 있다. 불을 여러 곳에 나누는 법을 보여 줄 물건이지만 뜨거워 손을 받쳐 줄 사람이 필요하다. 왕은 빈 화로와 일행을 번갈아 본다. “혼자 내쉬는 불만으로 해결하던 버릇부터 고쳐야겠군.”"
        ]
      }
    },
    "chimney": {
      "id": "chimney",
      "title": "용의 재채기보다 먼저",
      "chapter": 3,
      "location": "연회장 배출 굴뚝",
      "art": 2,
      "mood": "danger",
      "text": [
        "은식기를 데우며 생긴 소금 증기가 굴뚝 안에서 결정으로 굳었다. 막힌 수정 마개 아래로 압력이 오른다. 지금 용왕이 불을 뿜으면 연회장으로 되밀릴 열기다. 직원들이 손님들을 회랑으로 옮긴다.",
        "외벽에는 마개로 가는 발판이, 안에는 보조 화덕으로 열을 나눌 밸브가 있다. 아래 직결문을 열면 새 솥까지 한 번에 데울 수 있다. 다만 순서를 틀리면 안전벽이 방패가 아니라 일행을 불길 안에 가둘 문이 된다."
      ],
      "entities": [
        {
          "id": "plug",
          "label": "굴뚝의 수정 마개",
          "kind": "object",
          "aliases": [
            "마개",
            "굴뚝"
          ]
        },
        {
          "id": "valve",
          "label": "열기 분배 밸브",
          "kind": "object",
          "aliases": [
            "밸브",
            "분배",
            "화덕"
          ]
        },
        {
          "id": "ledge",
          "label": "눈 쌓인 외벽 발판",
          "kind": "place",
          "aliases": [
            "발판",
            "외벽"
          ]
        },
        {
          "id": "firegate",
          "label": "왕실 화염 직결문",
          "kind": "object",
          "aliases": [
            "직결문",
            "직결",
            "화염문",
            "안전벽"
          ]
        }
      ],
      "choices": [
        {
          "id": "open-plug",
          "label": "외벽 발판을 타고 수정 마개를 연다",
          "intent": "sneak",
          "target": "plug",
          "stat": "agility",
          "dc": 13,
          "risk": "외벽에서 추락하면 실패·대실패 모두 생명 3을 잃는다. 대실패는 경계가 더 높아지고 배출구를 제대로 열지 못한다.",
          "outcomes": {
            "critical": {
              "text": "얼음을 털고 걸쇠를 고정한 뒤 마개를 돌리자 증기가 바깥으로 빠진다. 드러난 배관 표를 읽어 마을 화덕까지 이어질 도면을 완성한다. 안전해진 발판으로 내려와 만찬 준비 회랑으로 간다.",
              "next": "bell",
              "set": [
                "vent_open",
                "heating_plan"
              ],
              "clues": [
                "heating"
              ],
              "gainItems": [
                "hearth-blueprint"
              ],
              "pressure": -1
            },
            "success": {
              "text": "발판을 하나씩 확인하며 올라가 마개를 돌린다. 푸른 증기가 머리 위로 솟고 연회장의 압력계가 내려간다. 직원들이 아래에서 손짓하는 것을 보고, 되짚어 내려와 준비 회랑으로 향한다.",
              "next": "bell",
              "set": [
                "vent_open"
              ]
            },
            "failure": {
              "text": "마개를 잡으려는 순간 발판이 부서지고 몸이 아래 장식물에 부딪힌다. 끊어진 숨 위로 직원들이 구조줄을 내리고 보조 창을 연다. 준비 회랑으로 돌아가 일을 이어갈 수 있는 것은 살아남은 동료뿐이다.",
              "next": "bell",
              "pressure": 2,
              "harm": 3
            },
            "fumble": {
              "text": "갈라진 발판 위로 균형추가 쏠려 몸을 밀어 떨어뜨린다. 숨이 멎는 동안 성 전체에 경보가 번지고 마개도 닫힌다. 직원들이 비상 창과 구조줄을 내놓지만, 이후의 길은 살아남은 동료가 있어야 이어진다.",
              "next": "bell",
              "harm": 3,
              "pressure": 3,
              "unset": [
                "vent_open"
              ]
            }
          }
        },
        {
          "id": "split-heat",
          "label": "밸브를 조절해 열기를 비어 있는 화덕들에 나눈다",
          "intent": "use",
          "target": "valve",
          "stat": "wit",
          "dc": 12,
          "risk": "밸브가 터지면 실패 시 전원 생명 1, 대실패 시 전원 생명 2를 잃는다. 이미 다친 일행은 전멸할 수 있다.",
          "outcomes": {
            "critical": {
              "text": "배관 표를 따라 빈 화덕부터 열자 압력이 고르게 낮아진다. 마을에도 쓸 수 있는 방식임을 확인한 직원이 도면과 장갑을 건넨다. 안정된 바늘을 뒤로하고 안전한 상을 차릴 준비 회랑으로 간다.",
              "next": "bell",
              "set": [
                "vent_open",
                "heating_plan",
                "cook_friend"
              ],
              "clues": [
                "heating"
              ],
              "gainItems": [
                "hearth-blueprint",
                "oven-mitts"
              ],
              "pressure": -1
            },
            "success": {
              "text": "밸브를 나누어 돌리자 열기가 작은 화덕으로 흐른다. 굴뚝의 결정이 가라앉고 이 방식으로 마을도 데울 수 있다는 계산이 맞는다. 직원이 연회장은 안전하다며 준비 회랑으로 길을 내준다.",
              "next": "bell",
              "set": [
                "vent_open",
                "heating_plan"
              ]
            },
            "failure": {
              "text": "밸브가 터져 뜨거운 증기가 일행을 훑는다. 직원들이 비상 창을 열어 큰 폭발은 막는다. 열기가 빠진 뒤 상처를 감싸고, 그들의 부축을 받아 준비 회랑으로 돌아가 남은 식사를 살핀다.",
              "next": "bell",
              "pressure": 2,
              "harmAll": 1
            },
            "fumble": {
              "text": "닫힌 배관에 몰린 열이 밸브를 부수어 모두 크게 다친다. 직원들이 보조 창을 전부 열어 압력을 낮춘다. 구호를 받은 뒤 그들과 준비 회랑으로 돌아와, 위험한 상을 그대로 내지 않게 멈춰 세운다.",
              "next": "bell",
              "harmAll": 2,
              "pressure": 3
            }
          }
        },
        {
          "id": "direct-flame",
          "label": "안전벽을 열고 왕실 화염을 새 화덕에 직결한다 (전멸 위험)",
          "intent": "use",
          "target": "firegate",
          "stat": "wit",
          "dc": 14,
          "risk": "성공하면 준비 회랑을 건너뛰고 안전한 음식과 분산 화덕을 확보한다. 실패하면 전원 생명 2를 잃고, 대실패는 전원 생명 3 피해로 전멸한다.",
          "outcomes": {
            "critical": {
              "text": "빈 화덕을 먼저 잇고 직결문을 열자 불꽃이 골고루 나뉜다. 새 솥에서 국이 끓는 것을 본 왕실 대표가 공동 화덕 비용에 서명한다. 도면을 챙겨 준비 회랑을 건너뛰고 연회장으로 들어간다.",
              "next": "banquet",
              "set": [
                "vent_open",
                "heating_plan",
                "feast_saved",
                "charter_agreed"
              ],
              "clues": [
                "heating",
                "charter"
              ],
              "gainItems": [
                "hearth-blueprint"
              ],
              "pressure": -3
            },
            "success": {
              "text": "연결키의 순서를 맞춰 직결문을 열자 왕실 불꽃이 작은 화덕에 나뉜다. 도란이 새 솥의 국을 완성하고 사람들의 의심도 잦아든다. 준비 회랑을 지나칠 수 있어 곧장 연회장의 빈자리로 간다.",
              "next": "banquet",
              "set": [
                "vent_open",
                "heating_plan",
                "feast_saved"
              ],
              "clues": [
                "heating"
              ],
              "pressure": -2
            },
            "failure": {
              "text": "늦게 열린 직결문에서 열이 새어 일행 모두가 크게 다친다. 밖의 직원들이 차단기를 내려 폭발은 막지만 새 솥은 데우지 못한다. 구호를 받고 준비 회랑으로 물러나 안전한 식사를 다시 마련해야 한다.",
              "next": "bell",
              "harmAll": 2,
              "pressure": 2
            },
            "fumble": {
              "text": "거꾸로 열린 직결문에서 화염이 밀려와 안전벽 안의 일행을 전부 덮친다. 직원들이 벽을 열었을 때에는 나눠 줄 불씨를 가진 동료가 남지 않았다. 불사조 재는 깨어나지 않고 만찬 종만 멎는다.",
              "next": "bell",
              "harmAll": 3,
              "pressure": 3
            }
          }
        }
      ],
      "objective": "밖의 마개를 열거나 열기를 빈 화덕으로 나눈다.",
      "callbacks": [
        {
          "when": {
            "flag": "cook_friend"
          },
          "text": "주방 직원들이 젖은 천과 긴 갈고리를 가져와 당신들의 발밑을 받쳐 준다."
        },
        {
          "when": {
            "flag": "solo_invited_king"
          },
          "text": "접힌 도면 여백에 아르단이 국밥집 약속을 작게 써 두었다. 화덕 수치 옆의 그 한 줄이 은퇴 뒤 하루를 구체적으로 남긴다."
        },
        {
          "when": {
            "flag": "group_shared_flame"
          },
          "text": "대기실의 작은 시험 화로에서 본 불길이 떠오른다. 한곳에 몰지 않고 나누었을 때, 짧은 불도 여러 구멍에서 고르게 탔다."
        }
      ],
      "summary": "소금 증기가 굳어 굴뚝을 막았다. 다음 불꽃이 연회장으로 되밀릴 수 있다.",
      "stakes": "추락하거나 증기에 데일 수 있다. 화염 직결을 대실패하면 일행 전원이 죽는다."
    },
    "bell": {
      "id": "bell",
      "title": "만찬 종을 울리는 방법",
      "chapter": 3,
      "location": "연회장 준비 회랑",
      "art": 2,
      "mood": "tension",
      "text": [
        "보조 창으로 마지막 증기가 빠지고 연회장의 진동이 잦아든다. 식탁에는 아직 은접시가 놓여 있다. 바뀐 맹세 대본도 각 자리에서 읽을 사람을 기다린다. 불을 막은 것만으로 식사가 안전해지지는 않았다.",
        "도란이 일반 솥과 토기 그릇을 내고, 왕녀 이리스가 대본을 거둘 사람을 부른다. 직접 상을 바꾸거나 종을 울려 먼저 설명할 수 있다. 주방 보조 피프가 뜨거운 그릇 손잡이를 천으로 감싼다. 방열 장갑이 있으면 천천히 옮겨도 괜찮다고 한다."
      ],
      "entities": [
        {
          "id": "chef",
          "label": "주방장 도란",
          "kind": "person",
          "aliases": [
            "도란",
            "주방장"
          ]
        },
        {
          "id": "bowls",
          "label": "안전한 토기 그릇",
          "kind": "object",
          "aliases": [
            "토기",
            "그릇"
          ]
        },
        {
          "id": "bell",
          "label": "만찬 종",
          "kind": "object",
          "aliases": [
            "종",
            "끈"
          ]
        },
        {
          "id": "script",
          "label": "강요된 맹세 대본",
          "kind": "object",
          "aliases": [
            "대본",
            "맹세"
          ]
        }
      ],
      "choices": [
        {
          "id": "new-service",
          "label": "주방과 함께 일반 솥과 토기 그릇으로 상을 다시 낸다",
          "intent": "help",
          "target": "bowls",
          "stat": "agility",
          "dc": 11,
          "risk": "허가를 다 받기 전에 그릇을 바꾼다. 실패하면 경비가 막고, 대실패하면 뜨거운 그릇에 생명 1도 잃는다. 방열 장갑이 있으면 안전한 절차를 선택할 수 있다.",
          "outcomes": {
            "critical": {
              "text": "뜨거운 그릇을 받을 자리부터 만들고 직원의 순서에 맞춰 움직인다. 토기의 새 국과 바뀐 재료를 본 손님들도 도란의 혐의를 거둔다. 주방의 도움을 받아 마지막 은접시를 치우고 연회장 자리에 앉는다.",
              "next": "banquet",
              "set": [
                "feast_saved",
                "chef_safe",
                "cook_friend"
              ],
              "pressure": -1
            },
            "success": {
              "text": "직원들과 발을 맞추어 은접시를 거두고 토기에 새 국을 담는다. 번쩍이는 장식은 줄었지만 김 속의 냄새는 좋아졌다. 빈 수레를 돌려놓고, 안전한 그릇이 놓인 연회장으로 들어간다.",
              "next": "banquet",
              "set": [
                "feast_saved"
              ]
            },
            "failure": {
              "text": "그릇을 바꾸던 손 앞을 경비가 막는다. 도란은 국을 더 내지 않고 빈 토기만 놓아 위험한 식사를 늦춘다. 채우지 못한 상을 지나 연회장에 들어가, 먼저 멈춰 세울 이유를 설명해야 한다.",
              "next": "banquet",
              "pressure": 1
            },
            "fumble": {
              "text": "뜨거운 그릇을 놓쳐 몸을 데자 경비가 교체를 중단시킨다. 도란이 이전 국까지 거두어 아무도 먼저 먹지 못하게 한다. 아픈 손과 빈 상을 남긴 채, 연회장 안에서 설명할 기회를 찾는다.",
              "next": "banquet",
              "harm": 1,
              "pressure": 3,
              "unset": [
                "feast_saved"
              ]
            }
          }
        },
        {
          "id": "ring-truth",
          "label": "종을 울리고 바뀐 맹세와 소금 때문에 먹으면 안 된다고 알린다",
          "intent": "perform",
          "target": "bell",
          "stat": "heart",
          "dc": 12,
          "risk": "재상의 지지자들이 소란을 일으켜 최종 협상이 어려워진다.",
          "outcomes": {
            "critical": {
              "text": "종소리가 멎은 뒤 바뀐 맹세와 소금, 다른 화덕의 필요를 차례로 말한다. 왕실과 마을 대표들이 비용을 나누겠다고 답하고 직원들은 음식을 바꾼다. 그 응답이 기다리는 연회장에 들어가 다음 겨울을 정한다.",
              "next": "banquet",
              "set": [
                "regent_exposed",
                "feast_saved",
                "charter_agreed"
              ],
              "clues": [
                "charter"
              ],
              "pressure": -1
            },
            "success": {
              "text": "종을 울린 뒤 소리를 낮춰 설명하자 식탁의 말들이 멎는다. 직원들이 위험한 음식을 거두고 재상의 소금 교체가 공개된다. 왕도 자기 말을 할 수 있게 된 연회장으로 들어간다.",
              "next": "banquet",
              "set": [
                "regent_exposed",
                "feast_saved"
              ]
            },
            "failure": {
              "text": "종 뒤에 말을 이으려는데 귀족들의 큰소리가 끼어든다. 아르단이 꼬리로 탁자를 두드리자 겨우 자리가 조용해진다. 준비한 설명을 다 못 한 채, 모두가 보는 식탁 앞에서 결정을 이어가야 한다.",
              "next": "banquet",
              "pressure": 2
            },
            "fumble": {
              "text": "종이 멎기 전에 말을 시작해 설명이 전부 울림에 묻힌다. 재상의 지지자들이 방해꾼이라 외치자 아르단이 직접 식사를 멈춘다. 책임을 밝히지 못한 채 연회장에 들어가, 열린 말할 자리부터 다시 잡는다.",
              "next": "banquet",
              "pressure": 3,
              "unset": [
                "regent_exposed"
              ]
            }
          }
        },
        {
          "id": "protected-service",
          "label": "방열 장갑을 끼고 직원 절차에 맞춰 식기를 교체한다",
          "intent": "use",
          "target": "bowls",
          "automatic": true,
          "useItems": [
            "oven-mitts"
          ],
          "requires": {
            "item": "oven-mitts"
          },
          "lockedHint": "왕실 주방의 피프나 화덕 기술자 델에게 방열 장갑을 빌려야 한다.",
          "outcomes": {
            "success": {
              "text": "장갑으로 뜨거운 은접시를 거두고 피프가 확인한 새 국을 토기에 담는다. 경비에게 절차를 설명하느라 눈길은 늘었지만 다친 사람은 없다. 장갑을 챙기고 도란과 연회장에 들어서니 새 그릇들이 놓여 있다.",
              "next": "banquet",
              "set": [
                "feast_saved"
              ],
              "pressure": 1
            }
          }
        }
      ],
      "objective": "그릇을 바꾸거나 종을 울려 먹기 전에 이유를 설명한다.",
      "details": [
        {
          "id": "ordinary-pot",
          "label": "토기 그릇에 왕실 문양이 없는지 확인한다",
          "text": "서약 소금은 왕실 문양과 함께 쓰일 때 작동한다. 일반 솥과 토기는 안전한 대체품이다.",
          "clue": "salt"
        }
      ],
      "summary": "증기는 빠졌지만 식탁에는 위험한 은접시와 바뀐 대본이 남았다.",
      "stakes": "급한 서빙은 화상을 입힌다. 방열 장갑을 쓰면 절차를 지켜 안전하게 옮긴다."
    },
    "banquet": {
      "id": "banquet",
      "title": "왕관을 식탁 어디에 놓을까",
      "chapter": 4,
      "location": "수정 용의 연회장",
      "art": 3,
      "mood": "calm",
      "text": [
        "아르단이 왕관을 식탁 한가운데 놓는다. “이전 음식은 손대지 말게.” 왕녀 이리스와 재상 오르, 주방 직원들 곁에 초대받아 온 마을 대표와 기술자들도 앉는다. 도란이 문양 없는 그릇에 안전한 새 국을 담는다.",
        "화덕 예산이 승인됐다면 대표들이 시행 날짜를 적을 수 있다. 아직이라면 왕과 기술자가 마을을 돌며 가르치거나, 마지막 불꽃으로 한 번의 겨울을 벌어야 한다. 아르단이 국자를 내려다본다. “이번 약속은, 내가 혼자 먹는 건 아니겠지?”"
      ],
      "entities": [
        {
          "id": "dragon",
          "label": "용왕 아르단",
          "kind": "person",
          "aliases": [
            "용왕",
            "아르단"
          ]
        },
        {
          "id": "crown",
          "label": "식탁 위 왕관",
          "kind": "object",
          "aliases": [
            "왕관"
          ]
        },
        {
          "id": "charter",
          "label": "겨울 준비 협약서",
          "kind": "object",
          "aliases": [
            "협약",
            "화덕",
            "서류"
          ]
        }
      ],
      "choices": [
        {
          "id": "shared-hearth",
          "label": "승인받은 돈으로 마을 화덕을 짓고 왕 없는 첫 겨울을 준비한다",
          "intent": "choose",
          "target": "charter",
          "automatic": true,
          "outcomes": {
            "success": {
              "text": "승인된 예산을 펴 놓자 마을 대표들이 화덕을 지을 날짜와 맡을 몫을 적는다. 왕실의 돈과 마을의 기술이 같은 종이에 놓인다. 아르단은 서명을 마친 뒤 식탁의 왕관을 다시 쓰지 않는다.",
              "next": "ending-hearth"
            }
          },
          "requires": {
            "flag": "charter_agreed"
          },
          "lockedHint": "재상에게 공동 화덕 예산을 합의시키거나 용왕에게 승인을 받아야 즉시 시행할 수 있다."
        },
        {
          "id": "travel-cooks",
          "label": "용왕·기술자와 마을을 돌며 화덕을 고치고 음식을 나눈다",
          "intent": "choose",
          "target": "dragon",
          "automatic": true,
          "outcomes": {
            "success": {
              "text": "함께 마을을 돌며 가르치자고 청하자 아르단이 여행 일정표를 끌어당긴다. 도란은 이동식 솥을, 이리스는 빵 반죽을 셈한다. 왕이 해야 한다던 일 옆에 길을 함께 갈 사람들의 준비가 놓인다.",
              "next": "ending-caravan"
            }
          }
        },
        {
          "id": "last-flame",
          "label": "용왕이 내어 준 마지막 불꽃으로 새 화덕을 지을 시간을 번다",
          "intent": "choose",
          "target": "crown",
          "automatic": true,
          "outcomes": {
            "success": {
              "text": "한 번의 겨울만 벌자는 뜻을 확인하자 아르단이 마지막 큰 불꽃을 내어 준다. 저장 화덕이 빛나는 동안 끝나는 날짜를 모두에게 보이도록 적는다. 영원하다는 말 없이도 오늘의 약속은 문장으로 남는다.",
              "next": "ending-transition"
            }
          }
        }
      ],
      "objective": "마을 화덕을 짓거나 순회하며 가르치거나 마지막 불꽃으로 한 겨울을 번다.",
      "callbacks": [
        {
          "when": {
            "flag": "regent_exposed"
          },
          "text": "오르는 향신료 교체에 관한 청문회에 응하겠다고 서명한다. 나라를 위했다는 말이 검증을 대신하지는 못한다."
        },
        {
          "when": {
            "flag": "chef_safe"
          },
          "text": "도란은 피고인석 대신 주방장 자리에서 국을 낸다. 그는 퇴직 뒤 첫 가게에 당신들 이름을 적어 두겠다고 한다."
        }
      ],
      "resurrection": {
        "label": "왕실 불사조 재에 동료의 이름을 새긴다",
        "text": "왕실에는 화염 사고로 죽은 이를 되돌릴 수 있는 불사조 재가 남아 있다. 살아 있는 동료가 자신의 불씨를 나눠 재를 깨우는 판정을 한다. 운명 1개와 왕실 의심 2를 지불한다. 실패하면 죽은 사람은 아직 돌아오지 않는다.",
        "sparkCost": 1,
        "pressureCost": 2,
        "dc": 12
      },
      "summary": "왕과 마을 대표들이 같은 식탁에서 다음 겨울을 어떻게 날지 묻는다.",
      "stakes": "공동 화덕에는 승인된 예산이 필요하다. 마지막 불꽃도 영원히 타지는 않는다."
    },
    "ending-hearth": {
      "id": "ending-hearth",
      "title": "왕 없는 첫 국밥",
      "chapter": 4,
      "art": 3,
      "mood": "hope",
      "ending": true,
      "text": [
        "새 겨울은 배관을 묻는 삽 소리로 시작된다. 어느 마을은 연료를, 어느 마을은 기술자를 보낸다. 불이 꺼지면 왕에게 소원을 빌던 사람이 이제 수리 담당자의 문을 두드린다. 고칠 때까지 빌려 줄 난로도 옆집에 있다.",
        "작은 모습의 아르단이 성 밖 국밥집에 앉는다. 도란이 주문을 묻자 그는 왕실 예법 없이 “고기 많이”라고 말한다. 옆 빵집의 이리스가 문을 연다. 식탁에서 내려놓은 왕관 없이도 연기가 오르고 누군가의 밥이 익는다."
      ],
      "epilogues": [
        {
          "when": {
            "flag": "heating_plan"
          },
          "text": "당신들이 복원한 설계는 누구나 볼 수 있는 기술 회관에 걸린다. 다시 한 사람만 알고 있는 불꽃이 되지 않게."
        },
        {
          "when": {
            "flag": "feast_saved"
          },
          "text": "은퇴식에서 쓴 토기 그릇 하나가 도란의 첫 가게에 걸린다. 거창한 왕실 은식기보다 확실히 밥맛이 좋았다는 설명과 함께."
        },
        {
          "when": {
            "flag": "solo_tested_steam"
          },
          "text": "도란은 첫 시험에 썼던 빈 은그릇을 씻어 둔다. 누구에게도 국을 삼키게 하지 않고 의혹을 풀기 시작했다는 자국은 기억에 남는다."
        },
        {
          "when": {
            "flag": "group_steadied_pot"
          },
          "text": "피프는 새로 온 주방 보조에게 뚜껑을 안전하게 받치는 법부터 알려 준다. 은퇴식 날 누군가 동료들이 살필 틈을 만들었던 방식이다."
        },
        {
          "when": {
            "flag": "solo_invited_king"
          },
          "text": "아르단에게는 왕관을 벗고 국밥 한 그릇을 대접받자는 초대가 남았다. 백성의 겨울에 관한 문장들 사이에, 왕이 아닌 손님의 하루도 한 줄을 얻었다."
        },
        {
          "when": {
            "flag": "group_shared_flame"
          },
          "text": "작은 시험 화로가 기술자들 책상에 놓인다. 왕의 불꽃을 여러 곳에 나누어 보았던 밤을, 다음 사람도 손으로 다시 확인할 수 있게 한다."
        }
      ],
      "question": "나라의 큰 문제를 혼자 떠안던 사람이 내려놓을 때, 여러분은 어떤 작은 역할을 맡을 수 있나요?",
      "choices": []
    },
    "ending-caravan": {
      "id": "ending-caravan",
      "title": "전국 순회 마지막 만찬",
      "chapter": 4,
      "art": 3,
      "mood": "hope",
      "ending": true,
      "text": [
        "이동식 화덕을 단 마차가 첫 마을에 멎는다. 아르단은 대신 불을 때 주지 않고 주민과 함께 밸브를 돌린다. 도란의 국과 이리스의 빵 냄새에 수업을 듣겠다는 사람이 예상보다 많이 모인다.",
        "다음 겨울의 제도와 비용은 아직 정해야 한다. 순회단은 답을 대신 적기보다 무엇을 준비할지 마을 사람들과 나눈다. 지도가 바람에 들리자 아르단이 왕관을 올려 누른다. 오늘은 그 무게가 그 일에 꼭 맞는다."
      ],
      "epilogues": [
        {
          "when": {
            "flag": "dragon_truth"
          },
          "text": "아르단은 불꽃이 약해진 사실을 숨기지 않는다. 수업이 끝나면 먼저 담요를 덮고 쉬며, 사람들은 그 빈자리를 배운 기술로 채운다."
        },
        {
          "when": {
            "flag": "cook_friend"
          },
          "text": "주방 직원들이 돌아가며 순회단에 합류한다. 누구도 퇴근 못 하는 왕실 대신, 정해진 휴일이 있는 이상한 국밥 여행이 된다."
        },
        {
          "when": {
            "flag": "solo_tested_steam"
          },
          "text": "도란은 첫 시험에 썼던 빈 은그릇을 씻어 둔다. 누구에게도 국을 삼키게 하지 않고 의혹을 풀기 시작했다는 자국은 기억에 남는다."
        },
        {
          "when": {
            "flag": "group_steadied_pot"
          },
          "text": "피프는 새로 온 주방 보조에게 뚜껑을 안전하게 받치는 법부터 알려 준다. 은퇴식 날 누군가 동료들이 살필 틈을 만들었던 방식이다."
        },
        {
          "when": {
            "flag": "solo_invited_king"
          },
          "text": "아르단에게는 왕관을 벗고 국밥 한 그릇을 대접받자는 초대가 남았다. 백성의 겨울에 관한 문장들 사이에, 왕이 아닌 손님의 하루도 한 줄을 얻었다."
        },
        {
          "when": {
            "flag": "group_shared_flame"
          },
          "text": "작은 시험 화로가 기술자들 책상에 놓인다. 왕의 불꽃을 여러 곳에 나누어 보았던 밤을, 다음 사람도 손으로 다시 확인할 수 있게 한다."
        }
      ],
      "question": "순회단이 여러분의 마을에 온다면, 무엇을 함께 배우고 무엇을 대접하고 싶나요?",
      "choices": []
    },
    "ending-transition": {
      "id": "ending-transition",
      "title": "한 번의 겨울을 위한 불꽃",
      "chapter": 4,
      "art": 3,
      "mood": "hope",
      "ending": true,
      "text": [
        "아르단이 내어 준 마지막 큰 불꽃이 저장 화덕 안에서 고른 빛이 된다. 눈금 옆에 끝나는 날짜를 새긴다. 이번 겨울까지의 불이다. 사람들은 그 날짜 아래에 다음 화덕을 지을 일정을 적기 시작한다.",
        "불을 뿜지 않는 몸으로 왕이 성문을 나선다. 이리스가 자동으로 왕관을 받지는 않는다. 남은 대표들은 다음 겨울과 나라의 일을 의논한다. 어려운 결정들이 남았어도, 오늘의 은퇴식에서는 아무도 끝나지 않을 맹세를 국과 함께 삼키지 않았다."
      ],
      "epilogues": [
        {
          "when": {
            "flag": "heating_plan"
          },
          "text": "기술자들은 확보한 설계에 실제 공사 일정을 적기 시작한다. 벌어 둔 시간이 어디 쓰이는지 시민들이 볼 수 있게 한다."
        },
        {
          "when": {
            "flag": "regent_exposed"
          },
          "text": "오르의 책임을 따지는 청문회는 난방 공사와 별개로 진행된다. 급한 겨울 준비가 다시 모든 질문을 묻어 버리지는 못한다."
        },
        {
          "when": {
            "flag": "solo_tested_steam"
          },
          "text": "도란은 첫 시험에 썼던 빈 은그릇을 씻어 둔다. 누구에게도 국을 삼키게 하지 않고 의혹을 풀기 시작했다는 자국은 기억에 남는다."
        },
        {
          "when": {
            "flag": "group_steadied_pot"
          },
          "text": "피프는 새로 온 주방 보조에게 뚜껑을 안전하게 받치는 법부터 알려 준다. 은퇴식 날 누군가 동료들이 살필 틈을 만들었던 방식이다."
        },
        {
          "when": {
            "flag": "solo_invited_king"
          },
          "text": "아르단에게는 왕관을 벗고 국밥 한 그릇을 대접받자는 초대가 남았다. 백성의 겨울에 관한 문장들 사이에, 왕이 아닌 손님의 하루도 한 줄을 얻었다."
        },
        {
          "when": {
            "flag": "group_shared_flame"
          },
          "text": "작은 시험 화로가 기술자들 책상에 놓인다. 왕의 불꽃을 여러 곳에 나누어 보았던 밤을, 다음 사람도 손으로 다시 확인할 수 있게 한다."
        }
      ],
      "question": "시간을 벌었다는 이유로 다시 미루지 않도록, 여러분은 어떤 기한과 확인을 약속하나요?",
      "choices": []
    }
  },
  "deathEnding": {
    "title": "끝내 식탁에 오르지 못한 이름",
    "art": 2,
    "mood": "danger",
    "text": [
      "만찬 종이 멎는다. 도란이 구호대에 불사조 재를 펼쳐도 항아리는 깨어나지 않는다. 함께 여행한 살아 있는 동료가 자기 불씨를 나누어야 한다. 이번 일행에는 그 이름을 불러 줄 숨이 남아 있지 않다.",
      "아르단은 왕관을 쓴 채 빈 토기 그릇들을 바라본다. 밝혀 둔 증거가 있다면 누군가 이어 읽을 것이다. 오늘 같은 상에 앉기로 했던 일행은 돌아오지 않는다. 조금 식어도 괜찮다던 국 위에서, 더는 김이 나지 않는다."
    ],
    "question": "다음에 이 만찬을 준비할 사람들이 가장 먼저 바꿔야 할 것은 무엇일까요?"
  },
  "items": {
    "salt-vial": {
      "name": "봉인한 서약 소금 표본",
      "description": "재상의 인장이 있는 봉투에서 덜어 봉인한 소금. 왕실 문양의 그릇에서만 맹세를 묶는 작용이 나타난다.",
      "useHint": "시식실에서 이 표본을 공개 비교 실험에 쓰면 요리사의 결백을 안전하게 입증한다.",
      "consumable": true,
      "legacyFlags": [
        "salt_seized"
      ]
    },
    "hearth-blueprint": {
      "name": "공동 화덕 도면",
      "description": "마을의 작은 화덕과 배관을 연결하는 도면. 용왕 한 명의 불꽃 없이도 난방을 나눌 수 있다는 근거다.",
      "useHint": "재상의 집무실에서 이 도면을 펼쳐 예산과 관리 책임을 합의하도록 요구할 수 있다.",
      "legacyClues": [
        "heating"
      ]
    },
    "oven-mitts": {
      "name": "왕실 방열 장갑",
      "description": "대형 솥과 증기 밸브를 다루는 주방용 장갑. 정치적인 허가는 주지 않지만 뜨거운 그릇을 안전하게 옮길 수 있다.",
      "useHint": "만찬 준비 회랑에서 장갑을 끼고 직원 절차대로 음식을 교체하면 위험한 서빙을 피할 수 있다."
    }
  },
  "playModes": {
    "solo": "혼자라면 국을 먹지 않는 시험에 직접 나서거나, 왕관을 벗은 용왕에게 한 끼를 약속할 수 있습니다.",
    "group": "여럿이라면 뜨거운 솥을 붙들어 동료들이 살필 자리를 만들거나, 작은 화로로 왕의 불꽃을 나누어 볼 수 있습니다."
  }
};
export default campaign;
