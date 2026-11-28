/**
 * Source and encoded-asset release gates for the v24.1 horror replacement.
 * The audit is tied to the exact source and delivered bytes. Its measurements
 * do not establish musical taste, acoustic-device quality, or browser playback.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { HORROR_AUDIO_VERSION, HORROR_LOOPS } from '../public/game/horror-loops.js';

const read = relative => fs.readFileSync(new URL(`../${relative}`, import.meta.url));
const json = relative => JSON.parse(read(relative).toString('utf8'));
const hash = relative => crypto.createHash('sha256').update(read(relative)).digest('hex');
const score = json('scripts/horror-score-v24_1.json');
const audit = json('scripts/horror-score-audit-v24_1.json');
const baseline = json('scripts/baseline-v24.json');
const keyList = Object.keys(HORROR_LOOPS).sort();
const midi = note => {
 const match = /^([A-G])([b#]?)(-?\d+)$/.exec(note);
 assert.ok(match, `invalid authored pitch: ${note}`);
 return (Number(match[3]) + 1) * 12 + ({ C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[match[1]]) + ({ '': 0, '#': 1, b: -1 }[match[2]]);
};

test('all 80 other music and effect files keep their exact delivered v24 bytes', () => {
 const preserved = baseline.preservedFiles.filter(entry => entry.path.endsWith('.mp3'));
 assert.equal(preserved.length, 80);
 for (const entry of preserved) {
  assert.equal(read(entry.path).length, entry.bytes, entry.path);
  assert.equal(hash(entry.path), entry.sha256, `${entry.path}: unrelated audio was changed`);
 }
 assert.equal(baseline.horrorFiles.length, 8);
 for (const entry of baseline.horrorFiles) {
  assert.notEqual(hash(entry.path), entry.sha256, `${entry.path}: old quiet score was not replaced`);
 }
});

test('the replacement score, codec audit and runtime index identify the same eight current assets', () => {
 assert.equal(HORROR_AUDIO_VERSION, '24100');
 assert.equal(score.audioVersion, HORROR_AUDIO_VERSION);
 assert.equal(audit.audioVersion, HORROR_AUDIO_VERSION);
 assert.equal(score.version, '24.1.0');
 assert.equal(audit.version, '24.1.0');
 assert.equal(score.sampleRate, 32000);
 assert.deepEqual(score.tracks.map(track => track.id).sort(), keyList);
 assert.deepEqual(audit.tracks.map(track => track.id).sort(), keyList);
 assert.equal(audit.trackCount, 8);
 assert.equal(hash(audit.source.script), audit.source.scriptSha256, 'audit must be generated from the shipped composer');
 assert.equal(hash(audit.source.score), audit.source.scoreSha256, 'audit must cover the shipped note schedule');
 assert.equal(hash(audit.runtimeIndex.file), audit.runtimeIndex.sha256, 'audit must cover the shipped loop points');
 assert.equal(audit.totalBytes, audit.tracks.reduce((sum, track) => sum + read(`public/game/audio/${track.file}`).length, 0));
 assert.ok(audit.totalBytes < 2_400_000, 'horror replacement stays inside its current media budget');
});

for (const track of score.tracks) {
 test(`${track.id}: pitched foreground phrases cover the complete score without a continuous noise layer`, () => {
  const row = audit.tracks.find(entry => entry.id === track.id);
  assert.equal(track.arrangement.continuousNoiseBed, false);
  assert.equal(track.arrangement.noiseLayerCount, 0);
  assert.equal(track.airLevel ?? 0, 0, 'continuous broadband air must not mask the score');
  assert.equal(track.sections.length, 4);
  const foreground = track.events.filter(event => event.role === 'melody');
  assert.ok(foreground.length >= 8, 'a complete foreground phrase schedule is required');
  assert.ok(foreground.every(event => midi(event.note) >= 48), 'the foreground must not be confined to sub-bass pitches');
  assert.ok(new Set(foreground.map(event => event.note)).size >= 3, 'foreground must contain a written motif, not one repeated drone');
  for (const section of track.sections) {
   assert.ok(foreground.some(event => event.atSeconds >= section.atSeconds && event.atSeconds < section.atSeconds + section.lengthSeconds), `no foreground phrase in section ${section.atSeconds}`);
  }
  assert.ok(track.events.some(event => event.role === 'harmony'), 'the motif keeps an authored harmonic accompaniment');
  assert.equal(row.composition.continuousNoiseBed, false);
  assert.equal(row.composition.noiseLayerCount, 0);
  assert.equal(row.composition.sectionCount, 4);
 });

 test(`${track.id}: the delivered master meets matched loudness, peak and loop continuity gates`, () => {
  const row = audit.tracks.find(entry => entry.id === track.id);
  const file = `public/game/audio/${row.file}`;
  assert.equal(hash(file), row.sha256, 'measurements apply to the actual delivered MP3');
  assert.equal(read(file).length, row.bytes);
  assert.equal(track.targetLufs, -22, 'same nominal mastering level as the original stories');
  assert.equal(row.targetLufs, track.targetLufs);
  assert.ok(Math.abs(row.measured.integratedLufs - track.targetLufs) <= .75, 'encoded music must stay near the matched loudness target');
  assert.ok(row.measured.truePeakDbtp <= -2, 'leave codec peak headroom');
  assert.equal(row.measured.clippedSamples, 0);
  assert.equal(row.measured.longestBelowMinus60DbMs, 0, 'no accidental silent holes in the loop');
  assert.ok(row.measured.loopBoundary.jumpTo99thStepRatio < .30, 'no exceptional sample step at the MP3 loop edge');
  assert.ok(row.measured.loopBoundary.secondDifferenceTo99thRatio < 1.5, 'no exceptional curvature at the MP3 loop edge');
  assert.ok(row.measured.loopBoundary.edge100msRmsDifferenceDb < .70, 'loop edge does not introduce an abrupt energy change');
  assert.deepEqual(row.loop, HORROR_LOOPS[track.id]);
 });
}
