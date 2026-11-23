/** Small editorial gates for the displayed story data; these do not judge literary quality. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { CAMPAIGNS } from '../public/game/campaigns/index.js';

function strings(value, path = '') {
  if (typeof value === 'string') return [[path, value]];
  if (!value || typeof value !== 'object') return [];
  return Object.entries(value).flatMap(([key, child]) => strings(child, `${path}/${key}`));
}

test('authored dialogue and inscriptions have paired, correctly nested quotation marks', () => {
  const pairs = new Map([['“', '”'], ['‘', '’'], ['「', '」']]);
  const closers = new Set(pairs.values());
  for (const story of CAMPAIGNS) {
    for (const [path, text] of strings(story, story.id)) {
      assert.ok(!/[«»]/u.test(text), `${path}: old quotation style obscures dialogue versus written text`);
      const stack = [];
      for (const character of text) {
        if (pairs.has(character)) stack.push(pairs.get(character));
        else if (closers.has(character)) assert.equal(stack.pop(), character, `${path}: mismatched closing quote`);
      }
      assert.equal(stack.length, 0, `${path}: quotation left open`);
    }
  }
});

test('story data stays plain text so saves and reading-copy TXT do not acquire emphasis markup', () => {
  for (const story of CAMPAIGNS) {
    for (const [path, text] of strings(story, story.id)) {
      assert.ok(!/<\/?(?:strong|b|span|script)\b|\*\*/iu.test(text), `${path}: render markup was stored in the story`);
      assert.ok(!/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(text), `${path}: hidden control character`);
    }
  }
});

test('the hotel introduces the porter as a person and explains the contract in every opening mode', () => {
  const story = CAMPAIGNS.find(c => c.id === 'glass-hotel');
  const opening = story.nodes[story.start];
  for (const paragraphs of [opening.text, opening.partyText.solo, opening.partyText.group]) {
    const prose = paragraphs.join(' ');
    assert.match(prose, /짐.{0,20}직원.{0,8}민/u, 'Explain the job and then introduce the name.');
    assert.match(prose, /계약.{0,30}서명|서명.{0,30}계약/u, 'State why the guests stopped moving.');
    assert.match(prose, /직원/u);
    assert.ok(!/미서명|포터/u.test(prose), 'Do not require readers to know an unexplained job or contract term.');
  }
  const visible = strings(story).filter(([path]) => !path.includes('/aliases/')).map(([, text]) => text);
  assert.ok(!/포터|미서명/u.test(visible.join('\n')));
});
