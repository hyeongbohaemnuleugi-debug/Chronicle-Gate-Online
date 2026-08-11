import test from 'node:test';
import assert from 'node:assert/strict';
import { CAMPAIGNS } from '../campaign-data.js';

test('all story and event choices stay short and direct', () => {
  for (const c of CAMPAIGNS) {
    for (const beat of c.storyBeats || []) for (const choice of beat.choices || []) {
      assert.ok([...choice.label].length <= 18, `${c.id} story choice too long: ${choice.label}`);
    }
    for (const event of c.events || []) for (const choice of event.choices || []) {
      assert.ok([...choice.label].length <= 18, `${c.id} event choice too long: ${choice.label}`);
    }
  }
});

test('campaigns keep clearly separate narrative identities', () => {
  const expected = {
    ember:['왕관','즉위'], neon:['기억','MOTHER-9'], abyss:['심해','산소'],
    clock:['루프','종'], wild:['별','숲'], guardian:['캔터베리','헤븐홀드'], echo:['유리별','탐사대']
  };
  for (const c of CAMPAIGNS) {
    const text=[c.intro,...(c.storyBeats||[]).filter(b=>!b.branchScene).map(b=>b.text)].join(' ');
    for(const keyword of expected[c.id]||[]) assert.ok(text.includes(keyword), `${c.id} missing identity keyword ${keyword}`);
  }
});

test('guardian unified saga uses fifteen distinct acts', () => {
  const g=CAMPAIGNS.find(c=>c.id==='guardian');
  assert.equal(g.acts.length,15);
  assert.equal(new Set(g.acts).size,15);
});
