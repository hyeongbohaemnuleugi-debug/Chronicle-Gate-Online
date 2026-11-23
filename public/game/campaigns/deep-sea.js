// Original scenario for Chronicle Gate v14. Edit nodes, clues and outcome edges below.
export default {
  "id": "deep-sea",
  "title": "해저 기지의 마지막 방송",
  "subtitle": "구조 신호는 죽은 사람의 목소리로 온다",
  "genre": "심해 구조 · SF 미스터리",
  "accent": "#6dc7c6",
  "description": "폐쇄 명령이 내려진 해저 기지에서 구조 방송이 도착했다. 방송의 주인공은 이미 사망한 의사, 구조를 기다리는 것은 아직 이름도 없는 생명이다.",
  "estimatedMinutes": "35–60",
  "contentNotes": [
    "수몰과 사망 위험",
    "사망 후 생체 복원",
    "생존과 생태의 선택"
  ],
  "objective": "온도0 기지의 생존자를 찾아 수면으로 돌아간다.",
  "art": "deep-sea",
  "pressureLabel": "격벽 압력",
  "pressureMax": 8,
  "start": "deck",
  "roles": [
    {
      "title": "구조 잠수사",
      "secret": "출항 직전 본사의 음성 명령을 들었다. “직원은 회수하되 수조는 파기할 것.” 구조대장에게는 뒷부분이 전달되지 않았다.",
      "goal": "구조 대상의 기준을 동료들과 직접 정한다.",
      "reveal": "본사는 인명 구조와 별개로 수조 파기를 지시했다. 현장에는 아직 이유가 알려지지 않았다.",
      "epilogues": [
        {
          "when": {
            "flag": "survivors_ready"
          },
          "text": "잠수사의 현장 기록에는 정규 직원과 명단 밖 사람을 구분하지 않고 구조한 흔적이 남는다. 다음 구조 지침의 첫 줄이 그 원칙으로 바뀐다."
        },
        {
          "when": {
            "notFlag": "survivors_ready"
          },
          "text": "잠수사의 기록에는 명단과 현장이 일치하지 않는다는 경고가 남는다. 누가 구조 대상으로 집계되는지 다시 확인해야 할 이유가 된다."
        }
      ]
    },
    {
      "title": "음향 연구원",
      "secret": "구조 방송에는 사람의 성대가 만들지 못하는 여섯 번째 배음이 있다. 예전에 동료 하람이 보여 준 미분류 생물의 신호와 같다.",
      "goal": "방송의 뜻을 확인한 뒤 공개 여부를 결정한다.",
      "reveal": "하람의 목소리 뒤에는 여섯 박자의 다른 신호가 겹쳐 있다. 녹음 오류로 단정할 수 없다.",
      "epilogues": [
        {
          "when": {
            "flag": "voice_trusted"
          },
          "text": "음향 기록에 남은 여섯 번째 박자는 잡음 대신 응답으로 분류된다. 사람 목소리만 의사소통으로 인정하던 연구 질문이 달라진다."
        },
        {
          "when": {
            "notFlag": "voice_trusted"
          },
          "text": "음향 기록에는 해석하지 못한 여섯 번째 박자가 남는다. 이해하지 못한 소리를 위험으로 단정해도 되는지 후속 연구가 묻는다."
        }
      ]
    },
    {
      "title": "구호 담당자",
      "secret": "폐쇄 기지에서 온 개인 메시지를 숨겼다. “엄마한테 야간 근무라고 해 줘.” 발신자는 직원 명단에 없는 연수생 은재다.",
      "goal": "명단에 없다는 이유로 누구도 남겨 두지 않는다.",
      "reveal": "직원 명단 밖의 연수생 은재가 기지에 있다. 정해진 구조 인원수를 믿으면 안 된다.",
      "epilogues": [
        {
          "when": {
            "flag": "names_known"
          },
          "text": "은재와 미연의 이름을 확인한 기록 덕분에 비정규 인력도 구조 집계에 포함해야 한다는 요청이 남는다. 이름을 묻는 작은 행동이 절차가 된다."
        },
        {
          "when": {
            "notFlag": "names_known"
          },
          "text": "명단의 빈칸을 의심한 구호 메모가 보관된다. 숫자만 맞는 집계로 구조가 끝났다고 선언할 수 없다는 질문이 이어진다."
        }
      ]
    },
    {
      "title": "보험 조사원",
      "secret": "탑승 전 확인한 사고 계약서에는 기지의 자산보다 ‘음성 패턴의 소유권’에 큰 금액이 걸려 있었다.",
      "goal": "사고의 책임을 사람 대신 숫자에 떠넘기지 못하게 한다.",
      "reveal": "회사가 비싸게 보장받은 것은 장비보다 기지에서 수집한 음성 패턴이다.",
      "epilogues": [
        {
          "when": {
            "flag": "evidence_public"
          },
          "text": "공개된 원본은 음성 소유권보다 생존자의 권리를 먼저 검토하게 만든다. 보험 조사 기록에도 장비 손실과 사람의 선택이 따로 적힌다."
        },
        {
          "when": {
            "notFlag": "evidence_public"
          },
          "text": "조사 기록에는 계약으로 계산되지 않는 피해와 책임이 남는다. 공개 여부와 별개로, 어떤 값이 빠졌는지 확인할 자료가 된다."
        }
      ]
    }
  ],
  "clues": {
    "recall": {
      "title": "중단된 구조 요청",
      "text": "기지는 열두 시간 전 구조를 요청했다. 본사는 데이터 회수 완료까지 출항을 미뤘다."
    },
    "rhythm": {
      "title": "여섯 박자의 신호",
      "text": "방송 뒤의 낮은 소리는 펌프의 여섯 박자와 정확히 맞는다. 마지막 박자를 응답하면 수조의 빛이 진정된다."
    },
    "patient": {
      "title": "감염이 아닌 저체온",
      "text": "팔의 발광 흔적은 피부에 묻은 공생체다. 감염 검사는 음성이고, 체온을 높이면 빛은 자연히 사라진다."
    },
    "names": {
      "title": "명단 밖의 이름들",
      "text": "연수생 은재와 야간 청소원 미연이 정규 직원 명단에 빠져 있다. 기지의 실제 인원은 등록 인원보다 두 명 많다."
    },
    "echo": {
      "title": "하람의 마지막 문장",
      "text": "사망한 의사 하람의 “숨 쉬어도 돼요”를 수조 생물들이 반복한다. 이 말은 실험 지시가 아니라 구조 당시의 위로였다."
    },
    "consent": {
      "title": "멈출 수 있는 대답",
      "text": "수조 생물은 여섯 번째 박자를 끊어 접촉 거부를 표시한다. 동의와 거부를 구분할 수 있다."
    },
    "ballast": {
      "title": "분리형 부력 설계",
      "text": "보육 수조는 독립 압력 용기다. 반응로를 분리하면 수조와 거주 구획을 함께 상승시킬 수 있다."
    },
    "proof": {
      "title": "원본 사고 기록",
      "text": "회사는 수압 이상을 알고도 음성 복제 실험을 계속했다. 원본 기록에는 중단 요청과 책임자의 서명이 함께 남아 있다."
    },
    "cycle": {
      "title": "응답형 순환 지도",
      "text": "기지의 순환관은 명령을 반복하는 대신 수조의 응답을 기다리도록 바꾸면 안정된다. 공존 상승 절차에 필요한 지도다."
    },
    "restore": {
      "title": "온빛 생체 복원 기록",
      "text": "온빛 수조는 접안 게이트가 보관한 신체·의식 패턴을 토대로 사망한 동료를 재구성하는 실험 장치다. 일반 치료와 달리 촉매와 압력 여유를 소비하며 실패할 수 있다."
    }
  },
  "flags": {
    "crew_ready": "잠수팀과 안전 신호를 맞췄다",
    "cargo_damage": "화물 통로의 수동 밸브를 희생했다",
    "medic_saved": "저체온 환자들을 보온했다",
    "nursery_safe": "보육 수조를 파괴하지 않았다",
    "names_known": "누락된 두 사람의 위치를 확인했다",
    "voice_trusted": "하람의 목소리를 내는 생명과 응답했다",
    "pressure_stable": "반응로와 수조의 순환을 분리했다",
    "evidence_public": "사고 원본을 외부에 전송했다",
    "evidence_private": "사고 원본을 휴대 기록기에 보관했다",
    "survivors_ready": "생존자들이 상승 구획에 모였다",
    "rescue_cost": "구조 과정에서 부력 예비통을 소비했다"
  },
  "nodes": {
    "deck": {
      "id": "deck",
      "title": "열두 시간 늦은 출항",
      "chapter": 1,
      "location": "구조선 소금비 · 후갑판",
      "art": 0,
      "mood": "mystery",
      "text": [
        "새벽 두 시, 바다는 잉크처럼 평평하다. 구조선 난간 아래에서 주황색 잠수종이 파도에 한 번 부딪힌다. 무전기에서는 같은 문장이 흘러나온다. “여기는 온도0. 누구라도, 숨 쉬어도 돼요.”",
        "그 목소리의 주인인 의사 하람은 열두 시간 전 사망 처리됐다. 선장은 잠수종과 화물 투입구 중 어느 쪽으로 진입할지 묻는다. 기지 도면에는 대피 완료 도장이 찍혔지만, 수신기의 생체 신호는 아직 여러 개다."
      ],
      "objective": "안전하게 기지에 진입할 통로를 정한다.",
      "entities": [
        {
          "id": "bell",
          "label": "잠수종",
          "kind": "object",
          "aliases": [
            "잠수정"
          ]
        },
        {
          "id": "recorder",
          "label": "구조선 기록기",
          "kind": "object",
          "aliases": [
            "기록",
            "로그"
          ]
        },
        {
          "id": "captain",
          "label": "선장 누리",
          "kind": "person",
          "aliases": [
            "선장",
            "누리"
          ]
        }
      ],
      "choices": [
        {
          "id": "brief",
          "label": "누리와 진입 신호를 맞추고 잠수종을 내린다",
          "intent": "talk",
          "target": "captain",
          "keywords": [
            "누리",
            "선장",
            "신호",
            "잠수종",
            "합의"
          ],
          "stat": "heart",
          "dc": 10,
          "risk": "신호가 맞지 않으면 잠수종이 기지 외벽에 걸린다.",
          "outcomes": {
            "success": {
              "text": "누리가 당신의 손짓을 따라 한다. 두 번 당기면 정지, 세 번이면 회수. 서로의 얼굴을 확인한 잠수팀이 함께 내려간다.",
              "next": "bell",
              "set": [
                "crew_ready"
              ]
            },
            "mixed": {
              "text": "수신기에 잡음이 남지만 비상 신호는 합의했다. 잠수종은 보조 배터리 한 칸을 쓰며 하강한다.",
              "next": "bell",
              "set": [
                "crew_ready"
              ],
              "pressure": 1
            },
            "failure": {
              "text": "하강 중 통신이 끊긴다. 누리는 합의한 정지 신호 대신 화물구 표시등을 켠다. 당신들은 가까운 투입구로 몸을 옮긴다.",
              "next": "cargo",
              "pressure": 2
            }
          }
        },
        {
          "id": "winch",
          "label": "화물 투입구로 이어진 인양줄을 탄다",
          "intent": "move",
          "target": "bell",
          "keywords": [
            "화물",
            "줄",
            "인양",
            "빠르게",
            "타고"
          ],
          "stat": "agility",
          "dc": 11,
          "risk": "빠른 진입 대신 낡은 화물 밸브를 손상할 수 있다.",
          "outcomes": {
            "success": {
              "text": "몸을 작게 접자 인양줄이 외벽의 좁은 틈을 통과한다. 본사의 잠금 장치가 없는 수동 진입구가 나타난다.",
              "next": "cargo"
            },
            "mixed": {
              "text": "장비 가방이 걸려 줄을 한 번 끊어야 한다. 필요한 도구만 안고 화물 진입구에 도착한다.",
              "next": "cargo",
              "pressure": 1
            },
            "failure": {
              "text": "인양줄이 난간에 걸린다. 누리가 잠수종으로 여러분을 회수하지만, 기지의 침수 경보가 한 단계 높아진다.",
              "next": "bell",
              "pressure": 2
            }
          }
        }
      ],
      "dialogue": {
        "who": "누리",
        "text": "명단보다 눈앞의 사람을 세자. 살아 있는 사람이 있으면 구조야."
      },
      "details": [
        {
          "id": "log",
          "label": "구조선의 출항 기록을 읽는다",
          "text": "첫 출항 허가가 내려온 것은 열두 시간 전이다. 취소 사유 칸에는 “자료 수집 계속”이라는 짧은 문장만 있다.",
          "clue": "recall"
        },
        {
          "id": "bio-pass",
          "label": "잠수팀 생체 등록표를 본다",
          "text": "기지 접안용 표에는 신체와 의식 패턴의 임시 보관 항목이 있다. 기지의 온빛 수조와 연결된 복원 실험용 등록이다.",
          "clue": "restore"
        }
      ]
    },
    "bell": {
      "id": "bell",
      "title": "창밖에서 손짓하는 빛",
      "chapter": 1,
      "location": "잠수종 · 기지 접안부",
      "art": 0,
      "mood": "tension",
      "text": [
        "잠수종 유리창에 손바닥 크기의 빛이 붙는다. 다섯 번 깜빡이고 멈춘다. 겁먹은 장비는 경고음을 내지만 빛은 유리를 두드리지 않는다.",
        "접안 레버가 절반에서 멎었다. 안쪽 문 너머에는 “바깥 문 먼저 잠그세요”라는 손글씨가 물에 번지고 있다. 누군가 아직 이 문을 사용했다."
      ],
      "objective": "접안 압력을 맞추고 거주 구획으로 들어간다.",
      "entities": [
        {
          "id": "lever",
          "label": "접안 레버",
          "kind": "object",
          "aliases": [
            "레버",
            "문"
          ]
        },
        {
          "id": "light",
          "label": "여섯 박자의 빛",
          "kind": "object",
          "aliases": [
            "빛",
            "수조 생물"
          ]
        }
      ],
      "choices": [
        {
          "id": "answer",
          "label": "마지막 박자에 손전등을 깜빡여 응답한다",
          "intent": "use",
          "target": "light",
          "keywords": [
            "손전등",
            "박자",
            "빛",
            "응답",
            "깜빡"
          ],
          "stat": "wit",
          "dc": 11,
          "risk": "응답 주기가 어긋나면 압력 조절에 시간이 더 든다.",
          "outcomes": {
            "success": {
              "text": "여섯 번째 빛을 돌려주자 창밖 무리가 물러난다. 수압계의 바늘이 안정되고 레버가 저절로 끝까지 내려간다.",
              "next": "commons",
              "set": [
                "voice_trusted"
              ],
              "clues": [
                "rhythm"
              ]
            },
            "mixed": {
              "text": "두 번의 시도 끝에 박자가 맞는다. 수압계는 안정됐지만 접안용 산소통 하나를 비워야 했다.",
              "next": "commons",
              "set": [
                "voice_trusted"
              ],
              "clues": [
                "rhythm"
              ],
              "pressure": 1
            },
            "failure": {
              "text": "빛이 빠르게 흩어지며 접안부를 떠난다. 누리는 수동 감압을 택한다. 귀가 먹먹해질 즈음 거주 구획 문이 열린다.",
              "next": "commons",
              "pressure": 2
            }
          }
        },
        {
          "id": "crank",
          "label": "비상 손잡이를 함께 돌려 접안한다",
          "intent": "force",
          "target": "lever",
          "keywords": [
            "레버",
            "손잡이",
            "돌",
            "밀",
            "강제로"
          ],
          "stat": "might",
          "dc": 11,
          "risk": "강제로 열다 축이 튀면 부상을 입고 접안부를 다시 쓸 수 없다.",
          "outcomes": {
            "success": {
              "text": "손잡이가 세 번 울고 문이 맞물린다. 잠수종을 돌아갈 길로 남겨 둔 채 기지 안으로 들어간다.",
              "next": "commons"
            },
            "mixed": {
              "text": "문은 열렸지만 비상 손잡이가 부러진다. 귀환할 때는 기지의 상승 구획을 써야 한다.",
              "next": "commons",
              "set": [
                "rescue_cost"
              ],
              "pressure": 1
            },
            "failure": {
              "text": "손잡이 축이 꺾인다. 누리가 마지막 남은 외부 유압을 밀어 넣어 문을 열고, 잠수종을 기지에 고정한다.",
              "next": "commons",
              "set": [
                "rescue_cost"
              ],
              "pressure": 2,
              "harm": 1
            }
          }
        }
      ],
      "dialogue": {
        "who": "누리",
        "text": "빛이 공격하는 건 아닌 것 같은데. 겁먹은 건 우리 장비 쪽이야."
      },
      "details": [
        {
          "id": "pattern",
          "label": "창문에 맺힌 빛의 주기를 센다",
          "text": "다섯 번의 짧은 빛 뒤에는 같은 길이의 빈자리가 있다. 기지 펌프는 그 빈자리에서 여섯 번째 소리를 낸다.",
          "clue": "rhythm"
        }
      ]
    },
    "cargo": {
      "id": "cargo",
      "title": "물속의 우편함",
      "chapter": 1,
      "location": "기지 화물 투입구",
      "art": 0,
      "mood": "tension",
      "text": [
        "투입구 안에는 배달되지 못한 생일 케이크 상자가 떠 있다. “은재야, 첫 월급 축하해.” 방수 잉크는 선명한데 수령인 이름은 직원 명단에 없다.",
        "바닥의 비상 밸브를 돌리면 내측 문을 열 수 있다. 그 옆에는 외부에서 관찰하도록 만든 작은 점검창이 있다. 안쪽의 누군가가 창에 붉은 장갑을 붙였다."
      ],
      "objective": "투입구를 배수하고 안쪽 생존자의 신호를 확인한다.",
      "entities": [
        {
          "id": "valve",
          "label": "비상 배수 밸브",
          "kind": "object",
          "aliases": [
            "밸브",
            "배수"
          ]
        },
        {
          "id": "window",
          "label": "붉은 장갑이 보이는 점검창",
          "kind": "object",
          "aliases": [
            "창",
            "장갑"
          ]
        },
        {
          "id": "parcel",
          "label": "케이크 상자",
          "kind": "object",
          "aliases": [
            "상자",
            "케이크"
          ]
        }
      ],
      "choices": [
        {
          "id": "drain",
          "label": "밸브를 지렛대로 돌려 물을 뺀다",
          "intent": "force",
          "target": "valve",
          "keywords": [
            "밸브",
            "지렛대",
            "물",
            "돌",
            "배수"
          ],
          "stat": "might",
          "dc": 11,
          "risk": "밸브가 부러지면 역류에 부상을 입고 통로를 포기해야 한다.",
          "outcomes": {
            "success": {
              "text": "물이 소용돌이치며 빠지고 내측 문이 드러난다. 붉은 장갑의 주인은 청소원 미연이다. 그녀가 안에서 문을 받친다.",
              "next": "commons",
              "set": [
                "names_known"
              ],
              "clues": [
                "names"
              ]
            },
            "mixed": {
              "text": "물을 빼는 데 성공했지만 밸브 손잡이가 부러졌다. 미연은 뒤쪽 격벽을 닫고 여러분을 안내한다.",
              "next": "commons",
              "set": [
                "names_known",
                "cargo_damage"
              ],
              "clues": [
                "names"
              ],
              "pressure": 1
            },
            "failure": {
              "text": "밸브가 꺾이며 물이 역류한다. 미연이 청소용 에어백을 밀어 넣는다. 구명용 공기를 소비하고서야 내측 문을 통과한다.",
              "next": "commons",
              "set": [
                "cargo_damage",
                "rescue_cost"
              ],
              "pressure": 2,
              "harm": 1
            }
          }
        },
        {
          "id": "tap",
          "label": "점검창을 두드려 안쪽 사람과 순서를 맞춘다",
          "intent": "talk",
          "target": "window",
          "keywords": [
            "두드",
            "창",
            "장갑",
            "미연",
            "신호"
          ],
          "stat": "heart",
          "dc": 10,
          "risk": "신호가 잘못 전달되면 상대가 먼저 내측 문을 열 수 있다.",
          "outcomes": {
            "success": {
              "text": "세 번 두드리자 안쪽에서도 세 번 돌아온다. “미연”이라는 이름표가 창을 스친다. 두 문을 차례대로 닫고 조용히 거주실에 닿는다.",
              "next": "commons",
              "set": [
                "names_known"
              ],
              "clues": [
                "names"
              ]
            },
            "mixed": {
              "text": "첫 신호가 잘못 전달돼 물이 조금 샌다. 미연은 당신의 손짓을 다시 확인하고 이번에는 정확히 문을 닫는다.",
              "next": "commons",
              "set": [
                "names_known"
              ],
              "clues": [
                "names"
              ],
              "pressure": 1
            },
            "failure": {
              "text": "점검창의 조명이 꺼진다. 미연은 응답 대신 비상 통로의 문을 열어 두고 물러난다. 젖은 계단을 기어 거주 구획에 도착한다.",
              "next": "commons",
              "pressure": 2
            }
          }
        }
      ],
      "dialogue": {
        "who": "문 너머의 미연",
        "text": "청소원이니까 마지막에 나오라더군요. 그런데 마지막 사람이 둘이더라고요."
      },
      "details": [
        {
          "id": "recipient",
          "label": "케이크 상자의 수령인을 확인한다",
          "text": "은재는 기지 연수생이고 미연은 외주 청소원이다. 두 사람은 직원용 대피 집계에서 빠져 있다.",
          "clue": "names"
        }
      ]
    },
    "commons": {
      "id": "commons",
      "title": "식당의 빈 의자 두 개",
      "chapter": 1,
      "location": "거주 구획 · 공용 식당",
      "art": 1,
      "mood": "mystery",
      "text": [
        "식당의 테이블에는 배급 컵 열두 개가 놓여 있다. 벽의 전자 게시판은 생존자 열 명이라고 표시한다. 미연은 남은 두 컵을 떼어 내지 못하게 손으로 감싼다.",
        "의무실 쪽에서는 기침이, 수조실 쪽에서는 하람의 목소리가 들린다. 두 문 사이에서 소장 백연이 서 있다. 그는 “감염 의심자와 위험 시료부터 분리하자”고 말하며 수조실 열쇠를 움켜쥔다."
      ],
      "objective": "먼저 사람을 치료할지, 방송의 근원을 확인할지 정한다.",
      "entities": [
        {
          "id": "director",
          "label": "소장 백연",
          "kind": "person",
          "aliases": [
            "소장",
            "백연"
          ]
        },
        {
          "id": "infirmary",
          "label": "의무실 문",
          "kind": "place",
          "aliases": [
            "의무실"
          ]
        },
        {
          "id": "nursery",
          "label": "보육 수조실 문",
          "kind": "place",
          "aliases": [
            "수조",
            "보육실"
          ]
        }
      ],
      "choices": [
        {
          "id": "patients",
          "label": "기침하는 사람들을 먼저 살피러 의무실로 간다",
          "intent": "choose",
          "keywords": [
            "의무실",
            "환자",
            "치료"
          ],
          "automatic": true,
          "outcomes": {
            "success": {
              "text": "미연이 두 개의 컵을 들고 따라온다. 소장은 말없이 의무실 문을 열어 준다.",
              "next": "infirmary"
            }
          }
        },
        {
          "id": "key",
          "label": "백연을 설득해 보육 수조실 열쇠를 받는다",
          "intent": "talk",
          "target": "director",
          "keywords": [
            "소장",
            "백연",
            "열쇠",
            "설득",
            "수조실"
          ],
          "stat": "heart",
          "dc": 12,
          "risk": "설득하지 못하면 소장이 먼저 시료 봉쇄를 실행한다.",
          "outcomes": {
            "success": {
              "text": "“감염이라면 기록부터 봐야 합니다.” 백연은 반박하지 못하고 열쇠를 건넨다. 수조실의 빛은 문이 열리자 천천히 낮아진다.",
              "next": "hydroponics"
            },
            "mixed": {
              "text": "백연은 동행을 조건으로 열쇠를 준다. 그의 봉쇄용 기폭기가 수조실까지 함께 들어온다.",
              "next": "hydroponics",
              "pressure": 1
            },
            "failure": {
              "text": "백연이 열쇠를 숨기며 의무실 쪽으로 물러난다. 먼저 진단 기록을 확보해야 그의 격리 주장을 반박할 수 있다.",
              "next": "infirmary",
              "pressure": 1
            }
          }
        }
      ],
      "dialogue": {
        "who": "미연",
        "text": "두 명은 어디에 있느냐고 물어 주세요. 몇 명이 남았느냐 말고요."
      },
      "details": [
        {
          "id": "roster",
          "label": "컵과 전자 명단을 비교한다",
          "text": "의무실에는 아홉 명, 소장은 식당에 있다. 미연과 펌프실의 은재는 별도로 세어야 한다.",
          "clue": "names"
        }
      ],
      "callbacks": [
        {
          "when": {
            "flag": "names_known"
          },
          "text": "이미 누락된 두 사람의 이름을 알고 있다. 미연은 자기 이름이 다시 불리자 어깨를 조금 편다."
        }
      ]
    },
    "infirmary": {
      "id": "infirmary",
      "title": "감염이라는 편리한 이름",
      "chapter": 2,
      "location": "저체온 치료실",
      "art": 1,
      "mood": "calm",
      "text": [
        "간호사 도윤은 램프 대신 보온 담요를 들고 있다. 환자의 손목에서 희미한 푸른 빛이 번지지만, 혈액 검사지는 모두 음성이다. 한 환자가 춥다고 말하자 소장은 한 걸음 뒤로 물러난다.",
        "가장 나이가 어린 환자는 자기 손을 등 뒤로 숨긴다. 그 손에서 하람의 목소리가 아주 작게 흘러나온다. “괜찮아. 숨 쉬어도 돼요.” 도윤은 소독제가 아니라 따뜻한 물을 찾는다.",
        "한쪽의 온빛 수조는 치료 장비가 아니다. 접안 게이트가 보관한 신체·의식 패턴으로 사망한 동료를 재구성하는 실험 장치다. 성공해도 수조 촉매와 기지의 압력 여유가 줄어든다."
      ],
      "objective": "위험의 정체를 확인하고 환자들을 이동할 수 있게 만든다.",
      "entities": [
        {
          "id": "doyun",
          "label": "간호사 도윤",
          "kind": "person",
          "aliases": [
            "도윤",
            "간호사"
          ]
        },
        {
          "id": "blankets",
          "label": "보온 담요와 온수통",
          "kind": "object",
          "aliases": [
            "담요",
            "온수"
          ]
        },
        {
          "id": "tests",
          "label": "혈액 검사 기록",
          "kind": "object",
          "aliases": [
            "검사",
            "기록"
          ]
        }
      ],
      "choices": [
        {
          "id": "warm",
          "label": "담요와 온수를 나눠 저체온 환자를 보온한다",
          "intent": "help",
          "target": "blankets",
          "keywords": [
            "담요",
            "보온",
            "온수",
            "도와",
            "치료"
          ],
          "stat": "heart",
          "dc": 10,
          "risk": "사람들을 안정시키지 못하면 이동 준비가 늦어진다.",
          "outcomes": {
            "success": {
              "text": "“빛나는 손도 담요 안으로 넣어요.” 그 말에 환자가 웃는다. 체온이 오르자 빛이 가라앉고, 사람들은 스스로 걸을 준비를 한다.",
              "next": "archive",
              "set": [
                "medic_saved",
                "survivors_ready"
              ],
              "clues": [
                "patient"
              ]
            },
            "mixed": {
              "text": "환자들은 안정됐지만 온수가 부족하다. 여러분의 보조 발열팩까지 나눠 주고 기록실로 향한다.",
              "next": "archive",
              "set": [
                "medic_saved"
              ],
              "clues": [
                "patient"
              ],
              "pressure": 1
            },
            "failure": {
              "text": "냉각 관이 터져 온수통을 잃는다. 도윤은 환자들을 두 명씩 붙여 앉히고 당신에게 사고 기록을 가져와 달라고 요청한다.",
              "next": "archive",
              "clues": [
                "patient"
              ],
              "pressure": 2
            }
          }
        },
        {
          "id": "diagnose",
          "label": "검사 기록으로 소장의 감염 주장을 따져 묻는다",
          "intent": "investigate",
          "target": "tests",
          "keywords": [
            "검사",
            "기록",
            "진단",
            "감염",
            "분석"
          ],
          "stat": "wit",
          "dc": 11,
          "risk": "논쟁이 길어지면 환자들의 보온 시간이 줄어든다.",
          "outcomes": {
            "success": {
              "text": "빛은 피부 표면에만 있다. 감염 판정을 뒷받침하는 검사는 하나도 없다. 백연은 봉쇄 이유가 본사의 지시였음을 인정한다.",
              "next": "archive",
              "clues": [
                "patient",
                "proof"
              ]
            },
            "mixed": {
              "text": "검사의 모순은 밝혀지지만 백연은 승인 절차를 핑계로 시간을 끈다. 도윤이 기록 사본을 당신 주머니에 넣는다.",
              "next": "archive",
              "clues": [
                "patient"
              ],
              "pressure": 1
            },
            "failure": {
              "text": "보존 상태가 나빠 일부 수치가 지워졌다. 도윤이 직접 환자를 진찰해 감염이 아니라는 소견을 적어 준다. 증거를 보강하려면 중앙 기록이 필요하다.",
              "next": "archive",
              "clues": [
                "patient"
              ],
              "pressure": 1
            }
          }
        }
      ],
      "dialogue": {
        "who": "도윤",
        "text": "모르는 생물이라고 해서 환자를 먼저 위험물로 부르면 안 돼요."
      },
      "details": [
        {
          "id": "last-note",
          "label": "하람이 남긴 진료 메모를 읽는다",
          "text": "마지막 메모는 “전염 없음. 떼어 내려고 하지 말 것. 저체온부터 치료.” 세 문장이다.",
          "clue": "patient"
        },
        {
          "id": "restoration",
          "label": "온빛 수조의 복원 제한을 읽는다",
          "text": "사망한 신체와 의식 패턴을 다시 잇는 실험 절차다. 의식 신호와 패턴이 남아 있는 동료에게만 시도하며 실패해도 촉매는 소모된다.",
          "clue": "restore"
        }
      ],
      "resurrection": {
        "label": "온빛 수조로 사망한 동료 재구성",
        "text": "온빛이 보관된 신체·의식 패턴을 다시 엮는다. 불꽃 1개와 압력 여유를 쓰며, 실패해도 지불한 자원은 돌아오지 않는다.",
        "sparkCost": 1,
        "pressureCost": 2,
        "dc": 12,
        "requires": {
          "clue": "restore"
        }
      }
    },
    "hydroponics": {
      "id": "hydroponics",
      "title": "목소리를 배우는 수조",
      "chapter": 2,
      "location": "광생물 보육실",
      "art": 1,
      "mood": "mystery",
      "text": [
        "수조 안의 빛들이 사람 얼굴만 한 간격으로 모였다 흩어진다. 하람의 목소리는 스피커가 아니라 수조 표면을 따라 움직인다. 그녀가 사망한 시각 이후의 문장은 하나도 없다.",
        "작은 수조에는 “이름 없음”이라는 라벨이 붙어 있다. 옆의 검은 단추에는 시료 소각이라고 적혀 있다. 백연은 단추를 가리키지만, 빛들은 여러분의 손전등을 따라 물결을 만든다.",
        "보육실 안쪽에는 같은 원리의 온빛 복원 틀이 있다. 죽음을 치료로 바꾸는 장치가 아니라, 남은 신체·의식 패턴으로 새 육체를 짓는 한정된 재구성 기술이다."
      ],
      "objective": "생명이 의사를 표현하는지 확인하고 보육실의 운명을 정한다.",
      "entities": [
        {
          "id": "nursery",
          "label": "이름 없는 보육 수조",
          "kind": "object",
          "aliases": [
            "수조",
            "생물",
            "빛"
          ]
        },
        {
          "id": "console",
          "label": "소각과 순환 제어판",
          "kind": "object",
          "aliases": [
            "제어판",
            "단추"
          ]
        },
        {
          "id": "director",
          "label": "소장 백연",
          "kind": "person",
          "aliases": [
            "백연",
            "소장"
          ]
        }
      ],
      "choices": [
        {
          "id": "listen",
          "label": "한 번 빛을 보내고 수조가 답할 때까지 기다린다",
          "intent": "wait",
          "target": "nursery",
          "keywords": [
            "빛",
            "질문",
            "응답",
            "기다",
            "대화"
          ],
          "stat": "wit",
          "dc": 11,
          "risk": "기다림이 잘못되면 순환 펌프가 과부하된다.",
          "outcomes": {
            "success": {
              "text": "여섯 번째 박자에 수조가 한 번 빛난다. 두 번째 질문에는 불을 끈다. 예와 아니오가 생겼다. 백연은 소각 단추에서 손을 뗀다.",
              "next": "archive",
              "set": [
                "nursery_safe",
                "voice_trusted"
              ],
              "clues": [
                "consent",
                "echo"
              ]
            },
            "mixed": {
              "text": "응답은 확인했지만 오랫동안 펌프를 멈춰 둬야 했다. 빛들은 당신의 마지막 질문에 짧게 답한다. “아직.”",
              "next": "archive",
              "set": [
                "nursery_safe"
              ],
              "clues": [
                "consent",
                "echo"
              ],
              "pressure": 1
            },
            "failure": {
              "text": "제어판이 응답을 잡음으로 처리한다. 소각 회로만 빼낸 뒤 수조를 수동 순환에 맡긴다. 하람의 마지막 말이 등 뒤에서 계속된다.",
              "next": "archive",
              "set": [
                "nursery_safe"
              ],
              "clues": [
                "echo"
              ],
              "pressure": 2
            }
          }
        },
        {
          "id": "disconnect",
          "label": "소각 회로를 분리하고 독립 전원을 연결한다",
          "intent": "use",
          "target": "console",
          "keywords": [
            "회로",
            "전원",
            "분리",
            "선",
            "단추"
          ],
          "stat": "agility",
          "dc": 12,
          "risk": "잘못된 선을 자르면 보육실 순환까지 끊긴다.",
          "outcomes": {
            "success": {
              "text": "붉은 선이 아니라 소각 신호를 보내는 얇은 회색 선을 뽑는다. 독립 전원이 켜지고 수조가 고른 여섯 박자로 진정한다.",
              "next": "archive",
              "set": [
                "nursery_safe"
              ],
              "clues": [
                "rhythm"
              ]
            },
            "mixed": {
              "text": "순환이 잠깐 멈춘다. 예비 전지를 모두 연결하자 빛이 돌아온다. 소각 명령은 이제 이 방까지 올 수 없다.",
              "next": "archive",
              "set": [
                "nursery_safe",
                "rescue_cost"
              ],
              "pressure": 1
            },
            "failure": {
              "text": "회로가 붙어 있어 깔끔한 분리가 불가능하다. 제어판 전체를 떼어 내고 백연에게 수동 펌프를 맡긴다. 그는 처음으로 무언가를 살리는 일을 한다.",
              "next": "archive",
              "set": [
                "nursery_safe"
              ],
              "pressure": 2
            }
          }
        }
      ],
      "dialogue": {
        "who": "백연",
        "text": "목소리를 흉내 내는 것과 대답하는 건… 다르다는 말입니까?"
      },
      "details": [
        {
          "id": "recordings",
          "label": "수조의 음성 기록을 듣는다",
          "text": "하람의 목소리는 구조 당시의 문장만 반복한다. 명령에 복종하는 소리가 아니라 안전했던 순간을 기억하는 소리다.",
          "clue": "echo"
        },
        {
          "id": "restore-frame",
          "label": "복원 틀의 등록 상태를 확인한다",
          "text": "접안 게이트에 등록된 잠수팀의 패턴이 남아 있다. 사망한 동료를 되돌리려면 수조 촉매와 압력 여유를 써야 한다.",
          "clue": "restore"
        }
      ],
      "resurrection": {
        "label": "온빛 수조로 사망한 동료 재구성",
        "text": "온빛이 보관된 신체·의식 패턴을 다시 엮는다. 불꽃 1개와 압력 여유를 쓰며, 실패해도 지불한 자원은 돌아오지 않는다.",
        "sparkCost": 1,
        "pressureCost": 2,
        "dc": 12,
        "requires": {
          "clue": "restore"
        }
      }
    },
    "archive": {
      "id": "archive",
      "title": "사고 보고서의 빈칸",
      "chapter": 2,
      "location": "중앙 기록실",
      "art": 1,
      "mood": "mystery",
      "text": [
        "방수 서류철의 첫 장에는 사고 원인이 미정이라고 적혔다. 그 아래에는 사고 사흘 전부터 올라온 펌프 중단 요청 아홉 건이 끼워져 있다. 모든 반려 사유가 같다. “음성 패턴 채집을 우선한다.”",
        "단말기에 두 개의 비상 경로가 남아 있다. 통신실을 되살리면 외부에 증거를 보낼 수 있다. 부력 제어실을 열면 갇힌 은재를 끌어낼 수 있다. 양쪽 문은 서로 다른 복도로 이어진다."
      ],
      "objective": "기록을 확보하고 다음 구조 우선순위를 정한다.",
      "entities": [
        {
          "id": "terminal",
          "label": "사고 기록 단말기",
          "kind": "object",
          "aliases": [
            "단말",
            "기록",
            "컴퓨터"
          ]
        },
        {
          "id": "signal",
          "label": "통신실 표시등",
          "kind": "place",
          "aliases": [
            "통신실"
          ]
        },
        {
          "id": "ballast",
          "label": "부력 제어실 표시등",
          "kind": "place",
          "aliases": [
            "부력실",
            "은재"
          ]
        }
      ],
      "choices": [
        {
          "id": "copy",
          "label": "원본 서명을 복사한 뒤 통신실로 간다",
          "intent": "investigate",
          "target": "terminal",
          "keywords": [
            "원본",
            "서명",
            "복사",
            "기록",
            "통신"
          ],
          "stat": "wit",
          "dc": 11,
          "risk": "복사가 지연되면 통신실의 비상 전력이 줄어든다.",
          "outcomes": {
            "success": {
              "text": "수정 이력까지 담긴 원본이 휴대 기록기에 내려온다. 책임자의 서명 아래에 하람의 반대 의견도 남아 있다.",
              "next": "signal",
              "set": [
                "evidence_private"
              ],
              "clues": [
                "proof"
              ]
            },
            "mixed": {
              "text": "원본을 복사했지만 통신 연결 시간을 놓쳤다. 예비 안테나를 직접 정렬해야 한다.",
              "next": "signal",
              "set": [
                "evidence_private"
              ],
              "clues": [
                "proof"
              ],
              "pressure": 1
            },
            "failure": {
              "text": "본사 접속이 기록을 삭제하기 시작한다. 마지막 남은 서명 페이지를 인쇄하고 통신실로 달려간다.",
              "next": "signal",
              "clues": [
                "recall"
              ],
              "pressure": 2
            }
          }
        },
        {
          "id": "rescue",
          "label": "기록실의 지도를 챙기고 은재가 있는 부력실로 간다",
          "intent": "choose",
          "keywords": [
            "은재",
            "구조",
            "부력",
            "지도"
          ],
          "automatic": true,
          "outcomes": {
            "success": {
              "text": "한 사람의 구조를 먼저 택한다. 지도에는 보육 수조가 독립 압력 용기라는 표시가 있다.",
              "next": "ballast",
              "clues": [
                "ballast"
              ]
            }
          }
        },
        {
          "id": "pressure-map",
          "label": "고장 경로를 분석해 안전한 부력 통로를 찾는다",
          "intent": "investigate",
          "target": "terminal",
          "keywords": [
            "지도",
            "고장",
            "순환",
            "분석",
            "통로"
          ],
          "stat": "wit",
          "dc": 12,
          "risk": "분석이 어긋나면 이미 잠긴 계단에 시간을 쓴다.",
          "outcomes": {
            "success": {
              "text": "반응로의 열은 수조가 아니라 역류 관에서 새고 있다. 관을 분리하면 두 구획을 함께 띄울 수 있다.",
              "next": "ballast",
              "clues": [
                "cycle",
                "ballast"
              ]
            },
            "mixed": {
              "text": "완전한 지도는 복구하지 못했지만 역류 관의 위치는 찾았다. 부력실로 가는 가장 짧은 길을 표시한다.",
              "next": "ballast",
              "clues": [
                "cycle"
              ],
              "pressure": 1
            },
            "failure": {
              "text": "지도에 없는 막힌 격벽을 만난다. 물이 빠지는 소리를 따라 우회하자 은재의 손전등이 보인다.",
              "next": "ballast",
              "pressure": 2
            }
          }
        }
      ],
      "dialogue": {
        "who": "미연",
        "text": "청소 기록에도 같은 누수가 있어요. 고장 난 건 기계만이 아니었네."
      },
      "details": [
        {
          "id": "signatures",
          "label": "중단 요청의 서명들을 읽는다",
          "text": "하람과 은재는 세 번이나 실험 중단을 요구했다. 본사 승인 계정은 세 번 모두 요청을 반려했다.",
          "clue": "proof"
        }
      ],
      "callbacks": [
        {
          "when": {
            "flag": "medic_saved"
          },
          "text": "도윤이 무전으로 환자들의 체온이 오르고 있다고 알려 온다."
        },
        {
          "when": {
            "flag": "nursery_safe"
          },
          "text": "보육실의 빛은 이제 경보음 대신 사람들의 발걸음에 반응한다."
        }
      ]
    },
    "signal": {
      "id": "signal",
      "title": "받는 사람이 없는 방송",
      "chapter": 2,
      "location": "외부 통신실",
      "art": 1,
      "mood": "tension",
      "text": [
        "주 안테나는 회사 본부만 바라보도록 고정돼 있다. 긴급 방송 단추를 눌러도 자동 응답이 돌아온다. “담당자가 검토 중입니다.”",
        "천장에는 공공 해상망으로 돌릴 수 있는 수동 반사경이 달려 있다. 기지의 구조 신호는 그동안 바다 위 다른 선박에 닿은 적이 없었다. 반사경 아래, 은재가 남긴 쪽지가 있다. “엄마는 해상 기상 방송을 들어요.”",
        "미연이 다른 채널로 알려 온다. 백연과 함께 예비 부력통을 버려 은재를 꺼냈다고 한다. 사람은 구했지만 여유 부력은 줄었다. 여러분이 통신을 맡는 동안 다른 이들도 손을 놓고 있지 않았다.",
        "통신실 벽에는 반응로 점검을 건너뛰고 거주 구획을 곧장 분리하는 원격 고속 장치가 있다. 성공하면 순환까지 안정시키며 상승 구획으로 바로 갈 수 있지만, 우회관을 잘못 열면 공용 통로가 순식간에 침수돼 일행 전원이 사망한다. 누리는 통신을 마친 뒤 정상 점검을 거치는 방법이 훨씬 안전하다고 말한다."
      ],
      "objective": "구조 신호를 실제로 들을 수 있는 사람들에게 보낸다.",
      "entities": [
        {
          "id": "mirror",
          "label": "수동 반사경",
          "kind": "object",
          "aliases": [
            "안테나",
            "반사경"
          ]
        },
        {
          "id": "radio",
          "label": "공공 해상 무전기",
          "kind": "object",
          "aliases": [
            "무전기",
            "방송"
          ]
        },
        {
          "id": "pressure-bypass",
          "label": "원격 고속 분리 장치",
          "kind": "object",
          "aliases": [
            "고속 분리",
            "압력 우회",
            "우회관",
            "고속분리"
          ]
        }
      ],
      "choices": [
        {
          "id": "align",
          "label": "반사경을 해상 공공망으로 돌린다",
          "intent": "use",
          "target": "mirror",
          "keywords": [
            "반사경",
            "돌",
            "안테나",
            "공공망",
            "조정"
          ],
          "stat": "agility",
          "dc": 12,
          "risk": "방향을 잘못 잡으면 전력 과부하가 반응로에 전해진다.",
          "outcomes": {
            "success": {
              "text": "잡음 사이로 어선의 거친 목소리가 끼어든다. “온도0, 듣고 있다. 돌아오는 사람 전부 태울 자리 만든다.”",
              "next": "reactor",
              "set": [
                "evidence_public",
                "rescue_cost",
                "names_known"
              ],
              "clues": [
                "proof",
                "names"
              ]
            },
            "mixed": {
              "text": "좌표는 전달했지만 반사경 모터가 타 버린다. 어선들은 마지막 좌표로 접근 중이다. 남은 방송은 휴대기로 해야 한다.",
              "next": "reactor",
              "set": [
                "evidence_public",
                "rescue_cost",
                "names_known"
              ],
              "pressure": 1,
              "clues": [
                "names"
              ]
            },
            "failure": {
              "text": "반사경이 멎는다. 전력 분배반의 불꽃을 보고 여러분은 반응로로 내려간다. 휴대 무전기의 짧은 구조 신호만 간신히 송출됐다.",
              "next": "reactor",
              "pressure": 2,
              "set": [
                "rescue_cost",
                "names_known"
              ],
              "clues": [
                "names"
              ]
            }
          }
        },
        {
          "id": "voice",
          "label": "하람의 문장 대신 현재 생존자 이름을 방송한다",
          "intent": "talk",
          "target": "radio",
          "keywords": [
            "이름",
            "방송",
            "무전",
            "구조",
            "하람"
          ],
          "stat": "heart",
          "dc": 11,
          "risk": "수신자를 붙잡지 못하면 구조 요청이 자동 기록으로 처리된다.",
          "outcomes": {
            "success": {
              "text": "미연, 은재, 도윤. 이름을 하나씩 말하자 기계 응답이 끊기고 사람이 답한다. 해상 구조망이 기지 폐쇄를 중지시킨다.",
              "next": "reactor",
              "set": [
                "evidence_public",
                "names_known",
                "rescue_cost"
              ],
              "clues": [
                "names"
              ]
            },
            "mixed": {
              "text": "세 번의 호출 끝에 한 척이 응답한다. 멀리 있지만 돌아서겠다는 약속을 남긴다.",
              "next": "reactor",
              "set": [
                "evidence_public",
                "rescue_cost",
                "names_known"
              ],
              "pressure": 1,
              "clues": [
                "names"
              ]
            },
            "failure": {
              "text": "응답이 없다. 여러분은 이름을 반복해 녹음해 두고 반응로 비상 경보를 따라 내려간다. 이번 기록에는 적어도 빠진 이름이 없다.",
              "next": "reactor",
              "set": [
                "evidence_private",
                "rescue_cost",
                "names_known"
              ],
              "clues": [
                "names"
              ],
              "pressure": 2
            }
          }
        },
        {
          "id": "pressure-shortcut",
          "label": "고속 분리로 점검을 건너뛴다 · 전멸 위험",
          "intent": "use",
          "target": "pressure-bypass",
          "keywords": [
            "고속",
            "분리",
            "우회",
            "지름길",
            "건너뛴"
          ],
          "stat": "wit",
          "dc": 15,
          "risk": "실패하면 압력 우회관이 역류해 일행 전원 생명 3을 잃고 사망한다. 성공하면 반응로·방송 장면을 건너뛰고 순환 안정 상태로 상승 구획에 도착한다. 다른 두 행동은 이 전멸 위험을 피한다.",
          "outcomes": {
            "success": {
              "text": "여섯 번째 박자에 우회관을 잠그고 분리 명령을 넣는다. 무거운 반응로만 아래로 떨어지고 사람과 수조의 순환은 안정된다. 통신실 뒷문이 상승 구획에 곧장 연결된다.",
              "next": "lifeboat",
              "set": [
                "pressure_stable",
                "nursery_safe",
                "rescue_cost",
                "names_known"
              ],
              "clues": [
                "cycle",
                "ballast",
                "names"
              ],
              "pressure": -1
            },
            "mixed": {
              "text": "분리는 완료됐지만 닫히는 우회관에서 압력 충격이 밀려온다. 일행 모두 부상을 입는다. 사람과 수조의 순환은 유지됐고, 남은 이들은 곧장 상승 구획으로 옮겨 간다.",
              "next": "lifeboat",
              "set": [
                "pressure_stable",
                "nursery_safe",
                "rescue_cost",
                "names_known"
              ],
              "clues": [
                "cycle",
                "ballast",
                "names"
              ],
              "pressure": 2,
              "harmAll": 1
            },
            "failure": {
              "text": "우회관이 반대로 열린다. 공용 통로 전체로 바다가 밀려들고 격벽은 닫힐 틈도 얻지 못한다. 일행의 생체 신호가 모두 끊긴다. 비상 복원 틀을 작동시킬 사람은 남지 않았다.",
              "next": "lifeboat",
              "pressure": 3,
              "harmAll": 3
            }
          }
        }
      ],
      "dialogue": {
        "who": "해상망 자동 음성",
        "text": "녹음된 구조 신호는 유효 시간이 초과되었습니다."
      },
      "details": [
        {
          "id": "return-channel",
          "label": "무전기의 반송 주파수를 확인한다",
          "text": "사람 목소리 사이에서 여섯 번째 박자가 응답한다. 기지 생물도 같은 신호망으로 사람들의 말끝을 듣고 있다.",
          "clue": "rhythm"
        }
      ]
    },
    "ballast": {
      "id": "ballast",
      "title": "사람 한 명과 부력 한 칸",
      "chapter": 2,
      "location": "부력 제어실",
      "art": 1,
      "mood": "danger",
      "text": [
        "은재는 어깨까지 차오른 물속에서 손동작으로 말을 한다. 큰 소리를 내면 머리 위의 압력 센서가 문을 완전히 잠그기 때문이다. 그의 발목은 부력통 고정대 아래에 끼었다.",
        "기중기를 돌리면 고정대를 들 수 있다. 반대쪽 레버를 당기면 예비 부력통을 버리고 구획 전체를 띄울 수 있다. 은재는 자기를 두고 가라는 대신, 벽에 걸린 작은 설계도를 가리킨다."
      ],
      "objective": "은재를 꺼내고 수조와 거주실을 함께 띄울 방법을 찾는다.",
      "entities": [
        {
          "id": "eunjae",
          "label": "갇힌 연수생 은재",
          "kind": "person",
          "aliases": [
            "은재",
            "연수생"
          ]
        },
        {
          "id": "crane",
          "label": "수동 기중기",
          "kind": "object",
          "aliases": [
            "기중기",
            "고정대"
          ]
        },
        {
          "id": "ballast-lever",
          "label": "예비 부력통 레버",
          "kind": "object",
          "aliases": [
            "레버",
            "부력통"
          ]
        }
      ],
      "choices": [
        {
          "id": "lift",
          "label": "기중기로 고정대를 들어 은재를 빼낸다",
          "intent": "force",
          "target": "crane",
          "keywords": [
            "기중기",
            "들",
            "고정대",
            "은재",
            "구조"
          ],
          "stat": "might",
          "dc": 12,
          "risk": "고정대가 무너지면 구조자가 크게 다칠 수 있다.",
          "outcomes": {
            "success": {
              "text": "기중기 톱니가 버틴다. 은재가 발을 빼자 여러분이 동시에 손을 내민다. 그는 설계도까지 품에 안고 올라온다.",
              "next": "reactor",
              "set": [
                "survivors_ready",
                "names_known"
              ],
              "clues": [
                "ballast",
                "cycle"
              ]
            },
            "mixed": {
              "text": "고정대를 들었지만 기중기 체인이 끊어진다. 예비 부력통을 받침으로 써서 은재를 꺼낸다.",
              "next": "reactor",
              "set": [
                "survivors_ready",
                "rescue_cost"
              ],
              "clues": [
                "ballast"
              ],
              "pressure": 1
            },
            "failure": {
              "text": "고정대가 내려앉는다. 예비 부력통을 놓아 은재를 구하지만, 구조자는 떠밀린 철판에 크게 다친다. 은재가 남은 사람들과 함께 반응로 쪽으로 이동을 돕는다.",
              "next": "reactor",
              "set": [
                "survivors_ready",
                "rescue_cost"
              ],
              "pressure": 2,
              "harm": 2
            }
          }
        },
        {
          "id": "signal",
          "label": "은재의 손짓을 읽고 순서대로 밸브를 연다",
          "intent": "investigate",
          "target": "eunjae",
          "keywords": [
            "은재",
            "손짓",
            "신호",
            "순서",
            "밸브"
          ],
          "stat": "wit",
          "dc": 11,
          "risk": "순서를 틀리면 보조 탱크의 공기를 소비한다.",
          "outcomes": {
            "success": {
              "text": "왼쪽, 위, 기다림. 마지막 손짓은 멈추라는 뜻이다. 압력이 맞자 고정대가 떠오르고 은재가 빠져나온다.",
              "next": "reactor",
              "set": [
                "survivors_ready",
                "names_known"
              ],
              "clues": [
                "ballast",
                "cycle"
              ]
            },
            "mixed": {
              "text": "두 번째 밸브를 조금 일찍 열었다. 보조 공기를 보충하자 수위가 내려가고 은재를 끌어낼 수 있다.",
              "next": "reactor",
              "set": [
                "survivors_ready"
              ],
              "clues": [
                "ballast"
              ],
              "pressure": 1
            },
            "failure": {
              "text": "물거품에 가려 마지막 신호를 놓친다. 은재가 직접 비상 밸브를 연다. 둘 다 빠져나오지만 보조 공기는 모두 잃는다.",
              "next": "reactor",
              "set": [
                "survivors_ready",
                "rescue_cost"
              ],
              "clues": [
                "ballast"
              ],
              "pressure": 2
            }
          }
        }
      ],
      "dialogue": {
        "who": "은재, 구조된 뒤",
        "text": "엄마한테는 야근이라고 했어요. 거짓말도 퇴근을 해야 끝나네요."
      },
      "details": [
        {
          "id": "blueprint",
          "label": "벽의 부력 설계도를 살핀다",
          "text": "수조실과 거주실은 같은 상승 골격에 달려 있다. 반응로를 떼어 내면 어느 한쪽을 버릴 필요가 없다.",
          "clue": "ballast"
        }
      ]
    },
    "reactor": {
      "id": "reactor",
      "title": "명령을 멈춰야 돌아가는 것",
      "chapter": 3,
      "location": "하부 반응로 순환실",
      "art": 2,
      "mood": "danger",
      "text": [
        "반응로는 터지기 직전처럼 울리지만 온도는 아직 허용 범위다. 문제는 수조가 응답하기 전에 펌프가 다음 명령을 보내는 데 있다. 사람의 기계와 빛의 생명이 서로의 말을 덮고 있다.",
        "은색 격리관을 닫으면 반응로를 버리고 상승할 수 있다. 순환 제어를 바꾸면 수조까지 함께 살릴 가능성이 있다. 격벽 너머에서 하람의 마지막 문장이 다시 들린다. 이번에는 끝에 짧은 침묵이 붙는다.",
        "순환실 옆 비상 복원 틀에는 잠수팀의 생체 패턴이 아직 남아 있다. 격리 전에만 사망한 동료의 재구성을 시도할 수 있으며, 진행 중에는 압력 상승을 감수해야 한다."
      ],
      "objective": "상승을 위한 동력을 확보하고 어떤 구획을 남길지 정한다.",
      "entities": [
        {
          "id": "pump",
          "label": "순환 제어 펌프",
          "kind": "object",
          "aliases": [
            "펌프",
            "순환",
            "제어"
          ]
        },
        {
          "id": "isolation",
          "label": "은색 반응로 격리관",
          "kind": "object",
          "aliases": [
            "관",
            "격리관"
          ]
        },
        {
          "id": "window",
          "label": "수조 관측창",
          "kind": "object",
          "aliases": [
            "창",
            "빛"
          ]
        }
      ],
      "choices": [
        {
          "id": "listen-cycle",
          "label": "응답을 기다리는 여섯 박자 순환을 입력한다",
          "intent": "use",
          "target": "pump",
          "keywords": [
            "박자",
            "순환",
            "응답",
            "기다",
            "입력"
          ],
          "stat": "wit",
          "dc": 13,
          "risk": "순환을 잘못 바꾸면 압력 충격으로 일행 전원이 크게 다친다. 다친 동료는 사망할 수 있다.",
          "outcomes": {
            "success": {
              "text": "다섯 번 보내고 한 번 기다린다. 기지 전체가 한숨처럼 진동한 뒤 조용해진다. 반응로를 끊어도 수조의 독립 순환은 유지된다.",
              "next": "broadcast",
              "set": [
                "pressure_stable",
                "nursery_safe"
              ],
              "clues": [
                "cycle",
                "consent"
              ]
            },
            "mixed": {
              "text": "순환은 안정됐지만 전환 중 예비 부력통 하나가 터진다. 함께 상승할 길은 남아 있다.",
              "next": "broadcast",
              "set": [
                "pressure_stable",
                "nursery_safe",
                "rescue_cost"
              ],
              "clues": [
                "cycle"
              ],
              "pressure": 1
            },
            "failure": {
              "text": "제어기가 끝내 응답을 기다리지 않는다. 압력 충격이 일행을 바닥으로 밀친다. 격리관을 닫아 폭발은 막지만 모두 크게 다쳤고 수조는 독립 전지에 의존하게 된다.",
              "next": "lifeboat",
              "set": [
                "rescue_cost"
              ],
              "pressure": 2,
              "harmAll": 2
            }
          }
        },
        {
          "id": "isolate",
          "label": "격리관을 닫고 반응로의 무게를 떼어 낸다",
          "intent": "force",
          "target": "isolation",
          "keywords": [
            "격리",
            "관",
            "반응로",
            "떼",
            "닫"
          ],
          "stat": "might",
          "dc": 12,
          "risk": "닫힘이 늦으면 상승 구획에 추가 압력이 걸린다.",
          "outcomes": {
            "success": {
              "text": "관을 따라 불이 차례로 꺼진다. 거대한 반응로가 아래로 분리되고 부력계가 상승 가능을 가리킨다.",
              "next": "lifeboat",
              "set": [
                "survivors_ready"
              ]
            },
            "mixed": {
              "text": "격리관은 닫혔지만 잔열을 빼느라 공기를 소비한다. 생존 구획은 이제 떠오를 수 있다.",
              "next": "lifeboat",
              "set": [
                "survivors_ready",
                "rescue_cost"
              ],
              "pressure": 1
            },
            "failure": {
              "text": "주 손잡이가 부러진다. 누리가 예비 케이블을 감고 여러분과 함께 당긴다. 반응로는 떨어지지만 구조용 줄도 잃는다.",
              "next": "lifeboat",
              "set": [
                "survivors_ready",
                "rescue_cost"
              ],
              "pressure": 2
            }
          }
        },
        {
          "id": "negotiate",
          "label": "거부 신호를 존중하며 수조에 상승 계획을 보여 준다",
          "intent": "talk",
          "target": "window",
          "keywords": [
            "동의",
            "거부",
            "빛",
            "수조",
            "보여"
          ],
          "stat": "heart",
          "dc": 11,
          "risk": "합의가 늦어지면 상승 여유가 줄어든다.",
          "outcomes": {
            "success": {
              "text": "손전등으로 상승을 그리고 멈춘다. 빛들이 여섯 번째 박자로 답한다. 그들은 남겨지는 것이 아니라 함께 가는 쪽을 택했다.",
              "next": "broadcast",
              "set": [
                "pressure_stable",
                "nursery_safe",
                "voice_trusted"
              ],
              "clues": [
                "cycle"
              ]
            },
            "mixed": {
              "text": "한 무리는 따라오고 다른 무리는 깊은 곳에 남는다. 선택을 기다린 만큼 압력은 높아졌지만 이동할 수조는 안정된다.",
              "next": "broadcast",
              "set": [
                "pressure_stable",
                "nursery_safe"
              ],
              "clues": [
                "cycle"
              ],
              "pressure": 1
            },
            "failure": {
              "text": "빛들이 거부 신호를 보낸다. 여러분은 강제로 채집하지 않고 분리 절차로 돌아선다. 생존 구획의 상승은 계속 준비된다.",
              "next": "lifeboat",
              "set": [
                "nursery_safe"
              ],
              "pressure": 1
            }
          },
          "requires": {
            "clue": "consent"
          }
        }
      ],
      "dialogue": {
        "who": "누리",
        "text": "빨리 하라는 명령은 충분히 들었어. 이번엔 대답을 듣자."
      },
      "details": [
        {
          "id": "timing",
          "label": "순환 표시등의 시간차를 측정한다",
          "text": "응답을 기다리지 않는 자동 재시도가 압력을 키운다. 여섯 번째 구간을 비워 두는 것이 안정화의 핵심이다.",
          "clue": "cycle"
        },
        {
          "id": "restore-status",
          "label": "비상 복원 틀의 잔량을 확인한다",
          "text": "의식 신호가 남은 동료를 되돌릴 수 있는 패턴은 보존돼 있다. 복원 한 번에 촉매와 압력 여유가 소모된다.",
          "clue": "restore"
        }
      ],
      "callbacks": [
        {
          "when": {
            "flag": "rescue_cost"
          },
          "text": "부력계의 예비 칸이 비어 있다. 수치 하나하나가 앞선 구조의 대가다."
        }
      ],
      "resurrection": {
        "label": "온빛 수조로 사망한 동료 재구성",
        "text": "온빛이 보관된 신체·의식 패턴을 다시 엮는다. 불꽃 1개와 압력 여유를 쓰며, 실패해도 지불한 자원은 돌아오지 않는다.",
        "sparkCost": 1,
        "pressureCost": 2,
        "dc": 12,
        "requires": {
          "clue": "restore"
        }
      }
    },
    "broadcast": {
      "id": "broadcast",
      "title": "누구의 목소리로 남을 것인가",
      "chapter": 3,
      "location": "비상 방송 통로",
      "art": 2,
      "mood": "tension",
      "text": [
        "복구된 송신기는 마지막 송출을 기다린다. 백연은 준비된 사과문을 읽으려다 멈춘다. 문장 어디에도 환자나 청소원, 연수생의 이름은 없다.",
        "휴대 기록기에는 사고의 원본이 있다. 바깥에는 아직 상황을 모르는 배들이 있다. 하람의 음성을 증거로 쓰면 설득력은 높지만, 살아 있는 사람들의 말이 다시 가려질 수도 있다."
      ],
      "objective": "구조와 책임에 관해 마지막 방송을 남긴다.",
      "entities": [
        {
          "id": "microphone",
          "label": "비상 방송 마이크",
          "kind": "object",
          "aliases": [
            "마이크",
            "방송"
          ]
        },
        {
          "id": "recorder",
          "label": "휴대 기록기",
          "kind": "object",
          "aliases": [
            "기록",
            "원본"
          ]
        },
        {
          "id": "director",
          "label": "소장 백연",
          "kind": "person",
          "aliases": [
            "백연",
            "소장"
          ]
        }
      ],
      "choices": [
        {
          "id": "public",
          "label": "생존자들의 이름과 사고 원본을 함께 공개한다",
          "intent": "choose",
          "keywords": [
            "공개",
            "방송",
            "이름",
            "원본"
          ],
          "automatic": true,
          "outcomes": {
            "success": {
              "text": "미연이 먼저 자기 이름을 말한다. 도윤과 은재가 이어 말하고, 백연은 승인 기록의 서명자가 자신이었다고 밝힌다. 방송은 편집 없이 바깥으로 간다.",
              "next": "lifeboat",
              "set": [
                "evidence_public"
              ],
              "clues": [
                "proof"
              ]
            }
          }
        },
        {
          "id": "private",
          "label": "구조 좌표만 송신하고 원본은 생존자가 가지고 나간다",
          "intent": "choose",
          "keywords": [
            "좌표",
            "보관",
            "기록",
            "복사"
          ],
          "automatic": true,
          "outcomes": {
            "success": {
              "text": "여러분은 구조 좌표와 인원만 보낸다. 원본은 도윤과 당신의 기록기에 각각 복사된다. 누가 언제 공개할지는 수면에서 함께 정하기로 한다.",
              "next": "lifeboat",
              "set": [
                "evidence_private"
              ],
              "clues": [
                "proof"
              ]
            }
          }
        },
        {
          "id": "confession",
          "label": "백연에게 직접 폐쇄 명령을 철회하게 한다",
          "intent": "talk",
          "target": "director",
          "keywords": [
            "백연",
            "소장",
            "철회",
            "책임",
            "고백"
          ],
          "stat": "heart",
          "dc": 12,
          "risk": "그가 책임을 피하면 직접 송출할 시간이 줄어든다.",
          "outcomes": {
            "success": {
              "text": "백연은 종이를 접는다. “현장 생존자 전원 회수. 시료 파기 명령 철회. 책임자는 백연.” 명령은 이번에야 사람을 살리는 방향으로 나간다.",
              "next": "lifeboat",
              "set": [
                "evidence_public",
                "nursery_safe"
              ],
              "clues": [
                "proof"
              ]
            },
            "mixed": {
              "text": "철회 명령은 나갔지만 백연은 책임 인정에서 말을 흐린다. 미연이 원본 기록의 번호를 마이크에 대고 읽는다.",
              "next": "lifeboat",
              "set": [
                "evidence_public"
              ],
              "clues": [
                "proof"
              ],
              "pressure": 1
            },
            "failure": {
              "text": "백연은 끝내 마이크를 잡지 못한다. 누리가 그를 대피시키고 여러분이 기록기를 송신기에 직접 연결한다. 짧지만 편집되지 않은 증거가 전해진다.",
              "next": "lifeboat",
              "set": [
                "evidence_public"
              ],
              "clues": [
                "proof"
              ],
              "pressure": 2
            }
          }
        }
      ],
      "dialogue": {
        "who": "미연",
        "text": "뉴스에 얼굴이 나오는 건 싫어요. 그래도 이름이 지워지는 건 더 싫고요."
      },
      "details": [
        {
          "id": "packet",
          "label": "송신 대기 중인 자료를 확인한다",
          "text": "전송할 수 있는 자료에는 실험 중단 요청, 반려 기록, 현재 생존자 명단이 모두 들어 있다.",
          "clue": "proof"
        }
      ]
    },
    "lifeboat": {
      "id": "lifeboat",
      "title": "마지막으로 탈 사람",
      "chapter": 3,
      "location": "상승 구획 연결교",
      "art": 2,
      "mood": "danger",
      "text": [
        "연결교 아래에서는 반응로의 불빛이 점점 멀어진다. 상승 구획에 탄 사람들은 문을 열어 두고 기다린다. 누리가 안전 줄을 풀고 마지막 점검에 나서려 한다.",
        "안쪽 좌석은 모자라지만 바닥 공간은 남아 있다. 부력 한계는 사람 수가 아니라 가져갈 장비의 무게로 결정된다. 누군가 캐비닛에 묶인 값비싼 실험 장비를 바라본다."
      ],
      "objective": "한 사람도 명단 밖에 두지 않고 상승 준비를 끝낸다.",
      "entities": [
        {
          "id": "bridge",
          "label": "흔들리는 연결교",
          "kind": "place",
          "aliases": [
            "다리",
            "연결교"
          ]
        },
        {
          "id": "equipment",
          "label": "실험 장비 캐비닛",
          "kind": "object",
          "aliases": [
            "캐비닛",
            "장비"
          ]
        },
        {
          "id": "nuri",
          "label": "마지막 점검에 나선 누리",
          "kind": "person",
          "aliases": [
            "누리",
            "선장"
          ]
        }
      ],
      "choices": [
        {
          "id": "throw",
          "label": "비싼 장비를 버리고 사람과 수조의 무게를 확보한다",
          "intent": "force",
          "target": "equipment",
          "keywords": [
            "장비",
            "캐비닛",
            "버리",
            "무게",
            "끊"
          ],
          "stat": "might",
          "dc": 11,
          "risk": "장비를 붙잡다 연결교가 무너지면 바다로 추락해 사망할 수 있다. 이름을 확인하며 건너는 방법이 더 안전하다.",
          "outcomes": {
            "success": {
              "text": "봉인을 끊자 장비가 검은 바다로 떨어진다. 부력계가 초록으로 바뀐다. 여러분은 마지막 사람의 손까지 잡고 연결교를 건넌다.",
              "next": "council",
              "set": [
                "survivors_ready"
              ],
              "clues": [
                "ballast"
              ]
            },
            "mixed": {
              "text": "장비를 버리는 동안 연결교 한쪽이 주저앉는다. 안전 줄로 사람들을 끌어오고 구획 문을 닫는다.",
              "next": "council",
              "set": [
                "survivors_ready",
                "rescue_cost"
              ],
              "pressure": 1
            },
            "failure": {
              "text": "캐비닛이 교각을 잡아당긴다. 무너진 연결교 아래로 몸이 떨어지고 구조용 줄은 충격을 버티지 못한다. 남은 일행은 누리의 도움을 받아 상승 구획 문을 닫아야 한다.",
              "next": "council",
              "set": [
                "survivors_ready",
                "rescue_cost"
              ],
              "pressure": 2,
              "harm": 3
            }
          }
        },
        {
          "id": "count",
          "label": "서로 이름을 부르며 안전 줄로 연결교를 건넌다",
          "intent": "help",
          "target": "bridge",
          "keywords": [
            "이름",
            "안전",
            "줄",
            "확인",
            "건너"
          ],
          "stat": "heart",
          "dc": 11,
          "risk": "한 명씩 확인하는 동안 구조 여유가 줄어든다.",
          "outcomes": {
            "success": {
              "text": "이름을 부르면 대답이 돌아온다. 은재 다음에는 미연, 미연 다음에는 누리. 빈 좌석보다 많은 사람이 작은 구획 안에 모두 모인다.",
              "next": "council",
              "set": [
                "survivors_ready",
                "names_known"
              ]
            },
            "mixed": {
              "text": "마지막 확인에 시간이 걸렸다. 누리는 안전 줄을 버리고 문턱을 넘는다. 모두가 답했고 누구도 명단에서 빠지지 않았다.",
              "next": "council",
              "set": [
                "survivors_ready"
              ],
              "pressure": 1
            },
            "failure": {
              "text": "경보음에 대답이 묻힌다. 여러분은 손을 직접 잡아 인원을 세고 마지막 사람을 끌어온다. 물이 문턱을 넘기 직전 문이 닫힌다.",
              "next": "council",
              "set": [
                "survivors_ready"
              ],
              "pressure": 2
            }
          }
        }
      ],
      "dialogue": {
        "who": "은재",
        "text": "장비 하나가 우리 열두 명보다 비싸대요. 그럼 오늘은 비싼 걸 버리는 날이네요."
      },
      "details": [
        {
          "id": "mass",
          "label": "부력계의 질량 표시를 읽는다",
          "text": "실험 장비를 버리면 사람과 독립 수조를 함께 실을 수 있다. 좌석 수는 생존 가능 인원과 같지 않다.",
          "clue": "ballast"
        }
      ]
    },
    "council": {
      "id": "council",
      "title": "수면으로 가져갈 것",
      "chapter": 3,
      "location": "상승 구획 · 최종 분리 장치",
      "art": 2,
      "mood": "calm",
      "text": [
        "유리창 위로 먼 빛이 보인다. 수면까지 오를 동력은 확보했다. 마지막 장치는 여러분이 어떤 이야기를 바깥으로 가져갈지 기다린다.",
        "사고의 기록을 중심으로 구조를 마칠 수도, 살아남은 사람들의 회복을 우선해 당장의 공개를 미룰 수도 있다. 수조의 의사를 확인하고 순환을 안정시켰다면, 이름 없는 이웃까지 함께 데려갈 길도 있다."
      ],
      "objective": "함께 합의한 구조의 의미를 결정한다.",
      "entities": [
        {
          "id": "release",
          "label": "최종 분리 장치",
          "kind": "object",
          "aliases": [
            "분리",
            "장치"
          ]
        },
        {
          "id": "window",
          "label": "상승 구획 창",
          "kind": "object",
          "aliases": [
            "창",
            "빛"
          ]
        }
      ],
      "choices": [
        {
          "id": "witness",
          "label": "사고의 증인이 되어 구조 기록을 공개한다",
          "intent": "choose",
          "keywords": [
            "증거",
            "공개",
            "증인",
            "기록"
          ],
          "automatic": true,
          "outcomes": {
            "success": {
              "text": "여러분은 원본 기록을 구조선에 넘기고 삭제되지 않을 사본을 남긴다. 문이 열리면 생존자들이 각자의 이름으로 이야기하기로 약속한다.",
              "next": "ending-witness",
              "set": [
                "evidence_public"
              ]
            }
          }
        },
        {
          "id": "quiet",
          "label": "생존자들을 보호하며 공개 시점을 함께 정한다",
          "intent": "choose",
          "keywords": [
            "보호",
            "회복",
            "보관",
            "미룬",
            "생존"
          ],
          "automatic": true,
          "outcomes": {
            "success": {
              "text": "모두의 동의 없이 얼굴과 목소리를 공개하지 않기로 한다. 원본은 지우지 않고 여러 사람에게 나눠 보관한다. 오늘의 첫 일은 살아 돌아가는 것이다.",
              "next": "ending-harbor",
              "set": [
                "evidence_private"
              ]
            }
          }
        },
        {
          "id": "common",
          "label": "응답하는 수조도 구조 대상으로 선언한다",
          "intent": "choose",
          "keywords": [
            "수조",
            "함께",
            "공존",
            "생명"
          ],
          "automatic": true,
          "outcomes": {
            "success": {
              "text": "여섯 번째 박자를 기다린다. 수조가 답한다. 사람과 빛이 같은 상승 골격에 묶인 채 깊은 곳을 떠난다.",
              "next": "ending-common",
              "set": [
                "nursery_safe"
              ]
            }
          },
          "requires": {
            "flag": "pressure_stable",
            "clue": "consent"
          }
        }
      ],
      "dialogue": {
        "who": "도윤",
        "text": "구조 명단의 마지막 칸은 우리가 쓸 수 있어요."
      },
      "callbacks": [
        {
          "when": {
            "flag": "evidence_public"
          },
          "text": "바깥의 어선들이 여러분을 실명으로 부른다. 이미 송출된 원본은 되돌릴 수 없다."
        },
        {
          "when": {
            "flag": "pressure_stable"
          },
          "text": "독립 순환 표시등이 고르게 켜져 있다. 수조를 함께 올리는 데 필요한 조건을 갖췄다."
        }
      ]
    },
    "ending-witness": {
      "id": "ending-witness",
      "title": "삭제되지 않은 이름",
      "chapter": 4,
      "location": "에필로그",
      "art": 3,
      "mood": "hope",
      "ending": true,
      "text": [
        "소금비의 갑판 위에서 생존자 명단을 다시 쓴다. 미연은 외주 인력 칸을 지우고 자기 이름만 남긴다. 은재는 어머니에게 전화를 걸어 야근이 길어졌다고 말하다가, 이번에는 사실을 전부 털어놓는다.",
        "공개된 원본은 회사의 사고 보고서보다 먼저 사람들에게 도착한다. 진실이 모두를 즉시 구하지는 않지만, 누군가 같은 명령을 반복하려 할 때 꺼내 볼 기록이 생겼다. 하람의 마지막 방송 뒤에는 이제 살아 있는 사람들의 목소리가 이어진다."
      ],
      "epilogues": [
        {
          "when": {
            "flag": "medic_saved"
          },
          "text": "도윤은 환자 전원이 저체온 치료를 받았다는 진료 확인서를 제출한다. 푸른 흔적은 감염의 증거가 아니었다."
        },
        {
          "when": {
            "flag": "nursery_safe"
          },
          "text": "살아남은 수조는 현장 조사 때까지 독립 순환을 유지한다. 연구 중단과 보호 관찰을 요청한 문서에도 여러분의 이름이 들어간다."
        },
        {
          "when": {
            "flag": "rescue_cost"
          },
          "text": "구조 장비 손실 청구서가 날아온다. 누리는 빈칸에 “사람 값으로는 부족함”이라고 써서 돌려보낸다."
        }
      ],
      "question": "진실을 공개할 때, 누구에게 먼저 허락을 구하고 싶었나요?",
      "choices": []
    },
    "ending-harbor": {
      "id": "ending-harbor",
      "title": "먼저, 따뜻한 물",
      "chapter": 4,
      "location": "에필로그",
      "art": 3,
      "mood": "hope",
      "ending": true,
      "text": [
        "구조선 주방에서 따뜻한 물이 끓는다. 누구도 카메라를 들이대지 않는다. 미연은 케이크 상자를 펴서 젖은 종이 왕관을 만들고 은재의 머리에 얹는다. 첫 월급 축하는 늦었지만 살아 있는 사람들이 모였다.",
        "원본 기록은 봉인된 채 여러 사람에게 맡겨진다. 침묵은 회사에 주는 선물이 아니라, 생존자들이 자기 이야기를 고를 시간이다. 한 달 뒤 첫 기자회견의 날짜와 참석자를 정하는 자리에도 여러분이 함께 앉는다."
      ],
      "epilogues": [
        {
          "when": {
            "flag": "evidence_public"
          },
          "text": "앞서 송신한 자료까지 거둘 수는 없다. 여러분은 추가 보도에서 환자의 신원을 가려 달라고 요청하고 이미 알려진 사실을 바로잡는다."
        },
        {
          "when": {
            "flag": "voice_trusted"
          },
          "text": "해상 소음이 잠깐 끊길 때마다 누군가는 여섯 번째 박자를 기다린다. 대답을 기다리는 습관 하나가 육지까지 따라왔다."
        }
      ],
      "question": "살아남은 사람이 자기 이야기를 말할 준비가 됐다는 것은 누가 정할까요?",
      "choices": []
    },
    "ending-common": {
      "id": "ending-common",
      "title": "구조 명단의 열세 번째 칸",
      "chapter": 4,
      "location": "에필로그",
      "art": 3,
      "mood": "hope",
      "ending": true,
      "text": [
        "수면 위로 떠오른 수조가 새벽빛을 받아 반짝인다. 누리는 새로 인쇄한 명단의 마지막 칸에 “이름 협의 중”이라고 쓴다. 처음으로 그 말은 누락이 아니라 존중을 뜻한다.",
        "보육 수조는 보호 구역으로 옮겨진다. 연구자들이 질문을 보내고, 불이 꺼지는 대답도 받아들이는 규칙이 생긴다. 하람의 목소리만 반복하던 생명은 어느 날 미연이 건넨 새 문장을 돌려준다. “오늘은 쉬어도 돼요.”"
      ],
      "epilogues": [
        {
          "when": {
            "flag": "evidence_public"
          },
          "text": "공개된 기록 덕분에 음성 패턴의 소유권을 주장하던 계약이 조사 대상이 된다. 수조의 보호자는 회사 대신 공동 위원회가 맡는다."
        },
        {
          "when": {
            "flag": "medic_saved"
          },
          "text": "치료를 마친 환자들은 손목의 푸른 흔적 사진을 연구 자료로 기부한다. 이번에는 각자의 서명을 먼저 받았다."
        },
        {
          "when": {
            "flag": "rescue_cost"
          },
          "text": "잃어버린 장비 대신 돌아온 것이 너무 많아서, 누리의 손해 보고서는 끝내 숫자로 끝나지 않는다."
        }
      ],
      "question": "여러분이 오늘 구조한 것은 사람, 진실, 아니면 대답을 들을 기회였나요?",
      "choices": []
    }
  },
  "deathEnding": {
    "title": "끝내 답하지 않은 무전기",
    "text": [
      "마지막 동료의 생체 신호가 끊긴다. 이제 복원 장치를 작동시키고 돌아올 사람의 손을 잡아 줄 팀원도 남지 않았다. 잠수팀의 무전기는 마지막 위치만 바다 위로 반복한다.",
      "훗날 회수된 구조 기록에는 여러분이 어디까지 내려갔고 무엇을 구하려 했는지가 남는다. 온도0의 결말을 끝까지 확인하지 못한 채, 이번 잠수팀의 이야기는 여기에서 멈춘다."
    ],
    "art": 2,
    "mood": "danger",
    "question": "어떤 위험을 나눴다면 마지막 한 사람의 손을 남길 수 있었을까요?"
  }
};
