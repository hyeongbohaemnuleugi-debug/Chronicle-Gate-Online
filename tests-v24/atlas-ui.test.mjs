import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {JSDOM} from 'jsdom';
import {CAMPAIGNS,getCampaign} from '../public/game/campaigns/index.js';
import {createStoryState,viewGame} from '../public/game/engine.js';
import {startCombat} from '../public/game/combat.js';
import {BATTLE_APPEARANCES} from '../public/game/battle-assets.js';
import {NEW_ENEMY_APPEARANCES} from '../public/game/enemy-atlases-v24.js';
import {renderBattleScreen,hydrateBattleSprites} from '../public/game/battle-ui.js';

const root=new URL('../',import.meta.url);
const read=path=>fs.readFileSync(new URL(path,root));
const manifest=JSON.parse(read('scripts/battle-art/manifest-v24.json'));
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const appearances=Object.values(NEW_ENEMY_APPEARANCES);

test('36 new identities have 36 distinct art cells, including nine living human opponents',()=>{
  assert.equal(appearances.length,36);
  assert.equal(appearances.filter(a=>a.kind==='person').length,9);
  const seen=new Set();
  for(const a of appearances){
    const key=`${a.src}#${a.crop.index}`;
    assert.ok(!seen.has(key),`${a.name} must not be a renamed or recoloured existing sprite`);seen.add(key);
    const sheet=manifest.entries.find(e=>`/${e.file.replace(/^public\//,'')}?v=24000`===a.src);
    assert.ok(sheet,`A real local image is required for ${a.id}`);
    assert.equal(sheet.columns,a.crop.columns);assert.equal(sheet.rows,a.crop.rows);
    assert.equal(sheet.cells.find(c=>c.index===a.crop.index)?.id,a.id);
    assert.equal(sheet.cells.find(c=>c.index===a.crop.index)?.name,a.name);
    assert.ok(a.alt.includes(' ')&&a.alt.length>25);
  }
  for(const source of CAMPAIGNS){
    const c=getCampaign(source.id,'epic');
    const ids=c.encounterCatalog.map(e=>e.id);
    assert.equal(new Set(ids).size,5);
    assert.equal(ids.filter(id=>NEW_ENEMY_APPEARANCES[id]?.kind==='person').length,1);
    for(const e of c.encounterCatalog)assert.equal(BATTLE_APPEARANCES[e.id].name,e.name);
  }
});

test('delivered atlases retain real alpha, unclipped cells and the measured compact-file budget',()=>{
  assert.equal(manifest.entries.length,10);
  assert.equal(manifest.activeNewEnemyCount,36);
  let total=0;const hashes=new Set();
  for(const entry of manifest.entries){
    const bytes=read(entry.file);total+=bytes.length;hashes.add(sha(bytes));
    assert.equal(bytes.length,entry.bytes);assert.equal(sha(bytes),entry.sha256);
    assert.equal(bytes.subarray(0,4).toString(),'RIFF');assert.equal(bytes.subarray(8,12).toString(),'WEBP');
    assert.equal(bytes.subarray(12,16).toString(),'VP8X');assert.ok(bytes[20]&0x10,'transparency must survive encoding');
    assert.equal(bytes.readUIntLE(24,3)+1,entry.width);assert.equal(bytes.readUIntLE(27,3)+1,entry.height);
    const side=entry.width/entry.columns;assert.equal(side,320);assert.equal(entry.height/entry.rows,side);
    for(const cell of entry.cells){const [l,t,r,b]=cell.alphaBounds;assert.ok(l>0&&t>0&&r<side&&b<side,`${cell.id} crosses a crop boundary`);}
  }
  assert.equal(hashes.size,10);assert.equal(total,manifest.totalBytes);assert.ok(total<1_600_000,`new atlas bytes: ${total}`);
});

test('all 45 opponents render their own actual image and correctly positioned crop for solo and four players',()=>{
  for(const source of CAMPAIGNS){
    const campaign=getCampaign(source.id,'epic');
    for(const entry of campaign.encounterCatalog)for(const count of [1,4]){
      const players=campaign.classes.slice(0,count).map((job,i)=>({id:`p${i}`,name:`동료 ${i+1}`,classId:job.id}));
      const game=createStoryState(campaign,players,{storyLength:'epic'});game.nodeId=entry.arenaId;startCombat(game,campaign);
      const view=viewGame(game,campaign,'p0'),a=BATTLE_APPEARANCES[entry.id];
      const dom=new JSDOM(renderBattleScreen(view,{meId:'p0',art:()=>'',commands:'<button data-combat="basic">기본 공격</button><button data-combat="ability">직업 능력</button>'}));
      try{
        const doc=dom.window.document,img=doc.querySelector('[data-battle-enemy] img');
        assert.equal(img.getAttribute('src'),a.src);assert.equal(img.alt,a.alt);
        assert.equal(doc.querySelector('#combat-title').textContent,a.name);
        assert.equal(doc.querySelectorAll('[data-fighter-id]').length,count);
        assert.equal(doc.querySelectorAll('[data-combat]').length,2);
        if(a.crop){
          const {columns,rows,index}=a.crop;
          assert.equal(img.style.left,`${-(index%columns)*100}%`);assert.equal(img.style.top,`${-Math.floor(index/columns)*100}%`);
          assert.equal(img.style.width,`${columns*100}%`);assert.equal(img.style.height,`${rows*100}%`);
          assert.ok(img.parentElement.matches('.battle-enemy-sprite.battle-sprite-crop'));
          assert.equal(img.style.transform,'','Only the crop window participates in attack/hover motion');
        }else assert.ok(img.matches('.battle-enemy-sprite'));
      }finally{dom.window.close();}
    }
  }
});

test('a failed atlas hides the complete crop window and retains the real opponent name',()=>{
  const campaign=getCampaign('last-train','basic');
  const entry=campaign.encounterCatalog.find(e=>NEW_ENEMY_APPEARANCES[e.id]?.kind==='person');
  const game=createStoryState(campaign,[{id:'p0',name:'나',classId:campaign.classes[0].id}]);game.nodeId=entry.arenaId;startCombat(game,campaign);
  const dom=new JSDOM(renderBattleScreen(viewGame(game,campaign,'p0'),{meId:'p0',art:()=>''}));
  try{
    const doc=dom.window.document,img=doc.querySelector('.battle-atlas-image');hydrateBattleSprites(doc);img.dispatchEvent(new dom.window.Event('error'));
    assert.equal(img.parentElement.hidden,true);assert.equal(doc.querySelector('.battle-enemy-fallback').hidden,false);
    assert.ok(doc.querySelector('.battle-enemy-fallback').textContent.includes(entry.name));
  }finally{dom.window.close();}
});

test('crop motion and reduced-motion styles never expose another cell',()=>{
  const css=read('public/game/styles.css').toString();
  assert.match(css,/\.battle-sprite-crop\s*\{[^}]*overflow:\s*hidden/s);
  assert.match(css,/\.battle-atlas-image\s*\{[^}]*position:\s*absolute;[^}]*max-width:\s*none/s);
  assert.doesNotMatch(css,/\.battle-atlas-image\s*\{[^}]*animation:/s);
  assert.match(css,/\.battle-screen\.reduce-motion \.battle-enemy-sprite[^}]*animation:\s*none!important/s);
});
