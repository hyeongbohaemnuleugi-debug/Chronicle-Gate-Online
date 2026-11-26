/** Pure Node tests: no DOM/dev dependency is required by the production gate. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {CHARACTERS,formatCharacters} from '../public/game/characters.js';
import {LEGACY_CAMPAIGNS as CAMPAIGNS} from '../public/game/campaigns/index.js';

const named=html=>[...html.matchAll(/<strong class="character-name"(?: title="[^"]*")?>(.*?)<\/strong>/gu)].map(match=>match[1]);
const plain=html=>html.replace(/<strong class="character-name"(?: title="[^"]*")?>|<\/strong>/gu,'')
  .replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&amp;/g,'&');

test('all nine casts emphasize the complete known name and preserve its attached Korean particle',()=>{
  assert.equal(Object.keys(CHARACTERS).length,9);
  for(const [id,cast] of Object.entries(CHARACTERS)){
    assert.ok(cast.length>0);
    for(const character of cast){
      const text=`${character.name}에게 물었다.`,html=formatCharacters(text,id);
      assert.deepEqual(named(html),[character.name],`${id}: ${character.name}`);
      assert.equal(plain(html),text);assert.ok(html.includes(`title="${character.role}"`));
    }
  }
});

test('one-syllable names keep Korean subject, object, quoted and combined particles outside the emphasis',()=>{
  const text='민이 우에게는 물었다. 민이는 우와 이야기를 나눈다. 조에게서도 듣고 리를 기다린다. 해린이라고 쓴다. 소라의 답이다.';
  const html=formatCharacters(text,'glass-hotel');
  assert.deepEqual(named(html),['민','우','민','우','조','리','해린','소라']);
  assert.ok(html.includes('>민</strong>이'));assert.ok(html.includes('>우</strong>에게는'));
  assert.equal(plain(html),text);
});

test('ordinary Korean words and longer unlisted names are not partial character matches',()=>{
  const samples={
    'glass-hotel':'민원 주민 우리는 우리에게 우산 조리 조사 조각 도리 리본 소라게 해린수첩 민호에게',
    'last-train':'윤곽 백과사전 백열등 주민 백 년이 지났다. 백 명은 남았다.',
    'moon-market':'단, 한 번뿐이다. 단 한 번. 계단 단순 담요 솔잎 달빛 달력 나비효과 종이토끼풀',
    'clock-city':'윤곽 벨트 모라토리엄 한 사람 오 층 리안나',
    'deep-sea':'온누리 도윤서 백연수 누리집',
    'snow-radio':'가람길 이안경 소미천',
  };
  for(const [id,text] of Object.entries(samples)){
    assert.deepEqual(named(formatCharacters(text,id)),[],id);
    assert.equal(plain(formatCharacters(text,id)),text);
  }
});

test('casts stay story-specific and an identical name keeps the correct local role',()=>{
  assert.match(formatCharacters('윤이 답한다.','last-train'),/title="차장"/);
  assert.match(formatCharacters('윤이 답한다.','clock-city'),/title="시계탑 관리기사"/);
  assert.deepEqual(named(formatCharacters('누리가 소라에게 말했다.','deep-sea')),['누리']);
  assert.deepEqual(named(formatCharacters('누리가 소라에게 말했다.','glass-hotel')),['소라']);
  assert.deepEqual(named(formatCharacters('달이 종이 토끼를 보고 다음 달을 기다린다.','moon-market')),[]);
  assert.deepEqual(named(formatCharacters('찻집 주인 단, 그리고 한톨이 기다린다.','moon-market')),['단','한톨']);
  assert.deepEqual(named(formatCharacters('한 씨와 오 씨에게 물었다. 한 번 더 오라는 말이다.','clock-city')),['한 씨','오 씨']);
});

test('player names use literal longest matching names without regular-expression or word-prefix surprises',()=>{
  const players=[{name:'민호'},{name:'A+B'},{name:'A.B'},{name:'하린'}];
  const text='민호에게 A+B와 A.B가 말했다. 하린의 답, 하린이의 답, 하린수의 답. 민이 듣는다.';
  const html=formatCharacters(text,'glass-hotel',players);
  assert.deepEqual(named(html),['민호','A+B','A.B','하린','하린','민']);
  assert.equal(plain(html),text);
});

test('HTML, quotes and entities remain literal even when the payload includes a known name',()=>{
  const text='<img src=x onerror="alert(1)">민 & 우<script>소라</script> <strong class="character-name">민</strong>';
  const html=formatCharacters(text,'glass-hotel');
  assert.equal(plain(html),text);
  assert.ok(!html.includes('<img'));assert.ok(!html.includes('<script'));
  assert.ok(html.includes('&lt;img'));assert.ok(html.includes('&amp;'));
  assert.deepEqual(named(html),['민','우','소라','민']);
  const unsafeName='민" data-danger="yes';
  const escaped=formatCharacters(`${unsafeName}에게 묻는다.`,'glass-hotel',[{name:unsafeName}]);
  assert.ok(escaped.includes('민&quot; data-danger=&quot;yes</strong>'));
  assert.ok(!escaped.includes(' data-danger="yes'));
  assert.equal(plain(escaped),`${unsafeName}에게 묻는다.`);
});

test('NPC/player name collisions do not invent a role tooltip and unknown campaigns stay safe',()=>{
  const collision=formatCharacters('민은 답한다.','glass-hotel',[{name:'민'}]);
  assert.equal(collision,'<strong class="character-name">민</strong>은 답한다.');
  for(const id of ['missing','__proto__','constructor']){
    assert.equal(formatCharacters('<민 & 우>',id),'&lt;민 &amp; 우&gt;');
    assert.deepEqual(named(formatCharacters('하린에게 말했다.',id,[{name:'하린'}])),['하린']);
  }
});

test('the four real story verb phrases stay plain while identical NPC subjects remain emphasized',()=>{
  const hotel=CAMPAIGNS.find(c=>c.id==='glass-hotel'),market=CAMPAIGNS.find(c=>c.id==='moon-market'),banquet=CAMPAIGNS.find(c=>c.id==='dragon-banquet');
  const pushing=hotel.nodes.entrance.choices.find(c=>c.id==='staff-door').outcomes.success.text;
  assert.ok(pushing.includes('문을 민다'));
  assert.deepEqual(named(formatCharacters(pushing,hotel.id)),['민','민']);
  const observing=market.nodes.stalls.choices.find(c=>c.id==='buyer-act').outcomes.fumble.text;
  assert.ok(observing.includes('눈에 담고'));
  assert.ok(!named(formatCharacters(observing,market.id)).includes('담'));
  const copy=market.nodes.backstage.choices.find(c=>c.id==='stamp-witness').outcomes.critical.text;
  assert.ok(copy.includes('거절을 담은 사본'));
  assert.ok(!named(formatCharacters(copy,market.id)).includes('담'));
  const rising=banquet.nodes['ending-hearth'].text[1];
  assert.ok(rising.includes('연기가 오르고'));
  assert.ok(!named(formatCharacters(rising,banquet.id)).includes('오르'));
  const manager=hotel.nodes.entrance.choices.find(c=>c.id==='guest').outcomes.failure.text;
  assert.ok(named(formatCharacters(manager,hotel.id)).includes('우'));
  assert.ok(named(formatCharacters(banquet.nodes.council.text[0],banquet.id)).includes('오르'));
  assert.deepEqual(named(formatCharacters('담은 노를 잡는다. 쌀을 담아 둔다. 담과 상인들이 선다.','moon-market')),['담','담']);
  assert.deepEqual(named(formatCharacters('민이다. 민다. 우다. 우이다. 민이에게 묻는다.','glass-hotel')),['민','우','우','민']);
});
