// Original authored scenario for Chronicle Gate v17.
// Stable scene/choice IDs preserve old saves. Every risky action has four explicit outcomes.
const campaign = {
  "id": "last-train",
  "title": "막차의 일곱 번째 승객",
  "subtitle": "요금은 냈습니다. 존재는 아직 확인 중입니다.",
  "genre": "도시 괴담 · 협상 추리",
  "accent": "#c28b67",
  "description": "막차의 검표기는 단체 승객을 일곱 명으로 세지만 눈앞에는 여섯 명뿐이다. 사라진 마을의 귀가 요청을 추적하며, 현재의 승객을 지키고 잊힌 사람들에게 어떤 도착지를 마련할지 결정한다.",
  "estimatedMinutes": "35–60",
  "contentNotes": [
    "실종",
    "재난의 기억",
    "가벼운 공포"
  ],
  "objective": "일곱 번째 승객의 정체를 확인하고, 살아 있는 승객들이 무사히 내릴 방법을 정한다.",
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
    "names_kept": "사라진 주민 이름을 기록했다"
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
        "막차에 타려던 당신들을 차장 윤이 잠시 붙잡는다. 먼저 검표한 단체 손님은 여섯 명인데, 그들의 승차권에는 일곱 명이라고 적혀 있다. 당신들은 이 단체에 포함되지 않는다. “한 분이 안 보입니다. 같이 찾아 주시겠습니까?”",
        "노란 안전선 밑에서 낡은 표 한 장이 미끄러져 나온다. 승객명은 «모래역 일동», 도착지는 오래전에 폐쇄된 모래역이다. 표의 발행 날짜만 오늘이다. 차장의 기록을 확인하거나, 바로 옆 매점에 남은 옛 노선도를 살펴볼 수 있다."
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
              "text": "차장 윤은 표뿐 아니라 누락 신고서도 보여 준다. 같은 단체명이 반복된 사실을 함께 확인하자 그는 관제의 오인 신고를 철회한다. 메모를 챙긴 일행은 윤의 안내로 객차에 올라 직접 승객을 살펴본다.",
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
              "text": "차장은 빈칸을 손으로 가린다. 당신이 기다리자 손을 치운다. 승객명은 사람이 아니라 «모래역 일동»이다.",
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
              "text": "차장이 표를 숨기다 매점 쪽 검표기와 부딪힌다. 영수증이 길게 뽑혀 나오고, 그는 황급히 회수하러 간다. 당신들은 그 뒤를 따른다.",
              "next": "kiosk",
              "pressure": 1
            },
            "fumble": {
              "text": "표를 넘겨받다가 검표기의 비상 호출을 누른다. 관제는 일행을 무단 승차자로 기록하고 윤을 무전으로 붙잡는다. 그는 매점 검표기에 같은 기록이 남는다며 그곳에서 먼저 확인하라고 손짓한다.",
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
              "text": "비를 피하려고 매점 처마 밑으로 들어가자, 철거된 역 이름이 유리창 안쪽에서 비친다.",
              "next": "kiosk"
            }
          }
        }
      ],
      "dialogue": {
        "who": "차장 윤",
        "text": "사람을 셀 때는 이름부터 확인하십시오. 얼굴은 가끔 틀립니다."
      },
      "objective": "표의 승객명을 확인하거나 매점의 옛 기록을 찾는다.",
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
      "summary": "단체 표에는 일곱 명이 적혀 있는데, 차장 앞에는 여섯 명만 있다.",
      "stakes": "지체하거나 신원을 속이면 관제가 일행을 수상하게 여긴다."
    },
    "carriage": {
      "id": "carriage",
      "title": "바닥에서 뛰는 심장",
      "chapter": 1,
      "location": "마지막 객차",
      "art": 1,
      "mood": "mystery",
      "text": [
        "당신들 앞에서 검표받은 단체 승객은 여섯인데, 그들의 좌석 구역 표시등은 일곱 개가 켜져 있다. 당신이 통로를 건널 때마다 바닥 아래에서 느린 심장박동이 따라온다. 창밖은 터널인데 창에 비친 풍경은 낮의 작은 동네다.",
        "학생이 도시락 뚜껑을 열자 빈 좌석들에서 일제히 젓가락 소리가 난다. 차장은 종이 인원표와 센서 화면을 번갈아 본다. “기계가 고장 난 건지, 제가 세는 단위가 틀린 건지 모르겠습니다.”"
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
              "text": "사람의 체온과 바닥의 체온을 따로 표시하자, 바닥의 신호가 화물칸 분실물과 같은 번호를 내보낸다. 차장에게 측정 오류가 아님을 설명해 신뢰도 얻는다. 일행은 그 번호를 따라 화물칸으로 간다.",
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
              "text": "일곱 번째 체온은 한 좌석이 아니라 객차 바닥 전체에 퍼져 있다. 센서는 정확했다. 승객의 형태가 다를 뿐이다.",
              "next": "baggage",
              "clues": [
                "roster"
              ]
            },
            "failure": {
              "text": "센서가 경고음을 울린다. 학생이 당황해 도시락을 쏟자 빈 좌석의 그림자들이 식당 칸으로 움직인다.",
              "next": "dining",
              "pressure": 1
            },
            "fumble": {
              "text": "진단 화면을 켜다 침입 경보까지 울린다. 차장은 센서를 잠그고 관제에 긴급 점검을 요청한다. 식당 쪽에서 수저 소리가 커지자 학생이 다른 흔적을 보여 주겠다며 일행을 데려간다.",
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
              "text": "당신이 수저를 하나 더 챙기자 학생이 조용히 다섯 개를 더 꺼낸다. 준비한 수저가 너무 많다.",
              "next": "dining"
            }
          }
        }
      ],
      "objective": "센서를 조사하거나 학생을 따라 식당 칸으로 간다.",
      "details": [
        {
          "id": "empty-seat",
          "label": "빈 좌석의 승객 표시를 확인한다",
          "text": "빈 좌석은 오류가 아니다. 일곱 번째 체온은 열차 바닥 전체에 퍼져 있다.",
          "clue": "roster"
        }
      ],
      "summary": "일곱 번째 승객의 체온이 빈 좌석이 아니라 객차 바닥 전체에서 잡힌다.",
      "stakes": "센서를 무리하게 조작하면 경보가 울리지만 다른 조사 경로는 남는다."
    },
    "kiosk": {
      "id": "kiosk",
      "title": "폐역 신문은 아직 축축했다",
      "chapter": 1,
      "location": "승강장 매점과 검표기",
      "art": 0,
      "mood": "calm",
      "text": [
        "매점 문을 미는 순간 막차의 마지막 연결 통로가 이쪽으로 길게 늘어난다. 열차는 출발하지 않는다. 누군가 이곳을 기다리는 동안에는 떠날 수 없는 듯하다.",
        "유리 안에는 «모래역 주민 구조 완료»라는 오래된 신문이 걸려 있다. 신문 아래 연체 요금표는 오늘 날짜다. 검표기는 «귀가 미완료»를 반복해 인쇄한다. 그 소리를 듣고 도시락을 든 학생이 열차 연결 통로에서 다가온다. 그는 신문에 적힌 모래역을 보고 멈춰 선다."
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
              "text": "영수증에 찍힌 화물 번호 아래서 폐역 당시의 누락 명단까지 찾아낸다. 주민 이름과 단체 표를 같은 종이에 베껴 둔다. 이 기록의 주인들이 남긴 물건을 찾으러 열차에 연결된 화물칸으로 간다.",
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
              "text": "영수증 끝에 화물 보관 번호가 찍혀 있다. 모래역 주민의 물건들이 오늘까지 찾아갈 사람을 기다리고 있다.",
              "next": "baggage",
              "clues": [
                "paper"
              ]
            },
            "failure": {
              "text": "기계에서 종이 대신 도시락 영수증이 나온다. 수령 장소는 식당 칸이다. 마침 학생이 당신들을 손짓해 부른다.",
              "next": "dining",
              "clues": [
                "parcel"
              ],
              "pressure": 1
            },
            "fumble": {
              "text": "검표기가 영수증을 회수하며 일행의 얼굴을 관제로 전송한다. 종이는 놓쳤지만 식당 칸으로 배달된 도시락의 수령 번호만은 남는다. 학생이 그 주문을 알아보고 일행을 식당으로 안내한다.",
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
              "text": "신문을 떼자 뒷면에서 아이들이 그린 도시락 그림이 드러난다. 학생은 그 그림을 보고 입술을 깨문다.",
              "next": "dining",
              "clues": [
                "paper"
              ]
            }
          }
        }
      ],
      "objective": "영수증의 보관 번호나 학생이 아는 사연을 확인한다.",
      "details": [
        {
          "id": "read-paper",
          "label": "폐역 신문을 자세히 읽는다",
          "text": "기사에는 구조 완료라고 적혀 있지만, 마지막 열차의 탑승 명단은 공란이다.",
          "clue": "paper"
        }
      ],
      "summary": "폐쇄된 모래역의 신문과 오늘 날짜의 귀가 영수증이 같은 매점에 남아 있다.",
      "stakes": "검표기에 무리하게 접근하면 관제에 출입 기록이 남는다."
    },
    "dining": {
      "id": "dining",
      "title": "도시락 하나, 수저 스물아홉 개",
      "chapter": 2,
      "location": "불 꺼진 식당 칸",
      "art": 1,
      "mood": "calm",
      "text": [
        "학생은 도시락을 식탁 정중앙에 놓는다. “우리 아빠가 여기서 식당을 했어요. 그런데 저는 이 역에 가 본 적이 없어요.” 빈 의자들이 조금씩 당겨지고, 창에 비친 동네 가게들이 하나둘 불을 켠다.",
        "주문 전표에는 손님이 남긴 요청이 있다. «양은 괜찮아요. 수저만 넉넉하게.» 누군가 돌아오려는 것이 아니라, 기다렸다는 사실을 함께 먹으며 확인하고 싶었던 것 같다."
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
              "text": "빈자리마다 수저를 놓고 이름을 하나씩 되묻자 스물아홉 사람이 차례를 지켜 답한다. 학생이 받아 적은 이름을 차장에게 보내니 관제도 소란이 아니라 진술로 접수한다. 이름과 주문 전표를 들고 차장실로 간다.",
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
              "text": "수저 스물아홉 개가 한 번씩 식탁을 두드린다. 학생은 처음 듣는 이름들을 따라 읽는다. 차장실 문이 안쪽에서 열린다.",
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
              "text": "식탁이 떨리자 학생이 비상 통화기를 누른다. 차장 윤이 달려와 수저 수를 보고 말을 멈춘 뒤, 장부를 보자고 한다.",
              "next": "ledger",
              "clues": [
                "parcel"
              ],
              "pressure": 2
            },
            "fumble": {
              "text": "마지막 이름을 다 듣기 전에 수저를 거두자 식탁이 거세게 흔들린다. 학생은 비상 통화기를 누르고 주민들의 대답은 끊긴다. 차장 윤이 모두를 진정시킨 뒤, 추측을 멈추고 원래 요청 장부부터 보자며 차장실로 데려간다.",
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
              "text": "식당의 개업 연도와 주문 번호까지 맞춰 묻자 계산대가 마지막 주문 원장을 출력한다. 학생은 능청스러운 점검에 웃고, 장부에는 도시락을 같이 먹었다는 표시까지 남는다. 차장실에 원장을 가져가 승객 기록과 대조한다.",
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
              "text": "낡은 계산대가 갑자기 영수증을 출력한다. 위생 점수는 엉망이지만 마지막 주문자 명단은 완벽하다. 차장실 장부와 대조할 수 있다.",
              "next": "ledger",
              "clues": [
                "parcel"
              ],
              "set": [
                "names_kept"
              ]
            },
            "failure": {
              "text": "계산대가 당신에게 위생 교육 이수증을 요구한다. 차장이 한숨을 쉬며 신원 조회 대신 차장실 동행을 제안한다.",
              "next": "ledger",
              "pressure": 1
            },
            "fumble": {
              "text": "계산대가 가짜 점검원을 신고하고 위생 교육 미이수 경보까지 울린다. 학생도 허풍을 알아채 더는 주문자를 대신 설명하지 않는다. 차장이 직접 사실을 확인시키겠다며 일행을 차장실로 데려간다.",
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
      "objective": "손님들의 이름이나 마지막 주문 내역을 알아낸다.",
      "details": [
        {
          "id": "meal-receipt",
          "label": "도시락 주문 전표를 읽는다",
          "text": "오늘 저녁에 주문됐다. 요청 사항에는 음식보다 수저를 넉넉히 달라고 적혀 있다.",
          "clue": "parcel"
        }
      ],
      "summary": "보이지 않는 손님들이 도시락 주위에 모여 있다.",
      "stakes": "학생을 겁주거나 허풍이 들통나면 차장이 관제에 도움을 요청한다."
    },
    "baggage": {
      "id": "baggage",
      "title": "분실물에 주인이 너무 많다",
      "chapter": 2,
      "location": "화물 보관칸",
      "art": 1,
      "mood": "mystery",
      "text": [
        "화물칸 선반에는 우산 한 개, 신발 한 짝, 생일 초 한 묶음이 있다. 물건마다 주인 이름이 빼곡하다. 우산 하나에 열일곱 이름이 적힌 것은 기록 실수가 아니다. 주민들이 비 오는 날마다 돌려 쓰던 우산이다.",
        "전선이 열린 배선함 옆에서 철도 정비원 백이 손전등을 켠다. 그는 차장실로 가는 전원이 끊겼다며 도움을 청한다. “먼저 차단기를 내리고 붙잡아 주세요. 이름을 찾으러 왔다가 이름표만 남기진 맙시다.” 옆 공구함에는 빌릴 수 있는 절연장갑이 있다."
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
              "text": "차단부터 확인하고 전원선을 받쳐 주자 백이 끊어진 선과 보조 퓨즈까지 교체한다. 그는 수동 분기 지도와 절연장갑을 빌려 주며 관제의 고장 신고도 취소한다. 전원이 돌아온 차장실로 함께 간다.",
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
              "text": "당신이 선을 고정하자 정비원이 연결핀을 꽂는다. 그는 수동 분기 지도를 건네며 차장실에 같이 가겠다고 한다.",
              "next": "ledger",
              "set": [
                "crew_helped"
              ],
              "clues": [
                "map"
              ]
            },
            "failure": {
              "text": "전원이 꺼진다. 정비원이 수동 손전등으로 당신들을 차장실에 안내한다. 전자 장부 대신 종이 원본을 꺼내야 한다.",
              "next": "ledger",
              "pressure": 2
            },
            "fumble": {
              "text": "선을 고정하기 전에 차단기가 다시 올라가 손끝으로 전류가 흐른다. 백이 즉시 전원을 끊지만 당신은 생명 1을 잃고 객차 전등도 꺼진다. 그는 손전등으로 일행을 차장실에 안내해 종이 장부를 꺼낸다.",
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
              "text": "물건마다 다른 글씨체를 구분해 이름을 정확히 읽자 관제사가 녹음 번호를 불러 준다. 정비원 백도 분실물 정리에 합류해 이후 작업을 돕겠다고 한다. 원본 이름표를 지키기 위해 모두 차장실로 이동한다.",
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
              "text": "이름마다 객차의 그림자가 고개를 든다. 마지막 이름에 차장 윤이 응답하며 그 이름표를 들고 차장실로 오라고 한다. 거기에 보관한 귀가 장부 원본과 대조하려는 것이다.",
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
              "text": "방송이 음악으로 바뀐다. 그래도 차장은 당신들이 들고 있는 이름표를 알아보고 차장실로 안내한다.",
              "next": "ledger",
              "pressure": 1
            },
            "fumble": {
              "text": "한 물건의 별명을 사람 이름으로 잘못 읽는다. 관제는 방송을 허위 호출로 판단해 회선을 끊고, 일행이 이미 남긴 이름도 재확인 대상으로 돌린다. 차장이 원본을 다시 대조하자며 차장실로 부른다.",
              "next": "ledger",
              "pressure": 3,
              "unset": [
                "broadcast"
              ]
            }
          }
        }
      ],
      "objective": "주민 이름을 확보하거나 정비원을 도와 차장실로 간다.",
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
      "summary": "모래역 주민들의 분실물과 차장실로 이어지는 끊어진 전원선이 있다.",
      "stakes": "차단하지 않은 전선을 잘못 잡으면 감전되고 경보가 울린다."
    },
    "ledger": {
      "id": "ledger",
      "title": "괴담의 결재란",
      "chapter": 2,
      "location": "차장실",
      "art": 1,
      "mood": "tension",
      "text": [
        "차장 윤이 귀가 요청 장부를 펼친다. 모래역 주민 스물아홉 명은 재난 때 대피 열차를 기다렸지만 끝내 타지 못했다. 구조 완료 도장이 찍히면서 그들의 요청도 오류로 밀려났다. 오늘의 막차는 그 미완료 요청을 한 묶음의 승객으로 받아들였다.",
        "윤은 자기 명찰 밑에 겹쳐진 여러 이름을 보여 준다. 그는 주민들의 목소리를 빌려 이 요청을 수행하는 차장이다. “살아 있는 승객을 먼저 보내도 됩니다. 주민들이 내릴 곳을 만들려면 다른 선로가 필요하고요.” 그는 장부 사본과 제동실 열쇠를 내놓는다."
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
              "text": "귀가 장부 사본과 제동실 열쇠를 챙긴다. 차장 윤은 막차가 사라지기 전에 손잡이를 고정해야 한다며 비상 제동실로 안내한다.",
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
              "text": "귀가 장부 사본을 챙긴다. 차장 윤이 정비 다리의 0번선이라면 정규 노선 밖에서도 멈출 수 있다고 설명하고, 일행을 수동 신호실로 안내한다.",
              "next": "signal",
              "clues": [
                "ledger"
              ]
            }
          }
        },
        {
          "id": "match-ticket",
          "label": "승차권 메모와 장부를 맞춰 정식 귀가 요청을 접수한다",
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
              "text": "표의 단체명과 장부의 스물아홉 이름이 같은 요청임을 확인한다. 차장 윤이 관제에 증거를 보내자 경계가 한 단계 누그러진다. 이제 정차 허가를 받기 위해 신호실로 간다.",
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
      "objective": "제동 장치를 확보할지, 새 정차 노선을 열지 결정한다.",
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
      "summary": "모래역 주민들의 대피 요청이 오류 처리된 채 장부에 남아 있다.",
      "stakes": "주민의 목적지를 정하기 전에도 현재 승객을 지킬 제동 수단은 필요하다."
    },
    "brake": {
      "id": "brake",
      "title": "제동 손잡이를 고정해야 한다",
      "chapter": 3,
      "location": "비상 제동실",
      "art": 2,
      "mood": "tension",
      "text": [
        "비상 제동 손잡이를 당기면 막차는 속도를 줄인다. 하지만 손을 놓으면 제동이 풀린다. 차장 윤은 손잡이를 붙잡은 채, 고정 장치의 핀 구멍과 수동 잠금 홈을 가리킨다. 공구함에는 아직 쓰지 않은 예비 잠금핀 한 개가 있다.",
        "벽에는 «임시 정차 규정»이라는 낡은 책이 걸려 있다. 주민 대표가 새 행선지를 정하고 살아 있는 증인이 서명하면 폐역의 요청도 접수할 수 있다는 내용이다. 붉은 덮개의 동력 역전기는 빠른 지름길이지만 타이밍을 틀리면 마지막 객차가 탈선한다."
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
              "text": "잠금핀을 홈 끝까지 넣어 고정 장치와 보조 잠금쇠를 함께 걸었다. 차장 윤도 손잡이에서 손을 뗄 수 있게 된다. 관제에 안정된 제동 수치를 보내 경계를 낮춘 뒤, 규정집을 챙겨 정비 터널로 간다.",
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
              "text": "손잡이가 안정적으로 고정된다. 모두 함께 앞칸으로 갈 수 있고, 규정집에서 임시 정차 조건도 확인한다.",
              "next": "tunnel",
              "set": [
                "brake_safe"
              ],
              "clues": [
                "protocol"
              ]
            },
            "failure": {
              "text": "핀을 끝까지 넣지 못해 장치가 부러진다. 소모된 핀은 꺼낼 수 없다. 차장 윤이 손잡이를 대신 잡아 속도를 낮추고, 일행은 규정집을 들고 터널 통로로 이동한다.",
              "next": "tunnel",
              "clues": [
                "protocol"
              ],
              "pressure": 2
            },
            "fumble": {
              "text": "핀이 비스듬히 들어가 부러지고 고정 장치가 손등을 친다. 생명 1을 잃었고 핀은 회수할 수 없다. 차장 윤이 손잡이를 대신 붙잡는 동안, 일행은 규정집을 챙겨 터널 쪽 통로로 이동한다.",
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
          "label": "일행이 힘을 합쳐 손잡이를 잠금 홈에 밀어 넣는다",
          "intent": "force",
          "target": "brake",
          "stat": "might",
          "dc": 12,
          "risk": "실패하면 손잡이에 맞아 생명 2를, 대실패하면 생명 3을 잃는다. 체력이 떨어진 사람은 사망할 수 있다.",
          "outcomes": {
            "critical": {
              "text": "손잡이를 한 번에 밀지 않고 힘을 나눠 잠금 홈에 맞춘다. 예비 고정 장치도 건드리지 않아 잠금핀을 챙길 여유가 생겼다. 차장이 제동 수치를 관제에 보낸 뒤 규정집을 건네고, 일행은 터널 통로로 간다.",
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
              "text": "잠금 홈이 오래된 방식 그대로 맞물린다. 차장은 벽의 규정집을 챙기고 당신들과 앞으로 간다.",
              "next": "tunnel",
              "set": [
                "brake_safe"
              ],
              "clues": [
                "protocol"
              ]
            },
            "failure": {
              "text": "잠금 홈이 부러지며 손잡이가 당신을 세게 친다. 차장이 제동을 붙잡고 동료들이 부상자를 통로로 옮긴다. 규정집은 지켰지만 대가가 컸다.",
              "next": "tunnel",
              "clues": [
                "protocol"
              ],
              "pressure": 2,
              "harm": 2
            },
            "fumble": {
              "text": "잠금 홈이 깨지며 손잡이가 흉곽을 짓누른다. 생명 3을 잃는다. 차장은 비상 완충기를 걸어 열차를 늦추고, 동료들이 당신과 규정집을 터널 쪽으로 옮긴다. 혼자였다면 이곳에서 여정이 끝난다.",
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
              "text": "차륜과 동력축의 속도를 정확히 맞춰 역전한다. 객차는 충격 없이 멎고, 차장 윤이 안정된 제동 수치를 관제에 전송해 견인 요청까지 철회시킨다. 규정집을 챙겨 분기기로 직행한다. 주민 대표의 부탁을 듣는 구간은 지나친다.",
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
              "text": "일행이 잡은 비상선에 맞춰 동력축이 정확히 반대로 돈다. 객차가 조용히 멎고 정비 통로가 분기기 바로 앞에 열린다. 관제의 추적 신호까지 끊어 시간을 벌었다.",
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
              "text": "역전이 한 박자 늦어 객차가 크게 흔들리고 일행 모두 생명 2를 잃는다. 비상 완충기가 버텨 탈선은 피했지만 지름길은 막혔다. 일행은 차장에게 규정집을 받아 정비 터널 통로로 이동한다.",
              "next": "tunnel",
              "harmAll": 2,
              "clues": [
                "protocol"
              ],
              "pressure": 2
            },
            "fumble": {
              "text": "역전된 동력축이 잠기지 못해 마지막 객차를 선로 밖으로 비튼다. 일행 전원이 객차와 함께 아래로 추락해 생명 3을 잃는다. 차장 윤의 호출에 대답할 동료가 남지 않는다. 이번 막차의 여정은 여기서 끝난다.",
              "next": "tunnel",
              "harmAll": 3,
              "pressure": 3
            }
          }
        }
      ],
      "objective": "잠금핀을 써서 장치를 고정하거나 손으로 잠금 홈을 맞춘다.",
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
      "summary": "막차를 안전하게 멈출 손잡이가 고정되지 않은 상태다.",
      "stakes": "손잡이에 끼이면 다친다. 동력 역전 지름길은 실패 시 전원이 다치고 대실패 시 전멸한다."
    },
    "signal": {
      "id": "signal",
      "title": "공무원에게도 유령은 민원이다",
      "chapter": 3,
      "location": "수동 신호실",
      "art": 2,
      "mood": "tension",
      "text": [
        "신호실 전화가 먼저 울린다. 관제사는 사고를 막으려는 사람답게 단호하다. “존재하지 않는 역에 정차하면 안 됩니다.” 당신들 눈앞의 종이 지도에는 존재하지 않는 역들이 아주 많이 남아 있다.",
        "벽의 «임시 정차 규정»에는 주민 대표와 살아 있는 증인의 서명이 필요하다고 적혀 있다. 옆 지도에는 강 위 정비 다리의 0번선이 표시돼 있다. 전산에서는 지워졌지만 수동 신호기는 아직 그 선로에 연결돼 있다."
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
              "text": "폐역 여부와 승객의 존재는 다른 문제라고 조목조목 설명한다. 관제사는 임시 정차 규정을 읽고 0번선을 연 뒤, 뒤따르던 견인 열차까지 멈춘다. 지도와 접수 번호를 챙겨 터널 통로의 주민 대표를 만나러 간다.",
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
              "text": "관제사는 한참 침묵한 뒤 녹음 버튼을 누른다. “정식 민원으로 접수합니다. 계속 말씀하세요.” 0번선 신호가 켜진다.",
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
              "text": "관제가 원격 분기를 잠근다. 전화기를 내려놓은 순간 수동 레버가 남아 있음을 발견한다. 지도와 규정을 챙겨 직접 분기기로 가야 한다.",
              "next": "tunnel",
              "clues": [
                "protocol",
                "map"
              ],
              "pressure": 2
            },
            "fumble": {
              "text": "관제사가 일행의 발언을 비상 상황 은폐로 오해한다. 원격 분기를 잠그고 공식 녹음의 접수도 보류한다. 벽의 지도와 규정을 베낀 뒤, 일행은 터널 통로를 지나 현장 분기기로 가야 한다.",
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
              "text": "옛 배선도대로 릴레이를 맞추니 0번선뿐 아니라 후방 차단 신호도 켜진다. 관제의 견인 열차가 멀리서 멎고 차장은 제동을 다시 확인할 시간을 얻는다. 일행은 지도를 챙겨 터널 통로로 간다.",
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
              "text": "오래된 릴레이가 딸깍하며 움직인다. 지도에서 지워진 0번선에 녹색 불이 돌아온다.",
              "next": "tunnel",
              "set": [
                "signal_open"
              ],
              "clues": [
                "map"
              ]
            },
            "failure": {
              "text": "퓨즈가 튀고 모든 전산 신호가 꺼진다. 지도에 표시된 현장 분기기만이 남은 방법이다.",
              "next": "tunnel",
              "clues": [
                "map"
              ],
              "pressure": 2
            },
            "fumble": {
              "text": "전산선과 수동선을 함께 물려 작은 불꽃이 손을 스친다. 생명 1을 잃고 원격 신호는 모두 꺼진다. 남아 있는 현장 분기기만 쓸 수 있어, 지도와 함께 터널 통로로 이동한다.",
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
      "objective": "관제사의 허가를 받거나 수동 신호기를 조작한다.",
      "details": [
        {
          "id": "signal-manual",
          "label": "분기표 뒷면의 임시 정차 규정을 읽는다",
          "text": "신청에는 주민 대표의 행선지 선언과 살아 있는 증인의 서명이 필요하다.",
          "clue": "protocol"
        }
      ],
      "summary": "정규 노선에서 지워진 정비 다리의 0번선을 열어야 한다.",
      "stakes": "허가를 얻지 못하거나 배선을 틀리면 현장 분기기에서 더 급히 작업해야 한다."
    },
    "tunnel": {
      "id": "tunnel",
      "title": "열차 밖에서 누군가 문을 두드렸다",
      "chapter": 3,
      "location": "정비 터널 연결 통로",
      "art": 2,
      "mood": "danger",
      "text": [
        "열차가 속도를 낮추자 창밖에서 작은 손이 문을 두드린다. 우비를 입은 아이가 선로 옆을 걸어온다. 그 뒤로 어른들의 신발, 가게 처마, 빨래줄이 겹친다. 한 몸에 동네 전체가 천천히 따라 걷고 있다.",
        "관제 확성기에서는 «미확인 물체와 접촉 금지»라는 방송이 반복된다. 아이는 손에 빈 행선지 종이를 들고 있다. 기계에게 먼저 말할 것인가, 이 승객에게 먼저 물을 것인가."
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
              "text": "문을 여는 순간 두 번째 안전 고리까지 걸어 흔들림을 잡는다. 아이는 도움을 준 일행에게 주민 이름이 적힌 신청서를 먼저 건넨다. 안전해진 통로 안에서 그들이 원하는 도착지를 자세히 듣는다.",
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
              "text": "문이 열린다. 아이가 먼저 신발의 물기를 턴다. “사람들 사는 데는 그러라고 배웠어요.” 당신들은 안쪽에서 이야기할 자리를 만든다.",
              "next": "witness"
            },
            "failure": {
              "text": "안전 고리가 끊어지며 문이 당신의 몸을 세게 친다. 동료들이 안쪽으로 끌어당긴다. 아이는 유리 밖에 신청서를 붙여 이야기를 계속하려 한다.",
              "next": "witness",
              "pressure": 1,
              "harm": 1
            },
            "fumble": {
              "text": "끊어진 고리가 손목을 감은 채 문이 닫힌다. 생명 2를 잃고 관제 경보가 울린다. 아이가 창 밖에 신청서를 붙이자 동료들이 당신을 문에서 떼어 낸다. 문을 사이에 둔 채로라도 대표의 말을 듣기로 한다.",
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
              "text": "차장이 속도를 낮춘 사이 난간이 있는 정비 통로로 이동한다. 아이에게는 기다리라는 손짓만 남긴다. 그의 부탁을 듣는 대신 현장 분기기를 먼저 확보하기로 했다.",
              "next": "switch"
            }
          }
        }
      ],
      "objective": "문을 열어 요구를 듣거나 분기기를 먼저 확보한다.",
      "callbacks": [
        {
          "when": {
            "flag": "names_kept"
          },
          "text": "당신들이 읽었던 이름 중 하나가 아이의 이름표에 보인다. 아이는 이미 당신들을 알고 있는 눈치다."
        }
      ],
      "summary": "마을 전체의 모습을 띤 승객이 아이의 얼굴로 통로 문 밖에 서 있다.",
      "stakes": "움직이는 문에 손을 대면 다칠 수 있다. 대표를 지나치면 새 정차 이름을 함께 정할 기회를 잃는다."
    },
    "witness": {
      "id": "witness",
      "title": "집으로 보내 달라는 말의 뜻",
      "chapter": 3,
      "location": "멈추지 않는 연결 통로",
      "art": 2,
      "mood": "calm",
      "text": [
        "우비를 입은 아이가 자신을 «모래역 주민들의 대표»라고 소개한다. 문을 열지 못했다면 유리창을 사이에 두고 말을 건다. 손에 든 신청서에는 주민 스물아홉 명의 이름이 있고, 새 행선지를 쓸 칸만 비어 있다.",
        "주민들은 부활이나 시간 여행을 요구하지 않는다. 대피 열차를 기다리던 사람들이 있었다는 기록, 살아 있는 사람들이 잠깐 멈춰 줄 장소, 그리고 그 장소를 스스로 부를 이름을 원한다."
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
              "text": "아이는 새 정차 장소를 «기다림 마당»이라고 적고, 당신들은 증인으로 서명한다. 정해진 목적지가 생겼다.",
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
              "text": "주민들은 당신들의 기록을 확인한다. 기다렸던 사람들의 이름이 이제 살아 있는 사람의 손에도 남는다.",
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
        }
      ],
      "dialogue": {
        "who": "모래역의 대표",
        "text": "떠나지 못한 게 아니라, 어디로 가고 싶은지 한 번도 질문받지 못했어요."
      },
      "objective": "주민이 정한 장소에 서명할지, 진술만 기록할지 고른다.",
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
      "summary": "주민 대표는 죽음을 되돌리기보다 기다렸다는 기록과 머물 장소를 원한다.",
      "stakes": "지킬 수 없는 약속을 하면 안 된다. 서명하지 않아도 현재 승객들의 귀가는 선택할 수 있다."
    },
    "switch": {
      "id": "switch",
      "title": "0번선은 손으로 움직인다",
      "chapter": 3,
      "location": "정비 다리 진입 분기기",
      "art": 2,
      "mood": "danger",
      "text": [
        "분기기는 전산 지도에 없는 만큼 관리 목록에도 없었다. 돌과 낙엽이 레버 틈을 메우고 있다. 한쪽 레일은 정상 운행선, 다른 쪽은 강 위의 넓은 정비 다리로 이어진다.",
        "관제사는 무전으로 결정을 요구한다. 지금 분기기를 어떻게 확보하느냐에 따라 마지막 정차에서 쓸 시간이 달라진다. 안전한 방법도 빠른 방법도 있으나, 둘을 공짜로 얻을 수는 없다."
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
              "text": "레버를 밀기 전에 낙엽 아래 균형추까지 고정한다. 레일과 보조 제동 장치가 함께 맞물려, 견인 열차를 기다릴 필요 없이 안전하게 0번선으로 진입한다. 막차는 정비 다리 중앙에서 멈춘다.",
              "next": "bridge",
              "set": [
                "signal_open",
                "brake_safe"
              ],
              "pressure": -1
            },
            "success": {
              "text": "낙엽 속에서 쇳소리가 난다. 레일이 정확히 맞물리고 막차는 0번선으로 천천히 들어간다.",
              "next": "bridge",
              "set": [
                "signal_open"
              ]
            },
            "failure": {
              "text": "레버가 부러지며 무거운 균형추가 당신을 덮쳐 생명 3을 잃는다. 차장 윤이 열차를 정비 다리 입구에 세운다. 살아 있는 동료가 남아 있다면 당신을 끌어내고 마지막 결정을 이어갈 수 있다.",
              "next": "bridge",
              "pressure": 2,
              "harm": 3,
              "unset": [
                "signal_open"
              ]
            },
            "fumble": {
              "text": "돌에 걸린 균형추가 끊어져 당신을 덮친다. 생명 3을 잃고 레버도 완전히 꺾였다. 차장이 제동으로 열차를 다리 입구에 붙여 세우는 동안, 살아 있는 동료들이 당신을 끌어내 마지막 결정을 준비한다.",
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
              "text": "릴레이의 전원과 귀환선을 구분해 연결하자 0번선과 후방 차단기가 동시에 작동한다. 불안정하던 제동 전압도 바로잡혔다. 차장 윤이 막차를 정비 다리 중앙으로 옮겨 안정적으로 세운다.",
              "next": "bridge",
              "set": [
                "signal_open",
                "brake_safe"
              ],
              "pressure": -1
            },
            "success": {
              "text": "릴레이가 한 번 울리고 신호등이 녹색으로 바뀐다. 막차가 정비 다리의 중앙까지 들어간다.",
              "next": "bridge",
              "set": [
                "signal_open"
              ]
            },
            "failure": {
              "text": "릴레이가 타며 차량 손잡이로 전류가 흐른다. 일행 모두가 충격을 받고 쓰러진다. 차장 윤의 수동 제동으로 열차는 다리 입구에 멎지만, 지금 일어날 수 있는 사람이 있어야 한다.",
              "next": "bridge",
              "pressure": 2,
              "harmAll": 1,
              "unset": [
                "signal_open"
              ]
            },
            "fumble": {
              "text": "전류가 돌아갈 선을 잘못 연결해 차량 손잡이마다 충격이 번진다. 일행 전원이 생명 2를 잃는다. 차장이 외부 차단기를 내려 열차를 다리 입구에 세운다. 일어설 사람이 남아 있어야 마지막 결정을 이어갈 수 있다.",
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
              "text": "장갑을 낀 손으로 차단기를 내리고, 전류가 없는 릴레이를 천천히 맞춘다. 부상 없이 0번선이 열렸다. 시간이 걸려 관제 경계가 1 높아졌지만, 일행은 열차를 타고 정비 다리로 이동한다.",
              "next": "bridge",
              "set": [
                "signal_open"
              ],
              "pressure": 1
            }
          }
        }
      ],
      "objective": "레버나 릴레이를 움직여 정비 다리에 진입한다.",
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
        }
      ],
      "summary": "0번선으로 가는 분기 레버가 돌과 낙엽에 걸렸다.",
      "stakes": "무거운 균형추와 젖은 전기 배선이 위험하다. 절연장갑이 있으면 전류를 끊는 안전한 방법을 쓸 수 있다."
    },
    "bridge": {
      "id": "bridge",
      "title": "일곱 번째 승객의 하차 벨",
      "chapter": 4,
      "location": "새벽을 앞둔 강 위 정비 다리",
      "art": 3,
      "mood": "tension",
      "text": [
        "막차가 정비 다리 쪽에 멈춘다. 창밖에 겹쳐 보이던 모래역의 모습은 열차 곁의 작은 승강장처럼 머문다. 관제사는 무전으로 일행의 최종 결정을 묻는다. 이제 사람들을 어디로 보내고 어떤 기록을 남길지 정해야 한다.",
        "현재 승객들을 정상 노선으로 보내고 장부를 기록관에 남길 수 있다. 다음에도 주민들의 요청을 받을 야간 운행을 맡을 수도 있다. 주민 대표와 새 이름에 서명했다면, 그 합의대로 «기다림 마당»을 정식 임시 정차 장소로 등록할 수 있다."
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
              "text": "증인들의 서명이 관제 화면에 올라간다. 도착역이 생기자 일곱 번째 하차 벨이 처음으로 조용해진다.",
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
              "text": "당신들은 모래역의 장부를 들고 정상 운행선으로 돌아간다. 모든 부탁을 들어주지는 못해도, 없었던 일로 만들지는 않는다.",
              "next": "ending-home"
            }
          }
        },
        {
          "id": "night-shift",
          "label": "0번선의 첫 야간 근무를 자원한다",
          "intent": "choose",
          "target": "platform",
          "automatic": true,
          "outcomes": {
            "success": {
              "text": "당신들은 기다림이 다시 방치되지 않도록 야간 연락처를 쓴다. 귀가를 조금 미루는 대신, 다음 막차에 탈 이유가 생겼다.",
              "next": "ending-shift"
            }
          }
        }
      ],
      "objective": "새 정차 장소 등록, 현재 승객의 귀가, 야간 운행 인계 중 하나를 정한다.",
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
      "summary": "막차가 정비 다리 쪽에 멈췄고 관제는 마지막 운행 결정을 기다린다.",
      "stakes": "주민과 합의하지 않았다면 그들을 대신해 새 정차 장소를 등록할 수 없다."
    },
    "ending-new-stop": {
      "id": "ending-new-stop",
      "title": "모두를 위한 임시 정차",
      "chapter": 4,
      "art": 3,
      "mood": "hope",
      "ending": true,
      "text": [
        "정식 역명 목록 끝에 «기다림 마당 — 임시 정차»라는 한 줄이 생긴다. 주민들이 원한 것은 영원한 밤이 아니었다. 강가에 작은 벤치와 스물아홉 이름을 남긴 뒤, 창에 비치던 동네의 불이 하나씩 꺼진다.",
        "살아 있는 승객들은 첫차를 타고 집에 간다. 차장 윤은 빌린 목소리 대신 작고 쉰 자기 목소리로 인사한다. 당신들 휴대전화에는 예상 도착 시간이 뜬다. 이번에는 목적지에 아무 오류도 없다."
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
        "정상 노선으로 돌아오는 동안 일곱 번째 표는 서서히 말라 간다. 모래역 주민들은 당신들을 붙잡지 않는다. 누군가 마지막까지 이름을 들고 있다는 사실이, 그들이 받지 못했던 배웅이 된다.",
        "첫차 승객들은 졸린 얼굴로 자리를 양보한다. 평범한 출근길이다. 당신들은 귀가 요청 장부를 철도 기록관에 제출한다. 기록관의 직원이 묻는다. “이분들의 마지막 도착 시간은 비워 둬도 될까요?” 그 질문에는 이제 대답할 사람이 있다."
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
        "역 이름을 정하는 대신, 당신들은 다음 막차가 이 선로를 지나도록 임시 운행표를 만든다. 관제사는 한숨을 쉬더니 야간 수당 신청서를 보낸다. 유령을 돕는 일에도 출근 기록은 필요하단다.",
        "주민들은 매일 나타나지 않는다. 누군가 잊힌 주소로 돌아가고 싶은 밤에만 0번선 하차 벨이 울린다. 당신들은 돌아가며 그 벨을 듣기로 한다. 괴담 하나가 끝나는 대신, 이상하고 다정한 야간 업무 하나가 시작된다."
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
      "막차의 마지막 창에 당신들의 이름이 떠오른다. 차장 윤은 검표기를 내려놓고 살아 있는 증인을 찾지만, 어느 객차에서도 대답이 돌아오지 않는다. 돌아갈 몸을 잃은 일행의 표에 «도착 미확인» 도장이 찍힌다.",
      "막차는 더는 응답하지 않는 승차권들을 싣고 어둠으로 들어간다. 주민들의 장부에는 누군가 끝까지 질문하려 했다는 기록이 남는다. 그러나 이번 일행 가운데 그 기록을 살아 있는 도시로 가져갈 사람은 없다."
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
  }
};

export default campaign;
