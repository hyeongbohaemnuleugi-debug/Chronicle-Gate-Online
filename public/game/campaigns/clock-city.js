// Original scenario for Chronicle Gate v14. Edit nodes, clues and outcome edges below.
export default {
  "id": "clock-city",
  "title": "13분 뒤에 사라지는 도시",
  "subtitle": "지각 벌금이 아직 하지 않은 일에 붙었다",
  "genre": "시간 판타지 · 도시 추리",
  "accent": "#d3ad69",
  "description": "도시의 모든 시계가 11시 47분을 가리킨다. 마지막 종이 울리기 전에, 시민들이 모르는 사이 담보로 잡힌 시간을 되찾아야 한다.",
  "estimatedMinutes": "35–60",
  "contentNotes": [
    "도시 소멸 위기",
    "추락과 사망 위험",
    "시간을 통한 사후 복원"
  ],
  "objective": "종탑 계약의 진실을 밝혀 오름시의 주민들이 사라지지 않게 한다.",
  "art": "clock-city",
  "pressureLabel": "시간 균열",
  "pressureMax": 8,
  "start": "square",
  "roles": [
    {
      "title": "배달원",
      "secret": "어제 배달한 봉투 하나에 내일 날짜의 서명이 있었다. 수취인은 시계탑 관리인 윤이고, 반송 사유는 “수취인이 어제가 됨”이다.",
      "goal": "계약서의 수신자가 누구였는지 확인한다.",
      "reveal": "시계탑 관리인에게 보낸 문서가 시간 오류로 반송됐다. 누군가 계약 만료 통보를 받지 못했다.",
      "epilogues": [
        {
          "when": {
            "flag": "alley_safe"
          },
          "text": "이름을 불러 골목 주민을 안내한 기록은 새 우편 규정에 남는다. 주소가 사라져도 수신인까지 지워지는 것은 아니라는 원칙이다."
        },
        {
          "when": {
            "notFlag": "alley_safe"
          },
          "text": "반송된 통지는 계약 만료를 제대로 알리지 않은 증거가 된다. 배달하지 못한 문서도 책임을 묻는 기록으로 남는다."
        }
      ]
    },
    {
      "title": "구청 기록원",
      "secret": "도시의 무료 급행 서비스 예산을 정리하면서 시민의 서명 대신 자동 체크된 동의 칸을 발견했다. 신고했지만 “사용 편의를 위한 처리”라고 반려됐다.",
      "goal": "누가 동의하지 않은 시간을 빌렸는지 밝힌다.",
      "reveal": "시간 대출은 시민이 직접 서명한 계약이 아니다. 자동 처리된 동의 칸이 있다.",
      "epilogues": [
        {
          "when": {
            "flag": "debt_public"
          },
          "text": "비용 분배표가 공개되며 기록원의 지적은 개인의 불평이 아니라 검증할 증거가 된다. 혜택과 부담을 함께 적는 양식이 만들어진다."
        },
        {
          "when": {
            "notFlag": "debt_public"
          },
          "text": "자동 동의를 의심한 기록은 남는다. 편의를 위해 생략한 확인이 누구의 권리를 지웠는지 다시 묻는 자료가 된다."
        }
      ]
    },
    {
      "title": "수리 견습생",
      "secret": "스승이 남긴 첫 도면에는 시계가 멈추더라도 도시는 남는다고 적혀 있었다. 지금 시계탑의 안전장치만 다르다.",
      "goal": "시계를 파괴하는 것과 사람을 구하는 것을 구분한다.",
      "reveal": "원래 설계에는 도시를 지키는 분리 장치가 있었다. 종탑 전체를 무너뜨릴 필요는 없다.",
      "epilogues": [
        {
          "when": {
            "flag": "ring_ready"
          },
          "text": "안전 링을 준비한 수리 기록은 다른 도시의 설계자들에게 전달된다. 사람의 확인을 건너뛰는 개선은 개선이 아니라는 주석이 붙는다."
        },
        {
          "when": {
            "notFlag": "ring_ready"
          },
          "text": "수리 기록에는 원래 안전 설계와 현재 기계의 차이가 남는다. 작동한다는 이유만으로 안전하다고 믿지 말라는 과제가 이어진다."
        }
      ]
    },
    {
      "title": "야간 간호사",
      "secret": "어제 응급실에서 이름 모를 노인이 수술을 기다리며 말했다. “내가 빌린 십 분 때문에 남의 마지막 십 분을 쓰게 하지는 마.” 그의 입원표에는 도시 설계자의 이름이 있다.",
      "goal": "시간을 나누는 결정에 당사자의 말을 포함한다.",
      "reveal": "도시 설계자가 병원에 있다. 그는 시간 대출이 타인의 시간을 빼앗는 구조가 된 것을 후회한다.",
      "epilogues": [
        {
          "when": {
            "flag": "maker_helped"
          },
          "text": "설계자가 남긴 증언에는 빌린 십 분과 남의 시간을 강제로 쓰는 일이 다르다고 적힌다. 응급 지원을 동의와 함께 설계할 근거가 된다."
        },
        {
          "when": {
            "notFlag": "maker_helped"
          },
          "text": "병원의 작은 메모에는 필요 때문에 빌린 시간이 누군가의 삶을 담보로 삼아서는 안 된다는 문장이 남는다. 끝내 놓치지 말아야 할 질문이다."
        }
      ]
    }
  ],
  "clues": {
    "notice": {
      "title": "미래 날짜의 지각 고지서",
      "text": "고지서는 아직 일어나지 않은 열세 분 뒤의 지각을 벌금으로 매긴다. 시간 금고가 미래까지 담보로 잡았다는 증거다."
    },
    "route": {
      "title": "지워지지 않은 외곽선",
      "text": "시간 급행망 밖의 옛 전차 선로는 균열의 영향을 덜 받는다. 주민을 빼낼 우회 경로다."
    },
    "automatic": {
      "title": "자동 처리된 동의",
      "text": "급행 서비스 가입자의 시간 담보 동의는 행정 단말기가 일괄 처리했다. 실제 서명과 확인은 없었다."
    },
    "clause": {
      "title": "원본 계약의 거부 조항",
      "text": "시간의 기부는 본인의 명시적 동의가 있어야 하며, 거부한 사람의 몫을 다른 사람이 강제로 정할 수 없다."
    },
    "release": {
      "title": "독립 분리 장치",
      "text": "황동 안전 링을 끊으면 사람과 도시를 유지한 채 시간 금고를 분리할 수 있다. 금고에 의존한 편의 장치는 모두 멈춘다."
    },
    "debts": {
      "title": "누가 시간을 썼는가",
      "text": "급행 버스와 행정 단축 처리에 쓰인 시간 비용이 이용하지 않은 주민들에게까지 배분됐다. 책임과 혜택이 일치하지 않는다."
    },
    "ballot": {
      "title": "선택을 남기는 서명지",
      "text": "새 계약은 주민별 동의와 거부를 둘 다 기록해야 유효하다. 빈칸을 찬성으로 계산하는 종이는 무효다."
    },
    "anchor": {
      "title": "종소리의 닻",
      "text": "마지막 종은 계약을 확정하는 신호다. 종추를 고정하면 심의할 시간을 벌 수 있지만 영구 해결은 아니다."
    },
    "maker": {
      "title": "설계자의 정정 증언",
      "text": "최초 설계자는 편의를 빌려주되 삶을 담보로 잡지 않도록 계약했다. 이후 추가된 자동 갱신 조항이 도시 소멸을 부른다."
    },
    "return": {
      "title": "돌아올 순간의 보관함",
      "text": "도시 입구를 통과할 때 기록된 신체와 의식의 마지막 온전한 순간이 시간 금고에 남는다. 반환 서랍에서 그 순간을 현재로 가져오면 사망한 동료의 부활을 시도할 수 있다. 금고 균열과 기부 시간이 소모된다."
    }
  },
  "flags": {
    "passengers_safe": "전차 승객들을 안전한 곳으로 옮겼다",
    "alley_safe": "골목 주민들에게 우회로를 알렸다",
    "original_found": "원본 계약의 실물을 확보했다",
    "press_open": "인쇄소가 시민에게 정보를 배포했다",
    "maker_helped": "설계자가 증언할 수 있게 도왔다",
    "mandate_obtained": "주민의 동의와 거부를 각각 기록했다",
    "bell_held": "마지막 종의 울림을 지연시켰다",
    "ring_ready": "시간 금고 분리 장치를 준비했다",
    "debt_public": "시간 비용의 부당한 분배를 공개했다",
    "trams_ready": "외곽 전차를 대피용으로 준비했다",
    "archive_saved": "도시의 기록을 밖으로 옮겼다"
  },
  "nodes": {
    "square": {
      "id": "square",
      "title": "아직 하지 않은 지각",
      "chapter": 1,
      "location": "오름시 · 중앙 시계 광장",
      "art": 0,
      "mood": "mystery",
      "text": [
        "비가 허공에서 멈춘 것은 아니다. 빗방울은 정상적으로 떨어진다. 다만 모든 우산이 같은 방향으로 한 뼘씩 반복해 움직인다. 광장의 시계는 11시 47분에서 떨고 있다.",
        "자동 단속기가 당신들 앞으로 고지서를 뱉는다. 위반 시각은 오늘 정오, 위반 내용은 도시 소멸로 인한 지각. 종탑 쪽에서 관리인 윤이 달려와 고지서를 찢으려다, 다시 증거라며 주워 담는다."
      ],
      "objective": "먼저 위험에 놓인 주민과 시간 오류의 범위를 확인한다.",
      "entities": [
        {
          "id": "yun",
          "label": "시계탑 관리인 윤",
          "kind": "person",
          "aliases": [
            "윤",
            "관리인"
          ]
        },
        {
          "id": "tram",
          "label": "멈춘 급행 전차",
          "kind": "place",
          "aliases": [
            "전차",
            "승객"
          ]
        },
        {
          "id": "alley",
          "label": "표지판이 지워지는 골목",
          "kind": "place",
          "aliases": [
            "골목",
            "표지판"
          ]
        }
      ],
      "choices": [
        {
          "id": "tram-first",
          "label": "승객이 갇힌 급행 전차로 간다",
          "intent": "choose",
          "keywords": [
            "전차",
            "승객",
            "구조"
          ],
          "automatic": true,
          "outcomes": {
            "success": {
              "text": "윤은 종탑 열쇠를 만지다 당신들을 따라온다. “기계부터”라는 말을 삼키고 전차 문을 두드린다.",
              "next": "tram"
            }
          }
        },
        {
          "id": "alley-first",
          "label": "주소가 사라지는 골목의 주민을 돕는다",
          "intent": "choose",
          "keywords": [
            "골목",
            "주민",
            "주소"
          ],
          "automatic": true,
          "outcomes": {
            "success": {
              "text": "벽에서 번지수가 지워지고 있다. 당신들은 눈앞의 집마다 문을 두드리며 이름으로 길을 확인한다.",
              "next": "alley"
            }
          }
        },
        {
          "id": "notice-analysis",
          "label": "윤과 고지서의 계약 번호를 추적한다",
          "intent": "investigate",
          "target": "yun",
          "keywords": [
            "고지서",
            "계약",
            "번호",
            "윤",
            "조사"
          ],
          "stat": "wit",
          "dc": 10,
          "risk": "확인을 늦추면 골목의 주소가 더 많이 지워진다.",
          "outcomes": {
            "success": {
              "text": "고지서 번호는 시간 급행망의 공용 계약이다. 윤이 공공 기록관으로 이어지는 옛 골목을 알려 준다.",
              "next": "alley",
              "clues": [
                "notice",
                "automatic"
              ]
            },
            "mixed": {
              "text": "계약 번호는 찾았지만 단속기가 경보를 울린다. 주민들이 불안해하기 전에 골목으로 들어가 설명해야 한다.",
              "next": "alley",
              "clues": [
                "notice"
              ],
              "pressure": 1
            },
            "failure": {
              "text": "단속기에는 발급자 이름이 없다. 대신 급행망의 노선도가 인쇄된다. 정지한 전차 안의 안내 단말기에서 더 알아봐야 한다.",
              "next": "tram",
              "clues": [
                "notice"
              ],
              "pressure": 1
            }
          }
        }
      ],
      "dialogue": {
        "who": "윤",
        "text": "열세 분 남았다는 게 실제 열세 분인지도 이제 장담 못 해요. 그래도 기다릴 이유는 없죠."
      },
      "details": [
        {
          "id": "ticket",
          "label": "지각 고지서의 작은 글씨를 읽는다",
          "text": "미래의 사건을 현재의 채무로 청구하는 약관 번호가 적혀 있다. 이용자의 서명란은 비어 있다.",
          "clue": "notice"
        },
        {
          "id": "entry-record",
          "label": "고지서 아래 방문자 등록 번호를 본다",
          "text": "도시 입구 시계는 방문자의 신체·의식 상태를 입장 순간과 함께 기록한다. 반환 서랍을 쓰려면 이 번호가 필요하다.",
          "clue": "return"
        }
      ]
    },
    "tram": {
      "id": "tram",
      "title": "아홉 번째 정류장 사이",
      "chapter": 1,
      "location": "급행 전차 9번",
      "art": 0,
      "mood": "tension",
      "text": [
        "전차의 앞문은 광장에 있고 뒷문은 아직 지난 정류장에 있다. 승객 한 명이 신문을 앞문 밖에 내밀자 날씨 면이 한 주 뒤의 예보로 바뀐다.",
        "운전사 세란은 브레이크를 잡은 채 웃는다. “정시 운행률은 이번 달도 백 퍼센트겠네요.” 전차 아래의 보조 바퀴는 시간 급행망이 아니라 옛 선로에 닿아 있다."
      ],
      "objective": "승객을 내리고 대피에 쓸 현실의 선로를 찾는다.",
      "entities": [
        {
          "id": "brake",
          "label": "비상 수동 브레이크",
          "kind": "object",
          "aliases": [
            "브레이크"
          ]
        },
        {
          "id": "seran",
          "label": "전차 운전사 세란",
          "kind": "person",
          "aliases": [
            "세란",
            "운전사"
          ]
        },
        {
          "id": "door",
          "label": "시간이 어긋난 전차 문",
          "kind": "object",
          "aliases": [
            "문",
            "승객"
          ]
        }
      ],
      "choices": [
        {
          "id": "brake",
          "label": "보조 바퀴를 내려 전차를 옛 선로에 고정한다",
          "intent": "force",
          "target": "brake",
          "keywords": [
            "바퀴",
            "브레이크",
            "고정",
            "내리",
            "선로"
          ],
          "stat": "might",
          "dc": 11,
          "risk": "보조 축이 부러지면 부상을 입고 승객을 차창으로 대피시켜야 한다.",
          "outcomes": {
            "success": {
              "text": "바퀴가 철제 선로를 꽉 문다. 앞문과 뒷문이 같은 비를 맞기 시작한다. 세란은 전차를 기록관 앞까지 옮길 수 있다고 말한다.",
              "next": "library",
              "set": [
                "passengers_safe",
                "trams_ready"
              ],
              "clues": [
                "route"
              ]
            },
            "mixed": {
              "text": "바퀴는 닿았지만 급행 동력이 사라졌다. 승객들이 내려 함께 밀고, 전차는 천천히 기록관 쪽으로 간다.",
              "next": "library",
              "set": [
                "passengers_safe"
              ],
              "clues": [
                "route"
              ],
              "pressure": 1
            },
            "failure": {
              "text": "보조 축이 비틀린다. 승객들을 창문으로 내보낸 뒤 세란이 외곽 선로 도면을 건넨다. 전차를 버리고 기록관으로 향한다.",
              "next": "library",
              "set": [
                "passengers_safe"
              ],
              "clues": [
                "route"
              ],
              "pressure": 2,
              "harm": 1
            }
          }
        },
        {
          "id": "guide",
          "label": "승객들이 같은 박자로 움직이도록 안내한다",
          "intent": "help",
          "target": "door",
          "keywords": [
            "승객",
            "안내",
            "박자",
            "손",
            "부른"
          ],
          "stat": "heart",
          "dc": 11,
          "risk": "박자가 흩어지면 다른 시간의 출구가 열릴 수 있다.",
          "outcomes": {
            "success": {
              "text": "한 사람씩 이름을 부르고 손을 잡는다. 아이가 박자를 세자 어른들이 따라 한다. 마지막 승객까지 현재의 광장으로 내려온다.",
              "next": "library",
              "set": [
                "passengers_safe"
              ],
              "clues": [
                "route"
              ]
            },
            "mixed": {
              "text": "신문을 든 승객이 미래를 보려다가 늦는다. 여러분이 손을 놓지 않아 모두 내려왔지만 출구가 더 좁아졌다.",
              "next": "library",
              "set": [
                "passengers_safe"
              ],
              "pressure": 1
            },
            "failure": {
              "text": "전차 문이 닫히며 박자가 끊긴다. 세란이 비상 차창을 연다. 승객을 줄지어 밖으로 옮기고 기록관으로 물러난다.",
              "next": "library",
              "set": [
                "passengers_safe"
              ],
              "pressure": 2
            }
          }
        }
      ],
      "dialogue": {
        "who": "세란",
        "text": "무임승차는 넘어가도 무임소멸은 못 넘겨요."
      },
      "details": [
        {
          "id": "map",
          "label": "옛 전차 선로도를 살핀다",
          "text": "급행망 밖으로 나가는 외곽 선로만 현재 시각을 유지한다. 종탑 계약의 경계와 일치한다.",
          "clue": "route"
        }
      ]
    },
    "alley": {
      "id": "alley",
      "title": "주소 대신 이름",
      "chapter": 1,
      "location": "백색 우편 골목",
      "art": 0,
      "mood": "mystery",
      "text": [
        "골목에서 주소가 지워지자 우편함들이 길 쪽으로 돌아앉는다. 배달부 준우는 서류 가방을 열어 편지의 수신인 이름을 큰 소리로 읽는다. 이름이 불린 집은 잠깐 제 모양을 되찾는다.",
        "빵집 한 곳은 오늘의 문과 어제의 문이 나란히 놓여 있다. 주민들은 어느 문으로 나와야 할지 망설인다. 골목 끝 공공 기록관의 표지판만 아직 글자를 유지한다."
      ],
      "objective": "주민들을 현재의 길로 안내하고 기록관에 들어간다.",
      "entities": [
        {
          "id": "junwoo",
          "label": "배달부 준우",
          "kind": "person",
          "aliases": [
            "준우",
            "배달부"
          ]
        },
        {
          "id": "mail",
          "label": "미배달 편지 가방",
          "kind": "object",
          "aliases": [
            "편지",
            "가방"
          ]
        },
        {
          "id": "doors",
          "label": "나란히 선 빵집 문",
          "kind": "place",
          "aliases": [
            "문",
            "빵집"
          ]
        }
      ],
      "choices": [
        {
          "id": "names",
          "label": "편지를 나누어 들고 주민의 이름을 부른다",
          "intent": "talk",
          "target": "mail",
          "keywords": [
            "편지",
            "이름",
            "부르",
            "배달",
            "주민"
          ],
          "stat": "heart",
          "dc": 10,
          "risk": "이름을 잘못 읽으면 주민이 어제의 문으로 향한다.",
          "outcomes": {
            "success": {
              "text": "한 씨, 오 씨, 리안. 이름을 들은 주민들이 서로의 손을 잡고 나온다. 준우는 마지막 편지가 원본 계약의 반송 통지였다고 말한다.",
              "next": "library",
              "set": [
                "alley_safe"
              ],
              "clues": [
                "automatic"
              ]
            },
            "mixed": {
              "text": "한 이름이 잘못 전달된다. 주인이 자기 이름을 직접 바로잡으며 문밖으로 나온다. 시간이 들었지만 빈집은 남지 않았다.",
              "next": "library",
              "set": [
                "alley_safe"
              ],
              "pressure": 1
            },
            "failure": {
              "text": "젖은 편지의 글씨가 번졌다. 여러분은 집마다 직접 들어가 사람을 데리고 나온다. 기록관에 닿을 때 골목의 번지수는 전부 사라진다.",
              "next": "library",
              "set": [
                "alley_safe"
              ],
              "pressure": 2
            }
          }
        },
        {
          "id": "present-door",
          "label": "빗방울이 정상적으로 흐르는 문을 찾아 표시한다",
          "intent": "investigate",
          "target": "doors",
          "keywords": [
            "문",
            "비",
            "빗",
            "현재",
            "분필"
          ],
          "stat": "wit",
          "dc": 11,
          "risk": "시간이 엇갈린 문을 고르면 우회해야 한다.",
          "outcomes": {
            "success": {
              "text": "어제의 문에서는 빗물이 위로 흐른다. 현재의 문에 분필로 표시하자 주민들이 안전하게 골목을 빠져나온다.",
              "next": "library",
              "set": [
                "alley_safe"
              ],
              "clues": [
                "route"
              ]
            },
            "mixed": {
              "text": "대부분의 문은 구분했지만 한 집은 양쪽 모두 흐림이 없다. 주민의 증언으로 현재 쪽을 확인하느라 시간이 든다.",
              "next": "library",
              "set": [
                "alley_safe"
              ],
              "clues": [
                "route"
              ],
              "pressure": 1
            },
            "failure": {
              "text": "막 표시한 문이 지워진다. 준우가 창문을 통해 사람들을 나오게 하고 여러분은 담을 넘어 기록관에 도착한다.",
              "next": "library",
              "set": [
                "alley_safe"
              ],
              "pressure": 2
            }
          }
        }
      ],
      "dialogue": {
        "who": "준우",
        "text": "반송은 익숙한데 수취인이 어제가 되는 건 규정에 없거든요."
      },
      "details": [
        {
          "id": "returned",
          "label": "관리인에게 반송된 통지를 읽는다",
          "text": "계약 만료 통지는 잘못된 시간대 주소로 배달됐다. 시민의 동의도 관리인의 갱신 서명도 확인되지 않았다.",
          "clue": "automatic"
        }
      ]
    },
    "library": {
      "id": "library",
      "title": "도시가 빌린 것",
      "chapter": 2,
      "location": "오름 공공 기록관",
      "art": 1,
      "mood": "mystery",
      "text": [
        "기록관의 책들은 시민이 읽지 않은 페이지부터 희미해진다. 사서 모라는 사라지는 책을 쌓는 대신 사람들에게 한 문장씩 읽어 달라고 부탁한다. 읽힌 문장은 종이에 다시 자리를 잡는다.",
        "중앙 서가에는 시간 급행망의 원본 계약이, 옆 인쇄소에는 시민별 청구 내역이 있다. 사서는 원본을 찾거나 사람들에게 현재 상황을 알리는 일 중 하나를 먼저 맡아 달라고 한다.",
        "기록관의 반환 서랍에는 방문자의 마지막 온전한 순간도 보관돼 있다. 동료가 사망했다면 그 순간을 현재로 가져오는 부활을 시도할 수 있다. 시간의 기부와 커지는 균열을 대가로 치러야 한다."
      ],
      "objective": "계약의 원래 약속과 실제 청구 내역을 비교한다.",
      "entities": [
        {
          "id": "mora",
          "label": "사서 모라",
          "kind": "person",
          "aliases": [
            "모라",
            "사서"
          ]
        },
        {
          "id": "vault",
          "label": "원본 계약 보관실",
          "kind": "place",
          "aliases": [
            "보관실",
            "원본"
          ]
        },
        {
          "id": "press",
          "label": "시민 인쇄소",
          "kind": "place",
          "aliases": [
            "인쇄소",
            "청구서"
          ]
        }
      ],
      "choices": [
        {
          "id": "original",
          "label": "보관실에서 최초 계약의 원본을 찾는다",
          "intent": "choose",
          "keywords": [
            "원본",
            "보관",
            "계약"
          ],
          "automatic": true,
          "outcomes": {
            "success": {
              "text": "모라가 손목에 서가 번호를 적어 준다. “이 번호가 지워져도 황동 표지를 기억하세요.”",
              "next": "vault"
            }
          }
        },
        {
          "id": "publish",
          "label": "인쇄소에서 시민들에게 시간 청구 사실을 알린다",
          "intent": "choose",
          "keywords": [
            "인쇄",
            "알린",
            "시민",
            "청구"
          ],
          "automatic": true,
          "outcomes": {
            "success": {
              "text": "여러분은 아직 읽을 수 있는 청구 목록을 안고 인쇄소로 달린다. 접힌 종이 한 장이 지워지는 거리보다 멀리 갈 수 있다.",
              "next": "press"
            }
          }
        },
        {
          "id": "compare",
          "label": "사서와 개정 기록을 대조해 책임자를 찾는다",
          "intent": "investigate",
          "target": "mora",
          "keywords": [
            "대조",
            "개정",
            "사서",
            "책임",
            "모라"
          ],
          "stat": "wit",
          "dc": 12,
          "risk": "기록 복구가 늦으면 원본 보관실의 문이 지워진다.",
          "outcomes": {
            "success": {
              "text": "자동 갱신 조항은 급행망 민영화 때 추가됐다. 설계자의 원래 서명은 동의 없는 담보를 허용하지 않았다. 모라가 원본 보관실을 연다.",
              "next": "vault",
              "clues": [
                "automatic",
                "debts"
              ]
            },
            "mixed": {
              "text": "개정 시점은 찾았지만 저자 이름이 사라져 있다. 청구 분배표를 인쇄소에 가져가면 누가 혜택을 받았는지는 밝힐 수 있다.",
              "next": "press",
              "clues": [
                "debts"
              ],
              "pressure": 1
            },
            "failure": {
              "text": "기록 페이지가 손안에서 하얗게 된다. 모라는 설계자가 아직 병원에 있다고 알려 준다. 우선 남은 청구서를 인쇄해 증거를 지켜야 한다.",
              "next": "press",
              "pressure": 1
            }
          }
        }
      ],
      "dialogue": {
        "who": "모라",
        "text": "읽지 않은 책이 없어져도 된다는 규칙을 누가 만들었을까요?"
      },
      "details": [
        {
          "id": "terms",
          "label": "급행 서비스 약관을 읽는다",
          "text": "행정 단축과 급행 이동으로 얻은 편의가 미래 시간의 대출로 계산된다. 이용하지 않은 주민에게도 비용이 부과됐다.",
          "clue": "debts"
        },
        {
          "id": "return-drawer",
          "label": "반환 서랍의 기록을 확인한다",
          "text": "현재 입장 기록과 연결된 온전한 신체·의식의 순간이 남아 있다. 그 순간을 불러 부활시키려면 기부 시간과 금고의 안정성을 소비한다.",
          "clue": "return"
        }
      ],
      "resurrection": {
        "label": "반환 서랍에서 동료의 마지막 순간 되돌리기",
        "text": "사망한 동료의 마지막 온전한 순간을 현재로 당긴다. 불꽃 1개와 시간 안정성을 쓰며 실패할 수 있다.",
        "sparkCost": 1,
        "pressureCost": 2,
        "dc": 12,
        "requires": {
          "clue": "return"
        }
      }
    },
    "vault": {
      "id": "vault",
      "title": "거부할 수 있는 서명",
      "chapter": 2,
      "location": "기록관 · 황동 보관실",
      "art": 1,
      "mood": "mystery",
      "text": [
        "원본 계약은 자물쇠 대신 질문으로 잠겨 있다. “동의하지 않는 사람은 빈칸을 남겨도 좋습니까?” 문 옆의 낡은 안내문은 그렇다고 적혀 있고, 새 전자판은 빈칸을 동의로 처리한다고 적혀 있다.",
        "황동 표지 아래에는 분리 장치의 도면도 있다. 도시 설계자는 시간을 빌릴 수 있게 만들었지만 사람을 담보로 묶어 두지는 않았다. 후대의 수정이 두 문장을 같은 뜻으로 바꿔 놓았다.",
        "계약 아래의 반환 서랍은 사망한 사람의 몸과 의식을 기록된 순간에서 되돌린다. 단순히 상처를 지우는 치료가 아니며, 남은 사람이 값을 지불하고 지금으로 불러야 한다."
      ],
      "objective": "원본과 안전 설계를 현재로 가져온다.",
      "entities": [
        {
          "id": "contract",
          "label": "황동 표지의 원본 계약",
          "kind": "object",
          "aliases": [
            "계약",
            "원본"
          ]
        },
        {
          "id": "lock",
          "label": "질문형 보관실 잠금장치",
          "kind": "object",
          "aliases": [
            "잠금",
            "질문"
          ]
        },
        {
          "id": "blueprint",
          "label": "분리 장치 도면",
          "kind": "object",
          "aliases": [
            "도면",
            "설계"
          ]
        }
      ],
      "choices": [
        {
          "id": "refuse",
          "label": "빈칸도 거부라는 원래 답으로 잠금을 푼다",
          "intent": "talk",
          "target": "lock",
          "keywords": [
            "거부",
            "빈칸",
            "답",
            "동의",
            "말"
          ],
          "stat": "heart",
          "dc": 11,
          "risk": "전자판이 답을 덮으면 계약 원본을 손으로 구해야 한다.",
          "outcomes": {
            "success": {
              "text": "“말하지 않았다는 것은 허락이 아닙니다.” 황동 글자가 켜지고 전자판이 꺼진다. 원본 계약이 여러분 앞으로 미끄러져 나온다.",
              "next": "council",
              "set": [
                "original_found"
              ],
              "clues": [
                "clause",
                "release"
              ]
            },
            "mixed": {
              "text": "낡은 잠금은 열렸지만 전자판이 경보를 울린다. 원본을 안고 주민들이 모인 의회로 빠져나온다.",
              "next": "council",
              "set": [
                "original_found"
              ],
              "clues": [
                "clause"
              ],
              "pressure": 1
            },
            "failure": {
              "text": "전자판이 답을 자동 수정한다. 여러분은 서가의 종이 사본을 챙기고 원래 설계자에게 확인받으러 병원으로 간다.",
              "next": "clinic",
              "clues": [
                "clause"
              ],
              "pressure": 2
            }
          }
        },
        {
          "id": "separate",
          "label": "전자판을 분리하고 황동 안전 도면을 꺼낸다",
          "intent": "use",
          "target": "blueprint",
          "keywords": [
            "전자",
            "분리",
            "손잡이",
            "도면",
            "꺼내"
          ],
          "stat": "agility",
          "dc": 12,
          "risk": "서가가 무너지면 원본 일부를 잃을 수 있다.",
          "outcomes": {
            "success": {
              "text": "새 전자판 뒤에 원래 손잡이가 숨어 있다. 손잡이를 당기자 계약과 안전 도면이 함께 나온다.",
              "next": "clinic",
              "set": [
                "original_found"
              ],
              "clues": [
                "clause",
                "release"
              ]
            },
            "mixed": {
              "text": "도면은 온전하지만 표지 한쪽이 지워진다. 설계자에게 누락된 표시를 확인받아야 한다.",
              "next": "clinic",
              "set": [
                "original_found"
              ],
              "clues": [
                "release"
              ],
              "pressure": 1
            },
            "failure": {
              "text": "서가 한 칸이 분리돼 어제로 미끄러진다. 여러분은 남은 계약 페이지를 잡고 의회로 뛰어간다. 거부 조항만은 선명하다.",
              "next": "council",
              "clues": [
                "clause"
              ],
              "pressure": 2
            }
          }
        }
      ],
      "dialogue": {
        "who": "윤",
        "text": "고장 난 건 시계가 아니라 질문을 안 하게 만든 장치였네요."
      },
      "details": [
        {
          "id": "clause-read",
          "label": "계약의 거부 조항을 읽는다",
          "text": "기부는 본인의 명시적 동의가 필요하며 거부에 불이익을 주지 못한다. 자동 동의는 최초 계약의 조건을 어긴다.",
          "clue": "clause"
        },
        {
          "id": "return-drawer",
          "label": "반환 서랍의 기록을 확인한다",
          "text": "현재 입장 기록과 연결된 온전한 신체·의식의 순간이 남아 있다. 그 순간을 불러 부활시키려면 기부 시간과 금고의 안정성을 소비한다.",
          "clue": "return"
        }
      ],
      "resurrection": {
        "label": "반환 서랍에서 동료의 마지막 순간 되돌리기",
        "text": "사망한 동료의 마지막 온전한 순간을 현재로 당긴다. 불꽃 1개와 시간 안정성을 쓰며 실패할 수 있다.",
        "sparkCost": 1,
        "pressureCost": 2,
        "dc": 12,
        "requires": {
          "clue": "return"
        }
      }
    },
    "press": {
      "id": "press",
      "title": "빈칸은 찬성이 아니다",
      "chapter": 2,
      "location": "골목 시민 인쇄소",
      "art": 1,
      "mood": "tension",
      "text": [
        "인쇄기에서는 시간 청구서가 끝없이 나온다. 아기를 돌보느라 급행 전차를 타지 못한 주민에게도 같은 금액이 찍혔다. 인쇄공 벨은 계산기를 두드리다가 종이를 뒤집는다.",
        "인쇄소 문 앞에는 불안한 사람들이 모인다. 누군가는 시계를 부수자고 하고 누군가는 지금이라도 모두가 동의했다고 처리하자고 한다. 벨은 찬성과 거부를 따로 적는 양식을 내민다."
      ],
      "objective": "상황을 알리고 시민에게 실제 선택권을 준다.",
      "entities": [
        {
          "id": "bell",
          "label": "인쇄공 벨",
          "kind": "person",
          "aliases": [
            "벨",
            "인쇄공"
          ]
        },
        {
          "id": "press",
          "label": "수동 인쇄기",
          "kind": "object",
          "aliases": [
            "인쇄기",
            "종이"
          ]
        },
        {
          "id": "residents",
          "label": "인쇄소 앞 주민들",
          "kind": "person",
          "aliases": [
            "주민",
            "사람들"
          ]
        }
      ],
      "choices": [
        {
          "id": "print",
          "label": "혜택과 비용을 대조한 한 장짜리 설명을 인쇄한다",
          "intent": "investigate",
          "target": "press",
          "keywords": [
            "인쇄",
            "설명",
            "비용",
            "대조",
            "종이"
          ],
          "stat": "wit",
          "dc": 11,
          "risk": "설명이 불명확하면 소문이 증거보다 먼저 퍼진다.",
          "outcomes": {
            "success": {
              "text": "누가 급행을 탔고 누가 값을 냈는지 한눈에 드러난다. 주민들은 서로를 탓하던 말을 멈추고 의회로 함께 가자고 한다.",
              "next": "council",
              "set": [
                "press_open",
                "debt_public"
              ],
              "clues": [
                "debts",
                "ballot"
              ]
            },
            "mixed": {
              "text": "숫자 몇 줄이 번졌지만 핵심은 전해졌다. 여러분은 구체적인 질문에 답하며 주민들을 의회로 안내한다.",
              "next": "council",
              "set": [
                "press_open"
              ],
              "clues": [
                "ballot"
              ],
              "pressure": 1
            },
            "failure": {
              "text": "자동 용지가 또 청구서를 찍어 낸다. 벨은 수동 인쇄기를 꺼낸다. 여러분은 설계자의 증언을 받아 올 동안 그가 배포를 맡는다.",
              "next": "clinic",
              "set": [
                "press_open"
              ],
              "clues": [
                "debts"
              ],
              "pressure": 1
            }
          }
        },
        {
          "id": "listen",
          "label": "주민들의 찬성과 거부를 각각 받아 적는다",
          "intent": "talk",
          "target": "residents",
          "keywords": [
            "주민",
            "찬성",
            "거부",
            "서명",
            "의견"
          ],
          "stat": "heart",
          "dc": 12,
          "risk": "의견을 서두르면 거부한 사람의 몫이 지워질 수 있다.",
          "outcomes": {
            "success": {
              "text": "“반대도 기록하겠습니다.” 그 한마디에 사람들이 차례로 말한다. 새 계약을 논의할 위임과 거부 명단이 나란히 완성된다.",
              "next": "council",
              "set": [
                "mandate_obtained",
                "press_open"
              ],
              "clues": [
                "ballot"
              ]
            },
            "mixed": {
              "text": "서명은 모였지만 몇 사람은 설명이 더 필요하다. 빈칸을 억지로 채우지 않고 의회에서 질문을 이어가기로 한다.",
              "next": "council",
              "set": [
                "press_open"
              ],
              "clues": [
                "ballot"
              ],
              "pressure": 1
            },
            "failure": {
              "text": "소리가 겹쳐 무엇에 동의했는지 알 수 없다. 벨이 회의를 멈추고 양식을 다시 나눠 준다. 여러분은 설계자의 설명을 구하러 병원으로 향한다.",
              "next": "clinic",
              "set": [
                "press_open"
              ],
              "clues": [
                "ballot"
              ],
              "pressure": 2
            }
          }
        }
      ],
      "dialogue": {
        "who": "벨",
        "text": "빈칸을 찬성으로 세면 인쇄는 빨라지죠. 그다음부터는 아무도 읽을 이유가 없어져요."
      },
      "details": [
        {
          "id": "forms",
          "label": "새 서명지의 항목을 확인한다",
          "text": "찬성, 거부, 질문이 있음. 세 칸 모두 기록된다. 거부한 사람의 시간은 쓰지 않는다는 문구도 있다.",
          "clue": "ballot"
        }
      ]
    },
    "clinic": {
      "id": "clinic",
      "title": "십 분을 빌린 사람",
      "chapter": 2,
      "location": "오름 종합병원 · 회복실",
      "art": 1,
      "mood": "calm",
      "text": [
        "도시 설계자 서진은 병상에서 작은 시계를 수리한다. 멈춘 시계를 고치는 것이 아니라, 뒷판에 새겨진 자기 이름을 긁어내고 있다. “내가 만든 편의를, 내 이름 때문에 믿게 하고 싶지 않아서요.”",
        "그는 병원에서 얻은 십 분 덕분에 살아남았다고 말한다. 하지만 그 십 분의 비용을 이름 모를 시민에게 떠넘기는 계약에는 서명한 적이 없다. 침대 옆에는 원래 분리 장치의 모형이 놓여 있다."
      ],
      "objective": "설계자의 증언과 사람을 지키는 분리 절차를 확보한다.",
      "entities": [
        {
          "id": "seojin",
          "label": "도시 설계자 서진",
          "kind": "person",
          "aliases": [
            "서진",
            "설계자",
            "노인"
          ]
        },
        {
          "id": "model",
          "label": "황동 안전 링 모형",
          "kind": "object",
          "aliases": [
            "모형",
            "링",
            "설계"
          ]
        },
        {
          "id": "medicine",
          "label": "체온계와 담요",
          "kind": "object",
          "aliases": [
            "담요",
            "체온계"
          ]
        }
      ],
      "choices": [
        {
          "id": "record",
          "label": "서진을 안정시키고 원래 설계에 관한 증언을 받는다",
          "intent": "help",
          "target": "seojin",
          "keywords": [
            "증언",
            "물",
            "안정",
            "서진",
            "담요"
          ],
          "stat": "heart",
          "dc": 10,
          "risk": "증언을 재촉하면 서진이 말을 마치지 못한다.",
          "outcomes": {
            "success": {
              "text": "서진은 물을 마신 뒤 문장마다 직접 확인한다. “시간을 빌리는 데 동의하지 않은 사람은 담보가 될 수 없다.” 그는 분리 장치 위치까지 설명한다.",
              "next": "roof",
              "set": [
                "maker_helped"
              ],
              "clues": [
                "maker",
                "release",
                "clause"
              ]
            },
            "mixed": {
              "text": "호흡이 짧아져 긴 증언은 못 받는다. 핵심 문장과 안전 링 위치만 기록하고 그를 쉬게 한다.",
              "next": "gearworks",
              "set": [
                "maker_helped"
              ],
              "clues": [
                "maker",
                "release"
              ],
              "pressure": 1
            },
            "failure": {
              "text": "서진이 기침 때문에 말을 잇지 못한다. 여러분은 그의 손짓으로 안전 모형의 분리 레버만 확인한다. 간호사가 남은 증언을 받아 두기로 한다.",
              "next": "gearworks",
              "clues": [
                "release"
              ],
              "pressure": 1
            }
          }
        },
        {
          "id": "model-study",
          "label": "모형을 해체해 현재 종탑에서 바뀐 부품을 찾는다",
          "intent": "investigate",
          "target": "model",
          "keywords": [
            "모형",
            "분해",
            "부품",
            "도면",
            "축"
          ],
          "stat": "wit",
          "dc": 11,
          "risk": "해체가 늦어지면 종추를 붙잡을 시간이 줄어든다.",
          "outcomes": {
            "success": {
              "text": "현재 도면에는 안전 링을 우회하는 자동 갱신 축이 추가됐다. 그 축만 빼면 사람과 시간을 분리할 수 있다.",
              "next": "gearworks",
              "clues": [
                "release",
                "maker"
              ]
            },
            "mixed": {
              "text": "우회 축은 찾았지만 정확한 크기를 알 수 없다. 현장 기계실에서 조정해야 한다.",
              "next": "gearworks",
              "clues": [
                "release"
              ],
              "pressure": 1
            },
            "failure": {
              "text": "모형의 축이 부러진다. 서진은 남은 고리를 가리키며 종추부터 잡으라고 한다. 여러분은 옥상 길로 향한다.",
              "next": "roof",
              "clues": [
                "anchor"
              ],
              "pressure": 2
            }
          }
        }
      ],
      "dialogue": {
        "who": "서진",
        "text": "필요한 사람이 시간을 빌릴 수는 있어야죠. 그런데 갚을 사람을 몰래 정하면 안 돼요."
      },
      "details": [
        {
          "id": "drawing",
          "label": "병상 옆의 최초 도면을 본다",
          "text": "안전 링을 끊어도 사람과 건물은 남는다. 대신 시간 금고에 의존한 급행과 자동 편의가 모두 멈춘다.",
          "clue": "release"
        }
      ]
    },
    "council": {
      "id": "council",
      "title": "정오 이전의 작은 의회",
      "chapter": 2,
      "location": "구청 앞 우천 대기실",
      "art": 1,
      "mood": "tension",
      "text": [
        "의회 회의실은 이미 내일로 넘어가 출입할 수 없다. 주민들은 비를 피하는 대기실에 접이식 의자를 둔다. 의장은 없고, 준우가 젖은 편지 가방 위에 발언 순서를 적는다.",
        "급행망을 자주 쓴 사람, 한 번도 쓰지 않은 사람, 그 덕분에 생명을 구한 사람이 한자리에 있다. 논쟁이 멈추는 순간 도시가 사라지는 것은 아니다. 오히려 누가 무엇을 선택했는지 남기지 않으면 계약이 자동으로 채워진다."
      ],
      "objective": "가능한 해결책과 그 대가를 설명하고 위임을 받는다.",
      "entities": [
        {
          "id": "residents",
          "label": "대기실의 주민들",
          "kind": "person",
          "aliases": [
            "주민",
            "의회"
          ]
        },
        {
          "id": "ballots",
          "label": "선택을 기록하는 서명지",
          "kind": "object",
          "aliases": [
            "서명",
            "양식",
            "종이"
          ]
        },
        {
          "id": "junwoo",
          "label": "임시 진행자 준우",
          "kind": "person",
          "aliases": [
            "준우",
            "진행자"
          ]
        }
      ],
      "choices": [
        {
          "id": "consent",
          "label": "기부와 거부를 모두 보장하는 새 합의를 제안한다",
          "intent": "talk",
          "target": "residents",
          "keywords": [
            "합의",
            "동의",
            "기부",
            "거부",
            "위임"
          ],
          "stat": "heart",
          "dc": 12,
          "risk": "강요로 들리면 서명 대신 불신이 남는다.",
          "outcomes": {
            "success": {
              "text": "여러분은 싫다고 말해도 대피할 권리는 같다고 먼저 설명한다. 자발적 기부와 거부가 나란히 기록되고 새 계약을 심의할 위임을 받는다.",
              "next": "roof",
              "set": [
                "mandate_obtained"
              ],
              "clues": [
                "ballot"
              ]
            },
            "mixed": {
              "text": "합의는 이뤄졌지만 설명에 더 많은 시간이 들었다. 주민들은 종이 사본을 각자 들고 당신들에게 심의를 맡긴다.",
              "next": "roof",
              "set": [
                "mandate_obtained"
              ],
              "clues": [
                "ballot"
              ],
              "pressure": 1
            },
            "failure": {
              "text": "논의가 서로의 빚을 묻는 싸움으로 번진다. 강제로 서명을 받지 않고 안전 링 분리 계획을 준비하기로 한다.",
              "next": "gearworks",
              "clues": [
                "ballot"
              ],
              "pressure": 2
            }
          }
        },
        {
          "id": "evacuate",
          "label": "의견이 달라도 함께 나갈 외곽 전차를 준비한다",
          "intent": "help",
          "target": "junwoo",
          "keywords": [
            "대피",
            "전차",
            "준비",
            "준우",
            "외곽"
          ],
          "stat": "wit",
          "dc": 11,
          "risk": "수송 계획이 어긋나면 주민들이 다른 승강장에 모인다.",
          "outcomes": {
            "success": {
              "text": "준우가 집마다 대피표를 넣고 세란이 전차를 연결한다. 어떤 결말을 택하든 사람을 빼낼 길이 마련된다.",
              "next": "gearworks",
              "set": [
                "trams_ready"
              ],
              "clues": [
                "route"
              ]
            },
            "mixed": {
              "text": "승강장 표지판이 지워져 사람이 분산된다. 이름을 부르는 안내원을 세워 한곳으로 모은다.",
              "next": "gearworks",
              "set": [
                "trams_ready"
              ],
              "pressure": 1
            },
            "failure": {
              "text": "전차의 급행 동력이 멎는다. 옛 수동 선로를 따라 걸어서 나갈 대피선을 만든 뒤 종탑의 종추를 잡으러 간다.",
              "next": "roof",
              "clues": [
                "route"
              ],
              "pressure": 2
            }
          }
        }
      ],
      "dialogue": {
        "who": "한 주민",
        "text": "반대하면 구조를 못 받는 거라면 그건 동의가 아니잖아요."
      },
      "details": [
        {
          "id": "ledger",
          "label": "누적 시간 비용의 분배표를 공개한다",
          "text": "단축된 행정 업무와 급행망 수익은 일부 기관에 모였지만 비용은 주민 전체에게 나뉘었다.",
          "clue": "debts"
        }
      ],
      "callbacks": [
        {
          "when": {
            "flag": "press_open"
          },
          "text": "인쇄소에서 배포한 설명서를 가진 주민들이 질문을 구체적으로 이어 간다."
        },
        {
          "when": {
            "flag": "original_found"
          },
          "text": "여러분이 가져온 황동 계약은 자동 동의가 무효라는 주장의 근거가 된다."
        }
      ]
    },
    "roof": {
      "id": "roof",
      "title": "하늘에 걸린 종추",
      "chapter": 3,
      "location": "시계탑으로 이어지는 지붕길",
      "art": 2,
      "mood": "danger",
      "text": [
        "도시의 지붕 사이에 거대한 종추의 그림자가 걸려 있다. 정오의 종은 금속 소리가 아니라 도시 전체에 보내는 계약 확정 신호다. 종추를 붙잡으면 잠깐이나마 판단할 시간을 벌 수 있다.",
        "윤은 옥상 물탱크에서 나온 긴 사슬을 끌고 온다. 아래에서는 우산들이 조금씩 서로 다른 방향으로 움직이기 시작한다. 아직 사람들은 같은 결정을 하지 않았고, 그것이 이제는 다행처럼 보인다."
      ],
      "objective": "종의 확정을 늦추고 종탑 핵심부에 닿는다.",
      "entities": [
        {
          "id": "chain",
          "label": "물탱크의 긴 사슬",
          "kind": "object",
          "aliases": [
            "사슬",
            "줄"
          ]
        },
        {
          "id": "clapper",
          "label": "시간 종의 종추",
          "kind": "object",
          "aliases": [
            "종추",
            "종"
          ]
        },
        {
          "id": "roof",
          "label": "빗물 젖은 지붕길",
          "kind": "place",
          "aliases": [
            "지붕",
            "길"
          ]
        }
      ],
      "choices": [
        {
          "id": "bind",
          "label": "사슬을 종추에 걸어 마지막 울림을 붙잡는다",
          "intent": "force",
          "target": "chain",
          "keywords": [
            "사슬",
            "종추",
            "걸",
            "묶",
            "붙잡"
          ],
          "stat": "might",
          "dc": 13,
          "risk": "사슬이 끊기면 충격이 일행 전체를 덮친다. 이미 다친 동료는 사망할 수 있다.",
          "outcomes": {
            "success": {
              "text": "사슬이 팽팽해지고 종추가 한 뼘 앞에서 멈춘다. 소리를 기다리던 하늘의 균열도 잠시 움직임을 멈춘다.",
              "next": "tower",
              "set": [
                "bell_held"
              ],
              "clues": [
                "anchor"
              ]
            },
            "mixed": {
              "text": "종추는 잡았지만 사슬의 고정대가 지붕을 찢는다. 윤이 다른 기둥으로 옮기는 동안 당신들이 탑 안에 들어간다.",
              "next": "tower",
              "set": [
                "bell_held"
              ],
              "clues": [
                "anchor"
              ],
              "pressure": 1
            },
            "failure": {
              "text": "사슬이 끊겨 일행을 난간으로 밀친다. 첫 울림과 함께 몸에 충격이 전해진다. 점검문이 열리자 남은 일행은 그 틈으로 탑 안에 들어간다.",
              "next": "tower",
              "clues": [
                "anchor"
              ],
              "pressure": 2,
              "harmAll": 1
            }
          }
        },
        {
          "id": "cross",
          "label": "종추가 지나간 직후 지붕 사이를 건넌다",
          "intent": "move",
          "target": "roof",
          "keywords": [
            "지붕",
            "건너",
            "뛰",
            "점검문",
            "길"
          ],
          "stat": "agility",
          "dc": 12,
          "risk": "지붕 사이를 건너다 추락하면 사망할 수 있다. 종추를 사슬로 잡는 방법이 상대적으로 안전하다.",
          "outcomes": {
            "success": {
              "text": "진자가 지나가고 남은 침묵 속으로 뛰어든다. 점검 난간에 안전 줄을 걸어 모두가 탑 안으로 건너간다.",
              "next": "tower"
            },
            "mixed": {
              "text": "마지막 발판이 사라진다. 서로의 손목을 잡아 끌어올린 뒤 젖은 장비를 두고 탑에 들어간다.",
              "next": "tower",
              "pressure": 1
            },
            "failure": {
              "text": "지붕길 일부가 어제로 접힌다. 발밑이 사라지고 추락한 몸을 안전 줄이 버티지 못한다. 남은 일행은 윤이 연 점검문으로 들어간다.",
              "next": "tower",
              "pressure": 2,
              "harm": 3
            }
          }
        }
      ],
      "dialogue": {
        "who": "윤",
        "text": "시계를 늦게 맞췄다고 이렇게까지 혼날 일은 아니었으면 좋겠어요."
      },
      "details": [
        {
          "id": "sound",
          "label": "종의 울림과 균열의 관계를 본다",
          "text": "종추가 움직일 때마다 계약 문장이 하늘에 새겨진다. 종을 멈추는 것은 확정을 늦출 뿐 계약 자체를 없애지는 못한다.",
          "clue": "anchor"
        }
      ]
    },
    "gearworks": {
      "id": "gearworks",
      "title": "도시보다 오래된 손잡이",
      "chapter": 3,
      "location": "종탑 하부 · 구동 기계실",
      "art": 2,
      "mood": "danger",
      "text": [
        "새 기계는 매끈하고 빠르다. 낡은 황동 손잡이는 그 뒤에 가려 손자국 하나 남지 않았다. 자동 갱신 축은 안전 링을 건너뛰고 도시의 생명 신호를 곧장 시간 금고에 연결한다.",
        "“편의 개선”이라는 금속 명판 아래로 주민들의 이름이 흘러간다. 여러분이 멈춰야 할 것은 도시의 시간 전체가 아니라, 사람의 동의 없이 돌아가는 연결 하나다.",
        "구동축 옆에는 일행의 반환 순간을 동시에 연결하는 연동기가 있다. 성공하면 종의 확정을 늦추고 분리 링을 보정한 채 심의석으로 바로 도약한다. 그러나 기준 순간을 잘못 맞추면 일행 모두의 현재와 반환 기록이 함께 지워진다. 윤은 개별 장치를 손보는 두 방법을 먼저 권한다."
      ],
      "objective": "자동 담보 연결을 끊을 준비를 한다.",
      "entities": [
        {
          "id": "axle",
          "label": "자동 갱신 축",
          "kind": "object",
          "aliases": [
            "축",
            "연결"
          ]
        },
        {
          "id": "ring",
          "label": "황동 안전 링",
          "kind": "object",
          "aliases": [
            "링",
            "안전장치"
          ]
        },
        {
          "id": "crank",
          "label": "낡은 수동 손잡이",
          "kind": "object",
          "aliases": [
            "손잡이"
          ]
        },
        {
          "id": "return-link",
          "label": "반환 순간 연동기",
          "kind": "object",
          "aliases": [
            "연동기",
            "반환 연동",
            "시간 지름길",
            "일행의 순간"
          ]
        }
      ],
      "choices": [
        {
          "id": "remove",
          "label": "부하가 줄어드는 순간 갱신 축을 뽑는다",
          "intent": "use",
          "target": "axle",
          "keywords": [
            "축",
            "뽑",
            "타이밍",
            "갱신",
            "분리"
          ],
          "stat": "agility",
          "dc": 12,
          "risk": "과열된 축이 튀면 크게 다칠 수 있다.",
          "outcomes": {
            "success": {
              "text": "마지막 톱니가 지나갈 때 축을 뽑는다. 주민 이름의 흐름이 멎고 안전 링에 수동 제어등이 켜진다.",
              "next": "tower",
              "set": [
                "ring_ready"
              ],
              "clues": [
                "release"
              ]
            },
            "mixed": {
              "text": "축은 빠졌지만 인접 기어가 부러졌다. 급행망이 먼저 멈춘다. 사람을 지키는 분리 기능은 살아 있다.",
              "next": "tower",
              "set": [
                "ring_ready"
              ],
              "clues": [
                "release"
              ],
              "pressure": 1
            },
            "failure": {
              "text": "축이 과열돼 튀어나온다. 파편에 크게 다친 사람을 윤이 우회 통로로 옮긴다. 최종 분리의 방법은 남았지만 기계실에 더 머물 수는 없다.",
              "next": "tower",
              "clues": [
                "release"
              ],
              "pressure": 2,
              "harm": 2
            }
          }
        },
        {
          "id": "crank",
          "label": "수동 손잡이를 돌려 안전 링을 제어한다",
          "intent": "force",
          "target": "crank",
          "keywords": [
            "손잡이",
            "돌",
            "수동",
            "안전",
            "힘"
          ],
          "stat": "might",
          "dc": 11,
          "risk": "고정핀이 부러지면 손잡이의 충격에 부상을 입는다.",
          "outcomes": {
            "success": {
              "text": "한 바퀴마다 이름들이 제자리로 돌아온다. 마지막 바퀴에서 안전 링이 탑의 제어권을 받아들인다.",
              "next": "tower",
              "set": [
                "ring_ready"
              ],
              "clues": [
                "release"
              ]
            },
            "mixed": {
              "text": "손잡이가 반쯤 휘었지만 안전 링은 반응했다. 나머지 조작은 탑 꼭대기에서 이어갈 수 있다.",
              "next": "tower",
              "set": [
                "ring_ready"
              ],
              "pressure": 1
            },
            "failure": {
              "text": "고정핀이 부러진다. 여러분은 핀의 모양을 챙겨 꼭대기 제어기에 대입하기로 한다. 해결책은 남았지만 시간이 줄었다.",
              "next": "tower",
              "pressure": 2,
              "harm": 1
            }
          }
        },
        {
          "id": "anchor-shortcut",
          "label": "일행의 반환 순간을 연결해 도약한다 · 전멸 위험",
          "intent": "use",
          "target": "return-link",
          "keywords": [
            "연동",
            "순간",
            "도약",
            "지름길",
            "동시에",
            "반환"
          ],
          "stat": "wit",
          "dc": 15,
          "risk": "실패하면 일행 전체의 존재와 반환 기록이 지워져 모두 생명 3을 잃고 사망한다. 성공하면 종을 지연시키고 분리 링을 준비한 상태로 금고 장면을 건너뛰어 심의석에 도착한다. 개별 축이나 손잡이를 쓰는 방법이 더 안전하다.",
          "outcomes": {
            "success": {
              "text": "각자의 입장 시각을 한순간으로 덮지 않고 연결한다. 종추가 느려지고 황동 안전 링이 제자리를 찾는다. 빗물 소리가 끊긴 다음 발걸음에서, 일행은 이의 심의석 앞에 서 있다.",
              "next": "hearing",
              "set": [
                "bell_held",
                "ring_ready"
              ],
              "clues": [
                "release",
                "anchor"
              ],
              "pressure": -1
            },
            "mixed": {
              "text": "연결은 됐지만 서로 어긋난 순간이 몸을 당긴다. 일행 모두 충격을 입고 심의석으로 밀려 나온다. 종의 확정은 늦춰졌으며 분리 링도 준비됐지만 금고의 균열은 더 깊어졌다.",
              "next": "hearing",
              "set": [
                "bell_held",
                "ring_ready"
              ],
              "clues": [
                "release",
                "anchor"
              ],
              "pressure": 2,
              "harmAll": 1
            },
            "failure": {
              "text": "서로 다른 입장 순간이 하나의 빈칸으로 겹친다. 일행의 현재와 반환 기록이 동시에 지워진다. 누구의 손도 손잡이에 남지 않고, 이름을 되돌려 부를 동료도 사라진다.",
              "next": "hearing",
              "pressure": 3,
              "harmAll": 3
            }
          }
        }
      ],
      "dialogue": {
        "who": "윤",
        "text": "한 번은 사람이 확인하게 해 둔 장치를, 누군가는 불편하다고 불렀군요."
      },
      "details": [
        {
          "id": "plate",
          "label": "안전 링의 명판을 읽는다",
          "text": "금고 분리 시 주민과 건물은 보존된다. 급행망, 자동 단축, 빌린 편의는 즉시 중단된다.",
          "clue": "release"
        }
      ]
    },
    "tower": {
      "id": "tower",
      "title": "정오를 청구하는 금고",
      "chapter": 3,
      "location": "시계탑 · 시간 금고",
      "art": 2,
      "mood": "tension",
      "text": [
        "금고는 금화 대신 사람들의 미뤄 둔 순간으로 차 있다. 놓칠 뻔한 막차, 기다리지 않아도 됐던 진료, 빨리 끝난 행정 절차가 작은 유리 구슬 안에서 빛난다. 그 사이에 누군가에게 통보되지 않은 비용이 섞여 있다.",
        "자동 심의기가 세 개의 창을 띄운다. 기존 계약 확정, 이의 심의, 금고 분리. 첫 번째 창만 크고 밝다. 두 번째는 질문이 필요하고, 세 번째는 편의를 포기해야 한다.",
        "시간 금고의 작은 반환구에는 사망한 동료의 마지막 온전한 순간이 남아 있다. 최종 결정을 내리기 전에만 현재로 되돌리는 부활을 시도할 수 있다."
      ],
      "objective": "자동 확정을 멈추고 남아 있는 해결 경로를 연다.",
      "entities": [
        {
          "id": "arbiter",
          "label": "계약 자동 심의기",
          "kind": "object",
          "aliases": [
            "심의기",
            "계약"
          ]
        },
        {
          "id": "gold-ring",
          "label": "최종 분리 링",
          "kind": "object",
          "aliases": [
            "링",
            "분리"
          ]
        },
        {
          "id": "archive",
          "label": "유리 구슬 기록함",
          "kind": "object",
          "aliases": [
            "구슬",
            "기록"
          ]
        }
      ],
      "choices": [
        {
          "id": "appeal",
          "label": "실제 서명 없는 계약에 이의를 제기한다",
          "intent": "talk",
          "target": "arbiter",
          "keywords": [
            "이의",
            "서명",
            "계약",
            "심의",
            "동의"
          ],
          "stat": "heart",
          "dc": 12,
          "risk": "심의기를 설득하지 못하면 남은 시간을 분리에 써야 한다.",
          "outcomes": {
            "success": {
              "text": "당신이 빈 서명란을 보여 주자 가장 밝던 확정 창이 꺼진다. 심의기는 처음으로 당사자의 발언을 요청한다.",
              "next": "hearing",
              "clues": [
                "automatic"
              ]
            },
            "mixed": {
              "text": "심의는 열리지만 제한 시간이 짧아진다. 필요한 문장만 골라 말해야 한다.",
              "next": "hearing",
              "pressure": 1
            },
            "failure": {
              "text": "기계는 가입을 동의로 간주하려 한다. 여러분은 강제 확정을 받아들이지 않고 최종 분리 링 앞으로 이동한다.",
              "next": "release",
              "pressure": 2
            }
          }
        },
        {
          "id": "prepare-release",
          "label": "빌린 편의를 포기할 각오로 분리 장치를 준비한다",
          "intent": "choose",
          "keywords": [
            "분리",
            "포기",
            "링",
            "안전"
          ],
          "automatic": true,
          "outcomes": {
            "success": {
              "text": "윤이 최종 링을 잡는다. “도시는 천천히 움직여도 됩니다.” 주민을 담보로 연결한 마지막 선이 여러분 앞에 드러난다.",
              "next": "release",
              "set": [
                "ring_ready"
              ],
              "clues": [
                "release"
              ]
            }
          }
        },
        {
          "id": "save-record",
          "label": "도시의 이름과 기록을 외곽 선로로 전송한다",
          "intent": "use",
          "target": "archive",
          "keywords": [
            "기록",
            "이름",
            "전송",
            "보관",
            "구슬"
          ],
          "stat": "wit",
          "dc": 11,
          "risk": "전송이 늦어지면 기록 일부를 손으로 가져가야 한다.",
          "outcomes": {
            "success": {
              "text": "광장에서 부른 이름과 주민들의 기록이 급행망 밖 저장소로 건너간다. 도시를 떠나더라도 그들의 주소를 다시 쓸 수 있다.",
              "next": "hearing",
              "set": [
                "archive_saved"
              ],
              "clues": [
                "route"
              ]
            },
            "mixed": {
              "text": "이름 목록은 보냈지만 사진 기록은 일부 남는다. 모라가 손으로 옮길 목록을 적어 둔다.",
              "next": "hearing",
              "set": [
                "archive_saved"
              ],
              "pressure": 1
            },
            "failure": {
              "text": "망이 끊긴다. 여러분은 가장 오래된 종이 명부를 품에 안고 최종 장치로 이동한다. 기록 전체 대신 이름부터 지킨다.",
              "next": "release",
              "pressure": 2
            }
          }
        }
      ],
      "dialogue": {
        "who": "자동 심의기",
        "text": "편의 향상에 동의하셨으므로 생존 담보에도 동의하신 것으로…"
      },
      "details": [
        {
          "id": "blank-signature",
          "label": "확정 직전 계약의 서명란을 확대한다",
          "text": "수십 년 동안 시민의 실제 서명은 한 번도 확인되지 않았다. 자동 동의 계정 하나가 모든 칸을 채웠다.",
          "clue": "automatic"
        },
        {
          "id": "return-drawer",
          "label": "반환 서랍의 기록을 확인한다",
          "text": "현재 입장 기록과 연결된 온전한 신체·의식의 순간이 남아 있다. 그 순간을 불러 부활시키려면 기부 시간과 금고의 안정성을 소비한다.",
          "clue": "return"
        }
      ],
      "callbacks": [
        {
          "when": {
            "flag": "bell_held"
          },
          "text": "사슬이 버티는 동안 확정 창의 깜빡임이 느리다. 옥상에서 번 시간이 여기까지 닿았다."
        },
        {
          "when": {
            "flag": "ring_ready"
          },
          "text": "황동 안전 링이 수동 조작을 기다린다. 심의가 실패해도 사람을 구할 다른 길은 남아 있다."
        }
      ],
      "resurrection": {
        "label": "반환 서랍에서 동료의 마지막 순간 되돌리기",
        "text": "사망한 동료의 마지막 온전한 순간을 현재로 당긴다. 불꽃 1개와 시간 안정성을 쓰며 실패할 수 있다.",
        "sparkCost": 1,
        "pressureCost": 2,
        "dc": 12,
        "requires": {
          "clue": "return"
        }
      }
    },
    "hearing": {
      "id": "hearing",
      "title": "거절할 사람의 자리",
      "chapter": 3,
      "location": "시간 금고 · 이의 심의석",
      "art": 2,
      "mood": "calm",
      "text": [
        "심의석에는 사람 수만큼 의자가 생기지 않는다. 찬성, 거부, 아직 모름. 세 의자만 있다. 자동 심의기는 가장 편한 첫 번째 의자를 가리키며 시민 전체를 대표하라고 요구한다.",
        "여러분은 다른 두 의자가 빈자리가 아니라는 것을 알고 있다. 시간이 부족해도 누군가의 의사를 대신 만들어 낼 권한까지 생기는 것은 아니다. 새 합의가 가능하다면 서로 다른 대답을 담아야 한다."
      ],
      "objective": "원래 계약에 따라 다른 선택들을 인정받는다.",
      "entities": [
        {
          "id": "seats",
          "label": "세 개의 심의 의자",
          "kind": "object",
          "aliases": [
            "의자",
            "자리"
          ]
        },
        {
          "id": "arbiter",
          "label": "자동 심의기",
          "kind": "object",
          "aliases": [
            "심의기"
          ]
        },
        {
          "id": "ballots",
          "label": "시민 의견 기록",
          "kind": "object",
          "aliases": [
            "기록",
            "서명"
          ]
        }
      ],
      "choices": [
        {
          "id": "rights",
          "label": "원본의 거부 조항을 근거로 자동 담보를 무효로 한다",
          "intent": "investigate",
          "target": "arbiter",
          "keywords": [
            "조항",
            "원본",
            "무효",
            "거부",
            "계약"
          ],
          "stat": "wit",
          "dc": 11,
          "risk": "논증이 미흡하면 금고 분리 또는 대피를 택해야 한다.",
          "outcomes": {
            "success": {
              "text": "최초 계약과 자동 갱신의 모순이 확인된다. 심의기는 강제 담보를 무효로 하고 새 합의나 분리를 선택할 권한을 돌려준다.",
              "next": "release",
              "clues": [
                "clause"
              ]
            },
            "mixed": {
              "text": "무효 결정은 났지만 금고의 적자가 빠르게 늘어난다. 이제 최종 선택을 미룰 수 없다.",
              "next": "release",
              "clues": [
                "clause"
              ],
              "pressure": 1
            },
            "failure": {
              "text": "오래된 문장 일부가 지워져 심의기는 결론을 내리지 못한다. 여러분은 강제 계약을 거부하고 분리 장치로 향한다.",
              "next": "release",
              "pressure": 2
            }
          },
          "requires": {
            "clue": "clause"
          }
        },
        {
          "id": "voices",
          "label": "찬성뿐 아니라 거부한 주민의 말도 그대로 읽는다",
          "intent": "talk",
          "target": "ballots",
          "keywords": [
            "거부",
            "찬성",
            "주민",
            "말",
            "서명"
          ],
          "stat": "heart",
          "dc": 12,
          "risk": "의사를 한데 묶으면 위임을 인정받지 못한다.",
          "outcomes": {
            "success": {
              "text": "서로 다른 대답이 세 의자를 채운다. 새 계약은 참여자의 기부만 쓰고 거부자의 대피권을 보장하는 방식으로 열렸다.",
              "next": "release",
              "set": [
                "mandate_obtained"
              ],
              "clues": [
                "clause",
                "ballot"
              ]
            },
            "mixed": {
              "text": "한 사람의 거부를 확인하느라 시간이 더 들었다. 빈칸을 억지로 채우지 않은 기록이 최종적으로 인정된다.",
              "next": "release",
              "set": [
                "mandate_obtained"
              ],
              "clues": [
                "clause",
                "ballot"
              ],
              "pressure": 1
            },
            "failure": {
              "text": "대표 발언만으로 모든 의사를 증명할 수 없다. 여러분은 위임을 부풀리지 않고 원래 계약을 끊는 길을 남긴다.",
              "next": "release",
              "pressure": 2
            }
          },
          "requires": {
            "clue": "ballot"
          }
        },
        {
          "id": "no-claim",
          "label": "확실하지 않은 동의를 주장하지 않고 최종 장치로 간다",
          "intent": "choose",
          "keywords": [
            "분리",
            "대피",
            "모르",
            "그만",
            "장치"
          ],
          "automatic": true,
          "outcomes": {
            "success": {
              "text": "모르는 것을 허락으로 바꾸지 않는다. 윤은 고개를 끄덕이고 금고 분리와 외곽 대피의 두 절차를 꺼낸다.",
              "next": "release"
            }
          }
        }
      ],
      "dialogue": {
        "who": "윤",
        "text": "급하다고 빈 의자를 찬성한 사람으로 세지는 맙시다."
      },
      "details": [
        {
          "id": "original-wall",
          "label": "심의석에 새겨진 최초 조건을 읽는다",
          "text": "시간을 낼 의무는 없다. 내지 않는 사람을 위험에 두어 참여를 강제하지도 못한다.",
          "clue": "clause"
        }
      ]
    },
    "release": {
      "id": "release",
      "title": "열세 분을 누구에게 돌려줄까",
      "chapter": 3,
      "location": "시계탑 · 최종 결정대",
      "art": 2,
      "mood": "tension",
      "text": [
        "마지막 종이 울릴 준비를 한다. 그러나 지금 여러분 앞에는 처음의 자동 확정 화면과 다른 선택지가 있다. 시간 금고를 떼어 내 도시를 느리게 만들거나, 주민과 기록을 경계 밖으로 옮겨 새 터전을 만들 수 있다.",
        "명시적인 합의와 원래 거부 조항을 확보했다면 자발적으로 내는 시간만 모으는 공동 금고도 가능하다. 어떤 선택을 하든, 빌린 편의가 공짜였다는 거짓말로 돌아갈 수는 없다."
      ],
      "objective": "도시와 주민들이 앞으로 시간을 쓰는 방식을 정한다.",
      "entities": [
        {
          "id": "ring",
          "label": "황동 분리 링",
          "kind": "object",
          "aliases": [
            "링",
            "분리"
          ]
        },
        {
          "id": "exit",
          "label": "외곽 선로의 출구",
          "kind": "place",
          "aliases": [
            "선로",
            "출구"
          ]
        },
        {
          "id": "agreement",
          "label": "새 계약 입력판",
          "kind": "object",
          "aliases": [
            "계약",
            "입력판"
          ]
        }
      ],
      "choices": [
        {
          "id": "slow-city",
          "label": "금고를 분리하고 느리지만 남아 있는 도시를 택한다",
          "intent": "choose",
          "keywords": [
            "분리",
            "느리",
            "도시",
            "링"
          ],
          "automatic": true,
          "outcomes": {
            "success": {
              "text": "황동 링을 끊는다. 급행과 자동 단축이 멎고 비가 제 속도로 흐른다. 사람과 집은 남는다. 서두르지 않는 첫 정오가 온다.",
              "next": "ending-slow"
            }
          }
        },
        {
          "id": "leave",
          "label": "사람과 기록을 데리고 외곽 선로 너머로 떠난다",
          "intent": "choose",
          "keywords": [
            "떠나",
            "대피",
            "외곽",
            "기록"
          ],
          "automatic": true,
          "outcomes": {
            "success": {
              "text": "집을 지키기 위해 사람을 묶어 두지 않기로 한다. 주민들이 이름을 부르며 경계 밖으로 걸어간다. 모라는 새 주소를 쓸 빈 종이를 꺼낸다.",
              "next": "ending-newtown"
            }
          }
        },
        {
          "id": "common-time",
          "label": "거부권이 있는 시민 공동 금고로 다시 계약한다",
          "intent": "choose",
          "keywords": [
            "공동",
            "기부",
            "합의",
            "새 계약"
          ],
          "automatic": true,
          "outcomes": {
            "success": {
              "text": "찬성과 거부가 함께 적힌 계약을 넣는다. 기부한 시간만 흐르는 작은 금고가 켜진다. 커다란 자동 동의 창은 끝내 돌아오지 않는다.",
              "next": "ending-common"
            }
          },
          "requires": {
            "flag": "mandate_obtained",
            "clue": "clause"
          }
        }
      ],
      "dialogue": {
        "who": "윤",
        "text": "정오를 지키는 것보다 정오를 맞을 사람들을 지키는 게 먼저였네요."
      },
      "callbacks": [
        {
          "when": {
            "flag": "trams_ready"
          },
          "text": "외곽 전차의 출발 종이 들린다. 어떤 선택에도 대피할 길은 준비돼 있다."
        },
        {
          "when": {
            "flag": "mandate_obtained"
          },
          "text": "자발적인 기부와 거부가 모두 기록돼 있다. 새 계약을 대표할 근거를 확보했다."
        }
      ]
    },
    "ending-slow": {
      "id": "ending-slow",
      "title": "천천히 오는 정오",
      "chapter": 4,
      "location": "에필로그",
      "art": 3,
      "mood": "hope",
      "ending": true,
      "text": [
        "오름시의 버스는 이제 실제 거리를 달린다. 행정 창구에서는 기다려야 하고, 병원은 더 많은 사람을 고용해야 한다. 무료로 보이던 편의의 값을 처음으로 예산표에 적는다.",
        "윤은 시계탑을 약속을 알리는 종탑으로 바꾼다. 늦었다고 사람이 사라지지 않는 도시에서, 세란은 정시 운행률 대신 모두가 내렸는지 기록한다. 광장의 고지서 기계는 우산을 빌려주는 장치가 된다."
      ],
      "epilogues": [
        {
          "when": {
            "flag": "debt_public"
          },
          "text": "공개된 분배표를 근거로 급행망의 이익을 얻은 기관에 비용이 청구된다. 이용하지 않은 주민의 이름은 빚 명단에서 지워진다."
        },
        {
          "when": {
            "flag": "maker_helped"
          },
          "text": "서진은 새 안전 장치의 첫 항목을 직접 쓴다. “불편해도 확인은 건너뛰지 않는다.”"
        },
        {
          "when": {
            "flag": "passengers_safe"
          },
          "text": "전차 승객들이 종탑 앞에 작은 벤치를 놓는다. 기다릴 때 앉으라는, 이 도시답지 않게 느긋한 선물이다."
        }
      ],
      "question": "편의를 유지하려면 누군가가 보이지 않는 값을 내야 한다는 사실을 언제 알아챘나요?",
      "choices": []
    },
    "ending-newtown": {
      "id": "ending-newtown",
      "title": "지도는 나중에 그리자",
      "chapter": 4,
      "location": "에필로그",
      "art": 3,
      "mood": "hope",
      "ending": true,
      "text": [
        "외곽 선로 너머에서 사람들은 서로의 이름부터 확인한다. 시간 금고에 묶인 옛 도시는 정오의 안개 속으로 접힌다. 누구도 그것을 깔끔한 승리라고 부르지 않는다. 잃은 집과 살아 돌아온 사람이 동시에 진실이다.",
        "새 마을의 첫 우편함에는 주소가 없다. 준우는 사람 이름을 쓰고 그 옆에 “정확한 위치는 물어볼 것”이라고 적는다. 모라는 도서관의 첫 책을 오늘의 증언으로 만든다. 도시가 건물만은 아니라는 말이 이번에는 위로 이상의 일이 된다."
      ],
      "epilogues": [
        {
          "when": {
            "flag": "archive_saved"
          },
          "text": "옮겨 둔 기록 덕분에 사라진 거리의 이름과 사진을 복구한다. 새 지도는 기억을 없애는 대신 그 위에 천천히 그려진다."
        },
        {
          "when": {
            "flag": "trams_ready"
          },
          "text": "세란의 전차는 여러 차례 왕복했다. 걷기 힘든 주민도 같은 대피선에 설 수 있었다."
        },
        {
          "when": {
            "flag": "alley_safe"
          },
          "text": "골목 주민들은 서로의 주소 대신 이름을 부르던 일을 기억한다. 새 마을에서는 우편 배달을 혼자 맡기지 않는다."
        }
      ],
      "question": "무엇을 가져오면 여러분에게 그곳은 여전히 같은 도시인가요?",
      "choices": []
    },
    "ending-common": {
      "id": "ending-common",
      "title": "빈칸이 남아 있는 계약",
      "chapter": 4,
      "location": "에필로그",
      "art": 3,
      "mood": "hope",
      "ending": true,
      "text": [
        "새 금고는 예전 것보다 작다. 모든 것을 빠르게 해 주지는 못한다. 응급 상황과 돌봄에 먼저 시간을 쓰자는 첫 제안 뒤에는 찬성, 거부, 다른 제안이 나란히 붙는다. 빈칸은 여전히 빈칸으로 남는다.",
        "윤은 정오에 종을 울리고 모라는 회의 기록을 공개한다. 서진의 이름만 새긴 기념판 대신, 원하면 지울 수도 있는 시민들의 서명판이 걸린다. 열세 분 뒤 사라질 뻔한 도시는 이제 시간을 아낄 때마다 누구의 시간인지 묻는다."
      ],
      "epilogues": [
        {
          "when": {
            "flag": "press_open"
          },
          "text": "벨의 인쇄소는 매달 금고의 사용 내역을 찍어 낸다. 누구나 읽을 수 있는 설명이 새 도시의 유지 비용이 된다."
        },
        {
          "when": {
            "flag": "maker_helped"
          },
          "text": "서진은 공동 금고의 첫 회의에 참석하지만 특별한 표를 받지 않는다. 그는 그 점이 가장 마음에 든다고 말한다."
        },
        {
          "when": {
            "flag": "debt_public"
          },
          "text": "이전 비용 분배의 책임도 지워지지 않는다. 새 계약은 과거의 빚을 자동으로 용서하는 서류가 아니다."
        }
      ],
      "question": "함께 결정한다는 것은 같은 대답을 하는 것과 어떻게 달랐나요?",
      "choices": []
    }
  },
  "deathEnding": {
    "title": "마지막 증인이 없는 정오",
    "text": [
      "더 이상 응답하는 동료가 없다. 반환 서랍을 열 손도, 빌린 순간의 값을 지불할 목소리도 남지 않는다. 시계탑은 이번 일행의 기록을 미완료로 표시한다.",
      "도시가 정오를 어떻게 맞았는지는 이번 일행의 기록에 없다. 다만 누군가 이의를 제기했고 다른 선택을 찾으려 했다는 흔적이, 지워지는 서류 끝에 남는다."
    ],
    "art": 2,
    "mood": "danger",
    "question": "모두가 같은 위험을 감수해야 했을까요, 한 사람은 다른 길을 지킬 수 있었을까요?"
  }
};
