import { NEW_ENEMY_APPEARANCES } from './enemy-atlases-v24.js';
/** Encounter identity is explicit: legacy IDs do not determine the creature's appearance. */
export const BATTLE_ART_VERSION = '24000';
export const BATTLE_APPEARANCES = Object.freeze({
  "train-ledger-enforcer": {
    "id": "train-ledger-enforcer",
    "campaignId": "last-train",
    "name": "자동 검표 집행기",
    "alt": "표를 집는 긴 집게와 폐기 도장을 단 황동 검표 기계. 오래된 철제 바퀴로 움직인다.",
    "accent": "#d3ae6d",
    "motion": "machine",
    "src": "/game/art/enemies/train-ledger-enforcer.webp?v=23000"
  },
  "hotel-clockwork-archivist": {
    "id": "hotel-clockwork-archivist",
    "campaignId": "glass-hotel",
    "name": "반납되지 못한 거울 분신",
    "alt": "금이 간 거울에서 손을 뻗는 연회 손님. 찢긴 반사 속에서 두 개의 옅은 분신이 겹쳐 보인다.",
    "accent": "#b9b1d6",
    "motion": "hover",
    "src": "/game/art/enemies/hotel-clockwork-archivist.webp?v=23000"
  },
  "market-contract-puppet": {
    "id": "market-contract-puppet",
    "campaignId": "moon-market",
    "name": "담보 사냥꾼 일당",
    "alt": "기운 갑옷과 계약 두루마리를 두른 세 명의 추심꾼. 우두머리는 곤봉, 부하들은 밧줄과 포획 그물을 들었다.",
    "accent": "#ceb18b",
    "motion": "stalk",
    "src": "/game/art/enemies/market-contract-puppet.webp?v=23000"
  },
  "sea-quarantine-cleaner": {
    "id": "sea-quarantine-cleaner",
    "campaignId": "deep-sea",
    "name": "폭주한 격리 청소기",
    "alt": "격리용 집게와 압력 분사기를 단 해저 시설의 청소 기계. 청록색 센서와 낡은 잠수 장비의 외장이 보인다.",
    "accent": "#90c5bd",
    "motion": "machine",
    "src": "/game/art/enemies/sea-quarantine-cleaner.webp?v=23000"
  },
  "feast-oath-cutlery": {
    "id": "feast-oath-cutlery",
    "campaignId": "dragon-banquet",
    "name": "서약에 묶인 왕실 식기",
    "alt": "왕실 문장이 새겨진 은포크와 숟가락, 뜨거운 국자가 허공에서 한 무리로 회전한다.",
    "accent": "#e0bc75",
    "motion": "swarm",
    "src": "/game/art/enemies/feast-oath-cutlery.webp?v=23000"
  },
  "clock-archive-eraser": {
    "id": "clock-archive-eraser",
    "campaignId": "clock-city",
    "name": "시간 채권 소거 집행기",
    "alt": "시간 채권을 지우는 황동 자동 기계. 커다란 소거 렌즈와 가는 종이 칼날, 압류 집게를 달고 있다.",
    "accent": "#bfcbb0",
    "motion": "machine",
    "src": "/game/art/enemies/clock-archive-eraser.webp?v=23000"
  },
  "snow-checkpoint-catcher": {
    "id": "snow-checkpoint-catcher",
    "campaignId": "snow-radio",
    "name": "귀환 관리 포획기",
    "alt": "얼어붙은 레일 아래의 포획 장치. 구속 팔과 회수 케이블, 냉각 분사구가 아래로 뻗어 있다.",
    "accent": "#a0c5d9",
    "motion": "machine",
    "src": "/game/art/enemies/snow-checkpoint-catcher.webp?v=23000"
  },
  "apartment-empty-doorkeeper": {
    "id": "apartment-empty-doorkeeper",
    "campaignId": "hollow-apartment",
    "name": "문에 걸린 빈 외투",
    "alt": "뒤틀린 문틀에서 팔을 뻗는 빈 외투. 머리와 몸은 없고 경첩과 작은 방울만 옷자락을 붙들고 있다.",
    "accent": "#aaa4c1",
    "motion": "hover",
    "src": "/game/art/enemies/apartment-empty-doorkeeper.webp?v=23000"
  },
  "broadcast-waiting-listener": {
    "id": "broadcast-waiting-listener",
    "campaignId": "drowned-broadcast",
    "name": "다음 말을 기다리는 청취자",
    "alt": "젖은 방송 케이블과 잡음이 사람 모양으로 얽혔다. 낡은 수신기의 불빛과 숨소리 같은 전파가 가슴에서 새어 나온다.",
    "accent": "#92bcc8",
    "motion": "flicker",
    "src": "/game/art/enemies/broadcast-waiting-listener.webp?v=23000"
  },
  ...NEW_ENEMY_APPEARANCES
});
const unknown = Object.freeze({id:'unknown',src:'',alt:'이 전투의 적',accent:'#cbb789',motion:'still'});
export function battleAppearance(encounterId) { return BATTLE_APPEARANCES[encounterId] || unknown; }

