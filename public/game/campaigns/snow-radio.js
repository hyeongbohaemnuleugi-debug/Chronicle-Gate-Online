// Original scenario for Chronicle Gate v14. Edit nodes, clues and outcome edges below.
export default {
  "id": "snow-radio",
  "title": "설원에서 온 내 목소리",
  "subtitle": "조난 신호가 나보다 먼저 내 이름을 안다",
  "genre": "극지 생존 · 정체성 미스터리",
  "accent": "#b3cce6",
  "description": "끊긴 극지 중계소에서 당신의 목소리가 구조를 요청한다. 눈보라를 건너 도착한 귀환 장치는 사람을 되살릴 수 있지만, 돌아올지 묻는 법을 잊었다.",
  "estimatedMinutes": "35–60",
  "contentNotes": [
    "조난과 저체온",
    "죽음과 부활",
    "복제와 정체성에 관한 선택"
  ],
  "objective": "조난 방송의 근원을 찾아 설원을 빠져나갈 길을 확보한다.",
  "art": "snow-radio",
  "pressureLabel": "한랭 전선",
  "pressureMax": 8,
  "start": "hut",
  "roles": [
    {
      "title": "현장 통신사",
      "secret": "중계소 입구에서 받은 통과 신호에 당신의 음성 서명이 이미 있었다. 오늘 말한 적 없는 문장도 포함돼 있다.",
      "goal": "익숙한 목소리를 신원 확인의 유일한 근거로 삼지 않는다.",
      "reveal": "중계소는 우리 목소리를 이미 갖고 있다. 목소리가 같다고 발신자도 같다고 볼 수 없다.",
      "epilogues": [
        {
          "when": {
            "flag": "heard_reply"
          },
          "text": "새 질문에 새 대답이 돌아온 통신 기록은 음성 인증 규정을 바꾼다. 닮은 목소리보다 실제 응답과 당사자의 확인이 우선한다."
        },
        {
          "when": {
            "notFlag": "heard_reply"
          },
          "text": "통신 기록에는 익숙한 목소리의 발신자를 바로 확정하지 않았다는 표시가 남는다. 소리와 사람을 구분하는 절차가 후속 과제가 된다."
        }
      ]
    },
    {
      "title": "극지 길잡이",
      "secret": "작년 구조 지도에는 오늘의 지도에서 지워진 대피소가 있다. 지도 제작자는 좌표 아래에 “돌아오지 않기로 한 사람도 찾지 말 것”이라고 썼다.",
      "goal": "찾아내는 것과 강제로 데려오는 것의 차이를 지킨다.",
      "reveal": "작년 지도에는 별도의 대피소와 귀환 거부에 관한 메모가 있다. 현재 지도만 믿으면 안 된다.",
      "epilogues": [
        {
          "when": {
            "flag": "cable_safe"
          },
          "text": "안전 케이블과 표식은 뒤늦은 구조대에도 길이 된다. 먼저 건넌 사람이 남겨 둔 경로가 다른 사람의 선택지를 늘린다."
        },
        {
          "when": {
            "notFlag": "cable_safe"
          },
          "text": "옛 지도와 지워진 대피소 좌표는 회수 기록에 남는다. 한 번 실패한 경로도 다음 구조를 위해 숨기지 않아야 한다는 주석이 붙는다."
        }
      ]
    },
    {
      "title": "생체 장비 기사",
      "secret": "중계소 게이트는 방한복 검사와 함께 신체·의식 패턴을 보관했다. 극한 환경에서 사망한 사람을 재구성하는 실험 장치가 이곳에 있다는 뜻이다.",
      "goal": "복원 기능의 가격과 제한을 동료들에게 알린다.",
      "reveal": "입구 게이트는 생체 패턴 보관 장치였다. 이곳의 귀환 기술은 응급 치료가 아니라 사망 뒤 재구성을 시도하는 장치다.",
      "epilogues": [
        {
          "when": {
            "flag": "return_control"
          },
          "text": "안쪽에서도 멈출 수 있게 바꾼 회로는 귀환 장치의 기본 조건이 된다. 성공률보다 먼저 당사자의 제어권을 검사하는 항목이 생긴다."
        },
        {
          "when": {
            "notFlag": "return_control"
          },
          "text": "정비 기록에는 시작 단추만 있는 설계의 결함이 남는다. 사후 복원을 가능하게 하는 것과 강제하지 않는 것은 별개의 과제로 보존된다."
        }
      ]
    },
    {
      "title": "기록 담당자",
      "secret": "출발 전 발견한 미전달 편지에는 작년 실종자 이안의 말이 있다. “내가 돌아오거든, 왜 돌아왔는지 내게 먼저 물어봐 줘.”",
      "goal": "실종자들의 의사를 기록에서 지우지 않는다.",
      "reveal": "작년 실종자 이안은 귀환 자체보다 자신이 선택했는지 확인해 달라는 말을 남겼다.",
      "epilogues": [
        {
          "when": {
            "flag": "voices_consulted"
          },
          "text": "서로 다른 대답을 보관한 기록에는 미정인 항목도 그대로 남는다. 이안의 오래된 편지는 대답을 대신 쓰지 않았다는 증거와 함께 묶인다."
        },
        {
          "when": {
            "notFlag": "voices_consulted"
          },
          "text": "실종자의 편지에는 돌아올 이유를 먼저 물어 달라는 요청이 남는다. 완료 표시는 없어도 미완의 질문까지 지워지는 것은 아니다."
        }
      ]
    }
  ],
  "clues": {
    "scan": {
      "title": "입구의 생체 보관 기록",
      "text": "게이트는 방한복 검사와 함께 신체 및 의식 패턴을 기록했다. 의식 앵커가 유지되는 동안만 사후 재구성을 시도할 수 있다."
    },
    "call": {
      "title": "목소리를 빌리는 송신 규칙",
      "text": "기지의 저전력 송신은 가장 가까운 등록자의 목소리를 빌린다. 익숙한 음성은 발신자의 신원이 아니다."
    },
    "map": {
      "title": "지워진 대피소의 좌표",
      "text": "옛 지도에는 지하 귀환실과 별도 대피소가 함께 표시돼 있다. 눈보라 속에서 안전하게 연결되는 케이블도 남아 있다."
    },
    "answer": {
      "title": "일방 통행이 아닌 응답",
      "text": "방송은 질문을 듣고 새로운 대답을 만든다. 단순한 자동 녹음이 아니라 의식 앵커에 남은 사람들과 이어져 있다."
    },
    "anchor": {
      "title": "귀환실의 의식 앵커",
      "text": "사망한 동료의 의식 신호가 남아 있으면 보관된 신체 패턴으로 육체를 다시 만들 수 있다. 전력과 재료를 소모하고 실패할 수 있다."
    },
    "ledger": {
      "title": "실종자의 마지막 선택",
      "text": "작년 실종자 중 일부는 귀환에 동의했고, 일부는 거부했으며, 일부는 질문을 남겼다. 관리자는 모두를 자동 복원 대기로 바꿨다."
    },
    "consent": {
      "title": "스스로 끝내거나 돌아오는 신호",
      "text": "귀환자는 시작과 중단을 직접 승인할 수 있어야 한다. 응답 없음은 동의가 아니다. 멈춤 신호도 보존해야 한다."
    },
    "power": {
      "title": "독립 송신 전력선",
      "text": "안테나를 줄여 송신하면 귀환실과 대피소 전력을 함께 유지할 수 있다. 넓은 범위의 자동 방송을 포기해야 한다."
    },
    "channel": {
      "title": "세 갈래 구조 채널",
      "text": "외부 구조 요청, 개별 귀환 승인, 중단 의사 기록을 분리하면 한 사람의 신호가 다른 사람의 대답을 덮지 않는다."
    }
  },
  "flags": {
    "warmth_ready": "보온 전력을 확보했다",
    "antenna_aligned": "중계 안테나를 정렬했다",
    "heard_reply": "살아 있는 응답을 확인했다",
    "cable_safe": "대피소 케이블 경로를 확보했다",
    "garam_safe": "수색대원 가람을 구조했다",
    "anchors_protected": "의식 앵커를 강제 삭제하지 않았다",
    "voices_consulted": "실종자들의 동의와 거부를 구분했다",
    "power_shared": "대피소와 귀환실에 전력을 나눴다",
    "rescue_sent": "현재 위치와 구조 요청을 송신했다",
    "records_saved": "실종자 기록을 외부에 보관했다",
    "return_control": "귀환자에게 시작과 중단의 제어권을 돌려줬다"
  },
  "nodes": {
    "hut": {
      "id": "hut",
      "title": "무전기가 나를 부를 때",
      "chapter": 1,
      "location": "북위 78도 · 임시 중계 오두막",
      "art": 0,
      "mood": "mystery",
      "text": [
        "문이 닫히자 바람 소리가 멀어진다. 오두막 안에는 네 개의 컵과 사람 수를 자동으로 세는 출입등이 있다. 컵에 손을 대기 전에 무전기가 당신의 목소리로 말한다. “나는 아직 밖에 있어. 문을 열지 말고 들어 줘.”",
        "발신 방향은 지하인데 외부 안테나는 바람에 반쯤 꺾여 있다. 발전기는 곧 멎을 듯 기침한다. 벽의 게이트 안내에는 방한복 검사 아래 아주 작은 글씨로 생체 패턴 임시 보관이 적혀 있다."
      ],
      "objective": "보온 전력과 통신 중 무엇부터 확보할지 정한다.",
      "entities": [
        {
          "id": "generator",
          "label": "떨리는 보조 발전기",
          "kind": "object",
          "aliases": [
            "발전기",
            "전력"
          ]
        },
        {
          "id": "radio",
          "label": "익숙한 목소리의 무전기",
          "kind": "object",
          "aliases": [
            "무전기",
            "목소리"
          ]
        },
        {
          "id": "antenna",
          "label": "외부 중계 안테나",
          "kind": "place",
          "aliases": [
            "안테나",
            "밖"
          ]
        }
      ],
      "choices": [
        {
          "id": "power-first",
          "label": "발전기를 살려 보온과 조명을 확보한다",
          "intent": "choose",
          "keywords": [
            "발전기",
            "전력",
            "보온",
            "불"
          ],
          "automatic": true,
          "outcomes": {
            "success": {
              "text": "누군가가 컵을 뒤집어 작은 나사를 받칠 자리를 만든다. 밖의 목소리에게 잠깐 기다려 달라고 말하고 발전기 덮개를 연다.",
              "next": "generator"
            }
          }
        },
        {
          "id": "signal-first",
          "label": "안테나로 나가 조난 신호의 방향을 잡는다",
          "intent": "choose",
          "keywords": [
            "안테나",
            "방향",
            "신호",
            "밖"
          ],
          "automatic": true,
          "outcomes": {
            "success": {
              "text": "안전 줄을 서로의 허리에 연결한다. 오두막의 문을 닫자 무전기 속 목소리도 바람을 듣는 듯 잠깐 말을 멈춘다.",
              "next": "antenna"
            }
          }
        },
        {
          "id": "question",
          "label": "무전기에 지금 눈앞에 무엇이 보이는지 묻는다",
          "intent": "talk",
          "target": "radio",
          "keywords": [
            "묻",
            "질문",
            "무전",
            "목소리",
            "대화"
          ],
          "stat": "heart",
          "dc": 10,
          "risk": "대화에 집중하는 동안 보온 전력이 더 줄어든다.",
          "outcomes": {
            "success": {
              "text": "“차가운 유리, 그리고 이름표.” 지금 말한 질문에 새 대답이 돌아온다. 녹음이 아님을 확인하고 발전기부터 손본다.",
              "next": "generator",
              "set": [
                "heard_reply"
              ],
              "clues": [
                "answer"
              ]
            },
            "mixed": {
              "text": "대답은 돌아왔지만 발음이 흔들린다. 전력을 확보해야 말을 더 들을 수 있다.",
              "next": "generator",
              "set": [
                "heard_reply"
              ],
              "clues": [
                "answer"
              ],
              "pressure": 1
            },
            "failure": {
              "text": "대답 대신 서로 다른 세 목소리가 겹친다. 채널을 정렬해야 발신자를 구분할 수 있다. 안전 줄을 챙겨 안테나로 향한다.",
              "next": "antenna",
              "pressure": 1
            }
          }
        }
      ],
      "dialogue": {
        "who": "무전기 속 내 목소리",
        "text": "네 목소리가 편해서 빌렸어. 무서웠다면 미안해."
      },
      "details": [
        {
          "id": "scanner",
          "label": "출입 게이트의 작은 안내를 읽는다",
          "text": "임시 보관된 신체·의식 패턴은 지하 귀환실과 연결된다. 보관과 실제 복원에 대한 동의 항목은 서로 다르다.",
          "clue": "scan"
        }
      ]
    },
    "generator": {
      "id": "generator",
      "title": "손난로보다 큰 약속",
      "chapter": 1,
      "location": "오두막 뒤 · 발전기실",
      "art": 0,
      "mood": "tension",
      "text": [
        "발전기 연료는 남아 있다. 꺼지려는 이유는 밖의 거대한 안테나가 전력을 전부 끌어가기 때문이다. 배전함의 자동 설정은 구조 방송 최대 출력, 보온 최소 출력으로 고정돼 있다.",
        "수동 손잡이는 얼음에 붙어 있다. 안쪽 벽에는 누군가 컵을 데우며 적은 낙서가 남았다. “구조하러 온 사람도 구조 대상.”"
      ],
      "objective": "사람들이 버틸 온기와 이동할 전력을 확보한다.",
      "entities": [
        {
          "id": "switch",
          "label": "얼어붙은 배전 손잡이",
          "kind": "object",
          "aliases": [
            "손잡이",
            "배전함"
          ]
        },
        {
          "id": "generator",
          "label": "보조 발전기",
          "kind": "object",
          "aliases": [
            "발전기"
          ]
        },
        {
          "id": "wires",
          "label": "보온 전력선",
          "kind": "object",
          "aliases": [
            "선",
            "전력선"
          ]
        }
      ],
      "choices": [
        {
          "id": "reroute",
          "label": "안테나 출력을 낮추고 보온 전력선을 연결한다",
          "intent": "use",
          "target": "wires",
          "keywords": [
            "전력",
            "선",
            "출력",
            "연결",
            "보온"
          ],
          "stat": "wit",
          "dc": 11,
          "risk": "잘못 연결하면 절연 불꽃에 다치고 이동 전력을 잃는다.",
          "outcomes": {
            "success": {
              "text": "전력계가 내려가고 난방관이 천천히 따뜻해진다. 저출력 송신에서도 목소리는 들린다. 크게 외치는 것만이 구조는 아니었다.",
              "next": "whiteout",
              "set": [
                "warmth_ready",
                "power_shared"
              ],
              "clues": [
                "power"
              ]
            },
            "mixed": {
              "text": "배전 접점 하나가 타지만 보온 선은 살아 있다. 예비 전지를 더해 이동할 준비를 한다.",
              "next": "whiteout",
              "set": [
                "warmth_ready"
              ],
              "clues": [
                "power"
              ],
              "pressure": 1
            },
            "failure": {
              "text": "축전지가 역류한다. 절연판 뒤로 몸을 피한 뒤 남은 휴대 전지로 무전기만 살린다. 밖으로 나갈 때는 서로 체온을 확인해야 한다.",
              "next": "whiteout",
              "pressure": 2,
              "harm": 1
            }
          }
        },
        {
          "id": "crank",
          "label": "손난로로 얼음을 녹이고 수동 손잡이를 돌린다",
          "intent": "force",
          "target": "switch",
          "keywords": [
            "손난로",
            "손잡이",
            "돌",
            "녹",
            "힘"
          ],
          "stat": "might",
          "dc": 11,
          "risk": "손잡이를 무리하게 당기면 얼음 파편에 부상을 입는다.",
          "outcomes": {
            "success": {
              "text": "녹은 물이 흐르자 손잡이가 움직인다. 발전기는 스스로 부하를 나누기 시작하고 오두막에 고른 빛이 켜진다.",
              "next": "whiteout",
              "set": [
                "warmth_ready"
              ],
              "clues": [
                "power"
              ]
            },
            "mixed": {
              "text": "손잡이가 움직였지만 장갑을 찢는 얼음 조각이 떨어진다. 상처를 감싸고 확보한 온기를 휴대 난방기에 담는다.",
              "next": "whiteout",
              "set": [
                "warmth_ready"
              ],
              "pressure": 1,
              "harm": 1
            },
            "failure": {
              "text": "고정대가 부러지고 얼음 조각이 튄다. 자동 출력이 잠깐 끊긴 사이 휴대 난방기만 충전해 밖으로 이동한다.",
              "next": "whiteout",
              "pressure": 2,
              "harm": 1
            }
          }
        }
      ],
      "dialogue": {
        "who": "무전기 속 목소리",
        "text": "따뜻한 데서 내 얘기 들어도 돼. 내가 급하다고 너까지 얼 필요는 없으니까."
      },
      "details": [
        {
          "id": "power-map",
          "label": "배전도를 확인한다",
          "text": "안테나 범위를 줄이면 보온과 귀환실에 동시에 전력을 줄 수 있다. 최대 출력은 유일한 구조 방법이 아니다.",
          "clue": "power"
        }
      ]
    },
    "antenna": {
      "id": "antenna",
      "title": "나와 닮은 잡음",
      "chapter": 1,
      "location": "오두막 외곽 · 중계 안테나",
      "art": 1,
      "mood": "danger",
      "text": [
        "안테나 아래에는 두 가지 발자국이 있다. 바람에 흐릿해진 부츠 자국과, 귀환실에서 나온 운반 로봇의 평평한 자국이다. 사람 목소리의 발신자가 반드시 걸어 나왔으리라는 보장은 없다.",
        "주파수 조절판은 난간 위에 있다. 아래 단말기를 쓰면 안전하지만 시간이 더 걸린다. 난간을 타고 직접 맞추면 빠르게 채널을 잡을 수 있고, 추락하면 치명적인 부상을 입을 수 있다."
      ],
      "objective": "발신 방향과 목소리의 실제 주인을 구분한다.",
      "entities": [
        {
          "id": "terminal",
          "label": "지상 주파수 단말기",
          "kind": "object",
          "aliases": [
            "단말기",
            "주파수"
          ]
        },
        {
          "id": "mast",
          "label": "얼어붙은 안테나 난간",
          "kind": "place",
          "aliases": [
            "난간",
            "기둥"
          ]
        },
        {
          "id": "receiver",
          "label": "방향 수신기",
          "kind": "object",
          "aliases": [
            "수신기"
          ]
        }
      ],
      "choices": [
        {
          "id": "ground-tune",
          "label": "지상 단말기에서 차근차근 채널을 분리한다",
          "intent": "investigate",
          "target": "terminal",
          "keywords": [
            "단말",
            "채널",
            "주파수",
            "분리",
            "지상"
          ],
          "stat": "wit",
          "dc": 11,
          "risk": "안전하게 작업하지만 눈보라 전선이 가까워진다.",
          "outcomes": {
            "success": {
              "text": "당신의 목소리 아래에 이안이라는 발신자 표시가 뜬다. 저전력 통신이 가까운 등록 음성을 빌린다는 규칙도 확인된다.",
              "next": "whiteout",
              "set": [
                "antenna_aligned"
              ],
              "clues": [
                "call",
                "map"
              ]
            },
            "mixed": {
              "text": "발신자의 이름은 찾았지만 위치를 잡는 데 시간이 든다. 마지막 좌표를 무전기에 저장한다.",
              "next": "whiteout",
              "set": [
                "antenna_aligned"
              ],
              "clues": [
                "call"
              ],
              "pressure": 1
            },
            "failure": {
              "text": "단말기 화면이 얼어붙는다. 위치 표시 하나를 손으로 옮겨 적고 눈보라가 오기 전에 이동한다.",
              "next": "whiteout",
              "clues": [
                "call"
              ],
              "pressure": 2
            }
          }
        },
        {
          "id": "climb",
          "label": "안전 줄을 걸고 난간에 올라 반사판을 직접 돌린다",
          "intent": "move",
          "target": "mast",
          "keywords": [
            "오르",
            "난간",
            "반사판",
            "직접",
            "기둥"
          ],
          "stat": "agility",
          "dc": 13,
          "risk": "실패하면 난간에서 추락해 사망할 수 있다. 지상 단말기가 더 안전하다.",
          "outcomes": {
            "success": {
              "text": "반사판이 남쪽 지하를 향한다. 이안의 목소리가 또렷해지고 외부 구조 채널도 열린다. 조심스럽게 난간을 내려온다.",
              "next": "whiteout",
              "set": [
                "antenna_aligned"
              ],
              "clues": [
                "call",
                "map"
              ]
            },
            "mixed": {
              "text": "난간이 한 번 꺾인다. 안전 줄이 충격을 받지만 반사판은 제자리를 찾는다. 다친 팔을 감싸고 내려온다.",
              "next": "whiteout",
              "set": [
                "antenna_aligned"
              ],
              "clues": [
                "call"
              ],
              "pressure": 1,
              "harm": 1
            },
            "failure": {
              "text": "난간 고정대가 통째로 부러진다. 추락 충격이 설원을 울리고 동료들이 구조 줄을 당긴다. 남은 일행은 확보된 지하 좌표를 향해 움직여야 한다.",
              "next": "whiteout",
              "clues": [
                "map"
              ],
              "pressure": 2,
              "harm": 3
            }
          }
        }
      ],
      "dialogue": {
        "who": "이안의 신호",
        "text": "아, 이제 내 이름이 뜨는구나. 그걸 먼저 말했어야 했는데."
      },
      "details": [
        {
          "id": "protocol",
          "label": "음성 송신 규칙을 읽는다",
          "text": "전력 부족 시 가장 가까운 등록 음성을 재사용한다. 같은 목소리는 같은 사람의 증거가 아니다.",
          "clue": "call"
        }
      ]
    },
    "whiteout": {
      "id": "whiteout",
      "title": "세 발자국 앞의 세계",
      "chapter": 1,
      "location": "중계소와 지하 기지 사이",
      "art": 1,
      "mood": "tension",
      "text": [
        "눈보라가 지평선을 지운다. 이제 길은 멀리 보는 것이 아니라 세 발자국 앞을 확인하는 일이다. 이안은 지하 귀환실에 있다고 말하며 두 갈래 경로를 알려 준다.",
        "높은 케이블 길은 시야가 나쁘지만 대피소와 이어진다. 낮은 빙하 틈길에는 쓰러진 수색대원 가람의 신호가 있다. 이안은 어느 쪽도 명령하지 않는다. “내 좌표는 그대로야. 다른 사람부터 찾아도 돼.”"
      ],
      "objective": "대피 경로와 실종 수색 중 다음 우선순위를 정한다.",
      "entities": [
        {
          "id": "cable",
          "label": "대피소로 이어진 케이블",
          "kind": "place",
          "aliases": [
            "케이블",
            "대피소"
          ]
        },
        {
          "id": "crevasse",
          "label": "빙하 틈의 구조 표시",
          "kind": "place",
          "aliases": [
            "빙하",
            "틈",
            "가람"
          ]
        },
        {
          "id": "radio",
          "label": "이안의 무전 신호",
          "kind": "object",
          "aliases": [
            "이안",
            "무전"
          ]
        }
      ],
      "choices": [
        {
          "id": "cable-route",
          "label": "케이블을 따라 대피소로 향한다",
          "intent": "choose",
          "keywords": [
            "케이블",
            "대피소",
            "안전"
          ],
          "automatic": true,
          "outcomes": {
            "success": {
              "text": "서로의 안전 줄을 확인하고 케이블에 표식을 남긴다. 돌아오는 사람도 길을 찾을 수 있도록 등 뒤의 매듭을 크게 묶는다.",
              "next": "cableway"
            }
          }
        },
        {
          "id": "rescue-route",
          "label": "가람의 구조 신호가 있는 빙하 틈으로 간다",
          "intent": "choose",
          "keywords": [
            "가람",
            "빙하",
            "구조",
            "틈"
          ],
          "automatic": true,
          "outcomes": {
            "success": {
              "text": "기지에 닿는 시간을 조금 늦춘다. 무전기 안의 이안은 가람이 들을 수 있도록 같은 좌표를 반복해 준다.",
              "next": "crevasse"
            }
          }
        },
        {
          "id": "triangulate",
          "label": "이안의 응답과 지도 좌표를 대조한다",
          "intent": "investigate",
          "target": "radio",
          "keywords": [
            "지도",
            "좌표",
            "대조",
            "이안",
            "신호"
          ],
          "stat": "wit",
          "dc": 11,
          "risk": "전파 반사를 잘못 읽으면 우회 경로를 택해야 한다.",
          "outcomes": {
            "success": {
              "text": "두 길은 같은 지하 검문소로 모인다. 가람의 신호가 더 약해지고 있어 구조를 먼저 택한다.",
              "next": "crevasse",
              "set": [
                "heard_reply"
              ],
              "clues": [
                "answer",
                "map"
              ]
            },
            "mixed": {
              "text": "경로는 확인했지만 휴대 수신기 전지가 줄었다. 케이블을 길잡이 삼아 검문소로 향한다.",
              "next": "cableway",
              "clues": [
                "map"
              ],
              "pressure": 1
            },
            "failure": {
              "text": "바람이 반사 신호를 뒤섞는다. 무리하게 좌표를 믿지 않고 실제로 잡을 수 있는 케이블을 따른다.",
              "next": "cableway",
              "pressure": 1
            }
          }
        }
      ],
      "dialogue": {
        "who": "이안",
        "text": "나를 찾아오는 길이 누군가를 두고 가는 길이면 싫겠어."
      },
      "details": [
        {
          "id": "old-map",
          "label": "옛 구조 지도의 지하 연결선을 확인한다",
          "text": "케이블 길과 빙하 틈길은 지하 검문소에서 만난다. 검문소 너머에는 귀환실과 생존자 대피소가 있다.",
          "clue": "map"
        }
      ],
      "callbacks": [
        {
          "when": {
            "flag": "warmth_ready"
          },
          "text": "휴대 난방기의 온기가 장갑을 통해 전해진다. 발전기실에서 쓴 시간이 헛되지 않았다."
        }
      ]
    },
    "cableway": {
      "id": "cableway",
      "title": "빈 의자가 흔들리는 선",
      "chapter": 2,
      "location": "지하 검문소 상부 · 케이블 다리",
      "art": 1,
      "mood": "danger",
      "text": [
        "옛 케이블카의 빈 의자가 눈바람에 흔들린다. 아래 선로는 눈에 묻혔지만 정비용 발판은 지하 검문소까지 이어진다. 마지막 발판에는 뜯어진 붉은 스카프가 묶여 있다.",
        "케이블을 팽팽히 고정하면 나중에 대피소 사람들도 같은 길을 쓸 수 있다. 곧장 넘어가면 빠르지만 이 길이 계속 남아 있으리라는 보장은 없다."
      ],
      "objective": "검문소까지 건너며 뒤따를 사람의 길도 마련한다.",
      "entities": [
        {
          "id": "cable",
          "label": "느슨해진 주 케이블",
          "kind": "object",
          "aliases": [
            "케이블",
            "줄"
          ]
        },
        {
          "id": "platforms",
          "label": "얼음이 낀 정비 발판",
          "kind": "place",
          "aliases": [
            "발판",
            "다리"
          ]
        },
        {
          "id": "winch",
          "label": "고정 윈치",
          "kind": "object",
          "aliases": [
            "윈치",
            "고정"
          ]
        }
      ],
      "choices": [
        {
          "id": "secure",
          "label": "윈치로 케이블을 고정하고 안전선을 건다",
          "intent": "force",
          "target": "winch",
          "keywords": [
            "윈치",
            "고정",
            "안전선",
            "케이블",
            "당겨"
          ],
          "stat": "might",
          "dc": 12,
          "risk": "케이블이 튀면 부상을 입고 보온 시간이 줄어든다.",
          "outcomes": {
            "success": {
              "text": "윈치가 한 칸씩 잠긴다. 발판의 흔들림이 멎고 대피소까지 이어지는 길이 만들어진다. 표식을 남긴 뒤 검문소에 내려간다.",
              "next": "checkpoint",
              "set": [
                "cable_safe"
              ]
            },
            "mixed": {
              "text": "케이블이 튀어 손등을 치지만 안전선은 걸렸다. 서로의 손을 확인하며 검문소로 내려간다.",
              "next": "checkpoint",
              "set": [
                "cable_safe"
              ],
              "pressure": 1,
              "harm": 1
            },
            "failure": {
              "text": "낡은 윈치가 버티지 못한다. 튀는 케이블을 피해 보조 줄로 일행을 내린다. 이 길은 다시 쓰기 어려워졌다.",
              "next": "checkpoint",
              "pressure": 2,
              "harm": 1
            }
          }
        },
        {
          "id": "balance",
          "label": "가벼운 짐만 들고 발판을 차례로 건넌다",
          "intent": "move",
          "target": "platforms",
          "keywords": [
            "발판",
            "건너",
            "균형",
            "가볍",
            "이동"
          ],
          "stat": "agility",
          "dc": 12,
          "risk": "발판이 꺾이면 추락 충격으로 크게 다칠 수 있다.",
          "outcomes": {
            "success": {
              "text": "발판이 기울기 전에 다음 사람에게 무게를 넘긴다. 모두가 검문소 난간에 닿고 줄을 회수한다.",
              "next": "checkpoint"
            },
            "mixed": {
              "text": "중간 발판이 사라진다. 보조 줄에 매달려 건너느라 체온을 잃었지만 문 앞에 도착한다.",
              "next": "checkpoint",
              "pressure": 1
            },
            "failure": {
              "text": "발판이 무너진다. 줄이 추락을 멈추지만 충격은 피하지 못한다. 동료들이 일행을 검문소 쪽으로 끌어올린다.",
              "next": "checkpoint",
              "pressure": 2,
              "harm": 2
            }
          }
        }
      ],
      "dialogue": {
        "who": "이안",
        "text": "그 스카프는 가람 거야. 대피소 길을 표시하려고 두고 갔구나."
      },
      "details": [
        {
          "id": "marker",
          "label": "스카프 아래의 경로 표식을 본다",
          "text": "가람은 검문소와 대피소를 잇는 길을 조사했다. 안쪽 벽에 생체 복원 장치의 위치도 표시해 두었다.",
          "clue": "anchor"
        }
      ]
    },
    "crevasse": {
      "id": "crevasse",
      "title": "사람보다 무거운 배낭",
      "chapter": 2,
      "location": "빙하 균열 · 구조 표시점",
      "art": 1,
      "mood": "danger",
      "text": [
        "가람은 바위틈에 끼어 있다. 몸을 묶은 것은 암석이 아니라 등 뒤의 무거운 기록 배낭이다. 배낭 안에는 작년 실종자들의 의식 앵커 사본이 있다.",
        "가람은 배낭도 함께 꺼내 달라고 하지만, 안전선을 잡을 힘은 거의 남지 않았다. 이안의 목소리가 아주 작아진다. “사본을 잃어도 원본은 아직 있어. 사람부터.”"
      ],
      "objective": "가람을 구조하고 가능하다면 기록도 지킨다.",
      "entities": [
        {
          "id": "garam",
          "label": "갇힌 수색대원 가람",
          "kind": "person",
          "aliases": [
            "가람",
            "수색대원"
          ]
        },
        {
          "id": "pack",
          "label": "의식 앵커 사본 배낭",
          "kind": "object",
          "aliases": [
            "배낭",
            "사본",
            "기록"
          ]
        },
        {
          "id": "rope",
          "label": "구조 안전 줄",
          "kind": "object",
          "aliases": [
            "줄",
            "안전줄"
          ]
        }
      ],
      "choices": [
        {
          "id": "person-first",
          "label": "배낭 고리를 끊고 가람부터 끌어올린다",
          "intent": "help",
          "target": "garam",
          "keywords": [
            "가람",
            "먼저",
            "고리",
            "끊",
            "끌어"
          ],
          "stat": "might",
          "dc": 11,
          "risk": "구조가 늦으면 구조자도 추락 충격에 다칠 수 있다.",
          "outcomes": {
            "success": {
              "text": "고리가 끊기자 가람의 몸이 가벼워진다. 두 손이 난간을 잡고, 그녀는 자기 발로 검문소를 향해 걷는다.",
              "next": "checkpoint",
              "set": [
                "garam_safe"
              ],
              "clues": [
                "anchor"
              ]
            },
            "mixed": {
              "text": "배낭은 놓쳤지만 가람은 구했다. 서로의 체온을 나누며 검문소로 내려간다.",
              "next": "checkpoint",
              "set": [
                "garam_safe"
              ],
              "clues": [
                "anchor"
              ],
              "pressure": 1
            },
            "failure": {
              "text": "얼음턱이 내려앉는다. 보조 줄로 가람을 먼저 밀어 올리고 뒤따르다 충격을 입는다. 남은 기록은 지하 원본에서 찾아야 한다.",
              "next": "checkpoint",
              "set": [
                "garam_safe"
              ],
              "pressure": 2,
              "harm": 1
            }
          }
        },
        {
          "id": "both",
          "label": "보조 줄을 배낭에 따로 걸어 사람과 기록을 분리해 당긴다",
          "intent": "use",
          "target": "pack",
          "keywords": [
            "배낭",
            "기록",
            "둘",
            "분리",
            "보조줄"
          ],
          "stat": "agility",
          "dc": 13,
          "risk": "욕심을 내다 줄을 놓치면 치명적인 추락을 겪을 수 있다.",
          "outcomes": {
            "success": {
              "text": "사람은 첫 줄, 배낭은 두 번째 줄. 힘이 분산되자 둘 다 천천히 올라온다. 가람은 기록 사본을 여러분에게 맡긴다.",
              "next": "checkpoint",
              "set": [
                "garam_safe",
                "records_saved"
              ],
              "clues": [
                "anchor",
                "ledger"
              ]
            },
            "mixed": {
              "text": "사람은 올렸지만 사본 일부가 눈 속에 떨어진다. 남은 기록과 가람을 데리고 검문소로 이동한다.",
              "next": "checkpoint",
              "set": [
                "garam_safe"
              ],
              "clues": [
                "ledger"
              ],
              "pressure": 1,
              "harm": 1
            },
            "failure": {
              "text": "배낭을 받치던 얼음이 깨진다. 추락한 몸을 동료들이 끌어올리는 동안 기록은 아래로 사라진다. 가람은 구조됐지만 시도한 사람은 치명상을 입는다.",
              "next": "checkpoint",
              "set": [
                "garam_safe"
              ],
              "pressure": 2,
              "harm": 3
            }
          }
        }
      ],
      "dialogue": {
        "who": "가람",
        "text": "서류 가방을 목숨처럼 메지 말라고 했는데, 여기선 정말 목숨들이 들어 있더라고요."
      },
      "details": [
        {
          "id": "identity-tag",
          "label": "가람이 지닌 귀환실 안내표를 읽는다",
          "text": "귀환실은 사망 후에도 의식 신호가 남아 있는 사람을 신체 패턴으로 재구성한다. 전력과 재료가 충분해야 하며 성공이 보장되지는 않는다.",
          "clue": "anchor"
        }
      ]
    },
    "checkpoint": {
      "id": "checkpoint",
      "title": "살아 있는 사람만 통과",
      "chapter": 2,
      "location": "지하 기지 검문소",
      "art": 2,
      "mood": "mystery",
      "text": [
        "검문소의 안내문은 “살아 있는 인원만 세시오”라고 적혀 있다. 바로 아래 장치에서는 의식 앵커 열여섯 개가 사람처럼 각자의 질문을 보내고 있다. 이안의 신호는 그중 하나다.",
        "귀환 장치는 이미 사망한 사람의 신체를 다시 짤 수 있는 실험 기술이다. 치료와는 다르다. 의식 신호가 끊기기 전에 전력과 재료를 써야 한다. 관리 기록실과 복원 병동, 두 문이 안쪽으로 이어진다."
      ],
      "objective": "이곳에 남은 사람들이 누구인지 확인한다.",
      "entities": [
        {
          "id": "gate",
          "label": "생체 검문 장치",
          "kind": "object",
          "aliases": [
            "게이트",
            "검문"
          ]
        },
        {
          "id": "archive",
          "label": "관리 기록실",
          "kind": "place",
          "aliases": [
            "기록실",
            "기록"
          ]
        },
        {
          "id": "ward",
          "label": "복원 병동",
          "kind": "place",
          "aliases": [
            "병동",
            "복원",
            "귀환실"
          ]
        }
      ],
      "choices": [
        {
          "id": "records",
          "label": "관리 기록실에서 실종자 명단과 선택을 확인한다",
          "intent": "choose",
          "keywords": [
            "기록",
            "명단",
            "서랍"
          ],
          "automatic": true,
          "outcomes": {
            "success": {
              "text": "검문소의 인원 표시를 믿지 않고 기록실로 들어간다. 이안은 자기 이름이 있는 서랍 번호를 알려 준다.",
              "next": "archive"
            }
          }
        },
        {
          "id": "bodies",
          "label": "복원 병동에서 귀환 장치의 작동 상태를 확인한다",
          "intent": "choose",
          "keywords": [
            "병동",
            "몸",
            "복원",
            "장치"
          ],
          "automatic": true,
          "outcomes": {
            "success": {
              "text": "신호를 몸으로 되돌리는 장치를 먼저 살핀다. 문 안에서는 사람 모양의 투명 틀들이 조용히 빛난다.",
              "next": "ward"
            }
          }
        },
        {
          "id": "answer-names",
          "label": "앵커의 질문에 하나씩 답해 의식 신호를 안정시킨다",
          "intent": "talk",
          "target": "gate",
          "keywords": [
            "질문",
            "답",
            "이름",
            "앵커",
            "안정"
          ],
          "stat": "heart",
          "dc": 11,
          "risk": "동시에 대답하려 하면 신호가 뒤섞여 전력을 낭비한다.",
          "outcomes": {
            "success": {
              "text": "한 사람에게 한 대답. 얽히던 신호가 이름별로 정리된다. 이안은 기록실에서 자기가 남긴 거부 항목도 봐 달라고 부탁한다.",
              "next": "archive",
              "set": [
                "heard_reply",
                "anchors_protected"
              ],
              "clues": [
                "answer",
                "consent"
              ]
            },
            "mixed": {
              "text": "몇 신호는 잠시 끊겼지만 강제 초기화는 하지 않았다. 질문을 보관하고 복원 병동에서 전원을 확인한다.",
              "next": "ward",
              "set": [
                "anchors_protected"
              ],
              "clues": [
                "answer"
              ],
              "pressure": 1
            },
            "failure": {
              "text": "응답이 겹쳐 경보가 울린다. 여러분은 자동 삭제 버튼 대신 대기 모드를 눌러 신호를 보존하고 병동으로 이동한다.",
              "next": "ward",
              "set": [
                "anchors_protected"
              ],
              "pressure": 1
            }
          }
        }
      ],
      "dialogue": {
        "who": "이안",
        "text": "살아 있다고 세면 전력이 필요하니까, 그 문장을 붙였나 봐."
      },
      "details": [
        {
          "id": "anchor-guide",
          "label": "검문소의 귀환 장치 설명을 읽는다",
          "text": "육체가 사망해도 의식 앵커가 유지되면 신체 패턴 재구성이 가능하다. 부활에는 전력과 촉매가 들며 실패하면 한랭 압박이 커진다.",
          "clue": "anchor"
        }
      ],
      "resurrection": {
        "label": "의식 앵커로 사망한 동료의 육체 재구성",
        "text": "남아 있는 의식 신호를 새 신체와 잇는 사후 복원이다. 불꽃 1개와 보온 전력을 소비하며 실패하면 한랭 압박이 더 커진다.",
        "sparkCost": 1,
        "pressureCost": 2,
        "dc": 12,
        "requires": {
          "clue": "anchor"
        }
      }
    },
    "archive": {
      "id": "archive",
      "title": "돌아오지 않겠다는 서류",
      "chapter": 2,
      "location": "실종자 관리 기록실",
      "art": 2,
      "mood": "mystery",
      "text": [
        "이안의 서류에는 귀환 희망이라고 적혀 있다. 그런데 원본 음성에는 “딸에게 묻고, 나에게도 다시 물어봐 달라”는 문장이 남았다. 질문이 있는 사람까지 찬성으로 처리한 것이다.",
        "다른 서랍에는 귀환 거부, 가족에게 마지막 말만 전달, 결정을 미룸 같은 요청이 있다. 관리자는 모든 서랍을 복원 대기라는 같은 색으로 칠했다. 기록을 구한다는 것이 그들을 전부 같은 방향으로 돌려보내는 일은 아닐 수 있다."
      ],
      "objective": "남은 사람들의 서로 다른 의사를 되살린다.",
      "entities": [
        {
          "id": "files",
          "label": "실종자별 기록 서랍",
          "kind": "object",
          "aliases": [
            "서랍",
            "기록",
            "명단"
          ]
        },
        {
          "id": "voice",
          "label": "이안의 원본 음성",
          "kind": "object",
          "aliases": [
            "이안",
            "음성"
          ]
        },
        {
          "id": "terminal",
          "label": "분류 관리 단말기",
          "kind": "object",
          "aliases": [
            "단말기",
            "분류"
          ]
        }
      ],
      "choices": [
        {
          "id": "restore-choices",
          "label": "원본 음성과 대조해 동의·거부·질문을 되돌린다",
          "intent": "investigate",
          "target": "files",
          "keywords": [
            "원본",
            "동의",
            "거부",
            "대조",
            "서랍"
          ],
          "stat": "wit",
          "dc": 12,
          "risk": "복구를 서두르면 다른 사람의 선택을 잘못 연결할 수 있다.",
          "outcomes": {
            "success": {
              "text": "색 하나로 덮인 서랍들에 서로 다른 이름이 돌아온다. 복원에 동의한 사람만 대기열에 남고 나머지 요청도 보관된다.",
              "next": "transmitter",
              "set": [
                "voices_consulted",
                "anchors_protected"
              ],
              "clues": [
                "ledger",
                "consent"
              ]
            },
            "mixed": {
              "text": "대부분 복구했지만 훼손된 항목은 미정으로 남긴다. 모르는 것을 동의로 바꾸지 않은 목록을 송신실에 가져간다.",
              "next": "transmitter",
              "set": [
                "voices_consulted",
                "anchors_protected"
              ],
              "clues": [
                "ledger",
                "consent"
              ],
              "pressure": 1
            },
            "failure": {
              "text": "분류표가 서로 어긋난다. 여러분은 원본을 덮어쓰지 않고 그대로 보관해 송신실로 옮긴다. 결정은 당사자에게 다시 물어야 한다.",
              "next": "transmitter",
              "set": [
                "records_saved"
              ],
              "clues": [
                "ledger"
              ],
              "pressure": 2
            }
          }
        },
        {
          "id": "ask-ian",
          "label": "이안에게 지금도 같은 질문을 하고 싶은지 묻는다",
          "intent": "talk",
          "target": "voice",
          "keywords": [
            "이안",
            "질문",
            "묻",
            "지금",
            "대화"
          ],
          "stat": "heart",
          "dc": 11,
          "risk": "오래된 답을 재촉하면 의식 신호가 불안정해진다.",
          "outcomes": {
            "success": {
              "text": "“응. 그리고 이번에는 내 대답이 늦어도 기다려 줘.” 이안은 다른 앵커들에게 질문을 전달한다. 서로 다른 답이 돌아온다.",
              "next": "transmitter",
              "set": [
                "voices_consulted",
                "heard_reply"
              ],
              "clues": [
                "consent",
                "answer"
              ]
            },
            "mixed": {
              "text": "이안은 대답을 고르느라 잠깐 침묵한다. 여러분이 기다리자 직접 중단 신호와 귀환 신호를 구분해 보낸다.",
              "next": "transmitter",
              "set": [
                "voices_consulted"
              ],
              "clues": [
                "consent"
              ],
              "pressure": 1
            },
            "failure": {
              "text": "이안의 채널이 약해진다. 여러분은 대답을 대신 쓰지 않고 질문을 저장한다. 송신실에서 개별 채널을 살려야 한다.",
              "next": "transmitter",
              "set": [
                "anchors_protected"
              ],
              "clues": [
                "answer"
              ],
              "pressure": 2
            }
          }
        }
      ],
      "dialogue": {
        "who": "이안",
        "text": "살려 줬다는 말이 싫다는 게 아냐. 나도 그 말의 주어에 들어가고 싶어."
      },
      "details": [
        {
          "id": "original-list",
          "label": "원본의 귀환 선택 항목을 읽는다",
          "text": "원본에는 동의·거부·추가 질문이 나뉘어 있다. 관리자의 일괄 변환 기록은 본인의 선택을 대신할 수 없다.",
          "clue": "ledger"
        }
      ]
    },
    "ward": {
      "id": "ward",
      "title": "두 번째 몸의 사용 설명서",
      "chapter": 2,
      "location": "생체 복원 병동",
      "art": 2,
      "mood": "tension",
      "text": [
        "투명한 복원 틀에는 이름이 아니라 번호가 붙어 있다. 아직 작동하지 않은 틀은 빈 의자처럼 보인다. 전력이 들어오면 의식 앵커와 신체 패턴을 잇고, 그 과정은 단순한 응급 처치로 되돌릴 수 없다.",
        "설명서에는 신체 재구성보다 정지 요청 처리에 더 작은 글씨가 쓰였다. 시작 단추는 바깥에 있고 멈춤 단추는 없었다. 가람의 수첩에는 안쪽에도 손잡이를 달라는 요구가 반복돼 있다."
      ],
      "objective": "복원 장치를 안정시키고 귀환자의 제어권을 확보한다.",
      "entities": [
        {
          "id": "cradle",
          "label": "생체 복원 틀",
          "kind": "object",
          "aliases": [
            "틀",
            "복원",
            "기계"
          ]
        },
        {
          "id": "control",
          "label": "외부 시작 제어기",
          "kind": "object",
          "aliases": [
            "제어기",
            "단추"
          ]
        },
        {
          "id": "notebook",
          "label": "가람의 정비 수첩",
          "kind": "object",
          "aliases": [
            "수첩",
            "메모"
          ]
        }
      ],
      "choices": [
        {
          "id": "inside-control",
          "label": "귀환자도 멈출 수 있는 제어 회로를 연결한다",
          "intent": "use",
          "target": "control",
          "keywords": [
            "제어",
            "멈",
            "회로",
            "연결",
            "중단"
          ],
          "stat": "wit",
          "dc": 12,
          "risk": "오배선은 복원 틀의 전력을 낭비하고 다칠 위험이 있다.",
          "outcomes": {
            "success": {
              "text": "의식 앵커에서 오는 중단 신호가 시작 회로보다 우선한다. 이안이 시험 신호를 보내자 틀이 즉시 멎고, 다시 허락했을 때만 켜진다.",
              "next": "transmitter",
              "set": [
                "return_control",
                "anchors_protected"
              ],
              "clues": [
                "consent",
                "anchor"
              ]
            },
            "mixed": {
              "text": "제어는 연결했지만 한 복원 틀을 부품으로 써야 했다. 동시에 돌아올 수 있는 수가 줄어든 대신 멈출 권한은 생겼다.",
              "next": "transmitter",
              "set": [
                "return_control"
              ],
              "clues": [
                "consent"
              ],
              "pressure": 1
            },
            "failure": {
              "text": "낡은 제어기가 불꽃을 뿜는다. 여러분은 모든 자동 시작을 끄고 의식 앵커만 따로 보관한다. 귀환은 송신실에서 다시 준비해야 한다.",
              "next": "transmitter",
              "set": [
                "anchors_protected"
              ],
              "clues": [
                "anchor"
              ],
              "pressure": 2,
              "harm": 1
            }
          }
        },
        {
          "id": "stabilize",
          "label": "보온 회로와 복원 회로의 부하를 나눠 조정한다",
          "intent": "use",
          "target": "cradle",
          "keywords": [
            "보온",
            "부하",
            "조정",
            "전력",
            "나눠"
          ],
          "stat": "wit",
          "dc": 11,
          "risk": "실패하면 병동의 여분 전지가 모두 소모된다.",
          "outcomes": {
            "success": {
              "text": "복원 틀 하나씩 차례로 켜면 보온을 끊을 필요가 없다. 사람을 되살리기 위해 살아 있는 사람을 얼리는 계산을 멈춘다.",
              "next": "transmitter",
              "set": [
                "power_shared"
              ],
              "clues": [
                "power",
                "anchor"
              ]
            },
            "mixed": {
              "text": "부하는 나눴지만 틀의 속도를 줄여야 한다. 더 오래 기다려야 해도 보온 회로는 유지된다.",
              "next": "transmitter",
              "set": [
                "power_shared"
              ],
              "clues": [
                "power"
              ],
              "pressure": 1
            },
            "failure": {
              "text": "축전지 하나가 꺼진다. 여러분은 자동 재구성을 중지하고 현재 남은 전력을 표시한 뒤 송신실로 이동한다.",
              "next": "transmitter",
              "clues": [
                "power"
              ],
              "pressure": 2
            }
          }
        }
      ],
      "dialogue": {
        "who": "가람의 수첩",
        "text": "“돌아오게 해 줌”과 “돌아오기로 함” 사이에 손잡이 하나는 있어야 한다."
      },
      "details": [
        {
          "id": "revival-manual",
          "label": "귀환 절차의 제한을 확인한다",
          "text": "사망한 동료의 신체 패턴과 이어진 의식 앵커가 있어야 한다. 촉매와 전력을 소비하며, 실패해도 사용한 자원은 돌아오지 않는다.",
          "clue": "anchor"
        }
      ],
      "resurrection": {
        "label": "의식 앵커로 사망한 동료의 육체 재구성",
        "text": "남아 있는 의식 신호를 새 신체와 잇는 사후 복원이다. 불꽃 1개와 보온 전력을 소비하며 실패하면 한랭 압박이 더 커진다.",
        "sparkCost": 1,
        "pressureCost": 2,
        "dc": 12,
        "requires": {
          "clue": "anchor"
        }
      }
    },
    "transmitter": {
      "id": "transmitter",
      "title": "모두를 부르는 한 목소리",
      "chapter": 3,
      "location": "지하 주 송신실",
      "art": 2,
      "mood": "danger",
      "text": [
        "거대한 송신기는 모든 앵커의 목소리를 하나로 합쳐 바깥으로 보낸다. 누가 돌아오고 싶고 누가 쉬고 싶은지는 지워진다. 높은 출력의 구조 신호 뒤에서 개별 사람의 말은 잡음 취급을 받는다.",
        "회로를 세 갈래로 나누면 현재 구조 요청, 귀환 승인, 중단 의사를 따로 전할 수 있다. 단일 송신을 유지하면 바깥의 배에 빨리 닿지만, 살아 있는 사람과 앵커가 남긴 선택이 다시 섞인다."
      ],
      "objective": "안전한 구조 신호를 보내면서 각자의 답을 보존한다.",
      "entities": [
        {
          "id": "splitter",
          "label": "송신 분배판",
          "kind": "object",
          "aliases": [
            "분배판",
            "회로"
          ]
        },
        {
          "id": "broadcast",
          "label": "주 구조 송신기",
          "kind": "object",
          "aliases": [
            "송신기",
            "방송"
          ]
        },
        {
          "id": "shelter",
          "label": "대피소 연결문",
          "kind": "place",
          "aliases": [
            "대피소",
            "문"
          ]
        }
      ],
      "choices": [
        {
          "id": "split",
          "label": "송신을 세 갈래로 나누어 현재 구조 요청을 보낸다",
          "intent": "use",
          "target": "splitter",
          "keywords": [
            "세",
            "분배",
            "회로",
            "나눠",
            "구조"
          ],
          "stat": "wit",
          "dc": 13,
          "risk": "실패하면 전력 충격으로 일행 모두 다치고 온기가 급격히 줄어든다.",
          "outcomes": {
            "success": {
              "text": "세 표시등이 각자 켜진다. 바깥 구조대가 현재 위치에 답하고, 이안의 질문은 자기 이름을 지닌 채 남는다.",
              "next": "relay",
              "set": [
                "rescue_sent",
                "return_control"
              ],
              "clues": [
                "channel"
              ]
            },
            "mixed": {
              "text": "분리는 성공했지만 고출력 안테나가 과열된다. 대피소 회로를 잠깐 빌려 냉각해야 한다.",
              "next": "shelter",
              "set": [
                "rescue_sent"
              ],
              "clues": [
                "channel"
              ],
              "pressure": 1
            },
            "failure": {
              "text": "분배판에서 충격파가 터져 일행을 넘어뜨린다. 자동 차단기가 켜져 큰 폭발은 막았지만 난방이 꺼졌다. 대피소에서 온기부터 회복해야 한다.",
              "next": "shelter",
              "pressure": 2,
              "harmAll": 2
            }
          }
        },
        {
          "id": "low-power",
          "label": "전력을 낮추고 외부 구조대와 직접 대화한다",
          "intent": "talk",
          "target": "broadcast",
          "keywords": [
            "낮춰",
            "구조대",
            "대화",
            "저출력",
            "직접"
          ],
          "stat": "heart",
          "dc": 11,
          "risk": "느린 전송 동안 한랭 전선이 더 가까워진다.",
          "outcomes": {
            "success": {
              "text": "“녹음이 아니라 지금 이야기하는 사람입니다.” 구조대가 질문하고 여러분이 답한다. 현재 위치와 인원이 정확히 전달된다.",
              "next": "relay",
              "set": [
                "rescue_sent"
              ],
              "clues": [
                "channel"
              ]
            },
            "mixed": {
              "text": "위치는 전달했지만 통화가 길어져 난방 전지가 줄었다. 대피소에서 기다릴 사람들을 먼저 확인한다.",
              "next": "shelter",
              "set": [
                "rescue_sent"
              ],
              "pressure": 1
            },
            "failure": {
              "text": "외부 구조대는 신호를 자동 방송으로 오해한다. 여러분은 송출을 멈추지 않고 대피소의 수동 안테나로 이동한다.",
              "next": "shelter",
              "pressure": 2
            }
          }
        },
        {
          "id": "shelter-first",
          "label": "대피소의 사람들을 확인한 뒤 송신을 이어 간다",
          "intent": "choose",
          "keywords": [
            "대피소",
            "사람",
            "확인",
            "먼저"
          ],
          "automatic": true,
          "outcomes": {
            "success": {
              "text": "신호의 숫자만 보고 인원을 확정하지 않는다. 주 송신기는 대기 모드로 두고 따뜻한 빛이 새는 문으로 향한다.",
              "next": "shelter"
            }
          }
        }
      ],
      "dialogue": {
        "who": "이안",
        "text": "우리를 크게 부르는 것보다, 우리 말이 따로 들렸으면 좋겠어."
      },
      "details": [
        {
          "id": "channels",
          "label": "송신 회로의 세 종류 신호를 확인한다",
          "text": "구조 위치, 귀환 승인, 중단 기록은 서로 다른 신호다. 하나를 보낸다고 다른 둘에 동의한 것은 아니다.",
          "clue": "channel"
        },
        {
          "id": "return-port",
          "label": "송신실의 비상 귀환 포트를 확인한다",
          "text": "의식 앵커와 신체 패턴을 잇는 비상 복원 틀이다. 사망한 동료에게 새 육체를 제공할 수 있으나 촉매와 난방 전력이 든다.",
          "clue": "anchor"
        }
      ],
      "callbacks": [
        {
          "when": {
            "flag": "return_control"
          },
          "text": "병동에서 연결한 중단 회로가 살아 있다. 귀환 대기열의 사람들이 자기 신호를 직접 멈출 수 있다."
        }
      ],
      "resurrection": {
        "label": "의식 앵커로 사망한 동료의 육체 재구성",
        "text": "남아 있는 의식 신호를 새 신체와 잇는 사후 복원이다. 불꽃 1개와 보온 전력을 소비하며 실패하면 한랭 압박이 더 커진다.",
        "sparkCost": 1,
        "pressureCost": 2,
        "dc": 12,
        "requires": {
          "clue": "anchor"
        }
      }
    },
    "shelter": {
      "id": "shelter",
      "title": "아직 따뜻한 자리",
      "chapter": 3,
      "location": "지하 대피소 · 공용 난방실",
      "art": 2,
      "mood": "calm",
      "text": [
        "대피소에는 네 명의 관리 인력이 담요를 두르고 있다. 그들은 앵커를 끄면 전력을 아낄 수 있다는 말을 듣고 손에 삭제 승인서를 들고 있었다. 누구도 아직 서명하지 않았다.",
        "발전기를 낮은 출력으로 나눠 쓰면 난방과 개별 송신을 함께 유지할 수 있다. 대신 자동으로 모든 사람을 빨리 귀환시키겠다는 약속은 포기해야 한다. 서두르지 않는 구조도 구조일 수 있다."
      ],
      "objective": "현재의 생존과 남아 있는 의식을 모두 계산에 넣는다.",
      "entities": [
        {
          "id": "keepers",
          "label": "대피소 관리 인력",
          "kind": "person",
          "aliases": [
            "관리자",
            "사람",
            "관리 인력"
          ]
        },
        {
          "id": "heater",
          "label": "공용 난방 제어기",
          "kind": "object",
          "aliases": [
            "난방",
            "발전기"
          ]
        },
        {
          "id": "paper",
          "label": "앵커 삭제 승인서",
          "kind": "object",
          "aliases": [
            "승인서",
            "종이"
          ]
        }
      ],
      "choices": [
        {
          "id": "share-power",
          "label": "낮은 출력으로 난방과 송신을 나눠 유지한다",
          "intent": "use",
          "target": "heater",
          "keywords": [
            "난방",
            "나눠",
            "전력",
            "출력",
            "유지"
          ],
          "stat": "wit",
          "dc": 11,
          "risk": "배분을 잘못하면 일행 모두 저체온 피해를 입는다. 이미 다친 동료는 사망할 수 있다.",
          "outcomes": {
            "success": {
              "text": "난방이 약해졌지만 꺼지지는 않는다. 앵커의 개별 신호도 남는다. 관리 인력은 담요를 한 겹 더 두르고 대피 준비를 시작한다.",
              "next": "relay",
              "set": [
                "power_shared",
                "anchors_protected"
              ],
              "clues": [
                "power"
              ]
            },
            "mixed": {
              "text": "배분은 됐지만 예비 발열팩을 모두 나눠야 했다. 여러분은 구조대의 응답을 기다릴 온기를 함께 확보한다.",
              "next": "relay",
              "set": [
                "power_shared"
              ],
              "pressure": 1
            },
            "failure": {
              "text": "난방이 잠깐 꺼진다. 모두가 서로의 손을 감싸고 휴대 난방기를 모은다. 몸의 열을 잃었지만 앵커를 지우지 않고 수동 중계실로 이동한다.",
              "next": "relay",
              "set": [
                "anchors_protected"
              ],
              "pressure": 2,
              "harmAll": 1
            }
          }
        },
        {
          "id": "no-delete",
          "label": "관리 인력에게 삭제 대신 개별 대기를 제안한다",
          "intent": "talk",
          "target": "keepers",
          "keywords": [
            "관리",
            "설득",
            "삭제",
            "대기",
            "제안"
          ],
          "stat": "heart",
          "dc": 11,
          "risk": "설득이 길어지면 대피 준비 시간이 줄어든다.",
          "outcomes": {
            "success": {
              "text": "승인서를 뒤집어 각자의 대답을 기다리는 목록을 만든다. 관리 인력 한 명이 마지막까지 중계기를 맡겠다고 자원한다.",
              "next": "relay",
              "set": [
                "anchors_protected",
                "voices_consulted"
              ],
              "clues": [
                "consent"
              ]
            },
            "mixed": {
              "text": "전원이 확신하지는 못하지만 즉시 삭제에는 모두 반대한다. 대기 목록을 남기고 구조대가 올 때까지 함께 버티기로 한다.",
              "next": "relay",
              "set": [
                "anchors_protected"
              ],
              "clues": [
                "consent"
              ],
              "pressure": 1
            },
            "failure": {
              "text": "말만으로 전력 걱정을 없앨 수 없다. 여러분은 승인서를 찢는 대신 보류 시간을 적는다. 그 안에 수동 중계실에서 답을 받아야 한다.",
              "next": "relay",
              "pressure": 1
            }
          }
        }
      ],
      "dialogue": {
        "who": "대피소 관리인",
        "text": "서명을 안 했다고 겁쟁이인 줄 알았어요. 아직 묻고 싶은 게 있었던 건데."
      },
      "details": [
        {
          "id": "power-split",
          "label": "최소 전력 운전표를 읽는다",
          "text": "난방과 개별 송신은 함께 유지할 수 있다. 광역 자동 방송과 대량 동시 복원을 멈추면 필요한 여유가 생긴다.",
          "clue": "power"
        }
      ]
    },
    "relay": {
      "id": "relay",
      "title": "모르는 대답도 보관하기",
      "chapter": 3,
      "location": "수동 중계실 · 북향 안테나",
      "art": 2,
      "mood": "tension",
      "text": [
        "수동 중계실의 작은 창으로 오로라가 보인다. 외부 구조대는 맑아지는 틈을 타 접근하겠다고 답한다. 남은 일은 어떤 신호와 기록을 밖으로 가져갈지 정하는 것이다.",
        "이안은 자기 질문을 다시 보낸다. 이번에는 여러분의 목소리가 아니라, 잡음 속에서도 알아들을 수 있는 자기 음색이다. “내 대답이 바뀌어도 기록을 고칠 수 있을까?”"
      ],
      "objective": "구조를 확정하고 마지막 결정의 근거를 모은다.",
      "entities": [
        {
          "id": "radio",
          "label": "수동 구조 무전기",
          "kind": "object",
          "aliases": [
            "무전기",
            "구조대"
          ]
        },
        {
          "id": "anchors",
          "label": "이름별 의식 앵커",
          "kind": "object",
          "aliases": [
            "앵커",
            "이안",
            "이름"
          ]
        },
        {
          "id": "recorder",
          "label": "휴대 기록 장치",
          "kind": "object",
          "aliases": [
            "기록",
            "사본"
          ]
        }
      ],
      "choices": [
        {
          "id": "listen-all",
          "label": "앵커마다 귀환·대기·중단 의사를 다시 확인한다",
          "intent": "talk",
          "target": "anchors",
          "keywords": [
            "앵커",
            "귀환",
            "대기",
            "중단",
            "묻",
            "이안"
          ],
          "stat": "heart",
          "dc": 12,
          "risk": "응답을 기다리는 동안 구조 여유 시간이 줄어든다.",
          "outcomes": {
            "success": {
              "text": "돌아오겠다는 말, 기다려 달라는 말, 여기서 끝내겠다는 말이 각각 저장된다. 이안은 지금은 기다리겠다고 답하고 그 답을 직접 수정할 수 있게 된다.",
              "next": "decision",
              "set": [
                "voices_consulted",
                "return_control"
              ],
              "clues": [
                "consent",
                "channel"
              ]
            },
            "mixed": {
              "text": "모든 응답을 받지는 못했다. 모르는 항목은 대기로 남기고 받은 대답만 확정한다. 시간이 줄었지만 아무의 허락도 꾸미지 않았다.",
              "next": "decision",
              "set": [
                "voices_consulted",
                "return_control"
              ],
              "clues": [
                "consent"
              ],
              "pressure": 1
            },
            "failure": {
              "text": "눈보라가 채널을 끊는다. 여러분은 마지막까지 확인된 기록만 저장하고 미확인 신호에 강제 귀환을 걸지 않는다.",
              "next": "decision",
              "set": [
                "records_saved"
              ],
              "pressure": 2
            }
          }
        },
        {
          "id": "rescue-confirm",
          "label": "현재 위치와 생존 인원을 구조대에 재확인한다",
          "intent": "talk",
          "target": "radio",
          "keywords": [
            "구조",
            "위치",
            "이름",
            "인원",
            "무전"
          ],
          "stat": "heart",
          "dc": 10,
          "risk": "교신이 끊기면 표식 조명으로 구조대를 기다려야 한다.",
          "outcomes": {
            "success": {
              "text": "구조대가 여러분이 말한 이름을 하나씩 되읽는다. 위치와 인원, 지하 접근 경로까지 확인됐다.",
              "next": "decision",
              "set": [
                "rescue_sent"
              ],
              "clues": [
                "channel"
              ]
            },
            "mixed": {
              "text": "인원은 전달됐지만 헬기가 바로 접근하지 못한다. 대피소에서 기다릴 좌표를 다시 표시한다.",
              "next": "decision",
              "set": [
                "rescue_sent"
              ],
              "pressure": 1
            },
            "failure": {
              "text": "음성이 끊긴다. 여러분은 위치를 반복 송신하도록 고정하고 표식 조명을 켠다. 구조대가 올 때까지 견딜 선택을 해야 한다.",
              "next": "decision",
              "pressure": 1
            }
          }
        },
        {
          "id": "archive-copy",
          "label": "확인된 기록을 여러 장치에 나눠 보관한다",
          "intent": "choose",
          "keywords": [
            "기록",
            "사본",
            "보관",
            "복사"
          ],
          "automatic": true,
          "outcomes": {
            "success": {
              "text": "한 장치가 꺼져도 누군가의 마지막 대답이 사라지지 않게 한다. 각 사본에는 확인된 시각과 수정할 권리가 함께 기록된다.",
              "next": "decision",
              "set": [
                "records_saved"
              ],
              "clues": [
                "ledger"
              ]
            }
          }
        }
      ],
      "dialogue": {
        "who": "이안",
        "text": "한 번 대답했다고 영원히 같은 사람이 되어야 하는 건 아니잖아."
      },
      "details": [
        {
          "id": "last-request",
          "label": "이안의 마지막 수정 요청을 확인한다",
          "text": "그는 귀환을 즉시 원하지 않는다. 기다릴 권리와 나중에 생각을 바꿀 권리를 요청한다.",
          "clue": "consent"
        }
      ]
    },
    "decision": {
      "id": "decision",
      "title": "돌아온다는 말의 주인",
      "chapter": 3,
      "location": "북향 출구 · 마지막 송신 제어대",
      "art": 3,
      "mood": "calm",
      "text": [
        "출구 너머의 눈발이 조금 옅어졌다. 북쪽 하늘에 움직이는 빛이 보인다. 구조 요청이 확인됐다면 탐조등일 것이고, 아직 답을 받지 못했다면 표식과 송신을 유지하며 기다려야 한다. 기지를 떠나기 전, 주 송신기와 의식 앵커의 운용 방식을 정해야 한다.",
        "광역 장치를 끄고 확인된 기록만 보존할 수도 있다. 귀환 희망자의 신호를 구조대에 넘기며 시설을 유지할 수도 있다. 각자의 뜻을 확인했다면 시작과 중단을 당사자가 고르는 더 작은 귀환망으로 바꾸는 길도 있다."
      ],
      "objective": "누가 귀환의 시작과 끝을 정할지 결정한다.",
      "entities": [
        {
          "id": "power",
          "label": "주 송신 전원",
          "kind": "object",
          "aliases": [
            "전원",
            "송신기"
          ]
        },
        {
          "id": "records",
          "label": "보존된 앵커 기록",
          "kind": "object",
          "aliases": [
            "기록",
            "앵커"
          ]
        },
        {
          "id": "return-panel",
          "label": "귀환 제어대",
          "kind": "object",
          "aliases": [
            "제어",
            "귀환"
          ]
        }
      ],
      "choices": [
        {
          "id": "sleep",
          "label": "광역 장치를 멈추고 앵커를 안전한 대기 상태로 보존한다",
          "intent": "choose",
          "keywords": [
            "멈",
            "대기",
            "보존",
            "전원"
          ],
          "automatic": true,
          "outcomes": {
            "success": {
              "text": "자동 귀환 명령을 모두 멈춘다. 기록은 삭제하지 않고 독립 보관 장치에 옮긴다. 누구도 지금 즉시 돌아오도록 떠밀리지 않는다.",
              "next": "ending-silence"
            }
          }
        },
        {
          "id": "beacon",
          "label": "귀환 희망자의 구조 신호를 외부 구조대에 넘긴다",
          "intent": "choose",
          "keywords": [
            "구조대",
            "넘겨",
            "귀환",
            "신호"
          ],
          "automatic": true,
          "outcomes": {
            "success": {
              "text": "확인된 귀환 요청과 미확인 기록을 구분해 구조대에 전달한다. 기지는 낮은 출력으로 남고, 사람들은 돌아올 절차를 함께 검토하기 시작한다.",
              "next": "ending-beacon"
            }
          }
        },
        {
          "id": "self-rule",
          "label": "시작과 중단을 각자가 선택하는 귀환망으로 바꾼다",
          "intent": "choose",
          "keywords": [
            "각자",
            "선택",
            "중단",
            "제어권"
          ],
          "automatic": true,
          "outcomes": {
            "success": {
              "text": "각 앵커의 허락과 거부가 장치의 제어권이 된다. 이안은 자기 채널을 대기 상태로 바꾸고 처음으로 조용한 잠을 선택한다.",
              "next": "ending-choice"
            }
          },
          "requires": {
            "flag": "voices_consulted",
            "clue": "consent"
          }
        }
      ],
      "dialogue": {
        "who": "이안",
        "text": "어느 쪽이든, 네 목소리는 이제 돌려줄게. 내 말은 내 이름으로 남겨 줘."
      },
      "callbacks": [
        {
          "when": {
            "flag": "rescue_sent"
          },
          "text": "구조대가 현재 위치와 인원을 확인했다. 출구의 표식에 응답하는 빛이 보인다."
        },
        {
          "when": {
            "flag": "return_control"
          },
          "text": "중단 신호가 시작 명령보다 우선하도록 회로가 바뀌었다. 적어도 강제 귀환은 더 이상 자동으로 일어나지 않는다."
        },
        {
          "when": {
            "notFlag": "rescue_sent"
          },
          "text": "구조대의 응답을 아직 직접 확인하지 못했다. 기지의 표식등과 반복 위치 송신을 켜 둔 채 대피소에서 접근을 기다린다."
        }
      ]
    },
    "ending-silence": {
      "id": "ending-silence",
      "title": "조용해진 하늘 아래",
      "chapter": 4,
      "location": "에필로그",
      "art": 3,
      "mood": "hope",
      "ending": true,
      "text": [
        "광역 안테나의 불빛이 꺼진다. 처음으로 설원의 밤이 바람 소리만 낸다. 앵커의 기록은 지워지지 않고 구조대의 독립 보관함에 들어간다. 언젠가 다시 묻기로 한 질문에 날짜를 적어 둔다.",
        "돌아오는 수송기 안에서 무전기는 다른 사람의 목소리를 흉내 내지 않는다. 여러분이 자기 이름을 말하면 옆자리에서 대답이 돌아온다. 모든 일을 끝내지는 못했지만, 끝내지 않은 일을 끝난 것처럼 처리하지도 않았다."
      ],
      "epilogues": [
        {
          "when": {
            "flag": "records_saved"
          },
          "text": "여러 장치에 나눠 둔 기록 덕분에 보관함 하나의 고장으로 사람의 마지막 요청이 사라지지는 않는다."
        },
        {
          "when": {
            "flag": "garam_safe"
          },
          "text": "가람은 새 구조 지도에 대피소와 귀환 거부 절차를 모두 넣는다. 구조는 같은 방향으로 데려오는 일만이 아니었다."
        },
        {
          "when": {
            "flag": "warmth_ready"
          },
          "text": "오두막에 남겨 둔 보온 전력은 뒤늦게 도착한 구조 인력도 지켜 준다. 첫 선택의 온기가 오래 남는다."
        }
      ],
      "question": "누군가의 결정을 기다리기로 한 것은 책임을 미룬 일일까요, 책임을 지킨 일일까요?",
      "choices": []
    },
    "ending-beacon": {
      "id": "ending-beacon",
      "title": "여기, 돌아오려는 사람이 있다",
      "chapter": 4,
      "location": "에필로그",
      "art": 3,
      "mood": "hope",
      "ending": true,
      "text": [
        "낮은 출력의 송신기가 한 사람씩 이름을 부른다. 구조대는 귀환 희망자의 요청부터 확인하고, 대기와 거부 기록을 별도로 보존한다. 빠른 기적이라는 홍보 문구 대신 복원 실패와 동의 절차가 적힌 설명서가 붙는다.",
        "첫 귀환자는 자기 이름을 천천히 말한다. 박수는 그가 원한다고 말한 뒤에야 시작된다. 이안은 아직 대기 중이다. 그의 신호 옆에는 미완료가 아니라 “본인이 기다리기로 함”이라는 문장이 생겼다."
      ],
      "epilogues": [
        {
          "when": {
            "flag": "power_shared"
          },
          "text": "개별 송신과 난방을 함께 유지한 설계가 새 운용 기준이 된다. 돌아올 사람을 위해 현재의 사람을 얼리지 않는다."
        },
        {
          "when": {
            "flag": "anchors_protected"
          },
          "text": "삭제하지 않은 앵커 가운데 뒤늦게 대답을 보낸 사람이 있다. 그 응답을 받을 자리도 남아 있었다."
        },
        {
          "when": {
            "flag": "return_control"
          },
          "text": "멈춤 제어를 먼저 연결한 덕분에 모든 복원 절차는 당사자가 중단할 수 있게 된다."
        }
      ],
      "question": "사람을 되돌릴 기술이 있다면, 기술보다 먼저 준비해야 할 것은 무엇일까요?",
      "choices": []
    },
    "ending-choice": {
      "id": "ending-choice",
      "title": "내 목소리로 하는 대답",
      "chapter": 4,
      "location": "에필로그",
      "art": 3,
      "mood": "hope",
      "ending": true,
      "text": [
        "작은 귀환망에는 일괄 시작 단추가 없다. 돌아오기를 택한 사람, 더 기다릴 사람, 여기서 끝낼 사람이 각각 자기 채널을 가진다. 한 사람의 대답이 다른 사람의 결정을 덮지 않는다.",
        "봄이 와서 중계소의 눈이 녹을 때 이안의 메시지가 도착한다. “딸과 얘기했어. 이제 돌아가 보고 싶어.” 여러분은 그의 목소리를 처음 듣는 것처럼 끝까지 듣는다. 그날의 대답이 영원할 필요는 없다는 규칙도 함께 남겨 둔다."
      ],
      "epilogues": [
        {
          "when": {
            "flag": "voices_consulted"
          },
          "text": "확인되지 않은 항목은 끝까지 미정으로 남겼다. 빈칸을 정직하게 남긴 기록이 새 귀환망의 출발점이다."
        },
        {
          "when": {
            "flag": "garam_safe"
          },
          "text": "가람은 귀환자를 만나면 먼저 어디로 가고 싶은지 묻는다. 지도에 없는 대답도 적을 수 있게 여백을 넓혀 뒀다."
        },
        {
          "when": {
            "flag": "records_saved"
          },
          "text": "보존된 사본에는 이전 답도 남지만 현재 답을 수정할 권한이 우선한다. 사람은 기록보다 계속 달라질 수 있다."
        }
      ],
      "question": "오늘 여러분은 상대가 듣고 싶은 답을 받았나요, 상대가 고른 답을 들었나요?",
      "choices": []
    }
  },
  "deathEnding": {
    "title": "눈 위에 남은 호출부호",
    "text": [
      "마지막 동료의 의식 신호가 흔들리며 체온계가 멎는다. 기지에는 복원 장치가 있지만 그것을 작동시킬 사람이 남아 있지 않다. 무전기는 여러분의 호출부호만 조용히 반복한다.",
      "눈이 길 위의 발자국을 덮는다. 훗날 이곳에 도착할 구조대가 무엇을 발견할지는 아직 알 수 없다. 이번 일행은 마지막 선택을 직접 내리지 못한 채 설원의 기록 속에 남는다."
    ],
    "art": 2,
    "mood": "danger",
    "question": "어떤 순간에 빠른 길 대신 온기와 안전선을 남겼다면 달라졌을까요?"
  }
};
