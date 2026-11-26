/** v22 original horror campaign data. No remote model, executable narration, or random stats. */
const PRESETS = {
  might:{might:3,agility:1,wit:0,heart:1}, agility:{might:1,agility:3,wit:1,heart:0},
  wit:{might:0,agility:1,wit:3,heart:1}, heart:{might:1,agility:0,wit:1,heart:3},
};
const RULES={strike:'판정 성공 피해 3, 대성공 4. 실패 피해 없음, 대실패 자신 생명 −1.',guard:'피해 1, 선택한 생존 동료에게 보호막 2. 자신도 선택 가능.',expose:'피해 1, 이후 적중하는 공격 2회에 피해 +1.',stun:'피해 1, 다음 적 행동 1회 방해.',heal:'피해 1, 선택한 생존 동료 생명 1 회복과 보호막 1.',rally:'피해 1, 생존자 모두 다음 공격 판정 +2.'};
function job(id,name,description,stat,basic,tech,type){return{id,name,description,stats:{...PRESETS[stat]},basic:{name:basic[0],text:basic[1],stat},ability:{name:tech[0],text:tech[1],type,...(type==='strike'?{stat}:{}),description:`${RULES[type]} 전투당 한 번.`,target:['guard','heal'].includes(type)?'ally':type==='rally'?'all':'enemy'}};}
const attack=(name,text,target='actor')=>({name,text,target,damage:1,dc:12});
export const HORROR_COMBAT={
  'hollow-apartment':{
    classes:[
      job('apartment-caretaker','복구 기사','폭우 피해를 점검하러 왔습니다. 긴 공구와 문 버팀대로 접근을 막습니다.','might',['쇠지렛대 밀치기','쇠지렛대를 벌어진 문틀에 걸어 빈 외투를 지탱하는 경첩을 비튼다.'],['문턱 버팀대','외투의 팔을 밀쳐 놓고 선택한 동료 앞에 비상 버팀대를 가로질러 세운다.'],'guard'),
      job('apartment-courier','야간 배송원','수취인이 없는 마지막 배달에 발이 묶였습니다. 배송 끈과 빠른 발로 좁은 틈을 엽니다.','agility',['배송 끈 발걸기','바닥을 기는 외투 끝에 배송 끈을 걸고 몸을 비켜 문틀에서 잡아당긴다.'],['문 닫히기 직전','닫히는 문을 따라 낮게 뛰어들어 외투 뒤쪽의 작은 종을 발뒤꿈치로 깨뜨린다.'],'strike'),
      job('apartment-locksmith','출장 열쇠공','안에서 잠긴 404호를 열어 달라는 의뢰를 받았습니다. 낡은 자물쇠가 버티는 지점을 읽습니다.','wit',['경첩 핀 빼기','열쇠 공구로 문틀의 핀 하나를 밀어내자 매달린 외투의 한쪽 어깨가 처진다.'],['가짜 경첩 표시','외투를 잡고 있는 황동 경첩 둘에 점검등을 비춘다. 그림자가 늦게 따라오는 부분을 공격할 수 있다.'],'expose'),
      job('apartment-counselor','긴급 상담사','통화 중 끊긴 주민을 확인하러 왔습니다. 상대의 말에 끌려가지 않고 숨과 박자를 되찾습니다.','heart',['되받지 않는 대답','빌려 온 이름 대신 복도의 호수를 또렷하게 센다. 대답을 기다리던 외투가 문턱을 헛짚는다.'],['호흡 맞추기','외투의 종소리 사이로 짧은 박자를 두드려 시선을 끌고, 선택한 동료가 숨을 고를 틈을 만든다.'],'heal'),
    ],
    encounter:{id:'apartment-empty-doorkeeper',nodeId:'service-corridor',title:'아무도 입지 않은 외투',
      intro:['지하 방화문이 열리자 젖은 외투 하나가 문틀에서 일어선다. 목과 손이 있어야 할 곳은 비어 있다. 그런데 소매 안에서는 조금 전 복도에서 들었던 목소리들이 차례로 나온다. “여기였네. 이제 들어와.”','외투는 대답을 기다리지 않고 팔을 벌린다. 벽의 문틀과 이어진 황동 경첩이 돌아갈 때마다 소매가 길어진다. 피할 통로는 뒤에서 닫혔다. 경첩을 풀거나 작은 종의 박자를 끊어야 문에서 몸을 떼어 낼 수 있다.'],
      enemyName:'문에 걸린 빈 외투',enemyDescription:'목소리를 흉내 내는 외투. 문틀의 경첩과 작은 종에 매달려 움직입니다. 연결을 끊으면 쓰러진 문틀로 돌아갑니다.',
      intents:[attack('안으로 끄는 소매','예고된 사람의 손목을 빈 소매가 감아 닫히는 문틈으로 끌어당깁니다.'),attack('가장 작은 숨','생명이 낮아 지목된 사람을 향해 외투 안의 찬 공기가 한꺼번에 쏟아집니다.','weakest'),attack('닫히는 문틀','예고된 사람의 발목을 두 개의 문틀이 양옆에서 누르려 합니다.')],
      victoryText:'경첩이 빠지자 외투가 바닥에 꺼진다. 마지막까지 들리던 이름도 작은 종과 함께 멎었다. 외투 밑에서 드러난 계단은 지하 문짝 보관실로 내려간다. 문을 받쳐 둔 채 그 아래를 살필 수 있게 됐다.',
      defeatText:'빈 외투가 마지막 숨을 접어 소매 속에 넣는다. 닫힌 방화문 밖에는 처음 들어올 때보다 많은 목소리가 기다린다.',victoryFlag:'apt_doorkeeper_broken',victoryFlagLabel:'빈 외투의 경첩을 끊었다',victoryCallback:'외투는 빠진 경첩 위에 납작하게 놓여 있다. 목소리는 멎었고 지하 보관실로 내려가는 계단이 드러났다.'},
  },
  'drowned-broadcast':{
    classes:[
      job('broadcast-rigger','무대 설치 기사','철거 전 안전 점검을 맡았습니다. 케이블과 무대 받침대를 방어 도구로 바꿉니다.','might',['붐대 밀어내기','조명 붐대로 검은 청취자의 팔을 밀고 바닥에 붙은 스피커 선을 떼어 낸다.'],['넘어지지 않는 가림막','붐대를 지렛대 삼아 청취자를 밀친 뒤 선택한 동료 앞에 무거운 흡음판을 세운다.'],'guard'),
      job('broadcast-runner','현장 촬영기사','마지막 철거 기록을 찍으러 왔습니다. 화면 밖의 움직임을 먼저 보고 사각으로 파고듭니다.','agility',['삼각대 걸기','접은 삼각대로 청취자의 발치에 늘어진 전선을 걸고 유리 벽 반대쪽으로 빠진다.'],['검은 화면의 틈','모니터가 꺼지는 찰나를 잡아 뒤쪽 스피커 접속부를 삼각대 끝으로 꿰뚫는다.'],'strike'),
      job('broadcast-engineer','음향 복원사','폐국 당시 녹음을 복원해 달라는 요청을 받았습니다. 소리가 실제로 돌아오는 선을 구별합니다.','wit',['역상 신호','휴대 점검기의 반대 파형을 짧게 보내 청취자의 몸을 이루는 잡음을 흩뜨린다.'],['피드백 차단','울음을 되먹이는 두 접속부를 찾아 램프를 켠다. 뒤이은 공격이 케이블의 약한 곳에 닿는다.'],'expose'),
      job('broadcast-announcer','심야 진행자','죽은 방송에서 자신의 다음 멘트가 들린다는 제보를 받았습니다. 생방송의 박자를 붙잡습니다.','heart',['예고 없는 무음','예고 멘트를 끝내지 않고 딱 한 박자 침묵한다. 다음 말을 받으려던 청취자의 입에서 잡음이 샌다.'],['광고 없이 잠시 쉽니다','꺼진 마이크 쪽으로 종료 신호를 보낸다. 청취자가 끊긴 순서를 다시 세는 동안 다음 움직임을 놓친다.'],'stun'),
    ],
    encounter:{id:'broadcast-waiting-listener',nodeId:'studio',title:'박수가 들린 뒤에',
      intro:['스튜디오 문을 열자 아무도 없는 방에서 박수가 터진다. 유리 뒤 빨간 등이 켜지고, 늘어진 스피커 선들이 사람 모양으로 일어난다. 얼굴 한가운데에는 입 대신 작은 수신기 하나가 달려 있다.','수신기에서 당신의 마지막 숨소리가 크게 재생된다. 그 소리가 끝나기 전에 검은 형체가 문을 막는다. 바닥의 선을 끊거나 소리가 되돌아오는 박자를 무너뜨려야 한다. 열린 기록실 문은 그 뒤에 있다.'],
      enemyName:'다음 말을 기다리는 청취자',enemyDescription:'방송 선과 잡음으로 뭉친 형체. 켜진 수신기가 숨소리를 되풀이하며 사람을 좇습니다. 음향 연결이 끊기면 스피커 안으로 무너집니다.',
      intents:[attack('숨 되감기','예고된 사람의 숨소리가 거꾸로 재생되며 목을 조이는 압력이 밀려옵니다.'),attack('작은 신음 찾기','생명이 낮아 지목된 사람의 신음 쪽으로 전선들이 몰려가 다리를 감습니다.','weakest'),attack('박수 신호','예고된 사람 옆 흡음판이 갑작스러운 박수와 함께 안쪽으로 넘어집니다.')],
      victoryText:'되먹임이 끊기자 청취자가 검은 전선 더미로 풀린다. 수신기에서 마지막 박수 한 번이 새고 멎었다. 스튜디오 뒤 기록실의 비상등은 아직 녹색이다. 빨간 등이 다시 켜지기 전에 그 문으로 이동할 수 있다.',
      defeatText:'마지막 사람의 숨까지 수신기에 들어간다. 텅 빈 스튜디오에서 청취자는 이제 누구의 목소리로도 다음 방송을 시작할 수 있다.',victoryFlag:'broadcast_listener_cut',victoryFlagLabel:'스튜디오의 청취자를 전선에서 떼어 냈다',victoryCallback:'풀린 전선들은 의자 밑에 고요히 놓여 있다. 스피커는 꺼졌고 뒤편 기록실의 녹색 비상등만 남았다.'},
  },
};
export const HORROR_CAST={
  'hollow-apartment':[['혜원','아파트 관리인'],['재윤','404호 실종 주민'],['수경','재윤의 누나']],
  'drowned-broadcast':[['서하','전직 음향감독'],['태오','실종된 심야 진행자'],['은솔','철거 현장 경비원']],
};
export const HORROR_ENDING_MOODS={
  'hollow-apartment':{'dawn-homes':'hope','open-stair':'hope','keeper-door':'grief','ash-address':'grief','borrowed-home':'danger'},
  'drowned-broadcast':{'quiet-morning':'hope','last-news':'hope','tide-break':'grief','night-watch':'grief','open-channel':'danger'},
};
/** Shared authoring helpers expand into the existing engine's plain-data schema. */
export const A=(id,label,next,text,effects={},options={})=>({id,label,automatic:true,risk:'이 행동은 주사위 없이 선택한 대로 진행됩니다.',...options,outcomes:{success:{text,next,...effects}}});
export const R=(id,label,stat,dc,next,texts,effects={},options={})=>({id,label,stat,dc,risk:options.risk||'실패하면 어둠이 가까워집니다. 진행할 길은 남습니다.',...options,outcomes:Object.fromEntries(['critical','success','failure','fumble'].map((grade,i)=>[grade,{text:texts[i],next,pressure:[-1,0,1,2][i],...(effects[grade]||{})}]))});
export const N=(id,title,location,text,choices,extra={})=>({id,title,location,chapter:1,art:0,mood:'mystery',text,summary:text[0],objective:'눈앞의 상황을 확인하고 다음 문으로 향한다.',stakes:'서두르거나 목소리를 믿기 전에 선택의 결과를 확인할 수 있다.',details:[],choices,...extra});
export const D=(id,label,text,extra={})=>({id,label,text,...extra});
export const E=(id,title,text,extra={})=>({id,title,location:'사건 이후',chapter:4,art:3,mood:'calm',ending:true,text,choices:[],...extra});
