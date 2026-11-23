// Original authored scenario for Chronicle Gate v17.
// Stable scene/choice IDs preserve old saves. Every risky action has four explicit outcomes.
const campaign = {
  "id": "glass-hotel",
  "title": "유리 호텔의 도난당한 새벽",
  "subtitle": "완벽한 파티는 끝나지 않는다. 직원의 근무도.",
  "genre": "시간 도둑 · 잠입 미스터리",
  "accent": "#a996dc",
  "description": "시간을 파는 호텔에서 새벽을 움직이는 원석이 사라졌다. 직원들은 퇴근할 수 없고 손님들은 멈춰 있다. 도둑을 찾는 일에서 출발해, 직원들에게서 빼앗은 시간을 어떻게 돌려줄지 결정한다.",
  "estimatedMinutes": "35–60",
  "contentNotes": [
    "노동 착취",
    "감금",
    "시간 정지"
  ],
  "objective": "새벽을 숨긴 사람을 찾아 호텔의 시간을 누구에게 돌려줄지 결정한다.",
  "art": "glass-hotel",
  "pressureLabel": "호텔 보안 경계",
  "pressureMax": 8,
  "start": "entrance",
  "roles": [
    {
      "title": "허위 초대장",
      "secret": "당신의 초대장은 위조다. 유명한 도둑을 잡으려는 의뢰였지만 의뢰인은 도둑이 훔칠 물건의 이름을 끝내 말하지 않았다.",
      "goal": "초대장을 들킨 뒤에도 원하는 정보를 얻을 방법을 마련한다.",
      "reveal": "저는 정식 손님이 아니에요. 누군가 새벽을 훔칠 거라고만 들었어요.",
      "epilogues": [
        {
          "when": {
            "flag": "cover"
          },
          "text": "위조 초대장의 주인은 마지막에 가짜 이름을 지운다. 문을 여는 데 썼던 신분보다 실제로 무엇을 했는지로 기억되기로 한다."
        },
        {
          "when": {
            "notFlag": "cover"
          },
          "text": "허위 초대장의 주인은 손님용 문 밖에서 직원들의 사정을 보았다. 어떤 신분으로 들어왔는지보다 그 안에서 무엇을 확인했는지가 이번 사건의 진짜 기록이 된다."
        }
      ],
      "deadEpilogue": "위조 초대장에는 실제로 들어와 사건에 손을 댄 사람의 이름이 남는다. 거짓 신분과 달리 이 사람이 치른 대가까지 지워지지는 않는다."
    },
    {
      "title": "멈춘 기념일",
      "secret": "당신은 예전에 이 호텔에서 가장 행복했던 한 시간을 보관하는 상품을 샀다. 그 대가가 다른 사람의 시간이라는 말은 없었다.",
      "goal": "보관해 둔 추억을 버릴 수 있는지 스스로 결정한다.",
      "reveal": "제 행복했던 한 시간도 이 호텔에 있어요. 누가 대신 비용을 냈는지는 몰랐어요.",
      "epilogues": [
        {
          "when": {
            "flag": "return_plan"
          },
          "text": "행복했던 시간을 샀던 손님은 상품의 원래 주인을 확인한다. 좋은 추억을 사랑하는 일과 남의 시간을 값을 매겨 가져오는 일을 구분하게 됐다."
        },
        {
          "when": {
            "notFlag": "return_plan"
          },
          "text": "보관된 행복의 구매자는 계약서에 없던 비용을 직접 보았다. 다음에는 누구의 시간이 들어가는지 먼저 묻기로 한다."
        }
      ],
      "deadEpilogue": "완벽한 순간을 샀던 손님의 빈 모래시계가 남는다. 좋은 기억을 누구의 시간으로 만들었는지 묻는 질문이 그 물건의 새로운 설명이 된다."
    },
    {
      "title": "퇴근을 기다리는 편지",
      "secret": "청소 직원 소라의 동생에게 편지를 전해 달라는 부탁을 받았다. 봉투에는 «이번에는 언니도 저녁밥에 와»라고 적혀 있다.",
      "goal": "소라에게 편지를 전하고 그녀가 원하는 퇴근을 확인한다.",
      "reveal": "소라 씨 동생의 편지가 있어요. 이번 저녁에는 꼭 같이 먹자고 했어요.",
      "epilogues": [
        {
          "when": {
            "flag": "sora_trust"
          },
          "text": "소라는 동생의 편지를 앞치마 대신 자기 주머니에 넣는다. 편지를 전달한 사람에게 퇴근 뒤 저녁 자리를 하나 더 준비하겠다고 말한다."
        },
        {
          "when": {
            "notFlag": "sora_trust"
          },
          "text": "편지를 가져온 사람은 소라의 연락처로 동생의 주소를 남긴다. 신뢰를 바로 얻지 못해도 돌아갈 집이 있다는 말은 전하고 싶었다."
        }
      ],
      "deadEpilogue": "편지를 가져온 사람의 몫을 기억하며 누군가 봉투를 안전하게 보관한다. 돌아갈 저녁을 다른 사람에게 전하려 했다는 뜻은 남는다."
    },
    {
      "title": "시계공의 조수",
      "secret": "호텔 시계 설계를 본 적이 있다. 저장된 시간을 돌려주는 장치에는 천창을 여는 수동 절차가 필요하지만, 그 페이지는 도면에서 찢겨 있었다.",
      "goal": "찢긴 절차를 찾아 시간을 특정 부자에게만 반환하지 않게 한다.",
      "reveal": "금고를 여는 것만으로는 시간이 돌아오지 않아요. 지붕의 천창도 함께 열어야 해요.",
      "epilogues": [
        {
          "when": {
            "flag": "return_plan"
          },
          "text": "시계공의 조수는 복원한 반환 절차를 여러 사본으로 남긴다. 중요한 한 페이지를 누군가 다시 찢어도 방법이 사라지지 않는다."
        },
        {
          "when": {
            "notFlag": "return_plan"
          },
          "text": "시계공의 조수는 이번에 끝내 완성하지 못한 회로를 적는다. 기술의 가능성과 실제 작동을 다르게 말해야 함을 배웠다."
        }
      ],
      "deadEpilogue": "시계공의 조수가 남긴 물음은 설계의 빈칸 옆에 적힌다. 아름답게 움직이는 장치가 누구의 시간을 쓰는지 다시 살펴야 한다."
    }
  ],
  "clues": {
    "invite": {
      "title": "연회 초대장의 작은 글씨",
      "text": "손님은 잊고 싶은 순간을 매각하고 붙잡고 싶은 순간을 구입한다. 구매 시간의 출처는 표기되지 않았다."
    },
    "dust": {
      "title": "멈추지 않는 청소 자국",
      "text": "비와 손님은 멈췄지만 직원과 청소 도구는 움직인다. 정지는 모든 사람에게 적용되지 않았다."
    },
    "ledger": {
      "title": "시간 급여 장부",
      "text": "직원들의 야간 초과 근무 시간이 금고에 저장되고 있었다. 직원에게 보관 동의나 지급 기록은 없다."
    },
    "receipt": {
      "title": "새벽 경매 영수증",
      "text": "경매품 «아침이 오기 직전»은 한 덩어리의 원석이다. 새벽을 훔치면 파티의 시간뿐 아니라 근무 종료도 멈춘다."
    },
    "badge": {
      "title": "청소 카트의 출입증",
      "text": "소라의 출입증에는 손님용 문이 아닌 세탁실과 천창 정비실 경로가 남아 있다."
    },
    "plans": {
      "title": "시간 반환 설계도",
      "text": "시간 금고를 연 뒤 천창의 반사판을 바깥으로 향하면, 저장된 시간을 원래 주인에게 나누어 돌려줄 수 있다."
    },
    "dawn": {
      "title": "새벽 원석의 균열",
      "text": "원석을 혼자 깨뜨리면 호텔 시간만 흐른다. 원래 주인의 시간은 흩어진다. 반환 장치를 쓰면 시간이 제 이름을 찾아간다."
    },
    "consent": {
      "title": "직원들의 반환 요청",
      "text": "직원들은 같은 시간을 다시 일하고 싶지 않다. 빼앗긴 시간을 받아 밖으로 나가는 데 동의했다."
    }
  },
  "flags": {
    "staff_trust": "직원들이 파티를 동료로 대한다",
    "cover": "연회 초대 신분을 유지했다",
    "security_cut": "보안 순찰을 다른 층으로 돌렸다",
    "sora_trust": "소라가 새벽 원석을 맡길 만큼 믿는다",
    "return_plan": "시간 반환 장치의 설계를 완성했다",
    "staff_consent": "직원들의 시간 반환 동의를 받았다",
    "owner_exposed": "호텔의 시간 장부를 손님들에게 공개했다",
    "window_ready": "천창 반사판을 바깥으로 맞췄다"
  },
  "nodes": {
    "entrance": {
      "id": "entrance",
      "title": "빗방울이 체크인한 밤",
      "chapter": 1,
      "location": "유리 호텔 정문",
      "art": 0,
      "mood": "mystery",
      "text": [
        "유리 호텔 앞의 비와 호텔 택시의 와이퍼가 허공에서 멈췄다. 로비의 손님들도 미동이 없는데, 직원들은 계속 움직인다. 회전문 안의 포터 민이 손바닥에 쓴 글씨를 보여 준다. «아직 투숙 계약에 서명하지 않았다면 들어오세요.» 당신들은 호텔의 정지 계약에 묶이기 전 도착한 방문자다.",
        "매니저 우가 오전 다섯 시 오십구 분에 멈춘 시계를 가리킨다. 이 호텔에서는 «새벽 원석»이 시계를 아침으로 넘긴다. 그 원석을 경매하던 중 누군가 가져갔고, 직원들의 근무 종료 시각도 오지 않게 됐다. 손님 명단으로 들어갈지, 민을 따라 직원 통로로 갈지 정해야 한다."
      ],
      "entities": [
        {
          "id": "manager",
          "label": "매니저 우",
          "kind": "person",
          "aliases": [
            "매니저",
            "우"
          ]
        },
        {
          "id": "porter",
          "label": "포터 민",
          "kind": "person",
          "aliases": [
            "포터",
            "민"
          ]
        },
        {
          "id": "reception",
          "label": "접객 카운터",
          "kind": "place",
          "aliases": [
            "카운터",
            "프런트"
          ]
        },
        {
          "id": "service",
          "label": "직원 통로",
          "kind": "place",
          "aliases": [
            "직원",
            "통로"
          ]
        }
      ],
      "choices": [
        {
          "id": "guest",
          "label": "정식 초대 손님인 척 접객 명단을 확인한다",
          "intent": "trick",
          "target": "manager",
          "stat": "heart",
          "dc": 11,
          "risk": "초대장 확인에 걸리면 직원 통로로 호송된다.",
          "outcomes": {
            "critical": {
              "text": "매니저의 초대 명단에서 일행을 찾고, 아직 서명하지 않은 계약은 맡아 두겠다고 말한다. 매니저는 신분을 의심하지 않을 뿐 아니라 보안 조회에도 협조하라는 메모를 준다. 그 서류를 들고 접객 카운터로 들어간다.",
              "next": "reception",
              "set": [
                "cover",
                "security_cut"
              ],
              "clues": [
                "invite"
              ]
            },
            "success": {
              "text": "매니저가 한쪽 장갑을 벗어 명단을 넘긴다. 손님 취급을 받는 동안은 호텔의 문 몇 개가 더 열린다.",
              "next": "reception",
              "set": [
                "cover"
              ]
            },
            "failure": {
              "text": "초대장 도장이 맞지 않는다. 포터가 신원 확인은 직원 통로에서 한다며, 경비원보다 먼저 당신들을 데려간다.",
              "next": "service",
              "pressure": 1
            },
            "fumble": {
              "text": "초대장을 확인하려던 매니저가 위조 도장을 발견해 로비 경보를 켠다. 일행은 손님 출입을 금지당한다. 포터 민은 계약에 묶이지 않은 조사자는 아직 필요하다며, 경비보다 먼저 직원 통로로 데려간다.",
              "next": "service",
              "pressure": 3,
              "unset": [
                "cover"
              ]
            }
          }
        },
        {
          "id": "staff-door",
          "label": "포터에게 조용히 직원 통로를 안내해 달라고 한다",
          "intent": "choose",
          "target": "porter",
          "automatic": true,
          "outcomes": {
            "success": {
              "text": "포터는 당신들이 움직이는 것을 보고 선택한 듯하다. “여긴 도와주는 손이면 누구든 환영이에요.”",
              "next": "service"
            }
          }
        }
      ],
      "dialogue": {
        "who": "매니저 우",
        "text": "도난 신고는 했습니다. 경찰차가 호텔 앞에서 멈춰 있는 게 문제지요."
      },
      "objective": "매니저를 통하거나 직원의 안내를 받아 호텔 안으로 들어간다.",
      "details": [
        {
          "id": "moving-dust",
          "label": "공중의 비와 바닥의 청소 자국을 비교한다",
          "text": "빗방울과 손님은 멈췄지만 직원의 걸음과 청소 자국은 새로 생긴다.",
          "clue": "dust"
        }
      ],
      "summary": "새벽 원석이 사라져 손님과 비가 멈췄고, 직원들만 계속 일하고 있다.",
      "stakes": "초대 신분이 들통나면 보안 경계가 올라가지만 직원 통로로 조사를 계속할 수 있다."
    },
    "reception": {
      "id": "reception",
      "title": "행복했던 시간의 가격표",
      "chapter": 1,
      "location": "대리석 접객 카운터",
      "art": 0,
      "mood": "calm",
      "text": [
        "객실 열쇠 대신 작은 모래시계들이 걸려 있다. 결혼식의 첫 춤, 합격 소식을 들은 순간, 아무에게도 들키지 않고 운 십 분. 호텔은 좋은 방보다 좋은 시간을 판다.",
        "접객 직원이 시간 상품 계약서와 경매 안내장을 펼쳐 놓는다. 손님이 내는 기억의 가격은 있지만 상품에 쓰인 시간의 원래 주인은 적혀 있지 않다. 마지막 경매가 열린 연회장과 도난 영상을 보관한 보안실 중 어느 곳을 먼저 볼지 고를 수 있다."
      ],
      "entities": [
        {
          "id": "contract",
          "label": "시간 상품 계약서",
          "kind": "object",
          "aliases": [
            "계약서",
            "초대장"
          ]
        },
        {
          "id": "ballroom",
          "label": "연회장",
          "kind": "place",
          "aliases": [
            "연회",
            "경매"
          ]
        },
        {
          "id": "security",
          "label": "보안실",
          "kind": "place",
          "aliases": [
            "보안",
            "감시"
          ]
        }
      ],
      "choices": [
        {
          "id": "to-auction",
          "label": "새벽을 마지막으로 봤다는 연회장에 들어간다",
          "intent": "choose",
          "target": "ballroom",
          "automatic": true,
          "outcomes": {
            "success": {
              "text": "멈춘 샴페인 기포들 사이로 직원 한 명이 천천히 접시를 치운다. 파티가 멈춰도 설거지는 남는다.",
              "next": "ballroom"
            }
          }
        },
        {
          "id": "record-request",
          "label": "매니저의 이름을 대고 보안 기록 열람을 요구한다",
          "intent": "talk",
          "target": "security",
          "stat": "heart",
          "dc": 12,
          "risk": "허가를 못 받으면 출입 시도가 경보에 남는다.",
          "outcomes": {
            "critical": {
              "text": "손님 보호에 필요한 조회 범위를 분명히 적어 요구하자 경비가 정식 열람 승인을 내준다. 순찰에도 허가된 조사라고 전달해 불필요한 경계가 줄었다. 일행은 보안실에서 원본 영상을 볼 수 있게 된다.",
              "next": "security",
              "set": [
                "security_cut",
                "cover"
              ],
              "pressure": -1
            },
            "success": {
              "text": "경비원이 조회 요청서에 도장을 찍는다. 당신들은 손님 보호 업무라는 명목으로 보안실에 들어간다.",
              "next": "security"
            },
            "failure": {
              "text": "경비원이 문을 닫으려다 정지한 손님의 옷자락에 걸린다. 그가 옷을 빼내는 동안 보안실 안의 직원이 문을 열어 준다.",
              "next": "security",
              "pressure": 2
            },
            "fumble": {
              "text": "요청서의 부서명을 잘못 말해 경비가 사칭이라고 판단한다. 손님 신분은 취소되고 보안 경계가 크게 오른다. 영상 담당 직원이 사실 확인은 필요하다며 감시를 받는 조건으로 보안실에 들인다.",
              "next": "security",
              "pressure": 3,
              "unset": [
                "cover"
              ]
            }
          }
        }
      ],
      "objective": "경매 영수증을 찾거나 도난 영상 열람을 요청한다.",
      "details": [
        {
          "id": "fine-print",
          "label": "초대장 계약서의 작은 글씨를 읽는다",
          "text": "손님이 파는 기억은 명시돼 있지만 손님이 사는 시간의 원래 주인은 적혀 있지 않다.",
          "clue": "invite"
        }
      ],
      "summary": "호텔은 손님에게 좋은 순간을 파는 상품을 운영한다.",
      "stakes": "허가 없이 보안 기록을 찾으면 일행도 도난 사건의 수사 대상이 된다."
    },
    "service": {
      "id": "service",
      "title": "퇴근 버튼이 없는 복도",
      "chapter": 1,
      "location": "직원 통로",
      "art": 0,
      "mood": "mystery",
      "text": [
        "직원 통로의 시계는 다른 시각을 가리킨다. 자정, 새벽 두 시, 어제 오후. 종업원들은 제 근무가 얼마나 길어졌는지 서로 비교해도 답을 얻지 못한다.",
        "포터 민은 출퇴근기에 카드를 찍어 보인다. 화면은 웃는 얼굴과 함께 «고객의 완벽한 순간을 위해 조금만 더»라고 답한다. 청소 직원 소라의 카드는 몇 시간 전 이 복도를 지나갔다."
      ],
      "entities": [
        {
          "id": "porter",
          "label": "포터 민",
          "kind": "person",
          "aliases": [
            "포터",
            "민"
          ]
        },
        {
          "id": "clock",
          "label": "출퇴근기",
          "kind": "object",
          "aliases": [
            "기계",
            "출퇴근",
            "카드"
          ]
        },
        {
          "id": "laundry",
          "label": "세탁실",
          "kind": "place",
          "aliases": [
            "세탁실"
          ]
        },
        {
          "id": "security",
          "label": "보안실",
          "kind": "place",
          "aliases": [
            "보안실"
          ]
        }
      ],
      "choices": [
        {
          "id": "timecard",
          "label": "출퇴근기에서 실제 근무 시간을 찾아낸다",
          "intent": "investigate",
          "target": "clock",
          "stat": "wit",
          "dc": 11,
          "risk": "열람 기록이 보안실에 남아 경계가 높아진다.",
          "outcomes": {
            "critical": {
              "text": "입금 시각과 직원 출입 내역을 함께 대조해, 야근이 시간 금고로 넘어가는 과정을 출력한다. 민은 믿을 사람을 찾았다며 직원 통로 번호도 적어 준다. 소라가 남긴 물건을 확인하려고 세탁실로 함께 간다.",
              "next": "laundry",
              "clues": [
                "ledger",
                "badge"
              ],
              "set": [
                "staff_trust"
              ],
              "gainItems": [
                "staff-code"
              ]
            },
            "success": {
              "text": "화면 뒤 숨겨진 항목에서 직원의 시간이 금고에 입금되는 것을 확인한다. 마지막 입금자는 소라다.",
              "next": "laundry",
              "clues": [
                "ledger"
              ],
              "set": [
                "staff_trust"
              ]
            },
            "failure": {
              "text": "출퇴근기가 잠긴다. 민이 “잠겼으면 해제 기록은 보안실에 남겠죠”라고 말하며 옆문을 연다.",
              "next": "security",
              "pressure": 1
            },
            "fumble": {
              "text": "관리자 항목을 잘못 건드리자 출퇴근기가 잠기고 직원들의 경고 호출기가 동시에 울린다. 민은 일행을 보호하되 더는 기계를 만지지 말아 달라고 한다. 잠금 해제 기록이 남을 보안실로 가 조사를 이어간다.",
              "next": "security",
              "pressure": 3,
              "unset": [
                "staff_trust"
              ]
            }
          }
        },
        {
          "id": "help-porter",
          "label": "포터의 수건 카트를 함께 밀며 세탁실로 간다",
          "intent": "choose",
          "target": "porter",
          "automatic": true,
          "outcomes": {
            "success": {
              "text": "포터의 수건 카트를 함께 밀어 세탁실로 간다. 직원들이 당신들에게 길을 열어 준다.",
              "next": "laundry",
              "set": [
                "staff_trust"
              ]
            }
          }
        }
      ],
      "objective": "출퇴근 기록을 확인하거나 포터와 세탁실로 간다.",
      "details": [
        {
          "id": "read-times",
          "label": "출퇴근기 상세 내역을 살핀다",
          "text": "초과 근무 시간이 급여가 아니라 시간 금고로 이체된다. 직원 동의와 반환 기록은 없다.",
          "clue": "ledger"
        }
      ],
      "summary": "직원들의 초과 근무 시간이 다른 곳으로 이체되고 있다.",
      "stakes": "기록 조회가 들키면 보안이 움직이지만 안전한 직원 통로는 남는다."
    },
    "ballroom": {
      "id": "ballroom",
      "title": "경매사가 끝내 내리지 못한 망치",
      "chapter": 2,
      "location": "멈춘 연회장",
      "art": 1,
      "mood": "mystery",
      "text": [
        "연회장에는 멈춘 샴페인과 손님들 사이로 빈 유리 함이 놓여 있다. 새벽 원석을 보관하던 함이다. 안내판에는 점검 담당자 «청소 직원 소라»의 이름과 사진이 붙어 있고, 함 안쪽에는 청소 장갑 자국이 남아 있다.",
        "피아니스트 리는 직원 계약이라 정지되지 않았다. 그는 원석을 가져간 사람이 사진 속 소라였다고 확인한다. “급여 기록을 찾는다고 하더군요. 금고 기록실은 저 악보 보관문 뒤입니다.” 리에게 사연을 듣거나, 빈 함의 거래 기록을 더 확인할 수 있다."
      ],
      "entities": [
        {
          "id": "pianist",
          "label": "피아니스트 리",
          "kind": "person",
          "aliases": [
            "피아니스트",
            "리"
          ]
        },
        {
          "id": "case",
          "label": "빈 경매 유리 함",
          "kind": "object",
          "aliases": [
            "유리 함",
            "함",
            "경매품"
          ]
        },
        {
          "id": "receipt",
          "label": "낙찰 영수증",
          "kind": "object",
          "aliases": [
            "영수증",
            "낙찰"
          ]
        }
      ],
      "choices": [
        {
          "id": "pianist-story",
          "label": "피아니스트에게 소라가 남긴 말을 묻는다",
          "intent": "talk",
          "target": "pianist",
          "stat": "heart",
          "dc": 11,
          "risk": "그가 목소리를 높이면 경비가 연회장으로 온다.",
          "outcomes": {
            "critical": {
              "text": "리에게 연주를 멈춰도 괜찮다고 말하고 기다리자 그는 소라의 말과 거래 번호를 차근차근 적어 준다. 다른 직원들도 자기 시간을 돌려받겠다는 서명에 동참한다. 서명과 영수증을 들고 악보 문 뒤의 기록실로 간다.",
              "next": "archive",
              "clues": [
                "receipt",
                "consent"
              ],
              "set": [
                "staff_trust",
                "staff_consent"
              ]
            },
            "success": {
              "text": "그는 소라가 “내일이 있어야 퇴근하는 줄 알았어요”라고 했다고 전한다. 새벽을 훔친 일이 오히려 근무를 멈추지 못하게 했다.",
              "next": "archive",
              "clues": [
                "receipt"
              ],
              "set": [
                "staff_trust"
              ]
            },
            "failure": {
              "text": "질문을 받은 그는 울분을 터뜨린다. 경비가 다가오자 그는 당신들을 악보 보관문 안쪽 기록실로 밀어 넣는다.",
              "next": "archive",
              "pressure": 1
            },
            "fumble": {
              "text": "질문이 추궁처럼 들려 리가 건반을 세게 내리친다. 경비는 소라의 공범을 찾았다며 일행을 지목한다. 리는 벌어진 일을 후회하고 기록실 문을 열어 피신시키지만, 호텔 전체에 추적 경보가 퍼진다.",
              "next": "archive",
              "pressure": 3,
              "unset": [
                "cover"
              ]
            }
          }
        },
        {
          "id": "champagne-trick",
          "label": "공중의 샴페인으로 경비의 시야를 가리고 함을 조사한다",
          "intent": "trick",
          "target": "case",
          "stat": "agility",
          "dc": 12,
          "risk": "멈춘 유리잔이 깨지면 실패 시 생명 1, 대실패 시 생명 2를 잃고 경보가 울린다.",
          "outcomes": {
            "critical": {
              "text": "공중의 샴페인에 조명을 반사시켜 빈 함 대신 반대편을 보게 만든다. 함 아래서 낙찰 영수증과 직원 통로의 관리 번호를 찾았다. 경비가 다른 층으로 간 사이 번호를 메모하고 기록실로 들어간다.",
              "next": "archive",
              "clues": [
                "receipt",
                "badge"
              ],
              "set": [
                "security_cut"
              ],
              "gainItems": [
                "staff-code"
              ]
            },
            "success": {
              "text": "잔을 한 뼘 옮기자 멈춘 샴페인이 빛을 꺾어 경비의 시야를 가린다. 함 아래에서 시간 금고 기록실 열쇠가 나온다.",
              "next": "archive",
              "clues": [
                "receipt"
              ],
              "set": [
                "security_cut"
              ]
            },
            "failure": {
              "text": "샴페인을 옮기다 멈춘 유리잔이 깨져 팔을 벤다. 경보가 울리자 피아니스트가 기록실 문을 열어 당신들을 피신시킨다.",
              "next": "archive",
              "pressure": 2,
              "harm": 1
            },
            "fumble": {
              "text": "잔을 돌리자 멈췄던 유리들이 한꺼번에 깨져 당신을 덮친다. 생명 2를 잃고 경보가 연회장 전체에 울린다. 리가 일행을 악보 보관문 뒤로 끌어들이며, 서류는 안전한 기록실에서 다시 찾으라고 한다.",
              "next": "archive",
              "harm": 2,
              "pressure": 3
            }
          }
        }
      ],
      "objective": "피아니스트에게 당시 상황을 묻거나 함의 거래 기록을 조사한다.",
      "details": [
        {
          "id": "auction-receipt",
          "label": "낙찰 영수증을 확인한다",
          "text": "경매품은 «아침이 오기 직전» 원석. 원석이 빠지면 파티뿐 아니라 호텔의 근무 종료 시각도 오지 않는다.",
          "clue": "receipt"
        }
      ],
      "summary": "새벽 원석을 팔던 경매 함이 비어 있고 청소 직원 소라가 목격됐다.",
      "stakes": "멈춘 유리잔을 움직이면 깨질 수 있다. 조사 소란은 경비를 부른다."
    },
    "security": {
      "id": "security",
      "title": "범인은 청소 카트를 밀었다",
      "chapter": 2,
      "location": "보안실",
      "art": 1,
      "mood": "tension",
      "text": [
        "보안 화면에는 소라가 유리 함을 여는 장면이 찍혀 있다. 잠금장치는 뜯기지 않았다. 청소용 마스터키가 손님용 최고 보안 등급보다 높은 권한을 갖고 있었던 것이다.",
        "영상에서 경비원은 소라를 체포하는 대신 자신의 출입카드를 건넨다. 화면의 이동 기록에는 세탁실과 시간 금고 기록실, 지붕 서비스 계단이 차례로 표시된다. 영상에 나온 야간 경비원이 지금 옆에 서서 당신들의 질문을 기다린다."
      ],
      "entities": [
        {
          "id": "monitor",
          "label": "보안 화면",
          "kind": "object",
          "aliases": [
            "화면",
            "모니터",
            "영상"
          ]
        },
        {
          "id": "guard",
          "label": "야간 경비원",
          "kind": "person",
          "aliases": [
            "경비",
            "경비원"
          ]
        },
        {
          "id": "patrol",
          "label": "순찰 배정판",
          "kind": "object",
          "aliases": [
            "순찰",
            "배정판"
          ]
        }
      ],
      "choices": [
        {
          "id": "guard-truth",
          "label": "경비에게 왜 소라를 보내 줬는지 직접 묻는다",
          "intent": "talk",
          "target": "guard",
          "stat": "heart",
          "dc": 12,
          "risk": "불신을 사면 경비가 공식 수사를 요청한다.",
          "outcomes": {
            "critical": {
              "text": "경비의 근무 내역을 먼저 들어 주자 그는 소라만이 아니라 여러 직원이 같은 피해를 봤다고 말한다. 직원 대표의 반환 요청서와 출입번호를 건네며 동료들도 더는 막지 않겠다고 약속한다. 그 자료를 확인하려고 기록실로 간다.",
              "next": "archive",
              "clues": [
                "badge",
                "consent"
              ],
              "set": [
                "staff_trust",
                "staff_consent",
                "security_cut"
              ],
              "gainItems": [
                "staff-code"
              ]
            },
            "success": {
              "text": "경비는 카드의 누적 근무 시간을 보여 준다. “체포하면 저도 영원히 여기 있어야 하잖아요.” 그는 금고 기록실 위치를 알려 준다.",
              "next": "archive",
              "clues": [
                "badge"
              ],
              "set": [
                "staff_trust"
              ],
              "gainItems": [
                "staff-code"
              ]
            },
            "failure": {
              "text": "경비가 경보 버튼을 누른다. 그러나 울리는 경보를 보며 자기 카드도 빼 버린다. 기록실 문이 안전 해제된다.",
              "next": "archive",
              "pressure": 2
            },
            "fumble": {
              "text": "경비를 공범이라고 몰아붙이자 그가 소유주에게 일행의 인상착의를 전한다. 보안 경계가 크게 오른다. 그래도 자기 시간을 빼앗긴 사실은 부인하지 못해, 감시를 받으며 장부를 확인하라며 기록실 문을 연다.",
              "next": "archive",
              "pressure": 3,
              "unset": [
                "staff_trust"
              ]
            }
          }
        },
        {
          "id": "reroute",
          "label": "순찰을 빈 연회장으로 보내고 출입 기록을 복사한다",
          "intent": "use",
          "target": "patrol",
          "stat": "wit",
          "dc": 12,
          "risk": "잘못 입력하면 당신들의 위치가 기록실에 표시된다.",
          "outcomes": {
            "critical": {
              "text": "실제 점검 일정에 맞춰 순찰을 다른 층으로 보낸다. 거짓 경보가 아니라 정식 업무라 추적도 없다. 기록실과 천창의 출입번호를 복사하고 직원 통로로 이동하며 보안 경계까지 낮춘다.",
              "next": "archive",
              "clues": [
                "badge"
              ],
              "set": [
                "security_cut"
              ],
              "gainItems": [
                "staff-code"
              ],
              "pressure": -1
            },
            "success": {
              "text": "경비의 호출기가 연회장 점검을 알린다. 당신들은 천창 정비실 경로와 기록실 열람 코드를 복사한다.",
              "next": "archive",
              "clues": [
                "badge"
              ],
              "set": [
                "security_cut"
              ],
              "gainItems": [
                "staff-code"
              ]
            },
            "failure": {
              "text": "배정판이 당신들을 허위 청소 인력으로 등록한다. 예상 밖의 업무 알림을 따라 기록실 열쇠가 지급된다.",
              "next": "archive",
              "pressure": 1
            },
            "fumble": {
              "text": "일행을 숨길 항목 대신 긴급 수색 항목을 등록한다. 모든 경비 호출기에 지금 위치가 전송되고 순찰 우회도 취소된다. 영상 담당 직원이 대피 절차로 기록실 문을 열어 주어 가까스로 이동한다.",
              "next": "archive",
              "pressure": 3,
              "unset": [
                "security_cut"
              ]
            }
          }
        }
      ],
      "objective": "경비의 이유를 듣거나 소라의 출입 기록을 복사한다.",
      "details": [
        {
          "id": "badge-log",
          "label": "소라의 출입증 이동 기록을 읽는다",
          "text": "소라가 쓴 직원 출입번호와 통과한 문이 화면에 남아 있다. 세탁실·기록실·천창 정비실의 공용 번호를 메모한다.",
          "clue": "badge",
          "gainItems": [
            "staff-code"
          ]
        }
      ],
      "summary": "영상에는 소라가 새벽 원석을 가져가고 경비가 길을 열어 주는 모습이 있다.",
      "stakes": "경비를 적으로 돌리면 출입 기록은 얻어도 이후의 보안 경계가 높아진다."
    },
    "laundry": {
      "id": "laundry",
      "title": "젖은 수건에 남은 해",
      "chapter": 2,
      "location": "호텔 세탁실",
      "art": 1,
      "mood": "calm",
      "text": [
        "세탁 담당 조가 움직이는 세탁기들을 멈추고 당신들에게 의자를 내준다. 소라의 카트에는 빛이 남은 수건과 예비 출입번호 메모가 놓여 있다. 조는 소라가 새벽 원석을 여기에 감싸서 옮겼다고 말한다.",
        "“아침을 자기 손에 쥐면 퇴근할 수 있을 줄 알았대요.” 조가 소라의 오해를 설명한다. 원석은 개인의 시간이 아니라 호텔 전체의 아침을 여는 열쇠였다. 소라는 실수를 알게 된 뒤, 직원들의 시간을 돌려줄 방법을 찾으러 금고 기록실로 갔다. 카트에 남은 도면은 아직 한 조각뿐이다."
      ],
      "entities": [
        {
          "id": "washer",
          "label": "세탁 담당 조",
          "kind": "person",
          "aliases": [
            "세탁 담당",
            "조",
            "직원"
          ]
        },
        {
          "id": "cart",
          "label": "소라의 청소 카트",
          "kind": "object",
          "aliases": [
            "카트",
            "청소"
          ]
        },
        {
          "id": "towel",
          "label": "빛이 남은 수건",
          "kind": "object",
          "aliases": [
            "수건"
          ]
        }
      ],
      "choices": [
        {
          "id": "listen-staff",
          "label": "직원에게 필요한 것이 무엇인지 끝까지 듣는다",
          "intent": "talk",
          "target": "washer",
          "stat": "heart",
          "dc": 10,
          "risk": "도움 대신 추궁으로 들리면 직원들이 보안을 부른다.",
          "outcomes": {
            "critical": {
              "text": "직원들이 되찾고 싶은 시간이 무엇인지 한 명씩 묻고 요청서에 적는다. 조는 대표 서명과 출입번호를 주고, 거울 회랑에 쓸 빛 수건도 챙겨 준다. 협조를 얻은 일행은 서명을 대조하러 기록실로 간다.",
              "next": "archive",
              "set": [
                "staff_trust",
                "staff_consent"
              ],
              "clues": [
                "consent",
                "badge"
              ],
              "gainItems": [
                "staff-code",
                "light-towel"
              ]
            },
            "success": {
              "text": "직원들은 누가 범인인지보다 내일 집에 갈 수 있는지 묻는다. 당신들은 시간을 돌려받겠다는 서명을 모아 기록실로 간다.",
              "next": "archive",
              "set": [
                "staff_trust",
                "staff_consent"
              ],
              "clues": [
                "consent",
                "badge"
              ],
              "gainItems": [
                "staff-code"
              ]
            },
            "failure": {
              "text": "직원들은 입을 닫는다. 조가 당신들을 내보내며 “장부부터 보고 다시 판단하세요”라고 기록실 열쇠를 쥐여 준다.",
              "next": "archive",
              "clues": [
                "badge"
              ],
              "pressure": 1,
              "gainItems": [
                "staff-code"
              ]
            },
            "fumble": {
              "text": "직원들의 말을 끊으며 소라의 잘못부터 따지자 조가 조사 협조를 거둔다. 소란을 들은 보안원이 다가온다. 조는 자신의 피해까지 감추고 싶지는 않다며 출입번호만 주고, 장부는 직접 읽으라며 기록실로 내보낸다.",
              "next": "archive",
              "clues": [
                "badge"
              ],
              "gainItems": [
                "staff-code"
              ],
              "pressure": 3,
              "unset": [
                "staff_trust"
              ]
            }
          }
        },
        {
          "id": "light-trace",
          "label": "수건에 남은 아침빛을 따라 카트의 비밀칸을 찾는다",
          "intent": "investigate",
          "target": "cart",
          "stat": "wit",
          "dc": 11,
          "risk": "카트 경보가 울리면 소라가 누군가 쫓아온다는 것을 알게 된다.",
          "outcomes": {
            "critical": {
              "text": "수건의 빛을 카트 밑에서 비추자 도면 조각 옆에 접힌 뒷장까지 드러난다. 반환 순서와 천창 방향을 모두 맞췄다. 출입번호와 완성한 도면, 빛 수건을 챙겨 기록실의 장부와 대조하러 간다.",
              "next": "archive",
              "set": [
                "return_plan"
              ],
              "clues": [
                "badge",
                "plans"
              ],
              "gainItems": [
                "staff-code",
                "return-blueprint",
                "light-towel"
              ]
            },
            "success": {
              "text": "손잡이 아래에서 도면 조각과 소라의 메모를 찾는다. 금고 쪽 설명만 있고 천창 방향은 빠져 있다. 남은 장을 찾아야 하므로 출입번호를 챙겨 기록실로 간다.",
              "next": "archive",
              "clues": [
                "badge"
              ],
              "gainItems": [
                "staff-code"
              ]
            },
            "failure": {
              "text": "카트 틈에 남은 빛의 흔적이 희미해져 도면 조각을 찾지 못한다. 수건 자체에 남은 새벽빛이 사라진 것은 아니다. 그래도 카트 바닥의 반출증에 기록실 위치가 적혀 있어, 일행은 그곳의 원본을 찾으러 간다.",
              "next": "archive",
              "pressure": 1
            },
            "fumble": {
              "text": "카트의 잠금칸을 잘못 당겨 도난 경보가 울리고 도면 조각이 세탁수에 젖는다. 손에 들어온 부분만으로는 반환 순서를 알 수 없다. 반출증에 기록실 위치가 남아 있어 그곳의 원본을 찾으러 간다.",
              "next": "archive",
              "pressure": 3
            }
          }
        }
      ],
      "objective": "직원들의 요구와 소라가 향한 기록실의 위치를 확인한다.",
      "details": [
        {
          "id": "cart-badge",
          "label": "카트에 걸린 예비 출입번호를 메모한다",
          "text": "출입증에는 세탁실, 기록실, 천창 정비실이 표시돼 있다.",
          "clue": "badge",
          "gainItems": [
            "staff-code"
          ]
        },
        {
          "id": "borrow-light-towel",
          "label": "조에게 새벽빛이 남은 수건을 빌린다",
          "text": "조가 카트의 수건을 내준다. “이 빛이면 지붕 아래 기억 거울을 잠깐 지울 수 있어요. 펼치고 나면 빛은 한 번에 빠집니다.”",
          "gainItems": [
            "light-towel"
          ]
        }
      ],
      "summary": "소라는 새벽을 가져가면 퇴근할 줄 알았지만 오히려 아침이 오지 않게 됐다.",
      "stakes": "카트의 보안 장치를 잘못 열면 도둑을 추적하는 경보가 울린다."
    },
    "archive": {
      "id": "archive",
      "title": "누군가의 한 시간은 누구의 것인가",
      "chapter": 2,
      "location": "시간 금고 기록실",
      "art": 1,
      "mood": "mystery",
      "text": [
        "기록실 서랍에는 직원들의 이름표와 시간 입출금 장부가 있다. 손님이 산 행복한 한 시간 옆에, 직원에게서 가져간 야간 근무 열 시간이 비용으로 적혀 있다. 직원이 맡긴 적도 없고 돌려받은 적도 없는 시간이다.",
        "책상 위에는 금고와 천창을 잇는 반환 도면이 찢긴 채 놓여 있다. 원석을 제자리에 두면 아침만 다시 온다. 직원들의 시간을 각각 돌려주려면 잠금축 순서와 반사판 방향까지 알아야 한다. 도면을 맞추거나, 옆 작업실의 설계자 해린에게 물을 수 있다. 장부 사본은 어느 쪽으로 가든 챙긴다."
      ],
      "entities": [
        {
          "id": "ledger",
          "label": "시간 급여 장부",
          "kind": "object",
          "aliases": [
            "장부",
            "급여",
            "시간"
          ]
        },
        {
          "id": "plans",
          "label": "찢긴 반환 설계도",
          "kind": "object",
          "aliases": [
            "설계도",
            "도면"
          ]
        },
        {
          "id": "workshop",
          "label": "시계공 작업실",
          "kind": "place",
          "aliases": [
            "작업실",
            "시계공"
          ]
        },
        {
          "id": "stair",
          "label": "서비스 계단",
          "kind": "place",
          "aliases": [
            "계단",
            "천창"
          ]
        }
      ],
      "choices": [
        {
          "id": "rebuild-plan",
          "label": "도면을 맞춰 반환 장치의 작동 순서를 복원한다",
          "intent": "investigate",
          "target": "plans",
          "stat": "wit",
          "dc": 12,
          "risk": "복원에 시간이 걸리면 호텔 경비가 계단을 통제한다.",
          "outcomes": {
            "critical": {
              "text": "찢긴 선을 장부의 이름표 번호와 대조하자 금고와 천창을 잇는 정확한 순서가 복원된다. 도면 여백의 직원 통로 번호도 읽어냈다. 두 메모를 챙기고 추적 순찰을 피해 지붕 서비스 계단으로 간다.",
              "next": "stair",
              "set": [
                "return_plan",
                "security_cut"
              ],
              "clues": [
                "plans",
                "ledger",
                "badge"
              ],
              "gainItems": [
                "return-blueprint",
                "staff-code"
              ],
              "pressure": -1
            },
            "success": {
              "text": "금고를 먼저 열고 천창 반사판을 돌리면 시간은 원래 주인을 찾아간다. 당신들은 도면을 챙겨 서비스 계단으로 간다.",
              "next": "stair",
              "set": [
                "return_plan"
              ],
              "clues": [
                "plans",
                "ledger"
              ],
              "gainItems": [
                "return-blueprint"
              ]
            },
            "failure": {
              "text": "찢긴 전선 표기를 해독하지 못한다. 원래 설계자를 찾아야 한다. 작업실에서 시계 태엽 소리가 들린다.",
              "next": "workshop",
              "clues": [
                "ledger"
              ],
              "pressure": 1
            },
            "fumble": {
              "text": "금고 쪽 도면과 천창 쪽 도면을 반대로 이어 붙여 잘못된 경고 회로가 작동한다. 원본을 다시 확인하지 않고 실행할 수는 없다. 장부 사본을 지키고, 경비가 오는 동안 원설계자 해린의 작업실로 찾아간다.",
              "next": "workshop",
              "clues": [
                "ledger"
              ],
              "pressure": 3
            }
          }
        },
        {
          "id": "confront-maker",
          "label": "장부를 들고 시계공에게 빠진 절차를 묻는다",
          "intent": "choose",
          "target": "workshop",
          "automatic": true,
          "outcomes": {
            "success": {
              "text": "당신들은 장부의 직원 이름을 그대로 펼쳐 둔다. 추상적인 기술 문제가 아니라 누구의 시간인지부터 질문할 생각이다.",
              "next": "workshop",
              "clues": [
                "ledger"
              ]
            }
          }
        }
      ],
      "objective": "찢긴 반환 도면을 완성하거나 설계자에게 빠진 절차를 묻는다.",
      "details": [
        {
          "id": "payment-ledger",
          "label": "직원별 시간 입출금 장부를 읽는다",
          "text": "시간은 직원 몰래 금고로 입금됐고, 나간 기록은 손님 상품에 쓰인 것뿐이다.",
          "clue": "ledger"
        }
      ],
      "callbacks": [
        {
          "when": {
            "flag": "staff_consent"
          },
          "text": "직원들이 서명한 이름들이 장부의 원소유자 목록과 일치한다. 반환 대상을 추측할 필요가 없어졌다."
        }
      ],
      "resurrection": {
        "label": "동료의 마지막 건강한 시간을 되돌린다",
        "text": "이 호텔에서 멎은 생명은 금고의 마지막 순간에 잠시 저장된다. 살아 있는 동료가 자기 몫의 시간을 담보로 내면 그 순간을 다시 잇는 판정을 할 수 있다. 운명 1개와 보안 경계 2를 지불한다.",
        "sparkCost": 1,
        "pressureCost": 2,
        "dc": 12
      },
      "summary": "호텔의 좋은 순간들은 직원에게서 빼앗은 시간으로 만들어졌다.",
      "stakes": "도면을 완성하지 못하면 호텔 시계만 다시 돌릴 수 있고, 각자의 시간은 정확히 반환하지 못한다."
    },
    "workshop": {
      "id": "workshop",
      "title": "시계공은 이미 알고 있었다",
      "chapter": 3,
      "location": "지붕 아래 시계공 작업실",
      "art": 2,
      "mood": "tension",
      "text": [
        "시계공 해린은 움직이는 유일한 작은 시계에 밥 먹을 시간을 맞추고 있다. 당신들이 장부를 놓자 변명부터 하지 않는다. “반환 장치가 잘 안 되는 게 아닙니다. 아주 잘 돼서 뺐죠.”",
        "해린은 반환 장치가 작동하지 않아서 뺀 것이 아니라, 호텔이 직원들의 시간을 계속 쓰려고 뺐다고 인정한다. 소라는 원석을 들고 이미 지붕 계단으로 올라갔다. 작업대에는 원본 도면과 작은 시험 장치, 반사판을 조절하는 공구가 남아 있다."
      ],
      "entities": [
        {
          "id": "maker",
          "label": "시계공 해린",
          "kind": "person",
          "aliases": [
            "시계공",
            "해린"
          ]
        },
        {
          "id": "mirror-key",
          "label": "반사판 조정키",
          "kind": "object",
          "aliases": [
            "키",
            "조정키"
          ]
        },
        {
          "id": "blueprint",
          "label": "원본 설계도",
          "kind": "object",
          "aliases": [
            "원본",
            "설계도"
          ]
        }
      ],
      "choices": [
        {
          "id": "accountability",
          "label": "해린이 직접 반환 장치를 완성하도록 설득한다",
          "intent": "talk",
          "target": "maker",
          "stat": "heart",
          "dc": 12,
          "risk": "설득이 실패하면 해린이 호텔 소유주에게 구조를 요청한다.",
          "outcomes": {
            "critical": {
              "text": "직원 이름이 적힌 장부를 보며 자신의 설계에 무엇이 빠졌는지 설명해 달라고 한다. 해린은 책임자란에 서명한 완성 도면과 공개 해설을 내놓는다. 보안에도 작업을 방해하지 말라고 알린 뒤 일행을 지붕 계단으로 보낸다.",
              "next": "stair",
              "set": [
                "return_plan",
                "owner_exposed",
                "security_cut"
              ],
              "clues": [
                "plans"
              ],
              "gainItems": [
                "return-blueprint"
              ],
              "pressure": -1
            },
            "success": {
              "text": "해린은 자기 이름을 설계도에 다시 적는다. 이번에는 책임자 칸이다. 조정키를 챙겨 천창 계단으로 향한다.",
              "next": "stair",
              "set": [
                "return_plan"
              ],
              "clues": [
                "plans"
              ],
              "gainItems": [
                "return-blueprint"
              ]
            },
            "failure": {
              "text": "해린은 소유주를 부른다. 그러나 당신들이 가져온 장부를 다시 보고 원본 도면을 문틈으로 밀어 준다.",
              "next": "stair",
              "set": [
                "return_plan"
              ],
              "clues": [
                "plans"
              ],
              "pressure": 2,
              "gainItems": [
                "return-blueprint"
              ]
            },
            "fumble": {
              "text": "해린이 압박을 견디지 못해 소유주에게 긴급 호출을 보낸다. 보안이 몰려오자 그는 원본은 지키겠다고 문을 닫는다. 다만 문틈으로 검증한 도면 사본을 밀어 주며, 더 늦기 전에 소라가 있는 계단으로 가라고 한다.",
              "next": "stair",
              "set": [
                "return_plan"
              ],
              "clues": [
                "plans"
              ],
              "gainItems": [
                "return-blueprint"
              ],
              "pressure": 3,
              "unset": [
                "security_cut"
              ]
            }
          }
        },
        {
          "id": "borrow-key",
          "label": "해린의 조정키로 작업대 장치를 직접 시험한다",
          "intent": "use",
          "target": "mirror-key",
          "stat": "wit",
          "dc": 13,
          "risk": "실패하면 시간 역류로 생명 2, 대실패하면 생명 3을 잃는다. 실험에 쓰는 회로가 당신의 몸과 연결된다.",
          "outcomes": {
            "critical": {
              "text": "해린에게 조정 공구를 빌려 이름표가 붙은 시험용 십 분만 되돌린다. 회로가 맞자 작업자의 지친 숨이 고르게 돌아오고 당신도 생명 1을 회복한다. 검증한 도면을 챙겨 원석이 있는 서비스 계단으로 간다.",
              "next": "stair",
              "set": [
                "return_plan"
              ],
              "clues": [
                "plans"
              ],
              "gainItems": [
                "return-blueprint"
              ],
              "heal": 1
            },
            "success": {
              "text": "작은 병에 담긴 십 분이 작업자 이름표로 되돌아간다. 반환 절차는 확인됐다. 조정키를 들고 계단으로 간다.",
              "next": "stair",
              "set": [
                "return_plan"
              ],
              "clues": [
                "plans"
              ],
              "gainItems": [
                "return-blueprint"
              ]
            },
            "failure": {
              "text": "시험 장치의 시간 역류가 당신의 심장을 세게 조인다. 해린이 연결을 끊고 작동 순서를 외친다. 동료들이 당신을 계단으로 옮기며 그 절차를 기억한다.",
              "next": "stair",
              "set": [
                "return_plan"
              ],
              "clues": [
                "plans"
              ],
              "pressure": 2,
              "harm": 2,
              "gainItems": [
                "return-blueprint"
              ]
            },
            "fumble": {
              "text": "시험 시간을 두 번 되돌리는 연결을 만들어 당신의 심장이 역류에 붙잡힌다. 생명 3을 잃는다. 해린이 전원을 끊고 올바른 순서를 적은 도면을 일행에게 건넨다. 살아 있는 동료가 있다면 당신을 부활시킬 수 있는 서비스 계단으로 옮긴다.",
              "next": "stair",
              "set": [
                "return_plan"
              ],
              "clues": [
                "plans"
              ],
              "gainItems": [
                "return-blueprint"
              ],
              "harm": 3,
              "pressure": 3
            }
          }
        }
      ],
      "objective": "해린의 협조나 시험을 통해 반환 순서를 확보한다.",
      "details": [
        {
          "id": "original-plan",
          "label": "해린 앞에서 원본 반환 도면을 베껴 챙긴다",
          "text": "반환 잠금축을 푸는 순서와 천창을 도시 쪽으로 맞추는 방향을 한 장에 옮겨 적는다. 시험이나 해린의 설명으로 이 순서까지 검증하면 정확한 반환을 할 수 있다.",
          "clue": "plans",
          "gainItems": [
            "return-blueprint"
          ]
        }
      ],
      "summary": "시계공 해린은 시간을 돌려주는 장치를 설계했지만 호텔에서 뺐다.",
      "stakes": "가동 중인 시간 회로를 잘못 연결하면 생명을 잃을 수 있다."
    },
    "stair": {
      "id": "stair",
      "title": "서비스 계단의 작은 해",
      "chapter": 3,
      "location": "지붕 서비스 계단",
      "art": 2,
      "mood": "tension",
      "text": [
        "지붕 계단참에서 청소 직원 소라를 만난다. 그녀는 수건 속의 새벽 원석을 내려놓고, 동생의 연락처가 적힌 쪽지를 쥐고 있다. “아침을 가져가면 내일 집에 갈 수 있을 줄 알았어요. 원석이 없으면 모두가 여기 갇힐 줄은 몰랐어요.”",
        "소라는 원석을 그냥 깨면 호텔 시계는 풀려도 금고의 시간이 누구 것인지 잃어버린다는 경고를 읽었다. 그래서 반환 방법을 찾아 여기까지 왔다. 아래층에서 경비 발소리가 들린다. 그녀를 믿게 만들거나, 경비를 늦추는 동안 함께 금고로 움직일 수 있다."
      ],
      "entities": [
        {
          "id": "sora",
          "label": "청소 직원 소라",
          "kind": "person",
          "aliases": [
            "소라",
            "청소 직원"
          ]
        },
        {
          "id": "stone",
          "label": "금이 간 새벽 원석",
          "kind": "object",
          "aliases": [
            "원석",
            "새벽",
            "돌"
          ]
        },
        {
          "id": "letter",
          "label": "동생의 연락처 쪽지",
          "kind": "object",
          "aliases": [
            "편지"
          ]
        },
        {
          "id": "sign",
          "label": "젖은 바닥 표지판",
          "kind": "object",
          "aliases": [
            "표지판",
            "수건"
          ]
        }
      ],
      "choices": [
        {
          "id": "honest-plan",
          "label": "소라에게 장부와 반환 방법을 보여 주며 함께 가자고 한다",
          "intent": "talk",
          "target": "sora",
          "stat": "heart",
          "dc": 11,
          "risk": "너무 늦으면 보안원이 원석을 압수하려 든다.",
          "outcomes": {
            "critical": {
              "text": "소라의 실수를 탓하기 전에 장부에 남은 피해와 선택 가능한 반환 방법을 설명한다. 그녀는 직원 대표의 동의서와 빛 수건까지 맡기고, 경비에게 자신이 자발적으로 동행한다고 말한다. 추격이 느려진 동안 함께 거울 회랑으로 간다.",
              "next": "mirrorhall",
              "set": [
                "sora_trust",
                "staff_consent"
              ],
              "clues": [
                "consent",
                "dawn"
              ],
              "gainItems": [
                "light-towel"
              ],
              "pressure": -1
            },
            "success": {
              "text": "소라는 원석을 당신들에게 맡긴다. “그럼 이번엔 저 혼자 고른 일이 아니네요.” 직원들의 반환 서명도 내놓는다.",
              "next": "mirrorhall",
              "set": [
                "sora_trust",
                "staff_consent"
              ],
              "clues": [
                "consent",
                "dawn"
              ]
            },
            "failure": {
              "text": "소라는 당신들을 믿지 못하고 먼저 금고로 달린다. 원석을 지키려는 보안원들도 뒤따른다. 협상할 장소가 금고 앞이 된다.",
              "next": "mirrorhall",
              "clues": [
                "dawn"
              ],
              "pressure": 2
            },
            "fumble": {
              "text": "원석부터 내놓으라는 말에 소라는 일행도 호텔 편이라고 생각한다. 원석을 쥔 채 금고 쪽으로 달리고 경비도 뒤따른다. 떨어진 경고문을 읽은 일행은 원석을 깨면 정확한 반환이 안 된다는 사실을 확인하고 거울 회랑까지 따라간다.",
              "next": "mirrorhall",
              "clues": [
                "dawn"
              ],
              "pressure": 3,
              "unset": [
                "sora_trust"
              ]
            }
          }
        },
        {
          "id": "distract-security",
          "label": "계단의 청소 표지판과 수건으로 경비의 접근을 늦춘다",
          "intent": "trick",
          "target": "sign",
          "stat": "agility",
          "dc": 12,
          "risk": "눈속임이 들키면 추격이 가까워진다. 대실패하면 계단에서 미끄러져 생명 1도 잃는다.",
          "outcomes": {
            "critical": {
              "text": "청소 표지판을 세우고 경비가 지켜야 할 안전 절차를 또박또박 안내한다. 그들이 무전으로 허가를 묻는 동안 소라는 웃으며 빛 수건을 건넨다. 원석의 경고도 확인한 뒤 경비 없이 거울 회랑으로 넘어간다.",
              "next": "mirrorhall",
              "set": [
                "security_cut",
                "sora_trust"
              ],
              "clues": [
                "dawn"
              ],
              "gainItems": [
                "light-towel"
              ],
              "pressure": -1
            },
            "success": {
              "text": "젖은 바닥 표지판 앞에서 경비들이 잠깐 멈춘다. 소라는 소리 없이 웃고, 원석을 든 채 당신들과 금고로 향한다.",
              "next": "mirrorhall",
              "set": [
                "security_cut",
                "sora_trust"
              ],
              "clues": [
                "dawn"
              ]
            },
            "failure": {
              "text": "경비가 표지판을 넘어오자 소라가 금고로 이어지는 회랑 문을 먼저 연다. 일행은 그녀를 따라 거울이 늘어선 복도로 빠져나가지만, 금고 입구까지 가는 길은 아직 남았다.",
              "next": "mirrorhall",
              "clues": [
                "dawn"
              ],
              "pressure": 2
            },
            "fumble": {
              "text": "수건을 당겨 표지판을 세우다 계단에서 미끄러져 생명 1을 잃는다. 경비에게도 위치를 들켰다. 소라가 금고 쪽 문을 열어 주자 일행은 그녀를 따라 거울 회랑으로 빠져나간다.",
              "next": "mirrorhall",
              "clues": [
                "dawn"
              ],
              "harm": 1,
              "pressure": 3
            }
          }
        },
        {
          "id": "use-staff-code",
          "label": "직원 출입번호로 경비 쪽 문을 잠그고 소라와 이동한다",
          "intent": "use",
          "target": "sign",
          "automatic": true,
          "useItems": [
            "staff-code"
          ],
          "requires": {
            "item": "staff-code"
          },
          "lockedHint": "보안실의 출입 기록이나 세탁실의 예비 메모에서 직원 출입번호를 알아내야 한다.",
          "outcomes": {
            "success": {
              "text": "직원 번호로 계단 방화문을 닫아 경비의 접근을 늦춘다. 소라는 자신도 함께 책임지겠다며 원석을 들고 앞장선다. 원석의 경고를 확인한 뒤, 여유를 얻어 거울 회랑으로 이동한다.",
              "next": "mirrorhall",
              "set": [
                "sora_trust",
                "security_cut"
              ],
              "clues": [
                "dawn"
              ],
              "pressure": -1
            }
          }
        }
      ],
      "dialogue": {
        "who": "소라",
        "text": "도둑질을 안 했으면 내 시간은 영원히 호텔 물건이었을까요?"
      },
      "objective": "소라와 함께 금고로 갈 방법을 정한다.",
      "details": [
        {
          "id": "stone-crack",
          "label": "원석의 경고를 읽고 소라에게 빛 수건을 받는다",
          "text": "원석의 경고에는 무작정 깨면 원래 주인별 시간 반환이 불가능하다고 적혀 있다. 소라는 원석을 자기 겉옷으로 감싸고, 새벽빛이 밴 수건은 일행에게 준다. 거울 회랑에서 한 번 쓸 수 있다.",
          "clue": "dawn",
          "gainItems": [
            "light-towel"
          ]
        }
      ],
      "resurrection": {
        "label": "동료의 마지막 건강한 시간을 되돌린다",
        "text": "이 호텔에서 멎은 생명은 금고의 마지막 순간에 잠시 저장된다. 살아 있는 동료가 자기 몫의 시간을 담보로 내면 그 순간을 다시 잇는 판정을 할 수 있다. 운명 1개와 보안 경계 2를 지불한다.",
        "sparkCost": 1,
        "pressureCost": 2,
        "dc": 12
      },
      "summary": "새벽 원석을 가진 소라를 만났고, 경비가 아래층에서 올라온다.",
      "stakes": "원석은 쉽게 깨진다. 서두르거나 추궁하면 소라는 먼저 달아나고 경비도 뒤따른다."
    },
    "mirrorhall": {
      "id": "mirrorhall",
      "title": "거울 속의 나는 퇴근하지 않았다",
      "chapter": 3,
      "location": "금고 앞 거울 회랑",
      "art": 2,
      "mood": "danger",
      "text": [
        "금고 입구로 이어지는 복도 양쪽에 기억 거울이 있다. 이 호텔에 보관한 손님들의 행복했던 순간이 재생되고, 일행에게도 그 자리에 끼어 쉬고 싶은 마음이 든다. 소라는 복도 끝에서 이쪽을 돌아보며 빨리 오라고 손짓한다.",
        "바닥의 붉은 선에는 «머물면 문이 닫힙니다»라는 경고가 있다. 거울을 바라보며 지체하는 사이 금고의 무거운 잠금 날이 내려오는 장치다. 커튼을 내려 시야를 가리거나, 보이는 장면을 지나간 일로 받아들이고 걸어갈 수 있다. 새벽빛 수건이 있다면 영상 자체를 잠깐 지울 수 있다."
      ],
      "entities": [
        {
          "id": "mirrors",
          "label": "기억 거울",
          "kind": "object",
          "aliases": [
            "거울",
            "기억"
          ]
        },
        {
          "id": "curtain",
          "label": "가림막 커튼",
          "kind": "object",
          "aliases": [
            "커튼",
            "가림막"
          ]
        },
        {
          "id": "lock",
          "label": "금고 앞 잠금장치",
          "kind": "object",
          "aliases": [
            "잠금",
            "장치"
          ]
        }
      ],
      "choices": [
        {
          "id": "cover-mirrors",
          "label": "커튼을 내려 서로의 시야에서 기억 거울을 가린다",
          "intent": "help",
          "target": "curtain",
          "stat": "agility",
          "dc": 12,
          "risk": "커튼이 잠금 날에 걸리면 실패·대실패 모두 생명 3을 잃어 사망한다. 대실패는 추격 차단도 풀리고 경계가 더 높아진다.",
          "outcomes": {
            "critical": {
              "text": "커튼을 몸에 걸지 않고 레일 끝에서 내려 거울과 잠금 날의 감지기까지 가린다. 일행이 지나간 뒤 추격하던 경비 쪽 문도 닫힌다. 소라와 함께 보안의 시야를 벗어나 금고 안으로 들어간다.",
              "next": "vault",
              "set": [
                "security_cut"
              ],
              "pressure": -1
            },
            "success": {
              "text": "당신들이 서로의 거울을 가려 주자 지나간 자신들의 웃음이 조용해진다. 금고 문에 모두 함께 도착한다.",
              "next": "vault"
            },
            "failure": {
              "text": "커튼 뒤의 무거운 잠금 날이 내려와 당신을 세게 치고 생명 3을 잃는다. 소라가 문 옆 카트로 틈을 버틴다. 살아 있는 동료가 남아 있다면 당신을 금고 안으로 옮겨 마지막 작동을 준비할 수 있다.",
              "next": "vault",
              "pressure": 2,
              "harm": 3
            },
            "fumble": {
              "text": "커튼이 잠금 날에 걸리고 그 무게가 당신을 문 쪽으로 끌어당긴다. 생명 3을 잃고 날이 바닥에 부딪히며 큰 경보가 울린다. 소라가 문 옆 카트로 틈을 버티는 동안, 살아 있는 동료들이 당신을 금고 안으로 옮긴다.",
              "next": "vault",
              "harm": 3,
              "pressure": 3,
              "unset": [
                "security_cut"
              ]
            }
          }
        },
        {
          "id": "farewell",
          "label": "거울 속 완벽한 장면을 지나쳐 금고로 걸어간다",
          "intent": "perform",
          "target": "mirrors",
          "stat": "heart",
          "dc": 12,
          "risk": "마음이 붙잡히면 경비가 따라온다. 대실패하면 거울의 빛에 붙들려 생명 1을 잃는다.",
          "outcomes": {
            "critical": {
              "text": "“저 웃음은 저 사람들 거예요. 우리는 지금 할 일을 하죠.” 거울을 서로에게 설명하며 걸으니 누구도 멈추지 않는다. 일행이 금고에 도착한 뒤 회랑의 잠금문이 닫혀 추격도 막힌다. 소라는 함께 판단할 사람들을 찾았다며 안심한다.",
              "next": "vault",
              "set": [
                "sora_trust",
                "security_cut"
              ],
              "pressure": -1
            },
            "success": {
              "text": "거울에 보이는 웃음은 호텔 손님들이 보관한 순간이라고 서로 확인한다. 일행이 그 장면 안에 머물러야 할 이유는 없다. 천천히 걸음을 이어 잠금 날이 내려오기 전에 소라가 기다리는 금고에 도착한다.",
              "next": "vault"
            },
            "failure": {
              "text": "평온한 장면을 보고 발을 떼기 어려워진다. 소라가 “여기 남으면 우리 시간도 저 장면에 쓰여요”라고 손을 내민다. 일행은 그녀를 따라 금고로 건너가지만 경비의 발소리도 가까워진다.",
              "next": "vault",
              "pressure": 1
            },
            "fumble": {
              "text": "거울 속 순간에 한 걸음 다가가자 발목을 붙잡는 빛이 조여 온다. 생명 1을 잃고 경비가 복도 입구에 도착한다. 소라가 이름을 크게 불러 당신을 깨우고 손을 잡아 금고 안으로 이끈다.",
              "next": "vault",
              "harm": 1,
              "pressure": 3
            }
          }
        },
        {
          "id": "use-light-towel",
          "label": "빛 수건을 펼쳐 기억 거울을 지우고 함께 통과한다",
          "intent": "use",
          "target": "mirrors",
          "automatic": true,
          "useItems": [
            "light-towel"
          ],
          "requires": {
            "item": "light-towel"
          },
          "lockedHint": "세탁실에서 수건을 빌리거나 계단에서 원석의 경고를 확인하며 소라에게 받아야 한다.",
          "outcomes": {
            "success": {
              "text": "수건을 펼치자 새벽빛이 거울 속 장면을 덮는다. 잠금 날도 손님의 기억을 인식하지 못해 멎는다. 일행은 다치지 않고 금고 안으로 건너간다. 빛을 모두 쓴 수건은 평범한 천이 되어 이 용도로는 더 쓸 수 없다.",
              "next": "vault",
              "pressure": -1
            }
          },
          "consumeItems": [
            "light-towel"
          ]
        }
      ],
      "objective": "거울을 가리거나 과거에 작별하고 문을 통과한다.",
      "summary": "추억을 비추는 거울이 발걸음을 붙잡고, 금고의 잠금 날이 닫히려 한다.",
      "stakes": "커튼에 매달리다 잠금 날에 맞으면 치명상을 입는다. 새벽빛 수건을 쓰면 이 구간을 안전하게 지나간다."
    },
    "vault": {
      "id": "vault",
      "title": "가장 비싼 것은 평범한 오후",
      "chapter": 3,
      "location": "새벽 원석 금고",
      "art": 2,
      "mood": "danger",
      "text": [
        "금고 안에는 직원들이 빼앗긴 평범한 오후들이 이름표와 함께 보관돼 있다. 원래 주인의 이름표로 시간을 보내는 잠금축은 아직 닫혀 있다. 소라는 금고 바깥의 비상 전원을 잡고 일행이 돌아올 길을 지킨다.",
        "호텔 소유주는 통화로 원석부터 돌려놓으면 나중에 보상하겠다고 제안한다. 그 약속에 맡기지 않으려면 잠금축을 풀거나 장부를 공개해 직원들이 관리권을 요구할 근거를 남길 수 있다. 어느 쪽이든 마지막 작동 방향은 위층 천창에서 정한다. 붉은 안전 고리를 강제로 뽑는 지름길은 일행 전원의 생명을 건다."
      ],
      "entities": [
        {
          "id": "vault",
          "label": "시간 금고 잠금축",
          "kind": "object",
          "aliases": [
            "금고",
            "축",
            "잠금"
          ]
        },
        {
          "id": "ledger",
          "label": "공개 송출 단말",
          "kind": "object",
          "aliases": [
            "단말",
            "송출",
            "장부"
          ]
        },
        {
          "id": "roof",
          "label": "천창 정비 발판",
          "kind": "place",
          "aliases": [
            "천창",
            "지붕"
          ]
        }
      ],
      "choices": [
        {
          "id": "unlock",
          "label": "설계 순서대로 금고의 반환 잠금축을 푼다",
          "intent": "use",
          "target": "vault",
          "stat": "wit",
          "dc": 13,
          "risk": "실패하면 전원 생명 1, 대실패하면 전원 생명 2를 잃는다. 모두 이미 다친 상태라면 전멸할 수 있다.",
          "outcomes": {
            "critical": {
              "text": "잠금축을 이름표 번호순으로 풀자 반환 방향이 하나씩 켜진다. 마지막 연결까지 확인한 도면을 완성하고, 보안이 개입할 수 없는 수동 잠금으로 바꾼다. 소라를 불러 원석과 도면을 함께 천창으로 가져간다.",
              "next": "roof",
              "set": [
                "return_plan",
                "security_cut"
              ],
              "clues": [
                "plans"
              ],
              "gainItems": [
                "return-blueprint"
              ],
              "pressure": -1
            },
            "success": {
              "text": "저장된 시간들이 자기 이름표 쪽으로 방향을 바꾼다. 완전한 반환은 천창에서 결정된다. 당신들은 지붕으로 올라간다.",
              "next": "roof",
              "set": [
                "return_plan"
              ],
              "gainItems": [
                "return-blueprint"
              ],
              "clues": [
                "plans"
              ]
            },
            "failure": {
              "text": "반환 축이 비상 해제되며 거꾸로 흐르는 시간이 일행 모두의 심장을 짓누른다. 원석은 보존됐고 천창으로 이어지는 문도 열렸지만, 누군가 일어나 지붕에 도달해야 한다.",
              "next": "roof",
              "pressure": 2,
              "harmAll": 1
            },
            "fumble": {
              "text": "금고의 입금축을 반환축으로 잘못 풀어 거꾸로 흐르는 시간이 일행의 심장을 누른다. 전원이 생명 2를 잃는다. 소라가 바깥 전원을 내려 폭주를 멈추고 천창 계단을 연다. 살아 있는 일행은 원석과 장부를 가지고 옥상으로 올라간다.",
              "next": "roof",
              "harmAll": 2,
              "pressure": 3
            }
          }
        },
        {
          "id": "expose",
          "label": "시간 장부를 연회장의 모든 화면에 송출한다",
          "intent": "perform",
          "target": "ledger",
          "stat": "heart",
          "dc": 12,
          "risk": "소유주가 접속을 차단하면 보안 경계가 최대한 올라간다.",
          "outcomes": {
            "critical": {
              "text": "직원 이름과 이체 내역을 함께 송출하자 화면 앞 직원들이 자기 장부임을 확인한다. 대표들이 반환에 동의하고 보안문을 막아 추격도 늦춘다. 직원들을 증인으로 남겨 둔 채 소라와 함께 원석을 천창으로 가져간다.",
              "next": "roof",
              "set": [
                "owner_exposed",
                "staff_consent",
                "staff_trust",
                "security_cut"
              ],
              "clues": [
                "consent"
              ],
              "pressure": -1
            },
            "success": {
              "text": "정지한 손님들 앞에서 장부 페이지가 한 장씩 넘어간다. 멈추지 않은 직원들이 화면을 보고 지붕 문을 열어 준다.",
              "next": "roof",
              "set": [
                "owner_exposed",
                "staff_consent"
              ],
              "clues": [
                "consent"
              ]
            },
            "failure": {
              "text": "소유주가 송출을 막는다. 그러나 단말의 출력함에서 원본 사본이 나온다. 장부를 챙겨 마지막 선택을 할 지붕으로 올라간다.",
              "next": "roof",
              "pressure": 2
            },
            "fumble": {
              "text": "소유주가 송출을 끊고 일행의 위치를 보안팀 전체에 알린다. 공개 화면에는 아무 기록도 남지 못했다. 직원 한 명이 단말의 인쇄 사본을 챙겨 일행에게 건네고 지붕 계단을 열어 준다. 소라와 함께 그 증거를 들고 올라간다.",
              "next": "roof",
              "pressure": 3,
              "unset": [
                "owner_exposed",
                "security_cut"
              ]
            }
          }
        },
        {
          "id": "unsafe-release",
          "label": "금고의 안전 고리를 모두 해제해 시간을 강제로 정렬한다 (전멸 위험)",
          "intent": "force",
          "target": "vault",
          "stat": "might",
          "dc": 15,
          "risk": "성공하면 시간 반환·직원 동의·공개 장부를 한꺼번에 확보하고 경계가 낮아진다. 실패는 전원 생명 2 피해, 대실패는 전원 생명 3 피해로 전멸한다.",
          "outcomes": {
            "critical": {
              "text": "고리들을 같은 박자에 풀어 이름표와 시간을 정확히 맞춘다. 반환 순서가 도면으로 출력되고 직원들의 요청과 장부도 공개 화면에 전송된다. 경비들까지 자기 이름을 찾느라 멈춘 사이, 원석과 도면을 들고 옥상으로 올라간다.",
              "next": "roof",
              "set": [
                "return_plan",
                "staff_consent",
                "owner_exposed",
                "security_cut"
              ],
              "clues": [
                "plans",
                "consent",
                "ledger"
              ],
              "gainItems": [
                "return-blueprint"
              ],
              "pressure": -3
            },
            "success": {
              "text": "안전 고리가 같은 순간에 풀린다. 원래 주인별로 정렬된 시간이 천창 회로를 밝히고, 직원들의 반환 요청과 호텔 장부가 연회장 화면에 전송된다. 보안 순찰이 화면으로 몰리는 동안 지붕으로 간다.",
              "next": "roof",
              "set": [
                "return_plan",
                "staff_consent",
                "owner_exposed"
              ],
              "clues": [
                "plans",
                "consent",
                "ledger"
              ],
              "pressure": -2
            },
            "failure": {
              "text": "안전 고리 하나가 늦게 빠져 일행의 생명 시간이 회로로 새어 나간다. 전원이 생명 2를 잃는다. 문밖의 소라가 전원을 끊어 추가 피해를 막고 원석을 지킨다. 정렬은 끝내지 못한 채, 살아 있는 일행은 그녀와 옥상으로 대피한다.",
              "next": "roof",
              "harmAll": 2,
              "pressure": 2
            },
            "fumble": {
              "text": "고리들이 서로 다른 방향으로 풀려 일행의 남은 생명 자체가 금고의 동력으로 빨려 들어간다. 전원이 생명 3을 잃는다. 문밖의 소라도 전원을 끊지 못하고, 다시 고리를 잠글 살아 있는 동료가 안에 남지 않는다.",
              "next": "roof",
              "harmAll": 3,
              "pressure": 3
            }
          }
        }
      ],
      "objective": "반환 잠금축을 풀거나 장부를 공개한 뒤 천창으로 간다.",
      "callbacks": [
        {
          "when": {
            "flag": "staff_trust"
          },
          "text": "직원들이 보안문 앞에서 청소 카트를 일제히 세운다. 당신들이 보여 준 태도가 몇 분의 시간을 벌어 준다."
        }
      ],
      "summary": "훔친 시간과 원소유자 이름표가 금고에 보관돼 있다.",
      "stakes": "금고를 잘못 열면 전원이 피해를 받는다. 안전 고리 강제 해제의 대실패는 전멸이다."
    },
    "roof": {
      "id": "roof",
      "title": "새벽의 주인을 정하는 곳",
      "chapter": 4,
      "location": "유리 호텔 옥상",
      "art": 3,
      "mood": "tension",
      "text": [
        "금고 위의 정비 계단을 올라오자 소라가 새벽 원석을 들고 합류한다. 천창에는 원석을 끼울 빈자리와 방향을 바꾸는 반사판이 있다. 일행은 아침을 다시 시작할 수 있는 열쇠와 직원들의 시간 장부를 손에 넣었다.",
        "반환 도면과 작동 순서를 확보했다면 직원들에게 동의를 묻고 시간을 각자의 이름표로 돌릴 수 있다. 아직 분배할 자신이 없다면 호텔의 아침부터 시작하고 금고를 직원 대표의 공동 관리에 넘길 수 있다. 원석을 깨는 선택은 시간 거래를 끝내지만, 빼앗긴 시간의 정확한 반환도 포기하는 일이다."
      ],
      "entities": [
        {
          "id": "mirror",
          "label": "천창 반사판",
          "kind": "object",
          "aliases": [
            "반사판",
            "천창"
          ]
        },
        {
          "id": "stone",
          "label": "새벽 원석",
          "kind": "object",
          "aliases": [
            "새벽",
            "원석"
          ]
        },
        {
          "id": "sora",
          "label": "청소 직원 소라",
          "kind": "person",
          "aliases": [
            "소라"
          ]
        }
      ],
      "choices": [
        {
          "id": "return-hours",
          "label": "반환 설계대로 직원들의 시간을 원래 주인에게 돌린다",
          "intent": "choose",
          "target": "mirror",
          "automatic": true,
          "outcomes": {
            "success": {
              "text": "직원들의 동의를 확인한 뒤 완성한 도면대로 잠금축과 천창을 맞춘다. 각자의 이름표에 오후와 저녁이 돌아가고, 소라는 돌려받은 시간으로 동생에게 전화를 건다. 호텔 밖에도 평범한 아침이 시작된다.",
              "next": "ending-return"
            }
          },
          "requires": {
            "all": [
              {
                "flag": "return_plan"
              },
              {
                "item": "return-blueprint"
              }
            ]
          },
          "useItems": [
            "return-blueprint"
          ],
          "lockedHint": "기록실에서 반환 도면을 완성하거나 작업실에서 원본을 확보하고 작동 순서를 검증해야 한다."
        },
        {
          "id": "restart-hotel",
          "label": "호텔의 아침부터 돌리고 원석과 장부를 공동 보관한다",
          "intent": "choose",
          "target": "stone",
          "automatic": true,
          "outcomes": {
            "success": {
              "text": "원석을 자리에 맞추자 빗방울이 다시 떨어진다. 장부와 관리키는 소유주 대신 직원 대표에게 넘긴다.",
              "next": "ending-settlement"
            }
          }
        },
        {
          "id": "break-contract",
          "label": "원석을 깨뜨려 시간을 사고파는 호텔을 끝낸다",
          "intent": "choose",
          "target": "stone",
          "automatic": true,
          "outcomes": {
            "success": {
              "text": "당신들은 계약서 위에 원석을 놓고 깨뜨린다. 값으로 매길 수 있었던 모든 시간이 빛으로 흩어진다.",
              "next": "ending-break"
            }
          }
        }
      ],
      "objective": "시간 반환, 직원 공동 보관, 시간 거래 장치 파괴 중 하나를 고른다.",
      "callbacks": [
        {
          "when": {
            "flag": "sora_trust"
          },
          "text": "소라는 원석에서 손을 떼고 당신들의 옆에 선다. 이번 선택의 책임을 혼자 지지 않겠다는 뜻이다."
        },
        {
          "when": {
            "flag": "owner_exposed"
          },
          "text": "아래층 직원들이 장부를 복사해 품에 넣는다. 어떤 결말이 와도 착취의 기록은 호텔 안에만 남지 않는다."
        }
      ],
      "resurrection": {
        "label": "동료의 마지막 건강한 시간을 되돌린다",
        "text": "이 호텔에서 멎은 생명은 금고의 마지막 순간에 잠시 저장된다. 살아 있는 동료가 자기 몫의 시간을 담보로 내면 그 순간을 다시 잇는 판정을 할 수 있다. 운명 1개와 보안 경계 2를 지불한다.",
        "sparkCost": 1,
        "pressureCost": 2,
        "dc": 12
      },
      "summary": "새벽 원석을 되돌릴 자리와 세 방향의 천창 반사판이 있다.",
      "stakes": "원석만 깨면 원래 주인별 반환은 불가능해진다. 도면이 있어야 정확한 반환을 시도할 수 있다."
    },
    "ending-return": {
      "id": "ending-return",
      "title": "오늘은 제가 먼저 퇴근합니다",
      "chapter": 4,
      "art": 3,
      "mood": "hope",
      "ending": true,
      "text": [
        "새벽빛이 금고를 훑자 직원들의 이름표에서 작은 시간 조각들이 날아오른다. 시계공 해린에게는 돌보지 못한 작업실의 오후가, 포터 민에게는 버스를 타고 집에 가던 한 시간이 돌아온다. 과거의 일이 지워지는 것은 아니다. 직원들은 되찾은 시간만큼 지금부터 자기 삶을 돌볼 여유를 얻는다.",
        "호텔의 완벽한 연회는 평범한 실패한 파티가 된다. 식은 음식, 지친 연주자, 불평하는 손님들. 소라는 앞치마를 벗고 현관 밖으로 걸어간다. 비는 여전히 내리지만 그녀가 퇴근할 동안 기다려 주지는 않는다. 이제 세상과 같은 시간이다."
      ],
      "epilogues": [
        {
          "when": {
            "flag": "staff_consent"
          },
          "text": "직원 대표들이 반환 내역을 함께 확인한다. 타인의 시간을 대신 처분하지 않았다는 서명이 장부의 마지막 장에 남는다."
        },
        {
          "when": {
            "flag": "owner_exposed"
          },
          "text": "공개된 장부 때문에 소유주는 단순 고장이라고 설명할 수 없다. 호텔 로비에는 직원들이 운영하는 상담 창구가 들어선다."
        }
      ],
      "question": "당신에게 평범하지만 빼앗기고 싶지 않은 한 시간은 언제인가요?",
      "choices": []
    },
    "ending-settlement": {
      "id": "ending-settlement",
      "title": "유리 호텔의 첫 공동 열쇠",
      "chapter": 4,
      "art": 3,
      "mood": "hope",
      "ending": true,
      "text": [
        "원석을 돌려놓자 모든 시계가 여섯 시를 가리킨다. 손님들은 시간이 멈췄다는 사실조차 모르고 체크아웃을 서두른다. 그러나 장부를 든 직원들은 예전 자리로 돌아가지 않는다. 보관고와 관리키가 이제 직원 대표의 손에 있다.",
        "모든 잃어버린 시간을 그날 돌려받지는 못한다. 반환 순서와 보상은 남은 사람들의 일이 된다. 소라는 처음으로 종료 시각이 적힌 근무표를 받는다. 완벽한 해결은 아니지만, 누구도 다시 혼자 새벽을 훔칠 필요는 없게 만드는 시작이다."
      ],
      "epilogues": [
        {
          "when": {
            "flag": "staff_trust"
          },
          "text": "포터 민이 공동 관리자를 맡아 달라는 제안을 받는다. 그는 먼저 다음 주 휴일을 달력에 표시한다."
        },
        {
          "when": {
            "flag": "return_plan"
          },
          "text": "완성된 반환 설계도는 금고와 함께 보관된다. 시간이 걸려도 다시 검증할 수 있는 방법이 남았다."
        }
      ],
      "question": "나중으로 미룬 약속이 다시 사라지지 않게, 여러분은 어떤 확인을 남기나요?",
      "choices": []
    },
    "ending-break": {
      "id": "ending-break",
      "title": "완벽하지 않은 아침",
      "chapter": 4,
      "art": 3,
      "mood": "hope",
      "ending": true,
      "text": [
        "원석이 깨지는 순간 도시의 모든 그림자가 조금씩 흔들린다. 보관된 행복도 훔친 야근도 정확한 이름표로 돌아가지는 못한다. 대신 시간을 사고파는 회로 자체가 녹아내린다. 호텔은 다시는 같은 방식으로 완벽한 순간을 팔 수 없다.",
        "호텔 손님들이 상품으로 보관해 두었던 좋은 순간도 다시 재생할 수 없게 된다. 그 일을 실제로 겪었던 기억까지 사람들에게서 지워지는 것은 아니다. 직원들은 유리 조각을 모으고 문을 잠근다. 일행도 그 마지막 청소를 거든 뒤 평범한 아침으로 나온다."
      ],
      "epilogues": [
        {
          "when": {
            "flag": "owner_exposed"
          },
          "text": "호텔이 무너뜨린 회로의 책임은 장부에 남는다. 증거까지 빛 속으로 사라진 것은 아니다."
        },
        {
          "when": {
            "flag": "sora_trust"
          },
          "text": "소라는 망치 자루에 당신들 이름을 작게 쓴다. 훔친 사람의 도구가 아니라 함께 끝낸 사람들의 도구가 된다."
        }
      ],
      "question": "다시 살 수 없게 된 좋은 순간을, 여러분은 어떻게 기억하고 싶나요?",
      "choices": []
    }
  },
  "deathEnding": {
    "title": "돌아오지 못한 체크아웃",
    "art": 2,
    "mood": "danger",
    "text": [
      "일행의 마지막 심장이 멎자 호텔의 금고에 새 모래시계들이 켜진다. 객실 번호 대신 일행의 이름이 붙는다. 그 마지막 순간을 다시 꺼내 줄 살아 있는 동료는 이제 없다.",
      "소라는 새벽 원석을 들고 빈 복도를 바라본다. 누구도 대신 시간을 되돌려 주지 못한 이 밤의 기록은 장부에 남는다. 호텔은 여전히 완벽한 손님을 기다리지만, 이번 일행의 체크아웃은 끝내 기록되지 않는다."
    ],
    "question": "돌아오지 못한 일행의 이름 옆에 어떤 진실만은 남겨야 할까요?"
  },
  "items": {
    "staff-code": {
      "name": "직원통로 출입번호",
      "description": "세탁실·기록실·천창 정비실을 여는 직원용 번호를 적은 메모. 손님용 열쇠와 다른 통로를 이용할 수 있다.",
      "useHint": "지붕 서비스 계단에서 직원문을 잠그고 소라와 안전하게 이동할 수 있다.",
      "legacyClues": [
        "badge"
      ]
    },
    "return-blueprint": {
      "name": "완성한 시간 반환 도면",
      "description": "금고 잠금축을 푸는 순서와 천창 반사판의 방향이 함께 적힌 도면. 원석만 되돌려 놓는 것과 직원들의 시간을 돌려주는 것은 다른 작업이다.",
      "useHint": "옥상에서 이 도면과 반환 절차를 확보해야 시간을 원래 주인에게 돌릴 수 있다.",
      "legacyClues": [
        "plans"
      ]
    },
    "light-towel": {
      "name": "새벽빛이 남은 수건",
      "description": "소라가 새벽 원석을 감쌌던 수건. 빛을 펼치면 기억 거울의 영상을 잠시 지울 수 있지만 수건은 그 자리에서 평범해진다.",
      "useHint": "금고 앞 거울 회랑에서 한 번 사용해 기억과 잠금 날을 안전하게 통과한다.",
      "consumable": true
    }
  }
};

export default campaign;
