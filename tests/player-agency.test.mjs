import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const server=fs.readFileSync(new URL('../server.js',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
test('TRPG freedom keeps quick choices small and enables direct action input',()=>{
 assert.match(server,/choiceTarget:4/); assert.match(server,/choiceTarget:3/);
 assert.match(server,/freeAction:true/); assert.match(server,/validateFreeAction/);
 assert.match(app,/Boolean\(beat\?\.freeActionAllowed\)/);
 assert.match(app,/이 행동을 해본다/);
});
test('free actions reject impossible scene actions instead of accepting nonsense',()=>{
 for(const text of ['싸울 대상이 없습니다','대화할 사람이 없습니다','뒤를 밟을 대상이 없습니다','도울 대상이 보이지 않습니다']) assert.match(server,new RegExp(text));
});
test('all six abilities can interpret distinct approaches',()=>{ for(const s of ['근력','민첩','지능','지혜','매력','체력']) assert.match(server,new RegExp(`'${s}'`)); });
