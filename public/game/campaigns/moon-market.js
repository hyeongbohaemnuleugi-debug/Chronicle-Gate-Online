// Original authored scenario for Chronicle Gate v17.
// Stable scene/choice IDs preserve old saves. Every risky action has four explicit outcomes.
const campaign = {
  "id": "moon-market",
  "title": "달을 파는 야시장",
  "subtitle": "동전은 받지 않습니다. 잊어도 좋은 것을 주세요.",
  "genre": "기묘한 동화 · 흥정과 소원",
  "accent": "#e2ad68",
  "description": "기억으로 값을 치르는 야시장이 달을 경매에 내놓았다. 달을 산 사람은 강의 길까지 독점한다. 시장 규칙과 강가의 편지를 모으고 달에게 직접 물어, 누구도 소유하지 않는 다음 밤을 찾는다.",
  "estimatedMinutes": "35–60",
  "contentNotes": [
    "기억 상실",
    "이별",
    "기묘한 동화"
  ],
  "objective": "달 경매가 끝나기 전에 달의 뜻을 듣고 야시장의 다음 행선지를 정한다.",
  "art": "moon-market",
  "pressureLabel": "경매장의 관심",
  "pressureMax": 8,
  "start": "bridge",
  "roles": [
    {
      "title": "처음 보는 단골",
      "secret": "당신 주머니에 이 시장의 단골 도장이 열 개 찍혀 있다. 정작 여기 온 기억은 없다. 도장 마지막 칸에는 «고향을 잊지 않기로 함»이라고 적혀 있다.",
      "goal": "단골 카드의 마지막 약속이 무엇이었는지 확인한다.",
      "reveal": "저는 이 시장에 여러 번 왔나 봐요. 그런데 기억은 없고, 고향을 잊지 않겠다는 약속만 남았어요.",
      "epilogues": [
        {
          "when": {
            "flag": "market_friend"
          },
          "text": "기억 없는 단골은 상인들의 이야기 속에서 자기 지난 방문을 조금씩 찾는다. 새 단골 카드에는 이름보다 먼저 서로 기억할 이야기를 적는다."
        },
        {
          "when": {
            "notFlag": "market_friend"
          },
          "text": "단골 카드는 여전히 설명하지 못한 도장들로 가득하다. 그래도 오늘의 방문만큼은 자기 말로 기록해 두기로 한다."
        }
      ],
      "deadEpilogue": "이름 없는 단골 카드에 마지막 방문의 날짜가 더해진다. 과거를 모두 되찾지는 못해도, 이번에 함께 왔던 사람들은 그 손님을 기억한다."
    },
    {
      "title": "잘못 배달된 소원",
      "secret": "꿈에서 달의 편지를 받았다. 내용은 «구해 주세요»가 아니라 «먼저 물어봐 주세요»였다. 달이 자기 운명을 결정하고 싶어 한다.",
      "goal": "달에게 원하는 것을 직접 묻기 전에는 대신 약속하지 않는다.",
      "reveal": "달이 저에게 부탁했어요. 구해 달라는 말보다, 먼저 물어봐 달라는 말을 했어요.",
      "epilogues": [
        {
          "when": {
            "flag": "moon_heard"
          },
          "text": "달의 편지를 받은 사람은 부탁대로 먼저 물었다. 구해 주었다는 자랑 대신 달이 직접 한 대답을 기억한다."
        },
        {
          "when": {
            "notFlag": "moon_heard"
          },
          "text": "달의 편지를 받은 사람은 빈 대답 칸을 남긴다. 좋은 뜻으로 행동했어도 당사자의 말을 더 듣지 못했다는 질문이 따라온다."
        }
      ],
      "deadEpilogue": "달이 보낸 편지의 받는 사람 칸은 지우지 않는다. 먼저 물어봐 달라는 작은 부탁을 들고 길을 나섰던 이름이 거기에 남는다."
    },
    {
      "title": "기억 수선사의 외상",
      "secret": "수선사에게 기억을 팔아도 바로 없어지지 않고 병에 보관된다고 들었다. 당신도 잊어버린 빗소리를 언젠가 찾고 싶지만, 되찾는 절차를 직접 본 적은 없다.",
      "goal": "기억을 돌려받는 일이 가능한지 확인하고, 남의 기억은 주인의 동의 없이 쓰지 않는다.",
      "reveal": "수선사는 팔린 기억을 바로 없애지 않고 보관한대요. 저도 잊어버린 빗소리를 언젠가 찾고 싶어요.",
      "epilogues": [
        {
          "when": {
            "flag": "rain_returned"
          },
          "text": "수선사의 외상 손님은 이번에 맡긴 기억을 돌려받는 과정을 확인했다. 자기 잊힌 빗소리를 찾을 때도 주인을 증명하고 동의를 확인해야 함을 배웠다."
        },
        {
          "when": {
            "notFlag": "rain_returned"
          },
          "text": "수선사의 외상 손님은 기억을 되찾는 일을 다음 방문의 과제로 남긴다. 적어도 다른 사람의 기억을 마음대로 열지 않는 가게의 위치는 알아냈다."
        }
      ],
      "deadEpilogue": "수선점에는 찾아갈 사람을 기다리는 빗소리 병이 남는다. 그 기억을 함부로 팔지 않도록 원래 주인의 이름표를 고쳐 붙인다."
    },
    {
      "title": "강가의 약속",
      "secret": "고향의 어부들은 달이 바뀌면 강의 길도 바뀐다고 했다. 달을 없애거나 옮기는 결정에는 시장 밖 사람들의 삶도 걸려 있다.",
      "goal": "시장 상인과 강가 주민의 입장을 함께 확인한다.",
      "reveal": "달이 옮겨지면 강의 길도 바뀌어요. 여기 있는 사람들만으로 결정해도 되는 일인지 생각해야 해요.",
      "epilogues": [
        {
          "when": {
            "flag": "river_voice"
          },
          "text": "강가의 약속을 기억한 사람은 주민들의 목소리를 시장 안까지 가져왔다. 선택의 결과를 알리는 편지를 이번에는 직접 강에 띄운다."
        },
        {
          "when": {
            "notFlag": "river_voice"
          },
          "text": "강가의 약속을 품은 사람은 돌아가는 길에 나루를 찾아간다. 대신 결정하기 전에 듣지 못한 사람들에게 먼저 이야기를 설명해야 한다."
        }
      ],
      "deadEpilogue": "강가를 걱정했던 사람의 빈 의자는 시장 밖 목소리를 빼놓지 말라는 약속이 된다. 다음 거래에도 이 자리를 남겨 두기로 한다."
    }
  ],
  "clues": {
    "card": {
      "title": "야시장 통행 규칙",
      "text": "자기 기억만 팔 수 있다. 살아 있는 존재의 이름은 당사자 동의 없이 양도할 수 없다."
    },
    "tea": {
      "title": "달이 남긴 찻잔",
      "text": "잔에 비친 달은 하늘의 달과 다르게 움직인다. 달은 물건이 아니라 스스로 생각하고 선택하는 손님이다."
    },
    "price": {
      "title": "달의 낙찰 조건",
      "text": "달을 낙찰받는 사람은 강의 길과 야시장의 위치를 독점한다. 시장은 달빛으로 길을 찾는다."
    },
    "repair": {
      "title": "기억 수선사의 실",
      "text": "여러 사람이 자발적으로 작은 기억을 나누면, 한 사람의 큰 기억을 빼앗지 않고도 새로운 길을 만들 수 있다."
    },
    "fish": {
      "title": "종이 물고기의 지도",
      "text": "강가의 사람들은 달을 혼자 갖고 싶어 하지 않는다. 오늘도 달빛이 닿는 공동 나루를 쓰고 싶을 뿐이다."
    },
    "auction": {
      "title": "입찰 장부의 공란",
      "text": "경매 위탁자 칸이 비어 있다. 달이 직접 팔기로 동의한 서류는 존재하지 않는다."
    },
    "consent": {
      "title": "달의 대답",
      "text": "달은 사람들의 모든 소원을 대신 책임지는 일이 지쳤다. 떠나거나, 누구의 소유도 아닌 채 잠깐 쉴 권리를 원한다."
    },
    "shared": {
      "title": "공동 나루의 이름",
      "text": "시장과 강가 사람들은 달을 소유하지 않고 길을 함께 지키는 «달잠 나루»에 동의했다."
    }
  },
  "flags": {
    "market_friend": "시장 상인들이 파티를 기억한다",
    "memory_paid": "빗소리에 관한 작은 기억을 통행료로 냈다",
    "rain_returned": "맡겨 둔 빗소리 기억을 되찾았다",
    "repair_helped": "기억 수선사의 일을 도왔다",
    "river_voice": "강가 주민들의 뜻을 확인했다",
    "moon_heard": "달의 뜻을 직접 또는 본인의 진술 기록으로 확인했다",
    "free_clause": "달을 물건으로 팔 수 없다는 조항을 확인했다",
    "joint_name": "시장과 강가의 공동 나루 이름을 정했다",
    "bid_exposed": "동의 없는 경매 사실을 공개했다"
  },
  "nodes": {
    "bridge": {
      "id": "bridge",
      "title": "동전이 물고기가 되는 다리",
      "chapter": 1,
      "location": "강 위 등불 다리",
      "art": 0,
      "mood": "mystery",
      "text": [
        "밤강 위에 어제까지 없던 등불 다리가 걸려 있다. 입구에서 종이 토끼 문지기가 통행료를 받는다. 당신이 내민 동전은 토끼 손에서 은빛 종이로 변한다. 토끼는 그것을 물고기로 접어 강에 놓아 주고, 여기서는 돈을 받지 않는다고 설명한다.",
        "토끼는 빈 찻잔과 작은 저울을 가리킨다. “돈은 다른 데서도 쓸 수 있잖아요. 여기서는 잊어도 좋은 것만 받아요.” 시장 안쪽에서 경매 예고가 울린다. 오늘의 마지막 물건은 달이라고 한다."
      ],
      "entities": [
        {
          "id": "rabbit",
          "label": "종이 토끼 문지기",
          "kind": "person",
          "aliases": [
            "토끼",
            "문지기"
          ]
        },
        {
          "id": "rules",
          "label": "다리의 통행 규칙",
          "kind": "object",
          "aliases": [
            "규칙",
            "안내판"
          ]
        },
        {
          "id": "tea",
          "label": "계절 찻집",
          "kind": "place",
          "aliases": [
            "찻집"
          ]
        },
        {
          "id": "scales",
          "label": "기억 저울",
          "kind": "place",
          "aliases": [
            "저울"
          ]
        }
      ],
      "choices": [
        {
          "id": "story-price",
          "label": "잊지 않아도 되는 재미있는 실패담을 통행료로 제안한다",
          "intent": "talk",
          "target": "rabbit",
          "stat": "heart",
          "dc": 10,
          "risk": "이야기가 거래로 인정되지 않으면 저울에서 값을 다시 정해야 한다.",
          "outcomes": {
            "critical": {
              "text": "실패한 이유까지 솔직히 이야기하자 토끼는 웃으며 손님 장부에 «다시 듣고 싶은 이야기»라고 적는다. 통행료를 받았다는 뜻이다. 규칙 사본도 접어 건네 주고 감시꾼에게 정식 손님이라고 알린 뒤 찻집으로 안내한다.",
              "next": "tea",
              "set": [
                "market_friend"
              ],
              "clues": [
                "card"
              ],
              "gainItems": [
                "rule-slip"
              ],
              "pressure": -1
            },
            "success": {
              "text": "토끼는 웃다가 종이 귀 한쪽이 접힌다. “이건 안 잊어도 돼요. 제가 기억할게요.” 찻집으로 가는 문이 열린다.",
              "next": "tea",
              "set": [
                "market_friend"
              ]
            },
            "failure": {
              "text": "토끼가 진지하게 교훈을 적기 시작한다. 흥정이 길어지자 기억 저울의 상인이 값을 정해 주겠다며 부른다.",
              "next": "scales",
              "pressure": 1
            },
            "fumble": {
              "text": "우스운 이야기 끝에 남 탓을 보태자 토끼가 통행료로 받을 수 없다고 고개를 젓는다. 큰 소리를 들은 감시꾼들이 일행을 기억한다. 토끼는 쫓아내는 대신 저울 상인과 작은 대가부터 다시 정하라며 그쪽으로 보낸다.",
              "next": "scales",
              "pressure": 3
            }
          }
        },
        {
          "id": "weigh-memory",
          "label": "기억 저울에 어떤 값을 낼 수 있는지 묻는다",
          "intent": "choose",
          "target": "scales",
          "automatic": true,
          "outcomes": {
            "success": {
              "text": "토끼는 손에 든 동전을 다시 펴 준다. 이번에는 동전 한쪽에 아는 빗소리가 묻어 있다.",
              "next": "scales"
            }
          }
        }
      ],
      "dialogue": {
        "who": "종이 토끼",
        "text": "남의 기억을 가져오면 반품입니다. 반품은 직접 돌려드리셔야 해요."
      },
      "objective": "문지기와 흥정하거나 기억 저울에서 통행 조건을 확인한다.",
      "details": [
        {
          "id": "bridge-rules",
          "label": "다리의 거래 규칙을 읽고 사본을 챙긴다",
          "text": "자신의 기억만 팔 수 있다. 생각하고 이름을 가진 존재는 본인 동의 없이 양도할 수 없다.",
          "clue": "card",
          "gainItems": [
            "rule-slip"
          ]
        }
      ],
      "summary": "기억을 통행료로 받는 야시장에서 오늘 밤 달을 판다고 한다.",
      "stakes": "남의 기억을 내면 안 된다. 흥정이 틀어지면 저울 상인이 값을 다시 정한다."
    },
    "tea": {
      "id": "tea",
      "title": "찻잔 속의 달은 하품했다",
      "chapter": 1,
      "location": "계절 찻집",
      "art": 0,
      "mood": "calm",
      "text": [
        "찻집 주인은 봄비 한 잔과 여름 끝 한 잔 중 무엇을 마실지 묻는다. 메뉴 뒤에는 «겨울 새벽은 잠시 품절»이라고 적혀 있다. 옆자리의 빈 잔에는 달이 비친다. 하늘의 달은 가만히 있는데 잔 속의 달은 눈을 비빈다.",
        "주인은 목소리를 낮춘다. 달이 어젯밤 여기 와서 잠깐만 아무 소원도 받지 않는 자리를 달라고 했단다. 오늘 경매에 나갈 물건이 스스로 차를 마셨다는 이야기다."
      ],
      "entities": [
        {
          "id": "tea-owner",
          "label": "찻집 주인 단",
          "kind": "person",
          "aliases": [
            "주인",
            "단"
          ]
        },
        {
          "id": "cup",
          "label": "달이 비친 찻잔",
          "kind": "object",
          "aliases": [
            "찻잔",
            "잔",
            "차"
          ]
        },
        {
          "id": "repair",
          "label": "기억 수선점",
          "kind": "place",
          "aliases": [
            "수선점",
            "수선사"
          ]
        },
        {
          "id": "stalls",
          "label": "달빛 노점길",
          "kind": "place",
          "aliases": [
            "노점",
            "가게"
          ]
        }
      ],
      "choices": [
        {
          "id": "cup-listen",
          "label": "찻잔 속 달에게 쉬고 싶은 이유를 묻는다",
          "intent": "talk",
          "target": "cup",
          "stat": "heart",
          "dc": 11,
          "risk": "잔을 너무 오래 붙잡으면 경매 감시꾼이 달빛을 추적한다.",
          "outcomes": {
            "critical": {
              "text": "대답을 재촉하지 않고 차가 식을 때까지 기다리자 달은 소원을 받지 않을 권리를 직접 말한다. 주인 단도 그 말을 손님의 요청으로 적어 준다. 달이 기억을 맡긴 수선점으로 가, 허락 없이 병을 열지 말자는 약속을 확인한다.",
              "next": "repair",
              "clues": [
                "tea",
                "consent"
              ],
              "set": [
                "moon_heard",
                "market_friend"
              ]
            },
            "success": {
              "text": "찻잔에는 “다른 사람 소원 말고 내 소원도 있으면 안 돼?”라는 글씨가 맺힌다. 수선점에서 달이 맡긴 물건을 찾을 수 있단다.",
              "next": "repair",
              "clues": [
                "tea"
              ]
            },
            "failure": {
              "text": "잔 속 달빛이 숨는다. 주인은 달이 놀랐을 뿐이라며 노점 상인들에게 경매 이야기를 알아보라고 한다.",
              "next": "stalls",
              "pressure": 1
            },
            "fumble": {
              "text": "잔을 빛 쪽으로 돌리다 경매 감시꾼에게 달빛을 보여 준다. 달은 놀라 모습을 숨기고 찻집은 감시 대상이 된다. 주인 단이 노점길 뒷문을 열어 일행을 보내며, 경매가 왜 열리는지 상인들에게 먼저 알아보라고 한다.",
              "next": "stalls",
              "pressure": 3
            }
          }
        },
        {
          "id": "ask-sellers",
          "label": "달을 판다는 노점 상인들의 말을 들어본다",
          "intent": "choose",
          "target": "stalls",
          "automatic": true,
          "outcomes": {
            "success": {
              "text": "차를 한 모금 마시자 지난여름의 더위가 잠깐 돌아온다. 당신들은 달빛이 모여 있는 노점길로 향한다.",
              "next": "stalls"
            }
          }
        }
      ],
      "objective": "달의 사연을 더 듣거나 경매 조건을 조사한다.",
      "details": [
        {
          "id": "watch-cup",
          "label": "찻잔과 하늘의 달을 번갈아 본다",
          "text": "찻잔 속 달은 하품하고 몸을 돌린다. 달에게는 스스로의 생각이 있다.",
          "clue": "tea"
        }
      ],
      "summary": "찻잔 속 달은 스스로 움직이고 쉬고 싶다고 말한다.",
      "stakes": "달빛에 오래 접근하면 경매 감시꾼이 일행의 위치를 알아챈다."
    },
    "scales": {
      "id": "scales",
      "title": "가벼운 기억의 무게",
      "chapter": 1,
      "location": "기억 저울 가게",
      "art": 0,
      "mood": "calm",
      "text": [
        "저울 상인은 당신들에게 대단히 소중한 기억부터 꺼내지 말라고 말한다. “첫사랑은 여기 오신 손님들이 너무 많이 팔아요. 나중에 찾으러 와서 아주 곤란합니다.” 대신 비 오는 날 창문에 맺히던 익숙한 소리를 제안한다.",
        "저울 옆에는 기억을 되찾으러 온 사람들의 외상 쪽지가 걸려 있다. 값은 정해져 있지 않다. 무엇을 잊을지 말할 수 있는 사람의 동의가 통행보다 먼저다."
      ],
      "entities": [
        {
          "id": "merchant",
          "label": "저울 상인 한톨",
          "kind": "person",
          "aliases": [
            "한톨",
            "상인"
          ]
        },
        {
          "id": "scale",
          "label": "기억 저울",
          "kind": "object",
          "aliases": [
            "저울"
          ]
        },
        {
          "id": "notes",
          "label": "외상 쪽지",
          "kind": "object",
          "aliases": [
            "쪽지",
            "외상"
          ]
        }
      ],
      "choices": [
        {
          "id": "pay-rain",
          "label": "내가 잊어도 좋은 빗소리 하나를 통행료로 맡긴다",
          "intent": "choose",
          "target": "scale",
          "automatic": true,
          "outcomes": {
            "success": {
              "text": "행동한 사람이 자발적으로 고른 작은 빗소리 기억을 맡긴다. 한톨은 원하면 수선점에서 찾아갈 수 있다며 보관 기록을 남긴다. 일행은 그곳에서 기억이 어떻게 보관되는지 확인하러 간다.",
              "next": "repair",
              "set": [
                "memory_paid"
              ],
              "clues": [
                "repair"
              ]
            }
          }
        },
        {
          "id": "work-price",
          "label": "기억 대신 수선점에서 일을 해 주겠다고 흥정한다",
          "intent": "talk",
          "target": "merchant",
          "stat": "heart",
          "dc": 11,
          "risk": "흥정이 길어지면 경매장의 눈길을 끈다.",
          "outcomes": {
            "critical": {
              "text": "기억을 대신 내겠다고 하지 않고 어떤 일을 끝내면 통행료가 되는지 분명히 정한다. 한톨은 수선 일을 소개하며 정식 통행을 기록하고 거래 규칙 사본도 준다. 일행은 약속한 일감을 들고 수선점으로 간다.",
              "next": "repair",
              "set": [
                "market_friend"
              ],
              "clues": [
                "card"
              ],
              "gainItems": [
                "rule-slip"
              ],
              "pressure": -1
            },
            "success": {
              "text": "한톨은 수선사에게 보낼 물방울 실꾸리를 건넨다. 일손 하나도 기억만큼 귀한 밤이라고 한다.",
              "next": "repair",
              "set": [
                "market_friend"
              ]
            },
            "failure": {
              "text": "한톨은 값을 대신할 일을 정하지 못해 계약을 보류한다. 대신 수선사가 직접 판단하도록 임시 통행을 허용한다. 주변 상인들의 눈길을 받으며 일행은 수선점으로 간다.",
              "next": "repair",
              "pressure": 1
            },
            "fumble": {
              "text": "일의 양도 듣기 전에 모두 맡겠다고 했다가 약속을 지킬 수 없다는 사실을 알아챈다. 한톨은 계약을 취소하고 경매 감시꾼에게 임시 손님이라고 알린다. 일행은 수선사에게 직접 작은 일을 부탁해 보라는 소개를 받아 수선점으로 간다.",
              "next": "repair",
              "pressure": 3,
              "unset": [
                "market_friend"
              ]
            }
          }
        }
      ],
      "objective": "기억 하나를 자발적으로 맡길지, 수선 일을 할지 정한다.",
      "details": [
        {
          "id": "consent-note",
          "label": "저울 옆 거래 규칙을 종이에 옮겨 적는다",
          "text": "본인이 동의하지 않은 기억 거래는 무효다. 규칙은 손님과 상인에게 똑같이 적용된다.",
          "clue": "card",
          "gainItems": [
            "rule-slip"
          ]
        }
      ],
      "summary": "저울 상인은 작은 기억 또는 도움을 통행 대가로 제안한다.",
      "stakes": "기억을 맡기면 그 빗소리가 낯설어진다. 소중한 기억이나 타인의 기억을 낼 필요는 없다."
    },
    "stalls": {
      "id": "stalls",
      "title": "달을 사면 강이 따라온다",
      "chapter": 2,
      "location": "달빛 노점길",
      "art": 1,
      "mood": "mystery",
      "text": [
        "노점에서는 잠 잘 오는 그림자, 무조건 두 번째에 맞히는 점괘, 주인을 기다리지 않는 우산을 판다. 이 중 가장 한산한 가게에는 종이 팻말 하나만 걸렸다. «달 낙찰자 특별 안내.»",
        "달을 사면 밤하늘 장식만 얻는 것이 아니다. 강물이 달빛을 따라 흐르고 야시장은 그 길을 따라 이동한다. 부유한 수집가가 달을 자기 정원에 걸어 두면 이 시장도 강가 마을도 그 정원 주인의 허락을 받아야 한다."
      ],
      "entities": [
        {
          "id": "seller",
          "label": "달빛 안내 상인",
          "kind": "person",
          "aliases": [
            "안내 상인",
            "상인"
          ]
        },
        {
          "id": "notice",
          "label": "낙찰자 특별 안내",
          "kind": "object",
          "aliases": [
            "안내",
            "팻말"
          ]
        },
        {
          "id": "umbrella",
          "label": "도망가는 우산",
          "kind": "object",
          "aliases": [
            "우산"
          ]
        },
        {
          "id": "fish",
          "label": "종이 물고기 나루",
          "kind": "place",
          "aliases": [
            "나루",
            "물고기"
          ]
        }
      ],
      "choices": [
        {
          "id": "buyer-act",
          "label": "부유한 수집가의 대리인인 척 낙찰 조건을 묻는다",
          "intent": "trick",
          "target": "seller",
          "stat": "heart",
          "dc": 12,
          "risk": "위장이 들키면 경매장에 당신들의 이름이 전달된다.",
          "outcomes": {
            "critical": {
              "text": "정원에 강물을 끌어올 때 마을 배들은 어디로 가느냐고 묻자 상인이 독점 계약의 예외조항까지 꺼낸다. 길을 쓰던 주민들이 이의를 낼 수 있다는 문장도 확인했다. 조건표를 들고 그 주민들의 편지가 모인 나루로 간다.",
              "next": "fish",
              "clues": [
                "price",
                "card"
              ],
              "gainItems": [
                "rule-slip"
              ],
              "set": [
                "free_clause"
              ]
            },
            "success": {
              "text": "상인은 정원까지 강물을 끌어오는 계약까지 설명한다. 달 낙찰은 길의 독점이었다. 종이 물고기가 계약서의 나루 위치를 가리킨다.",
              "next": "fish",
              "clues": [
                "price"
              ]
            },
            "failure": {
              "text": "상인이 진짜 수집가와 통화하려 한다. 마침 도망가는 우산이 펼쳐져 시야를 가린다. 당신들은 안내 팻말을 읽고 나루로 간다.",
              "next": "fish",
              "clues": [
                "price"
              ],
              "pressure": 2
            },
            "fumble": {
              "text": "상인이 진짜 대리인에게 확인 전화를 걸어 위장이 들통난다. 일행의 얼굴이 경매 경비에게 전달된다. 붙잡히기 전에 공개 팻말의 독점 조건만 읽고 노점 뒤 통로로 나루에 빠져나간다.",
              "next": "fish",
              "clues": [
                "price"
              ],
              "pressure": 3,
              "unset": [
                "market_friend"
              ]
            }
          }
        },
        {
          "id": "umbrella",
          "label": "도망가는 우산에게 강가 소식이 있는 곳을 안내해 달라고 한다",
          "intent": "talk",
          "target": "umbrella",
          "stat": "heart",
          "dc": 10,
          "risk": "우산을 따라 지붕을 넘다가 실패하면 생명 1, 대실패하면 생명 2를 잃는다. 추락한 뒤에도 나루지기가 남은 일행을 도울 수 있다.",
          "outcomes": {
            "critical": {
              "text": "우산에게 주인이 되겠다는 말 대신 잠깐 길만 부탁한다. 우산은 낮은 난간으로 안전하게 안내하고, 지나가는 감시꾼의 시선도 가려 준다. 일행이 나루에 도착하자 기다리던 종이 물고기들이 곧장 주민 편지를 건넨다.",
              "next": "fish",
              "set": [
                "market_friend",
                "river_voice"
              ],
              "clues": [
                "fish"
              ],
              "gainItems": [
                "river-letters"
              ],
              "pressure": -1
            },
            "success": {
              "text": "우산이 주인 대신 당신들을 잠깐 선택한다. 종이 물고기들이 몰려 있는 나루까지 데려다주고 자유롭게 날아간다.",
              "next": "fish",
              "set": [
                "market_friend"
              ]
            },
            "failure": {
              "text": "우산이 가게 지붕을 넘는 순간 손을 놓쳐 바닥에 떨어진다. 몸을 다쳤지만 우산이 향한 종이 물고기 나루는 보인다. 동료들이 그곳으로 안내한다.",
              "next": "fish",
              "pressure": 1,
              "harm": 1
            },
            "fumble": {
              "text": "우산이 지붕 위로 오를 때 매달렸다가 손을 놓친다. 아래 난간에 부딪혀 생명 2를 잃고 큰 소리에 감시꾼도 몰린다. 나루지기 담이 다친 사람을 받아 자기 나루로 데려가 일행을 쉬게 한다.",
              "next": "fish",
              "harm": 2,
              "pressure": 2
            }
          }
        }
      ],
      "objective": "계약의 조건을 알아내고 강가 주민들의 나루로 간다.",
      "details": [
        {
          "id": "auction-conditions",
          "label": "낙찰자 안내 팻말을 읽는다",
          "text": "달 낙찰자는 강의 달빛 길과 야시장의 정박 장소까지 정한다.",
          "clue": "price"
        }
      ],
      "summary": "달을 낙찰받으면 강의 길과 시장의 위치도 마음대로 정할 수 있다.",
      "stakes": "위장이 들통나면 감시가 붙는다. 날아가는 우산을 따라 지붕을 넘으면 추락할 수 있다."
    },
    "repair": {
      "id": "repair",
      "title": "잊은 빗소리를 꿰매는 가게",
      "chapter": 2,
      "location": "기억 수선점",
      "art": 1,
      "mood": "calm",
      "text": [
        "기억 수선사 나비가 이름표 붙은 유리병들을 정리한다. 기억을 팔아도 즉시 없애지는 않고, 원래 주인이 찾을 수 있도록 보관하는 가게다. 이번 밤 맡긴 빗소리가 있다면 한톨의 보관 기록과 대조해 돌려받을 수 있다.",
        "작업대에는 달이 맡긴 기억병도 있다. 아무도 소원을 빌지 않고 그저 달빛을 바라보던 밤이 들어 있다. 나비는 주인의 허락 없이 열 수 없다고 말한다. 옆에는 여러 손님이 나누어도 좋다고 맡긴 작은 기억으로 엮은 여분의 실이 놓여 있다. 이 실은 새 길이나 안전줄을 만드는 데 쓸 수 있다."
      ],
      "entities": [
        {
          "id": "tailor",
          "label": "기억 수선사 나비",
          "kind": "person",
          "aliases": [
            "수선사",
            "나비"
          ]
        },
        {
          "id": "spool",
          "label": "물방울 실꾸리",
          "kind": "object",
          "aliases": [
            "실",
            "실꾸리"
          ]
        },
        {
          "id": "bottles",
          "label": "빗소리 기억병",
          "kind": "object",
          "aliases": [
            "기억병",
            "병",
            "빗소리"
          ]
        }
      ],
      "choices": [
        {
          "id": "mend-together",
          "label": "이름 없는 기억 조각들을 함께 정리해 수선사를 돕는다",
          "intent": "help",
          "target": "tailor",
          "stat": "wit",
          "dc": 11,
          "risk": "조각을 잘못 맞추면 가게의 기억 찾기 종이 크게 울린다.",
          "outcomes": {
            "critical": {
              "text": "병의 소리를 먼저 주인 이름표와 맞춘 뒤 찢긴 길 기억을 잇는다. 나비는 정확히 수선된 지도를 확인하고, 모두가 나누기로 한 기억 실을 안전줄로 쓰라며 내준다. 일행은 그 지도를 따라 강가 편지가 모인 나루로 간다.",
              "next": "fish",
              "set": [
                "repair_helped",
                "market_friend"
              ],
              "clues": [
                "repair"
              ],
              "gainItems": [
                "memory-thread"
              ],
              "pressure": -1
            },
            "success": {
              "text": "이름표를 맞추고 동의받은 기억만 이어 찢긴 길을 복원한다. 나비가 여분의 기억 실도 한 가닥 건네며 하역대에서 안전줄로 쓸 수 있다고 설명한다. 주민들의 뜻을 들으러 종이 물고기 나루로 간다.",
              "next": "fish",
              "set": [
                "repair_helped"
              ],
              "clues": [
                "repair"
              ],
              "gainItems": [
                "memory-thread"
              ]
            },
            "failure": {
              "text": "서로 다른 비가 한 병에서 천둥으로 섞인다. 수선사는 웃으며 안전하게 풀어 주고, 원래 주인에게 묻는 편이 낫다며 나루를 가리킨다.",
              "next": "fish",
              "clues": [
                "repair"
              ],
              "pressure": 1
            },
            "fumble": {
              "text": "서로 다른 주인의 기억을 한 병에 묶자 천둥이 터지고 찾기 종이 울린다. 나비는 곧바로 분리해 기억을 지키지만, 작업을 다시 부탁할 수는 없겠다고 말한다. 원래 주인들의 말을 직접 들으라며 나루로 안내한다.",
              "next": "fish",
              "clues": [
                "repair"
              ],
              "pressure": 3,
              "unset": [
                "repair_helped"
              ]
            }
          }
        },
        {
          "id": "retrieve-rain",
          "label": "이번 밤 맡긴 빗소리를 돌려받는다",
          "intent": "choose",
          "target": "bottles",
          "automatic": true,
          "outcomes": {
            "success": {
              "text": "한톨의 보관 기록으로 주인을 확인하고 이번 밤 맡긴 빗소리를 돌려받는다. 나비는 달의 기억병은 달의 것이니 그대로 두겠다고 말한다. 일행은 그 뜻에 고개를 끄덕이고 강가 주민들이 보낸 편지를 읽으러 나루로 간다.",
              "next": "fish",
              "set": [
                "rain_returned"
              ],
              "clues": [
                "repair"
              ]
            }
          },
          "requires": {
            "flag": "memory_paid"
          },
          "lockedHint": "기억 저울에서 이번 밤 빗소리 기억을 맡겼을 때 돌려받을 수 있다."
        },
        {
          "id": "keep-moon-memory",
          "label": "달의 기억병을 열지 않고 당사자에게 물을 길을 찾는다",
          "intent": "choose",
          "target": "bottles",
          "automatic": true,
          "outcomes": {
            "success": {
              "text": "당신들은 기억병을 제자리에 둔다. 수선사는 그 태도를 보고 종이 물고기 나루로 가는 지도를 준다.",
              "next": "fish"
            }
          }
        }
      ],
      "objective": "수선 일을 돕거나 맡긴 기억을 찾고 강가의 의견을 들으러 간다.",
      "details": [
        {
          "id": "shared-thread",
          "label": "나비에게 동의받은 기억 실을 한 가닥 받는다",
          "text": "나비는 기증한 사람들의 이름표를 확인한 뒤 여분의 기억 실을 한 가닥 내준다. 무게를 받치는 줄로 한 번 쓰고 나면 실은 풀려 원래 기억으로 돌아간다.",
          "clue": "repair",
          "gainItems": [
            "memory-thread"
          ]
        }
      ],
      "resurrection": {
        "label": "동료의 이름과 함께한 기억을 다시 엮는다",
        "text": "이 강에서 목숨을 잃은 사람은 이름이 완전히 지워지기 전까지 돌아올 수 있다. 살아 있는 동료가 함께한 기억을 내어 이름을 불러 주는 판정을 한다. 운명 1개와 경매 관심 2를 지불한다.",
        "sparkCost": 1,
        "pressureCost": 2,
        "dc": 12
      },
      "summary": "수선사는 기억을 없애지 않고 보관하며, 동의받은 기억으로 새 길을 엮는다.",
      "stakes": "달의 기억병은 달의 허락 없이 열지 않는다. 잘못 엮으면 기억 찾기 경보가 울린다."
    },
    "fish": {
      "id": "fish",
      "title": "강 건너의 소원은 작았다",
      "chapter": 2,
      "location": "종이 물고기 나루",
      "art": 1,
      "mood": "mystery",
      "text": [
        "종이 물고기들이 물 위에서 입을 벙긋거린다. 시장 밖 강가 주민들이 보낸 편지다. 첫 편지는 생선 장수, 다음은 야간 간호사, 그다음은 학교 가는 배를 모는 사람의 목소리다.",
        "그들은 달을 소유하고 싶다고 말하지 않는다. 나룻배가 집 앞을 지나고, 밤길이 어느 부자의 정원으로만 향하지 않았으면 한다. 시장의 화려한 소원들 사이에서 너무 평범해 잘 안 들리던 부탁이다."
      ],
      "entities": [
        {
          "id": "fish",
          "label": "편지가 된 종이 물고기",
          "kind": "object",
          "aliases": [
            "물고기",
            "편지"
          ]
        },
        {
          "id": "ferryman",
          "label": "나루지기 담",
          "kind": "person",
          "aliases": [
            "담",
            "나루지기"
          ]
        },
        {
          "id": "auction",
          "label": "달 경매장",
          "kind": "place",
          "aliases": [
            "경매장"
          ]
        }
      ],
      "choices": [
        {
          "id": "collect-voices",
          "label": "편지들을 펼쳐 주민들의 요구를 한 장에 모은다",
          "intent": "investigate",
          "target": "fish",
          "stat": "wit",
          "dc": 10,
          "risk": "너무 많은 편지를 펼치면 경매 감시꾼이 집회를 알아챈다.",
          "outcomes": {
            "critical": {
              "text": "각 편지의 다른 사정과 공통된 요구를 구분해 한 장에 적는다. 주민들은 달을 갖는 대신 나루를 같이 관리하겠다는 뜻을 분명히 남긴다. 나루지기와 상인들도 요구서의 증인이 되어 경매장까지 동행한다.",
              "next": "auction",
              "set": [
                "river_voice",
                "market_friend"
              ],
              "clues": [
                "fish",
                "price"
              ],
              "gainItems": [
                "river-letters"
              ],
              "pressure": -1
            },
            "success": {
              "text": "서로 다른 목소리에 공통된 요구가 보인다. 길은 함께 쓰고 달은 누구의 것도 아니어야 한다. 대표 편지를 들고 경매장으로 간다.",
              "next": "auction",
              "set": [
                "river_voice"
              ],
              "clues": [
                "fish"
              ],
              "gainItems": [
                "river-letters"
              ]
            },
            "failure": {
              "text": "편지가 젖어 접혔지만 나루지기가 핵심 내용을 다시 적어 준다. 주민들이 나루를 함께 쓰고 싶다는 요구서는 지켰다. 일행을 주시하는 감시꾼보다 먼저 경매장으로 이동한다.",
              "next": "auction",
              "clues": [
                "fish"
              ],
              "pressure": 1,
              "gainItems": [
                "river-letters"
              ]
            },
            "fumble": {
              "text": "편지를 한꺼번에 펼쳐 강바람에 놓친다. 요구서는 강으로 흘러가고 감시꾼들은 모임을 해산시킨다. 나루지기가 주민들의 뜻을 구두로 증언하며 경매장까지 따라오지만, 달에게 보여 줄 한 장의 서류는 잃었다.",
              "next": "auction",
              "clues": [
                "fish"
              ],
              "loseItems": [
                "river-letters"
              ],
              "pressure": 3,
              "unset": [
                "river_voice"
              ]
            }
          }
        },
        {
          "id": "fish-parade",
          "label": "종이 물고기들에게 경매장에서 직접 목소리를 내자고 제안한다",
          "intent": "perform",
          "target": "fish",
          "stat": "heart",
          "dc": 12,
          "risk": "행렬이 눈에 띄어 경매장 경비가 강화된다.",
          "outcomes": {
            "critical": {
              "text": "주민들의 말을 차례대로 부르게 하자 물고기 합창이 작은 공개 청원이 된다. 상인들도 정원 하나가 강을 독점하면 안 된다고 동참한다. 요구서를 받아 든 일행은 청원을 지지하는 손님들과 경매장에 입장한다.",
              "next": "auction",
              "set": [
                "river_voice",
                "market_friend",
                "bid_exposed"
              ],
              "clues": [
                "fish",
                "price"
              ],
              "gainItems": [
                "river-letters"
              ]
            },
            "success": {
              "text": "물고기들이 공중에 떠 강 건너 목소리로 합창한다. 귀여운 구경거리인 줄 모인 사람들이 실제 요구까지 듣는다.",
              "next": "auction",
              "set": [
                "river_voice",
                "market_friend"
              ],
              "clues": [
                "fish"
              ],
              "gainItems": [
                "river-letters"
              ]
            },
            "failure": {
              "text": "물고기들이 제각기 말해 소란이 되자 경비가 행렬을 입구로 몰아간다. 나루지기가 들은 말을 한 장으로 정리해 준다. 일행은 이 요구서를 들고 경매장 안에서 다시 이야기를 꺼내기로 한다.",
              "next": "auction",
              "clues": [
                "fish"
              ],
              "pressure": 2,
              "gainItems": [
                "river-letters"
              ]
            },
            "fumble": {
              "text": "목소리의 순서를 정하지 않아 서로의 말을 덮고 경비가 종이 물고기들을 해산시킨다. 일행이 적어 둔 요구서도 소란 속에 찢어졌다. 나루지기가 핵심 내용을 말로 전하며 일행을 경매장 안으로 이끈다.",
              "next": "auction",
              "clues": [
                "fish"
              ],
              "loseItems": [
                "river-letters"
              ],
              "pressure": 3,
              "unset": [
                "river_voice"
              ]
            }
          }
        }
      ],
      "objective": "편지를 요구서로 모아 경매장에 가져간다.",
      "details": [
        {
          "id": "river-letter",
          "label": "강가의 편지를 읽고 공통된 요구를 종이에 옮긴다",
          "text": "생선 장수와 간호사, 통학 배를 모는 사람 모두 나루를 함께 쓰고 싶다고 적었다. 달을 자기 소유로 달라는 말은 없다. 이 요구를 한 장으로 옮겨 당사자에게 보여 줄 수 있게 챙긴다.",
          "clue": "fish",
          "gainItems": [
            "river-letters"
          ]
        }
      ],
      "summary": "강가 주민들은 달의 소유권 대신 함께 쓸 나루를 원한다.",
      "stakes": "요구서를 잃으면 달에게 공동 나루를 구체적으로 제안할 근거가 부족해진다."
    },
    "auction": {
      "id": "auction",
      "title": "자기 이름으로 입찰할 수 없는 물건",
      "chapter": 2,
      "location": "달 경매장",
      "art": 1,
      "mood": "tension",
      "text": [
        "경매장 무대에는 작은 달이 유리 고리 안에 매달려 있다. 고리는 달이 움직일 범위를 제한하고, 그 뒤의 긴 소원 끈은 강 위 하역 물레와 이어진다. 경매사 일구가 다시 가격을 부른다. 수집가의 대리인은 앞서 담보 사냥꾼들을 출입구에 세워 손님들을 겁주었던 사람이다.",
        "접수대 장부의 판매자와 동의란은 비어 있다. 달은 자신을 팔아 달라고 말하지 않았다며 출구를 바라본다. 무대 뒤 계약실에서 원본을 보거나, 달에게 질문할 휴회를 요구할 수 있다. 고리를 깨면 바로 하역대로 나갈 수 있지만 일행이 선 발판도 같은 지지대에 매달려 있다."
      ],
      "entities": [
        {
          "id": "auctioneer",
          "label": "경매사 일구",
          "kind": "person",
          "aliases": [
            "경매사",
            "일구"
          ]
        },
        {
          "id": "ledger",
          "label": "경매 위탁 장부",
          "kind": "object",
          "aliases": [
            "장부",
            "위탁"
          ]
        },
        {
          "id": "backstage",
          "label": "무대 뒤 계약실",
          "kind": "place",
          "aliases": [
            "계약실",
            "무대 뒤"
          ]
        },
        {
          "id": "waiting",
          "label": "달의 대기실",
          "kind": "place",
          "aliases": [
            "대기실",
            "달"
          ]
        },
        {
          "id": "rig",
          "label": "달을 매단 유리 고리",
          "kind": "object",
          "aliases": [
            "유리 고리",
            "고리",
            "천장 지지대",
            "강제 탈출"
          ]
        }
      ],
      "choices": [
        {
          "id": "check-consent",
          "label": "빈 위탁자 칸을 들고 무대 뒤 원본 계약을 찾는다",
          "intent": "choose",
          "target": "backstage",
          "automatic": true,
          "outcomes": {
            "success": {
              "text": "당신들은 입찰 가격 대신 서류의 빈칸을 묻는다. 경매사는 처음으로 대답을 늦춘다.",
              "next": "backstage"
            }
          }
        },
        {
          "id": "ask-moon",
          "label": "달에게 직접 이야기할 시간을 달라고 경매를 중단시킨다",
          "intent": "talk",
          "target": "auctioneer",
          "stat": "heart",
          "dc": 12,
          "risk": "중단 요구가 받아들여지지 않으면 경비가 대기실까지 따라온다.",
          "outcomes": {
            "critical": {
              "text": "값을 올리기 전에 당사자가 팔리겠다고 했는지 확인하자고 묻는다. 손님들까지 휴회를 요구해 경매사는 동의 없는 낙찰을 중단한다고 발표한다. 충분한 시간을 얻은 일행은 달과 함께 대기실로 간다.",
              "next": "witness",
              "set": [
                "free_clause",
                "bid_exposed"
              ],
              "pressure": -1
            },
            "success": {
              "text": "당신들의 질문에 구경꾼들이 고개를 끄덕인다. 경매사는 짧은 휴회를 선언하고 달의 대기실을 연다.",
              "next": "witness"
            },
            "failure": {
              "text": "경매사는 휴회를 거절한다. 그러나 달이 긴 소원 끈을 당겨 대기실 의자까지 내려오며 직접 이야기하겠다고 한다. 일행은 달의 초대를 따라가고, 경비도 문밖까지 뒤따른다.",
              "next": "witness",
              "pressure": 2
            },
            "fumble": {
              "text": "경매사는 일행을 소란꾼이라고 부르며 경비를 대기실 쪽에 세운다. 달이 직접 소원 끈을 느슨하게 당겨 의자까지 내려와 이야기하겠다고 말한다. 일행은 따라가지만 경비가 문밖에서 한마디씩 기록한다.",
              "next": "witness",
              "pressure": 3
            }
          }
        },
        {
          "id": "shatter-rig",
          "label": "유리 고리를 깨고 달을 하역대로 빼낸다 (전멸 위험)",
          "intent": "force",
          "target": "rig",
          "stat": "might",
          "dc": 15,
          "risk": "성공하면 계약실과 공개 단상을 건너뛰고 관심이 2 낮아진다. 실패하면 발판이 기울어 전원 생명 2를 잃는다. 대실패는 전원 생명 3 피해로 전멸한다.",
          "outcomes": {
            "critical": {
              "text": "발판의 지지대는 남기고 달의 고리만 정확히 깨뜨린다. 달이 판매에 동의한 적 없다고 외치자 구경꾼들이 경매사를 붙잡는다. 일행은 느슨해진 소원 끈을 따라 하역대로 내려오고, 도움을 주러 온 나비에게 기억 안전줄까지 받는다.",
              "next": "crane",
              "set": [
                "free_clause",
                "moon_heard",
                "bid_exposed"
              ],
              "clues": [
                "consent"
              ],
              "gainItems": [
                "memory-thread"
              ],
              "pressure": -3
            },
            "success": {
              "text": "지지대는 남기고 유리 고리만 깨뜨린다. 달이 직접 “나는 판매에 동의하지 않았어”라고 외치며 일행과 하역대로 내려온다. 구경꾼들이 경매사를 붙잡는 동안 달의 소원 끈을 풀 기회를 얻었다.",
              "next": "crane",
              "set": [
                "free_clause",
                "moon_heard"
              ],
              "clues": [
                "consent"
              ],
              "pressure": -2
            },
            "failure": {
              "text": "유리 고리가 깨지며 발판이 기울어 일행 모두 난간에 부딪혀 생명 2를 잃는다. 달은 자신을 판 적 없다고 외치며 소원 끈을 길게 풀어 준다. 그 끈을 붙잡고 가까스로 하역대로 내려가지만, 아직 구속을 완전히 푼 것은 아니다.",
              "next": "crane",
              "harmAll": 2,
              "set": [
                "moon_heard"
              ],
              "clues": [
                "consent"
              ],
              "pressure": 2
            },
            "fumble": {
              "text": "고리와 발판을 함께 지탱하던 축이 산산이 부서진다. 일행이 선 바닥 전체가 무너져 깊은 강으로 떨어진다. 모두 생명 3을 잃고, 물에 잠긴 서로의 이름을 불러 되돌릴 살아 있는 동료도 남지 않는다.",
              "next": "crane",
              "harmAll": 3,
              "pressure": 3
            }
          }
        }
      ],
      "objective": "계약 원본을 확인하거나 달에게 직접 물을 시간을 얻는다.",
      "details": [
        {
          "id": "blank-consigner",
          "label": "위탁 장부의 판매자 칸을 확인한다",
          "text": "판매자와 당사자 동의 칸이 모두 비어 있다. 비싼 물건이라는 사실만 반복돼 있다.",
          "clue": "auction"
        }
      ],
      "summary": "달이 유리 고리에 매달려 있지만 판매에 동의한 사람의 서명은 없다.",
      "stakes": "유리 고리를 깨는 지름길은 일행이 선 발판까지 무너뜨릴 수 있다. 대실패하면 전멸한다."
    },
    "backstage": {
      "id": "backstage",
      "title": "계약서에 물건이 대답했다",
      "chapter": 3,
      "location": "무대 뒤 계약실",
      "art": 2,
      "mood": "tension",
      "text": [
        "경매 보조원 솔이 원본 서류를 펼친다. 달이 거절한 말은 분명 기록돼 있는데, 제목이 «분위기 연출 대사»다. 생각하는 존재를 판다는 문제를 피하려고 말을 의사 표시로 인정하지 않은 것이다.",
        "솔은 달에게 서명할 손이 없으니 계약도 할 수 없다고 생각했다고 털어놓는다. 벽에는 다리에서와 같은 거래 규칙이 붙어 있다. 달의 말을 당사자 진술로 옮기거나, 가져온 규칙 사본을 정식 이의 신청으로 제출할 수 있다. 서류에 봉인을 찍는 장치는 잘못된 분류를 불꽃으로 지운다는 경고가 있다."
      ],
      "entities": [
        {
          "id": "clerk",
          "label": "경매 보조원 솔",
          "kind": "person",
          "aliases": [
            "솔",
            "보조원"
          ]
        },
        {
          "id": "contract",
          "label": "원본 위탁 계약서",
          "kind": "object",
          "aliases": [
            "계약서",
            "계약"
          ]
        },
        {
          "id": "rules",
          "label": "양도 규칙",
          "kind": "object",
          "aliases": [
            "규칙",
            "조항"
          ]
        }
      ],
      "choices": [
        {
          "id": "legal-voice",
          "label": "달의 말도 의사 표시로 기록해야 한다고 조항을 짚는다",
          "intent": "talk",
          "target": "clerk",
          "stat": "heart",
          "dc": 11,
          "risk": "보조원이 상사에게 보고하면 경매 경계가 높아진다.",
          "outcomes": {
            "critical": {
              "text": "서명할 손의 모양이 아니라 본인의 말이 동의의 기준이라고 설명한다. 솔은 달의 거절을 계약에 옮기고 같은 사본을 공개 단상에도 보내, 다시 연출로 덮을 수 없게 한다. 일행은 그 접수 번호를 들고 단상으로 간다.",
              "next": "ledger",
              "set": [
                "free_clause",
                "moon_heard",
                "bid_exposed"
              ],
              "clues": [
                "consent",
                "auction"
              ],
              "pressure": -1
            },
            "success": {
              "text": "솔은 연출 기록에 묻힌 달의 말을 꺼내 계약서에 옮긴다. 달은 팔아 달라고 한 적이 없다. 판매 무효 조항이 성립한다.",
              "next": "ledger",
              "set": [
                "free_clause",
                "moon_heard"
              ],
              "clues": [
                "consent",
                "auction"
              ]
            },
            "failure": {
              "text": "솔이 경매사를 부른다. 그 사이 원본 계약서의 빈 동의 칸이 모두에게 보인다. 서류를 공개대로 가져가야 한다.",
              "next": "ledger",
              "set": [
                "free_clause"
              ],
              "clues": [
                "auction"
              ],
              "pressure": 2
            },
            "fumble": {
              "text": "솔이 책임을 두려워해 상사를 부르고, 경매사는 진술을 연출로 남기라고 명령한다. 변경 절차는 막혔다. 그래도 동의란이 비어 있다는 원본 사본은 공개 서류이므로 가져갈 수 있어, 일행은 그것을 들고 단상으로 간다.",
              "next": "ledger",
              "clues": [
                "auction"
              ],
              "pressure": 3,
              "unset": [
                "free_clause"
              ]
            }
          }
        },
        {
          "id": "stamp-witness",
          "label": "달의 거절 기록을 당사자 진술서로 옮겨 봉인한다",
          "intent": "use",
          "target": "contract",
          "stat": "wit",
          "dc": 12,
          "risk": "봉인이 잘못 작동하면 실패 시 생명 2, 대실패 시 생명 3을 잃는다. 규칙 사본을 제출하는 방법은 장치를 건드리지 않는다.",
          "outcomes": {
            "critical": {
              "text": "녹음 일시와 달의 이름을 정확히 적어 진술서로 봉인하자 분류가 물품에서 방문자로 바뀐다. 접수 장치가 공개 단상에도 변경 사실을 출력한다. 일행은 달의 거절이 담긴 원본 사본을 들고 공개 장부 앞으로 간다.",
              "next": "ledger",
              "set": [
                "free_clause",
                "moon_heard",
                "bid_exposed"
              ],
              "clues": [
                "consent",
                "auction"
              ],
              "pressure": -1
            },
            "success": {
              "text": "계약 장치가 처음으로 달의 말을 당사자 진술로 받아들인다. 분류가 «물품»에서 «방문자»로 바뀐다.",
              "next": "ledger",
              "set": [
                "free_clause",
                "moon_heard"
              ],
              "clues": [
                "consent"
              ]
            },
            "failure": {
              "text": "장치가 진술 첨부를 허위 입찰로 판단해 봉인의 불꽃을 터뜨린다. 보조원이 불을 끄고 당신을 끌어낸다. 달의 동의가 없다는 원본만은 지켰다.",
              "next": "ledger",
              "set": [
                "free_clause"
              ],
              "clues": [
                "auction"
              ],
              "pressure": 2,
              "harm": 2
            },
            "fumble": {
              "text": "봉인의 취소 칸을 눌러 장치가 서류를 태우는 불꽃을 터뜨린다. 생명 3을 잃고 자동 수정도 막혔다. 솔이 불을 끄고 빈 동의란의 사본을 챙겨 준다. 살아 있는 동료들은 당신과 증거를 공개 단상 쪽으로 옮긴다.",
              "next": "ledger",
              "clues": [
                "auction"
              ],
              "harm": 3,
              "pressure": 3,
              "unset": [
                "free_clause"
              ]
            }
          }
        },
        {
          "id": "submit-rule-slip",
          "label": "거래 규칙 사본을 제출해 서면으로 경매 무효를 접수한다",
          "intent": "use",
          "target": "rules",
          "automatic": true,
          "useItems": [
            "rule-slip"
          ],
          "requires": {
            "item": "rule-slip"
          },
          "lockedHint": "등불 다리나 기억 저울에서 거래 규칙을 베껴 챙겨야 정식 서면 접수가 된다.",
          "outcomes": {
            "success": {
              "text": "솔은 규칙 사본과 빈 동의란을 맞춰 보고 경매 무효 이의서를 작성한다. 달의 거절도 당사자 진술로 첨부했다. 장치를 건드리지 않고 서류를 확보한 일행은 공개 장부 단상으로 가 접수 사실을 알린다.",
              "next": "ledger",
              "set": [
                "free_clause",
                "moon_heard"
              ],
              "clues": [
                "auction",
                "consent"
              ],
              "pressure": -1
            }
          }
        }
      ],
      "objective": "그 말을 진술로 기록하거나 거래 규칙을 제출해 판매 근거를 없앤다.",
      "details": [
        {
          "id": "voice-record",
          "label": "연출로 분류된 달의 진술을 읽는다",
          "text": "달은 모든 소원을 책임지는 일에 지쳤다. 잠시 쉬거나 떠날 권리를 달라고 했다.",
          "clue": "consent"
        }
      ],
      "summary": "달의 말은 계약서에서 당사자의 의사 대신 연출로 분류돼 있다.",
      "stakes": "서류 장치의 봉인을 잘못 건드리면 불꽃에 다친다. 규칙 사본이 있으면 안전한 서면 절차가 있다."
    },
    "witness": {
      "id": "witness",
      "title": "달의 소원은 잠이었다",
      "chapter": 3,
      "location": "경매장 작은 대기실",
      "art": 2,
      "mood": "calm",
      "text": [
        "대기실에서 소원 끈에 느슨하게 연결된 달이 작은 의자에 앉아 있다. 경매에서 완전히 풀린 것은 아니지만, 여기서는 손님들의 소원 대신 자기 말을 할 수 있다. 달은 이루어 주지 못한 소원을 모두 자기 잘못으로 여기다 지쳤다고 한다.",
        "“잠깐 쉬거나, 내가 고른 곳으로 여행하고 싶어. 누가 사서 부탁을 강요하는 건 싫어.” 강가 주민들의 요구서가 있다면 달을 소유하지 않고 나루를 같이 지키는 방법을 제안할 수 있다. 없거나 그런 약속을 맡기 어렵다면 경매를 무효로 만들고 달이 떠날 길을 도울 수 있다."
      ],
      "entities": [
        {
          "id": "moon",
          "label": "의자에 앉은 달",
          "kind": "person",
          "aliases": [
            "달"
          ]
        },
        {
          "id": "chair",
          "label": "작은 대기 의자",
          "kind": "object",
          "aliases": [
            "의자"
          ]
        },
        {
          "id": "letters",
          "label": "강가의 편지 꾸러미",
          "kind": "object",
          "aliases": [
            "편지",
            "꾸러미"
          ]
        }
      ],
      "choices": [
        {
          "id": "listen-choice",
          "label": "주민들의 요구서를 보여 주고 공동 나루에서 쉬고 싶은지 묻는다",
          "intent": "choose",
          "target": "moon",
          "automatic": true,
          "outcomes": {
            "success": {
              "text": "요구서에는 달을 갖겠다는 말 대신 길을 함께 돌보겠다는 말이 있다. 달은 그것을 읽고 «달잠 나루»라는 이름을 직접 고른다. 일행은 달의 동의와 주민의 요구를 함께 가지고 공개 장부 단상으로 가 경매를 끝내려 한다.",
              "next": "ledger",
              "set": [
                "moon_heard",
                "joint_name"
              ],
              "clues": [
                "consent",
                "shared"
              ]
            }
          },
          "useItems": [
            "river-letters"
          ],
          "requires": {
            "item": "river-letters"
          },
          "lockedHint": "종이 물고기 나루에서 강가 주민들의 요구를 종이에 모아 챙겨야 한다."
        },
        {
          "id": "leave-help",
          "label": "달이 시장을 떠날 수 있도록 출구를 함께 찾는다",
          "intent": "choose",
          "target": "moon",
          "automatic": true,
          "outcomes": {
            "success": {
              "text": "달은 떠날 준비를 하기로 한다. 경매 무효를 확인한 뒤 강 위 출구로 가겠다는 자기 계획을 말한다.",
              "next": "ledger",
              "set": [
                "moon_heard",
                "free_clause"
              ],
              "clues": [
                "consent"
              ]
            }
          }
        }
      ],
      "dialogue": {
        "who": "달",
        "text": "내가 잠깐 눈을 감으면, 너희가 서로의 밤길을 조금 밝혀 줄 수 있을까?"
      },
      "objective": "주민의 요구서를 보여 공동 나루를 제안하거나 달의 여행을 돕는다.",
      "details": [
        {
          "id": "moon-answer",
          "label": "달의 말을 중간에 끊지 않고 듣는다",
          "text": "소원을 모두 책임지지 않을 권리, 원하면 쉬거나 떠날 권리를 원한다.",
          "clue": "consent"
        }
      ],
      "resurrection": {
        "label": "동료의 이름과 함께한 기억을 다시 엮는다",
        "text": "이 강에서 목숨을 잃은 사람은 이름이 완전히 지워지기 전까지 돌아올 수 있다. 살아 있는 동료가 함께한 기억을 내어 이름을 불러 주는 판정을 한다. 운명 1개와 경매 관심 2를 지불한다.",
        "sparkCost": 1,
        "pressureCost": 2,
        "dc": 12
      },
      "summary": "달은 소원을 모두 책임지는 일에 지쳤고 팔리는 것을 원하지 않는다.",
      "stakes": "달의 뜻을 대신 결정하지 않는다. 공동 나루를 약속하려면 강가 주민들의 요구서가 필요하다."
    },
    "ledger": {
      "id": "ledger",
      "title": "시장에서 가장 조용한 입찰",
      "chapter": 3,
      "location": "공개 장부 단상",
      "art": 2,
      "mood": "tension",
      "text": [
        "경매사 일구 앞의 공개 장부에는 여전히 달의 판매 동의가 없다. 수집가의 대리인은 값을 올리면 문제가 끝날 것처럼 말한다. 구경꾼들은 일행이 가격 대신 그 빈칸을 가리키는 이유를 듣기 시작한다.",
        "빈 동의란을 공개해 거래를 멈추게 하거나, 벽에 걸린 시장 규칙으로 당사자 확인 전까지 낙찰을 유예할 수 있다. 어느 쪽이든 달을 실제로 놓아주려면 강 위 하역대의 소원 끈도 풀어야 한다. 경매사가 이전을 재촉할 때마다 그 끈이 팽팽해진다."
      ],
      "entities": [
        {
          "id": "auctioneer",
          "label": "경매사 일구",
          "kind": "person",
          "aliases": [
            "경매사",
            "일구"
          ]
        },
        {
          "id": "book",
          "label": "공개 경매 장부",
          "kind": "object",
          "aliases": [
            "장부"
          ]
        },
        {
          "id": "bell",
          "label": "휴회 종",
          "kind": "object",
          "aliases": [
            "종",
            "휴회"
          ]
        }
      ],
      "choices": [
        {
          "id": "public-reading",
          "label": "빈 동의란을 공개해 상인들에게 입찰을 멈춰 달라고 한다",
          "intent": "perform",
          "target": "book",
          "stat": "heart",
          "dc": 12,
          "risk": "경매사가 강제 낙찰 절차를 앞당길 수 있다.",
          "outcomes": {
            "critical": {
              "text": "판매자와 동의란이 모두 비었다는 사실을 앞줄부터 보여 준다. 상인들은 입찰 패를 내리고 달에게 나루를 함께 쓰자는 주민들의 의견도 다시 묻겠다고 한다. 경매가 멈춘 사이 지지자들과 하역대로 가 구속 끈을 풀 준비를 한다.",
              "next": "crane",
              "set": [
                "bid_exposed",
                "free_clause",
                "market_friend"
              ],
              "pressure": -2
            },
            "success": {
              "text": "상인들이 하나둘 입찰 패를 내린다. 자기 기억만 팔 수 있다는 시장 규칙을 달에게만 다르게 적용할 수는 없다.",
              "next": "crane",
              "set": [
                "bid_exposed",
                "free_clause"
              ]
            },
            "failure": {
              "text": "경매사가 종으로 목소리를 덮는다. 그 소리에 달 고정줄이 당겨지고, 당신들은 줄을 풀기 위해 하역대로 뛰어간다.",
              "next": "crane",
              "pressure": 2
            },
            "fumble": {
              "text": "경매사가 종을 계속 울리고 경비가 장부를 가리면서 설명이 끊긴다. 일행의 공개 요구는 받아들여지지 않았다. 대신 달을 옮기는 소원 끈이 당겨지는 것을 보고, 보관고에 갇히기 전에 하역대로 달려간다.",
              "next": "crane",
              "pressure": 3,
              "unset": [
                "bid_exposed"
              ]
            }
          }
        },
        {
          "id": "merchant-rules",
          "label": "시장 규칙에 따라 당사자 확인 전 낙찰을 유예시킨다",
          "intent": "talk",
          "target": "auctioneer",
          "stat": "wit",
          "dc": 12,
          "risk": "절차 다툼이 지면 보관고 이동이 즉시 시작된다.",
          "outcomes": {
            "critical": {
              "text": "당사자 확인 전에는 운송도 할 수 없다는 조항을 찾아 읽는다. 문지기 토끼까지 규칙을 증언해 경매사는 낙찰과 하역을 모두 멈추라고 적는다. 작업 시간을 얻은 일행은 소원 끈을 풀러 하역대로 간다.",
              "next": "crane",
              "set": [
                "free_clause",
                "market_friend"
              ],
              "clues": [
                "card"
              ],
              "gainItems": [
                "rule-slip"
              ],
              "pressure": -2
            },
            "success": {
              "text": "토끼 문지기가 같은 규칙을 증언한다. 경매사는 서류가 끝날 때까지 달을 옮길 수 없다는 명령을 적는다.",
              "next": "crane",
              "set": [
                "free_clause"
              ]
            },
            "failure": {
              "text": "경매사는 당사자 확인을 보관고에서 하겠다고 우긴다. 당신들은 달이 사라지기 전에 하역 장치로 향한다.",
              "next": "crane",
              "pressure": 2
            },
            "fumble": {
              "text": "경매사가 규칙의 예외를 들이대며 운송부터 하겠다고 지시한다. 보관고 문이 열리고 달의 끈이 더 세게 당겨진다. 일행은 더 다투다 달을 놓칠 수 없어, 소원 끈의 물레가 있는 하역대로 급히 이동한다.",
              "next": "crane",
              "pressure": 3
            }
          }
        }
      ],
      "objective": "사람들에게 빈 동의란을 보이거나 경매를 유예시킨다.",
      "callbacks": [
        {
          "when": {
            "flag": "river_voice"
          },
          "text": "강가 주민들의 종이 물고기들이 단상 밑에 모여 있다. 시장 밖에도 이 결정의 당사자가 있다는 것을 보여 준다."
        }
      ],
      "summary": "공개 장부 앞에서 경매의 동의 여부를 다툴 수 있다.",
      "stakes": "경매사가 밀어붙이면 달을 보관고로 옮기는 끈이 팽팽해진다."
    },
    "crane": {
      "id": "crane",
      "title": "하늘을 매단 밧줄",
      "chapter": 3,
      "location": "강 위 달 하역대",
      "art": 2,
      "mood": "danger",
      "text": [
        "강 위 하역대에 도착하자 달을 붙잡은 긴 소원 끈이 물레에 감겨 있다. 무대의 유리 고리를 깼더라도 이 끈은 남는다. 사람들의 소원이 엮인 줄이라 한꺼번에 끊으면 그 무게가 달과 작업하는 일행에게 쏟아진다.",
        "문지기 토끼가 긴 종이 귀로 난간을 붙잡고, 수선사 나비와 나루지기 담도 도움을 주러 왔다. 물레를 맞춰 천천히 풀거나, 해 줄 수 있는 작은 소원을 서로 나눌 수 있다. 동의받은 기억 실을 챙겼다면 별도의 안전줄로 무게를 받아 위험한 작업을 피할 수도 있다."
      ],
      "entities": [
        {
          "id": "wheel",
          "label": "소원의 하역 물레",
          "kind": "object",
          "aliases": [
            "물레",
            "장치"
          ]
        },
        {
          "id": "rope",
          "label": "달을 매단 소원 끈",
          "kind": "object",
          "aliases": [
            "끈",
            "밧줄"
          ]
        },
        {
          "id": "tailor",
          "label": "기억 수선사 나비",
          "kind": "person",
          "aliases": [
            "수선사",
            "나비"
          ]
        }
      ],
      "choices": [
        {
          "id": "unwind",
          "label": "물레를 맞춰 돌려 소원 끈을 조금씩 푼다",
          "intent": "use",
          "target": "wheel",
          "stat": "wit",
          "dc": 12,
          "risk": "실패하면 전원 생명 1, 대실패하면 전원 생명 2를 잃으며 강으로 끌려간다. 약해진 일행은 전멸할 수 있다.",
          "outcomes": {
            "critical": {
              "text": "물레의 회전과 소원 끈의 장력을 맞춰 한 가닥씩 원래 주인에게 돌린다. 뒤엉킨 약속까지 풀리자 달은 가벼운 빛이 되어 나루에 내려온다. 마지막으로 팔아넘길 고리가 사라졌고 경매장도 조용해졌다. 일행은 달 곁에 모여 다음 길을 고른다.",
              "next": "council",
              "set": [
                "free_clause",
                "repair_helped"
              ],
              "pressure": -2
            },
            "success": {
              "text": "소원들이 주인의 손으로 천천히 돌아간다. 달은 작고 가벼운 빛이 되어 나루의 빈 의자에 내려온다.",
              "next": "council"
            },
            "failure": {
              "text": "물레가 역회전해 일행 모두를 차가운 강으로 끌어당긴다. 토끼가 종이 귀를 펼쳐 붙잡을 줄을 만든다. 누군가 그 줄을 잡을 힘이 남아 있어야 나루로 돌아올 수 있다.",
              "next": "council",
              "pressure": 2,
              "harmAll": 1
            },
            "fumble": {
              "text": "물레가 역회전하며 끈이 난간을 휘감아 일행 모두를 차가운 강으로 끌어당긴다. 전원이 생명 2를 잃는다. 토끼가 귀를 길게 펼치고 나루지기가 배를 붙인다. 살아 있는 일행만 그 줄에 매달려 달이 내려온 나루로 돌아올 수 있다.",
              "next": "council",
              "harmAll": 2,
              "pressure": 3
            }
          }
        },
        {
          "id": "share-weight",
          "label": "각자 감당할 작은 소원을 하나씩 맡아 끈의 무게를 나눈다",
          "intent": "help",
          "target": "rope",
          "stat": "heart",
          "dc": 12,
          "risk": "실패하면 행동한 사람이 소원 무게에 눌려 생명 3을 잃는다. 대실패는 같은 피해에 더해 다른 동료도 생명 1을 잃는다. 기억 실을 쓰는 안전한 방법도 있다.",
          "outcomes": {
            "critical": {
              "text": "혼자 모든 소원을 맡지 않고 편지 한 장, 밤길 한 번 같은 지킬 수 있는 약속만 나눈다. 상인들도 자기 몫을 받아 끈이 느슨해진다. 달이 직접 이제 남은 소원은 의무가 아니라고 선언하고 나루로 내려와 일행과 다음 길을 의논한다.",
              "next": "council",
              "set": [
                "market_friend",
                "free_clause",
                "moon_heard"
              ],
              "clues": [
                "consent"
              ],
              "pressure": -1
            },
            "success": {
              "text": "밥 한 끼, 편지 한 장, 늦은 밤의 짧은 동행. 할 수 있는 약속만 나누자 달을 붙잡던 끈이 스스로 느슨해진다.",
              "next": "council",
              "set": [
                "market_friend"
              ]
            },
            "failure": {
              "text": "풀리지 않은 소원들이 당신의 이름을 한꺼번에 짓눌러 생명 3을 잃는다. 상인들이 뒤늦게 끈을 나눠 달을 나루에 내려놓는다. 살아 있는 동료가 남아 있어야 그곳에서 당신의 이름을 불러 되돌릴 수 있다.",
              "next": "council",
              "pressure": 1,
              "harm": 3
            },
            "fumble": {
              "text": "끝내 지킬 수 없는 소원까지 혼자 받자 당신의 이름 위로 무게가 쏟아져 생명 3을 잃는다. 끈이 튀며 동료들도 생명 1씩 잃는다. 상인들이 남은 끈을 나눠 달을 내린 뒤, 살아 있는 일행을 나루의 빈 의자로 데려간다.",
              "next": "council",
              "harm": 3,
              "harmAll": 1,
              "pressure": 2
            }
          }
        },
        {
          "id": "use-memory-thread",
          "label": "기억 실을 안전줄로 걸어 소원 끈의 무게를 받친다",
          "intent": "use",
          "target": "rope",
          "automatic": true,
          "useItems": [
            "memory-thread"
          ],
          "requires": {
            "item": "memory-thread"
          },
          "lockedHint": "기억 수선점에서 주인들이 나누기로 동의한 기억 실을 받아야 한다.",
          "outcomes": {
            "success": {
              "text": "나비와 함께 기억 실을 난간에 걸자 여러 사람이 내준 작은 기억이 무게를 나누어 받는다. 소원 끈을 천천히 풀어 아무도 다치지 않고 달을 나루로 옮긴다. 시간이 더 걸려 경매장의 관심이 1 높아지고, 한 번 쓴 기억 실은 풀려 원래 주인에게 돌아간다.",
              "next": "council",
              "set": [
                "repair_helped",
                "market_friend"
              ],
              "pressure": 1
            }
          },
          "consumeItems": [
            "memory-thread"
          ]
        }
      ],
      "objective": "물레를 풀거나 소원 무게를 나눠 달을 안전한 나루로 옮긴다.",
      "callbacks": [
        {
          "when": {
            "flag": "repair_helped"
          },
          "text": "수선사는 당신들이 정리해 둔 기억의 실을 가져왔다. 소원 끈이 풀리는 동안 새 길의 기초를 엮을 수 있다."
        }
      ],
      "summary": "달을 붙잡은 소원 끈을 풀어 강 위 하역대에서 내려야 한다.",
      "stakes": "끈에 끌려 강으로 떨어지거나 약속의 무게에 생명을 잃을 수 있다. 기억 실이 있으면 안전줄을 만들 수 있다."
    },
    "council": {
      "id": "council",
      "title": "달은 누구의 것도 아니라고",
      "chapter": 4,
      "location": "동트기 전 공동 나루",
      "art": 3,
      "mood": "calm",
      "text": [
        "소원 끈이 풀린 달이 나루의 빈 의자에 내려앉는다. 수집가의 대리인은 여전히 거래를 주장하지만, 달은 이제 자신을 다시 매달 수 없다고 분명히 말한다. 토끼와 상인들은 다음에 무엇을 할지 당사자의 말을 기다린다.",
        "달은 상인들과 여행해도 좋고, 혼자 하늘로 돌아가 쉬어도 좋겠다고 말한다. 앞서 강가 주민의 요구서를 읽고 합의했다면 «달잠 나루»에 머무는 방법도 있다. 일행은 어떤 길을 함께 도울지 제안하고, 달은 자신의 동의로 마지막 결정을 완성한다."
      ],
      "entities": [
        {
          "id": "moon",
          "label": "의자에 앉은 달",
          "kind": "person",
          "aliases": [
            "달"
          ]
        },
        {
          "id": "anchor",
          "label": "야시장의 닻",
          "kind": "object",
          "aliases": [
            "닻"
          ]
        },
        {
          "id": "landing",
          "label": "새 공동 나루",
          "kind": "place",
          "aliases": [
            "나루",
            "달잠"
          ]
        }
      ],
      "choices": [
        {
          "id": "shared-landing",
          "label": "달이 동의한 «달잠 나루»를 공동으로 지킨다",
          "intent": "choose",
          "target": "landing",
          "automatic": true,
          "outcomes": {
            "success": {
              "text": "소유주 칸을 비우고 관리 당번 칸을 만든다. 달은 처음으로 소원을 듣지 않아도 되는 의자에 등을 기댄다.",
              "next": "ending-landing"
            }
          },
          "requires": {
            "flag": "joint_name"
          },
          "lockedHint": "달의 대기실에서 주민들의 요구서를 보여 주고 «달잠 나루»라는 이름에 함께 합의해야 한다."
        },
        {
          "id": "travel-market",
          "label": "달과 상인들이 함께 떠나는 이동 시장을 만든다",
          "intent": "choose",
          "target": "anchor",
          "automatic": true,
          "outcomes": {
            "success": {
              "text": "상인들은 가게를 배에 올리고 강가 주민들에게 다음 방문 날짜를 남긴다. 달은 한곳에 붙잡히지 않는 여행을 고른다.",
              "next": "ending-travel"
            }
          }
        },
        {
          "id": "free-sky",
          "label": "달을 자유롭게 놓고 서로의 밤길을 밝히기로 한다",
          "intent": "choose",
          "target": "moon",
          "automatic": true,
          "outcomes": {
            "success": {
              "text": "달에게 더는 누군가의 모든 소원을 책임질 필요가 없다고 말한다. 사람들은 손수 등불을 켜기 시작한다.",
              "next": "ending-sky"
            }
          }
        }
      ],
      "objective": "공동 나루, 이동 시장, 달의 독립 중 모두가 받아들일 다음 길을 정한다.",
      "callbacks": [
        {
          "when": {
            "flag": "free_clause"
          },
          "text": "시장 장부의 첫 장에 새 문장이 적힌다. «생각하는 존재의 침묵은 판매 동의가 아니다.»"
        },
        {
          "when": {
            "flag": "bid_exposed"
          },
          "text": "상인들은 입찰 금액보다 계약의 동의란을 먼저 확인하기로 했다. 오늘 밤 달 외의 거래도 몇 건 취소된다."
        }
      ],
      "resurrection": {
        "label": "동료의 이름과 함께한 기억을 다시 엮는다",
        "text": "이 강에서 목숨을 잃은 사람은 이름이 완전히 지워지기 전까지 돌아올 수 있다. 살아 있는 동료가 함께한 기억을 내어 이름을 불러 주는 판정을 한다. 운명 1개와 경매 관심 2를 지불한다.",
        "sparkCost": 1,
        "pressureCost": 2,
        "dc": 12
      },
      "summary": "달의 구속이 풀렸고, 이제 스스로 머물거나 떠날 수 있다.",
      "stakes": "공동 나루는 달과 강가 주민들의 뜻을 함께 확인했을 때만 약속할 수 있다."
    },
    "ending-landing": {
      "id": "ending-landing",
      "title": "달이 잠든 나루",
      "chapter": 4,
      "art": 3,
      "mood": "hope",
      "ending": true,
      "text": [
        "«달잠 나루»에는 달의 주인이 없다. 나룻배를 돌보는 사람과 등불에 기름을 채우는 사람이 있을 뿐이다. 달은 가끔 밝게 웃고 가끔 깊게 잠든다. 잠든 밤에는 사람들이 대신 불을 밝힌다.",
        "야시장은 여전히 이상한 물건을 판다. 다만 입구의 종이 토끼가 동의를 묻는 데 조금 더 오래 걸린다. 당신들이 돌아갈 때 토끼는 동전을 접지 않고 그대로 돌려준다. “오늘의 통행료는 이미 받았어요. 다음에 또 만날 이유요.”"
      ],
      "epilogues": [
        {
          "when": {
            "flag": "rain_returned"
          },
          "text": "나루에 비가 오자 익숙한 빗소리가 돌아온다. 되찾은 기억으로 달의 낮잠 시간을 세어 본다."
        },
        {
          "when": {
            "flag": "repair_helped"
          },
          "text": "수선사는 공동 관리 당번표를 찢어지지 않는 기억의 실로 꿰맨다. 한 사람에게 모든 일이 쏠리지 않도록."
        }
      ],
      "question": "달이 쉬는 밤, 여러분은 누구의 길을 어떻게 밝혀 줄 건가요?",
      "choices": []
    },
    "ending-travel": {
      "id": "ending-travel",
      "title": "소원을 싣고 천천히",
      "chapter": 4,
      "art": 3,
      "mood": "hope",
      "ending": true,
      "text": [
        "야시장의 닻이 올라간다. 등불 다리가 배의 난간이 되고 노점들은 파도에 맞춰 흔들린다. 달은 선장이 아니라 여행자가 된다. 어느 나루에서 얼마나 머물지 매번 상인들과 함께 정한다.",
        "강가 주민들에게는 정박표와 오래 쓸 등불이 남는다. 언제든 떠날 수 있는 시장과 언제나 돌아갈 장소가 서로에게 다음 방문을 약속한다. 당신들 주머니의 단골 카드에는 날짜 대신 «다음에 만나는 곳»이라는 빈칸이 생긴다."
      ],
      "epilogues": [
        {
          "when": {
            "flag": "river_voice"
          },
          "text": "종이 물고기들이 새 항로를 강가에 알린다. 시장 밖의 사람들도 무엇이 바뀌었는지 알고 준비할 수 있다."
        },
        {
          "when": {
            "flag": "market_friend"
          },
          "text": "상인들은 당신들을 위한 접이식 의자를 배 안쪽에 남긴다. 원할 때 한 구간쯤 동행해도 된다는 초대다."
        }
      ],
      "question": "다음에 이 시장과 만난다면, 무엇을 팔기보다 어떤 이야기를 가져가고 싶나요?",
      "choices": []
    },
    "ending-sky": {
      "id": "ending-sky",
      "title": "소원을 쉬는 달",
      "chapter": 4,
      "art": 3,
      "mood": "hope",
      "ending": true,
      "text": [
        "달은 누구의 계약에도 들어가지 않고 하늘로 오른다. 오늘밤 모든 소원이 이루어지지는 않는다. 달빛이 닿지 않는 강굽이도 생긴다. 사람들은 그곳에 손수 등불을 세우고 서로의 이름을 부른다.",
        "야시장은 더 느리고 작은 시장이 된다. 마법이 대신 처리하던 일을 사람이 직접 해야 하기 때문이다. 대신 실패한 소원을 달 탓으로 돌리는 일도 줄어든다. 하늘의 달이 처음으로 다른 사람을 위해서가 아니라 자기 기분으로 환하게 웃는다."
      ],
      "epilogues": [
        {
          "when": {
            "flag": "moon_heard"
          },
          "text": "달이 마지막으로 당신들에게만 작은 하품을 보여 준다. 부탁을 제대로 들었다는 인사처럼 보인다."
        },
        {
          "when": {
            "flag": "memory_paid",
            "notFlag": "rain_returned"
          },
          "text": "팔았던 작은 기억의 빈자리에는 오늘 함께 켠 등불의 기억이 들어온다. 잃은 것은 남아 있지만 그곳이 비어 있지는 않다."
        }
      ],
      "question": "누군가에게 소원을 대신 이루어 달라고 하기 전에, 여러분이 함께 할 수 있는 작은 일은 무엇인가요?",
      "choices": []
    }
  },
  "deathEnding": {
    "title": "이름 없는 손님들의 새벽",
    "art": 2,
    "mood": "danger",
    "text": [
      "일행의 마지막 숨이 끊기자 종이 토끼의 통행 장부에서 이름들이 번진다. 이곳에서 죽은 사람은 이름과 기억을 부르는 동료가 있어야 돌아올 수 있지만, 지금은 대답할 동료가 없다.",
      "경매장의 불빛은 멀리 강물에 비친다. 일행이 지키려 했던 등불과 남겨 둔 기록이 누군가에게 닿을 수는 있다. 그러나 이번 일행은 그 불을 보러 돌아오지 못한다. 나루지기는 이름이 사라진 자리에 빈 의자를 남긴다."
    ],
    "question": "누군가 빈 의자의 주인을 찾으러 온다면, 여러분은 어떤 이야기를 남기고 싶나요?"
  },
  "items": {
    "rule-slip": {
      "name": "야시장 거래 규칙 사본",
      "description": "자기 기억만 팔 수 있고, 생각하는 존재는 본인 동의 없이 양도할 수 없다는 규칙을 베낀 종이.",
      "useHint": "무대 뒤 계약실에서 이 규칙을 제출하면 도박하듯 설득하지 않고도 경매 무효 절차를 밟을 수 있다.",
      "legacyClues": [
        "card"
      ]
    },
    "memory-thread": {
      "name": "동의받아 엮은 기억 실",
      "description": "여러 사람이 나누어도 좋다고 맡긴 작은 기억들을 엮은 튼튼한 한 가닥. 한 번 안전줄로 쓰면 원래의 기억들로 풀려 돌아간다.",
      "useHint": "달 하역대에서 소원 끈의 무게를 받쳐 전원을 안전하게 내려오게 한다.",
      "consumable": true
    },
    "river-letters": {
      "name": "강가 주민들의 요구서",
      "description": "달을 소유하려는 것이 아니라 나루와 밤길을 함께 쓰고 싶다는 주민들의 말을 모아 쓴 종이.",
      "useHint": "달의 대기실에서 보여 주면 공동 나루라는 제안을 당사자와 함께 정할 수 있다.",
      "legacyClues": [
        "fish"
      ]
    }
  }
};

export default campaign;
