// Original authored scenario for Chronicle Gate v18.
// Stable v17 graph and rules; short literary scenes and consequences.
const campaign = {
  "id": "last-train",
  "title": "막차의 일곱 번째 승객",
  "subtitle": "여섯 사람이 탔는데, 일곱 번째 하차 벨이 울린다.",
  "genre": "도시 괴담 · 협상 추리",
  "accent": "#c28b67",
  "description": "막차의 단체 표에는 일곱 명이 적혔지만 눈앞의 승객은 여섯이다. 빈자리에서 수저 소리가 나고, 오래전에 사라진 동네가 차창에 비친다. 보이지 않는 승객을 찾아 오늘의 손님들을 집으로 보내야 한다. 기다리던 사람들에게도 내릴 자리를 만들어 줄 수 있을까?",
  "estimatedMinutes": "35–60",
  "contentNotes": [
    "실종",
    "재난의 기억",
    "가벼운 공포"
  ],
  "objective": "일곱 번째 승객이 누구인지 알아내고, 막차를 어디에 세울지 고른다.",
  "art": "last-train",
  "pressureLabel": "철도 관제의 경계",
  "pressureMax": 8,
  "start": "platform",
  "roles": [
    {
      "title": "마지막 배달",
      "secret": "배달 앱이 사라진 모래역으로 도시락 한 개를 보내라고 했다. 주문자 이름은 열두 살 때 헤어진 친구의 이름이다.",
      "goal": "도시락을 주문한 사람을 알아내고 배달 완료를 직접 결정한다.",
      "reveal": "이 도시락의 수령지는 폐역인 모래역이에요. 주문한 사람을 저는 알고 있어요.",
      "epilogues": [
        {
          "when": {
            "flag": "meal_shared"
          },
          "text": "마지막 배달의 수령란에는 한 사람 대신 «모래역 일동»이 남는다. 함께 나눈 도시락이 주문의 뜻을 완성했다."
        },
        {
          "when": {
            "notFlag": "meal_shared"
          },
          "text": "배달 앱의 미완료 주문은 남았다. 배달자는 왜 그 많은 수저가 필요했는지 다음 방문에서 물어볼 생각이다."
        }
      ],
      "deadEpilogue": "마지막 배달자의 주문 기록에는 평범한 도시락을 들고 낯선 사람들에게 다가갔던 흔적이 남는다. 남은 사람들이 배달의 마지막 답을 기억한다."
    },
    {
      "title": "표를 고친 사람",
      "secret": "당신은 교통 앱 직원이다. 회사 지시로 모래역의 이름을 노선도에서 지웠다. 오류 메시지에는 역이 아니라 «귀가 중인 승객»이라고 적혔다.",
      "goal": "삭제된 이름을 공개할지, 사람들의 귀가를 위해 숨길지 결정한다.",
      "reveal": "모래역을 노선도에서 지운 사람이 저예요. 삭제한 뒤부터 승객 숫자가 틀어졌어요.",
      "epilogues": [
        {
          "when": {
            "flag": "broadcast"
          },
          "text": "노선도에서 이름을 지웠던 사람은 이번에는 삭제의 흔적까지 공개 기록에 남긴다. 실수의 책임을 숨기지 않고 고치는 일을 시작한다."
        },
        {
          "when": {
            "notFlag": "broadcast"
          },
          "text": "삭제 담당자는 사라진 이름을 자기 수첩에 먼저 복원한다. 공개할 용기를 내는 일은 아직 남아 있다."
        }
      ],
      "deadEpilogue": "노선도를 고쳤던 사람의 빈자리는 삭제한 것을 다시 질문해야 한다는 과제가 된다. 그 이름마저 오류 처리되지 않도록 장부에 남긴다."
    },
    {
      "title": "남은 안내 방송",
      "secret": "지금 차장의 목소리는 당신이 돌아가신 어머니의 전화기에 남겨 둔 인사와 같다. 철도는 목소리를 빌리고 있는 것 같다.",
      "goal": "목소리의 원본을 확인하되, 차장을 가족이라고 단정하지 않는다.",
      "reveal": "차장이 제 가족의 목소리로 말해요. 하지만 같은 목소리라고 같은 사람은 아니겠죠.",
      "epilogues": [
        {
          "when": {
            "flag": "trusted"
          },
          "text": "차장은 빌린 목소리의 주인을 다시 흉내 내지 않기로 한다. 남겨진 인사를 지키면서도 새로 만난 사람을 구분할 수 있게 됐다."
        },
        {
          "when": {
            "notFlag": "trusted"
          },
          "text": "낯익은 목소리를 들었던 사람은 전화기의 오래된 인사를 다시 듣는다. 그 말의 주인과 차장의 역할이 같지는 않았음을 받아들인다."
        }
      ],
      "deadEpilogue": "가족의 목소리를 알아보았던 사람이 떠난 뒤, 그 인사는 누군가를 속일 도구가 아니라 함께 들었던 기억으로 남는다."
    },
    {
      "title": "접히지 않는 지도",
      "secret": "철도박물관 자원봉사자로 일하며 모래역의 수동 분기표를 챙겼다. 정식 운행보다 오래된 «임시 정차» 규정이 있다는 것만 기억한다.",
      "goal": "살아 있는 승객과 지워진 역이 함께 갈 방법을 찾아본다.",
      "reveal": "낡은 규정에 임시 정차가 있었어요. 노선도 밖이라고 전부 버릴 필요는 없을지도 몰라요.",
      "epilogues": [
        {
          "when": {
            "flag": "signed"
          },
          "text": "지도 보관자는 주민들이 직접 정한 새 이름을 지도 여백에 적는다. 선 하나를 복구한 것이 아니라 행선지를 정할 권리를 함께 지켰다."
        },
        {
          "when": {
            "notFlag": "signed"
          },
          "text": "지도 보관자는 빈 0번선 옆에 물음표를 남긴다. 다음번에는 먼저 그 길을 쓸 사람에게 이름을 물어야겠다고 적는다."
        }
      ],
      "deadEpilogue": "지도를 챙겨 왔던 사람의 역할은 끝나지 않은 길 옆에 작은 이름표로 남는다. 다음 증인이 그 여백을 이어 읽을 수 있다."
    }
  ],
  "clues": {
    "ticket": {
      "title": "검표되지 않는 표",
      "text": "행선지는 모래역, 승객명은 «모래역 일동». 한 사람의 이름이 아니다."
    },
    "roster": {
      "title": "차내 인원표",
      "text": "센서는 일곱을 세지만 좌석에는 여섯 그림자만 있다. 일곱 번째 체온은 열차 바닥 전체에서 측정된다."
    },
    "paper": {
      "title": "폐역 신문",
      "text": "모래역이 폐쇄된 날 주민들은 대피 열차를 기다렸다. 신문은 구조 완료라고 적었지만 마지막 명단이 비어 있다."
    },
    "parcel": {
      "title": "도시락 영수증",
      "text": "주문은 오늘 저녁에 접수됐다. 요청 사항: «다 같이 나눠 먹을 수 있게 수저를 많이 주세요.»"
    },
    "ledger": {
      "title": "미완료 귀가 장부",
      "text": "열차는 사람을 납치하는 것이 아니라 끝내 접수되지 않은 귀가 요청을 수행한다. 모래역 주민의 요청은 한 묶음이다."
    },
    "map": {
      "title": "수동 분기 지도",
      "text": "강 위의 정비 다리에는 «임시 정차 0번선»이 남아 있다. 정규 노선을 벗어나도 살아 있는 승객을 하차시킬 수 있다."
    },
    "protocol": {
      "title": "임시 정차 규정",
      "text": "주민 대표가 행선지를 말하고 살아 있는 증인이 서명하면, 폐역도 새 이름으로 임시 정차를 신청할 수 있다."
    },
    "testimony": {
      "title": "모래역의 진술",
      "text": "일곱 번째 승객은 역의 기억을 묶은 존재다. 주민들은 죽음을 취소해 달라는 것이 아니라, 자신들이 기다렸다는 사실을 남겨 달라고 한다."
    }
  },
  "flags": {
    "trusted": "차장 윤이 파티를 믿는다",
    "meal_shared": "기다리던 주민들과 도시락을 나눴다",
    "crew_helped": "정비원이 파티를 돕는다",
    "signal_open": "수동 분기 신호를 확보했다",
    "broadcast": "모래역의 기록을 관제에 보냈다",
    "signed": "모래역 주민 대표의 동의를 받았다",
    "brake_safe": "비상 제동 장치를 보존했다",
    "names_kept": "사라진 주민 이름을 기록했다",
    "solo_heard_ticket": "홀로 표의 이름을 불러, 보이지 않는 승객의 응답을 들었다",
    "group_held_door": "동료들이 조사할 틈을 위해 닫히는 객차 문을 붙들었다",
    "solo_promised_return": "주민 대표에게 다음 막차에도 찾아오겠다고 약속했다",
    "group_lit_way": "주민의 이름과 동료의 통로를 비출 비상등을 고쳤다"
  },
  "nodes": {
    "platform": {
      "id": "platform",
      "title": "표에 찍힌 것은 사람 이름이 아니었다",
      "chapter": 1,
      "location": "비 내리는 종점 승강장",
      "art": 0,
      "mood": "mystery",
      "text": [
        "막차 문턱에서 차장 윤의 검표기가 짧게 운다. “여섯 분인데, 표에는 일곱 분입니다.” 먼저 탄 단체 손님들이 서로의 얼굴을 센다. 뒤에서 탑승을 기다리던 일행에게도 윤이 고개를 숙인다. 보이지 않는 한 사람을 찾아 달라는 부탁이다.",
        "노란 안전선 아래로 낡은 표가 미끄러져 나온다. 승객명은 «모래역 일동». 오래전에 사라진 역으로 가는 표인데 발행일은 오늘이다. 윤의 손에는 같은 모양의 표가, 매점 유리창에는 철거 전의 노선도가 남아 있다."
      ],
      "entities": [
        {
          "id": "conductor",
          "label": "차장 윤",
          "kind": "person",
          "aliases": [
            "차장",
            "윤"
          ]
        },
        {
          "id": "ticket",
          "label": "젖은 승차권",
          "kind": "object",
          "aliases": [
            "표",
            "승차권"
          ]
        },
        {
          "id": "kiosk",
          "label": "폐점한 매점",
          "kind": "place",
          "aliases": [
            "매점"
          ]
        },
        {
          "id": "carriage",
          "label": "열차 문",
          "kind": "place",
          "aliases": [
            "문",
            "열차"
          ]
        }
      ],
      "choices": [
        {
          "id": "question",
          "label": "차장에게 일곱 번째 승객의 표를 보여 달라고 한다",
          "intent": "talk",
          "target": "conductor",
          "stat": "heart",
          "dc": 10,
          "risk": "차장이 시간을 끌면 관제에 이상 승차가 보고된다.",
          "outcomes": {
            "critical": {
              "text": "표 옆의 누락 신고서까지 짚자 윤이 같은 단체명을 찾아낸다. 관제에 오인 신고를 거둔 그는 메모를 기다렸다가 “안에서 승객들을 보시죠”라며 문을 잡는다. 접은 메모를 챙겨 객차에 오른다.",
              "next": "carriage",
              "clues": [
                "ticket",
                "roster"
              ],
              "gainItems": [
                "ticket-note"
              ],
              "set": [
                "trusted"
              ],
              "pressure": -1
            },
            "success": {
              "text": "윤이 표의 빈칸을 가렸던 손을 치우자 «모래역 일동»이 보인다. 이름을 메모하는 동안 그는 “직접 타 보시면 알 겁니다”라며 객차 문을 붙든다. 문이 닫히기 전에 안으로 들어선다.",
              "next": "carriage",
              "clues": [
                "ticket"
              ],
              "set": [
                "trusted"
              ],
              "gainItems": [
                "ticket-note"
              ]
            },
            "failure": {
              "text": "표를 청하자 윤이 감추려다 매점 검표기에 부딪친다. 긴 영수증이 쏟아지고 관제 호출음이 난다. 그가 같은 기록이 뽑혔겠다며 종이를 주우러 가자, 일행도 따라 매점 문을 연다.",
              "next": "kiosk",
              "pressure": 1
            },
            "fumble": {
              "text": "표를 받으려던 손이 비상 호출에 닿아 관제에서 무단 승차 경고가 온다. 윤이 같은 기록은 매점에도 있다며 그쪽을 가리킨다. 그가 무전으로 설명하는 동안 일행은 바로 옆 매점으로 들어간다.",
              "next": "kiosk",
              "pressure": 3
            }
          }
        },
        {
          "id": "kiosk",
          "label": "매점의 옛 노선도부터 확인한다",
          "intent": "choose",
          "target": "kiosk",
          "automatic": true,
          "outcomes": {
            "success": {
              "text": "빗물을 털며 매점 처마 안으로 들어선다. 윤의 검표기는 뒤에서 다시 울리고, 유리창 안의 옛 노선도에는 오늘의 전광판에서 찾을 수 없는 역 이름이 희미하게 비친다.",
              "next": "kiosk"
            }
          }
        },
        {
          "id": "solo-call-ticket",
          "label": "표의 이름을 작은 소리로 불러, 빈 문 안에 누가 있는지 묻는다",
          "intent": "talk",
          "target": "ticket",
          "stat": "heart",
          "dc": 11,
          "requires": {
            "partyMax": 1
          },
          "risk": "응답을 듣지 못하면 매점에서 다시 찾아야 한다. 대실패하면 검표기가 허위 호출 경보를 보낸다.",
          "outcomes": {
            "critical": {
              "text": "«모래역 일동»을 부르자 빈 바닥에서 수저 소리와 스물아홉 발자국이 겹친다. 윤도 듣고 오인 신고를 거두며 표를 베끼게 해 준다. 그의 안내로 객차에 올라, 응답이 난 자리로 간다.",
              "next": "carriage",
              "set": [
                "solo_heard_ticket",
                "trusted"
              ],
              "clues": [
                "ticket",
                "roster"
              ],
              "gainItems": [
                "ticket-note"
              ],
              "pressure": -1
            },
            "success": {
              "text": "표의 이름을 부르자 문 안에서 바닥을 두드리는 대답이 난다. 윤이 표를 메모하게 해 주고, 안에서 소리를 확인하자며 문을 붙든다. 혼자 표를 접어 들고 객차에 오른다.",
              "next": "carriage",
              "set": [
                "solo_heard_ticket"
              ],
              "clues": [
                "ticket"
              ],
              "gainItems": [
                "ticket-note"
              ]
            },
            "failure": {
              "text": "빈칸을 향해 몇 번 불러도 검표기의 재촉만 돌아온다. 윤이 매점의 옛 기록에 그 이름이 있을지 모른다고 한다. 아직 열차에는 타지 않고, 표를 접어 바로 옆 매점으로 들어간다.",
              "next": "kiosk",
              "pressure": 1
            },
            "fumble": {
              "text": "소리를 듣겠다고 표를 검표기에 가까이 대자 허위 호출 경보가 켜진다. 윤이 관제와 통화하며 매점 기록부터 보라고 손짓한다. 대답 대신 경고음을 등지고 매점 문을 연다.",
              "next": "kiosk",
              "pressure": 3
            }
          }
        },
        {
          "id": "group-hold-door",
          "label": "동료들이 살필 시간을 벌도록 닫히는 객차 문을 붙든다",
          "intent": "help",
          "target": "carriage",
          "stat": "might",
          "dc": 11,
          "requires": {
            "partyMin": 2,
            "aliveMin": 2
          },
          "risk": "문이 튕겨 닫히면 실패 시 행동자 생명 1, 대실패 시 생명 2를 잃는다. 매점 연결 통로로 다시 갈 수 있다.",
          "outcomes": {
            "critical": {
              "text": "문을 붙들고 윤에게 다시 세어 달라고 하자 빈 바닥까지 체온을 내보낸다. 윤이 경보를 늦추고 단체 표를 베껴 주며 안에서 확인하라 한다. 열린 문으로 일행이 탄 뒤 마지막에 손을 뗀다.",
              "next": "carriage",
              "set": [
                "group_held_door",
                "trusted"
              ],
              "clues": [
                "ticket",
                "roster"
              ],
              "gainItems": [
                "ticket-note"
              ],
              "pressure": -1
            },
            "success": {
              "text": "닫히는 문을 버티자 윤이 수동 잠금을 걸어 시간을 번다. 그는 안에서 승객을 다시 보자며 통로를 비킨다. 동료들이 들어갈 자리를 지킨 뒤 객차에 올라 손바닥의 문 자국을 편다.",
              "next": "carriage",
              "set": [
                "group_held_door",
                "trusted"
              ],
              "pressure": -1
            },
            "failure": {
              "text": "문이 되튀어 팔을 친다. 윤이 출입을 멈추고 매점까지 늘어난 연결 통로를 가리키며 그쪽에서 먼저 살펴보라 한다. 다친 팔을 감싼 채 일행과 매점으로 물러난다.",
              "next": "kiosk",
              "harm": 1,
              "pressure": 1
            },
            "fumble": {
              "text": "잠금이 걸린 문에 팔이 끼고 비상 호출까지 울린다. 윤이 문을 풀어 주지만 심하게 다쳐 바로 타기는 어렵다. 팔을 감싸고 일행과 옆 매점으로 물러나, 윤이 가리킨 다른 연결 통로를 찾는다.",
              "next": "kiosk",
              "harm": 2,
              "pressure": 3
            }
          }
        }
      ],
      "dialogue": {
        "who": "차장 윤",
        "text": "사람을 셀 때는 이름부터 확인하십시오. 얼굴은 가끔 틀립니다."
      },
      "objective": "표의 이름을 묻거나 매점에 남은 옛 노선도를 본다.",
      "details": [
        {
          "id": "read-ticket",
          "label": "떨어진 표를 읽고 승객명을 메모한다",
          "text": "한 장의 표에 «모래역 일동»이라는 단체명이 적혀 있다. 발행 일시는 오늘이다.",
          "clue": "ticket",
          "gainItems": [
            "ticket-note"
          ]
        }
      ],
      "summary": "표에는 일곱 명인데 먼저 탄 단체 손님은 여섯 명뿐이다.",
      "stakes": "조사가 소란스러워지면 관제가 일행을 수상하게 여긴다.",
      "partyText": {
        "solo": [
          "막차를 혼자 기다리는데 차장 윤이 먼저 탄 단체 손님을 다시 센다. 여섯 사람, 일곱 명이라고 찍힌 단체 표. 그가 빈 문턱을 보다가 이쪽에 부탁한다. “혹시 뒤에 한 분 더 오는 걸 보셨습니까?” 아직 발은 승강장에 있다.",
          "안전선 아래로 밀려온 표에는 «모래역 일동»이라고 적혔다. 오래전에 폐쇄된 역으로 오늘 발행한 표다. 이름을 작게 읽으면 누구도 서 있지 않은 문 안에서 바닥이 한 번 운다. 윤의 기록과 옆 매점의 옛 노선도도 답을 기다린다."
        ],
        "group": [
          "일행이 막차에 오르려는데 차장 윤이 먼저 탄 단체 손님들 앞을 막는다. 그쪽 표에는 일곱 명, 보이는 사람은 여섯 명이다. 윤은 뒤의 일행에게도 못 본 손님이 있는지 묻는다. 객차 문은 천천히 닫히려 한다.",
          "아직 타지 않은 발끝으로 낡은 표가 밀려온다. 승객명은 «모래역 일동», 발행일은 오늘이다. 누군가 문을 붙들면 더 살필 시간이 생길 듯하다. 바로 옆 매점 유리에는 폐쇄 전 노선도가 비친다. 윤은 문과 표 사이에서 결정을 기다린다."
        ]
      }
    },
    "carriage": {
      "id": "carriage",
      "title": "바닥에서 뛰는 심장",
      "chapter": 1,
      "location": "마지막 객차",
      "art": 1,
      "mood": "mystery",
      "text": [
        "문이 닫히고 막차가 승강장을 빠져나가 터널로 들어선다. 먼저 탄 여섯 사람 위에 좌석 표시등 일곱 개가 켜져 있다. 통로를 걸으면 바닥의 느린 고동도 따라온다. 검은 창에는 볕 든 동네 가게들이 비친다.",
        "학생이 도시락 뚜껑을 연다. 빈자리에서 젓가락 소리가 나자 그의 손이 멈춘다. 윤은 종이 인원표와 센서 화면을 번갈아 본다. “고장이면 좋겠는데요. 제가 세는 단위가 틀린 거라면…….”"
      ],
      "entities": [
        {
          "id": "student",
          "label": "도시락을 든 학생",
          "kind": "person",
          "aliases": [
            "학생"
          ]
        },
        {
          "id": "sensor",
          "label": "승객 센서",
          "kind": "object",
          "aliases": [
            "센서",
            "인원표"
          ]
        },
        {
          "id": "dining",
          "label": "식당 칸",
          "kind": "place",
          "aliases": [
            "식당"
          ]
        },
        {
          "id": "baggage",
          "label": "화물 보관칸",
          "kind": "place",
          "aliases": [
            "화물칸"
          ]
        }
      ],
      "choices": [
        {
          "id": "sensor-check",
          "label": "센서가 사람 대신 무엇을 세는지 비교한다",
          "intent": "investigate",
          "target": "sensor",
          "stat": "wit",
          "dc": 11,
          "risk": "진단 중 관제에 비정상 체온 신호가 전달된다.",
          "outcomes": {
            "critical": {
              "text": "좌석과 바닥의 체온을 나누니 화물칸 분실물 번호가 떠오른다. 윤도 측정 오류가 아님을 받아들이고 단체 표를 메모하게 해 준다. 그 번호가 가리킨 물건을 보러 객차 뒤편 화물칸에 들어간다.",
              "next": "baggage",
              "clues": [
                "roster",
                "ticket"
              ],
              "set": [
                "trusted"
              ],
              "gainItems": [
                "ticket-note"
              ]
            },
            "success": {
              "text": "센서를 바닥으로 돌리자 일곱 번째 체온이 객차 전체에 퍼진다. 신호는 통로 끝의 화물칸 아래까지 이어져 있다. 빈 좌석을 떠나 그 선을 따라 걸어가, 화물칸 문을 연다.",
              "next": "baggage",
              "clues": [
                "roster"
              ]
            },
            "failure": {
              "text": "진단 버튼에서 경고음이 나자 학생이 놀라 도시락을 쏟는다. 빈자리의 그림자들이 식당 쪽으로 움직인다. 잠긴 센서 대신 그 흔적을 따라가니, 식당 문 안에서 수저 소리가 난다.",
              "next": "dining",
              "pressure": 1
            },
            "fumble": {
              "text": "진단 창 대신 침입 경보가 켜져 윤이 센서를 잠근다. 식당 쪽 수저 소리가 커지자 학생이 다른 흔적도 있다며 도시락을 안고 앞장선다. 그를 따라 객차 사이 문을 지나 식당에 들어간다.",
              "next": "dining",
              "pressure": 3
            }
          }
        },
        {
          "id": "share-meal",
          "label": "학생과 도시락을 들고 식당 칸으로 간다",
          "intent": "choose",
          "target": "student",
          "automatic": true,
          "outcomes": {
            "success": {
              "text": "도시락을 들어 주고 여분의 수저 하나를 챙기자 학생이 가방에서 다섯 개를 더 꺼낸다. 그의 가방에서는 아직 수저가 부딪친다. 함께 통로를 걸어 식당 문을 밀자 빈 의자들이 보인다.",
              "next": "dining"
            }
          }
        }
      ],
      "objective": "센서의 신호를 따라가거나 도시락을 든 학생과 식당으로 간다.",
      "details": [
        {
          "id": "empty-seat",
          "label": "빈 좌석의 승객 표시를 확인한다",
          "text": "빈 좌석은 오류가 아니다. 일곱 번째 체온은 열차 바닥 전체에 퍼져 있다.",
          "clue": "roster"
        }
      ],
      "summary": "빈자리의 표시등이 켜지고 객차 바닥에서 일곱 번째 체온이 잡힌다.",
      "stakes": "센서를 잘못 만지면 경보가 울린다. 학생을 따라가는 길도 남아 있다.",
      "callbacks": [
        {
          "when": {
            "flag": "solo_heard_ticket"
          },
          "text": "빈 바닥이 다시 한 번 운다. 승강장에서 혼자 이름을 불렀을 때 들은 바로 그 박자다."
        },
        {
          "when": {
            "flag": "group_held_door"
          },
          "text": "윤이 방금 붙들어 준 문을 돌아보고 수동 잠금을 한 번 더 확인한다. 일행 뒤로는 서둘러 닫히는 소리가 나지 않는다."
        }
      ]
    },
    "kiosk": {
      "id": "kiosk",
      "title": "폐역 신문은 아직 축축했다",
      "chapter": 1,
      "location": "승강장 매점과 검표기",
      "art": 0,
      "mood": "calm",
      "text": [
        "매점 문을 밀자 열차의 마지막 연결 통로가 처마까지 길게 늘어난다. 출발 벨은 울리지 않는다. 유리창에 붙은 옛 신문에는 «모래역 주민 구조 완료»라고 쓰여 있다. 그 아래 연체 요금표만 오늘 날짜다.",
        "검표기가 «귀가 미완료» 영수증을 한 장 더 뱉는다. 소리를 따라 도시락을 든 학생이 연결 통로에서 다가온다. 신문 속 역 이름을 본 아이는 문고리를 놓지 않는다. “여기에도 아직 그 이름이 있네요.”"
      ],
      "entities": [
        {
          "id": "newspaper",
          "label": "폐역 신문",
          "kind": "object",
          "aliases": [
            "신문"
          ]
        },
        {
          "id": "scanner",
          "label": "연체 검표기",
          "kind": "object",
          "aliases": [
            "검표기",
            "기계"
          ]
        },
        {
          "id": "baggage",
          "label": "연결 통로",
          "kind": "place",
          "aliases": [
            "통로",
            "화물칸"
          ]
        }
      ],
      "choices": [
        {
          "id": "receipt",
          "label": "연체 영수증에서 마지막 귀가 기록을 찾는다",
          "intent": "investigate",
          "target": "scanner",
          "stat": "wit",
          "dc": 10,
          "risk": "기계가 종이를 삼키면 출입 기록도 함께 전송된다.",
          "outcomes": {
            "critical": {
              "text": "영수증의 화물 번호 밑에서 누락 명단을 찾아 단체명과 함께 베낀다. 물건을 보러 늘어난 연결 통로를 건너 화물칸에 오른다. 뒤에서 출발 벨이 울리고 막차가 천천히 움직인다.",
              "next": "baggage",
              "clues": [
                "paper",
                "ticket"
              ],
              "set": [
                "names_kept"
              ],
              "gainItems": [
                "ticket-note"
              ]
            },
            "success": {
              "text": "영수증 끝에 화물 번호와 «찾아갈 때까지 보관»이라는 글씨가 나타난다. 물건을 확인하러 늘어난 통로를 건너 열차 뒤편 화물칸에 오른다. 문이 닫히자 출발 벨이 울리고 바닥이 움직인다.",
              "next": "baggage",
              "clues": [
                "paper"
              ]
            },
            "failure": {
              "text": "귀가 기록은 끊기고 도시락 영수증만 남는다. 주문을 알아본 학생을 따라 늘어난 통로를 건너 막차 식당 칸에 오른다. 그가 식탁 쪽으로 손짓할 때 출발 벨이 울리고 열차가 움직인다.",
              "next": "dining",
              "clues": [
                "parcel"
              ],
              "pressure": 1
            },
            "fumble": {
              "text": "기록이 롤러에 빨려 들며 검표기가 얼굴을 관제에 보낸다. 남은 도시락 번호를 학생이 알아보고 식당으로 이끌어, 그와 연결 통로를 건너 막차에 탄다. 출발 벨과 함께 열차가 움직여 매점이 멀어진다.",
              "next": "dining",
              "clues": [
                "parcel"
              ],
              "pressure": 3
            }
          }
        },
        {
          "id": "newspaper",
          "label": "구조 완료 기사를 챙겨 학생에게 묻는다",
          "intent": "choose",
          "target": "newspaper",
          "automatic": true,
          "outcomes": {
            "success": {
              "text": "신문 뒷면의 도시락 그림을 본 학생이 자기 도시락과 같은지 식당에서 보자고 한다. 신문을 챙겨 그를 따라 늘어난 통로를 건너 식당 칸에 오른다. 출발 벨이 울리고 막차가 매점을 뒤로한다.",
              "next": "dining",
              "clues": [
                "paper"
              ]
            }
          }
        }
      ],
      "objective": "영수증 끝을 살피거나 신문을 보고 멈춘 학생에게 묻는다.",
      "details": [
        {
          "id": "read-paper",
          "label": "폐역 신문을 자세히 읽는다",
          "text": "기사에는 구조 완료라고 적혀 있지만, 마지막 열차의 탑승 명단은 공란이다.",
          "clue": "paper"
        }
      ],
      "summary": "폐역 신문 옆에서 오늘 날짜의 귀가 영수증이 나온다.",
      "stakes": "검표기가 얼굴을 관제에 보내면 이후 조사가 더 급해진다."
    },
    "dining": {
      "id": "dining",
      "title": "도시락 하나, 수저 스물아홉 개",
      "chapter": 2,
      "location": "불 꺼진 식당 칸",
      "art": 1,
      "mood": "calm",
      "text": [
        "학생이 도시락을 식탁 한가운데 놓는다. “아빠가 여기서 식당을 했대요. 저는 한 번도 못 가 봤지만.” 빈 의자들이 바닥을 끌며 다가오고, 창에 비친 동네 가게에 하나둘 불이 켜진다.",
        "주문 전표에는 «양은 괜찮아요. 수저만 넉넉하게»라는 부탁이 남아 있다. 학생은 수저 스물아홉 개를 꺼낸 뒤 빈자리를 바라본다. 아직 누구도 첫 입을 먹지 않았다. 식탁 아래에서는 열차의 고동이 느리게 울린다."
      ],
      "entities": [
        {
          "id": "student",
          "label": "도시락을 든 학생",
          "kind": "person",
          "aliases": [
            "학생"
          ]
        },
        {
          "id": "meal",
          "label": "식탁의 도시락",
          "kind": "object",
          "aliases": [
            "도시락",
            "음식"
          ]
        },
        {
          "id": "receipt",
          "label": "주문 전표",
          "kind": "object",
          "aliases": [
            "전표",
            "영수증"
          ]
        },
        {
          "id": "ledger",
          "label": "차장실",
          "kind": "place",
          "aliases": [
            "차장실"
          ]
        }
      ],
      "choices": [
        {
          "id": "invite",
          "label": "빈자리에도 수저를 놓고 기다린 사람들을 부른다",
          "intent": "talk",
          "target": "meal",
          "stat": "heart",
          "dc": 11,
          "risk": "답을 재촉하면 학생이 겁을 먹고 방송에 도움을 요청한다.",
          "outcomes": {
            "critical": {
              "text": "빈자리마다 수저를 놓고 이름을 되묻자 스물아홉 목소리가 차례로 답한다. 학생이 보낸 명단을 관제도 정식 진술로 받는다. 윤이 원본과 맞춰 보자고 차장실을 열어, 적은 이름을 들고 그쪽으로 간다.",
              "next": "ledger",
              "set": [
                "meal_shared",
                "names_kept",
                "broadcast"
              ],
              "clues": [
                "parcel",
                "paper"
              ],
              "pressure": -1
            },
            "success": {
              "text": "수저를 놓은 자리마다 식탁을 한 번씩 두드리는 소리가 난다. 학생이 스물아홉 이름을 따라 읽자 윤이 차장실에서 손짓한다. 마지막 수저가 멎는 것을 듣고 그 문 안으로 들어간다.",
              "next": "ledger",
              "set": [
                "meal_shared",
                "names_kept"
              ],
              "clues": [
                "parcel"
              ]
            },
            "failure": {
              "text": "빈자리를 부르자 식탁이 흔들리고 학생이 비상 통화기를 누른다. 달려온 윤은 수저 수를 세다 말을 멈춘다. “원래 장부부터 봅시다.” 그의 안내로 식당을 나와 차장실에 들어간다.",
              "next": "ledger",
              "clues": [
                "parcel"
              ],
              "pressure": 2
            },
            "fumble": {
              "text": "대답을 알아듣지 못해 수저를 옮기자 식탁이 거세게 뛰고 비상 경보가 겹친다. 윤이 통화기를 내려놓으며 추측 대신 원본을 보자고 한다. 끊긴 목소리를 뒤에 두고 그를 따라 차장실로 간다.",
              "next": "ledger",
              "clues": [
                "parcel"
              ],
              "pressure": 3
            }
          }
        },
        {
          "id": "food-audit",
          "label": "식품 위생 점검원인 척 식당의 주문 장부를 요구한다",
          "intent": "trick",
          "target": "receipt",
          "stat": "wit",
          "dc": 12,
          "risk": "허풍이 들통나면 관제에 신원 조회가 올라간다.",
          "outcomes": {
            "critical": {
              "text": "개업 연도와 주문 번호까지 짚자 계산대가 마지막 원장을 내민다. 웃음을 터뜨린 학생이 도시락을 돌리고 명단에 식사 완료 표시가 남는다. 그 원장을 받아 차장실의 승객 기록과 맞추러 간다.",
              "next": "ledger",
              "clues": [
                "parcel",
                "paper"
              ],
              "set": [
                "names_kept",
                "meal_shared"
              ]
            },
            "success": {
              "text": "점검표를 요구하자 마지막 주문자 명단이 나온다. 위생 점수는 형편없지만 이름만큼은 빠짐없다. 윤이 대조할 원본은 차장실에 있다며 불러, 명단을 접어 들고 그 문턱을 넘는다.",
              "next": "ledger",
              "clues": [
                "parcel"
              ],
              "set": [
                "names_kept"
              ]
            },
            "failure": {
              "text": "계산대가 명단 대신 위생 교육 이수증을 요구한다. 내놓지 못한 손 앞에 조회 경고등이 켜지자 윤이 한숨을 쉰다. “신원 조회 전에 장부부터 보시죠.” 그를 따라 차장실에 들어간다.",
              "next": "ledger",
              "pressure": 1
            },
            "fumble": {
              "text": "계산대가 가짜 점검원을 신고하자 학생도 주문자를 설명하려다 입을 다문다. 윤은 표를 거두며 말 대신 원본을 확인하자고 한다. 겹쳐 울리는 경보를 뒤로하고 그의 차장실로 들어간다.",
              "next": "ledger",
              "pressure": 3,
              "unset": [
                "trusted"
              ]
            }
          }
        }
      ],
      "dialogue": {
        "who": "학생",
        "text": "유령이 배고픈 게 우스워요? 살아 있을 때 마지막으로 한 말이 배고프다는 말이었다면요."
      },
      "objective": "기다리는 손님을 부르거나 마지막 주문자 명단을 찾는다.",
      "details": [
        {
          "id": "meal-receipt",
          "label": "도시락 주문 전표를 읽는다",
          "text": "오늘 저녁에 주문됐다. 요청 사항에는 음식보다 수저를 넉넉히 달라고 적혀 있다.",
          "clue": "parcel"
        }
      ],
      "summary": "빈 의자들이 도시락 곁으로 당겨지고 수저 스물아홉 개가 놓였다.",
      "stakes": "식탁이 흔들리거나 허풍이 들통나면 비상 호출이 울린다."
    },
    "baggage": {
      "id": "baggage",
      "title": "분실물에 주인이 너무 많다",
      "chapter": 2,
      "location": "화물 보관칸",
      "art": 1,
      "mood": "mystery",
      "text": [
        "선반에는 우산 한 개, 신발 한 짝, 생일 초 한 묶음이 있다. 우산 손잡이에는 이름 열일곱 개가 빽빽하다. 비 오는 날마다 돌려 썼다는 메모의 마지막 줄은 «다음 사람에게»다.",
        "열린 배선함 옆에서 정비원 백이 손전등을 턱에 괸다. 차장실 전원이 끊겼다며 공구함의 절연장갑을 가리킨다. “도와주실 거면 먼저 차단기부터요. 이름을 찾으러 왔다가 이름표만 남기진 맙시다.”"
      ],
      "entities": [
        {
          "id": "mechanic",
          "label": "정비원 백",
          "kind": "person",
          "aliases": [
            "정비원",
            "백"
          ]
        },
        {
          "id": "umbrella",
          "label": "이름이 적힌 우산",
          "kind": "object",
          "aliases": [
            "우산",
            "분실물"
          ]
        },
        {
          "id": "wire",
          "label": "끊어진 전원선",
          "kind": "object",
          "aliases": [
            "전선",
            "배선",
            "전원"
          ]
        }
      ],
      "choices": [
        {
          "id": "help-wire",
          "label": "정비원과 함께 차장실 전원선을 잇는다",
          "intent": "help",
          "target": "mechanic",
          "stat": "might",
          "dc": 11,
          "risk": "전선이 튀면 안전 퓨즈가 끊기고 관제 경보가 울린다.",
          "outcomes": {
            "critical": {
              "text": "차단기를 확인하고 선을 받치자 백이 끊어진 선과 보조 퓨즈를 갈아 끼운다. 고장 신고를 거둔 그는 지도와 절연장갑을 건넨다. 불이 돌아온 차장실로 함께 걸어가 윤을 찾는다.",
              "next": "ledger",
              "set": [
                "crew_helped"
              ],
              "clues": [
                "map"
              ],
              "gainItems": [
                "insulated-gloves"
              ],
              "pressure": -1
            },
            "success": {
              "text": "선을 단단히 받치자 백이 연결핀을 꽂는다. 켜진 전등 아래서 그는 수동 분기 지도를 펴 주며 “설명은 같이 가서 하죠”라고 말한다. 지도를 받아 들고 그와 차장실에 들어간다.",
              "next": "ledger",
              "set": [
                "crew_helped"
              ],
              "clues": [
                "map"
              ]
            },
            "failure": {
              "text": "선을 잇는 순간 퓨즈가 끊어지고 차장실까지 캄캄해진다. 백이 손전등을 켜며 종이 장부는 불이 없어도 읽힌다고 중얼거린다. 그의 작은 빛을 따라 전원 없는 문턱을 넘는다.",
              "next": "ledger",
              "pressure": 2
            },
            "fumble": {
              "text": "선을 받치던 손에 전류가 튄다. 백이 차단기를 내리자 욱신거리는 손끝과 함께 객차 전등도 꺼진다. 그는 손전등을 건네며, 차장실의 종이 장부만은 아직 읽을 수 있다고 한다.",
              "next": "ledger",
              "harm": 1,
              "pressure": 3
            }
          }
        },
        {
          "id": "lost-names",
          "label": "분실물의 이름을 방송으로 하나씩 읽는다",
          "intent": "perform",
          "target": "umbrella",
          "stat": "heart",
          "dc": 11,
          "risk": "누락된 이름을 잘못 읽으면 관제가 방송 권한을 끊는다.",
          "outcomes": {
            "critical": {
              "text": "겹친 글씨를 나누어 이름을 읽자 관제사가 녹음 번호를 불러 준다. 백도 손전등을 돌려 빠진 이름을 비추며 다음 작업까지 돕겠다고 한다. 원본 이름표들을 챙겨 차장실의 장부와 맞추러 간다.",
              "next": "ledger",
              "set": [
                "names_kept",
                "broadcast",
                "crew_helped"
              ],
              "clues": [
                "paper"
              ],
              "pressure": -1
            },
            "success": {
              "text": "이름마다 그림자가 고개를 들고 마지막 이름에는 윤이 답한다. “그 이름표를 차장실로 가져오세요. 여기 귀가 장부가 있습니다.” 표들을 챙겨 객차 통로를 지나 차장실로 들어간다.",
              "next": "ledger",
              "set": [
                "names_kept",
                "broadcast"
              ],
              "clues": [
                "paper"
              ]
            },
            "failure": {
              "text": "이름을 읽는 도중 방송이 안내 음악으로 바뀐다. 밖으로 나온 윤이 손에 든 이름표를 살피더니 원본 장부와 맞추자고 한다. 스피커를 두드리던 손을 내리고 그의 차장실로 따라간다.",
              "next": "ledger",
              "pressure": 1
            },
            "fumble": {
              "text": "물건의 별명을 이름으로 읽자 관제가 회선을 끊고 앞서 보낸 이름도 보류한다. 윤이 원본부터 다시 보자며 차장실로 부른다. 이름표들을 챙겨 꺼진 방송 장치를 떠나 그 문 안으로 들어간다.",
              "next": "ledger",
              "pressure": 3,
              "unset": [
                "broadcast"
              ]
            }
          }
        }
      ],
      "objective": "이름들을 방송으로 읽거나 백을 도와 차장실에 전기를 잇는다.",
      "details": [
        {
          "id": "umbrella-label",
          "label": "우산의 분실물 표를 읽는다",
          "text": "우산에는 «모래역 일동»이라는 공동 소유 표지가 있다. 옆에 붙은 단체 승차권 번호도 메모한다. 차장실 장부와 대조할 수 있는 기록이다.",
          "clue": "ticket",
          "gainItems": [
            "ticket-note"
          ]
        },
        {
          "id": "borrow-gloves",
          "label": "백에게 절연장갑을 빌린다",
          "text": "백은 멀쩡한 장갑 한 켤레를 건넨다. “젖은 분기 릴레이에 쓸 겁니다. 먼저 전원을 끊고 만지세요.”",
          "gainItems": [
            "insulated-gloves"
          ]
        }
      ],
      "summary": "이름이 빽빽한 분실물 옆에서 정비원 백이 끊어진 전선을 붙들고 있다.",
      "stakes": "전기를 끊지 않은 선은 위험하다. 절연장갑을 빌려 둘 수 있다."
    },
    "ledger": {
      "id": "ledger",
      "title": "괴담의 결재란",
      "chapter": 2,
      "location": "차장실",
      "art": 1,
      "mood": "tension",
      "text": [
        "윤이 펼친 장부에는 스물아홉 이름이 있다. 재난 때 대피 열차를 기다렸으나 타지 못한 사람들. «구조 완료» 도장 아래 밀려 있던 귀가 요청을, 오늘 막차는 한 묶음의 승객으로 받아들였다.",
        "명찰 밑에도 여러 이름이 겹쳐 있다. “그분들의 목소리를 빌려 일합니다.” 윤이 장부 사본과 제동실 열쇠를 밀어 놓는다. “살아 있는 분부터 보내셔도 됩니다. 저분들이 내릴 자리를 만들려면, 다른 선로가 필요하고요.”"
      ],
      "entities": [
        {
          "id": "conductor",
          "label": "차장 윤",
          "kind": "person",
          "aliases": [
            "차장",
            "윤"
          ]
        },
        {
          "id": "ledger",
          "label": "귀가 요청 장부",
          "kind": "object",
          "aliases": [
            "장부",
            "요청서"
          ]
        },
        {
          "id": "brake",
          "label": "비상 제동실",
          "kind": "place",
          "aliases": [
            "제동실",
            "브레이크"
          ]
        },
        {
          "id": "signal",
          "label": "수동 신호실",
          "kind": "place",
          "aliases": [
            "신호실",
            "신호"
          ]
        }
      ],
      "choices": [
        {
          "id": "brake-route",
          "label": "사람부터 지키기 위해 비상 제동실로 간다",
          "intent": "choose",
          "target": "brake",
          "automatic": true,
          "outcomes": {
            "success": {
              "text": "장부 사본을 품고 제동실 열쇠를 고른다. 윤이 먼저 몸을 돌리며 “막차가 사람들까지 데려가기 전에 붙잡아야겠군요”라고 한다. 그를 따라 옆칸 제동실 문을 열자 바퀴 긁는 소리가 더 커진다.",
              "next": "brake",
              "clues": [
                "ledger"
              ]
            }
          }
        },
        {
          "id": "signal-route",
          "label": "지워진 역도 정차할 수 있는 신호를 찾는다",
          "intent": "choose",
          "target": "signal",
          "automatic": true,
          "outcomes": {
            "success": {
              "text": "장부 사본을 챙기고 다른 선로를 묻자 윤이 강 위 정비 다리의 0번선을 짚는다. 정규 역은 아니어도 멈출 자리는 있다는 답이다. 그의 안내로 열차 앞칸에 걸어가 수동 신호실로 들어간다.",
              "next": "signal",
              "clues": [
                "ledger"
              ]
            }
          }
        },
        {
          "id": "match-ticket",
          "label": "메모한 승객명과 장부를 맞춰 관제에 보여 준다",
          "intent": "use",
          "target": "ledger",
          "automatic": true,
          "useItems": [
            "ticket-note"
          ],
          "requires": {
            "item": "ticket-note"
          },
          "lockedHint": "승강장에서 떨어진 표를 메모하거나, 화물칸의 공동 분실물 표를 확인해야 한다.",
          "outcomes": {
            "success": {
              "text": "승차권 메모를 장부 옆에 놓자 단체명과 스물아홉 이름이 맞아떨어진다. 윤이 두 기록을 보내니 관제의 경고음이 잦아든다. 이 요청에 정차 허가를 받으러, 장부 사본을 챙겨 앞칸 신호실로 걸어간다.",
              "next": "signal",
              "clues": [
                "ledger"
              ],
              "set": [
                "trusted",
                "broadcast"
              ],
              "pressure": -1
            }
          }
        }
      ],
      "dialogue": {
        "who": "차장 윤",
        "text": "제일 무서운 것은 귀신이 아닙니다. «처리 완료» 뒤에 질문할 사람이 없는 거죠."
      },
      "objective": "막차를 멈출 장치를 보러 가거나 다른 선로의 신호를 찾는다.",
      "details": [
        {
          "id": "open-ledger",
          "label": "귀가 요청서 원본을 읽는다",
          "text": "모래역 주민의 요청은 삭제되지 않았다. 같은 묶음으로 남아 오늘의 막차에 접수됐다.",
          "clue": "ledger"
        }
      ],
      "callbacks": [
        {
          "when": {
            "flag": "meal_shared"
          },
          "text": "장부의 식사 요청 칸에 작은 동그라미가 생겼다. 도시락을 나눈 일이 실제로 이들의 기다림 하나를 끝냈다."
        }
      ],
      "resurrection": {
        "label": "귀가 장부에 동료의 이름을 다시 부른다",
        "text": "이 열차에서 목숨을 잃은 사람은 마지막 표에 잠시 머문다. 살아 있는 동료가 장부의 이름을 부르고 자기 귀가 시간을 나눠 주면, 잃어버린 몸을 되찾을 기회가 생긴다. 운명 1개와 관제 경계 2를 지불하고 판정한다.",
        "sparkCost": 1,
        "pressureCost": 2,
        "dc": 12
      },
      "summary": "대피 열차에 타지 못한 스물아홉 사람의 귀가 요청이 장부에 남았다.",
      "stakes": "주민들이 내릴 곳을 정하는 동안에도 열차가 달아나지 않게 해야 한다."
    },
    "brake": {
      "id": "brake",
      "title": "제동 손잡이를 고정해야 한다",
      "chapter": 3,
      "location": "비상 제동실",
      "art": 2,
      "mood": "tension",
      "text": [
        "윤이 제동 손잡이를 당기자 바퀴의 비명이 낮아진다. 손을 조금 풀면 다시 빨라진다. 그가 턱으로 고정 장치의 핀 구멍과 수동 잠금 홈을 가리킨다. 공구함에는 예비 잠금핀 한 개가 남아 있다.",
        "벽의 «임시 정차 규정»이 진동에 팔랑인다. 새 행선지를 정한 주민 대표와 살아 있는 증인의 서명이 필요하다고 한다. 옆의 붉은 동력 역전기는 분기기로 가는 지름길이다. 덮개에는 «조작 지연 시 객차 탈선»이라고 새겨져 있다."
      ],
      "entities": [
        {
          "id": "brake",
          "label": "비상 제동 손잡이",
          "kind": "object",
          "aliases": [
            "손잡이",
            "제동기",
            "브레이크"
          ]
        },
        {
          "id": "manual",
          "label": "낡은 규정집",
          "kind": "object",
          "aliases": [
            "규정",
            "규정집"
          ]
        },
        {
          "id": "rig",
          "label": "자동 고정 장치",
          "kind": "object",
          "aliases": [
            "장치",
            "고정기"
          ]
        },
        {
          "id": "reverse",
          "label": "비상 동력 역전기",
          "kind": "object",
          "aliases": [
            "역전기",
            "동력축",
            "역전",
            "강제 제동"
          ]
        }
      ],
      "choices": [
        {
          "id": "rig-brake",
          "label": "잠금핀을 끼워 제동 손잡이를 고정한다",
          "intent": "use",
          "target": "rig",
          "stat": "wit",
          "dc": 12,
          "risk": "핀은 결과에 관계없이 소모된다. 실패하면 장치가 고장 나고, 대실패하면 손도 다친다.",
          "outcomes": {
            "critical": {
              "text": "핀을 끝까지 밀자 보조 잠금쇠까지 물린다. 윤이 손을 떼고 안정된 수치를 관제에 보내자 재촉도 잦아든다. 그가 건넨 규정집을 챙겨 제동실을 나와, 터널을 지나는 객차의 연결 통로로 간다.",
              "next": "tunnel",
              "set": [
                "brake_safe",
                "trusted"
              ],
              "clues": [
                "protocol"
              ],
              "pressure": -1
            },
            "success": {
              "text": "핀이 짧은 쇳소리와 함께 손잡이를 붙든다. 윤이 손을 떼 보아도 열차는 다시 빨라지지 않는다. 벽의 규정집에서 정차 조건을 확인한 뒤, 책을 들고 객차 사이 연결 통로로 나선다.",
              "next": "tunnel",
              "set": [
                "brake_safe"
              ],
              "clues": [
                "protocol"
              ]
            },
            "failure": {
              "text": "끝까지 들어가지 못한 핀이 부러져 장치 안에 박힌다. 윤이 제동을 다시 잡고 꺼낼 수 없는 핀 대신 벽의 규정집을 가리킨다. 책을 챙겨 제동실을 나와 터널 속 객차의 연결 통로로 간다.",
              "next": "tunnel",
              "clues": [
                "protocol"
              ],
              "pressure": 2
            },
            "fumble": {
              "text": "비스듬히 박힌 핀이 꺾이고 잠금쇠가 손등을 친다. 윤이 제동을 대신 붙드는 동안 손을 감싸고 규정집을 챙긴다. 부러진 핀을 남겨 둔 채 제동실에서 나와 객차 사이 연결 통로로 이동한다.",
              "next": "tunnel",
              "clues": [
                "protocol"
              ],
              "harm": 1,
              "pressure": 3
            }
          },
          "useItems": [
            "brake-pin"
          ],
          "consumeItems": [
            "brake-pin"
          ],
          "requires": {
            "item": "brake-pin"
          },
          "lockedHint": "이 방의 공구함에서 예비 잠금핀을 먼저 챙겨야 한다. 시도하면 핀은 소모된다."
        },
        {
          "id": "hold-brake",
          "label": "제동 손잡이를 잠금 홈까지 힘껏 밀어 넣는다",
          "intent": "force",
          "target": "brake",
          "stat": "might",
          "dc": 12,
          "risk": "실패하면 손잡이에 맞아 생명 2를, 대실패하면 생명 3을 잃는다. 체력이 떨어진 사람은 사망할 수 있다.",
          "outcomes": {
            "critical": {
              "text": "밀고 버티는 힘을 나누자 손잡이가 잠금 홈에 들어간다. 예비 핀까지 챙기는 동안 윤이 안정된 수치를 관제에 보낸다. 규정집을 받아 제동실을 나서니, 터널 속 객차의 연결 통로가 조용해졌다.",
              "next": "tunnel",
              "set": [
                "brake_safe"
              ],
              "clues": [
                "protocol"
              ],
              "gainItems": [
                "brake-pin"
              ],
              "pressure": -1
            },
            "success": {
              "text": "손잡이를 끝까지 밀자 낡은 잠금 홈이 제자리를 찾는다. 윤이 손을 놓아도 바퀴 소리는 다시 높아지지 않는다. 그가 벽에서 뺀 규정집을 챙겨, 제동실 밖 객차의 연결 통로로 간다.",
              "next": "tunnel",
              "set": [
                "brake_safe"
              ],
              "clues": [
                "protocol"
              ]
            },
            "failure": {
              "text": "힘을 받은 홈이 깨지며 손잡이가 몸을 세게 친다. 윤이 제동을 붙들고 떨어진 규정집을 밀어 준다. 깊은 상처를 감싸며 그 책을 받아, 열차가 느려진 틈에 객차의 연결 통로로 몸을 옮긴다.",
              "next": "tunnel",
              "clues": [
                "protocol"
              ],
              "pressure": 2,
              "harm": 2
            },
            "fumble": {
              "text": "잠금 홈이 깨지고 되튄 손잡이가 가슴을 짓누른다. 윤이 비상 완충기를 걸어 열차를 늦추지만, 그 아래에서 숨은 돌아오지 않는다. 규정집과 터널로 가는 길은 살아남은 동료가 있을 때만 이어진다.",
              "next": "tunnel",
              "clues": [
                "protocol"
              ],
              "harm": 3,
              "pressure": 3
            }
          }
        },
        {
          "id": "reverse-shortcut",
          "label": "동력 역전기로 마지막 객차를 강제 제동한다 (전멸 위험)",
          "intent": "use",
          "target": "reverse",
          "stat": "wit",
          "dc": 14,
          "risk": "성공하면 터널을 건너뛰고 관제 경계가 2 낮아진다. 대표와 합의할 기회는 사라진다. 실패는 전원 생명 2 피해, 대실패는 전원 생명 3 피해로 전멸한다.",
          "outcomes": {
            "critical": {
              "text": "바퀴와 동력축의 박자를 맞춰 역전하자 객차가 멎고 견인 요청도 철회된다. 윤이 규정집을 건네며 분기기가 바로 옆이라 알려 준다. 옆문으로 내려 분기기로 가는 동안, 대표가 기다릴 터널은 뒤에 남는다.",
              "next": "switch",
              "set": [
                "brake_safe",
                "signal_open"
              ],
              "clues": [
                "protocol"
              ],
              "pressure": -3
            },
            "success": {
              "text": "비상선에 맞춰 동력축이 반대로 돌고 추적 신호도 끊긴다. 객차가 분기기 바로 앞에 멎자 윤이 규정집과 옆문을 내준다. 문밖의 정비 발판으로 내려가 지름길 끝의 레버 앞에 선다.",
              "next": "switch",
              "set": [
                "brake_safe"
              ],
              "clues": [
                "protocol"
              ],
              "pressure": -2
            },
            "failure": {
              "text": "역전이 늦어 일행 모두가 바닥에 내던져진다. 완충기가 탈선은 막았지만 지름길은 닫혔다. 윤이 건넨 규정집을 챙기고 다친 몸을 일으켜, 제동실 밖 객차의 연결 통로로 물러난다.",
              "next": "tunnel",
              "harmAll": 2,
              "clues": [
                "protocol"
              ],
              "pressure": 2
            },
            "fumble": {
              "text": "역전된 동력축이 잠기지 못하고 객차를 선로 밖으로 비튼다. 붙잡은 손잡이째 모두가 어둠 아래로 떨어진다. 윤의 호출이 여러 번 울리지만, 서로의 이름을 대신 받아 줄 동료도 남지 않는다.",
              "next": "tunnel",
              "harmAll": 3,
              "pressure": 3
            }
          }
        }
      ],
      "objective": "핀을 끼우거나 손잡이를 잠금 홈까지 밀어 고정한다.",
      "details": [
        {
          "id": "brake-manual",
          "label": "철거 전 규정집을 펼친다",
          "text": "주민 대표의 동의와 살아 있는 증인의 서명이 있으면 새 이름으로 임시 정차를 신청할 수 있다.",
          "clue": "protocol"
        },
        {
          "id": "spare-pin",
          "label": "공구함에서 제동기 예비 잠금핀을 챙긴다",
          "text": "정비표에 이 핀은 고정 장치에 한 번 끼우면 빼낼 수 없다고 적혀 있다. 맞지 않게 끼우면 핀만 부러질 수 있으니 확인하고 가져간다.",
          "gainItems": [
            "brake-pin"
          ]
        }
      ],
      "summary": "제동 손잡이는 당겨져 있지만 손을 놓으면 다시 풀린다.",
      "stakes": "손잡이가 되튀면 치명상을 입는다. 동력 역전기를 잘못 쓰면 일행 모두 죽을 수 있다."
    },
    "signal": {
      "id": "signal",
      "title": "공무원에게도 유령은 민원이다",
      "chapter": 3,
      "location": "수동 신호실",
      "art": 2,
      "mood": "tension",
      "text": [
        "열차 앞칸의 신호실에서 전화가 먼저 울린다. “존재하지 않는 역에는 정차할 수 없습니다.” 관제사의 목소리는 또렷하다. 수화기 아래 종이 지도에는 전산에서 사라진 역들이 여전히 작은 점으로 남아 있다.",
        "강 위 정비 다리의 0번선까지 낡은 전선 하나가 이어진다. 벽의 임시 정차 규정에는 주민 대표와 살아 있는 증인의 서명란이 있다. 관제사는 대답을 기다리고, 수동 신호기의 녹슨 스위치는 손 닿는 곳에 있다."
      ],
      "entities": [
        {
          "id": "controller",
          "label": "전화 너머 관제사",
          "kind": "person",
          "aliases": [
            "관제사",
            "관제",
            "전화"
          ]
        },
        {
          "id": "signal",
          "label": "수동 신호기",
          "kind": "object",
          "aliases": [
            "신호기",
            "분기표"
          ]
        },
        {
          "id": "map",
          "label": "0번선 지도",
          "kind": "object",
          "aliases": [
            "지도",
            "0번선"
          ]
        }
      ],
      "choices": [
        {
          "id": "appeal",
          "label": "임시 정차 규정을 들어 관제사를 설득한다",
          "intent": "talk",
          "target": "controller",
          "stat": "heart",
          "dc": 12,
          "risk": "설득이 실패하면 관제가 원격 분기를 잠근다.",
          "outcomes": {
            "critical": {
              "text": "역의 폐쇄와 승객의 존재는 다른 문제라 설명하자 관제사가 규정을 다시 읽는다. 0번선이 켜지고 견인 열차도 멎는다. 지도와 접수 번호를 챙겨 신호실을 나와, 터널을 지나는 객차 연결 통로로 돌아간다.",
              "next": "tunnel",
              "set": [
                "signal_open",
                "broadcast"
              ],
              "clues": [
                "protocol",
                "map"
              ],
              "pressure": -2
            },
            "success": {
              "text": "규정의 서명란을 읽어 주자 침묵 뒤에 녹음음이 난다. “정식 민원으로 받겠습니다.” 0번선의 불을 확인하고 지도를 접어, 신호실에서 객차 사이 연결 통로로 돌아 나온다.",
              "next": "tunnel",
              "set": [
                "signal_open",
                "broadcast"
              ],
              "clues": [
                "protocol",
                "map"
              ]
            },
            "failure": {
              "text": "설명을 마치기 전에 원격 분기가 잠긴다. 지도에 남은 현장 레버를 직접 움직여야 한다. 규정과 지도를 챙겨 신호실을 나와, 밖으로 나갈 문이 있는 객차 연결 통로로 간다.",
              "next": "tunnel",
              "clues": [
                "protocol",
                "map"
              ],
              "pressure": 2
            },
            "fumble": {
              "text": "접수 요청이 사고 은폐로 받아들여져 관제가 녹음을 보류하고 분기를 잠근다. 수동 레버만 남은 지도를 규정과 함께 베낀다. 현장으로 갈 길을 찾으러 신호실 밖 객차 연결 통로로 돌아간다.",
              "next": "tunnel",
              "clues": [
                "protocol",
                "map"
              ],
              "pressure": 3,
              "unset": [
                "broadcast"
              ]
            }
          }
        },
        {
          "id": "manual-signal",
          "label": "전산 신호를 우회해 0번선을 직접 연다",
          "intent": "use",
          "target": "signal",
          "stat": "wit",
          "dc": 13,
          "risk": "실패하면 신호가 꺼져 관제 경계가 높아진다. 대실패하면 감전으로 생명 1도 잃는다.",
          "outcomes": {
            "critical": {
              "text": "배선도대로 릴레이를 맞추자 0번선과 후방 차단등이 함께 켜진다. 멎은 견인 열차 덕에 윤도 제동을 다시 확인한다. 지도를 챙겨 신호실을 떠나, 밖을 살필 객차 연결 통로로 돌아간다.",
              "next": "tunnel",
              "set": [
                "signal_open",
                "brake_safe"
              ],
              "clues": [
                "map"
              ],
              "pressure": -1
            },
            "success": {
              "text": "스위치를 돌리자 릴레이가 딸깍하며 0번선에 녹색 불이 들어온다. 윤이 무전으로 확인했다며 지금 밖을 살펴도 된다고 한다. 지도를 접어 들고 신호실에서 객차 연결 통로로 나온다.",
              "next": "tunnel",
              "set": [
                "signal_open"
              ],
              "clues": [
                "map"
              ]
            },
            "failure": {
              "text": "스위치 아래서 퓨즈가 튀고 신호판이 캄캄해진다. 종이 지도에는 현장 분기기 표시만 남아 있다. 그곳으로 나갈 길을 찾으려고 지도를 들고 신호실 밖 객차 연결 통로로 간다.",
              "next": "tunnel",
              "clues": [
                "map"
              ],
              "pressure": 2
            },
            "fumble": {
              "text": "서로 다른 선을 물리자 불꽃이 손을 스치고 신호판이 꺼진다. 관제의 비상 점검 호출을 들으며 지도에서 현장 분기기를 찾는다. 아픈 손으로 종이를 접고 신호실을 나와 객차 연결 통로로 돌아간다.",
              "next": "tunnel",
              "clues": [
                "map"
              ],
              "harm": 1,
              "pressure": 3
            }
          }
        }
      ],
      "objective": "관제사의 허가를 받거나 릴레이를 직접 맞춘다.",
      "details": [
        {
          "id": "signal-manual",
          "label": "분기표 뒷면의 임시 정차 규정을 읽는다",
          "text": "신청에는 주민 대표의 행선지 선언과 살아 있는 증인의 서명이 필요하다.",
          "clue": "protocol"
        }
      ],
      "summary": "전산에서 지워진 0번선이 종이 지도와 수동 신호기에 남았다.",
      "stakes": "신호를 못 열면 현장 레버에서 서둘러 길을 바꿔야 한다."
    },
    "tunnel": {
      "id": "tunnel",
      "title": "열차 밖에서 누군가 문을 두드렸다",
      "chapter": 3,
      "location": "정비 터널 연결 통로",
      "art": 2,
      "mood": "danger",
      "text": [
        "터널을 지나는 막차의 연결 통로에서 작은 노크가 들린다. 속도를 낮춘 열차 밖으로 우비 입은 아이가 걷는다. 그 뒤에 어른들의 신발과 가게 처마, 젖은 빨래줄이 겹친다. 한 아이의 보폭으로 동네 전체가 따라오고 있다.",
        "확성기가 «미확인 물체와 접촉 금지»를 되풀이한다. 아이는 빈 행선지 종이를 창에 대 보인다. 앞쪽 정비 통로는 분기기로 이어진다. 종이를 받아 볼 틈은 있지만, 그동안 관제의 차단도 가까워진다."
      ],
      "entities": [
        {
          "id": "passenger",
          "label": "우비를 입은 일곱 번째 승객",
          "kind": "person",
          "aliases": [
            "아이",
            "승객",
            "우비"
          ]
        },
        {
          "id": "switch",
          "label": "현장 분기기",
          "kind": "place",
          "aliases": [
            "분기기",
            "선로"
          ]
        },
        {
          "id": "door",
          "label": "통로 출입문",
          "kind": "object",
          "aliases": [
            "문"
          ]
        }
      ],
      "choices": [
        {
          "id": "open-door",
          "label": "안전 고리를 걸고 아이에게 통로 문을 연다",
          "intent": "help",
          "target": "door",
          "stat": "agility",
          "dc": 12,
          "risk": "실패하면 문에 끼여 생명 1을, 대실패하면 생명 2를 잃는다. 문을 못 열어도 유리창 너머로 이야기를 들을 수 있다.",
          "outcomes": {
            "critical": {
              "text": "문을 밀며 두 번째 안전 고리까지 걸자 흔들림이 잦아든다. 아이가 주민 이름이 적힌 신청서를 먼저 내민다. 통로에 젖은 발자국이 남고, 누구에게도 서두르라 하지 않은 채 이야기를 들을 자리가 생긴다.",
              "next": "witness",
              "clues": [
                "testimony"
              ],
              "set": [
                "names_kept"
              ],
              "pressure": -1
            },
            "success": {
              "text": "안전 고리가 팽팽해지며 문이 열린다. 아이는 안에 들어오기 전에 신발의 물기를 턴다. “사람들 사는 데는 그러라고 배웠어요.” 한 걸음 비켜 주자, 그가 신청서를 조심스레 펼친다.",
              "next": "witness"
            },
            "failure": {
              "text": "문을 여는 순간 안전 고리가 끊어져 문짝이 몸을 세게 친다. 안쪽으로 물러나자 아이가 유리에 신청서를 붙인다. 그는 닫힌 문 너머에서도 들리도록 한 글자씩 또박또박 말을 잇는다.",
              "next": "witness",
              "pressure": 1,
              "harm": 1
            },
            "fumble": {
              "text": "끊어진 고리가 손목을 감고 문이 닫힌다. 관제 경보가 울리는 동안 고리를 풀어 안쪽으로 몸을 빼지만 팔이 제대로 움직이지 않는다. 아이는 창 밖에 신청서를 붙인 채, 고개를 들 때까지 기다린다.",
              "next": "witness",
              "harm": 2,
              "pressure": 2
            }
          }
        },
        {
          "id": "straight-switch",
          "label": "관제 차단 전에 분기기로 먼저 간다",
          "intent": "choose",
          "target": "switch",
          "automatic": true,
          "outcomes": {
            "success": {
              "text": "아이에게 기다리라는 손짓을 남기고, 윤이 잠깐 열차를 세운 틈에 바깥 난간 통로로 내려선다. 빈 행선지에 무슨 부탁을 쓸지는 듣지 못했다. 선로를 따라 걸어가 관제가 닫으려는 현장 분기기 앞에 선다.",
              "next": "switch"
            }
          }
        }
      ],
      "objective": "문을 열어 이야기를 듣거나 난간 통로로 분기기에 먼저 간다.",
      "callbacks": [
        {
          "when": {
            "flag": "names_kept"
          },
          "text": "당신들이 읽었던 이름 중 하나가 아이의 이름표에 보인다. 아이는 이미 당신들을 알고 있는 눈치다."
        }
      ],
      "summary": "우비 입은 아이 뒤로 동네 전체가 겹쳐 보인다. 아이가 빈 행선지 종이를 내민다.",
      "stakes": "문에 끼이면 다친다. 그냥 지나가면 주민들과 새 장소의 이름을 정할 기회를 잃는다."
    },
    "witness": {
      "id": "witness",
      "title": "집으로 보내 달라는 말의 뜻",
      "chapter": 3,
      "location": "멈추지 않는 연결 통로",
      "art": 2,
      "mood": "calm",
      "text": [
        "우비 입은 아이가 신청서를 펼친다. “모래역 주민들을 대신해서 왔어요.” 스물아홉 이름 아래, 행선지 한 칸이 비어 있다. 아이가 유리 가까이 종이를 들면 작은 글씨까지 읽힌다.",
        "“죽은 일을 없던 일로 해 달라는 건 아니에요.” 아이는 말을 고른다. “우리가 여기서 기다렸다고 적어 주세요. 가끔 누가 멈춰 줄 자리도 있으면 좋겠어요. 이름은 저희가 지어도 될까요?” 빈칸 위에서 연필 끝이 멎는다."
      ],
      "entities": [
        {
          "id": "passenger",
          "label": "모래역의 대표",
          "kind": "person",
          "aliases": [
            "모래역",
            "아이",
            "대표"
          ]
        },
        {
          "id": "petition",
          "label": "빈 행선지 신청서",
          "kind": "object",
          "aliases": [
            "신청서",
            "종이",
            "서명"
          ]
        },
        {
          "id": "lamp",
          "label": "난간의 깜박이는 비상등",
          "kind": "object",
          "aliases": [
            "비상등",
            "등"
          ]
        }
      ],
      "choices": [
        {
          "id": "consent",
          "label": "새 정차 장소의 이름을 주민들이 정하게 한다",
          "intent": "choose",
          "target": "petition",
          "automatic": true,
          "outcomes": {
            "success": {
              "text": "이름을 직접 정해 달라 하자 아이가 «기다림 마당»을 쓰고 그 아래 증인으로 서명을 받는다. 약속을 실을 선로가 필요하다. 윤이 열차를 잠깐 세운 사이 바깥 난간 통로로 내려가 분기기까지 걷는다.",
              "next": "switch",
              "set": [
                "signed"
              ],
              "clues": [
                "testimony"
              ]
            }
          }
        },
        {
          "id": "record-only",
          "label": "정차 약속 대신 주민들의 마지막 진술을 기록한다",
          "intent": "choose",
          "target": "passenger",
          "automatic": true,
          "outcomes": {
            "success": {
              "text": "정차를 약속하는 대신 마지막 말을 적어 읽어 주고 방송에도 남긴다. 주민들은 자기 이름이 불릴 때 고개를 끄덕인다. 기록을 챙겨 윤이 세운 열차에서 난간 통로로 내려선 뒤, 분기기를 찾아간다.",
              "next": "switch",
              "set": [
                "names_kept",
                "broadcast"
              ],
              "clues": [
                "testimony"
              ]
            }
          }
        },
        {
          "id": "solo-promise-next-train",
          "label": "다음 막차에도 찾아오겠다고 약속하고 정차 신청에 내 이름을 쓴다",
          "intent": "talk",
          "target": "petition",
          "stat": "heart",
          "dc": 12,
          "requires": {
            "partyMax": 1
          },
          "risk": "약속을 믿게 하지 못하면 새 정차 이름은 정하지 못한다. 관제와의 통화가 길어져 경계가 높아진다.",
          "outcomes": {
            "critical": {
              "text": "다음 막차에도 오겠다고 말하고 이름을 쓰자 아이가 «기다림 마당»을 적는다. 스물아홉 이름을 함께 관제에 읽어 주니 견인 재촉도 잦아든다. 신청서를 품고 난간 통로를 건너 분기기로 간다.",
              "next": "switch",
              "set": [
                "solo_promised_return",
                "signed",
                "names_kept",
                "broadcast"
              ],
              "clues": [
                "testimony"
              ],
              "pressure": -2
            },
            "success": {
              "text": "한 번 더 오겠다는 약속 아래 서명하자 아이가 새 이름을 적는다. «기다림 마당»을 관제에 알리고 잠깐의 시간을 얻는다. 종이를 품고 난간 통로로 내려서, 약속할 자리를 만들 분기기로 간다.",
              "next": "switch",
              "set": [
                "solo_promised_return",
                "signed"
              ],
              "clues": [
                "testimony"
              ],
              "pressure": -1
            },
            "failure": {
              "text": "아이에게 다음 막차를 약속하지만 그는 관제가 허락할지 먼저 묻는다. 통화는 길어지고 신청서의 행선지 칸은 그대로 남는다. 들은 부탁만 챙겨 난간 통로로 건너가 분기기부터 살피기로 한다.",
              "next": "switch",
              "clues": [
                "testimony"
              ],
              "pressure": 1
            },
            "fumble": {
              "text": "관제에 돌아올 시각을 설명하다 현재 정차 요청과 말이 엉킨다. 관제는 새 운행을 접수하지 않고 경계를 올린다. 아이가 접어 준 빈 신청서를 들고, 난간 통로로 내려가 분기기부터 확보하러 간다.",
              "next": "switch",
              "clues": [
                "testimony"
              ],
              "pressure": 3
            }
          }
        },
        {
          "id": "group-light-rail",
          "label": "아이와 동료들이 볼 수 있게 난간의 비상등을 고친다",
          "intent": "use",
          "target": "lamp",
          "stat": "wit",
          "dc": 12,
          "requires": {
            "partyMin": 2,
            "aliveMin": 2
          },
          "risk": "등을 고치다 시간이 지체될 수 있다. 대실패하면 전선 불꽃에 행동자 생명 1을 잃고 경보가 울린다.",
          "outcomes": {
            "critical": {
              "text": "비상등의 느슨한 접점을 맞추자 이름표와 분기기 표지까지 환해진다. 아이의 말을 관제에 읽어 보내고 경계를 낮춘다. 불을 그대로 남겨 동료들이 돌아올 길을 밝힌 뒤, 난간 통로로 분기기에 간다.",
              "next": "switch",
              "set": [
                "group_lit_way",
                "names_kept",
                "broadcast"
              ],
              "clues": [
                "testimony",
                "map"
              ],
              "pressure": -2
            },
            "success": {
              "text": "접점을 눌러 고정하자 신청서의 이름들이 밝아진다. 읽은 이름을 관제에 보내니 재촉이 잠깐 멎는다. 아이 곁에 등불을 남기고, 동료들이 확인할 수 있는 난간 통로를 따라 분기기로 건너간다.",
              "next": "switch",
              "set": [
                "group_lit_way",
                "names_kept"
              ],
              "clues": [
                "testimony"
              ],
              "pressure": -1
            },
            "failure": {
              "text": "등 덮개를 열어도 끊긴 접점을 찾지 못한다. 아이는 종이를 가까이 들어 말을 마치고 관제의 재촉은 더 커진다. 어두운 난간을 손으로 짚으며 일행과 분기기 쪽으로 이동한다.",
              "next": "switch",
              "clues": [
                "testimony"
              ],
              "pressure": 1
            },
            "fumble": {
              "text": "접점을 잇던 손에 불꽃이 튀고 비상등이 완전히 꺼진다. 아이가 유리에 신청서를 붙여 마지막 부탁을 보여 준다. 윤이 잠깐 세운 열차에서 내려, 아픈 손을 감싼 채 일행과 난간을 짚어 분기기로 간다.",
              "next": "switch",
              "clues": [
                "testimony"
              ],
              "harm": 1,
              "pressure": 3
            }
          }
        }
      ],
      "dialogue": {
        "who": "모래역의 대표",
        "text": "떠나지 못한 게 아니라, 어디로 가고 싶은지 한 번도 질문받지 못했어요."
      },
      "objective": "주민이 고른 이름에 서명하거나 마지막 말을 기록한다.",
      "details": [
        {
          "id": "listen-request",
          "label": "대표의 요청을 끝까지 듣는다",
          "text": "주민들은 죽음을 취소해 달라는 것이 아니다. 자신들이 기다렸다는 기록과 이름 붙일 장소를 원한다.",
          "clue": "testimony"
        }
      ],
      "resurrection": {
        "label": "귀가 장부에 동료의 이름을 다시 부른다",
        "text": "이 열차에서 목숨을 잃은 사람은 마지막 표에 잠시 머문다. 살아 있는 동료가 장부의 이름을 부르고 자기 귀가 시간을 나눠 주면, 잃어버린 몸을 되찾을 기회가 생긴다. 운명 1개와 관제 경계 2를 지불하고 판정한다.",
        "sparkCost": 1,
        "pressureCost": 2,
        "dc": 12
      },
      "summary": "주민들은 기다렸다는 기록과 가끔 누군가 멈춰 줄 자리를 원한다.",
      "stakes": "새 정차 장소는 주민과 이름을 정했을 때 등록할 수 있다. 다른 귀가 방법도 남는다.",
      "partyText": {
        "solo": [
          "우비 입은 아이가 혼자 선 증인 앞에 신청서를 펼친다. “모래역 사람들을 대신해서 왔어요.” 스물아홉 이름 아래에 행선지가 비었다. 아이는 유리 가까이 종이를 들어 작은 글씨까지 보이게 한다.",
          "죽은 일을 없애 달라는 부탁은 아니라고 한다. 기다렸다는 기록과 가끔 누가 멈춰 줄 자리가 필요하다. “다음 막차 때도 여기 오는 사람이 있을까요?” 아이의 연필이 빈칸 위에서 멎는다. 대답을 대신해 줄 다른 여행자는 없다."
        ],
        "group": [
          "모래역 주민 대표라는 아이가 일행 쪽으로 신청서를 펼친다. 스물아홉 이름이 적힌 종이는 어두운 창가에서 잘 읽히지 않는다. 난간의 비상등 하나가 깜박이고 있다. 아이가 종이를 조금 더 높이 든다.",
          "“죽은 일을 없애 달라는 건 아니에요. 우리가 기다렸다고 적어 주세요.” 가끔 누가 멈춰 줄 자리와 스스로 지을 이름도 원한다고 한다. 빛을 고치거나 가까이 다가가 말을 받을 수 있다. 다음 답은 아직 종이에 적히지 않았다."
        ]
      }
    },
    "switch": {
      "id": "switch",
      "title": "0번선은 손으로 움직인다",
      "chapter": 3,
      "location": "정비 다리 진입 분기기",
      "art": 2,
      "mood": "danger",
      "text": [
        "분기 레버 사이에 젖은 낙엽과 돌이 끼어 있다. 한쪽 레일은 정상 노선으로, 다른 쪽은 강 위의 넓은 정비 다리로 뻗는다. 지도에서 지운 길은 청소 목록에서도 빠졌던 모양이다.",
        "무전에서 관제사의 재촉이 들린다. 돌을 걷어 낼 손, 비상 전원을 잇는 손이 필요하다. 전기를 끊고 천천히 고칠 수도 있다. 어떤 수고를 감수하느냐에 따라 다리에서 얻을 시간이 달라진다."
      ],
      "entities": [
        {
          "id": "lever",
          "label": "현장 분기 레버",
          "kind": "object",
          "aliases": [
            "레버",
            "분기기"
          ]
        },
        {
          "id": "relay",
          "label": "신호 릴레이",
          "kind": "object",
          "aliases": [
            "릴레이",
            "전원"
          ]
        },
        {
          "id": "bridge",
          "label": "강 위 정비 다리",
          "kind": "place",
          "aliases": [
            "다리"
          ]
        }
      ],
      "choices": [
        {
          "id": "clear-lever",
          "label": "돌을 걷어 내고 분기 레버를 함께 민다",
          "intent": "force",
          "target": "lever",
          "stat": "might",
          "dc": 12,
          "risk": "분기 레버가 부러지면 가까이 선 사람이 치명상을 입는다. 실패 시 체력 3을 잃어 사망할 수 있다.",
          "outcomes": {
            "critical": {
              "text": "균형추를 고정하고 레버를 밀자 레일과 보조 제동 장치가 함께 맞물린다. 윤이 재촉하던 견인 열차를 세우고 탑승문을 연다. 잠근 레버를 떠나 막차에 올라, 정비 다리 중앙에서 멎는 것을 본다.",
              "next": "bridge",
              "set": [
                "signal_open",
                "brake_safe"
              ],
              "pressure": -1
            },
            "success": {
              "text": "돌을 걷어 레버를 밀자 레일이 빈틈없이 맞물린다. 윤이 천천히 움직이기 전에 열린 문으로 막차에 오른다. 0번선을 따라 강 위로 들어가자 정비 다리 중앙에서 바퀴 소리가 멎는다.",
              "next": "bridge",
              "set": [
                "signal_open"
              ]
            },
            "failure": {
              "text": "힘을 받은 레버가 부러지고 균형추가 몸을 덮친다. 숨이 끊기는 동안 윤이 비상 제동으로 열차를 다리 입구에 붙여 세운다. 마지막 결정을 이어갈 수 있는 것은 살아남은 동료가 있을 때뿐이다.",
              "next": "bridge",
              "pressure": 2,
              "harm": 3,
              "unset": [
                "signal_open"
              ]
            },
            "fumble": {
              "text": "돌에 걸린 균형추가 끊어져 몸을 덮치고 레버까지 꺾는다. 관제의 비상 호출이 커지는 가운데 윤이 열차를 다리 입구에 겨우 세운다. 대답을 잃은 한 사람 곁에서, 이후의 선택은 살아남은 이에게 남는다.",
              "next": "bridge",
              "harm": 3,
              "pressure": 3,
              "unset": [
                "signal_open"
              ]
            }
          }
        },
        {
          "id": "relay-bridge",
          "label": "릴레이에 비상 전원을 연결한다",
          "intent": "use",
          "target": "relay",
          "stat": "wit",
          "dc": 12,
          "risk": "실패하면 전원이 감전으로 생명 1을, 대실패하면 생명 2를 잃는다. 이미 다친 일행은 전멸할 수 있다.",
          "outcomes": {
            "critical": {
              "text": "전원과 귀환선을 나누어 잇자 0번선과 후방 차단기가 함께 켜진다. 제동 전압도 곧아져 윤이 안심하고 탑승문을 연다. 릴레이에서 손을 떼고 막차에 올라, 정비 다리 중앙으로 들어간다.",
              "next": "bridge",
              "set": [
                "signal_open",
                "brake_safe"
              ],
              "pressure": -1
            },
            "success": {
              "text": "비상선을 물리자 신호등이 녹색으로 바뀐다. 윤의 탑승 손짓을 보고 막차에 올라 문을 닫는다. 열차가 0번선을 따라 강 위 정비 다리의 중앙으로 들어가 천천히 멎는다.",
              "next": "bridge",
              "set": [
                "signal_open"
              ]
            },
            "failure": {
              "text": "릴레이가 타며 차량 손잡이로 전류가 번져 일행이 쓰러진다. 윤이 차단기를 내리고 수동 제동을 잡는다. 충격을 견디고 차에 오른 뒤 다리 입구까지 이동하지만, 중앙으로 갈 분기는 열지 못했다.",
              "next": "bridge",
              "pressure": 2,
              "harmAll": 1,
              "unset": [
                "signal_open"
              ]
            },
            "fumble": {
              "text": "잘못 이은 귀환선의 전류가 손잡이마다 튀어 일행 모두가 크게 다친다. 윤이 외부 전원을 끊고 문을 열어 준다. 상처를 감싸며 막차에 오르자, 열차는 분기를 넘지 못하고 다리 입구에 멎는다.",
              "next": "bridge",
              "harmAll": 2,
              "pressure": 3,
              "unset": [
                "signal_open"
              ]
            }
          }
        },
        {
          "id": "insulated-relay",
          "label": "절연장갑을 끼고 전원을 차단한 뒤 릴레이를 맞춘다",
          "intent": "use",
          "target": "relay",
          "automatic": true,
          "useItems": [
            "insulated-gloves"
          ],
          "requires": {
            "item": "insulated-gloves"
          },
          "lockedHint": "화물칸의 정비원에게 절연장갑을 빌려야 전기를 끊는 동안 안전하게 손을 댈 수 있다.",
          "outcomes": {
            "success": {
              "text": "장갑 낀 손으로 전기를 끊고 릴레이를 천천히 맞춘다. 관제 재촉은 늘었어도 다친 사람 없이 0번선이 열린다. 장갑을 챙겨 윤이 연 문으로 막차에 오르자 열차가 정비 다리 중앙까지 들어간다.",
              "next": "bridge",
              "set": [
                "signal_open"
              ],
              "pressure": 1
            }
          }
        }
      ],
      "objective": "돌을 걷어 레버를 밀거나 전기를 맞춰 0번선을 연다.",
      "callbacks": [
        {
          "when": {
            "flag": "crew_helped"
          },
          "text": "정비원 백이 무전으로 레버의 잠금 핀 위치를 알려 준다. 그는 당신들이 자신을 도운 일을 잊지 않았다."
        },
        {
          "when": {
            "flag": "signal_open"
          },
          "text": "앞서 열어 둔 신호 덕분에 견인 열차가 같은 선로로 진입하지 못하고 있다."
        },
        {
          "when": {
            "flag": "solo_promised_return"
          },
          "text": "품 안의 신청서에는 다음 막차에도 돌아오겠다는 약속이 남아 있다. 아이가 먼저 적은 «기다림 마당» 바로 아래다."
        },
        {
          "when": {
            "flag": "group_lit_way"
          },
          "text": "뒤쪽 난간에 켜 둔 비상등이 아직 보인다. 아이의 신청서와 일행이 건너온 길이 같은 빛 아래 남아 있다."
        }
      ],
      "summary": "다리로 가는 레버에 돌이 끼었고 릴레이는 젖어 있다.",
      "stakes": "균형추에 깔리거나 감전될 수 있다. 절연장갑을 쓰면 시간을 들여 안전하게 고친다."
    },
    "bridge": {
      "id": "bridge",
      "title": "일곱 번째 승객의 하차 벨",
      "chapter": 4,
      "location": "새벽을 앞둔 강 위 정비 다리",
      "art": 3,
      "mood": "tension",
      "text": [
        "정비 다리에 멈춘 막차 곁으로 모래역의 윤곽이 겹친다. 작은 승강장, 닫힌 매표소, 아직 걷히지 않은 빨래. 창마다 어둠이 옅어진다. 관제사가 이번에는 명령하지 않고 묻는다. “행선지를 어떻게 적을까요?”",
        "장부를 지닌 채 정상 노선으로 돌아갈 수 있다. 다음 막차를 맡을 이름을 남길 수도 있다. 주민들과 새 이름을 약속했다면 그 서명을 건넬 차례다. 일곱 번째 하차 벨이 가만히 눌린 채 기다린다."
      ],
      "entities": [
        {
          "id": "request",
          "label": "최종 운행 요청서",
          "kind": "object",
          "aliases": [
            "요청서",
            "서류"
          ]
        },
        {
          "id": "conductor",
          "label": "차장 윤",
          "kind": "person",
          "aliases": [
            "차장",
            "윤"
          ]
        },
        {
          "id": "platform",
          "label": "강 위 임시 승강장",
          "kind": "place",
          "aliases": [
            "승강장",
            "정차"
          ]
        }
      ],
      "choices": [
        {
          "id": "new-stop",
          "label": "주민의 이름으로 «기다림 마당»을 등록한다",
          "intent": "choose",
          "target": "request",
          "automatic": true,
          "outcomes": {
            "success": {
              "text": "주민들이 지은 이름과 증인의 서명을 관제에 건넨다. 화면에 새 행선지가 뜨자 줄곧 눌려 있던 일곱 번째 하차 벨이 조용해진다. 윤이 그 이름을 처음으로 정차 안내에 넣어 읽는다.",
              "next": "ending-new-stop"
            }
          },
          "requires": {
            "flag": "signed"
          },
          "lockedHint": "연결 통로에서 주민 대표의 부탁을 듣고 «기다림 마당» 신청서에 서명해야 한다."
        },
        {
          "id": "take-living",
          "label": "살아 있는 승객을 먼저 귀가시키고 기록을 남긴다",
          "intent": "choose",
          "target": "conductor",
          "automatic": true,
          "outcomes": {
            "success": {
              "text": "장부는 가져가되 열차는 정상 노선으로 돌려 달라고 말한다. 윤이 방향을 바꾸고, 창에 겹친 동네가 조금씩 멀어진다. 다 들어주지 못한 부탁과 지워지지 않은 이름들이 같은 장부 안에 남는다.",
              "next": "ending-home"
            }
          }
        },
        {
          "id": "night-shift",
          "label": "다음 막차에도 0번선을 맡겠다고 이름을 남긴다",
          "intent": "choose",
          "target": "platform",
          "automatic": true,
          "outcomes": {
            "success": {
              "text": "다음 막차가 올 때도 연락할 수 있도록 이름과 번호를 적는다. 윤이 종이를 접어 명찰 뒤에 넣고, 관제에는 야간 운행을 청한다. 오늘의 귀가를 조금 미룬 자리에 다음 밤의 약속이 생긴다.",
              "next": "ending-shift"
            }
          }
        }
      ],
      "objective": "새 정차 장소를 등록하거나, 승객을 귀가시키거나, 다음 야간 운행을 맡는다.",
      "callbacks": [
        {
          "when": {
            "flag": "signal_open"
          },
          "text": "현장 분기를 제대로 열어 막차는 정비 다리 중앙에 멈춰 있다. 차장 윤은 일행이 결정을 마칠 때까지 제동을 유지한다."
        },
        {
          "when": {
            "notFlag": "signal_open"
          },
          "text": "분기를 끝까지 열지 못해 막차는 정비 다리 입구에서 비상 제동으로 멈춘 상태다. 차장 윤이 열차를 붙잡는 동안 일행은 운행 결정을 내려야 한다."
        },
        {
          "when": {
            "flag": "broadcast"
          },
          "text": "관제사는 이미 녹음된 주민들의 이름을 앞에 놓고 있다. «해당 없음»이라는 버튼은 더 이상 누를 수 없다고 말한다."
        },
        {
          "when": {
            "flag": "brake_safe"
          },
          "text": "보존한 제동 장치가 열차를 안정적으로 잡고 있다. 적어도 이 결정을 내리는 동안 누구도 문밖으로 밀려나지 않는다."
        }
      ],
      "resurrection": {
        "label": "귀가 장부에 동료의 이름을 다시 부른다",
        "text": "이 열차에서 목숨을 잃은 사람은 마지막 표에 잠시 머문다. 살아 있는 동료가 장부의 이름을 부르고 자기 귀가 시간을 나눠 주면, 잃어버린 몸을 되찾을 기회가 생긴다. 운명 1개와 관제 경계 2를 지불하고 판정한다.",
        "sparkCost": 1,
        "pressureCost": 2,
        "dc": 12
      },
      "summary": "막차가 정비 다리에 멈췄다. 관제사가 행선지를 기다린다.",
      "stakes": "주민들과 이름에 합의하지 않았다면 새 정차 장소를 대신 등록할 수 없다."
    },
    "ending-new-stop": {
      "id": "ending-new-stop",
      "title": "모두를 위한 임시 정차",
      "chapter": 4,
      "art": 3,
      "mood": "hope",
      "ending": true,
      "text": [
        "역명 목록 맨 아래에 «기다림 마당 — 임시 정차»가 들어간다. 강가의 작은 벤치에는 스물아홉 이름이 새겨진다. 창에 겹쳐 있던 동네는 가게 불을 하나씩 끄고, 마지막 창까지 어둠 대신 아침을 비춘다.",
        "살아 있는 승객들이 첫차에 오른다. 윤의 인사는 전보다 작고 쉰 목소리다. 빌린 목소리를 내려놓은 것이다. 일행이 남긴 신청서 옆에서 휴대전화가 도착 예정 시각을 알린다. 목적지 칸에 오류는 없다."
      ],
      "epilogues": [
        {
          "when": {
            "flag": "meal_shared"
          },
          "text": "학생의 도시락통은 깨끗이 비어 있다. 수저는 정확히 스물아홉 개, 식탁 위에 가지런히 놓였다."
        },
        {
          "when": {
            "flag": "broadcast"
          },
          "text": "관제사는 사건 보고서 제목을 직접 고친다. «미확인 물체» 대신 «늦게 접수된 귀가 요청»이라고 썼다."
        },
        {
          "when": {
            "flag": "solo_heard_ticket"
          },
          "text": "윤은 처음 이름을 불렀던 작은 목소리를 기억한다. 검표기가 다시 울리면, 이번에는 빈자리 쪽에도 귀를 기울인다."
        },
        {
          "when": {
            "flag": "group_held_door"
          },
          "text": "객차 문에 작은 흠집이 남았다. 윤은 그 문을 닫기 전에 뒤를 한 번 더 본다. 누군가 탈 틈을 몸으로 벌어 주었던 밤 때문이다."
        },
        {
          "when": {
            "flag": "solo_promised_return"
          },
          "text": "아이의 신청서에는 다음 막차에도 찾아오겠다는 한 줄이 남아 있다. 이름을 고른 날의 글씨 옆에, 한 여행자가 건 약속도 지워지지 않는다."
        },
        {
          "when": {
            "flag": "group_lit_way"
          },
          "text": "고쳐 켠 비상등은 다음 밤에도 난간을 비춘다. 그 불을 보는 사람은 누가 켰는지 몰라도 어둠 속 손잡이를 찾을 수 있다."
        }
      ],
      "question": "여러분이 함께 서명한 정차 장소에, 무엇을 가장 먼저 놓고 싶나요?",
      "choices": []
    },
    "ending-home": {
      "id": "ending-home",
      "title": "살아 있는 사람들의 첫차",
      "chapter": 4,
      "art": 3,
      "mood": "hope",
      "ending": true,
      "text": [
        "정상 노선에 접어들자 축축하던 일곱 번째 표가 마른다. 창밖의 주민들은 열차를 붙잡지 않는다. 행선지는 정하지 못했지만, 그들의 이름을 품은 장부는 함께 움직이고 있다.",
        "첫차에는 졸린 사람들이 앉아 있다. 누군가 말없이 자리를 내준다. 아침에 장부를 받은 철도 기록관 직원이 마지막 칸에서 펜을 멈춘다. “도착 시간은 비워 둘까요?” 빈칸을 오류로 지우기 전에, 이번에는 사람에게 묻는다."
      ],
      "epilogues": [
        {
          "when": {
            "flag": "names_kept"
          },
          "text": "주민 이름들이 오탈자 없이 복원된다. 사라진 동네의 마지막 주소가 기록관의 주소 목록에 돌아온다."
        },
        {
          "when": {
            "flag": "signed"
          },
          "text": "주민들이 직접 지은 «기다림 마당»이라는 이름은 정식 역 대신 강가 추모 벤치의 이름이 된다."
        },
        {
          "when": {
            "flag": "solo_heard_ticket"
          },
          "text": "윤은 처음 이름을 불렀던 작은 목소리를 기억한다. 검표기가 다시 울리면, 이번에는 빈자리 쪽에도 귀를 기울인다."
        },
        {
          "when": {
            "flag": "group_held_door"
          },
          "text": "객차 문에 작은 흠집이 남았다. 윤은 그 문을 닫기 전에 뒤를 한 번 더 본다. 누군가 탈 틈을 몸으로 벌어 주었던 밤 때문이다."
        },
        {
          "when": {
            "flag": "solo_promised_return"
          },
          "text": "아이의 신청서에는 다음 막차에도 찾아오겠다는 한 줄이 남아 있다. 이름을 고른 날의 글씨 옆에, 한 여행자가 건 약속도 지워지지 않는다."
        },
        {
          "when": {
            "flag": "group_lit_way"
          },
          "text": "고쳐 켠 비상등은 다음 밤에도 난간을 비춘다. 그 불을 보는 사람은 누가 켰는지 몰라도 어둠 속 손잡이를 찾을 수 있다."
        }
      ],
      "question": "안전한 귀가를 선택한 뒤에도 여러분이 끝까지 맡고 싶은 약속은 무엇인가요?",
      "choices": []
    },
    "ending-shift": {
      "id": "ending-shift",
      "title": "0번선 야간 근무자 모집",
      "chapter": 4,
      "art": 3,
      "mood": "hope",
      "ending": true,
      "text": [
        "임시 운행표에 다음 막차의 시각을 적는다. 관제사는 한참 뒤 야간 수당 신청서를 보내 온다. “도와주시는 건 고마운데, 출근 기록은 남겨 주셔야 합니다.” 0번선 옆에 첫 근무자의 이름이 놓인다.",
        "주민들이 매일 나타나는 것은 아니다. 누군가 잊힌 주소를 찾는 밤이면 하차 벨이 울린다. 일행이 남긴 연락처로 짧은 알림이 오고, 강 위 신호등이 켜진다. 그 길을 다시 열어 두겠다는 선택은 다음 밤에도 이어진다."
      ],
      "epilogues": [
        {
          "when": {
            "flag": "crew_helped"
          },
          "text": "정비원 백이 다음 근무표에 이름을 올린다. 수동 레버를 매번 혼자 밀게 두지는 않겠다는 뜻이다."
        },
        {
          "when": {
            "flag": "meal_shared"
          },
          "text": "학생은 근무자 도시락을 맡는다. 이번에는 살아 있는 사람 수에 맞춰 수저를 챙기다가, 결국 한 개를 더 넣는다."
        },
        {
          "when": {
            "flag": "solo_heard_ticket"
          },
          "text": "윤은 처음 이름을 불렀던 작은 목소리를 기억한다. 검표기가 다시 울리면, 이번에는 빈자리 쪽에도 귀를 기울인다."
        },
        {
          "when": {
            "flag": "group_held_door"
          },
          "text": "객차 문에 작은 흠집이 남았다. 윤은 그 문을 닫기 전에 뒤를 한 번 더 본다. 누군가 탈 틈을 몸으로 벌어 주었던 밤 때문이다."
        },
        {
          "when": {
            "flag": "solo_promised_return"
          },
          "text": "아이의 신청서에는 다음 막차에도 찾아오겠다는 한 줄이 남아 있다. 이름을 고른 날의 글씨 옆에, 한 여행자가 건 약속도 지워지지 않는다."
        },
        {
          "when": {
            "flag": "group_lit_way"
          },
          "text": "고쳐 켠 비상등은 다음 밤에도 난간을 비춘다. 그 불을 보는 사람은 누가 켰는지 몰라도 어둠 속 손잡이를 찾을 수 있다."
        }
      ],
      "question": "첫 공동 야간 근무에서 가장 먼저 정할 규칙은 무엇인가요?",
      "choices": []
    }
  },
  "deathEnding": {
    "title": "하차하지 못한 이름들",
    "art": 2,
    "mood": "danger",
    "text": [
      "차장 윤이 검표기를 내려놓고 한 사람씩 부른다. 어느 객차에서도 대답이 없다. 마지막 창에 일행의 이름들이 떠오르고, 주인 없는 표에 «도착 미확인» 도장이 찍힌다. 호출음만 한 번 더 울린다.",
      "막차는 응답하지 않는 승차권을 싣고 어둠으로 들어간다. 장부에는 이 밤에 누군가 질문을 멈추지 않았다는 흔적이 남는다. 그러나 이번 일행 가운데 그 페이지를 살아 있는 도시로 가져갈 사람은 없다."
    ],
    "question": "마지막 위험 앞에서, 다음 일행에게 어떤 단서나 경고를 남기고 싶나요?"
  },
  "items": {
    "ticket-note": {
      "name": "단체 승차권 메모",
      "description": "승객명이 «모래역 일동»으로 적힌 표를 옮겨 적은 메모. 한 사람의 표가 아니라는 증거다.",
      "useHint": "차장실에서 귀가 장부와 대조하면 관제에 정식 요청을 접수할 수 있다.",
      "legacyClues": [
        "ticket"
      ]
    },
    "insulated-gloves": {
      "name": "철도용 절연장갑",
      "description": "정비원이 전기 작업에 쓰는 두꺼운 장갑. 젖은 차량의 릴레이를 만질 때 전류를 막아 준다.",
      "useHint": "현장 분기기에서 전원을 먼저 끊고 안전하게 레일을 전환할 수 있다."
    },
    "brake-pin": {
      "name": "제동기 예비 잠금핀",
      "description": "자동 고정 장치의 빈 구멍에 맞는 철제 핀 한 개. 설치에 성공하든 망가지든 한 번 쓰면 회수하지 못한다.",
      "useHint": "비상 제동실의 고정 장치를 쓰려면 먼저 이 핀을 챙겨야 한다.",
      "consumable": true
    }
  },
  "playModes": {
    "solo": "혼자라면 표의 승객명에 먼저 말을 걸고, 다음 막차에도 찾아오겠다는 약속을 건넬 수 있습니다.",
    "group": "여럿이라면 닫히는 문을 붙들거나 비상등을 밝혀 동료들이 지나갈 길을 지킬 수 있습니다."
  }
};
export default campaign;
