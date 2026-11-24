// Chronicle Gate v21: preserved v20 routes with authored optional continuation.
const campaign = {
  "id": "glass-hotel",
  "title": "유리 호텔의 도난당한 새벽",
  "subtitle": "손님들의 밤은 멈췄는데, 직원들은 퇴근하지 못한다.",
  "genre": "시간 도둑 · 잠입 미스터리",
  "accent": "#a996dc",
  "description": "유리 호텔의 손님들이 웃던 모습 그대로 멈췄다. 직원들은 끝나지 않는 연회를 치우고, 밖에서 찾아온 일행에게 도움을 청한다. 아침을 여는 원석을 쫓다 보면 손님이 산 행복한 한 시간에 직원의 야근 열 시간이 쓰였음을 알게 된다. 원석을 되찾은 뒤 그 시간을 어디로 돌려줄지는 일행에게 달렸다.",
  "estimatedMinutes": "35–60",
  "contentNotes": [
    "노동 착취",
    "감금",
    "시간 정지"
  ],
  "objective": "사라진 새벽 원석을 찾아, 빼앗긴 시간과 호텔의 아침을 어떻게 돌려줄지 고른다.",
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
      "secret": "청소 직원 소라의 동생에게서, 언니에게 편지를 전해 달라는 부탁을 받았다. 봉투에는 「이번에는 언니도 저녁밥에 와」라고 적혀 있다.",
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
      "title": "연회 계약서의 작은 글씨",
      "text": "손님은 잊고 싶은 순간을 매각하고 붙잡고 싶은 순간을 구입한다. 구매 시간의 출처는 표기되지 않았다."
    },
    "dust": {
      "title": "멈추지 않는 청소 자국",
      "text": "오늘 투숙 계약에 서명한 손님들은 멈췄다. 직원들과 밖에서 찾아온 일행은 움직일 수 있다. 호텔 차양에 멎은 비 아래로도 새 청소 자국이 난다."
    },
    "ledger": {
      "title": "시간 급여 장부",
      "text": "직원들의 야간 초과 근무 시간이 금고에 저장되고 있었다. 직원에게 보관 동의나 지급 기록은 없다."
    },
    "receipt": {
      "title": "새벽 경매 영수증",
      "text": "경매품 「아침이 오기 직전」은 호텔의 아침을 여는 새벽 원석이다. 원석이 제자리를 떠나자 연회가 멈췄고, 직원들의 근무가 끝날 시각도 오지 않는다."
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
    },
    "shift-gaps": {
      "title": "끝나지 않는 교대",
      "text": "교대장에는 다음 사람의 출근만 있고 앞사람의 퇴근은 비어 있다. 직원들이 각자 맡았던 열쇠와 아직 돌려받지 못한 시간을 직접 확인했다."
    },
    "spare-room-note": {
      "title": "배정되지 않은 객실",
      "text": "계단 아래 복도의 빈 객실들은 오늘 손님에게 배정되지 않았다. 열쇠표와 민의 메모가 같은 번호를 가리킨다."
    },
    "rest-consent": {
      "title": "머물고 싶은 사람의 이름",
      "text": "직원 중에는 바로 집으로 갈 사람도, 잠깐 쉬고 나서 갈 사람도 있었다. 남는 것은 새 근무가 아니며 언제든 떠날 수 있어야 한다는 뜻을 확인했다."
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
    "window_ready": "천창 반사판을 바깥으로 맞췄다",
    "solo_min_promise": "민에게 돌아나갈 때 함께 밖으로 가겠다고 약속해 신뢰를 얻었다",
    "group_drew_guards": "경비의 질문을 먼저 맡아 일행에게 직원 통로를 열어 주었다",
    "solo_sora_walk": "소라에게 집으로 돌아갈 때까지 함께 걷겠다고 약속했다",
    "group_held_firedoor": "방화문을 붙들어 소라와 동료들이 금고 회랑으로 갈 시간을 벌었다",
    "shift_witnessed": "끝나지 않은 교대와 열쇠의 실제 담당자를 직원들 앞에서 확인했다",
    "rest_rooms_ready": "손님이 없는 객실을 열어 원하는 직원이 쉬어 갈 자리를 마련했다",
    "rest_requests": "직원들에게 머물 의사를 물어 임시 휴식 숙소로 바꾸자는 동의를 얻었다",
    "closure_requested": "직원들이 스스로 열쇠를 반납하고 영업 중단을 요청했다"
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
        "유리 호텔 차양 아래에 빗방울이 멎어 있다. 로비 손님들도 잔을 든 채 굳었는데, 짐을 나르는 직원 민은 카트를 밀고 온다. 민이 회전문을 붙든다. “오늘 투숙 계약에 서명한 손님들만 멈췄어요. 직원인 저희와 방금 오신 분들은 움직일 수 있고요.”",
        "호텔 지배인 우가 다섯 시 오십구 분에 멎은 시계를 가리킨다. 호텔의 아침을 여는 새벽 원석을 경매 도중 도둑맞았다고 한다. 민은 끝나지 않는 연회장을 돌아본다. “안에서 무슨 일이 났는지 좀 봐 주실래요?” 접객대와 직원 통로로 가는 문이 나란히 보인다."
      ],
      "entities": [
        {
          "id": "manager",
          "label": "호텔 지배인 우",
          "kind": "person",
          "aliases": [
            "매니저",
            "우"
          ]
        },
        {
          "id": "porter",
          "label": "짐을 나르는 직원 민",
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
        },
        {
          "id": "guard",
          "label": "로비의 경비",
          "kind": "person",
          "aliases": [
            "경비",
            "보안원"
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
          "risk": "명단에서 이름을 확인하지 못하면 경비가 의심하고 직원 통로로 보낸다.",
          "outcomes": {
            "critical": {
              "text": "초대 손님인 척, 서명하기 전에 경매 설명부터 듣겠다고 한다. 우가 계약서와 보안 열람 메모를 건네고 경비를 다른 층으로 돌린다. 종이를 받아 회전문과 로비를 지나 접객대 앞에 서자 시간 상품들이 보인다.",
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
              "text": "초대 손님이라 말하자 우가 장갑을 벗고 명단을 펼친다. 우가 열어 준 회전문을 지나 로비로 들어간다. 손님으로 받아들여진 채 접객대 앞에 서니 직원이 시간 상품의 계약서를 내민다.",
              "next": "reception",
              "set": [
                "cover"
              ]
            },
            "failure": {
              "text": "초대 손님이라며 명단을 청하지만 우는 그 이름을 찾지 못한다. 경비가 다가오기 전에 민이 신원 확인은 직원 쪽에서 하자며 문을 연다. 민의 카트 뒤를 따라 직원 복도에 들어선다.",
              "next": "service",
              "pressure": 1
            },
            "fumble": {
              "text": "초대 번호를 대라는 요구에 답이 막히자 우가 사칭 경보를 켠다. 민이 직원 문을 붙들고 말한다. “움직일 수 있는 분들이니 조사라도 도와주시게 해 주세요.” 민의 손짓을 따라 카트 뒤로 들어가자 직원 복도까지 경비 무전이 따라온다.",
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
          "label": "민에게 조용히 직원 통로를 안내해 달라고 한다",
          "intent": "choose",
          "target": "porter",
          "automatic": true,
          "outcomes": {
            "success": {
              "text": "손님 문 대신 카트 옆에 서자 민이 직원 문을 민다. “도와주실 거라면 이쪽으로 오세요.” 민을 따라 좁은 문턱을 넘자 멈춰 선 손님들이 등 뒤로 가려진다.",
              "next": "service"
            }
          }
        },
        {
          "id": "solo-promise-porter",
          "label": "돌아나갈 때 함께 가자고 민에게 약속하고 직원 문을 부탁한다",
          "intent": "talk",
          "target": "porter",
          "stat": "heart",
          "dc": 11,
          "requires": {
            "partyMax": 1
          },
          "risk": "약속을 설명하는 동안 경비가 다가온다. 실패하면 직원 통로에 감시가 붙는다.",
          "outcomes": {
            "critical": {
              "text": "밖으로 나갈 때 혼자 두지 않겠다고 말하자 민이 잠시 문 닦던 손을 멈춘다. 직원 출입번호를 적어 주고 바로 통로를 연다. 그와 회전문을 빠져나와 직원 복도로 들어간다.",
              "next": "service",
              "set": [
                "solo_min_promise",
                "staff_trust"
              ],
              "clues": [
                "badge"
              ],
              "gainItems": [
                "staff-code"
              ],
              "pressure": -1
            },
            "success": {
              "text": "돌아갈 때 같이 나가자는 말에 민이 문밖의 비를 본다. “그때 이 카트도 놓고 가면 좋겠네요.” 그가 연 직원 문으로 들어가, 아직 퇴근하지 못한 사람들의 복도를 함께 걷는다.",
              "next": "service",
              "set": [
                "solo_min_promise",
                "staff_trust"
              ]
            },
            "failure": {
              "text": "함께 나가자는 약속을 민은 선뜻 믿지 못한다. 경비가 다가오자 민이 직원 문을 연다. “일단 조사부터 도와주세요.” 약속에 답을 받지는 못한 채, 감시받는 복도로 들어간다.",
              "next": "service",
              "pressure": 1
            },
            "fumble": {
              "text": "출구를 찾겠다는 말에 경비가 도둑의 도주를 돕느냐고 끼어든다. 민이 직원 문을 붙들며 조사할 사람마저 막을 수는 없다고 맞선다. 무전 경보를 들으며 민의 뒤를 따라 통로로 들어선다.",
              "next": "service",
              "pressure": 3
            }
          }
        },
        {
          "id": "group-draw-inspection",
          "label": "경비에게 내 이름부터 밝히고 질문을 맡아 민에게 틈을 준다",
          "intent": "trick",
          "target": "guard",
          "stat": "heart",
          "dc": 12,
          "requires": {
            "partyMin": 2,
            "aliveMin": 2
          },
          "risk": "질문을 붙들지 못하면 일행도 보안실로 안내된다. 대실패하면 사칭 의심과 경계가 크게 오른다.",
          "outcomes": {
            "critical": {
              "text": "경비 앞에 먼저 서서 조사에 필요한 확인을 하나씩 묻는다. 경비가 일행의 도움을 받겠다며 무전하는 동안 민이 직원 문을 열고 순찰을 비켜 세운다. 질문을 마친 뒤 일행과 그 문으로 들어간다.",
              "next": "service",
              "set": [
                "group_drew_guards",
                "staff_trust",
                "security_cut"
              ],
              "pressure": -1
            },
            "success": {
              "text": "내 이름부터 확인하라며 경비의 질문을 받아내자 민이 좁은 직원 문을 연다. 그가 안에서 기다린다는 손짓을 보낸다. 마지막 답을 마치고 일행과 통로로 들어가니 카트가 길을 비켜 준다.",
              "next": "service",
              "set": [
                "group_drew_guards",
                "staff_trust"
              ]
            },
            "failure": {
              "text": "질문을 맡으려던 말을 경비가 의심스럽게 듣고 영상부터 보자고 한다. 민은 직원 문에서 물러선다. 경비의 안내로 일행과 보안실에 들어가, 벽의 도난 영상을 확인해야 한다.",
              "next": "security",
              "pressure": 1
            },
            "fumble": {
              "text": "경비의 질문과 이름 확인이 엇갈리자 사칭이라는 무전이 돈다. 민이 항의해도 직원 문으로 보낼 수 없다고 한다. 감시를 받으며 보안실로 가자, 담당자가 사건 영상을 켠다.",
              "next": "security",
              "pressure": 3,
              "unset": [
                "cover"
              ]
            }
          }
        }
      ],
      "dialogue": {
        "who": "호텔 지배인 우",
        "text": "손님들은 멈춘 줄도 모릅니다. 원석을 되찾지 못하면 이 연회는 끝나지 않아요."
      },
      "objective": "손님처럼 접객대로 들어가거나 민과 직원 통로로 간다.",
      "details": [
        {
          "id": "moving-dust",
          "label": "공중의 비와 바닥의 청소 자국을 비교한다",
          "text": "오늘 계약에 서명한 손님들은 같은 자세로 굳어 있다. 직원들이 닦은 바닥에는 새 청소 자국이 생기고, 바깥에서 들어온 일행의 발자국도 찍힌다.",
          "clue": "dust"
        }
      ],
      "summary": "오늘 계약에 서명한 손님들은 멎었다. 직원과 새로 온 일행은 움직이지만 호텔의 아침은 오지 않는다.",
      "stakes": "위장이 들키면 경비가 일행을 지켜본다. 직원 통로로도 조사는 이어갈 수 있다.",
      "partyText": {
        "solo": [
          "혼자 찾아온 유리 호텔의 차양 아래에 빗방울이 멎어 있다. 로비 손님들은 잔을 든 채 굳었지만, 짐을 나르는 직원 민은 카트를 밀고 온다. 민이 회전문을 붙든다. “오늘 투숙 계약에 서명한 손님들만 멈췄어요. 저희 직원이나 방금 오신 손님은 괜찮아요.”",
          "호텔 지배인 우가 다섯 시 오십구 분에 멎은 시계를 보인다. 아침을 여는 새벽 원석을 경매 도중 도둑맞았다고 한다. 민이 멈춘 손님들 사이를 가리킨다. “좀 살펴봐 주실래요? 저희도 집에 가고 싶어요.” 접객대와 직원 통로, 어느 쪽에서 말을 들을지 고를 차례다."
        ],
        "group": [
          "호텔 차양에 멎은 빗방울 아래로 일행의 발소리가 이어진다. 짐을 나르는 직원 민이 카트를 세우고 회전문을 붙든다. 안의 손님들은 웃다가 굳어 있다. “오늘 투숙 계약에 서명한 분들만 멈췄어요. 저희 직원들과 방금 오신 여러분은 움직일 수 있어요.”",
          "호텔 지배인 우는 아침을 여는 새벽 원석을 도둑맞았다며 경비를 부른다. 민이 일행에게 낮게 부탁한다. “안에서 무슨 일이 났는지 봐 주세요. 연회가 끝나야 저희도 퇴근하거든요.” 누군가 경비의 질문을 맡으면 민이 직원 통로를 보여 줄 틈이 생길 듯하다."
        ]
      }
    },
    "reception": {
      "id": "reception",
      "title": "행복했던 시간의 가격표",
      "chapter": 1,
      "location": "대리석 접객 카운터",
      "art": 0,
      "mood": "calm",
      "text": [
        "객실 열쇠를 걸 자리마다 작은 모래시계가 있다. 첫 춤, 합격 소식, 혼자 마음껏 울었던 십 분. 유리 속 모래는 어느 쪽으로도 흐르지 않는다. 접객 직원이 장갑 낀 손으로 상품 가격표를 바로 세운다.",
        "기억을 내놓는 손님의 서명란은 크다. 그 대가로 사는 시간의 원래 주인을 적을 칸은 없다. 직원은 마지막 경매가 열린 연회장과 도난 영상을 둔 보안실을 가리킨다. “어느 쪽을 먼저 안내할까요?”"
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
              "text": "연회장을 가리키자 직원이 길을 비켜 준다. 그가 연 문으로 들어서니 공중에 멎은 샴페인 기포 사이에서 누군가 접시를 거둔다. 끝나지도 못한 파티 안에 설거지 소리만 낮게 울린다.",
              "next": "ballroom"
            }
          }
        },
        {
          "id": "record-request",
          "label": "지배인 우의 이름을 대고 보안 기록 열람을 요구한다",
          "intent": "talk",
          "target": "security",
          "stat": "heart",
          "dc": 12,
          "risk": "허가를 못 받으면 출입 시도가 경보에 남는다.",
          "outcomes": {
            "critical": {
              "text": "조회할 영상과 손님 보호 이유를 적자 경비가 허가 도장을 찍고 순찰에도 조사 중이라 알린다. 무전의 재촉이 잦아든다. 그가 연 보안실에 들어가자 담당 직원이 원본 영상을 켠다.",
              "next": "security",
              "set": [
                "security_cut",
                "cover"
              ],
              "pressure": -1
            },
            "success": {
              "text": "지배인 우의 이름을 대며 요청서를 밀어 놓자 경비가 한 줄씩 읽는다. 「손님 보호」라는 항목에 도장을 찍은 경비를 따라 보안실에 들어간다. 안쪽 화면에서는 손님들이 멈추기 전의 연회가 되풀이되고 있다.",
              "next": "security"
            },
            "failure": {
              "text": "열람을 거절한 경비가 문을 닫다 멈춘 손님의 옷자락에 걸린다. 그가 옷을 빼는 동안 영상 담당 직원이 안에서 문을 연다. 경고는 남았지만 그 안내를 받아 보안실 안으로 들어간다.",
              "next": "security",
              "pressure": 2
            },
            "fumble": {
              "text": "열람 권한을 설명하다 부서명이 어긋나자 경비가 손님 자격을 지운다. 무전에는 사칭이라는 말이 오간다. 영상 담당 직원만 “사실은 확인해야죠”라며, 감시받는 조건으로 보안실 문을 연다.",
              "next": "security",
              "pressure": 3,
              "unset": [
                "cover"
              ]
            }
          }
        }
      ],
      "objective": "원석 경매가 열린 연회장을 보거나 보안 영상을 요청한다.",
      "details": [
        {
          "id": "fine-print",
          "label": "접객대 계약서의 작은 글씨를 읽는다",
          "text": "손님이 파는 기억은 명시돼 있지만 손님이 사는 시간의 원래 주인은 적혀 있지 않다.",
          "clue": "invite"
        }
      ],
      "summary": "기억을 값으로 내고 행복했던 시간을 사는 계약서들이 놓였다.",
      "stakes": "보안 열람이 거절되면 일행도 의심을 받는다."
    },
    "service": {
      "id": "service",
      "title": "퇴근 버튼이 없는 복도",
      "chapter": 1,
      "location": "직원 통로",
      "art": 0,
      "mood": "mystery",
      "text": [
        "직원 통로의 시계들은 서로 다른 밤에 머물러 있다. 자정, 두 시, 어제 오후. 종업원들이 손목시계를 맞대 보지만 어느 것이 맞는지 말해 주는 사람은 없다. 민의 카트 바퀴만 같은 박자로 삐걱댄다.",
        "민이 출퇴근기에 카드를 댄다. 웃는 얼굴 아래 「고객의 완벽한 순간을 위해 조금만 더」가 뜬다. 마지막 출입자 칸에는 청소 직원 소라의 이름이 있다. “이 사람은 정말 퇴근하려고 했어요.” 민이 카드를 빼지 못하고 덧붙인다."
      ],
      "entities": [
        {
          "id": "porter",
          "label": "직원 민",
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
              "text": "입금 시각을 출입 기록에 맞추자 야근이 금고로 넘어간 내역이 출력된다. 민은 종이 옆에 직원 출입번호를 적어 준다. “소라의 카트도 봐 주세요.” 두 기록을 챙겨 세탁실로 향한다.",
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
              "text": "작은 항목을 열자 급여 대신 시간 금고로 넘어간 숫자가 드러난다. 마지막 이름은 소라다. 화면을 함께 보던 민이 그녀의 카트를 보여 주겠다며 길을 열어, 그와 세탁실로 들어간다.",
              "next": "laundry",
              "clues": [
                "ledger"
              ],
              "set": [
                "staff_trust"
              ]
            },
            "failure": {
              "text": "상세 항목을 여는 순간 출퇴근기가 잠긴다. 민이 카드를 대 보다 보안실 쪽 문을 연다. “해제한 기록도 남겠죠.” 웃는 얼굴만 띄운 기계를 떠나, 그와 보안실로 들어간다.",
              "next": "security",
              "pressure": 1
            },
            "fumble": {
              "text": "관리 항목을 건드리자 출퇴근기가 잠기고 직원들의 호출기가 한꺼번에 운다. 민이 손을 가로막는다. “다른 건 더 만지지 말아 주세요.” 그는 해제 기록을 찾을 보안실 문만 열어 준다.",
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
          "label": "민의 수건 카트를 함께 밀며 세탁실로 간다",
          "intent": "choose",
          "target": "porter",
          "automatic": true,
          "outcomes": {
            "success": {
              "text": "카트 반대쪽 손잡이를 잡자 민이 놀라 손의 힘을 푼다. 직원들이 길을 터 주는 좁은 복도를 함께 밀고 간다. 세탁실 문턱을 넘어 카트를 세우자 멈추지 않은 기계 소리가 주위를 채운다.",
              "next": "laundry",
              "set": [
                "staff_trust"
              ]
            }
          }
        }
      ],
      "objective": "출퇴근 기록을 살피거나 민의 수건 카트를 거든다.",
      "details": [
        {
          "id": "read-times",
          "label": "출퇴근기 상세 내역을 살핀다",
          "text": "초과 근무 시간이 급여가 아니라 시간 금고로 이체된다. 직원 동의와 반환 기록은 없다.",
          "clue": "ledger"
        }
      ],
      "summary": "퇴근하려고 카드를 대도 출퇴근기는 계속 일하라는 말만 한다.",
      "stakes": "기계를 잠그면 경비가 온다. 보안실에서 기록을 다시 찾을 수 있다.",
      "callbacks": [
        {
          "when": {
            "flag": "solo_min_promise"
          },
          "text": "민이 카트를 문 안쪽에 세운다. 함께 나가자는 말을 들은 뒤부터는, 출구를 향해 손잡이를 돌려 놓는다."
        },
        {
          "when": {
            "flag": "group_drew_guards"
          },
          "text": "민은 경비의 질문을 맡았던 사람에게 마른 수건을 내민다. 그 사이에 열었던 직원 문을 닫으며 작은 목소리로 고맙다고 한다."
        }
      ]
    },
    "ballroom": {
      "id": "ballroom",
      "title": "경매사가 끝내 내리지 못한 망치",
      "chapter": 2,
      "location": "멈춘 연회장",
      "art": 1,
      "mood": "mystery",
      "text": [
        "멈춘 샴페인 기포 사이에 빈 유리 함이 놓여 있다. 새벽 원석이 있던 자리다. 점검표에는 청소 직원 소라의 사진이, 함 안쪽에는 장갑 자국이 남았다. 무대에서는 피아노 연주자 리가 뻣뻣해진 손가락을 주무른다.",
        "손님이 아닌 직원이라 움직일 수 있는 리가 소라의 사진을 보고 고개를 끄덕인다. “급여 기록을 찾는다고 했어요.” 리가 악보 보관문을 조금 연다. 문 뒤에는 시간 금고의 기록실이 있다. 원석을 가져간 까닭도 그 장부에 있을지 모른다."
      ],
      "entities": [
        {
          "id": "pianist",
          "label": "피아노 연주자 리",
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
          "label": "리에게 소라가 남긴 말을 묻는다",
          "intent": "talk",
          "target": "pianist",
          "stat": "heart",
          "dc": 11,
          "risk": "그가 목소리를 높이면 경비가 연회장으로 온다.",
          "outcomes": {
            "critical": {
              "text": "리에게 잠깐 연주를 쉬어도 된다고 말하고 대답을 기다린다. 그는 소라의 말과 거래 번호를 적고, 동료들도 시간 반환 서명을 보탠다. 접은 서류를 들고 그가 열어 준 기록실 문으로 들어간다.",
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
              "text": "소라의 마지막 말을 묻자 리가 건반에서 손을 뗀다. “내일이 있어야 퇴근하는 줄 알았대요.” 그는 경매 기록을 내밀고 장부를 보라며 악보 문을 열어, 그 뒤 기록실로 들어가게 한다.",
              "next": "archive",
              "clues": [
                "receipt"
              ],
              "set": [
                "staff_trust"
              ]
            },
            "failure": {
              "text": "소라를 묻는 말에 리의 답이 점점 커진다. 끝나지 않는 근무 이야기를 경비도 듣고 다가온다. 리가 뒤늦게 목소리를 낮추며 기록실 문을 열어, 질문을 마저 할 곳으로 피신시킨다.",
              "next": "archive",
              "pressure": 1
            },
            "fumble": {
              "text": "질문이 추궁처럼 들렸는지 리가 건반을 내리친다. 경비가 공범을 찾았다며 일행을 지목하자 리도 굳는다. 그는 기록실 문을 열어 주지만, 닫힌 문밖으로 호텔의 추적 경보가 번진다.",
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
              "text": "샴페인에 조명을 돌려 경비의 눈을 반대편에 묶는다. 빈 함 아래서 영수증과 직원 출입번호를 찾아 접자 순찰의 발소리가 멀어진다. 남은 틈으로 기록실에 들어서 문을 조용히 닫는다.",
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
              "text": "잔을 한 뼘 옮기자 공중의 샴페인이 경비의 시야를 일그러뜨린다. 그 틈에 함 아래의 낙찰 기록과 기록실 열쇠를 꺼낸다. 경비가 눈을 비비는 동안 악보 보관문 뒤로 빠져나간다.",
              "next": "archive",
              "clues": [
                "receipt"
              ],
              "set": [
                "security_cut"
              ]
            },
            "failure": {
              "text": "빛을 돌리려고 옮긴 잔이 깨지며 팔을 벤다. 경보가 먼저 경비를 부르고, 리가 피 묻은 소매를 보고 기록실 문을 연다. 빈 함에서 답을 얻지 못한 채 그의 손짓을 따라 몸을 피한다.",
              "next": "archive",
              "pressure": 2,
              "harm": 1
            },
            "fumble": {
              "text": "잔을 비트는 순간 맞닿은 유리들이 한꺼번에 터져 몸을 덮친다. 연회장 경보 사이로 리가 일행을 기록실 쪽으로 끌어들인다. 함에 남은 기록은 놓치고, 문턱에는 깨진 유리와 핏방울이 남는다.",
              "next": "archive",
              "harm": 2,
              "pressure": 3
            }
          }
        }
      ],
      "objective": "리에게 들은 말을 묻거나 빈 함 아래의 영수증을 찾는다.",
      "details": [
        {
          "id": "auction-receipt",
          "label": "낙찰 영수증을 확인한다",
          "text": "경매품은 「아침이 오기 직전」이라는 새벽 원석이다. 원석이 빠지면 연회가 멈추고 호텔 직원들이 퇴근할 시각도 오지 않는다.",
          "clue": "receipt"
        }
      ],
      "summary": "원석이 있던 함은 비어 있고 연주자 리는 소라를 봤다고 한다.",
      "stakes": "멈춘 유리잔도 깨진다. 무리하게 옮기면 다치고 경비가 온다."
    },
    "security": {
      "id": "security",
      "title": "범인은 청소 카트를 밀었다",
      "chapter": 2,
      "location": "보안실",
      "art": 1,
      "mood": "tension",
      "text": [
        "보안 영상 속 청소 직원 소라가 마스터키로 유리 함을 연다. 야간 경비원은 소라를 막기는커녕 자기 출입 카드를 건넨다. 그 경비원이 지금 화면 옆에 앉아 있다. 경비원은 모자를 벗어 무릎에 놓고 자기 모습이 나오는 영상을 바라본다.",
        "기록에는 세탁실, 시간 금고 기록실, 지붕 계단이 차례로 찍혀 있다. 경비는 영상을 끄지 않는다. 카드 모서리를 만지작거리는 손 위로 소라에게 문을 열어 주던 자신의 모습이 겹친다."
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
              "text": "왜 문을 열었는지 묻고 그의 근무 이야기를 끝까지 듣는다. 경비가 동료들의 반환 요청서와 출입번호를 내밀며 순찰도 막아 주겠다고 한다. 서류의 이름들을 확인하러 기록실로 향한다.",
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
              "text": "카드를 내준 이유를 묻자 경비가 누적 근무 시간을 보인다. “체포하면 저도 영원히 여기 있어야 하잖아요.” 경비가 적어 준 출입번호를 받아, 가리키는 복도를 지나 금고 기록실에 들어간다.",
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
              "text": "이유를 묻는 동안 경비의 손이 경보 버튼으로 간다. 울리는 소리를 듣던 경비가 다시 자기 카드를 대어 기록실 문을 연다. “장부는 보고 가세요.” 그 낮은 말을 듣고 경보가 울리는 복도를 지나 기록실로 들어간다.",
              "next": "archive",
              "pressure": 2
            },
            "fumble": {
              "text": "추궁받는다고 여긴 경비가 호텔 소유주에게 일행의 인상착의를 보낸다. 그래도 소라에게 카드를 내준 영상까지 지우지는 않는다. “감시는 붙을 겁니다.” 경비가 연 기록실 문으로 들어가 장부를 찾는다.",
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
              "text": "실제 점검 일정에 맞춰 순찰을 다른 층에 배정한다. 허위 경보 없이 호출기가 조용해진 사이 기록실과 천창 출입번호를 베낀다. 비어 있는 직원 통로를 지나 기록실 문을 연다.",
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
              "text": "배정표를 바꾸자 경비 호출기에 연회장 점검이 뜬다. 발소리가 멀어진 동안 기록실과 천창의 출입번호를 복사한다. 화면을 원래대로 덮고, 받아 적은 번호로 기록실 쪽 문을 연다.",
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
              "text": "순찰을 돌리려던 입력이 일행을 청소 인력으로 등록한다. 오류 알림과 함께 기록실 청소 지시가 도착한다. 지급함에서 나온 열쇠를 들고, 숨긴 신분 대신 뜻밖의 업무로 기록실에 들어간다.",
              "next": "archive",
              "pressure": 1
            },
            "fumble": {
              "text": "배정란을 잘못 고르자 모든 호출기에 지금 위치가 뜬다. 우회시켰던 순찰도 되돌아오고 영상 담당 직원이 급히 비상문을 연다. 복사할 틈을 잃은 채 대피 통로로 기록실에 들어선다.",
              "next": "archive",
              "pressure": 3,
              "unset": [
                "security_cut"
              ]
            }
          }
        }
      ],
      "objective": "경비가 도운 까닭을 묻거나 소라가 지나간 문의 번호를 베낀다.",
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
      "summary": "영상에는 청소 직원 소라가 원석을 가져가고 경비가 문을 열어 준 장면이 나온다.",
      "stakes": "경비를 설득하지 못하면 감시가 늘고 이후 조사가 급해진다."
    },
    "laundry": {
      "id": "laundry",
      "title": "젖은 수건에 남은 해",
      "chapter": 2,
      "location": "호텔 세탁실",
      "art": 1,
      "mood": "calm",
      "text": [
        "세탁 담당 직원 조가 기계를 멈추고 마른 의자를 내준다. 소라의 카트에는 희미하게 빛나는 수건과 예비 출입번호가 있다. 조가 수건을 가리킨다. “원석을 저기에 싸 갔어요. 아침을 손에 쥐면 퇴근할 줄 알았대요.”",
        "원석은 소라의 내일이 아니라 호텔 전체의 아침을 여는 열쇠였다. 잘못을 안 소라는 직원들의 시간을 돌릴 방법을 찾으러 기록실로 갔다고 조가 말한다. 카트 틈의 도면 조각에는 아직 절반의 선만 보인다."
      ],
      "entities": [
        {
          "id": "washer",
          "label": "세탁 담당 직원 조",
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
              "text": "되찾고 싶은 시간을 한 사람씩 묻자 서명란 옆에 구체적인 저녁들이 적힌다. 조가 출입번호와 빛 수건까지 손에 얹는다. 그 이름들을 장부와 맞추러 가는 길에 직원들이 문을 붙들어 준다.",
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
              "text": "범인 이야기보다 퇴근 뒤의 저녁을 묻자 직원들이 하나씩 입을 연다. 반환 요청에 이름을 적고 조가 출입번호를 보탠다. 접은 서명지를 들고 기록실로 가자 뒤에서 작은 격려가 들린다.",
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
              "text": "필요한 것을 묻는 말에 직원들은 눈을 피하고 입을 닫는다. 조만 출입번호를 쥐여 준다. “장부를 읽은 뒤에도 물어보실 건가요?” 그 질문을 안고 기록실 문을 향한다.",
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
              "text": "말이 엇갈리며 목소리가 높아지자 조가 대화를 끊고 보안원이 다가온다. 그는 출입번호만 내밀며 “피해까지 숨길 생각은 없어요”라고 한다. 협조 대신 그 한 줄을 받아 기록실로 나온다.",
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
              "text": "수건을 카트 밑에 비추자 도면 조각 뒤에 접힌 뒷장이 드러난다. 금고의 선과 천창의 방향이 이어지고 조가 빛 수건도 가져가라 한다. 완성한 도면과 출입번호를 품고 기록실의 장부를 찾으러 간다.",
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
              "text": "빛이 스민 손잡이 아래를 열자 도면 조각과 소라의 메모가 나온다. 금고의 선은 있지만 천창 쪽 절반이 없다. 출입번호를 받아 적고, 빠진 장을 찾으러 기록실로 향한다.",
              "next": "archive",
              "clues": [
                "badge"
              ],
              "gainItems": [
                "staff-code"
              ]
            },
            "failure": {
              "text": "카트 틈의 빛을 따라 손을 넣어도 도면은 잡히지 않는다. 조가 바닥의 반출증을 돌려 보이자 기록실 주소가 나온다. 놓친 조각 대신 원본을 찾으러 세탁실을 나와 그 문을 찾아간다.",
              "next": "archive",
              "pressure": 1
            },
            "fumble": {
              "text": "빛이 든 잠금칸을 당기자 경보가 울리고 도면 조각이 세탁수에 젖는다. 손에 남은 선은 번져 읽을 수 없다. 젖지 않은 반출증의 기록실 주소를 확인하고, 원본을 찾으러 문을 나선다.",
              "next": "archive",
              "pressure": 3
            }
          }
        }
      ],
      "objective": "직원들의 사연을 듣거나 카트에서 빠진 도면을 찾는다.",
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
      "summary": "소라가 원석을 옮길 때 쓴 카트에 빛 수건과 도면 조각이 남았다.",
      "stakes": "잠금칸을 잘못 열면 경보가 울린다. 빛 수건은 조에게 빌릴 수도 있다."
    },
    "archive": {
      "id": "archive",
      "title": "누군가의 한 시간은 누구의 것인가",
      "chapter": 2,
      "location": "시간 금고 기록실",
      "art": 1,
      "mood": "mystery",
      "text": [
        "직원 이름이 붙은 서랍을 열면 시간 장부가 나온다. 손님의 행복한 한 시간 옆에 누군가의 야근 열 시간이 비용으로 적혀 있다. 맡긴 사람의 서명도, 돌려줬다는 도장도 없다.",
        "책상에는 금고와 천창을 잇는 도면이 찢겨 있다. 원석을 놓으면 아침은 오지만, 각자의 시간을 돌리려면 잠금축 순서와 반사판 방향이 필요하다. 사본을 뜰 종이 옆으로 작은 작업실이 보인다. 이 장치를 설계한 시계공 해린이 안에서 망치를 두드린다."
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
              "text": "찢긴 선을 이름표 번호에 맞추자 금고에서 천창까지 길이 이어진다. 여백의 직원 번호로 순찰 문도 피할 수 있다. 장부 사본과 두 메모를 챙겨, 발소리가 없는 지붕 계단으로 간다.",
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
              "text": "찢긴 가장자리를 맞추니 금고의 잠금축 뒤에 천창 반사판이 이어진다. 이름표별로 시간을 돌려보낼 순서가 또렷해진다. 완성 도면과 장부 사본을 챙겨 서비스 계단으로 나선다.",
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
              "text": "도면의 두 전선이 같은 번호에서 엇갈려 더는 맞출 수 없다. 장부 사본을 챙기는 동안 옆 작업실에서 망치가 울린다. 그 선을 처음 그린 해린에게 직접 묻기로 한다.",
              "next": "workshop",
              "clues": [
                "ledger"
              ],
              "pressure": 1
            },
            "fumble": {
              "text": "거꾸로 맞춘 도면의 번호를 조회하자 경고 회로가 켜진다. 잘못된 순서를 들고 금고로 갈 수는 없다. 장부 사본을 품고 다가오는 경비를 피해, 원설계자 해린의 작업실로 들어간다.",
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
              "text": "장부 사본을 챙겨 옆방의 망치 소리를 따라간다. 작업대 위에 직원 이름이 적힌 장을 펼쳐 놓자 소리가 멎는다. 그 이름들의 시간을 어디로 돌릴 수 있는지, 설계자의 답을 기다린다.",
              "next": "workshop",
              "clues": [
                "ledger"
              ]
            }
          }
        }
      ],
      "objective": "도면을 맞추거나 옆방의 시계공에게 작동 순서를 묻는다.",
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
      "summary": "손님이 산 시간의 비용으로 직원들의 야근이 쓰였다. 반환 도면은 찢겨 있다.",
      "stakes": "아침만 다시 여는 것과 각자의 시간을 돌려주는 것은 다르다. 정확한 반환에는 검증한 도면이 필요하다."
    },
    "workshop": {
      "id": "workshop",
      "title": "시계공은 이미 알고 있었다",
      "chapter": 3,
      "location": "지붕 아래 시계공 작업실",
      "art": 2,
      "mood": "tension",
      "text": [
        "시계공 해린이 작은 시계에 점심시간을 맞춘다. 장부를 작업대에 놓자 그 손이 멈춘다. “반환 장치가 안 돼서 뺀 게 아닙니다. 너무 잘돼서 뺐죠.” 공구 사이에 금고의 원본 도면이 놓여 있다.",
        "직원들의 시간을 계속 쓰려던 호텔의 요구였다고 해린은 말한다. 소라는 이미 원석을 들고 지붕 계단으로 갔다. 시험 장치의 빈 병이 희미하게 운다. 해린에게 책임질 일을 맡기거나, 그 공구로 직접 반환 순서를 확인할 수 있다."
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
          "label": "해린에게 빠뜨린 반환 장치를 직접 고쳐 달라고 한다",
          "intent": "talk",
          "target": "maker",
          "stat": "heart",
          "dc": 12,
          "risk": "설득이 실패하면 해린이 호텔 소유주에게 구조를 요청한다.",
          "outcomes": {
            "critical": {
              "text": "장부의 이름들을 가리키며 빠진 장치를 직접 설명해 달라고 한다. 해린은 책임자란에 서명한 도면과 공개 해설을 내놓고 보안에도 손대지 말라 알린다. 문이 열려 있는 동안 그것들을 들고 지붕 계단으로 간다.",
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
              "text": "빠진 장치를 책임져 달라고 하자 해린이 도면에 이름을 다시 쓴다. 이번에는 책임자 칸이다. 검증한 도면과 조정키를 받아, 그가 알려 준 지붕 서비스 계단으로 올라간다.",
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
              "text": "해린은 대답 대신 소유주를 호출한다. 돌아서려는 순간 그가 장부의 이름들을 다시 보고, 원본 도면을 문틈으로 밀어 준다. 도움을 약속받지는 못했지만 돌아갈 순서는 들고 계단으로 나선다.",
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
              "text": "말이 오갈수록 해린의 손이 떨리더니 소유주에게 긴급 호출을 보낸다. 몰려오는 경비 소리에 문은 닫혔지만 검증한 사본 한 장이 밑으로 나온다. “소라가 계단에 있어요.” 도면을 주워 급히 움직인다.",
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
              "text": "조정키를 돌려 이름표 달린 십 분만 되돌리자 시험관이 맑게 울린다. 작업자의 숨이 고르고 실험에 연결된 몸에도 힘이 돌아온다. 해린이 확인한 도면을 받아 원석이 있는 계단으로 향한다.",
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
              "text": "조정키를 정해진 순서대로 돌리자 병 속의 십 분이 작업자 이름표로 스며든다. 해린이 그 순서를 도면에 표시한다. 시험을 마친 공구와 검증한 도면을 들고 소라가 있는 계단으로 간다.",
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
              "text": "조정키를 돌린 순간 거꾸로 흐르는 시간이 가슴을 조인다. 해린이 연결을 끊고 도면에 올바른 순서를 적는다. 그의 부축으로 작업실을 나와, 다친 몸과 검증한 종이를 함께 계단참으로 옮긴다.",
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
              "text": "시험 시간을 두 번 되돌리는 연결에 심장이 붙잡힌다. 해린이 전원을 끊어도 숨은 돌아오지 않는다. 그는 올바른 도면을 문턱에 놓는다. 살아남은 동료가 있다면 되돌림을 시도할 계단까지 가져갈 수 있다.",
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
      "objective": "해린이 직접 고치게 설득하거나 작은 장치로 순서를 시험한다.",
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
      "summary": "해린은 시간을 돌리는 장치를 만들었지만 호텔은 그 부분을 빼 버렸다.",
      "stakes": "시험 장치는 몸과 연결된다. 시간을 거꾸로 흘리면 죽을 수 있다."
    },
    "stair": {
      "id": "stair",
      "title": "서비스 계단의 작은 해",
      "chapter": 3,
      "location": "지붕 서비스 계단",
      "art": 2,
      "mood": "tension",
      "text": [
        "계단참의 수건 속에서 작은 해가 빛난다. 청소 직원 소라가 원석 곁에 쪼그려 앉아 동생의 연락처를 쥐고 있다. “이걸 가져가면 내일이 올 줄 알았어요. 다 같이 갇힐 줄은 몰랐어요.”",
        "원석에는 「깨뜨리면 저장된 시간을 주인에게 돌려줄 수 없습니다」라는 경고가 새겨져 있다. 소라는 글씨를 몇 번이나 읽었는지 손끝으로 같은 자리를 문지른다. 아래층에서 경비의 구두 소리가 올라온다. 금고로 가는 회랑 문은 소라의 등 뒤에 있다."
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
        },
        {
          "id": "firedoor",
          "label": "계단의 무거운 방화문",
          "kind": "object",
          "aliases": [
            "방화문",
            "계단 문"
          ]
        }
      ],
      "choices": [
        {
          "id": "honest-plan",
          "label": "장부를 펼쳐 보이며 소라에게 함께 시간을 돌려주자고 한다",
          "intent": "talk",
          "target": "sora",
          "stat": "heart",
          "dc": 11,
          "risk": "너무 늦으면 보안원이 원석을 압수하려 든다.",
          "outcomes": {
            "critical": {
              "text": "장부를 펼쳐 소라의 피해와 돌아갈 방법부터 짚는다. 소라는 서명지와 빛 수건을 맡기고 경비에게 자발적으로 동행한다고 말한다. 원석의 경고를 함께 읽은 뒤, 느려진 발소리를 뒤로하며 회랑에 들어간다.",
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
              "text": "장부를 사이에 놓고 함께 가자고 하자 소라가 원석을 내민다. “이번엔 저 혼자 고른 일이 아니네요.” 그녀가 건넨 반환 서명과 원석의 경고를 챙겨, 나란히 금고 앞 회랑으로 향한다.",
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
              "text": "장부를 보여도 소라는 원석을 더 꼭 쥐고 금고 쪽으로 달린다. 경고문에 새겨진 반환 조건만 가까스로 읽는 사이 경비도 뒤따른다. 말을 마치려면 그녀가 간 거울 회랑까지 따라가야 한다.",
              "next": "mirrorhall",
              "clues": [
                "dawn"
              ],
              "pressure": 2
            },
            "fumble": {
              "text": "장부를 펴려고 뻗은 손을 소라가 원석을 빼앗는 손으로 오해한다. 그녀가 경비를 피해 달아난 뒤 떨어진 경고문에는 파손하면 정확히 돌려줄 수 없다고 쓰여 있다. 그 글을 접어 들고 거울 회랑으로 따라간다.",
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
              "text": "표지판을 세우고 안전 절차를 읽어 주자 경비가 무전으로 통행 허가를 묻는다. 소라는 빛 수건을 건네고 원석의 경고를 짚어 준다. 받은 수건을 챙겨, 아직 허가를 기다리는 경비를 두고 거울 회랑에 들어간다.",
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
              "text": "수건과 젖은 바닥 표지판 앞에서 경비의 구두가 멎는다. 소라가 소리 없이 웃으며 원석의 경고를 가리킨다. 글씨를 확인하고 그녀와 금고 앞 회랑으로 향하자 뒤에서 우회 지시가 들린다.",
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
              "text": "경비가 표지판을 넘어오자 소라가 원석의 경고를 짚으며 회랑 문을 연다. 따라 들어선 곳에는 거울이 길게 늘어서 있다. 아직 금고까지 가지 못했고, 뒤에서는 표지판 쓰러지는 소리가 난다.",
              "next": "mirrorhall",
              "clues": [
                "dawn"
              ],
              "pressure": 2
            },
            "fumble": {
              "text": "수건을 당겨 세우던 표지판과 함께 계단에서 미끄러진다. 통증 사이로 경비의 손전등이 비치자 소라가 회랑 문을 연다. 원석의 경고를 짚어 보이는 그녀를 따라, 절뚝이며 거울 사이로 몸을 피한다.",
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
              "text": "메모의 번호를 누르자 방화문이 경비 앞에서 닫힌다. 소라가 원석의 경고를 함께 읽고는 “저도 같이 가요”라며 회랑 문을 연다. 뒤의 발소리가 막힌 동안 빛을 들고 나란히 걸어간다.",
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
        },
        {
          "id": "solo-walk-home",
          "label": "소라의 연락처 쪽지를 펴 주며 집에 갈 때까지 함께 걷자고 한다",
          "intent": "talk",
          "target": "sora",
          "stat": "heart",
          "dc": 12,
          "requires": {
            "partyMax": 1
          },
          "risk": "소라가 믿지 못하면 원석을 든 채 먼저 달아난다. 대화가 길어질수록 경비가 가까워진다.",
          "outcomes": {
            "critical": {
              "text": "구겨진 연락처를 펴며 집에 갈 때까지 함께하겠다고 말한다. 소라는 원석의 경고와 직원 서명을 보여 주고 빛 수건도 맡긴다. 경비에게 자발적으로 함께 간다고 알린 뒤 나란히 거울 회랑으로 들어간다.",
              "next": "mirrorhall",
              "set": [
                "solo_sora_walk",
                "sora_trust",
                "staff_consent"
              ],
              "clues": [
                "dawn",
                "consent"
              ],
              "gainItems": [
                "light-towel"
              ],
              "pressure": -1
            },
            "success": {
              "text": "연락처 쪽지를 함께 펴자 소라가 숨을 고르고 고개를 끄덕인다. 원석의 경고를 읽어 주며 이번에는 같이 금고로 가자고 한다. 쪽지를 돌려주고 그녀와 거울 회랑 문턱을 넘는다.",
              "next": "mirrorhall",
              "set": [
                "solo_sora_walk",
                "sora_trust"
              ],
              "clues": [
                "dawn"
              ],
              "pressure": -1
            },
            "failure": {
              "text": "집에 가자는 말에도 소라는 연락처를 다시 움켜쥔다. 원석을 깨면 돌려줄 수 없다는 경고만 보여 주고 먼저 회랑으로 간다. 경비가 다가오는 계단을 떠나 그녀의 뒤를 따라 문을 넘는다.",
              "next": "mirrorhall",
              "clues": [
                "dawn"
              ],
              "pressure": 1
            },
            "fumble": {
              "text": "쪽지를 펴려는 손에 소라가 놀라 물러서고 경비가 사이에 끼어든다. 그녀는 원석과 경고문을 붙든 채 회랑으로 달아난다. 파손하면 정확히 돌릴 수 없다는 글을 눈에 담고, 쫓기는 길로 따라간다.",
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
          "id": "group-hold-firedoor",
          "label": "방화문을 붙들어 소라와 동료들이 회랑으로 갈 틈을 만든다",
          "intent": "help",
          "target": "firedoor",
          "stat": "might",
          "dc": 12,
          "requires": {
            "partyMin": 2,
            "aliveMin": 2
          },
          "risk": "무거운 문에 끼이면 행동자가 실패 시 생명 1, 대실패 시 생명 2를 잃는다. 경비가 회랑까지 따라올 수 있다.",
          "outcomes": {
            "critical": {
              "text": "방화문을 닫아 걸고 받침까지 고정하자 경비의 발소리가 막힌다. 소라가 원석의 경고를 짚어 준 뒤 빛 수건을 내민다. 일행이 갈 틈을 지킨 손을 풀고 그녀와 회랑으로 들어간다.",
              "next": "mirrorhall",
              "set": [
                "group_held_firedoor",
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
              "text": "문을 몸으로 밀어 닫자 소라가 원석의 경고를 보여 주고 회랑 문을 연다. 경비가 손잡이를 다시 당기기 전에 이쪽 문을 받침에 건다. 마지막으로 손을 빼고 일행을 따라 거울 회랑에 들어간다.",
              "next": "mirrorhall",
              "set": [
                "group_held_firedoor",
                "security_cut"
              ],
              "clues": [
                "dawn"
              ],
              "pressure": -1
            },
            "failure": {
              "text": "닫으려던 문이 되튀어 몸을 친다. 소라가 원석을 깨면 안 된다는 경고를 외치며 회랑 쪽으로 손을 뻗는다. 그 손을 잡고 일행과 빠져나가지만 경비의 발소리도 바로 뒤에 붙는다.",
              "next": "mirrorhall",
              "clues": [
                "dawn"
              ],
              "harm": 1,
              "pressure": 2
            },
            "fumble": {
              "text": "받침이 빠진 문에 몸이 끼고 경비가 문을 밀어붙인다. 소라가 원석의 경고를 보여 주며 다친 몸을 회랑 쪽으로 끌어낸다. 일행과 그 문을 넘지만 추격을 막을 틈은 잃었다.",
              "next": "mirrorhall",
              "clues": [
                "dawn"
              ],
              "harm": 2,
              "pressure": 3,
              "unset": [
                "security_cut"
              ]
            }
          }
        }
      ],
      "dialogue": {
        "who": "청소 직원 소라",
        "text": "도둑질을 안 했으면 내 시간은 영원히 호텔 물건이었을까요?"
      },
      "objective": "소라와 말을 맞추거나 경비를 늦추고 금고 앞 회랑으로 간다.",
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
      "summary": "소라가 원석을 쥐고 있고 계단 아래로 경비가 올라온다.",
      "stakes": "경비가 가까워지면 쫓기게 된다. 원석을 깨면 시간을 주인별로 돌리지 못한다.",
      "partyText": {
        "solo": [
          "계단참에서 청소 직원 소라가 수건 속 원석을 감싼다. 혼자 다가오는 발소리에 소라가 구겨진 연락처 쪽지를 더 꼭 쥔다. “동생에게 오늘은 간다고 했어요.” 원석을 가져오면 아침도 따라올 줄 알았다는 말이 뒤늦게 나온다.",
          "원석에는 깨면 시간을 주인별로 돌리지 못한다는 경고가 있다. 소라는 그 줄을 읽고 여기서 멈췄다. 아래층 경비 소리가 가까워지고 등 뒤로 거울 회랑이 열린다. 집에 가자는 약속을 건넬지, 먼저 길을 만들지 정해야 한다."
        ],
        "group": [
          "계단참에 내려놓인 새벽 원석이 낮게 빛난다. 청소 직원 소라가 일행 쪽을 보고 동생의 연락처를 접는다. “아침을 가져가면 나갈 수 있을 줄 알았어요.” 경비들의 구두 소리가 아래층 방화문에 부딪힌다.",
          "소라 뒤로는 금고에 이르는 거울 회랑이 있다. 원석에 새겨진 경고대로 깨뜨리면 각자의 시간은 돌려주지 못한다. 방화문의 무거운 손잡이가 흔들린다. 이쪽 문을 잠깐 막을 수 있다면 회랑으로 빠져나갈 시간을 벌 수 있다."
        ]
      }
    },
    "mirrorhall": {
      "id": "mirrorhall",
      "title": "거울 속의 나는 퇴근하지 않았다",
      "chapter": 3,
      "location": "금고 앞 거울 회랑",
      "art": 2,
      "mood": "danger",
      "text": [
        "금고 앞 회랑의 거울마다 누군가의 좋은 날이 흐른다. 호텔 손님들이 맡겨 둔 첫 춤과 웃음이다. 소라는 복도 끝에서 손짓하지만 거울 속 사람들은 헤어지지 않고 같은 순간을 되풀이한다.",
        "바닥의 붉은 선에는 「머물면 문이 닫힙니다」라고 쓰여 있다. 금고의 무거운 잠금 날이 조금씩 낮아진다. 커튼 줄은 손 닿는 곳에 있다. 거울을 가리거나 새벽빛으로 영상을 지울 수 있고, 장면을 보지 않고 그대로 걸어갈 수도 있다."
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
              "text": "커튼 끝을 잡아 레일을 따라 내리니 거울과 잠금 날의 감지기가 함께 가려진다. 마지막 발이 넘어간 뒤 뒤쪽 문도 닫힌다. 소라가 경비의 발소리가 끊긴 것을 듣고 금고 안에서 숨을 고른다.",
              "next": "vault",
              "set": [
                "security_cut"
              ],
              "pressure": -1
            },
            "success": {
              "text": "커튼을 내려 통로의 거울을 차례로 가린다. 천 뒤의 웃음이 희미해지고, 발밑 붉은 선만 길을 보여 준다. 잠금 날이 닿기 전에 금고 문턱을 넘자 소라가 길을 비켜 준다.",
              "next": "vault"
            },
            "failure": {
              "text": "커튼을 당기는 손 위로 무거운 잠금 날이 내려온다. 숨이 끊긴 몸 곁에서 소라가 카트를 밀어 문틈을 버틴다. 금고 안으로 길은 남았지만 그 너머로 옮길 살아 있는 동료가 있어야 한다.",
              "next": "vault",
              "pressure": 2,
              "harm": 3
            },
            "fumble": {
              "text": "잠금 날에 걸린 커튼이 몸을 문 쪽으로 끌어당긴다. 마지막 숨과 함께 날이 바닥을 치고 경보가 터진다. 소라가 카트로 틈을 버티지만, 그 길을 이어갈 수 있는 것은 살아남은 동료뿐이다.",
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
          "label": "거울 속 장면에 멈추지 않고 금고까지 걸어간다",
          "intent": "perform",
          "target": "mirrors",
          "stat": "heart",
          "dc": 12,
          "risk": "마음이 붙잡히면 경비가 따라온다. 대실패하면 거울의 빛에 붙들려 생명 1을 잃는다.",
          "outcomes": {
            "critical": {
              "text": "저 웃음은 저 사람들의 것이라고 말하며 소라와 걸음을 이어간다. 금고에 들어서자 뒤쪽 문이 닫혀 추격도 끊긴다. 소라는 이제 함께 판단할 사람이 있다며 옆자리를 내준다.",
              "next": "vault",
              "set": [
                "sora_trust",
                "security_cut"
              ],
              "pressure": -1
            },
            "success": {
              "text": "거울의 웃음에 시선을 주되 발걸음은 금고 쪽으로 둔다. 호텔 손님들의 행복한 순간은 등 뒤에서도 이어진다. 잠금 날이 내려오기 전에 문턱을 넘자 소라가 기다리던 손을 내린다.",
              "next": "vault"
            },
            "failure": {
              "text": "지나치려던 발이 한 거울 앞에서 오래 머문다. 소라가 “여기 남으면 우리 시간도 저기에 쓰여요”라며 손을 내민다. 그녀를 따라 금고에 닿을 때에는 경비의 구두 소리도 회랑에 들어와 있다.",
              "next": "vault",
              "pressure": 1
            },
            "fumble": {
              "text": "거울 곁을 지나려는데 발목에 빛이 감겨 조인다. 경비가 복도에 들어서는 소리 위로 소라가 이름을 크게 부른다. 그 손을 잡고 빛을 떼어 낸 뒤에야 아픈 발을 끌며 금고 문턱을 넘는다.",
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
              "text": "수건을 펼치자 새벽빛이 거울 속 웃음을 하얗게 덮는다. 기억을 읽지 못한 잠금 날도 멎어 다치지 않고 금고로 건너간다. 다시 접은 수건에는 빛 대신 평범한 천의 무게만 남아 있다.",
              "next": "vault",
              "pressure": -1
            }
          },
          "consumeItems": [
            "light-towel"
          ]
        }
      ],
      "objective": "커튼을 내리거나 장면들을 지나쳐 금고 문턱을 넘는다.",
      "summary": "손님들의 행복한 순간이 거울에 흐르고 금고의 잠금 날이 내려온다.",
      "stakes": "커튼이 잠금 날에 걸리면 목숨을 잃는다. 빛 수건을 펼치면 안전하게 지날 수 있다.",
      "callbacks": [
        {
          "when": {
            "flag": "solo_sora_walk"
          },
          "text": "소라가 연락처 쪽지를 반듯하게 접어 주머니에 넣는다. 집에 갈 때까지 함께 걷자는 말 뒤로, 쪽지를 구기던 손에 힘이 조금 빠졌다."
        },
        {
          "when": {
            "flag": "group_held_firedoor"
          },
          "text": "뒤쪽 방화문 손잡이를 당기는 소리가 멀다. 누군가 버텨 준 틈 덕분에, 회랑 앞에서는 경비보다 잠금 날을 먼저 볼 수 있다."
        }
      ]
    },
    "vault": {
      "id": "vault",
      "title": "가장 비싼 것은 평범한 오후",
      "chapter": 3,
      "location": "새벽 원석 금고",
      "art": 2,
      "mood": "danger",
      "text": [
        "금고에는 이름표 달린 평범한 오후들이 잠겨 있다. 빨래 널 시간, 버스를 놓쳐도 괜찮을 십 분. 시간을 주인에게 보낼 잠금축은 닫혀 있고, 소라가 바깥 비상 전원을 붙들어 돌아갈 길을 지킨다.",
        "전화기 너머로 호텔 소유주가 원석을 돌려주면 보상하겠다고 한다. 손 앞에는 잠금축과 장부 송출 단말이 있다. 어느 쪽을 택해도 마지막 방향은 천창에서 정한다. 붉은 안전 고리를 한꺼번에 풀면 정렬을 앞당길 수 있지만, 실패하면 안에 있는 모두의 시간이 빨려 든다."
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
              "text": "이름표 순서대로 축을 풀자 돌아갈 방향이 하나씩 켜진다. 도면의 마지막 선까지 맞춘 뒤 수동 잠금으로 바꾸니 보안 호출이 닿지 않는다. 소라를 불러 원석과 완성 도면을 천창으로 가져간다.",
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
              "text": "설계 순서를 따라 축을 풀자 저장된 시간들이 자기 이름표 쪽으로 기운다. 마지막 방향은 아직 천창에 남아 있다. 확인한 연결을 도면에 옮겨 들고 소라와 지붕 계단을 오른다.",
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
              "text": "잠금축이 갑자기 풀리며 역류한 시간이 모두의 가슴을 누른다. 소라가 바깥 전원을 끊자 열린 천창 계단이 보인다. 원석은 무사해, 숨을 고른 뒤 그녀와 계단을 올라 옥상으로 나온다.",
              "next": "roof",
              "pressure": 2,
              "harmAll": 1
            },
            "fumble": {
              "text": "입금축을 잘못 풀자 심장 박동이 금고 쪽으로 빨려 들어 모두가 크게 다친다. 소라가 전원을 끊고 천창 계단을 연다. 상처를 감싸고 원석과 장부를 챙겨, 그녀를 따라 옥상으로 물러난다.",
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
              "text": "이름과 이체 내역을 함께 송출하자 화면 앞 직원들이 자기 몫을 짚는다. 반환 서명이 모이고 카트들이 보안문을 막는다. 증인들이 지켜보는 가운데 소라와 원석을 들고 천창 계단을 오른다.",
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
              "text": "장부를 화면에 띄우자 정지한 손님들 앞에서 페이지만 움직인다. 직원들이 자기 이름을 찾아 반환에 서명한다. 지붕 문을 열어 준 그들에게 장부를 보인 뒤, 소라와 천창으로 향한다.",
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
              "text": "송출 버튼을 누르자 소유주가 접속을 끊는다. 검게 변한 화면 아래에서 인쇄 사본 한 장이 마저 밀려 나온다. 공개하지 못한 증거를 접어 품고, 소라와 마지막 방향을 정할 지붕으로 간다.",
              "next": "roof",
              "pressure": 2
            },
            "fumble": {
              "text": "첫 장이 뜨기 전에 송출이 끊기고 보안 호출에 지금 위치가 퍼진다. 직원 하나가 인쇄 사본을 빼내 건네며 지붕 문을 연다. 화면에는 아무것도 남기지 못한 채, 소라와 그 종이를 들고 올라간다.",
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
              "text": "같은 박자에 고리를 풀자 이름표와 시간이 정확히 맞물린다. 완성 도면이 출력되고 직원들의 요청과 장부가 공개 화면에 뜬다. 자기 이름을 찾느라 경비도 멈춘 사이 원석과 도면을 들고 천창으로 간다.",
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
              "text": "고리들이 같은 순간에 풀리며 시간들이 주인별로 정렬된다. 반환 요청과 장부가 연회장 화면에 쏟아지자 순찰의 발길도 그쪽으로 몰린다. 열린 천창 회로를 따라 소라와 지붕으로 올라간다.",
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
              "text": "늦게 빠진 고리 하나로 일행의 생명 시간이 새어 모두가 깊이 다친다. 소라가 바깥 전원을 끊어 원석을 지킨다. 정렬하지 못한 금고를 뒤에 남기고, 그녀의 도움을 받아 천창 계단을 올라 옥상으로 피한다.",
              "next": "roof",
              "harmAll": 2,
              "pressure": 2
            },
            "fumble": {
              "text": "서로 어긋나게 풀린 고리들이 일행의 남은 생명을 금고의 동력으로 당긴다. 소라의 손이 차단기에 닿기 전에 모든 이름표가 밝아진다. 고리를 다시 잠글 살아 있는 동료는 안에 남아 있지 않다.",
              "next": "roof",
              "harmAll": 3,
              "pressure": 3
            }
          }
        }
      ],
      "objective": "잠금축을 풀거나 장부를 화면에 띄운 뒤 천창으로 간다.",
      "callbacks": [
        {
          "when": {
            "flag": "staff_trust"
          },
          "text": "직원들이 보안문 앞에서 청소 카트를 일제히 세운다. 당신들이 보여 준 태도가 몇 분의 시간을 벌어 준다."
        }
      ],
      "summary": "빼앗긴 시간에 직원 이름표가 붙어 있다. 돌아가는 잠금축은 닫혔다.",
      "stakes": "시간이 역류하면 모두가 다친다. 안전 고리를 강제로 풀다 대실패하면 전멸한다."
    },
    "roof": {
      "id": "roof",
      "title": "새벽의 주인을 정하는 곳",
      "chapter": 4,
      "location": "유리 호텔 옥상",
      "art": 3,
      "mood": "tension",
      "text": [
        "옥상 바람에 장부의 귀퉁이가 들린다. 소라가 원석을 들고 천창 앞에 선다. 반사판 너머로 비에 젖은 도시가 보인다. 호텔 차양의 빗방울만 허공에 멎어 있다. 호텔의 아침을 되돌릴 원석과 빈 받침대가 바로 앞에 있다.",
        "검증한 도면이 있다면 시간을 각자의 이름으로 돌릴 수 있다. 아침만 먼저 열고 금고를 직원들에게 맡길 수도 있다. 원석을 깨면 거래는 끝나지만 정확한 반환도 사라진다. 소라가 묻는다. “어느 쪽으로 빛을 보낼까요?” 계단 밑에서는 직원 교대종이 또 울린다. 소라가 소리 쪽을 돌아본다. “아침이 와도 쉴 자리가 없는 사람도 있어요.”"
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
          "label": "완성한 도면을 따라 빼앗긴 시간을 직원들에게 돌려준다",
          "intent": "choose",
          "target": "mirror",
          "automatic": true,
          "outcomes": {
            "success": {
              "text": "직원들의 동의를 확인하고 완성한 도면대로 천창을 돌린다. 이름표마다 오후와 저녁이 돌아오자 소라가 동생의 번호를 누른다. 연결음이 울리는 동안 차양에 멎었던 빗방울도 땅을 향해 떨어진다.",
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
          "label": "아침부터 다시 열고 원석과 장부는 직원들에게 맡긴다",
          "intent": "choose",
          "target": "stone",
          "automatic": true,
          "outcomes": {
            "success": {
              "text": "원석을 받침대에 놓자 차양에 멎었던 비가 한꺼번에 떨어진다. 장부와 관리키는 호텔 소유주 대신 직원 대표에게 건넨다. 돌아온 아침 속에서 대표가 열쇠를 쥐고, 아직 시간을 돌려주지 못한 이름들을 다시 읽는다.",
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
              "text": "계약서 위에 원석을 놓고 힘을 준다. 유리 가는 소리와 함께 금이 번지더니 값이 붙었던 시간들이 이름표에서 풀려난다. 소라가 눈을 가리고, 천창 밖에서는 멎었던 비가 쏟아지기 시작한다.",
              "next": "ending-break"
            }
          }
        },
        {
          "id": "check-last-shift",
          "label": "아침을 열기 전에 아래층 직원들의 마지막 교대를 확인한다",
          "intent": "choose",
          "automatic": true,
          "outcomes": {
            "success": {
              "text": "소라에게 교대종이 왜 울리는지 묻는다. 그녀는 원석을 작업복 안쪽에 감싸 들고 함께 내려가겠다고 한다. 천창 옆 서비스 계단을 한 층 내려가자 직원 사물함 앞에서 교대종이 혼자 울리고 있다.",
              "next": "service-lockers"
            }
          }
        }
      ],
      "objective": "시간을 돌려주거나 직원들에게 맡기거나, 원석을 깨 거래를 끝낸다.",
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
      "summary": "소라의 원석과 천창으로 아침을 다시 열 수 있다.",
      "stakes": "원석을 깨면 정확한 반환을 포기한다. 시간마다 주인을 찾아 주려면 완성한 도면이 있어야 한다."
    },
    "ending-return": {
      "id": "ending-return",
      "title": "오늘은 제가 먼저 퇴근합니다",
      "chapter": 4,
      "art": 3,
      "mood": "hope",
      "ending": true,
      "text": [
        "천창의 빛이 이름표를 훑자 금고에서 작은 시간들이 풀려난다. 민에게는 집에 갈 한 시간이, 시계공 해린에게는 돌보지 못한 오후가 돌아온다. 지나간 일이 지워지지는 않는다. 이제부터 쓸 시간이 손에 남는다.",
        "연회장에서는 식은 음식 때문에 항의가 나온다. 연주자는 피아노 덮개를 닫고, 소라는 앞치마를 벗는다. 현관 밖의 비는 그녀가 준비되기를 기다려 주지 않는다. 소라는 한 번 젖은 땅을 보고, 그대로 퇴근한다."
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
        },
        {
          "when": {
            "flag": "solo_min_promise"
          },
          "text": "민은 직원 문을 마지막으로 닦으며 돌아나갈 때 함께 가자던 말을 되짚는다. 내내 안쪽으로 돌리던 카트 손잡이를 이번에는 바깥으로 놓는다."
        },
        {
          "when": {
            "flag": "group_drew_guards"
          },
          "text": "민이 기억하는 첫 손님은 명단의 귀빈이 아니다. 경비 앞에 먼저 서서 다른 사람들이 들어갈 틈을 남겨 준 얼굴이다."
        },
        {
          "when": {
            "flag": "solo_sora_walk"
          },
          "text": "소라의 연락처 쪽지에는 펴서 눌러 준 손자국이 남았다. 동생의 번호 옆에 집에 갈 때까지 함께 걷자는 말을 작게 적는다."
        },
        {
          "when": {
            "flag": "group_held_firedoor"
          },
          "text": "계단 방화문에 받침이 긁은 자국이 남는다. 소라는 그 앞을 지날 때 누군가 문을 붙들고 벌어 준 짧은 시간을 떠올린다."
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
        "원석이 받침대에 닿자 시계들이 여섯 시를 친다. 손님들은 잃어버린 밤도 모르고 체크아웃을 서두른다. 직원들은 예전 자리로 돌아가는 대신 장부 주위에 모인다. 금고의 열쇠가 대표의 손에서 소리를 낸다.",
        "그날 모든 시간이 돌아오지는 않는다. 반환 순서와 보상 옆에 빈칸이 남는다. 소라는 새 근무표에서 종료 시각부터 찾아 밑줄을 긋는다. 미뤄 둔 약속을 지켜볼 이름들이, 이번에는 장부 안과 밖에 함께 있다."
      ],
      "epilogues": [
        {
          "when": {
            "flag": "staff_trust"
          },
          "text": "민이 공동 관리자를 맡아 달라는 제안을 받는다. 민은 먼저 다음 주 휴일을 달력에 표시한다."
        },
        {
          "when": {
            "flag": "return_plan"
          },
          "text": "완성된 반환 설계도는 금고와 함께 보관된다. 시간이 걸려도 다시 검증할 수 있는 방법이 남았다."
        },
        {
          "when": {
            "flag": "solo_min_promise"
          },
          "text": "민은 직원 문을 마지막으로 닦으며 돌아나갈 때 함께 가자던 말을 되짚는다. 내내 안쪽으로 돌리던 카트 손잡이를 이번에는 바깥으로 놓는다."
        },
        {
          "when": {
            "flag": "group_drew_guards"
          },
          "text": "민이 기억하는 첫 손님은 명단의 귀빈이 아니다. 경비 앞에 먼저 서서 다른 사람들이 들어갈 틈을 남겨 준 얼굴이다."
        },
        {
          "when": {
            "flag": "solo_sora_walk"
          },
          "text": "소라의 연락처 쪽지에는 펴서 눌러 준 손자국이 남았다. 동생의 번호 옆에 집에 갈 때까지 함께 걷자는 말을 작게 적는다."
        },
        {
          "when": {
            "flag": "group_held_firedoor"
          },
          "text": "계단 방화문에 받침이 긁은 자국이 남는다. 소라는 그 앞을 지날 때 누군가 문을 붙들고 벌어 준 짧은 시간을 떠올린다."
        },
        {
          "when": {
            "flag": "rest_rooms_ready"
          },
          "text": "열어 둔 객실의 위치는 직원 대표에게 전한다. 새 운영에 합의하기 전이라도 필요한 사람이 그 방을 살펴볼 수 있다."
        },
        {
          "when": {
            "flag": "closure_requested"
          },
          "text": "영업 중단 요청은 미완료 안건으로 남는다. 열쇠를 반납한 사람에게는 다시 출근하라는 연락을 하지 않기로 먼저 적었다."
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
        "깨진 원석에서 빛이 새어 나와 도시의 그림자를 흔든다. 행복한 순간과 훔친 야근이 제 이름을 찾기 전에 흩어진다. 천창 아래서 시간을 사고팔던 회로가 녹고, 모래시계의 가격표들이 떨어진다.",
        "호텔이 보관했던 좋은 날은 다시 재생할 수 없다. 그날을 겪은 사람들의 기억까지 지워지지는 않는다. 직원들이 유리 조각을 모으고 영업 문패를 뒤집는다. 마지막 빗방울이 땅에 닿자, 누구의 상품도 아닌 아침이 시작된다."
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
        },
        {
          "when": {
            "flag": "solo_min_promise"
          },
          "text": "민은 직원 문을 마지막으로 닦으며 돌아나갈 때 함께 가자던 말을 되짚는다. 내내 안쪽으로 돌리던 카트 손잡이를 이번에는 바깥으로 놓는다."
        },
        {
          "when": {
            "flag": "group_drew_guards"
          },
          "text": "민이 기억하는 첫 손님은 명단의 귀빈이 아니다. 경비 앞에 먼저 서서 다른 사람들이 들어갈 틈을 남겨 준 얼굴이다."
        },
        {
          "when": {
            "flag": "solo_sora_walk"
          },
          "text": "소라의 연락처 쪽지에는 펴서 눌러 준 손자국이 남았다. 동생의 번호 옆에 집에 갈 때까지 함께 걷자는 말을 작게 적는다."
        },
        {
          "when": {
            "flag": "group_held_firedoor"
          },
          "text": "계단 방화문에 받침이 긁은 자국이 남는다. 소라는 그 앞을 지날 때 누군가 문을 붙들고 벌어 준 짧은 시간을 떠올린다."
        }
      ],
      "question": "다시 살 수 없게 된 좋은 순간을, 여러분은 어떻게 기억하고 싶나요?",
      "choices": []
    },
    "service-lockers": {
      "id": "service-lockers",
      "title": "다음 교대는 오지 않았다",
      "chapter": 4,
      "location": "옥상 바로 아래 직원 사물함",
      "art": 1,
      "mood": "mystery",
      "text": [
        "교대종 아래에 출근 카드가 겹겹이 꽂혀 있다. 짐을 나르는 직원 민이 자기 카드를 빼려다 멈춘다. 새 날짜가 덧찍혔지만 퇴근 칸은 비어 있다. “다음 사람이 오면 쉬라더니, 제 이름이 또 나와요.”",
        "소라는 원석을 품에 둔 채 공용 열쇠함을 연다. 아래 복도에는 손님이 없는 객실들이 있다. 먼저 누구의 근무가 끝나지 않았는지 알아봐도 좋고, 잠시 누울 수 있는 방부터 찾아봐도 된다."
      ],
      "summary": "교대가 계속 덧씌워져 직원들이 퇴근할 차례를 잃고 있었다.",
      "objective": "교대와 열쇠 담당을 확인하거나 빈 객실로 가서 쉴 자리를 살핀다.",
      "stakes": "틀린 교대 번호를 건드리면 보안 장치가 미반납 열쇠를 경보로 처리한다.",
      "choices": [
        {
          "id": "read-shift-cards",
          "label": "출근 카드와 열쇠 인수표를 맞춰 끝나지 않은 교대를 밝힌다",
          "intent": "investigate",
          "stat": "wit",
          "dc": 11,
          "risk": "번호를 잘못 옮기면 직원의 열쇠가 미반납으로 기록돼 보안 경계가 오른다.",
          "outcomes": {
            "critical": {
              "text": "같은 출근 카드 아래에서 지워진 퇴근 표시까지 찾아낸다. 민이 직원들을 불러 각자 맡은 열쇠를 확인하고, 잘못 울리던 교대종도 멈춘다. 빈 객실 번호에 표시를 남긴 뒤 소라와 계단 아래 복도로 내려간다.",
              "next": "spare-rooms",
              "set": [
                "shift_witnessed"
              ],
              "clues": [
                "shift-gaps",
                "spare-room-note"
              ],
              "pressure": -1
            },
            "success": {
              "text": "열쇠 인수표와 출근 시간을 나란히 읽자 끝나지 않은 교대가 드러난다. 민이 직원들을 불러 각자의 교대와 맡은 열쇠를 확인한다. 답을 받은 인수표에 표시한 뒤 소라를 따라 계단 아래 빈 객실 복도로 내려간다.",
              "next": "spare-rooms",
              "set": [
                "shift_witnessed"
              ],
              "clues": [
                "shift-gaps"
              ]
            },
            "failure": {
              "text": "겹친 출근 시간을 잘못 옮겨 민의 열쇠가 미반납으로 표시된다. 민이 기록을 잠시 잠그고 직원 식당에서 다시 확인하겠다고 한다. 지금은 쉴 방부터 살피기로 하고 소라와 계단 아래 빈 객실 복도로 내려간다.",
              "next": "spare-rooms",
              "pressure": 1
            },
            "fumble": {
              "text": "퇴근 기록을 맞추려다 빈 번호를 입력하자 교대종이 경보음으로 바뀐다. 민이 인수표를 떼어 원본을 보존하고 소라가 보안실에 정정을 요청한다. 소란을 피해 계단 아래 빈 객실 복도로 내려가 문 상태부터 살핀다.",
              "next": "spare-rooms",
              "pressure": 2
            }
          }
        },
        {
          "id": "hear-last-shift",
          "label": "민에게 마지막으로 쉬었던 때와 돌려주지 못한 열쇠를 묻는다",
          "intent": "talk",
          "stat": "heart",
          "dc": 11,
          "risk": "직원의 말을 재촉하면 미확인 근무가 연장 승인으로 잘못 접수될 수 있다.",
          "outcomes": {
            "critical": {
              "text": "민의 말을 끊지 않자 그가 퇴근하려던 날의 열쇠 번호까지 기억해 낸다. 불려 온 직원들도 자기 번호를 고쳐 적는다. 교대 연장 통보를 취소한 뒤, 민이 알려 준 계단으로 소라와 내려가 빈 객실 복도에 선다.",
              "next": "spare-rooms",
              "set": [
                "shift_witnessed"
              ],
              "clues": [
                "shift-gaps",
                "spare-room-note"
              ],
              "pressure": -1
            },
            "success": {
              "text": "민은 잠깐 생각하다가 “쉬었던 날은 모르겠고, 돌아갈 열쇠는 이거예요”라며 번호를 보여 준다. 직원들이 그 옆에 자기 교대를 적는다. 말을 받아 쓴 뒤 소라와 계단 아래 빈 객실 복도로 내려간다.",
              "next": "spare-rooms",
              "set": [
                "shift_witnessed"
              ],
              "clues": [
                "shift-gaps"
              ]
            },
            "failure": {
              "text": "민은 서로 다른 날짜를 한참 오가다 대답을 멈춘다. 자동 교대기가 확인되지 않은 근무를 경고한다. 지금 기억을 억지로 끌어내지 않기로 하고, 소라와 계단 아래 빈 객실 복도로 내려가 쉴 곳부터 살핀다.",
              "next": "spare-rooms",
              "pressure": 1
            },
            "fumble": {
              "text": "겹치는 설명을 서둘러 정리하다 「다음 교대까지」라는 말이 접수기에 들어간다. 민이 연장에 동의한 게 아니라며 급히 정정을 남긴다. 소라가 접수기를 끈 뒤 안내하는 계단을 따라 아래 빈 객실 복도로 내려간다.",
              "next": "spare-rooms",
              "pressure": 2
            }
          }
        },
        {
          "id": "look-for-empty-rooms",
          "label": "교대 기록은 직원들에게 맡기고 빈 객실부터 찾아본다",
          "intent": "choose",
          "automatic": true,
          "outcomes": {
            "success": {
              "text": "민에게 당장 기억을 정리하지 않아도 된다고 말한다. 그는 다른 직원들과 식당에서 기록을 확인하겠다고 한다. 소라가 원석을 품에 고쳐 넣고 앞장서서, 계단 아래 손님 없는 객실 복도로 안내한다.",
              "next": "spare-rooms"
            }
          }
        }
      ],
      "details": [
        {
          "id": "take-spare-room-key",
          "label": "공용 보관함의 빈 객실 예비 열쇠를 챙긴다",
          "text": "민의 인수 메모에 「오늘 배정 없음」이라고 적혀 있다. 그에게 쉴 방을 살펴보겠다고 말하고 같은 번호의 예비 열쇠를 받아 챙긴다.",
          "clue": "spare-room-note",
          "gainItems": [
            "rest-room-key"
          ]
        }
      ],
      "partyText": {
        "solo": [
          "교대종이 울릴 때마다 민의 카드에 날짜가 하나 더 찍힌다. 기록을 붙들고 있자 민이 빈 의자를 끌어다 준다. “한 사람 앞에서는 말을 좀 해도 되겠네요.” 그가 돌려주지 못한 열쇠를 내려놓는다.",
          "소라는 원석을 품에 둔 채 다음 계단을 가리킨다. 빈 객실을 살펴보는 동안 직원들이 식당에 모이도록 민이 전하겠다고 한다. 교대 기록을 먼저 들을지, 쉴 방부터 찾을지 정할 차례다."
        ],
        "group": [
          "교대종 아래에 일행이 살필 출근 카드가 펼쳐진다. 민은 확인한 카드에만 표시를 남겨 달라고 부탁한다. 맡은 사람이 바뀌어도 다음 사람이 그 표시에서 이어 읽을 수 있도록, 빈 펜을 함께 놓는다.",
          "소라는 원석을 품에 둔 채 다음 계단을 가리킨다. 일행이 빈 객실을 살피는 동안 직원들은 식당에 모일 것이다. 누구의 말을 들었는지 남겨 두면 동료가 돌아오지 못해도 그 증언은 사라지지 않는다."
        ]
      }
    },
    "spare-rooms": {
      "id": "spare-rooms",
      "title": "침대가 비어 있는데도",
      "chapter": 4,
      "location": "손님이 배정되지 않은 객실 복도",
      "art": 1,
      "mood": "tension",
      "text": [
        "복도 끝 방문 밑으로 깨끗한 이불 자락이 보인다. 문 옆의 투숙 표시는 비어 있는데 잠금쇠만 걸려 있다. 소라는 빈 침대가 이렇게 많았느냐며 웃다가, 금방 웃음을 거둔다.",
        "문을 열면 손님 없는 방을 쉬어 갈 자리로 준비할 수 있다. 오래된 잠금쇠를 살피거나 맞는 열쇠를 쓰면 된다. 건드리지 않고 옆 서비스 통로로 나가 직원 식당에 합류할 길도 열려 있다."
      ],
      "summary": "비어 있는 객실을 열면 직원들이 떠나기 전에 쉬어 갈 선택이 생긴다.",
      "objective": "객실을 안전하게 열거나 준비를 미루고 직원 식당에서 의견을 듣는다.",
      "stakes": "문을 억지로 만지다 경첩이 떨어질 수 있으며, 준비하지 않은 방에 쉬어도 된다고 약속할 수 없다.",
      "choices": [
        {
          "id": "release-spare-latch",
          "label": "낡은 잠금쇠와 경첩을 살펴 객실을 안전하게 연다",
          "intent": "investigate",
          "stat": "wit",
          "dc": 12,
          "risk": "실수하면 경첩이 떨어져 다치거나 객실이 다시 잠겨 쉴 자리를 준비하지 못한다.",
          "outcomes": {
            "critical": {
              "text": "잠금쇠를 누르는 나사를 찾아 빼자 문이 조용히 열린다. 창과 침대까지 확인하고 빈방 표시를 바꾼다. 불필요한 문 열림 경보도 해제한 뒤, 소라와 옆 서비스 통로를 지나 직원 식당으로 간다.",
              "next": "staff-breakfast",
              "set": [
                "rest_rooms_ready"
              ],
              "clues": [
                "spare-room-note"
              ],
              "pressure": -1
            },
            "success": {
              "text": "휘어진 잠금쇠를 받쳐 문을 연다. 객실에는 다른 손님의 짐이 없고, 창문과 침대도 사용할 수 있다. 준비한 방 번호를 소라에게 알려 준 뒤 옆 서비스 통로를 따라 직원 식당으로 이동한다.",
              "next": "staff-breakfast",
              "set": [
                "rest_rooms_ready"
              ],
              "clues": [
                "spare-room-note"
              ]
            },
            "failure": {
              "text": "잠금쇠가 안쪽에서 다시 걸리며 문 열림 경고가 켜진다. 더 힘을 주기 전에 손을 떼고 아직 사용할 수 없는 방이라고 적는다. 소라와 옆 서비스 통로로 나가 직원 식당에서 다른 방법을 의논하기로 한다.",
              "next": "staff-breakfast",
              "pressure": 1
            },
            "fumble": {
              "text": "잠금쇠를 받치던 순간 느슨한 경첩이 빠져 어깨를 친다. 문이 기울어지자 소라가 통로 쪽으로 물러나라고 외친다. 방을 쓰지 못한다는 표지만 남긴 뒤, 아픈 어깨를 감싸고 서비스 통로를 지나 직원 식당으로 간다.",
              "next": "staff-breakfast",
              "pressure": 2,
              "harm": 1,
              "lossText": "잠금쇠를 받치던 문에서 경첩이 빠진다. 무거운 방문이 기울며 객실 문턱을 덮치고, 깨진 금속 소리가 복도 끝까지 울린다.",
              "survivorArrival": "소라가 기울어진 문 옆의 서비스 통로를 가리킨다. 남은 일행은 그 길로 복도를 벗어나 직원 식당에 닿는다."
            }
          }
        },
        {
          "id": "open-rest-room",
          "label": "챙긴 예비 열쇠로 객실을 열고 쉬어 갈 자리를 마련한다",
          "intent": "use",
          "automatic": true,
          "useItems": [
            "rest-room-key"
          ],
          "lockedHint": "직원 사물함의 공용 보관함에서 빈 객실 예비 열쇠를 먼저 받아야 한다.",
          "outcomes": {
            "success": {
              "text": "예비 열쇠의 번호를 투숙 표시에 맞추고 문을 연다. 아무에게도 배정되지 않은 방에서 창문과 침대를 확인한다. 열쇠는 다시 챙기고 방 번호를 적어 둔 뒤, 소라와 옆 서비스 통로를 지나 직원 식당으로 간다.",
              "next": "staff-breakfast",
              "set": [
                "rest_rooms_ready"
              ],
              "clues": [
                "spare-room-note"
              ]
            }
          }
        },
        {
          "id": "leave-room-locked",
          "label": "방은 무리하게 열지 않고 직원 식당으로 간다",
          "intent": "choose",
          "automatic": true,
          "outcomes": {
            "success": {
              "text": "잠금쇠에 손대지 않고 미확인 객실이라고 표시한다. 쉴 자리가 있다고 먼저 약속할 수는 없다. 소라가 가리킨 옆 서비스 통로를 지나자 식당의 작은 등불과 모여 앉은 직원들이 보인다.",
              "next": "staff-breakfast"
            }
          }
        }
      ],
      "callbacks": [
        {
          "when": {
            "flag": "shift_witnessed"
          },
          "text": "소라는 끝나지 않은 교대장 이야기를 다시 꺼낸다. 이 방을 연다고 그들에게 또 다른 당번을 맡겨서는 안 된다고 말한다."
        }
      ],
      "details": [
        {
          "id": "read-empty-room-card",
          "label": "문 옆의 투숙 배정표를 읽는다",
          "text": "오늘과 다음 날의 투숙객 칸이 모두 비어 있다. 문이 잠겼다는 이유만으로 손님이 있다고 생각했던 방이다. 다만 열어 보기 전에는 안쪽 창문과 침대 상태를 알 수 없다.",
          "clue": "spare-room-note"
        }
      ]
    },
    "staff-breakfast": {
      "id": "staff-breakfast",
      "title": "여기서 쉬어도 근무가 될까요",
      "chapter": 4,
      "location": "직원 식당의 마지막 교대 식탁",
      "art": 1,
      "mood": "calm",
      "text": [
        "직원 식당에는 식은 빵과 각자의 열쇠가 놓여 있다. 민이 의자를 빼 주고, 소라는 원석을 무릎 위에 둔다. 집에 바로 갈 사람도 있지만 막차를 놓쳐 아침까지 앉아 있을 사람도 있다.",
        "누군가 빈 객실에서 잠들면 다시 근무로 적히느냐고 묻는다. 누구는 열쇠를 돌려주고 다시는 출근하지 않고 싶다고 한다. 같은 문을 나서더라도 그 뒤에 바라는 하루는 저마다 다르다."
      ],
      "summary": "직원들이 휴식할 자리와 다시 출근하지 않을 권리에 대해 말한다.",
      "objective": "준비한 방에 머물 뜻을 묻거나 영업을 중단하고 싶은 직원들의 요청을 듣는다.",
      "stakes": "쉰다는 말을 연장 근무로 잘못 넘기지 않아야 한다. 누군가의 퇴근을 다른 사람의 당번으로 바꾸지 않는다.",
      "choices": [
        {
          "id": "ask-who-wants-rest",
          "label": "준비한 방을 보여 주며 원하는 사람만 머물 수 있다고 제안한다",
          "intent": "talk",
          "stat": "heart",
          "dc": 12,
          "risk": "설명이 어긋나면 빈방 사용이 새 숙직으로 기록돼 직원들이 제안을 거절할 수 있다.",
          "requires": {
            "flag": "rest_rooms_ready"
          },
          "lockedHint": "빈 객실을 실제로 열어 창문과 침대를 확인해야 쉴 자리가 있다고 제안할 수 있다.",
          "outcomes": {
            "critical": {
              "text": "방 번호를 보여 주고 이름은 숙직표에 올리지 않겠다고 말한다. 직원들은 쉬어 갈 사람과 먼저 떠날 사람을 직접 나눈다. 민이 자동 숙직 접수까지 끈 뒤, 소라와 두 층 서비스 계단을 올라 옥상 천창 안쪽으로 돌아간다.",
              "next": "morning-switch",
              "set": [
                "rest_requests"
              ],
              "clues": [
                "rest-consent"
              ],
              "pressure": -1
            },
            "success": {
              "text": "“자고 나서도 언제든 나가도 되나요?”라는 물음에 그렇다고 답한다. 머물 사람만 자기 이름을 적고, 소라는 동생에게 갈 거라며 빈칸을 남긴다. 요청을 챙겨 두 층 서비스 계단을 올라 옥상 천창 안쪽으로 돌아간다.",
              "next": "morning-switch",
              "set": [
                "rest_requests"
              ],
              "clues": [
                "rest-consent"
              ]
            },
            "failure": {
              "text": "머물 사람을 묻자 직원들이 새 당번을 정하는 줄 알고 손을 내린다. 설명을 고쳐도 지금은 답하기 어렵다고 한다. 그 침묵을 동의로 적지 않고, 소라와 두 층 서비스 계단을 올라 옥상 천창 안쪽으로 돌아간다.",
              "next": "morning-switch",
              "pressure": 1
            },
            "fumble": {
              "text": "빈방 사용 명단을 접수기에 가까이 놓자 「숙직 연장」이라는 문구가 뜬다. 곧바로 종이를 거두고 누구도 근무에 동의하지 않았다고 정정한다. 직원들에게 답을 재촉하지 않은 채 소라와 두 층 계단을 올라 천창 안쪽으로 돌아간다.",
              "next": "morning-switch",
              "pressure": 2
            }
          }
        },
        {
          "id": "accept-returned-keys",
          "label": "스스로 열쇠를 반납한 직원들의 영업 중단 요청을 받는다",
          "intent": "choose",
          "automatic": true,
          "outcomes": {
            "success": {
              "text": "테이블 한쪽에 열쇠를 놓을 자리를 만든다. 직원들은 자기 이름표를 확인하고 차례로 열쇠를 내려놓는다. 민이 「손님을 더 받지 않겠습니다」라고 적고 소라도 서명한다. 요청을 챙겨 두 층 서비스 계단을 올라 천창 안쪽으로 돌아간다.",
              "next": "morning-switch",
              "set": [
                "closure_requested"
              ]
            }
          }
        },
        {
          "id": "leave-staff-time",
          "label": "지금 답하지 않을 시간을 주고 먼저 아침을 열러 간다",
          "intent": "choose",
          "automatic": true,
          "outcomes": {
            "success": {
              "text": "누구도 지금 떠날 곳을 정하지 않아도 된다고 말한다. 민에게 열쇠와 기록을 보관해 달라고 맡긴다. 소라는 원석을 다시 품에 넣고 일어서서, 두 층 서비스 계단을 통해 옥상 천창 안쪽으로 돌아온다.",
              "next": "morning-switch"
            }
          }
        }
      ],
      "callbacks": [
        {
          "when": {
            "flag": "rest_rooms_ready"
          },
          "text": "식탁 모서리에 적힌 방 번호에는 「확인함」이라는 표시가 있다. 빈 침대를 상상으로 약속하는 것이 아니라, 실제로 열어 본 방을 제안할 수 있다."
        },
        {
          "when": {
            "flag": "shift_witnessed"
          },
          "text": "민은 출근 카드와 열쇠 인수표를 나란히 놓는다. 무엇을 반납하면 자기 근무가 끝나는지 이번에는 각자 확인할 수 있다."
        }
      ],
      "details": [
        {
          "id": "see-cold-meal",
          "label": "식은 빵 옆에 겹친 식권들을 본다",
          "text": "사용 기한이 지난 직원 식권이 한 묶음 놓여 있다. 교대만 기다리다 식사 시간도 넘긴 것이다. 소라가 식권에 적힌 시간보다 지금 배고픈 사람이 먼저라고 말한다."
        }
      ]
    },
    "morning-switch": {
      "id": "morning-switch",
      "title": "아침 다음에 문을 열 사람",
      "chapter": 4,
      "location": "다시 돌아온 옥상 천창 안쪽",
      "art": 3,
      "mood": "hope",
      "text": [
        "서비스 계단 끝에서 차가운 옥상 바람이 돌아온다. 소라가 품에서 꺼낸 원석을 빈 받침대 옆에 놓는다. 위에서 보는 호텔은 그대로인데, 아래층에서 들은 말 때문에 같은 건물로 보이지 않는다.",
        "쉬어 갈 방과 동의를 마련했다면 호텔의 용도를 바꿀 수 있다. 끝나지 않은 교대를 확인하고 열쇠를 돌려받았다면 영업을 중단할 수도 있다. 준비가 부족하면 아침부터 열고 원석과 장부를 직원들에게 맡기면 된다."
      ],
      "summary": "직원들의 실제 요청을 가지고 천창으로 돌아와 호텔의 다음 운영을 정한다.",
      "objective": "원석으로 아침을 연 뒤 휴식 숙소로 전환하거나 영업을 중단하거나 결정을 맡긴다.",
      "stakes": "어느 쪽도 잃은 시간을 자동으로 되돌리지 않는다. 준비하지 않은 방이나 확인하지 않은 열쇠로 새 운영을 강행할 수 없다.",
      "choices": [
        {
          "id": "open-rest-house",
          "label": "동의한 직원들과 호텔을 잠시 쉬어 갈 숙소로 바꾼다",
          "intent": "choose",
          "automatic": true,
          "requires": {
            "all": [
              {
                "flag": "rest_rooms_ready"
              },
              {
                "flag": "rest_requests"
              }
            ]
          },
          "lockedHint": "사용할 수 있는 빈 객실을 준비하고 직원들에게 근무 없이 머물겠다는 동의를 받아야 한다.",
          "outcomes": {
            "success": {
              "text": "원석을 받침대에 올려 아침을 다시 흐르게 한다. 금고와 시간 장부는 잠가 두고, 새 숙소에서는 시간을 숙박료로 받지 않겠다고 적는다. 소라가 아래층에 그 결정을 전한다. 준비된 객실 쪽에서 처음으로 「방해하지 마세요」 표지가 걸린다.",
              "next": "ending-rest-house"
            }
          }
        },
        {
          "id": "close-hotel-doors",
          "label": "직원들의 반납 기록에 따라 호텔 영업을 중단한다",
          "intent": "choose",
          "automatic": true,
          "requires": {
            "all": [
              {
                "flag": "shift_witnessed"
              },
              {
                "flag": "closure_requested"
              }
            ]
          },
          "lockedHint": "끝나지 않은 교대와 실제 열쇠 담당을 확인하고 직원들의 자발적인 반납과 영업 중단 요청을 받아야 한다.",
          "outcomes": {
            "success": {
              "text": "원석을 받침대에 올려 멎은 아침을 깨운다. 확인한 인수표에 반납된 열쇠를 맞추고 영업 중단을 기록한다. 소라는 원석을 잠그고 장부 사본을 챙긴다. 계단을 내려가 로비에 닿자 깨어난 손님들에게 마지막 퇴실을 안내하는 민이 보인다.",
              "next": "ending-hotel-closed"
            }
          }
        },
        {
          "id": "entrust-unfinished-morning",
          "label": "아침부터 다시 열고 남은 결정은 직원들에게 맡긴다",
          "intent": "choose",
          "automatic": true,
          "outcomes": {
            "success": {
              "text": "소라와 원석을 받침대에 올리자 차양에 멎었던 비가 쏟아진다. 아직 합의하지 못한 운영은 빈칸으로 남긴다. 아래층으로 내려가 직원 대표에게 장부와 관리키를 건네고, 깨어난 손님들이 로비로 나오는 모습을 함께 확인한다.",
              "next": "ending-settlement"
            }
          }
        }
      ],
      "callbacks": [
        {
          "when": {
            "flag": "rest_requests"
          },
          "text": "쉬겠다고 적은 이름 옆에 교대 시간은 없다. 먼저 떠나는 사람의 빈칸도 지우지 않았다. 머무는 것과 일하는 것을 처음으로 따로 적었다."
        },
        {
          "when": {
            "flag": "closure_requested"
          },
          "text": "열쇠를 반납한 자리에는 영업을 중단해 달라는 요청이 남았다. 소라는 그 메모를 장부 첫 장에 붙여, 아침이 돌아와도 없던 일로 만들지 못하게 한다."
        }
      ],
      "details": [
        {
          "id": "read-stone-stand",
          "label": "원석 받침대와 반환 장치의 표시를 다시 확인한다",
          "text": "원석을 받침대에 놓으면 호텔의 아침은 다시 흐른다. 빼앗긴 시간을 이름마다 돌려주는 절차는 그 옆 장치에 따로 적혀 있다. 문을 열었다고 정산까지 끝난 것은 아니다."
        }
      ]
    },
    "ending-rest-house": {
      "id": "ending-rest-house",
      "title": "처음으로 잠든 객실",
      "chapter": 4,
      "art": 3,
      "mood": "hope",
      "ending": true,
      "text": [
        "유리 호텔의 경매장이 문을 닫는다. 남아 쉬기로 한 직원들은 객실에 들어가 낮까지 잔다. 문밖에는 근무 시간이 아닌 깨워도 되는 시각이 적힌다. 민은 자기 방문의 카트를 복도에 세워 두고, 이번에는 혼자 문 안으로 들어간다.",
        "며칠 뒤 빈방은 갈 곳이 잠시 없는 사람도 쉬어 가는 숙소가 된다. 운영을 맡겠다고 돌아온 사람들이 돈과 일을 의논하지만 누구의 시간을 떼어 받지는 않는다. 잃어버린 시간의 반환 장부는 아직 미완성이다. 그 숙제를 안고도 오늘 잠들 자리는 생겼다."
      ],
      "epilogues": [
        {
          "when": {
            "flag": "rest_rooms_ready"
          },
          "text": "처음 열어 둔 방의 번호가 현관에 작게 남는다. 큰 간판을 바꾸기 전에 침대 하나부터 마련했던 날을 기억하기 위해서다."
        },
        {
          "when": {
            "flag": "owner_exposed"
          },
          "text": "공개된 장부 사본이 새 숙소의 첫 회의에 놓인다. 돌아온 운영자들은 정산을 미루는 일이 또 착취의 핑계가 되지 않도록 확인 날짜를 적는다."
        },
        {
          "when": {
            "flag": "solo_min_promise"
          },
          "text": "민은 직원 문을 마지막으로 닦으며 돌아나갈 때 함께 가자던 말을 되짚는다. 내내 안쪽으로 돌리던 카트 손잡이를 이번에는 바깥으로 놓는다."
        },
        {
          "when": {
            "flag": "group_drew_guards"
          },
          "text": "민이 기억하는 첫 손님은 명단의 귀빈이 아니다. 경비 앞에 먼저 서서 다른 사람들이 들어갈 틈을 남겨 준 얼굴이다."
        },
        {
          "when": {
            "flag": "solo_sora_walk"
          },
          "text": "소라의 연락처 쪽지에는 펴서 눌러 준 손자국이 남았다. 동생의 번호 옆에 집에 갈 때까지 함께 걷자는 말을 작게 적는다."
        },
        {
          "when": {
            "flag": "group_held_firedoor"
          },
          "text": "계단 방화문에 받침이 긁은 자국이 남는다. 소라는 그 앞을 지날 때 누군가 문을 붙들고 벌어 준 짧은 시간을 떠올린다."
        }
      ],
      "question": "이 숙소에서 쉬는 첫 손님에게 어떤 말을 건네고 싶나요?",
      "choices": []
    },
    "ending-hotel-closed": {
      "id": "ending-hotel-closed",
      "title": "오늘부터 손님을 받지 않습니다",
      "chapter": 4,
      "art": 3,
      "mood": "calm",
      "ending": true,
      "text": [
        "마지막 손님이 회전문을 지나자 민이 「영업 종료」 표지를 건다. 창마다 비어 있는 방이 보이지만 누구도 거기서 다음 교대를 기다리지 않는다. 직원들은 돌려준 열쇠 대신 각자의 집 열쇠를 꺼낸다. 소라는 길 건너에서 동생에게 전화를 건다.",
        "원석은 부서지지 않은 채 봉인되고 시간 장부는 호텔 밖에 보관된다. 빼앗긴 시간을 돌려받는 일은 남았지만, 그 일을 하기 위해 이곳에서 계속 일할 필요는 없다. 저녁이 와도 유리 호텔의 연회장에는 불이 켜지지 않는다."
      ],
      "epilogues": [
        {
          "when": {
            "flag": "closure_requested"
          },
          "text": "소라의 반납란에는 사유를 길게 쓰지 않았다. 「더는 일하지 않겠습니다.」 그 한 줄만으로도 열쇠는 돌려줄 수 있었다."
        },
        {
          "when": {
            "flag": "rest_rooms_ready"
          },
          "text": "잠시 마련했던 빈방의 이불은 정돈된 채 남았다. 쓸 수 있는 방이 있다는 이유로 떠나겠다는 사람을 붙잡지는 않았다."
        },
        {
          "when": {
            "flag": "solo_min_promise"
          },
          "text": "민은 직원 문을 마지막으로 닦으며 돌아나갈 때 함께 가자던 말을 되짚는다. 내내 안쪽으로 돌리던 카트 손잡이를 이번에는 바깥으로 놓는다."
        },
        {
          "when": {
            "flag": "group_drew_guards"
          },
          "text": "민이 기억하는 첫 손님은 명단의 귀빈이 아니다. 경비 앞에 먼저 서서 다른 사람들이 들어갈 틈을 남겨 준 얼굴이다."
        },
        {
          "when": {
            "flag": "solo_sora_walk"
          },
          "text": "소라의 연락처 쪽지에는 펴서 눌러 준 손자국이 남았다. 동생의 번호 옆에 집에 갈 때까지 함께 걷자는 말을 작게 적는다."
        },
        {
          "when": {
            "flag": "group_held_firedoor"
          },
          "text": "계단 방화문에 받침이 긁은 자국이 남는다. 소라는 그 앞을 지날 때 누군가 문을 붙들고 벌어 준 짧은 시간을 떠올린다."
        }
      ],
      "question": "끝내 돌아가지 않아도 되는 문을 나선 뒤, 어디에 가장 먼저 들르고 싶나요?",
      "choices": []
    }
  },
  "deathEnding": {
    "title": "돌아오지 못한 체크아웃",
    "art": 2,
    "mood": "danger",
    "text": [
      "금고의 빈 모래시계들이 하나씩 빛난다. 객실 번호를 적을 자리에 일행의 이름이 새겨진다. 복도의 호출 벨은 계속 울리지만 마지막 순간을 되돌리러 올 살아 있는 동료는 없다.",
      "직원들이 체크아웃 장부의 빈칸 앞에 서 있다. 들어온 시간은 있어도 나간 시간을 쓸 수 없다. 호텔은 다시 완벽한 손님을 기다리고, 이번 일행이 남긴 질문은 끝내 정리하지 못한 서류 사이에 놓인다."
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
    },
    "rest-room-key": {
      "name": "빈 객실 예비 열쇠",
      "description": "직원 사물함 옆 공용 보관함에 있던 예비 열쇠. 손님이 배정되지 않은 객실 번호와 민의 인수 메모가 달려 있다.",
      "useHint": "잠긴 빈 객실 복도에서 사용하면 문을 부수지 않고 직원들이 쉬어 갈 방을 준비할 수 있다."
    }
  },
  "playModes": {
    "solo": "혼자라면 직원들에게 함께 밖으로 나가자는 약속을 건넬 수 있습니다.",
    "group": "여럿이라면 경비의 시선을 맡거나 방화문을 붙들어 동료들이 갈 틈을 만들 수 있습니다."
  }
};
export default campaign;
