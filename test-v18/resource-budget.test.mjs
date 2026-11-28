import {SCENE_SOUNDS} from '../public/game/scene-sound.js';
/**
 * Release resource gates: real file bytes and MPEG frames, plus Audio transport
 * unit tests. The Audio substitute records requested URLs; it is not a browser,
 * a listening test, an acoustic-quality assessment, or proof of hosted quotas.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createAudio } from '../public/game/audio.js';
import { HORROR_LOOPS } from '../public/game/horror-loops.js';
import { BATTLE_EFFECTS } from '../public/game/battle-audio-assets.js';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const GAME = path.join(ROOT, 'public/game');
const AUDIO = path.join(GAME, 'audio');
const ART = path.join(GAME, 'art');
const manifest = JSON.parse(fs.readFileSync(path.join(AUDIO, 'manifest.json'), 'utf8'));
const THEMES = ['last-train', 'glass-hotel', 'moon-market', 'deep-sea', 'dragon-banquet', 'clock-city', 'snow-radio'];
const MOODS = ['calm', 'danger', 'hope', 'mystery', 'tension', 'grief'];
const EFFECTS = ['dice', 'success', 'mixed', 'failure', 'clue', 'reveal', 'transition', 'attack', 'ability', 'enemy', 'victory', 'death', 'revive'];
const HORROR_KEYS = [
  'horror-apartment-ambient', 'horror-apartment-tension', 'horror-apartment-danger',
  'horror-broadcast-ambient', 'horror-broadcast-tension', 'horror-broadcast-danger',
  'horror-shared-grief', 'horror-shared-relief',
];
// v24 retains every v23 audio/image file and adds authored opponent atlases.
// This explicit new-content allowance is a file budget, not a hosted-account quota.
// Budgets apply to measured delivered files; no WAV masters or runtime synthesis are shipped.
const BUDGET = 23_500_000;
const AUDIO_BUDGET = 17_000_000;
const HORROR_BUDGET = 2_400_000;
const relative = file => path.relative(ROOT, file).split(path.sep).join('/');
function files(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(directory, entry.name);
    return entry.isDirectory() ? files(full) : entry.isFile() ? [full] : [];
  });
}
const allFiles = files(GAME);
const fileBytes = file => fs.statSync(file).size;

function mp3Header(buffer, offset) {
  if (offset + 4 > buffer.length || buffer[offset] !== 0xff || (buffer[offset + 1] & 0xe0) !== 0xe0) return null;
  const version = (buffer[offset + 1] >> 3) & 3;
  const layer = (buffer[offset + 1] >> 1) & 3;
  const rateIndex = (buffer[offset + 2] >> 2) & 3;
  const bitrateIndex = buffer[offset + 2] >> 4;
  if (version === 1 || layer !== 1 || rateIndex === 3 || bitrateIndex === 0 || bitrateIndex === 15) return null;
  const bitrates = version === 3
    ? [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320]
    : [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160];
  const sampleRate = [44_100, 48_000, 32_000][rateIndex] / (version === 3 ? 1 : version === 2 ? 2 : 4);
  const kbps = bitrates[bitrateIndex];
  const padding = (buffer[offset + 2] >> 1) & 1;
  return {
    sampleRate, kbps, channels: (buffer[offset + 3] >> 6) === 3 ? 1 : 2,
    samples: version === 3 ? 1152 : 576,
    length: Math.floor((version === 3 ? 144 : 72) * kbps * 1000 / sampleRate) + padding,
  };
}
function inspectMp3(buffer) {
  let offset = 0;
  if (buffer.subarray(0, 3).toString() === 'ID3') {
    assert.ok(buffer.length >= 10, 'truncated ID3 header');
    const tagSize = (buffer[6] & 127) * 2 ** 21 + (buffer[7] & 127) * 2 ** 14 + (buffer[8] & 127) * 128 + (buffer[9] & 127);
    offset = 10 + tagSize + ((buffer[5] & 0x10) ? 10 : 0);
  }
  let first;
  for (; offset < Math.min(buffer.length - 4, 65_536); offset++) {
    const h = mp3Header(buffer, offset);
    if (h && mp3Header(buffer, offset + h.length)) { first = h; break; }
  }
  assert.ok(first, 'no consecutive MPEG Layer III audio frames');
  let frames = 0, seconds = 0, maxKbps = 0;
  while (offset + 4 <= buffer.length) {
    const frame = mp3Header(buffer, offset);
    if (!frame || offset + frame.length > buffer.length) break;
    assert.equal(frame.channels, 1, 'delivery audio should remain mono');
    assert.equal(frame.sampleRate, first.sampleRate, 'sample rate changes in one audio file');
    seconds += frame.samples / frame.sampleRate;
    frames++; maxKbps = Math.max(maxKbps, frame.kbps); offset += frame.length;
  }
  assert.ok(frames >= 3, 'audio contains too few decodable frames');
  return { ...first, frames, seconds, maxKbps };
}

test('all public game resources fit 23.5 MB, with audio below 17 MB and new horror scores below 2.4 MB', t => {
  const total = allFiles.reduce((sum, file) => sum + fileBytes(file), 0);
  const audioTotal = files(AUDIO).reduce((sum, file) => sum + fileBytes(file), 0);
  const artTotal = files(ART).reduce((sum, file) => sum + fileBytes(file), 0);
  assert.ok(total <= BUDGET, `public/game is ${total.toLocaleString()} bytes, exceeding ${BUDGET.toLocaleString()}; largest: ${allFiles.sort((a, b) => fileBytes(b) - fileBytes(a)).slice(0, 4).map(f => `${relative(f)}=${fileBytes(f)}`).join(', ')}`);
  assert.ok(audioTotal <= AUDIO_BUDGET, `audio directory exceeds its 17 MB delivery budget: ${audioTotal}`);
  const horrorTotal = HORROR_KEYS.reduce((sum, key) => sum + fileBytes(path.join(AUDIO, `${key}.mp3`)), 0);
  assert.ok(horrorTotal <= HORROR_BUDGET, `eight horror scores exceed their 2.4 MB delivery budget: ${horrorTotal}`);
  assert.ok(!allFiles.some(file => /\.(?:wav|flac|aiff|aif)$/i.test(file)), 'uncompressed masters must not be shipped in public/game');
  t.diagnostic(`public/game=${total} bytes; audio=${audioTotal}; art=${artTotal}; music=50, effects=${25+BATTLE_EFFECTS.length}; new horror=${horrorTotal}`);
});

test('all 42 mood scores and 13 effects are unique, valid mono MP3 files with honest duration metadata', () => {
  assert.equal(Number.parseInt(String(manifest.version), 10), 20);
  assert.equal(manifest.files.length, 55);
  const names = manifest.files.map(entry => entry.file);
  assert.equal(new Set(names).size, 55);
  assert.deepEqual(names.slice().sort(), [
    ...THEMES.flatMap(theme => MOODS.map(mood => `${theme}-${mood}.mp3`)),
    ...EFFECTS.map(effect => `${effect}.mp3`),
  ].sort());
  assert.deepEqual(files(AUDIO).filter(file => /\.mp3$/i.test(file)).map(file => path.relative(AUDIO,file).split(path.sep).join('/')).sort(), [
    ...names, ...SCENE_SOUNDS.map(key => `${key}.mp3`), ...HORROR_KEYS.map(key => `${key}.mp3`),
    ...BATTLE_EFFECTS.map(key => `sfx/${key}.mp3`),
  ].sort(), 'the complete MP3 directory must contain exactly 55 original, 12 contextual, eight horror and 13 battle files');
  for (const entry of manifest.files) {
    assert.equal(path.basename(entry.file), entry.file, 'manifest must reference a local filename');
    const absolute = path.join(AUDIO, entry.file);
    const buffer = fs.readFileSync(absolute);
    const decoded = inspectMp3(buffer);
    assert.ok(buffer.length > 1000, `${entry.file}: unexpectedly empty audio`);
    assert.equal(decoded.channels, 1, entry.file);
    assert.equal(decoded.sampleRate, entry.sampleRate, `${entry.file}: sample rate metadata`);
    assert.ok(Math.abs(decoded.seconds - entry.seconds) < .2, `${entry.file}: manifest ${entry.seconds}s, MPEG frames ${decoded.seconds.toFixed(3)}s`);
    assert.equal(decoded.maxKbps, 96, `${entry.file}: release delivery should use the agreed 96 kbps quality setting`);
    if (entry.bytes != null) assert.equal(entry.bytes, buffer.length, `${entry.file}: byte metadata`);
    assert.equal(entry.codec ?? manifest.codec, 'mp3', `${entry.file}: codec metadata`);
    assert.equal(entry.mime ?? manifest.mime, 'audio/mpeg', `${entry.file}: MIME metadata`);
    if (entry.kind === 'music') {
      assert.ok(THEMES.includes(entry.theme)); assert.ok(MOODS.includes(entry.mood));
      assert.ok(buffer.length < 480_000, `${entry.file}: per-track bandwidth budget`);
    } else { assert.equal(entry.kind, 'effect'); assert.ok(buffer.length < 48_000, `${entry.file}: effect bandwidth budget`); }
  }
});

test('all eight horror scores have verified bytes, 48 kbps mono frames and matching authored loop metadata', () => {
  assert.deepEqual(Object.keys(HORROR_LOOPS).sort(), [...HORROR_KEYS].sort());
  const audit = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/horror-score-audit-v24_1.json'), 'utf8'));
  assert.deepEqual(audit.tracks.map(entry => entry.id).sort(), [...HORROR_KEYS].sort());
  for (const key of HORROR_KEYS) {
    const entry = audit.tracks.find(row => row.id === key);
    const file = path.join(AUDIO, `${key}.mp3`), buffer = fs.readFileSync(file), decoded = inspectMp3(buffer);
    assert.equal(path.basename(entry.file), `${key}.mp3`, key);
    assert.equal(buffer.length, entry.bytes, `${key}: size matches the delivered audit`);
    assert.equal(crypto.createHash('sha256').update(buffer).digest('hex'), entry.sha256, `${key}: MP3 hash`);
    assert.equal(decoded.channels, 1, key);
    assert.equal(decoded.sampleRate, 32_000, key);
    assert.equal(decoded.maxKbps, 48, `${key}: dedicated horror encoding budget`);
    const loop = HORROR_LOOPS[key];
    for (const field of ['sampleRate', 'startFrame', 'endFrame', 'sourceFrames']) assert.equal(loop[field], entry.loop[field], `${key}: ${field}`);
    assert.equal(loop.sampleRate, decoded.sampleRate, key);
    assert.equal(loop.startFrame, 16_000, `${key}: half-second leading guard`);
    assert.equal(loop.sourceFrames - loop.endFrame, 16_000, `${key}: half-second trailing guard`);
    assert.ok(loop.endFrame > loop.startFrame, `${key}: nonempty loop`);
    assert.ok(Math.abs(decoded.seconds - loop.sourceFrames / loop.sampleRate) < .2, `${key}: actual MPEG duration matches authored source`);
    assert.ok(buffer.length > 100_000 && buffer.length < 350_000, `${key}: complete bounded score`);
  }
});

test('every story retains a nonempty WebP scene atlas', () => {
  for (const theme of THEMES) {
    const file = path.join(ART, `${theme}.webp`), data = fs.readFileSync(file);
    assert.equal(data.subarray(0, 4).toString(), 'RIFF', theme);
    assert.equal(data.subarray(8, 12).toString(), 'WEBP', theme);
    assert.ok(data.length > 20_000 && data.length < 600_000, `${theme}: missing or unexpectedly oversized atlas`);
  }
});

function audioHarness(saved = {}) {
  const names = ['Audio', 'localStorage', 'requestAnimationFrame'];
  const old = new Map(names.map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
  const media = [];
  class RecordedAudio extends EventTarget {
    constructor(src) { super(); this.src = src; this.initialSrc = src; this.dataset = {}; this.paused = true; this.currentTime = 0; this.volume = 0; this.loop = false; this.plays = 0; media.push(this); }
    play() { this.plays++; this.paused = false; return Promise.resolve(); }
    pause() { this.paused = true; }
    load() {}
    removeAttribute(name) { if (name === 'src') this.src = ''; }
  }
  const store = new Map([['cg-v14-audio', JSON.stringify(saved)]]);
  Object.defineProperty(globalThis, 'Audio', { configurable: true, writable: true, value: RecordedAudio });
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, writable: true, value: { getItem: key => store.get(key) ?? null, setItem: (key, value) => store.set(key, value) } });
  Object.defineProperty(globalThis, 'requestAnimationFrame', { configurable: true, writable: true, value: fn => { queueMicrotask(() => fn(performance.now() + 10000)); return 1; } });
  const mixer = createAudio();
  return { mixer, media, restore() { mixer.destroy(); for (const name of names) { const descriptor = old.get(name); if (descriptor) Object.defineProperty(globalThis, name, descriptor); else delete globalThis[name]; } } };
}
const settle = () => new Promise(resolve => setImmediate(resolve));

test('audio requests start only with consent and nonzero volume; repeated scene state keeps the same BGM', async () => {
  const h = audioHarness({ enabled: true, music: .35, effects: .55 });
  try {
    assert.equal(h.mixer.preferences.enabled, false, 'a previous enabled preference must not autoplay on a new visit');
    h.mixer.scene('last-train', 'mystery'); h.mixer.effect('dice'); await settle();
    assert.equal(h.media.length, 0, 'silent startup must not request any audio');
    h.mixer.setVolumes(0, 0); await h.mixer.enable(); h.mixer.effect('attack'); await settle();
    assert.equal(h.media.length, 0, 'enabled but zero-volume music/effects must not request media');
    h.mixer.setVolumes(.35, .55); h.mixer.scene('last-train', 'mystery'); await settle();
    assert.equal(h.media.length, 1); assert.equal(h.media[0].initialSrc, '/game/audio/last-train-mystery.mp3?v=20000');
    h.media[0].currentTime = 9.5;
    for (let i = 0; i < 10; i++) h.mixer.scene('last-train', 'mystery');
    await settle();
    assert.equal(h.media.length, 1, 'room updates must not construct a new Audio for the same scene');
    assert.equal(h.media[0].currentTime, 9.5, 'room updates must not rewind already playing music');
    h.mixer.scene('last-train', 'danger'); await settle();
    assert.equal(h.media.length, 2); assert.equal(h.media[1].initialSrc, '/game/audio/last-train-danger.mp3?v=20000');
    h.mixer.disable();
    h.mixer.scene('glass-hotel', 'hope'); h.mixer.effect('victory'); await settle();
    assert.equal(h.media.length, 2, 'disabled audio must not fetch the next theme or effects');
    assert.ok(h.media.every(item => item.paused), 'disable must stop active tracks');
  } finally { h.restore(); }
});

test('short effects stay local, use MP3, and cap concurrent playback', async () => {
  const h = audioHarness();
  try {
    h.mixer.setVolumes(0, .5); await h.mixer.enable();
    for (let i = 0; i < 12; i++) h.mixer.effect('dice');
    await settle(); assert.equal(h.media.length, 4, 'effect burst should be capped at four active sounds');
    assert.ok(h.media.every(item => item.initialSrc === '/game/audio/dice.mp3?v=17000'));
    h.mixer.effect('../../external'); assert.equal(h.media.length, 4);
    h.media[0].dispatchEvent(new Event('ended'));
    h.mixer.effect('success'); await settle();
    assert.equal(h.media.length, 5); assert.equal(h.media.at(-1).initialSrc, '/game/audio/success.mp3?v=17000');
  } finally { h.restore(); }
});

test('optional installed media tools can decode representative delivery assets', { timeout: 20_000 }, t => {
  const available = spawnSync('ffprobe', ['-version'], { timeout: 2000, encoding: 'utf8' });
  const decoder = spawnSync('ffmpeg', ['-version'], { timeout: 2000, encoding: 'utf8' });
  if (available.error?.code === 'ENOENT' || decoder.error?.code === 'ENOENT') { t.skip('ffprobe/ffmpeg are optional validation tools, not runtime dependencies'); return; }
  assert.equal(available.status, 0, available.stderr); assert.equal(decoder.status, 0, decoder.stderr);
  for (const name of ['last-train-mystery.mp3', 'snow-radio-calm.mp3', 'victory.mp3']) {
    const filename = path.join(AUDIO, name);
    const probe = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'a:0', '-show_entries', 'stream=codec_name,sample_rate,channels', '-of', 'json', filename], { timeout: 4000, encoding: 'utf8' });
    assert.equal(probe.status, 0, `${name}: ${probe.stderr}`);
    const stream = JSON.parse(probe.stdout).streams[0];
    assert.equal(stream.codec_name, 'mp3'); assert.equal(stream.channels, 1);
    const decode = spawnSync('ffmpeg', ['-v', 'error', '-i', filename, '-f', 'null', '-'], { timeout: 4000, encoding: 'utf8' });
    assert.equal(decode.status, 0, `${name}: decoding failed: ${decode.stderr}`);
    assert.equal(decode.stderr.trim(), '', `${name}: decoder reported corrupt audio`);
  }
});

test('obsolete-master cleanup previews safely and removes only hash-verified local originals', () => {
  // Exercise the shipped cleanup program in a disposable miniature project.
  // The actual release tree, user media, and save directories are never edited.
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'chronicle-v17-cleanup-'));
  const target = path.join(fixture, 'public/game/audio');
  const script = path.join(fixture, 'scripts/cleanup-v17.mjs');
  const digest = value => crypto.createHash('sha256').update(value).digest('hex');
  try {
    fs.mkdirSync(target, { recursive: true }); fs.mkdirSync(path.dirname(script), { recursive: true });
    fs.copyFileSync(path.join(ROOT, 'scripts/cleanup-v17.mjs'), script);
    const source = Buffer.from('original generated master');
    const compact = Buffer.from('verified compact replacement');
    const rows = ['matching', 'modified', 'missing-replacement', 'linked'].map(name => ({ file: `${name}.mp3`, sourceWavSha256: digest(source), sha256: digest(compact) }));
    const manifestPath = path.join(target, 'manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify({ version: 17, files: rows }));
    for (const row of rows) fs.writeFileSync(path.join(target, row.file), compact);
    fs.writeFileSync(path.join(target, 'matching.wav'), source);
    fs.writeFileSync(path.join(target, 'modified.wav'), 'user edited master');
    fs.writeFileSync(path.join(target, 'missing-replacement.wav'), source);
    fs.rmSync(path.join(target, 'missing-replacement.mp3'));
    const outside = path.join(fixture, 'keep-outside.wav');
    fs.writeFileSync(outside, source);
    fs.symlinkSync(outside, path.join(target, 'linked.wav'));
    const saves = path.join(fixture, 'saves.json'); fs.writeFileSync(saves, '{"precious":"session"}');
    const run = (...args) => spawnSync(process.execPath, [script, ...args], { cwd: fixture, timeout: 3000, encoding: 'utf8' });
    const preview = run();
    assert.equal(preview.status, 0, preview.stderr);
    const previewInfo = JSON.parse(preview.stdout.slice(0, preview.stdout.lastIndexOf('}') + 1));
    assert.equal(previewInfo.mode, 'preview'); assert.equal(previewInfo.files, 1); assert.equal(previewInfo.retained.length, 3);
    assert.ok(fs.existsSync(path.join(target, 'matching.wav')), 'preview must leave the original intact');
    const apply = run('--apply'); assert.equal(apply.status, 0, apply.stderr);
    const outcome = JSON.parse(apply.stdout); assert.equal(outcome.files, 1); assert.equal(outcome.retained.length, 3);
    assert.ok(!fs.existsSync(path.join(target, 'matching.wav')), 'verified obsolete master should be removed');
    assert.equal(fs.readFileSync(path.join(target, 'modified.wav'), 'utf8'), 'user edited master');
    assert.ok(fs.existsSync(path.join(target, 'missing-replacement.wav')), 'no verified replacement means no deletion');
    assert.ok(fs.lstatSync(path.join(target, 'linked.wav')).isSymbolicLink(), 'symbolic links must not be followed');
    assert.deepEqual(fs.readFileSync(outside), source); assert.equal(fs.readFileSync(saves, 'utf8'), '{"precious":"session"}');
    const repeated = run('--apply'); assert.equal(repeated.status, 0, repeated.stderr); assert.equal(JSON.parse(repeated.stdout).files, 0, 'cleanup should be idempotent');
    fs.writeFileSync(manifestPath, JSON.stringify({ version: 17, files: [{ file: '../../../keep-outside.mp3', sourceWavSha256: digest(source), sha256: digest(compact) }] }));
    const malformed = run('--apply'); assert.notEqual(malformed.status, 0, 'path traversal record must be rejected');
    assert.deepEqual(fs.readFileSync(outside), source, 'invalid manifests must not reach outside the audio directory');
  } finally { fs.rmSync(fixture, { recursive: true, force: true }); }
});
