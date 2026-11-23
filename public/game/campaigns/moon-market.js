// Original authored scenario for Chronicle Gate v18.1.
// Stable v18 graph and rules; clarified speakers, writing, and introductions.
const campaign = {
  "id": "moon-market",
  "title": "달을 파는 야시장",
  "subtitle": "잠 좀 자고 싶다는 달이 오늘 밤 경매에 나온다.",
  "genre": "기묘한 동화 · 흥정과 소원",
  "accent": "#e2ad68",
  "description": "동전 대신 작은 기억으로 값을 치르는 야시장. 오늘의 마지막 경매품은 달이고, 낙찰자는 강물과 나룻배가 다닐 길까지 차지한다. 정작 달은 팔리는 대신 잠을 자고 싶다고 한다. 달의 부탁과 강가 마을의 편지를 들고, 경매가 끝나기 전에 길을 찾아야 한다.",
  "estimatedMinutes": "35–60",
  "contentNotes": [
    "기억 상실",
    "이별",
    "기묘한 동화"
  ],
  "objective": "팔리기 싫다는 달의 말을 듣고, 달과 강가 사람들이 쉴 곳을 함께 찾는다.",
  "art": "moon-market",
  "pressureLabel": "경매장의 관심",
  "pressureMax": 8,
  "start": "bridge",
  "roles": [
    {
      "title": "처음 보는 단골",
      "secret": "당신 주머니에 이 시장의 단골 도장이 열 개 찍혀 있다. 정작 여기 온 기억은 없다. 도장 마지막 칸에는 「고향을 잊지 않기로 함」이라고 적혀 있다.",
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
      "secret": "꿈에서 달의 편지를 받았다. 내용은 「구해 주세요」가 아니라 「먼저 물어봐 주세요」였다. 달이 자기 운명을 결정하고 싶어 한다.",
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
      "text": "달은 사람들의 모든 소원을 대신 책임지는 일에 지쳤다. 떠나거나, 누구의 소유도 아닌 채 잠깐 쉴 권리를 원한다."
    },
    "shared": {
      "title": "공동 나루의 이름",
      "text": "시장과 강가 사람들은 달을 소유하지 않고 길을 함께 지키는 「달잠 나루」에 동의했다."
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
    "bid_exposed": "동의 없는 경매 사실을 공개했다",
    "solo_story_credit": "토끼에게 오늘 밤의 이야기를 돌아오는 길에 들려주기로 하고 외상 통행을 얻었다",
    "group_bridge_lamp": "일행이 건널 다리의 꺼진 등불을 다시 밝혔다",
    "solo_quiet_promise": "이번 밤에는 소원을 빌지 않겠다는 약속을 달이 받아들였다",
    "group_moon_time": "문밖 경비의 질문을 맡아 달이 자기 말을 할 시간을 벌었다"
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
        "어제까지 없던 등불 다리가 밤강을 건넌다. 통행료로 동전을 내밀자 문지기인 종이 토끼가 받아 은빛 종이로 편다. 몇 번 접힌 돈이 물고기가 되어 강으로 뛰어든다. 토끼가 귀를 흔들며 말한다. “여기서는 다른 걸 받아요.”",
        "토끼 앞에는 빈 찻잔과 기억 저울이 있다. 토끼가 둘을 가리킨다. “잊어도 좋은 기억이면 돼요. 고르는 건 손님이고요.” 다리 너머에서 경매 예고가 들린다. 마지막 물건은 달이라고 한다. 물 위의 달빛이 한 번 떨린다."
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
        },
        {
          "id": "lantern",
          "label": "다리 가운데의 꺼진 등불",
          "kind": "object",
          "aliases": [
            "등불",
            "바람막이"
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
              "text": "실패한 까닭까지 웃으며 털어놓자 토끼가 「다시 듣고 싶은 이야기」라고 적는다. 규칙 사본도 접어 주며 감시꾼에게 정식 손님이라고 알린다. 지워지지 않은 기억을 간직한 채 찻집으로 들어간다.",
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
              "text": "실패담이 끝나기도 전에 토끼가 웃다가 귀 한쪽을 접는다. “이건 안 잊어도 돼요. 제가 기억할게요.” 토끼가 장부에 표시하고 길을 열어 주어, 등불을 따라 다리를 건너 찻집에 들어간다.",
              "next": "tea",
              "set": [
                "market_friend"
              ]
            },
            "failure": {
              "text": "우스운 대목을 기다리던 토끼가 진지하게 교훈을 적기 시작한다. 이야기가 길어지자 뒤의 손님들이 발을 구른다. 저울 상인이 값을 같이 정해 보자며 손짓해, 그쪽으로 자리를 옮긴다.",
              "next": "scales",
              "pressure": 1
            },
            "fumble": {
              "text": "웃길 대목을 서둘러 꺼내다 말이 꼬이자 토끼가 무슨 거래인지 모르겠다고 한다. 높아진 목소리에 감시꾼들이 얼굴을 살핀다. 토끼가 작은 값부터 정해 보라며 길을 내주어, 옆의 기억 저울로 자리를 옮긴다.",
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
              "text": "무엇을 낼 수 있는지 묻자 토끼가 강의 은빛 물고기를 불러 편다. 동전 모양이 돌아온 종이에서 낯익은 빗소리가 난다. 그것을 건네받아 토끼가 가리킨 옆 저울 앞으로 걸어간다.",
              "next": "scales"
            }
          }
        },
        {
          "id": "solo-borrow-a-story",
          "label": "오늘 밤 겪을 이야기를 돌아올 때 들려주겠다고 외상을 청한다",
          "intent": "talk",
          "target": "rabbit",
          "stat": "heart",
          "dc": 11,
          "requires": {
            "partyMax": 1
          },
          "risk": "토끼가 외상을 믿지 않으면 기억 저울에서 값을 다시 정해야 한다. 대실패하면 감시꾼도 얼굴을 기억한다.",
          "outcomes": {
            "critical": {
              "text": "돌아와 오늘의 이야기를 끝까지 들려주겠다고 하자 토끼가 빈 장을 접어 둔다. 규칙 사본을 주고 감시꾼에게도 믿을 손님이라고 알린다. 아직 쓰이지 않은 통행료를 뒤에 두고 다리를 건너 찻집에 들어간다.",
              "next": "tea",
              "set": [
                "solo_story_credit",
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
              "text": "겪지 않은 밤을 미리 지불하겠다는 말에 토끼의 귀가 한 번 접힌다. “돌아올 때 끝까지요.” 그가 통행 장부의 빈칸을 남겨 두자 다리를 건너, 찻집의 낮은 문을 연다.",
              "next": "tea",
              "set": [
                "solo_story_credit",
                "market_friend"
              ]
            },
            "failure": {
              "text": "아직 없는 이야기를 받기 어렵다며 토끼가 장부를 닫는다. 뒤에서 기다리던 손님들의 눈길이 모인다. 그는 작은 기억부터 정해 보라며 바로 옆 저울 상인에게 길을 내준다.",
              "next": "scales",
              "pressure": 1
            },
            "fumble": {
              "text": "끝을 모르는 이야기를 어떻게 갚을지 설명하다 말이 엉킨다. 토끼는 외상 표시를 지우고 감시꾼에게 임시 손님이라고 알린다. 입구에서 더 머물지 못한 채 기억 저울로 가 값을 다시 묻는다.",
              "next": "scales",
              "pressure": 3
            }
          }
        },
        {
          "id": "group-light-bridge",
          "label": "동료들이 발판을 볼 수 있게 꺼진 등불의 바람막이를 고친다",
          "intent": "help",
          "target": "lantern",
          "stat": "wit",
          "dc": 11,
          "requires": {
            "partyMin": 2,
            "aliveMin": 2
          },
          "risk": "잘 고치지 못하면 통행료를 따로 정해야 한다. 대실패하면 불꽃에 행동자 생명 1을 잃고 감시꾼이 온다.",
          "outcomes": {
            "critical": {
              "text": "바람막이의 걸쇠를 바로 세우자 등불이 고르게 타고 발판이 드러난다. 토끼가 통행료 대신 받은 도움이라며 규칙 사본도 건넨다. 일행과 밝아진 다리를 건너 찻집으로 들어간다.",
              "next": "tea",
              "set": [
                "group_bridge_lamp",
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
              "text": "흔들리던 덮개를 고정하고 심지를 살리자 다리에 빛이 돌아온다. 토끼가 오늘은 이 수고를 통행료로 받겠다며 길을 연다. 손에 묻은 그을음을 털고 일행과 다리를 건너 찻집으로 간다.",
              "next": "tea",
              "set": [
                "group_bridge_lamp",
                "market_friend"
              ]
            },
            "failure": {
              "text": "덮개를 맞춰도 바람이 새어 불이 붙지 않는다. 토끼가 임시 등불을 들고 와 발밑을 비춘다. 통행료는 따로 정해야 해, 일행과 그의 빛을 따라 기억 저울 쪽으로 이동한다.",
              "next": "scales",
              "pressure": 1
            },
            "fumble": {
              "text": "덮개가 갑자기 열려 심지의 불꽃이 손을 덮친다. 소리에 온 감시꾼 앞에서 토끼가 등불을 회수한다. 손을 식히며 일행과 기억 저울로 가, 고치지 못한 수고 대신 통행료를 다시 정한다.",
              "next": "scales",
              "harm": 1,
              "pressure": 3
            }
          }
        }
      ],
      "dialogue": {
        "who": "종이 토끼",
        "text": "남의 기억을 가져오면 반품입니다. 반품은 직접 돌려드리셔야 해요."
      },
      "objective": "토끼와 값을 흥정하거나 기억 저울에 물어본다.",
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
      "summary": "기억으로 통행료를 받는 시장에서 오늘 밤 달을 판다고 한다.",
      "stakes": "흥정이 소란스러워지면 감시꾼이 얼굴을 기억한다.",
      "partyText": {
        "solo": [
          "홀로 걷던 밤강가에 없던 다리가 생겼다. 통행료로 동전을 건네자 문지기인 종이 토끼가 받아 은빛 종이로 접는다. 돈은 물고기가 되어 강에 뛰어든다. “여기는 기억을 받아요.” 토끼의 말에 뒤를 보아도 함께 의논할 여행자는 없다.",
          "토끼 앞에는 찻잔과 저울, 아직 안 들은 이야기를 적는 작은 장부가 있다. 오늘 밤 겪을 일을 나중에 들려주겠다고 외상을 청할 수도 있을 듯하다. 안쪽에서 마지막 경매 예고가 울린다. 팔리는 것은 달이라고 한다."
        ],
        "group": [
          "일행이 다리에 들어서자 가운데 등불이 흔들려 발판 하나가 어둠에 잠긴다. 문지기인 종이 토끼는 일행이 건넨 동전을 받아 물고기로 접어 강에 놓아 준다. “여기는 기억을 받아요. 각자 잊어도 좋은 걸 골라야 해요.”",
          "토끼는 찻잔과 저울을 가리키다가 꺼진 등불을 본다. 종이 손으로 바람막이를 닫기가 어려운 모양이다. 불을 돌려놓으면 뒤따르는 발도 길을 볼 수 있다. 시장에서는 달을 판다는 마지막 경매 예고가 들린다."
        ]
      }
    },
    "tea": {
      "id": "tea",
      "title": "찻잔 속의 달은 하품했다",
      "chapter": 1,
      "location": "계절 찻집",
      "art": 0,
      "mood": "calm",
      "text": [
        "찻집 주인 단이 봄비와 여름 끝 중 무엇을 마실지 묻는다. 메뉴에는 「겨울 새벽, 잠시 품절」이라 적혔다. 빈 잔에 비친 달이 눈을 비빈다. 하늘을 올려다봐도 그쪽 달은 움직이지 않는다.",
        "단이 찻주전자를 내려놓고 목소리를 낮춘다. 어젯밤 달이 와서 아무 소원도 받지 않는 자리를 부탁했단다. 오늘 팔릴 물건이 스스로 차를 주문한 셈이다. 잔 속의 달은 하품을 하려다 이쪽을 본다."
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
              "text": "대답을 재촉하지 않고 차가 식도록 기다린다. 달이 소원을 받지 않을 권리를 말하자 단도 손님의 요청으로 적는다. 달이 맡긴 기억을 허락 없이 열지 않기로 하고, 그 병이 있는 수선점을 찾아간다.",
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
              "text": "쉬고 싶은 까닭을 묻자 찻잔에 글씨가 맺힌다. 「다른 사람 소원 말고 내 소원도 있으면 안 돼?」 잔 속의 달이 기억병을 맡긴 수선점을 가리킨다. 단이 알려 준 길을 따라 찻집을 나와 수선점으로 향한다.",
              "next": "repair",
              "clues": [
                "tea"
              ]
            },
            "failure": {
              "text": "질문이 끝나기 전에 잔 속 달빛이 바닥으로 숨어 버린다. 단이 찻잔을 가리며 잠깐 놀란 것뿐이라고 한다. 더 묻는 대신 노점에서 경매 이야기를 들어 보라는 말에 뒷문으로 나선다.",
              "next": "stalls",
              "pressure": 1
            },
            "fumble": {
              "text": "대답을 보려고 잔을 밝은 쪽으로 돌리자 감시꾼이 달빛을 알아본다. 달은 숨고 찻집 밖에 발소리가 멎는다. 단이 노점길 뒷문을 열어 주며, 경매를 알아본 뒤 다시 오라고 속삭인다.",
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
              "text": "노점의 이야기도 들어 보겠다고 하자 단이 찻잔을 한 번 더 채운다. 마지막 한 모금에서 지난여름의 더위가 잠깐 돌아온다. 잔을 내려놓고 달빛이 몰린 가게들 사이로 걸어간다.",
              "next": "stalls"
            }
          }
        }
      ],
      "objective": "달에게 이유를 묻거나 노점에서 경매 조건을 듣는다.",
      "details": [
        {
          "id": "watch-cup",
          "label": "찻잔과 하늘의 달을 번갈아 본다",
          "text": "찻잔 속 달은 하품하고 몸을 돌린다. 달에게는 스스로의 생각이 있다.",
          "clue": "tea"
        }
      ],
      "summary": "찻잔 속 달이 하품한다. 어젯밤에는 아무 소원도 받지 않는 자리를 찾았다.",
      "stakes": "달빛을 드러내면 감시꾼이 찻집을 찾는다.",
      "callbacks": [
        {
          "when": {
            "flag": "solo_story_credit"
          },
          "text": "찻집 주인이 빈 통행료 칸을 듣고 웃는다. “그럼 오늘 차 맛도 잘 기억해 둬요. 토끼가 끝까지 들을 테니까.”"
        },
        {
          "when": {
            "flag": "group_bridge_lamp"
          },
          "text": "창 너머 다리 한가운데의 등불이 고르게 탄다. 토끼는 새 손님에게 그 발판을 가리키며 안심하고 건너오라고 한다."
        }
      ]
    },
    "scales": {
      "id": "scales",
      "title": "가벼운 기억의 무게",
      "chapter": 1,
      "location": "기억 저울 가게",
      "art": 0,
      "mood": "calm",
      "text": [
        "기억 저울 상인 한톨이 손바닥을 펴 보인다. “첫사랑부터 꺼내지는 마세요. 나중에 찾아오는 분이 너무 많아서요.” 저울 옆 외상 쪽지들이 바람에 부딪친다. 하나에는 「화요일의 냄새, 꼭 찾아갈 것」이라고 쓰였다.",
        "한톨은 빗소리 하나처럼 작은 기억도 괜찮다고 한다. 무게추에는 정해진 금액이 없다. 무엇을 잊을지 고를 때까지 그는 빈 저울을 건드리지 않는다. 기억 대신 일을 맡을 수 있는지도 아직 물어볼 수 있다."
      ],
      "entities": [
        {
          "id": "merchant",
          "label": "기억 저울 상인 한톨",
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
              "text": "스스로 잊어도 좋은 빗소리 하나를 골라 저울에 놓는다. 한톨은 동의를 확인한 뒤 보관 기록을 남긴다. “찾고 싶으면 수선점으로 가세요.” 익숙한 소리 하나가 빠진 밤을 지나 그 가게로 향한다.",
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
              "text": "어떤 일을 마치면 통행료가 되는지 먼저 정하자 한톨이 고개를 끄덕인다. 정식 통행 표시와 규칙 사본이 손에 남는다. 맡은 일감의 무게를 확인하고, 소개받은 수선점으로 걸어간다.",
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
              "text": "기억 대신 손을 보태겠다고 하자 한톨이 물방울 실꾸리를 건넨다. “수선사에게 전하고 일손을 거들어 주세요.” 젖지 않는 꾸러미를 안고 가자 수선점의 작은 종이 바람에 흔들린다.",
              "next": "repair",
              "set": [
                "market_friend"
              ]
            },
            "failure": {
              "text": "일의 값을 맞추지 못해 한톨의 펜이 계약서 위에서 멎는다. 그는 수선사가 직접 판단하도록 임시로 길을 열어 준다. 주변 상인들의 눈길을 받으며, 아직 끝내지 못한 흥정을 안고 수선점으로 간다.",
              "next": "repair",
              "pressure": 1
            },
            "fumble": {
              "text": "맡을 수 있다고 한 일감이 너무 커 계약을 끝내지 못한다. 한톨이 약속을 지우고 감시꾼에게 임시 손님이라고 알린다. 수선사에게 작은 일부터 다시 물어보라는 소개만 받아, 그 가게로 향한다.",
              "next": "repair",
              "pressure": 3,
              "unset": [
                "market_friend"
              ]
            }
          }
        }
      ],
      "objective": "빗소리 하나를 맡기거나 수선 일을 대신하겠다고 흥정한다.",
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
      "summary": "저울 상인은 값으로 낼 작은 기억을 스스로 고르라고 한다.",
      "stakes": "맡긴 빗소리는 낯설어진다. 이번 밤 맡긴 기억은 수선점에서 찾을 수 있다."
    },
    "stalls": {
      "id": "stalls",
      "title": "달을 사면 강이 따라온다",
      "chapter": 2,
      "location": "달빛 노점길",
      "art": 1,
      "mood": "mystery",
      "text": [
        "잠 잘 오는 그림자와 두 번째에는 꼭 맞히는 점괘가 나란히 팔린다. 주인을 기다리지 않는 우산이 가게 밖으로 슬금슬금 걸어간다. 한산한 노점에는 「달 낙찰자 특별 안내」라는 팻말이 걸려 있다.",
        "그림 속 달빛을 따라 강과 야시장이 같은 정원으로 들어간다. 수집가가 달을 사면 나룻배가 지날 길도 그의 허락을 받아야 한다는 설명이다. 종이 물고기 하나가 팻말 모서리를 물고, 강가 나루 쪽으로 잡아당긴다."
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
              "text": "수집가의 대리인 행세로 마을 배의 통행까지 묻자 상인이 예외조항을 펼친다. 먼저 길을 쓰던 주민은 이의를 낼 수 있다. 규칙 사본을 받아 접고, 그 주민들의 편지가 모인 나루를 찾아간다.",
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
              "text": "낙찰 뒤의 절차를 묻자 상인이 정원까지 강물을 끌 계약을 설명한다. 달을 사는 값에 다른 사람의 길도 들어 있었다. 종이 물고기가 계약서의 나루 위치를 물어 가리켜 그쪽으로 향한다.",
              "next": "fish",
              "clues": [
                "price"
              ]
            },
            "failure": {
              "text": "대리인이라 말하자 상인이 진짜 수집가에게 전화를 건다. 마침 도망가는 우산이 펼쳐져 그의 시야를 가린다. 공개 팻말의 독점 조건만 확인하고, 우산이 만든 틈으로 나루 쪽에 빠져나간다.",
              "next": "fish",
              "clues": [
                "price"
              ],
              "pressure": 2
            },
            "fumble": {
              "text": "상인이 진짜 대리인과 통화하며 고개를 들자 위장이 끝난다. 일행의 인상착의가 경매 경비에게 전해진다. 팻말의 독점 조건을 눈에 담고, 붙잡히기 전에 노점 뒤 나루 통로로 물러난다.",
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
              "text": "주인이 되겠다는 말 대신 잠깐 길을 부탁하자 우산이 낮은 난간을 고른다. 감시꾼의 눈도 가려 주어 무사히 나루에 닿는다. 기다리던 종이 물고기들이 주민 편지를 건네고 우산은 다시 혼자 날아간다.",
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
              "text": "강가 소식을 들을 곳을 부탁하자 우산이 손잡이를 내민다. 잠시 길을 맡기니 종이 물고기들이 모인 나루가 나타난다. 발이 땅에 닿는 것을 보고 우산은 다음 주인을 기다리지 않고 날아간다.",
              "next": "fish",
              "set": [
                "market_friend"
              ]
            },
            "failure": {
              "text": "우산을 따라 지붕을 넘다 손을 놓쳐 바닥에 떨어진다. 아픈 몸을 일으키자 우산이 낮게 선회하며 종이 물고기들이 있는 곳을 가리킨다. 그쪽으로 길을 따라 걸어가 나루지기 앞에 닿는다.",
              "next": "fish",
              "pressure": 1,
              "harm": 1
            },
            "fumble": {
              "text": "우산이 솟을 때 매달린 손이 미끄러져 아래 난간에 세게 부딪친다. 소리에 감시꾼이 몰리기 전에 나룻배를 모는 담이 다친 몸을 받친다. 담의 나루에서야 우산이 멀리 돌아가는 것이 보인다.",
              "next": "fish",
              "harm": 2,
              "pressure": 2
            }
          }
        }
      ],
      "objective": "계약의 조건을 묻거나 우산에게 강가로 가는 길을 부탁한다.",
      "details": [
        {
          "id": "auction-conditions",
          "label": "낙찰자 안내 팻말을 읽는다",
          "text": "달 낙찰자는 강의 달빛 길과 야시장의 정박 장소까지 정한다.",
          "clue": "price"
        }
      ],
      "summary": "달을 산 사람의 정원으로 강물과 시장도 따라가게 된다.",
      "stakes": "위장이 들키면 감시가 붙는다. 날아가는 우산을 잘못 따라가면 추락한다."
    },
    "repair": {
      "id": "repair",
      "title": "잊은 빗소리를 꿰매는 가게",
      "chapter": 2,
      "location": "기억 수선점",
      "art": 1,
      "mood": "calm",
      "text": [
        "기억 수선사 나비가 유리병의 이름표를 바로 묶는다. 빗소리와 길 모퉁이 냄새가 병 안에서 잠들어 있다. 팔린 기억도 곧장 없애지는 않는다. 이번 밤 한톨에게 맡긴 기억이라면 보관 기록으로 찾을 수 있다고 한다.",
        "달의 병에는 아무도 소원을 빌지 않던 밤이 들었다. 나비는 허락 없이 열지 않는다며 마개를 덮는다. 옆의 기억 실은 달랐다. 주인들이 나누어도 좋다고 맡긴 조각들이다. 얇은 한 가닥이 작업대의 무게를 가볍게 받치고 있다."
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
              "text": "병마다 소리를 듣고 이름표를 맞추자 찢긴 길의 기억도 이어진다. 나비가 완성된 지도를 살피며 나누기로 한 기억 실을 건넨다. 안전줄로 쓰라는 말을 듣고 그 지도대로 주민 편지가 있는 나루를 찾아간다.",
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
              "text": "이름표를 맞춘 조각 중 허락받은 기억만 잇자 끊긴 길이 돌아온다. 나비가 여분의 기억 실을 건네며 하역대의 안전줄로 쓰라고 한다. 수선을 마친 손을 털고 그 길이 닿는 나루로 향한다.",
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
              "text": "맞췄다고 생각한 비 두 개가 한 병에서 천둥을 친다. 나비가 웃음을 삼키며 병을 다시 나눈다. “이럴 때는 주인에게 묻죠.” 돌아오는 기억의 소리를 들으며, 그들의 편지가 있는 나루로 간다.",
              "next": "fish",
              "clues": [
                "repair"
              ],
              "pressure": 1
            },
            "fumble": {
              "text": "서로 다른 주인의 조각이 묶이자 천둥과 찾기 종이 함께 울린다. 나비가 곧바로 분리하고 도구를 거둔다. 작업을 더 맡기지는 못하겠다며, 원래 주인의 말을 들을 나루로 길을 알려 준다.",
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
              "text": "보관 기록으로 이름을 확인하자 맡겼던 빗소리가 돌아온다. 나비는 달의 병에는 손대지 않고 제자리에 둔다. 서로의 기억을 그대로 남겨 두고, 주민들이 보낸 편지를 읽으러 나루로 향한다.",
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
              "text": "병의 마개에서 손을 떼고 달에게 직접 물을 길을 청한다. 나비가 종이 물고기 나루까지 이어진 지도를 펼친다. 닫힌 병 속의 조용한 밤을 뒤에 두고, 그곳에 모인 목소리를 찾아간다.",
              "next": "fish"
            }
          }
        }
      ],
      "objective": "수선을 거들거나 맡긴 기억을 돌려받고 나루로 간다.",
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
      "summary": "나비가 기억을 병에 보관한다. 나누어도 좋다는 기억은 실로 엮는다.",
      "stakes": "다른 주인의 기억을 잘못 잇지 않도록 해야 한다. 달의 병은 허락 없이 열지 않는다."
    },
    "fish": {
      "id": "fish",
      "title": "강 건너의 소원은 작았다",
      "chapter": 2,
      "location": "종이 물고기 나루",
      "art": 1,
      "mood": "mystery",
      "text": [
        "종이 물고기들이 물 위에서 입을 연다. 생선 장수의 새벽, 야간 간호사의 퇴근길, 통학 배의 첫 손님이 편지에서 목소리가 된다. 나룻배를 모는 담이 젖은 종이를 펼칠 마른 판자를 내준다.",
        "누구도 달을 달라고 하지는 않는다. 배가 집 앞을 지나고 밤길이 한 사람의 정원에만 닿지 않기를 바란다. 한 편지를 읽는 동안 다른 물고기들이 조용히 기다린다. 강 건너에서는 아직 시장의 경매 종이 잘 들리지 않는다."
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
          "label": "나룻배를 모는 담",
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
              "text": "편지마다 다른 사정과 같은 부탁을 나누어 적는다. 달을 갖지 않고 나루를 함께 돌보겠다는 요구서에 담과 상인들도 증인으로 선다. 그들이 길을 비켜 주고 함께 걸으며 경매장까지 간다.",
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
              "text": "젖은 편지들을 펼치자 집으로 갈 길을 함께 쓰고 싶다는 말이 겹친다. 달을 달라는 문장은 없다. 요구를 한 장에 모아 품고, 아직 경매 종이 울리는 쪽으로 걸어간다.",
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
              "text": "펼친 편지가 젖어 달라붙자 읽던 문장이 끊긴다. 담이 들은 내용을 마른 종이에 다시 적어 준다. 요구서만은 지킨 채, 모임을 살피기 시작한 감시꾼보다 먼저 경매장으로 움직인다.",
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
              "text": "한꺼번에 펼친 편지가 강바람에 날아가고 요구서까지 물에 잠긴다. 감시꾼이 모임을 흩뜨리는 동안 담이 기억한 말을 되짚는다. 달에게 보여 줄 종이는 잃은 채, 그의 증언을 따라 경매장으로 간다.",
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
              "text": "한 사람씩 노래하듯 말해 달라고 하자 물고기들의 행렬이 청원이 된다. 상인들도 강을 정원 하나에 가둘 수 없다며 입찰의 뜻을 다시 묻는다. 요구서를 챙겨 그들의 지지 속에 경매장으로 들어간다.",
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
              "text": "함께 가자고 청하자 물고기들이 공중으로 올라 강 건너 목소리로 노래한다. 구경하러 나온 사람들도 나루 이야기에 귀를 기울인다. 그 요구를 적은 종이를 들고 행렬과 함께 경매장에 닿는다.",
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
              "text": "행렬의 말들이 엇갈려 경비가 경매장 입구로 몰아간다. 담이 그 와중에도 들은 요구를 한 장으로 추린다. 목소리 대신 종이를 받아 경매장 안으로 들어가, 다시 설명할 틈을 찾는다.",
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
              "text": "서로를 덮는 목소리 사이로 경비가 들어와 물고기들을 흩뜨린다. 손에 들던 요구서도 찢겨 종이 조각이 된다. 담이 핵심을 말로 되짚으며 경매장으로 이끌지만, 보여 줄 서류는 남지 않았다.",
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
      "objective": "편지를 한 장에 모으거나 물고기들과 경매장으로 간다.",
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
      "summary": "종이 물고기 편지들은 달을 갖기보다 함께 쓸 나루를 바란다.",
      "stakes": "요구서를 잃으면 달에게 공동 나루를 보여 주며 제안할 수 없다."
    },
    "auction": {
      "id": "auction",
      "title": "자기 이름으로 입찰할 수 없는 물건",
      "chapter": 2,
      "location": "달 경매장",
      "art": 1,
      "mood": "tension",
      "text": [
        "무대의 작은 달이 유리 고리 안에서 몸을 돌린다. 고리 뒤의 긴 소원 끈은 강 위 하역 물레까지 이어진다. 경매를 진행하는 일구가 다시 값을 부른다. 앞서 담보 사냥꾼들로 손님을 겁주던 수집가의 대리인도 입찰 패를 든다.",
        "판매자와 동의란은 비어 있다. 달이 “팔아 달라고 한 적 없어”라고 말해도 망치는 들린 채다. 무대 뒤 계약실 문이 보인다. 고리를 깨서 하역대로 나갈 수도 있지만, 발밑 발판까지 같은 지지대에 매달려 있다."
      ],
      "entities": [
        {
          "id": "auctioneer",
          "label": "경매 진행자 일구",
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
              "text": "가격 대신 비어 있는 동의란을 묻자 일구가 처음으로 망치를 내린다. 원본은 뒤에 있다는 짧은 대답이 나온다. 입찰 패들이 기다리는 사이, 그 빈칸을 확인하러 무대 뒤 문을 연다.",
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
              "text": "당사자가 팔리겠다고 했는지 묻자 객석에서도 같은 질문이 터진다. 일구가 동의 없는 낙찰을 멈추고 대기실 문을 연다. 충분한 시간을 얻어, 느슨해진 끈을 따라 내려온 달과 그 방에 들어간다.",
              "next": "witness",
              "set": [
                "free_clause",
                "bid_exposed"
              ],
              "pressure": -1
            },
            "success": {
              "text": "달의 말을 들을 시간을 청하자 손님들이 입찰 패를 내린다. 일구가 짧은 휴회를 선언하며 대기실을 연다. 끈을 늘여 내려온 달을 따라 그 방으로 들어가, 이번에는 그의 말을 기다린다.",
              "next": "witness"
            },
            "failure": {
              "text": "일구가 휴회를 거절하고 망치를 든다. 달이 직접 끈을 늘여 대기실 의자로 내려오며 이야기하겠다고 한다. 그 초대를 따라 방 안으로 들어서자, 경비의 구두 소리도 문밖에서 멎는다.",
              "next": "witness",
              "pressure": 2
            },
            "fumble": {
              "text": "중단을 청한 목소리를 일구가 소란이라 부르며 경비를 부른다. 달은 스스로 끈을 늘여 대기실로 내려와 일행을 기다린다. 그를 따라 들어가지만 문밖의 경비는 오가는 말까지 적기 시작한다.",
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
              "text": "지지대를 비켜 고리만 깨자 달이 판매에 동의한 적 없다고 외친다. 구경꾼들이 일구를 붙드는 사이 소원 끈을 따라 하역대로 내려선다. 달려온 기억 수선사 나비가 다음 작업에 쓰라며 기억 안전줄을 내민다.",
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
              "text": "발판의 축을 남기고 고리만 부수자 달이 풀린 틈으로 몸을 뺀다. “팔아 달라고 하지 않았어.” 구경꾼들이 일구의 길을 막는 동안 달과 하역대로 내려가, 아직 남은 소원 끈을 살핀다.",
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
              "text": "고리와 함께 발판이 기울어 모두가 난간에 세게 부딪친다. 달이 자신을 판 적 없다고 외치며 소원 끈을 길게 늘인다. 숨이 남은 일행은 그 끈을 잡고 하역대로 내려갈 수 있지만, 달의 구속까지 풀린 것은 아니다.",
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
              "text": "고리와 발판을 받치던 축이 한꺼번에 부서진다. 딛고 있던 바닥이 사라지고 일행 모두가 깊은 강으로 떨어진다. 물에 잠긴 이름들을 불러 되돌릴 살아 있는 동료도 함께 사라진다.",
              "next": "crane",
              "harmAll": 3,
              "pressure": 3
            }
          }
        }
      ],
      "objective": "원본 계약을 보거나 달과 이야기할 시간을 얻는다.",
      "details": [
        {
          "id": "blank-consigner",
          "label": "위탁 장부의 판매자 칸을 확인한다",
          "text": "판매자와 당사자 동의 칸이 모두 비어 있다. 비싼 물건이라는 사실만 반복돼 있다.",
          "clue": "auction"
        }
      ],
      "summary": "달은 팔리기 싫다고 하지만 경매사 손에는 망치가 들렸다.",
      "stakes": "고리를 깨는 지름길은 발판도 무너뜨릴 수 있다. 대실패하면 모두 죽는다."
    },
    "backstage": {
      "id": "backstage",
      "title": "계약서에 물건이 대답했다",
      "chapter": 3,
      "location": "무대 뒤 계약실",
      "art": 2,
      "mood": "tension",
      "text": [
        "경매 서류를 맡은 솔이 원본을 펴자 달의 거절이 또박또박 적혀 있다. 제목은 「분위기 연출 대사」다. 솔이 종이 끝을 만지며 말한다. “저 말도 공연의 일부인 줄 알았어요.” 달이 거절한 말이 손님들 앞에서 읽을 대본으로 묶여 있다.",
        "벽에는 다리에서 본 거래 규칙이 붙어 있다. 생각하는 존재의 말은 본인의 뜻으로 기록해야 한다. 이의서를 넣는 함 옆에서 봉인 장치가 붉게 달아오른다. 잘못 분류된 서류는 불로 지운다는 경고가 손잡이에 붙어 있다."
      ],
      "entities": [
        {
          "id": "clerk",
          "label": "경매 서류 담당 솔",
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
          "label": "달의 거절을 연출 대사가 아닌 실제 말로 적어 달라고 한다",
          "intent": "talk",
          "target": "clerk",
          "stat": "heart",
          "dc": 11,
          "risk": "보조원이 상사에게 보고하면 경매 경계가 높아진다.",
          "outcomes": {
            "critical": {
              "text": "달이 직접 거절했으니 연출이 아니라 본인의 뜻으로 적어야 한다고 짚는다. 솔은 달의 거절을 계약에 옮겨 공개 단상에도 사본을 보낸다. 더는 연출로 덮을 수 없어진 문장의 접수 번호를 들고 단상으로 간다.",
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
              "text": "규칙의 의사 표시 조항을 짚자 솔이 달의 말을 계약서로 옮긴다. 「판매에 동의하지 않음」 아래 무효 조항의 번호가 붙는다. 사본을 받아 들고 이 말을 공개 장부에도 남기러 간다.",
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
              "text": "조항을 설명해도 솔은 상사부터 부른다. 열린 원본의 빈 동의란을 사람들이 보게 되자 일구가 책을 덮으려 한다. 비어 있는 칸만으로도 무효의 근거가 되어, 사본을 들고 공개 단상으로 향한다.",
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
              "text": "솔이 상사를 부르자 일구가 달의 말은 연출로 두라고 명령한다. 바꿔 쓰려던 서류를 내려놓고 공개 자료인 원본 사본만 청한다. 막힌 수정 대신 그 빈 동의란을 들고 단상으로 간다.",
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
              "text": "녹음 시각과 달의 이름을 맞춰 봉인하자 장치가 맑게 울린다. 분류칸의 「물품」이 「방문자」로 바뀌고 공개 단상에도 정정 기록이 찍힌다. 달의 거절을 담은 사본을 들고 그 단상으로 간다.",
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
              "text": "달의 거절을 진술서로 옮겨 봉인을 누르자 분류칸이 「방문자」로 바뀐다. 장치는 이제 달을 경매 물품으로 취급하지 않는다. 아직 따뜻한 사본을 들고, 같은 말을 공개 장부에도 남기러 간다.",
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
              "text": "봉인을 누르자 장치가 첨부한 진술을 허위 입찰로 읽고 불꽃을 뿜는다. 솔이 불을 끄지만 깊은 화상이 남는다. 달의 동의가 없다는 원본만 구해, 그 증거로 공개 단상에 나서야 한다.",
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
              "text": "봉인이 취소 칸에 닿자 서류를 태울 불꽃이 몸까지 삼킨다. 솔이 불을 끈 뒤에도 숨은 돌아오지 않는다. 자동 수정은 잠겼지만 빈 동의란 사본은 남아, 살아남은 동료가 있다면 단상으로 가져갈 수 있다.",
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
          "label": "가져온 시장 규칙을 내밀어 경매를 멈춰 달라고 한다",
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
              "text": "규칙 사본을 원본 옆에 놓자 솔이 빈 동의란에 손을 멈춘다. 그는 무효 이의서에 달의 거절을 진술로 붙인다. 달아오른 봉인기는 건드리지 않은 채, 접수된 서류를 들고 공개 단상으로 간다.",
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
      "objective": "실제 거절로 바로잡거나 규칙 사본으로 경매 중단을 청한다.",
      "details": [
        {
          "id": "voice-record",
          "label": "연출로 분류된 달의 진술을 읽는다",
          "text": "달은 모든 소원을 책임지는 일에 지쳤다. 잠시 쉬거나 떠날 권리를 달라고 했다.",
          "clue": "consent"
        }
      ],
      "summary": "달의 거절이 서류에는 연출 대사라고 적혀 있다.",
      "stakes": "봉인기는 틀린 서류를 불로 태운다. 규칙 사본을 제출하면 장치를 만질 필요가 없다."
    },
    "witness": {
      "id": "witness",
      "title": "달의 소원은 잠이었다",
      "chapter": 3,
      "location": "경매장 작은 대기실",
      "art": 2,
      "mood": "calm",
      "text": [
        "소원 끈을 느슨하게 두른 달이 작은 의자에 앉아 있다. 풀려난 것은 아니지만 여기서는 자기 말을 할 수 있다. “못 이루어진 소원도 전부 내 잘못인 줄 알았어.” 의자 아래에 엷은 빛이 고인다.",
        "달은 잠깐 자거나, 자기가 고른 곳으로 여행하고 싶다고 한다. 주민들의 요구서가 있다면 누구의 소유도 아닌 나루를 함께 의논할 수 있다. 달이 일행을 올려다본다. “어디로 가든, 다시 팔리는 건 싫어.”"
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
        },
        {
          "id": "guard",
          "label": "대기실 밖 경매 경비",
          "kind": "person",
          "aliases": [
            "경비",
            "감시꾼"
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
              "text": "주민들의 요구서를 펴자 달은 자기를 갖겠다는 말이 없는지 천천히 읽는다. “그럼 달잠 나루라고 불러도 돼?” 이름에 함께 고개를 끄덕이고, 그 약속과 요구서를 들고 공개 장부로 돌아간다.",
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
              "text": "떠날 출구를 함께 찾겠다고 하자 달이 강 위를 가리킨다. 먼저 경매가 무효라는 것을 남겨야 붙잡히지 않겠다고 한다. 그의 계획을 듣고 공개 장부로 돌아가, 그 길을 막은 계약부터 풀기로 한다.",
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
        },
        {
          "id": "solo-let-wish-rest",
          "label": "오늘 밤은 소원을 빌지 않고 달이 쉬게 두겠다고 약속한다",
          "intent": "talk",
          "target": "moon",
          "stat": "heart",
          "dc": 11,
          "requires": {
            "partyMax": 1
          },
          "risk": "말이 와닿지 않으면 달은 새 부탁이 따라올까 경계한다. 지체하면 경비가 휴회를 끝내려 한다.",
          "outcomes": {
            "critical": {
              "text": "오늘의 소원을 접어 두겠다고 말하자 달이 천천히 등을 편다. 그는 팔리지 않겠다는 말을 자기 이름으로 전해 달라 하고 경매 중단도 청한다. 잠깐의 고요를 남겨 두고 공개 장부 쪽으로 걸어간다.",
              "next": "ledger",
              "set": [
                "solo_quiet_promise",
                "moon_heard",
                "free_clause"
              ],
              "clues": [
                "consent"
              ],
              "pressure": -2
            },
            "success": {
              "text": "이번 밤에는 아무것도 이루어 달라 하지 않겠다고 말한다. 달은 처음으로 끝을 재촉하지 않고 자기 여행 이야기를 잇는다. 그 뜻을 듣고 의자에서 일어나, 공개 장부에 그의 거절을 알리러 간다.",
              "next": "ledger",
              "set": [
                "solo_quiet_promise",
                "moon_heard"
              ],
              "clues": [
                "consent"
              ],
              "pressure": -1
            },
            "failure": {
              "text": "소원을 쉬겠다는 말 뒤에 달은 다른 부탁이 붙을까 기다린다. 충분히 믿게 하지 못한 사이 경비가 휴회를 끝내려 문을 두드린다. 팔리기 싫다는 뜻은 들었으니, 공개 장부 앞에서 경매부터 막기로 한다.",
              "next": "ledger",
              "clues": [
                "consent"
              ],
              "pressure": 1
            },
            "fumble": {
              "text": "약속을 설명할수록 달은 거래 조건을 듣는 듯 몸을 움츠린다. 경비가 문을 열어 대화를 끊고 경매를 재촉한다. 편히 쉬게 하지는 못한 채, 달의 거절을 잊지 않으려고 되뇌며 공개 단상으로 나간다.",
              "next": "ledger",
              "clues": [
                "consent"
              ],
              "pressure": 3
            }
          }
        },
        {
          "id": "group-answer-guards",
          "label": "대기실 문턱에서 경비의 질문을 맡아 달에게 말할 틈을 준다",
          "intent": "talk",
          "target": "guard",
          "stat": "heart",
          "dc": 12,
          "requires": {
            "partyMin": 2,
            "aliveMin": 2
          },
          "risk": "경비를 붙들지 못하면 휴회가 빨리 끝난다. 대실패하면 대화가 수색으로 바뀌어 경계가 크게 오른다.",
          "outcomes": {
            "critical": {
              "text": "문턱에서 질문을 하나씩 받아내자 경비가 중단 사유까지 듣게 된다. 안에서 달이 판매를 거절했다는 말을 또렷이 보태고, 경매 유예를 전하겠다는 답을 얻는다. 열린 대화가 끝난 뒤 일행과 공개 단상으로 간다.",
              "next": "ledger",
              "set": [
                "group_moon_time",
                "moon_heard",
                "free_clause"
              ],
              "clues": [
                "consent"
              ],
              "pressure": -2
            },
            "success": {
              "text": "경비의 질문을 먼저 받아 문 앞에 머물게 한다. 그동안 달은 안에서 자기 소원을 천천히 말하고, 문턱에도 목소리가 닿는다. 팔리기 싫다는 말을 들은 뒤 자리를 비켜 일행과 공개 장부로 돌아간다.",
              "next": "ledger",
              "set": [
                "group_moon_time",
                "moon_heard"
              ],
              "clues": [
                "consent"
              ],
              "pressure": -1
            },
            "failure": {
              "text": "질문을 맡아 보지만 경비가 비켜서라며 휴회 종료를 알린다. 달의 말이 끝나기 전에 문이 넓게 열린다. 더 붙들 기회를 잃어 일행과 공개 단상으로 나가, 경매를 멈출 다른 말을 찾아야 한다.",
              "next": "ledger",
              "pressure": 2
            },
            "fumble": {
              "text": "문턱을 지키는 태도를 경비가 수색 방해로 받아들인다. 더 많은 발소리가 붙고 달의 이야기는 끊긴다. 대기실에 머물지 못한 채 일행과 공개 장부 앞으로 나와, 몰린 눈길 속에서 다시 설명할 자리를 찾는다.",
              "next": "ledger",
              "pressure": 3
            }
          }
        }
      ],
      "dialogue": {
        "who": "달",
        "text": "내가 잠깐 눈을 감으면, 너희가 서로의 밤길을 조금 밝혀 줄 수 있을까?"
      },
      "objective": "주민 편지를 보여 주며 쉴 나루를 제안하거나 떠날 길을 돕는다.",
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
      "summary": "달은 잠을 자거나 제 뜻으로 여행하고 싶다고 한다.",
      "stakes": "공동 나루를 약속하려면 강가 주민들의 요구서를 달에게 보여 줘야 한다.",
      "partyText": {
        "solo": [
          "작은 의자 앞에 달과 단둘이 마주 선다. 느슨해진 소원 끈은 아직 그의 등에 닿아 있다. “오늘도 누가 뭘 빌까 봐 먼저 눈을 떴어.” 달이 빈 손을 펴 보이며 지친 이야기를 시작한다.",
          "달은 소원을 다 이루는 대신 잠을 자거나 여행하고 싶다고 한다. 나루 주민들의 편지에 담긴 자리도 의논할 수 있다. 하지만 달이 지금 묻는 것은 단순하다. “너도 나한테 이루어 달라는 게 있어?” 대답할 사람은 이 자리에 하나다."
        ],
        "group": [
          "대기실의 작은 의자에 소원 끈을 느슨하게 두른 달이 앉았다. 그는 일행 쪽을 바라보고, 이루지 못한 소원도 전부 자기 잘못인 줄 알았다고 말한다. 문밖에서 경비의 발소리가 오갈 때마다 잠깐 말을 멈춘다.",
          "달은 자기가 고른 곳에서 쉬거나 여행하고 싶다. 강가 편지에 적힌 나루도 함께 생각해 볼 수 있다. 지금은 문을 지나는 눈길 때문에 말이 끊긴다. 누군가 경비의 질문을 맡으면 그는 좀 더 천천히 이야기할 수 있을 듯하다."
        ]
      }
    },
    "ledger": {
      "id": "ledger",
      "title": "시장에서 가장 조용한 입찰",
      "chapter": 3,
      "location": "공개 장부 단상",
      "art": 2,
      "mood": "tension",
      "text": [
        "공개 장부 앞에서 수집가의 대리인이 값을 한 번 더 올린다. 동의란은 여전히 비어 있다. 빈칸을 가리키는 손에 앞줄 손님들이 고개를 기울인다. 이번에는 숫자 말고 무슨 말이 나올지 기다린다.",
        "경매 진행자 일구가 달을 보관고로 옮기라 재촉하자 하역대의 소원 끈이 팽팽해진다. 서류로 낙찰을 멈춰도 저 끈을 풀어야 달이 나갈 수 있다. 장부를 읽을 목소리와 벽의 시장 규칙이, 물레가 더 돌기 전에 쓸 수 있는 것들이다."
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
              "text": "빈 판매자 칸과 동의란을 앞줄부터 보여 주자 상인들이 패를 내린다. 주민들의 나루 요구도 달에게 다시 물어야 한다는 목소리가 나온다. 경매를 멈춰 세운 사람들과 하역대로 가 남은 끈을 살핀다.",
              "next": "crane",
              "set": [
                "bid_exposed",
                "free_clause",
                "market_friend"
              ],
              "pressure": -2
            },
            "success": {
              "text": "빈칸을 들어 보이며 규칙을 읽자 입찰 패들이 하나둘 내려간다. 달에게만 동의를 묻지 않을 수 없다고 상인들이 말한다. 멈춘 경매를 뒤에 두고, 실제로 달을 붙든 하역대의 끈을 풀러 간다.",
              "next": "crane",
              "set": [
                "bid_exposed",
                "free_clause"
              ]
            },
            "failure": {
              "text": "빈 동의란을 설명하는 목소리 위로 일구가 종을 친다. 더 큰 종소리에 맞춰 달을 묶은 끈이 당겨진다. 장부 앞에서 말을 마칠 틈을 잃고, 달이 옮겨지기 전에 하역대로 달려간다.",
              "next": "crane",
              "pressure": 2
            },
            "fumble": {
              "text": "일구가 종을 연달아 울리고 경비가 장부까지 가린다. 공개 요구는 끝내 객석에 닿지 못한다. 보관고 쪽으로 당겨지는 달의 끈을 보고, 더 늦기 전에 물레가 있는 하역대로 향한다.",
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
          "label": "달이 동의했는지 확인할 때까지 경매를 미루자고 한다",
          "intent": "talk",
          "target": "auctioneer",
          "stat": "wit",
          "dc": 12,
          "risk": "절차 다툼이 지면 보관고 이동이 즉시 시작된다.",
          "outcomes": {
            "critical": {
              "text": "당사자 확인 전에는 운송도 못 한다는 조항을 읽자 토끼가 증인으로 나선다. 일구는 낙찰과 하역을 모두 멈추라는 문서를 쓴다. 규칙 사본을 챙겨, 얻어 낸 작업 시간 동안 달의 끈을 풀러 간다.",
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
              "text": "확인 절차를 요구하자 토끼 문지기가 같은 규칙을 읽어 준다. 일구가 서류를 마칠 때까지 운송도 멈춘다고 적는다. 종이 위에서 얻은 시간을 쓰기 위해, 달을 묶은 하역 물레로 향한다.",
              "next": "crane",
              "set": [
                "free_clause"
              ]
            },
            "failure": {
              "text": "조항을 들어 유예를 청하지만 일구는 보관고에서 확인하겠다고 우긴다. 직원들이 운송 줄을 당기기 시작한다. 서류로 멈추지 못한 달을 놓치기 전에 하역 장치로 달려간다.",
              "next": "crane",
              "pressure": 2
            },
            "fumble": {
              "text": "일구가 예외조항을 내밀고 운송부터 하라고 지시한다. 보관고 문이 열리며 달의 끈이 더 팽팽해진다. 입씨름할 틈마저 사라져, 강 위 하역대의 물레를 직접 멈추러 간다.",
              "next": "crane",
              "pressure": 3
            }
          }
        }
      ],
      "objective": "빈칸을 공개해 입찰을 멈추거나 규칙으로 운송을 늦춘다.",
      "callbacks": [
        {
          "when": {
            "flag": "river_voice"
          },
          "text": "강가 주민들의 종이 물고기들이 단상 밑에 모여 있다. 시장 밖에도 이 결정의 당사자가 있다는 것을 보여 준다."
        },
        {
          "when": {
            "flag": "solo_quiet_promise"
          },
          "text": "대기실에 남겨 둔 달의 긴 하품이 떠오른다. 소원 하나를 더 올려놓지 않았을 때 비로소 들을 수 있었던 소리다."
        },
        {
          "when": {
            "flag": "group_moon_time"
          },
          "text": "문밖 경비의 질문을 맡았던 동안 달이 끝낸 말이 남아 있다. 값보다 먼저 그 대답을 전할 수 있다."
        }
      ],
      "summary": "사람들 앞의 장부에도 판매 동의란은 비어 있다.",
      "stakes": "경매사가 서두를수록 달을 끄는 하역 물레도 빨라진다."
    },
    "crane": {
      "id": "crane",
      "title": "하늘을 매단 밧줄",
      "chapter": 3,
      "location": "강 위 달 하역대",
      "art": 2,
      "mood": "danger",
      "text": [
        "하역 물레에는 긴 소원 끈이 겹겹이 감겼다. 무대의 유리 고리와 별개로 달을 붙드는 줄이다. 한꺼번에 끊으면 엮인 소원의 무게가 작업하는 사람들에게 쏟아진다. 난간 아래로 검은 강물이 흐른다.",
        "토끼가 긴 귀로 난간을 감는다. 기억 수선사 나비와 나룻배를 모는 담도 달려온다. 물레를 조금씩 돌리거나 감당할 소원을 나누어야 한다. 나비가 기억 실을 걸 자리를 짚는 동안, 달은 묶인 채 일행의 손을 바라본다."
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
              "text": "물레의 박자를 맞춰 돌리자 소원들이 한 가닥씩 주인에게 돌아간다. 엉킨 약속까지 풀려 팔아넘길 고리가 사라지고 경매장의 소란도 낮아진다. 가벼워진 달이 나루에 내려와 다음 길을 기다린다.",
              "next": "council",
              "set": [
                "free_clause",
                "repair_helped"
              ],
              "pressure": -2
            },
            "success": {
              "text": "장력에 맞춰 물레를 조금씩 돌리자 소원들이 제 주인 쪽으로 풀려 간다. 달은 점점 작고 가벼운 빛이 된다. 마지막 끈을 놓고 나루로 내려가니 그가 빈 의자에 먼저 앉아 있다.",
              "next": "council"
            },
            "failure": {
              "text": "물레가 거꾸로 튀어 일행을 차가운 강으로 끌어당긴다. 달이 끈에서 벗어나는 사이 토끼가 귀를 길게 펼친다. 그 끝을 붙들고 기어 올라 나루에 닿자, 먼저 내려온 달이 빈 의자 곁에서 기다린다.",
              "next": "council",
              "pressure": 2,
              "harmAll": 1
            },
            "fumble": {
              "text": "역회전한 물레가 난간째 감겨 일행을 깊은 물속으로 끌어들인다. 달은 풀렸지만 모두 크게 다친다. 토끼의 귀를 붙잡고 담의 배에 오른 뒤, 그가 붙여 준 나루에서 달과 다시 마주한다.",
              "next": "council",
              "harmAll": 2,
              "pressure": 3
            }
          }
        },
        {
          "id": "share-weight",
          "label": "밥 한 끼처럼 감당할 소원을 맡아 끈의 무게를 나눈다",
          "intent": "help",
          "target": "rope",
          "stat": "heart",
          "dc": 12,
          "risk": "실패하면 행동한 사람이 소원 무게에 눌려 생명 3을 잃는다. 대실패는 같은 피해에 더해 다른 동료도 생명 1을 잃는다. 기억 실을 쓰는 안전한 방법도 있다.",
          "outcomes": {
            "critical": {
              "text": "편지 한 장, 밤길 한 번처럼 지킬 수 있는 약속만 골라 나눈다. 상인들도 끈을 받아 들자 달이 남은 소원은 자기 의무가 아니라고 말한다. 느슨해진 줄 끝에서 그가 나루로 내려와 다음 길을 함께 묻는다.",
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
              "text": "밥 한 끼와 짧은 동행처럼 할 수 있는 몫을 말하며 끈을 나눈다. 옆의 상인들도 하나씩 받아 든다. 달을 붙잡던 무게가 느슨해지고, 그가 내려선 나루의 빈 의자 곁으로 모인다.",
              "next": "council",
              "set": [
                "market_friend"
              ]
            },
            "failure": {
              "text": "작은 몫을 고르려는 손 위로 풀리지 않은 소원들이 한꺼번에 쏟아진다. 이름이 눌리고 숨이 끊긴 뒤에야 상인들이 끈을 나누어 달을 내린다. 나루에서 그 이름을 다시 불러 줄 살아 있는 동료가 필요하다.",
              "next": "council",
              "pressure": 1,
              "harm": 3
            },
            "fumble": {
              "text": "나누려던 끈의 매듭이 풀리지 않아 소원들이 한 이름을 짓누른다. 그 아래에서 숨이 멎고 되튄 줄은 동료들까지 다치게 한다. 상인들이 달을 내린 나루에는 살아남은 일행만 돌아와 이름을 부를 수 있다.",
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
              "text": "나비와 기억 실을 난간에 걸자 나누기로 한 작은 기억들이 무게를 받는다. 천천히 풀어 다친 사람 없이 달을 내리지만 경매장의 눈길은 오래 머문다. 나루에 닿자 역할을 마친 실은 풀려 제 주인에게 돌아간다.",
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
      "objective": "물레를 천천히 풀거나 감당할 소원을 나누어 달을 내린다.",
      "callbacks": [
        {
          "when": {
            "flag": "repair_helped"
          },
          "text": "수선사는 당신들이 정리해 둔 기억의 실을 가져왔다. 소원 끈이 풀리는 동안 새 길의 기초를 엮을 수 있다."
        }
      ],
      "summary": "사람들의 소원이 엮인 끈이 달을 하역대에 붙들고 있다.",
      "stakes": "끈에 끌려 강에 빠지거나 그 무게에 짓눌릴 수 있다. 기억 실은 안전줄로 쓸 수 있다."
    },
    "council": {
      "id": "council",
      "title": "달은 누구의 것도 아니라고",
      "chapter": 4,
      "location": "동트기 전 공동 나루",
      "art": 3,
      "mood": "calm",
      "text": [
        "끈에서 벗어난 달이 나루의 빈 의자에 내려앉는다. 수집가의 대리인이 거래 이야기를 꺼내자 달이 고개를 젓는다. “다시 매달리지는 않을 거야.” 토끼와 상인들이 더 말하지 않고 다음 대답을 기다린다.",
        "강에는 상인들의 배가, 위에는 넓은 하늘이 있다. 달은 함께 여행해도 좋고 혼자 쉬어도 좋겠다고 한다. 앞서 이름까지 함께 정한 나루라면 머물 약속도 남아 있다. 달이 묻는다. “너희는 어느 길을 함께해 줄래?”"
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
          "label": "달이 동의한 「달잠 나루」를 공동으로 지킨다",
          "intent": "choose",
          "target": "landing",
          "automatic": true,
          "outcomes": {
            "success": {
              "text": "달이 고른 이름 아래 소유주 대신 관리 당번을 적는다. 토끼가 펜을 돌리고 상인들이 자기 차례를 남긴다. 의자에 등을 기댄 달은 소원이 들려오지 않는지 잠깐 귀를 기울이다 눈을 감는다.",
              "next": "ending-landing"
            }
          },
          "requires": {
            "flag": "joint_name"
          },
          "lockedHint": "달의 대기실에서 주민들의 요구서를 보여 주고 「달잠 나루」라는 이름에 함께 합의해야 한다."
        },
        {
          "id": "travel-market",
          "label": "달과 상인들이 함께 떠나는 이동 시장을 만든다",
          "intent": "choose",
          "target": "anchor",
          "automatic": true,
          "outcomes": {
            "success": {
              "text": "함께 여행하자는 제안에 달이 상인들의 배를 살핀다. 가게들이 짐을 꾸리는 동안 강가 주민들에게 다음 방문 날짜를 남긴다. 달이 빈 의자를 골라 앉자, 한곳에 묶이지 않을 시장의 닻이 움직인다.",
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
              "text": "모든 소원을 맡지 않아도 된다고 말하자 달이 하늘을 올려다본다. 나루에서는 빈 등불에 하나씩 기름을 채운다. 그 불이 켜지는 것을 본 달이 고개를 끄덕이고, 아무 끈도 없는 쪽으로 떠오른다.",
              "next": "ending-sky"
            }
          }
        }
      ],
      "objective": "함께 정한 나루를 지키거나 시장과 여행하거나 하늘로 보내 준다.",
      "callbacks": [
        {
          "when": {
            "flag": "free_clause"
          },
          "text": "시장 장부의 첫 장에 새 문장이 적힌다. 「생각하는 존재의 침묵은 판매 동의가 아니다.」"
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
      "summary": "달이 끈에서 풀려나 스스로 머물거나 떠날 수 있게 됐다.",
      "stakes": "공동 나루는 주민 편지를 보여 주고 달과 이름을 정한 경우에만 고를 수 있다."
    },
    "ending-landing": {
      "id": "ending-landing",
      "title": "달이 잠든 나루",
      "chapter": 4,
      "art": 3,
      "mood": "hope",
      "ending": true,
      "text": [
        "「달잠 나루」의 표지판에는 주인 이름이 없다. 배를 돌볼 사람과 등불에 기름을 채울 사람의 차례만 적힌다. 달이 깊이 잠든 밤에는 누군가 조용히 불을 밝힌다. 깨우러 오는 사람은 없다.",
        "야시장에서는 여전히 이상한 물건을 판다. 다만 입구의 토끼가 동의를 물을 때 조금 더 기다린다. 돌아가는 길에 내민 동전도 접지 않는다. “오늘 통행료는 받았어요.” 종이 귀가 접혔다 펴진다. “다음에 만날 이유요.”"
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
        },
        {
          "when": {
            "flag": "solo_story_credit"
          },
          "text": "토끼의 장부에는 「돌아오는 길에 들을 이야기」라는 칸이 남는다. 아직 겪지 않은 밤을 값으로 받았던 문지기는 그 페이지를 접지 않는다."
        },
        {
          "when": {
            "flag": "group_bridge_lamp"
          },
          "text": "고친 등불은 다음 손님들의 발판도 비춘다. 토끼는 통행료를 세다가 가끔 그 불을 보고, 돈 대신 받은 수고를 떠올린다."
        },
        {
          "when": {
            "flag": "solo_quiet_promise"
          },
          "text": "달은 이번 밤에 부탁을 하나 덜 받은 일을 기억한다. 누군가 이루어 달라 하지 않은 짧은 시간이, 오래 기다린 잠의 첫머리가 되었다."
        },
        {
          "when": {
            "flag": "group_moon_time"
          },
          "text": "대기실 문턱에서 질문을 맡아 준 사람이 있어 달은 자기 말을 끝낼 수 있었다. 그는 그날을 망치 소리보다 끝까지 말한 문장으로 기억한다."
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
        "닻이 올라가자 등불 다리가 배의 난간이 된다. 흔들리는 노점 사이에서 달은 선장 자리 대신 빈 의자를 고른다. 다음 나루에 얼마나 머물지는 도착해서 함께 정하기로 했다.",
        "강가에는 정박표와 오래 쓸 등불이 남는다. 배를 미는 사람과 줄을 풀어 주는 사람이 다음 방문 날짜를 맞춘다. 일행을 위해 남겨 둔 단골 카드에는 주소 대신 「다음에 만나는 곳」이라는 빈칸이 생긴다."
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
        },
        {
          "when": {
            "flag": "solo_story_credit"
          },
          "text": "토끼의 장부에는 「돌아오는 길에 들을 이야기」라는 칸이 남는다. 아직 겪지 않은 밤을 값으로 받았던 문지기는 그 페이지를 접지 않는다."
        },
        {
          "when": {
            "flag": "group_bridge_lamp"
          },
          "text": "고친 등불은 다음 손님들의 발판도 비춘다. 토끼는 통행료를 세다가 가끔 그 불을 보고, 돈 대신 받은 수고를 떠올린다."
        },
        {
          "when": {
            "flag": "solo_quiet_promise"
          },
          "text": "달은 이번 밤에 부탁을 하나 덜 받은 일을 기억한다. 누군가 이루어 달라 하지 않은 짧은 시간이, 오래 기다린 잠의 첫머리가 되었다."
        },
        {
          "when": {
            "flag": "group_moon_time"
          },
          "text": "대기실 문턱에서 질문을 맡아 준 사람이 있어 달은 자기 말을 끝낼 수 있었다. 그는 그날을 망치 소리보다 끝까지 말한 문장으로 기억한다."
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
        "달은 어느 계약서에도 이름을 남기지 않고 하늘로 오른다. 오늘 밤의 소원이 모두 이루어지지는 않는다. 달빛이 닿지 않는 강굽이에 사람들이 등불을 세우고, 건너올 사람의 이름을 부른다.",
        "야시장은 조금 작고 느려진다. 마법이 하던 일을 하느라 상인들이 서로의 가게를 오간다. 머리 위에서 달이 긴 하품을 한다. 누군가 소원을 빌다 멈추고, 대신 옆 사람의 등불에 불을 나누어 준다."
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
        },
        {
          "when": {
            "flag": "solo_story_credit"
          },
          "text": "토끼의 장부에는 「돌아오는 길에 들을 이야기」라는 칸이 남는다. 아직 겪지 않은 밤을 값으로 받았던 문지기는 그 페이지를 접지 않는다."
        },
        {
          "when": {
            "flag": "group_bridge_lamp"
          },
          "text": "고친 등불은 다음 손님들의 발판도 비춘다. 토끼는 통행료를 세다가 가끔 그 불을 보고, 돈 대신 받은 수고를 떠올린다."
        },
        {
          "when": {
            "flag": "solo_quiet_promise"
          },
          "text": "달은 이번 밤에 부탁을 하나 덜 받은 일을 기억한다. 누군가 이루어 달라 하지 않은 짧은 시간이, 오래 기다린 잠의 첫머리가 되었다."
        },
        {
          "when": {
            "flag": "group_moon_time"
          },
          "text": "대기실 문턱에서 질문을 맡아 준 사람이 있어 달은 자기 말을 끝낼 수 있었다. 그는 그날을 망치 소리보다 끝까지 말한 문장으로 기억한다."
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
      "마지막 숨이 끊기자 토끼의 통행 장부에서 잉크가 번진다. 이름과 기억을 불러 줄 살아 있는 동료가 있어야 이 시장의 죽음을 건널 수 있다. 토끼가 귀를 세워도 이번에는 아무 대답이 없다.",
      "강물에는 멀리 경매장의 불빛이 비친다. 남긴 기록이나 지키려던 등불이 다른 누군가에게 닿을 수는 있다. 그 불을 보러 돌아올 일행은 없다. 나루지기 담이 번진 이름들을 말없이 읽고, 물가에 빈 의자를 놓는다."
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
  },
  "playModes": {
    "solo": "혼자라면 아직 겪지 않은 오늘의 이야기를 외상으로 맡기거나, 자기 소원을 쉬게 하겠다고 약속할 수 있습니다.",
    "group": "여럿이라면 다리의 등불을 고치거나 경비 앞에 서서 동료들과 달이 만날 시간을 벌 수 있습니다."
  }
};
export default campaign;
