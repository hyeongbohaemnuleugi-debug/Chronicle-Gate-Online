// Original authored scenario for Chronicle Gate v17.
// Stable scene/choice IDs preserve old saves. Every risky action has four explicit outcomes.
const campaign = {
  "id": "dragon-banquet",
  "title": "용의 마지막 만찬",
  "subtitle": "폐하께서는 퇴위를 원하십니다. 국은 좀 더 원하시고요.",
  "genre": "판타지 희극 · 요리와 왕위",
  "accent": "#c89c62",
  "description": "용왕의 은퇴 만찬에서 푸른 김이 나는 국이 독살 음식으로 몰렸다. 재료와 왕의 맹세를 조사해 실제 강요 장치를 밝히고, 은퇴하는 용왕과 다음 겨울을 나야 하는 마을들 모두를 위한 결정을 내린다.",
  "estimatedMinutes": "35–60",
  "contentNotes": [
    "독살 의혹",
    "화상 위험",
    "정치적 갈등"
  ],
  "objective": "마지막 만찬에 숨은 음모를 밝혀 용왕의 은퇴와 겨울을 함께 해결한다.",
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
          "text": "시식관은 다음 계약서에 «독 감별 능력 없음»을 크게 쓴다. 웃음을 사더라도 살아서 일하는 쪽을 택한다."
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
      "text": "재상의 인장이 찍힌 향신료. 왕실 문양이 있는 음식에 넣으면 먹은 자의 마지막 맹세를 반복하게 만든다."
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
      "text": "옛 맹세는 «백성이 겨울을 나도록 돕는다». 현재 연회 대본에는 «겨울이 끝나기 전에는 떠나지 않는다»로 바뀌었다."
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
    "feast_saved": "일반 솥으로 안전한 음식을 다시 만들었다"
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
        "초대장에는 용왕의 마지막 만찬이라고 적혀 있다. 장엄한 문구 아래 작은 글씨로 «은퇴식입니다. 장례용 꽃을 보내지 마십시오»라는 안내가 붙었다. 성문 앞에는 이미 장례용 화환이 세 개 서 있다.",
        "안으로 들어서자 경비들이 국솥을 포위하고 있다. 재상 오르는 푸른 김을 보고 독살이라고 외쳤고, 주방장 도란은 은식기에 발효 버섯을 담으면 원래 그런 색이 난다고 맞선다. 이것만으로 독인지 아닌지 판단할 수는 없다. 용왕 아르단은 멀리서 “조사는 하되 국이 더 식지는 않게 해 주게”라고 부탁한다."
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
              "text": "색과 독성은 별도로 확인해야 한다고 설명하고 조리 주의문을 보여 준다. 재상은 체포를 미루고 주방 조사도 허가한다. 도란의 보조 피프가 고맙다며 방열 장갑을 건네고, 일행을 주방으로 안내한다.",
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
              "text": "재상은 만찬의 체면을 생각해 체포를 미룬다. 도란은 당신들을 주방으로 안내하며 국부터 떠먹으려다 그만둔다.",
              "next": "kitchen",
              "set": [
                "chef_safe"
              ]
            },
            "failure": {
              "text": "재상은 도란을 경비 감시 아래 시식실로 보내 조리 과정에 관해 조사하라고 명령한다. 체포를 막는 중재는 실패했다. 일행은 귀빈 응접실에서 사건을 설명하라는 지시를 받아, 왕녀와 다른 관계자에게 증거를 물을 길을 찾는다.",
              "next": "salon",
              "pressure": 1
            },
            "fumble": {
              "text": "검증 전에 재상을 거짓말쟁이라고 몰아붙여 경비가 도란을 붙잡는다. 그는 시식실에서 감시받으며 조리 과정에 답하게 되고, 일행도 수사 대상이 된다. 왕녀 이리스가 다른 관계자의 설명도 들어야 한다며 귀빈 응접실에 조사 자리를 마련한다.",
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
              "text": "환영 담당 하인이 일행을 귀빈 응접실로 안내한다. 왕녀 이리스가 만찬의 식순을 바꾼 사람이 재상이라며, 새 대본과 향신료가 같은 날 도착했다고 말한다. 그곳에서 두 기록을 확인해 보기로 한다.",
              "next": "salon"
            }
          }
        }
      ],
      "dialogue": {
        "who": "용왕 아르단",
        "text": "범인을 잡는 동안 국을 다시 데우는 건 가능하겠는가?"
      },
      "objective": "요리사의 체포를 늦추거나 귀빈들에게 사건의 배경을 묻는다.",
      "details": [
        {
          "id": "read-menu",
          "label": "만찬 메뉴의 조리 주의 사항을 읽는다",
          "text": "발효 버섯은 왕실 은식기에 닿으면 푸른 김을 낸다. 색만으로 독이라고 판단할 수 없다.",
          "clue": "menu"
        }
      ],
      "summary": "용왕의 은퇴 만찬에서 푸른 김이 나는 국을 두고 독살 소동이 났다.",
      "stakes": "검증 전에 요리사를 범인으로 몰면 증언을 얻기 어렵고 궁정의 의심도 높아진다."
    },
    "kitchen": {
      "id": "kitchen",
      "title": "왕실 레시피의 가장 작은 글씨",
      "chapter": 1,
      "location": "분주한 왕실 주방",
      "art": 1,
      "mood": "calm",
      "text": [
        "주방에서는 왕의 은퇴보다 오늘 접시 수가 중요하다. 도란의 조리대에는 여섯 종류의 국자와 성 밖 국밥집 간판 시안이 놓여 있다. 하인들은 그의 수상한 지출이 독약 값이라는 소문을 이미 알고 있다.",
        "조리 보조 피프는 향신료 상자가 낮에 바뀌었다고 말한다. 새 상자는 납품 창고에서 왔다. 한편 대형 솥 아래 화덕은 불이 커졌다 줄었다 하며 압력을 올린다. 창고의 재료를 확인할지 화덕을 먼저 점검할지 정할 수 있다. 옆 걸이에는 피프가 빌려 주는 방열 장갑도 있다."
      ],
      "entities": [
        {
          "id": "assistant",
          "label": "조리 보조 피프",
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
              "text": "피프가 출고 전표를 건네며 상자 번호를 가리킨다. 독살 의혹을 밝히려면 실제로 무엇이 들어왔는지 봐야 한다.",
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
              "text": "솥의 무게를 나눠 들고 받침까지 고정해 주자 피프가 지출 장부와 화덕 청원서를 함께 보여 준다. 도란의 지출은 가게 준비였고, 난방에는 대안이 있었다. 장갑과 도면을 빌려 직원들과 화덕을 점검하러 간다.",
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
              "text": "무거운 솥을 함께 옮겨 주자 주방 사람들이 입을 연다. 용의 화염이 요즘 자주 꺼진다는 이야기도 나온다.",
              "next": "ovens",
              "set": [
                "cook_friend"
              ],
              "clues": [
                "ledger"
              ]
            },
            "failure": {
              "text": "솥 손잡이가 미끄러져 모두가 놀란다. 피프가 대신 잡아 주며 “화덕부터 잠가요!”라고 외친다.",
              "next": "ovens",
              "pressure": 1
            },
            "fumble": {
              "text": "손잡이를 급히 잡다가 솥이 기울고 뜨거운 김이 손을 덮어 생명 1을 잃는다. 피프가 솥을 받쳐 더 큰 사고를 막는다. 경비가 소란을 확인하는 동안 기술자가 화덕을 잠가야 한다고 불러, 일행은 화덕 쪽으로 이동한다.",
              "next": "ovens",
              "harm": 1,
              "pressure": 2
            }
          }
        }
      ],
      "objective": "새 재료를 따라 창고로 가거나 직원들과 화덕을 점검한다.",
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
      "summary": "주방에는 교체된 향신료 상자와 불안정한 화덕이 있다.",
      "stakes": "큰 솥은 무겁고 뜨겁다. 급하게 옮기다 대실패하면 다칠 수 있다."
    },
    "salon": {
      "id": "salon",
      "title": "구혼자와 장례용 꽃",
      "chapter": 1,
      "location": "귀빈 응접실",
      "art": 0,
      "mood": "calm",
      "text": [
        "왕녀 이리스는 장례 화환의 흰 리본을 빵집 포장끈으로 잘라 쓰고 있다. “아버지가 은퇴한다고 제가 자동으로 왕이 되는 건 아니잖아요.” 옆자리 귀족들은 그 말을 듣지 못한 척 자기 자녀의 초상화를 꺼낸다.",
        "은퇴식 대본은 재상 오르가 다시 썼다. 왕녀는 문장이 이상하다고 말한다. 옛 왕의 맹세를 확인할 회랑으로 갈 수도, 대본과 함께 배달된 향신료 전표를 따라갈 수도 있다."
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
              "text": "이리스는 왕관 대신 빵집 간판을 그리다 잠시 펜을 멈춘다. “옛 문장에 제가 왕이 돼야 한다는 말도 있는지 봐 주세요.”",
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
              "text": "왕녀에게 조사 목적과 전표를 돌려줄 시각을 분명히 약속한다. 이리스는 납품 허가뿐 아니라 왕실 난방 청원서도 건네며 비용을 어디에 쓸지 함께 보자고 한다. 도면과 전표를 들고 향신료 창고로 간다.",
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
              "text": "왕녀는 자신의 서명을 전표에 크게 쓴다. “적어도 제 이름을 어디 쓸지는 제가 정하죠.” 창고 문이 열린다.",
              "next": "pantry"
            },
            "failure": {
              "text": "귀족들이 시끄럽게 막아선다. 이리스는 전표를 빵 봉투에 넣어 창고 직원에게 보내고 당신들에게 따라가라 눈짓한다.",
              "next": "pantry",
              "pressure": 1
            },
            "fumble": {
              "text": "왕녀의 이름으로 이미 허가받았다고 먼저 말해 귀족들이 위조라고 항의한다. 이리스는 일행을 두둔하되 정식 조사로 돌리겠다며 창고 직원에게 전표를 직접 보낸다. 일행은 감시를 받으며 그 전표를 따라 창고로 간다.",
              "next": "pantry",
              "pressure": 3
            }
          }
        }
      ],
      "objective": "옛 맹세를 확인하거나 향신료 납품 전표를 빌린다.",
      "details": [
        {
          "id": "script-edit",
          "label": "만찬 대본에서 고친 문장을 살핀다",
          "text": "연회 대본의 맹세는 «겨울이 끝나기 전에는 떠나지 않는다». 이전 문장을 확인할 필요가 있다.",
          "clue": "portrait"
        }
      ],
      "summary": "왕녀는 은퇴식 대본의 맹세가 바뀌었다고 말한다.",
      "stakes": "귀족들 앞에서 허가를 얻지 못하면 감시가 붙지만 조사 경로는 남는다."
    },
    "pantry": {
      "id": "pantry",
      "title": "소금에 적힌 재상의 이름",
      "chapter": 2,
      "location": "왕실 향신료 창고",
      "art": 1,
      "mood": "mystery",
      "text": [
        "납품 창고 담당 모스가 교체된 소금 상자를 보여 준다. 뚜껑에는 재상 오르의 인장이 있다. 성분표에는 «서약 소금: 왕실 문양이 있는 그릇에서 먹으면, 먹기 직전에 한 맹세를 몸에 묶는다»고 적혀 있다. 독은 아니어도 사람의 선택을 빼앗는 재료다.",
        "모스는 독성이 없다는 설명만 읽고 납품을 받았다. 상자를 교체하라는 명령서는 보관함에 남아 있다. 원본 소금을 봉인해 시식실로 가져가거나, 누가 주문했는지 모스에게 증언을 받을 수 있다. 실제 작용은 사람에게 먹이지 않고 두 그릇을 비교해 확인할 수 있다."
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
          "label": "창고 담당 모스",
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
              "text": "모스가 지켜보는 앞에서 소금과 인장을 따로 봉인하고 명령서의 출처도 서명받는다. 절차가 분명해 증거 훼손 의심을 줄였다. 봉인 표본과 교체 명령을 들고, 사람이 먹지 않는 비교 시험을 하러 시식실로 간다.",
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
              "text": "소금과 인장을 따로 보관한다. 누가 무엇을 지시했는지 검증할 수 있는 증거가 생겼다. 시식실에서 안전하게 시험할 차례다.",
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
              "text": "봉인이 갈라져 경보가 울린다. 원본 상자는 놓고 명령서와 성분표를 들고 시식실로 간다.",
              "next": "tasting",
              "clues": [
                "salt",
                "order"
              ],
              "pressure": 1
            },
            "fumble": {
              "text": "봉인을 비틀다 표본이 바닥에 쏟아지고 훼손 경보가 울린다. 일행이 가져온 표본도 함께 오염되어 증거로 쓸 수 없게 됐다. 모스가 성분표와 명령서 사본만 보증해 주어, 일행은 시식실의 별도 시험 재료로 확인하러 간다.",
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
              "text": "모스가 무엇을 읽었고 무엇을 놓쳤는지 차례로 묻자 그가 교체 명령의 경위를 모두 적는다. 자신의 실수를 숨기지 않겠다는 뜻으로 원본 표본도 봉인해 준다. 서명과 소금을 들고 함께 시식실에 가 작용을 확인한다.",
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
              "text": "모스는 재상의 직접 명령이었다고 진술한다. 자기가 읽지 않은 주의 사항까지 인정하고 시식실에 동행한다.",
              "next": "tasting",
              "clues": [
                "order",
                "salt"
              ]
            },
            "failure": {
              "text": "그가 재상에게 연락한다. 그러나 당신들이 본 성분표와 인장까지 없앨 수는 없다. 시식실에서 내용물을 시험해야 한다.",
              "next": "tasting",
              "clues": [
                "salt"
              ],
              "pressure": 2
            },
            "fumble": {
              "text": "모스가 추궁을 두려워해 재상에게 일행의 위치와 질문을 전한다. 더는 증언도 원본 반출도 허락하지 않는다. 공개된 성분표만 옮겨 적은 일행은 시식실에 남은 시험 재료를 이용하기로 하고 감시 속에 이동한다.",
              "next": "tasting",
              "clues": [
                "salt"
              ],
              "pressure": 3
            }
          }
        }
      ],
      "objective": "원본 표본을 확보하거나 납품 담당자의 증언을 받는다.",
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
      "summary": "교체된 소금에는 재상의 인장과 맹세를 고정한다는 설명이 있다.",
      "stakes": "봉인을 거칠게 떼면 증거 훼손으로 의심받는다. 소금을 먹어서 시험할 필요는 없다."
    },
    "ovens": {
      "id": "ovens",
      "title": "왕의 불꽃은 자꾸 졸았다",
      "chapter": 2,
      "location": "왕실 대형 화덕",
      "art": 1,
      "mood": "tension",
      "text": [
        "성의 모든 화덕이 하나의 푸른 불꽃과 이어져 있다. 용왕이 숨을 쉴 때마다 불이 커지고, 한숨을 쉬면 줄어든다. 대단한 기술 같지만 왕이 감기에 걸리면 나라가 춥다는 뜻이기도 하다.",
        "화덕 뒤 서랍에는 여러 마을의 작은 화덕을 연결한 설계가 있다. 지난 몇 년 동안 예산이 연속으로 반려됐다. 반려 사유는 늘 같았다. «왕실 화염으로 충분함.»"
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
          "label": "분산 화덕 설계를 다시 계산해 실제로 가능한지 검증한다",
          "intent": "investigate",
          "target": "plans",
          "stat": "wit",
          "dc": 12,
          "risk": "가동 중인 배관을 가까이 조사한다. 실패하면 화상으로 생명 1, 대실패하면 생명 2를 잃는다.",
          "outcomes": {
            "critical": {
              "text": "실제 배관 치수를 대입해 남는 열까지 여러 마을에 나눌 수 있음을 확인한다. 기술자 델은 방열 장갑을 건네고 주방에 조사 협조를 요청한다. 검증한 도면을 챙겨 시식실로 가며 왕실의 의심도 줄인다.",
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
              "text": "새 화덕 몇 개와 마을 사이 배관만 잇으면 된다. 용왕의 불꽃이 약해지기 전에 시작할 수 있는 현실적인 설계다.",
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
              "text": "계산 도중 화덕이 과열되어 뜨거운 배관이 당신의 몸을 스친다. 기술자가 불을 줄여 모두를 시식실로 옮긴다. 도면 원본은 챙겼다.",
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
              "text": "압력이 오르는 배관을 계산하느라 가까이 다가가 큰 화상을 입는다. 생명 2를 잃고 도면 검증도 끝내지 못했다. 델이 불을 줄이고 원본 도면을 챙겨, 부상자를 돌볼 수 있는 시식실로 일행을 옮긴다.",
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
              "text": "델의 신호에 맞춰 압력을 단계별로 낮추자 화덕이 고르게 타오른다. 델은 대체 난방 도면과 장갑을 건네고 직원들에게 일행을 믿어도 된다고 말한다. 덜 위험해진 주방을 뒤로하고 시식실로 이동한다.",
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
              "text": "압력이 떨어지자 기술자가 안도의 숨을 쉰다. 그는 대체 난방 설계를 직접 설명하며 당신들과 시식실로 간다.",
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
              "text": "배관 이음새에서 뜨거운 증기가 터져 당신을 덮친다. 기술자가 비상 밸브를 닫고 동료들이 당신을 시식실의 구호 자리로 옮긴다.",
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
              "text": "배관이 충분히 식기 전에 이음쇠를 열어 뜨거운 증기가 몸을 덮친다. 생명 3을 잃는다. 델이 비상 밸브를 잠그고 도면을 일행에게 건넨다. 살아 있는 동료가 있다면 불사조 재가 있는 시식실로 당신을 옮긴다.",
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
      "objective": "대체 화덕 도면을 검증하거나 과열 배관부터 진정시킨다.",
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
      "summary": "왕국 난방이 용왕의 약해지는 불꽃 하나에 의존하고 있다.",
      "stakes": "가동 중인 배관에 닿으면 화상을 입는다. 체력이 낮으면 사망할 수 있다."
    },
    "gallery": {
      "id": "gallery",
      "title": "초상화 속 왕은 모두 피곤했다",
      "chapter": 2,
      "location": "옛 왕들의 수정 회랑",
      "art": 1,
      "mood": "mystery",
      "text": [
        "역대 용왕의 초상화가 천장까지 걸려 있다. 처음 왕이 된 해에는 모두 멋있다. 마지막 해의 초상화에서는 각자 다른 방식으로 꾸벅꾸벅 졸고 있다. 그림 아래에는 백성이 겨울을 나도록 돕겠다는 같은 문장이 새겨졌다.",
        "왕녀 이리스는 새 만찬 대본을 옆에 놓는다. «백성이 겨울을 나도록 돕는다»가 «겨울이 끝나기 전에는 떠나지 않는다»로 바뀌었다. 난방을 계속 용왕에게만 맡기는 한, 왕이 떠날 날도 끝없이 미뤄지는 문장이다. 이리스는 옛 문장 사본과 마을 화덕 청원서를 확보하도록 도울 수 있다고 말한다."
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
              "text": "바뀐 단어와 작성 날짜까지 나란히 베껴 기록의 출처를 남긴다. 이리스는 원래 맹세를 이행할 현실적인 방법이라며 화덕 도면도 건넨다. 두 자료를 묶어 시식실로 가 새 소금이 어떤 맹세를 붙잡는지 확인한다.",
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
              "text": "두 문장을 나란히 찍은 사본이 나온다. 중요한 단어를 바꾼 사람이 새 소금의 효과를 알고 있었다는 의심이 선명해진다.",
              "next": "tasting",
              "clues": [
                "portrait"
              ]
            },
            "failure": {
              "text": "복사 장치가 멈춘다. 이리스가 직접 문장을 베껴 서명한다. 사본은 덜 화려해도 내용은 남았다.",
              "next": "tasting",
              "clues": [
                "portrait"
              ],
              "pressure": 1
            },
            "fumble": {
              "text": "복사 장치가 원본 훼손으로 오인해 경보를 켠다. 경비가 종이를 압수하려 하자 이리스가 핵심 문장을 직접 베껴 자기 서명을 넣는다. 사본의 내용은 지켰지만 시선이 몰려, 일행은 시식실로 자리를 옮긴다.",
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
              "text": "피곤한 왕들의 표정을 따라 하되 그들이 떠안을 수밖에 없던 일을 짚어 말한다. 이리스는 웃다가 화덕 도면을 내놓고, 조사 중 도란을 풀어 주라는 요청도 시종에게 맡긴다. 일행은 그 지지를 얻어 시식실로 간다.",
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
              "text": "이리스가 처음으로 크게 웃는다. 그녀는 왕실 화염을 나눠 쓰자는 기술자들의 청원서를 꺼낸다. 당신들을 시식실로 안내하며 함께 서명하겠다고 한다.",
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
              "text": "흉내가 생각보다 닮아 귀족들이 놀란다. 이리스가 정식 연습 공연이라 둘러대고 당신들을 시식실로 피신시킨다.",
              "next": "tasting",
              "pressure": 1
            },
            "fumble": {
              "text": "흉내를 내다가 초상화 받침을 건드려 귀족들이 모독이라고 소리친다. 이리스는 수리비를 자신이 설명하겠다고 하지만 경계까지 없애지는 못한다. 일행을 시식실로 보내며, 다음에는 웃기기 전에 증거부터 확인하라고 당부한다.",
              "next": "tasting",
              "pressure": 3,
              "unset": [
                "cook_friend"
              ]
            }
          }
        }
      ],
      "objective": "문장 차이의 사본을 남기거나 왕녀에게 다른 난방 청원을 묻는다.",
      "details": [
        {
          "id": "old-oath",
          "label": "초상화 밑의 원래 맹세를 읽는다",
          "text": "원래 문장은 «백성이 겨울을 나도록 돕는다». 영원히 왕위에 남겠다는 약속이 아니다.",
          "clue": "portrait"
        }
      ],
      "summary": "옛 맹세는 백성을 돕겠다는 말인데 새 대본은 떠나지 못하게 바뀌었다.",
      "stakes": "왕실 기록을 복사하거나 초상화를 흉내 내면 귀족들의 의심을 살 수 있다."
    },
    "tasting": {
      "id": "tasting",
      "title": "국보다 위험한 건 접시였다",
      "chapter": 2,
      "location": "왕실 시식실",
      "art": 1,
      "mood": "tension",
      "text": [
        "시식실 책상에는 왕실 은접시와 평범한 토기 그릇, 창고에서 받은 시험용 소금이 있다. 같은 소금을 넣어 보니 왕실 문양 위에서만 말로 한 약속을 붙드는 글씨가 떠오른다. 푸른 김 자체는 발효 버섯의 반응이지만, 추가된 서약 소금에는 별개의 강요 작용이 있다.",
        "용왕이 바뀐 대본을 읽고 은접시의 국을 먹으면 «겨울이 끝나기 전에는 떠나지 않는다»는 맹세에 묶인다. 재상에게 교체 이유를 따지거나 용왕에게 은퇴 뜻을 물을 수 있다. 봉인한 표본을 챙겼다면 공개 비교 실험으로 요리사의 결백을 먼저 입증할 수도 있다.",
        "구호대에는 불사조 재 항아리가 있다. 죽은 동료의 이름을 부르며 살아 있는 동료가 자신의 불씨를 나눠 주면 되돌릴 기회가 생긴다는 설명이 붙어 있다."
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
              "text": "사람에게 먹이지 않고 확인한 그릇 반응을 기록해 재상의 집무실로 가져간다. 재상 오르는 문을 닫고, 독이 아니라 맹세를 붙잡는 일이 왜 필요했는지 설명하겠다고 한다.",
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
              "text": "은접시를 내려놓고 용왕의 대기실을 찾는다. 왕을 위해서라는 계획에 정작 왕의 말이 빠져 있다.",
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
              "text": "봉인과 출처를 확인한 소금을 은접시와 토기에 각각 넣는다. 직원들 앞에서 왕실 문양 쪽에만 맹세가 남았다. 도란의 국 자체가 독이라는 혐의는 풀리고, 표본은 실험에 모두 쓰였다. 증인들과 재상을 찾아가 소금 교체 명령의 이유를 묻는다.",
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
      "objective": "시료로 증명하거나 재상과 용왕 중 누구에게 먼저 물을지 정한다.",
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
          "text": "도란은 경비의 감시 아래 시식에 협조하라는 지시를 받고 이곳에 와 있다. 용왕은 아무도 위험한 음식을 더 먹지 않도록 도란이 조리 현장을 계속 관리하게 했다. 일할 허락을 받은 것이며, 혐의와 감시가 풀린 것은 아직 아니다."
        },
        {
          "when": {
            "flag": "salt_seized"
          },
          "text": "확보한 소금 원본의 인장과 납품 명령의 인장이 일치한다. 물질의 작용과 지시한 사람이 같은 증거 묶음으로 남는다."
        }
      ],
      "resurrection": {
        "label": "왕실 불사조 재에 동료의 이름을 새긴다",
        "text": "왕실에는 화염 사고로 죽은 이를 되돌릴 수 있는 불사조 재가 남아 있다. 살아 있는 동료가 자신의 불씨를 나눠 재를 깨우는 판정을 한다. 운명 1개와 왕실 의심 2를 지불한다. 실패하면 죽은 사람은 아직 돌아오지 않는다.",
        "sparkCost": 1,
        "pressureCost": 2,
        "dc": 12
      },
      "summary": "같은 소금이 왕실 문양의 그릇에서만 맹세를 묶는 작용을 한다.",
      "stakes": "독살이 아니라는 말만으로 국을 다시 내면 안 된다. 강요를 만드는 소금과 식기를 함께 치워야 한다."
    },
    "council": {
      "id": "council",
      "title": "재상의 아주 합리적인 감옥",
      "chapter": 3,
      "location": "재상 오르의 집무실",
      "art": 2,
      "mood": "tension",
      "text": [
        "오르는 독살 의혹을 더는 주장하지 않는다. 대신 창밖의 눈을 가리킨다. “폐하께서 떠나면 백성이 얼어 죽습니다. 한 분의 자유와 수만 명의 겨울 중 무엇을 고르시겠습니까?” 책상 아래에는 반려한 화덕 예산서들이 쌓여 있다.",
        "책상에는 서약 소금 교체 명령서와 재상이 반려한 공동 화덕 도면이 나란히 있다. 오르는 왕을 죽일 생각은 없었다고 하지만, 본인 의사에 반해 왕위에 묶으려 한 사실은 달라지지 않는다. 도면을 펼쳐 예산과 관리 책임을 정하도록 요구하거나, 명령서 원본을 전령에게 읽힐 수 있다."
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
          "label": "마을 화덕 예산과 책임 분담을 지금 합의하자고 요구한다",
          "intent": "talk",
          "target": "regent",
          "stat": "heart",
          "dc": 13,
          "risk": "그가 거부하면 친위대를 불러 연회장을 봉쇄한다.",
          "outcomes": {
            "critical": {
              "text": "챙긴 도면에 마을별 비용과 관리자를 적어 왕에게만 기대지 않는 안을 만든다. 오르는 반려했던 예산을 승인하고, 자기 교체 명령도 공개하겠다고 서명한다. 협약과 증거를 지킨 일행은 과열된 연회장 굴뚝부터 점검하러 간다.",
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
              "text": "오르는 자신이 반려한 도면을 다시 펼친다. 체면 대신 비용을 나누기로 하고 공동 관리안에 서명한다.",
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
              "text": "오르는 친위대를 부른다. 당신들은 예산서 원본을 들고 빠져나온다. 대체 난방은 가능하지만 합의는 공개석상으로 넘어갔다.",
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
              "text": "예산 숫자를 급히 읽다 비용 분담을 잘못 말하자 오르가 협상을 끝내고 친위대를 부른다. 도면 자체가 틀린 것은 아니지만 승인받지는 못했다. 일행은 원본을 챙겨 연회장으로 나가, 먼저 과열 굴뚝을 막고 공개석상에서 다시 요구하기로 한다.",
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
              "text": "전령에게 교체 명령 원본과 반려한 난방 도면을 함께 읽게 한다. 듣던 왕실 서기가 책임을 기록하고 오르는 대체 화덕 예산을 승인한다. 일행은 도면과 승인서를 가지고, 연회를 열기 전 굴뚝의 압력 문제를 해결하러 간다.",
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
              "text": "전령은 왕실 인장이 있는 명령서를 읽는다. 오르의 주장은 이제 닫힌 방 안에만 있지 않다. 당신들은 연회장 굴뚝으로 향한다.",
              "next": "chimney",
              "set": [
                "regent_exposed"
              ],
              "clues": [
                "order"
              ]
            },
            "failure": {
              "text": "오르가 종을 빼앗아 친위대를 부른다. 당신들은 명령서를 들고 연회장으로 나가 직접 말할 길을 택한다.",
              "next": "chimney",
              "clues": [
                "order"
              ],
              "pressure": 2
            },
            "fumble": {
              "text": "전령이 오기 전에 오르가 종을 빼앗고 집무실의 출입을 막으려 한다. 공개 설명은 실패했고 친위대만 모였다. 일행은 책상에서 본 교체 명령을 기록해 들고 비상 통로로 나가, 연회장 굴뚝 쪽에서 공개할 기회를 찾는다.",
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
      "objective": "대체 도면으로 예산 합의를 얻거나 교체 명령을 공개한다.",
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
      "summary": "재상은 난방을 핑계로 용왕을 떠나지 못하게 하려 했다고 인정한다.",
      "stakes": "재상이 책임을 거부하면 친위대가 연회장에 모인다. 그래도 증거를 지켜 공개석상으로 가져갈 수 있다."
    },
    "dragon": {
      "id": "dragon",
      "title": "왕관보다 무거운 담요",
      "chapter": 3,
      "location": "용왕의 수정 대기실",
      "art": 2,
      "mood": "calm",
      "text": [
        "용왕 아르단은 웅장한 왕좌 대신 두툼한 담요에 몸을 말고 있다. 콧김은 여전히 뜨겁지만 불꽃 끝이 쉽게 사라진다. 그는 당신들이 의자를 찾는 동안 자기 꼬리를 옆으로 조금 치워 준다.",
        "아르단은 자기 불꽃이 약해지는 것을 안다. 은퇴를 선언한 것은 난방을 버리려는 뜻이 아니라 다음 겨울 전에 대체 설비를 만들게 하려는 결정이었다. 그는 왕실 비용으로 마을 화덕을 잇자는 도면과 청원서를 내놓는다. 이를 만찬에서 직접 설명하도록 부탁하거나, 은퇴한 뒤 원하는 삶부터 물을 수 있다."
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
              "text": "용왕에게 혼자 더 버티겠다는 맹세 대신 언제부터 누구와 준비할지 말해 달라고 부탁한다. 아르단은 예산을 승인하고 기술자·주방 직원에게 일행을 돕도록 요청한다. 왕의 설명과 도면을 얻은 일행은 연회장 굴뚝의 과열을 먼저 살피러 간다.",
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
              "text": "아르단은 고개를 끄덕인다. 감춰 둔 화덕 청원서에 왕실 예산을 승인하고, 자기 입으로 설명하겠다고 한다.",
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
              "text": "아르단은 잠시 말을 잃는다. 그래도 청원서는 당신들에게 넘긴다. 왕 대신 말할 책임은 무겁지만 사실을 알게 됐다.",
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
              "text": "왕을 다그치자 그가 말을 잇지 못하고 시종들이 대화를 끝내려 한다. 아르단은 불꽃이 약해진 사실만큼은 숨기지 않고 도면을 내민다. 공개 약속과 예산 승인은 얻지 못한 채, 일행은 연회장 굴뚝이 막혔다는 호출을 받고 이동한다.",
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
              "text": "용왕은 성 밖에서 이름을 밝히지 않고 국밥 한 그릇을 먹고 싶다고 답한다. 일행에게 약해진 불꽃과 공동 화덕 도면을 보여 주며 내일을 준비해 달라고 부탁한다. 그때 굴뚝이 막혔다는 전갈이 와, 도면을 들고 연회장 배출구로 간다.",
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
        }
      ],
      "dialogue": {
        "who": "용왕 아르단",
        "text": "내가 떠나고 싶은 게 아니라, 떠날 수 있을 때 준비하고 싶은 걸세."
      },
      "objective": "왕에게 사실 공개를 부탁하거나 은퇴 이후의 뜻을 듣는다.",
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
      "summary": "용왕은 불꽃이 약해져서 더 늦기 전에 은퇴와 대체 난방을 준비하려 한다.",
      "stakes": "은퇴를 막아도 불꽃이 영원해지지는 않는다. 왕을 대신해 지킬 수 없는 약속을 해서는 안 된다."
    },
    "chimney": {
      "id": "chimney",
      "title": "용의 재채기보다 먼저",
      "chapter": 3,
      "location": "연회장 배출 굴뚝",
      "art": 2,
      "mood": "danger",
      "text": [
        "연회장 준비를 위해 왕실 은식기를 데우자 남은 서약 소금이 증기가 되어 굴뚝에 달라붙는다. 굳은 결정이 수정 마개를 막아 압력이 오르고 있다. 지금 용왕이 불을 뿜으면 연회장까지 뜨거운 증기가 역류한다.",
        "외벽 발판으로 나가 마개를 열거나, 밸브를 돌려 열기를 비어 있는 보조 화덕에 나눌 수 있다. 주방 직원들이 먼저 손님들을 안전한 회랑으로 보낸다. 굴뚝 아래의 직결문을 열면 새 솥과 화덕을 한 번에 데울 수 있지만, 실패하면 안전벽 안의 일행 전체가 화염을 맞는다."
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
              "text": "얼음을 먼저 털고 안전 걸쇠를 건 뒤 수정 마개를 정확히 돌린다. 증기가 바깥으로 빠지고 보조 배관 표지도 읽을 수 있게 된다. 그 표를 도면에 옮겨 대체 난방 경로를 확인한 뒤, 안전해진 발판으로 내려와 만찬 준비 회랑으로 간다.",
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
              "text": "발판을 조심히 밟아 마개를 돌린다. 푸른 증기가 지붕 위로 퍼지고 연회장 압력이 내려간다.",
              "next": "bell",
              "set": [
                "vent_open"
              ]
            },
            "failure": {
              "text": "발판이 부서져 아래 장식 구조물에 세게 부딪히며 생명 3을 잃는다. 직원들이 보조 창을 열어 증기를 빼고 구조줄을 내린다. 살아 있는 동료가 남아 있다면 당신을 준비 회랑으로 옮겨 만찬을 바로잡는 일을 이어갈 수 있다.",
              "next": "bell",
              "pressure": 2,
              "harm": 3
            },
            "fumble": {
              "text": "발판이 갈라지며 마개 쪽 균형추가 당신을 밀어 떨어뜨린다. 생명 3을 잃고 경보가 성 전체에 울린다. 직원들이 비상 창으로 증기를 빼며 구조줄을 내려, 살아 있는 동료들과 함께 당신을 준비 회랑으로 옮긴다.",
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
              "text": "배관 표를 읽고 빈 화덕부터 차례로 열자 굴뚝 압력이 안정된다. 마을 화덕도 같은 방식으로 연결할 수 있음을 현장에서 확인했다. 직원이 장갑과 배관 도면을 챙겨 주고, 일행은 만찬을 안전하게 차리러 준비 회랑으로 간다.",
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
              "text": "열기가 작은 화덕들로 나뉘자 굴뚝의 소금 결정이 천천히 가라앉는다. 연회장은 안전해졌다.",
              "next": "bell",
              "set": [
                "vent_open",
                "heating_plan"
              ]
            },
            "failure": {
              "text": "안전 밸브가 터져 일행에게 뜨거운 증기가 퍼진다. 직원들이 비상 창을 열어 더 큰 폭발은 막는다.",
              "next": "bell",
              "pressure": 2,
              "harmAll": 1
            },
            "fumble": {
              "text": "닫힌 배관 쪽으로 열을 몰아 안전 밸브가 크게 터진다. 일행 전원이 생명 2를 잃는다. 직원들이 보조 창을 모두 열어 압력을 떨어뜨린 뒤, 살아 있는 일행을 준비 회랑으로 데려가 남은 식사 준비를 멈춰 세운다.",
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
              "text": "빈 화덕을 먼저 연결하고 마지막에 직결문을 열어 불꽃을 고르게 나눈다. 안전한 새 솥에서 국이 완성되고, 이 광경을 본 왕실 대표는 공동 화덕 비용을 승인한다. 도면을 챙긴 일행은 준비 회랑을 건너뛰어 연회장으로 들어간다.",
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
              "text": "일행이 같은 순간에 연결키를 돌린다. 왕실 화염이 작은 화덕들로 나뉘고, 도란은 새 솥에서 안전한 국을 곧바로 완성한다. 사람들의 의심이 잦아든 연회장에서 마지막 결정을 할 수 있다.",
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
              "text": "직결문이 조금 늦게 열려 열기가 안전벽 안으로 새고 일행 전원이 생명 2를 잃는다. 직원들이 벽 밖의 차단기를 내려 대형 폭발은 막았다. 새 솥까지 데우는 데는 실패해, 살아 있는 일행은 준비 회랑에서 안전한 식사를 다시 마련해야 한다.",
              "next": "bell",
              "harmAll": 2,
              "pressure": 2
            },
            "fumble": {
              "text": "직결문이 역방향으로 열려 화염이 안전벽 안의 일행을 모두 덮친다. 전원이 생명 3을 잃는다. 밖의 직원들은 닫힌 벽을 제때 열지 못하고, 불사조 재에 자기 불씨를 나눌 살아 있는 동료도 남지 않는다. 만찬 종이 멎는다.",
              "next": "bell",
              "harmAll": 3,
              "pressure": 3
            }
          }
        }
      ],
      "objective": "수정 마개를 열거나 밸브로 열을 나눠 폭발을 막는다.",
      "callbacks": [
        {
          "when": {
            "flag": "cook_friend"
          },
          "text": "주방 직원들이 젖은 천과 긴 갈고리를 가져와 당신들의 발밑을 받쳐 준다."
        }
      ],
      "summary": "달궈진 서약 소금의 증기가 굴뚝을 막아 연회장이 과열되고 있다.",
      "stakes": "외벽은 추락 위험이 있고 배관은 화상을 입힌다. 화염 직결 지름길의 대실패는 전원 사망이다."
    },
    "bell": {
      "id": "bell",
      "title": "만찬 종을 울리는 방법",
      "chapter": 3,
      "location": "연회장 준비 회랑",
      "art": 2,
      "mood": "tension",
      "text": [
        "주방 직원들이 보조 창을 열고 남은 증기를 빼내자 연회장 압력이 가라앉는다. 일행이 굴뚝을 제대로 정비했다면 수정 마개와 밸브도 안정돼 있다. 그러나 식탁의 은접시와 바뀐 맹세 대본은 아직 치우지 못했다.",
        "도란은 새 국을 담을 일반 솥과 토기 그릇을 준비했고, 이리스는 대본을 치울 사람을 모은다. 서빙을 직접 돕거나 종을 울려 참석자들에게 식사를 멈추고 설명부터 듣게 할 수 있다. 방열 장갑이 있다면 직원 절차대로 그릇을 옮겨 부상 위험 없이 상을 바꿀 수 있다."
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
              "text": "뜨거운 그릇을 받을 자리부터 만들고 직원들과 같은 순서로 움직인다. 모든 은접시가 회수되고 도란의 새 국이 토기에 담겼다. 손님들도 바뀐 재료를 확인해 요리사의 혐의를 거두고, 일행을 연회장 협상 자리에 맞는다.",
              "next": "banquet",
              "set": [
                "feast_saved",
                "chef_safe",
                "cook_friend"
              ],
              "pressure": -1
            },
            "success": {
              "text": "은접시가 사라지고 뜨거운 국이 토기 그릇에 담긴다. 사람들은 평소보다 덜 화려하지만 좋은 냄새가 나는 상을 받는다.",
              "next": "banquet",
              "set": [
                "feast_saved"
              ]
            },
            "failure": {
              "text": "경비가 그릇 교체를 막는다. 도란은 국을 더 내지 않고 빈 토기 그릇만 놓는다. 먹기 전에 설명해야 할 상이 된다.",
              "next": "banquet",
              "pressure": 1
            },
            "fumble": {
              "text": "서두르다 뜨거운 그릇을 떨어뜨려 생명 1을 잃고, 경비가 교체 작업을 중단시킨다. 도란은 아무도 이전 음식을 먹지 못하게 국을 거둔다. 빈 상 앞에서 먼저 설명해야 하므로 일행은 연회장으로 들어간다.",
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
          "label": "만찬 종을 울리고 강요된 맹세와 향신료를 공개한다",
          "intent": "perform",
          "target": "bell",
          "stat": "heart",
          "dc": 12,
          "risk": "재상의 지지자들이 소란을 일으켜 최종 협상이 어려워진다.",
          "outcomes": {
            "critical": {
              "text": "종이 멎기를 기다렸다가 바뀐 맹세와 소금의 작용, 대체 난방의 필요를 차례로 설명한다. 왕실과 마을 대표들이 예산을 나누겠다고 응답하고 직원들이 위험한 음식을 거둔다. 일행은 안전해진 연회장에 들어가 합의한 다음 겨울을 정한다.",
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
              "text": "종이 멎자 당신들의 설명이 연회장에 닿는다. 왕이 자기 입으로 은퇴 이유를 말할 자리도 생겼다.",
              "next": "banquet",
              "set": [
                "regent_exposed",
                "feast_saved"
              ]
            },
            "failure": {
              "text": "귀족들이 큰소리로 말을 끊는다. 왕이 직접 꼬리로 탁자를 두드려 조용히 시킨다. 마지막 결정은 모두가 보는 자리에서 내려야 한다.",
              "next": "banquet",
              "pressure": 2
            },
            "fumble": {
              "text": "종을 계속 울리며 설명을 시작해 말이 소리에 묻힌다. 지지자들은 일행을 방해꾼으로 몰고 재상의 책임도 아직 공개되지 못했다. 아르단이 직접 식사를 멈추고 모두를 앉히자, 일행은 연회장에서 마지막 설명과 결정을 이어갈 기회를 얻는다.",
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
              "text": "방열 장갑으로 뜨거운 은접시를 안전하게 거두고, 피프의 확인을 받아 새 국을 토기에 담는다. 경비에게 서빙 절차를 설명하느라 의심이 1 높아졌지만 부상 없이 상을 바꿨다. 도란과 함께 연회장으로 들어가 다음 겨울을 의논한다.",
              "next": "banquet",
              "set": [
                "feast_saved"
              ],
              "pressure": 1
            }
          }
        }
      ],
      "objective": "식기를 바꾸거나 참석자들에게 사실을 알려 식사를 멈춘다.",
      "details": [
        {
          "id": "ordinary-pot",
          "label": "토기 그릇에 왕실 문양이 없는지 확인한다",
          "text": "서약 소금은 왕실 문양과 함께 쓰일 때 작동한다. 일반 솥과 토기는 안전한 대체품이다.",
          "clue": "salt"
        }
      ],
      "summary": "폭발 위험은 막았지만, 은접시와 강요된 맹세 대본이 아직 남아 있다.",
      "stakes": "서두르는 서빙은 뜨거운 그릇에 다칠 수 있다. 방열 장갑이 있으면 직원 절차대로 안전하게 교체할 수 있다."
    },
    "banquet": {
      "id": "banquet",
      "title": "왕관을 식탁 어디에 놓을까",
      "chapter": 4,
      "location": "수정 용의 연회장",
      "art": 3,
      "mood": "calm",
      "text": [
        "용왕 아르단이 왕관을 식탁 가운데 놓고, 안전 확인이 끝날 때까지 아무도 이전 국을 먹지 말라고 지시한다. 왕녀 이리스, 재상, 주방 직원들뿐 아니라 초대받아 와 있던 마을 대표와 기술자들도 같은 상에 앉는다. 오늘은 한 사람의 맹세로 나라의 겨울을 덮을 수 없다.",
        "왕실이 공동 화덕 예산에 동의했다면 대표들이 시행 협약에 서명할 수 있다. 아직 합의가 부족하다면 용왕과 기술자들이 마을을 돌며 설비를 가르치는 순회단을 꾸리거나, 용왕이 자발적으로 내는 마지막 불꽃으로 딱 한 번의 겨울을 준비할 시간을 벌 수 있다. 어떤 길이든 도란은 문양 없는 그릇에 안전한 새 음식을 낸다."
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
          "label": "공동 화덕 협약을 시행하고 왕 없는 첫 겨울을 준비한다",
          "intent": "choose",
          "target": "charter",
          "automatic": true,
          "outcomes": {
            "success": {
              "text": "왕실 예산과 마을의 기술이 한 장의 문서에 만난다. 왕관은 의무를 혼자 떠맡긴 사람의 기념물로 식탁에 남는다.",
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
          "label": "용왕과 기술자들이 순회하며 겨울 준비를 가르치는 만찬단을 만든다",
          "intent": "choose",
          "target": "dragon",
          "automatic": true,
          "outcomes": {
            "success": {
              "text": "아르단은 왕의 명령 대신 여행 일정표를 받는다. 도란은 이동식 솥을, 이리스는 빵 반죽을 챙긴다.",
              "next": "ending-caravan"
            }
          }
        },
        {
          "id": "last-flame",
          "label": "용왕이 동의한 마지막 불꽃을 저장해 전환 기간을 만든다",
          "intent": "choose",
          "target": "crown",
          "automatic": true,
          "outcomes": {
            "success": {
              "text": "아르단은 마지막 큰 불꽃을 내어 저장 화덕에 넣는다. 영원한 해결이 아니라 한 번의 겨울을 벌어 주는 약속임을 모두가 적는다.",
              "next": "ending-transition"
            }
          }
        }
      ],
      "objective": "공동 화덕, 순회 기술단, 마지막 불꽃을 쓰는 전환 기간 중 하나를 정한다.",
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
      "summary": "용왕과 마을 대표들이 강요된 맹세 대신 다음 겨울의 대책을 고르려 한다.",
      "stakes": "한 번의 불꽃으로 영원한 난방을 약속할 수는 없다. 공동 화덕 시행에는 왕실의 예산 동의가 필요하다."
    },
    "ending-hearth": {
      "id": "ending-hearth",
      "title": "왕 없는 첫 국밥",
      "chapter": 4,
      "art": 3,
      "mood": "hope",
      "ending": true,
      "text": [
        "왕국의 새 겨울은 화려한 마법보다 배관 공사와 회의로 시작된다. 어느 마을은 연료를, 어느 마을은 기술자를 내놓는다. 고장 신고는 왕에게 소원을 비는 대신 수리 담당자에게 간다. 완벽하진 않지만 책임질 사람과 고칠 방법이 있다.",
        "아르단은 작은 모습으로 성 밖 국밥집에 앉는다. 도란이 주문을 묻자 그는 생애 처음으로 왕실 예법 없이 “고기 많이”라고 말한다. 이리스의 빵집은 옆 가게다. 왕관이 없어도 서로 먹이고 따뜻하게 해 줄 방법은 남았다."
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
        "마지막 만찬이 한 번으로 끝나지 않는다. 이동식 화덕을 단 마차가 마을을 돌고, 용왕은 예전처럼 대신 불을 때 주는 것이 아니라 주민들에게 화덕을 고치는 법을 가르친다. 도란의 국과 이리스의 빵 덕분에 참석률은 아주 높다.",
        "왕국은 여전히 새로운 제도를 정해야 한다. 순회단은 모든 답을 대신 주지 않는다. 다만 눈 내리는 마을 광장에서 사람들과 같은 음식을 먹고 다음 겨울까지 무엇을 준비할지 함께 적는다. 아르단의 왕관은 이제 지도 위 문진으로 쓰인다."
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
        "용왕은 자기 뜻으로 마지막 큰 불꽃을 내어 준다. 저장 화덕의 눈금에는 끝나는 날짜가 분명히 새겨진다. 불꽃은 만능 보증이 아니라 다음 겨울 전까지 준비를 마쳐야 한다는 기한이 된다.",
        "아르단은 불을 뿜지 않는 몸으로 성문을 나선다. 왕녀는 자동으로 왕이 되지 않고, 나라의 대표들은 다음 체제를 논의하기 시작한다. 쉬운 결정은 뒤에 남았지만 오늘의 왕은 다시는 끝나지 않을 맹세를 먹지 않는다. 은퇴식 국은 조금 식어도 맛있다."
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
      "일행의 마지막 생명이 꺼지자 만찬 종이 멎는다. 도란은 구호 자리를 마련하지만, 불사조 재는 함께 여행한 살아 있는 동료가 자기 불씨를 나누어야 깨어난다. 이번 일행 안에는 그 불씨를 낼 사람이 남지 않았다.",
      "용왕은 왕관을 쓴 채 빈 토기 그릇들을 바라본다. 당신들이 밝혀 둔 증거가 남았다면 다음 사람이 이어받을 수는 있을 것이다. 그러나 오늘 함께 식사하기로 했던 일행은 돌아오지 않는다. 성의 연회는 장례의 침묵으로 바뀐다."
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
  }
};

export default campaign;
