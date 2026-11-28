/**
 * Reproducible authored-content and static-file measurements for v22 / v22.1.
 * Run: node scripts/report-v22.mjs [--baseline /path/to/chronicle-v21]
 * No network, hosting-account queries, timings or performance estimates.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { CAMPAIGNS, getCampaign } from '../public/game/campaigns/index.js';
import { OPENINGS } from '../public/game/opening.js';
import { AUDIO_LOOPS } from '../public/game/audio-loops.js';
import { HORROR_LOOPS, HORROR_AUDIO_VERSION } from '../public/game/horror-loops.js';
import { MUSIC_LOOPS, resolveMusicAsset } from '../public/game/music-assets.js';
import { SCENE_SOUNDS, sceneSound, musicTheme } from '../public/game/scene-sound.js';
import { VERSION } from '../public/game/engine.js';

// Frozen from the delivered v21 files, not inferred from mutable v22 sources.
// Embedded so an extracted v22 project can repeat preservation checks alone.
const BASELINE_V21 = {
  "version": "21.0.0",
  "storyIds": [
    "last-train",
    "glass-hotel",
    "moon-market",
    "deep-sea",
    "dragon-banquet",
    "clock-city",
    "snow-radio"
  ],
  "resources": {
    "publicGameBytes": 17623782,
    "audioDirectoryBytes": 14086759,
    "artDirectoryBytes": 1635310,
    "offlineHtmlBytes": 2925844
  },
  "preservedFiles": {
    "public/game/art/clock-city.webp": "d9ffee192d99529977cefd6f97088074f077500b03b4af1e04c302c0c9a72575",
    "public/game/art/deep-sea.webp": "050d953ef653969d3e37d80f1b4b4d2a0be862d3e2127d316d1c57987d68ff66",
    "public/game/art/dragon-banquet.webp": "e1e1c9208d11313ad75bc05ae305a75f62f5448cb6dc3db48d597fe69cc59843",
    "public/game/art/glass-hotel.webp": "57f487d23f3ace870055229ba508c30d89aefba92d79582d932613e072072444",
    "public/game/art/last-train.webp": "c4072fec960689323d2a2fdf693bb6a16299242fcc5d7a9ef198cddfd732ce6c",
    "public/game/art/moon-market.webp": "912b4698302fbbfbb803f797516d5547b64d0fd8e837246667a1b9dfd755ad76",
    "public/game/art/snow-radio.webp": "e12bdf2a312f3d1a582e1758447ec6a720dab26ca387d04f0adb19f85b696ea6",
    "public/game/audio-loops.js": "7562aeb12fe79267b991fccf06886b80525b81d7ad7a120a740eaae8fcd3b2aa",
    "public/game/audio/ability.mp3": "e649f81033bef832f648a765294160c5c2962cbbeb2f486a96a412e62cc5f378",
    "public/game/audio/attack.mp3": "b53c4e9b2b98d7739cc66025e61e6e63e392d2608f095e0b1a118d64ff1bf169",
    "public/game/audio/clock-city-calm.mp3": "b616715945a8e14db3e24bcd8a59dde023058d1e1a1e07b76eff1877e6b8114d",
    "public/game/audio/clock-city-danger.mp3": "4433c51b942cb97babecc317939b1ac9de277bb207fbc830e7015a2b825f3c20",
    "public/game/audio/clock-city-grief.mp3": "881669951de4b64f9f95e63e54670a91c21cc330c9506a62b0dac517dd3d18d6",
    "public/game/audio/clock-city-hope.mp3": "6818b0299058ffb6188c23ca615dec7c62d57c6f50b8f998141357ee341865be",
    "public/game/audio/clock-city-mystery.mp3": "1f76c51cbdace4954680bb9ac1b9ff85db83d37bcc55ef3c66e2402ddf25c10d",
    "public/game/audio/clock-city-tension.mp3": "02d1adcdbdad5148d2a6e516ec4ae67bba83b103b04c3000f8a5300e425571b0",
    "public/game/audio/clue.mp3": "34ae01c0b19d5248193612b9d5481846688add0ac6349ce61fa4a44ef2551a43",
    "public/game/audio/death.mp3": "fd26b1dd3d78d0ce9d95057089584d46ef5716ac473d58197eb02f4ffd012b75",
    "public/game/audio/deep-sea-calm.mp3": "591861ad8ec4e4fa71c29c6338a7979c9fbd34f4226bbdce71ca5359c71a190a",
    "public/game/audio/deep-sea-danger.mp3": "c8f074883c1942ab495aa324a95c198d2e810c680e8ff2a417231987e7b2fd61",
    "public/game/audio/deep-sea-grief.mp3": "517adfd0b5b2ced5ee4ef239649f38f37512c715e90ecaeae081d8ec3acc2d51",
    "public/game/audio/deep-sea-hope.mp3": "b0f2c81ab59d1dda895992839b7a5459fe6b0e6d566e007650ff7fddd5344297",
    "public/game/audio/deep-sea-mystery.mp3": "6c0a9c606ff9198e24dde29fa1dd045082f88bc22ad41c4090d6b8139876ef30",
    "public/game/audio/deep-sea-tension.mp3": "6fe23143610099d383bd7c0e9a5cd7ec187c4ff5a8c65789dd19d38d364c9e5e",
    "public/game/audio/dice.mp3": "8934047202a00b7fa324a2f57f16e1e3be04198f75085e05903780f27a1d023a",
    "public/game/audio/dragon-banquet-calm.mp3": "9da32d9953de01be3d7eb06c84389fbb77093b85bce196b8ae2de508bfdcc5e5",
    "public/game/audio/dragon-banquet-danger.mp3": "d3239edb3e609f39fdc0a010c2b2f9998859a90f19bf1221f79015ab0b55f223",
    "public/game/audio/dragon-banquet-grief.mp3": "e67891609048b87bcfefafcd985f31549cd24e21acfe3fd41ec9eff95dd2f486",
    "public/game/audio/dragon-banquet-hope.mp3": "7c807a81c73834e7cd5627f2e1df7de08ac0b45795e6b30304fbc700f9517e06",
    "public/game/audio/dragon-banquet-mystery.mp3": "8cac1dabe2a902a3ceb56f58dff25110c9c0d53b6d00e012c23537eb6a8f8c81",
    "public/game/audio/dragon-banquet-tension.mp3": "b23f7cac17cb6c96771bc754e38334c7778560b02b9eed7ed93a711d459ad44c",
    "public/game/audio/enemy.mp3": "bad9ffdc45d73bc25de060d6b6cd10889b2c49b210b83e8251b7dbc7c366b4cb",
    "public/game/audio/failure.mp3": "cad7a67af4c704b52c563bcda7b2240ed7cf3b6d90fcd29bd4d5d935e2ea8ded",
    "public/game/audio/glass-hotel-calm.mp3": "653bba26c6912db4402ef7e2320b44b4dcce54d9cb7785ed310cb9f43496d809",
    "public/game/audio/glass-hotel-danger.mp3": "f0fe5ea32dfbc3a1bb8f50d2cb79fc741498dd69d5002000c7d89be7d932b736",
    "public/game/audio/glass-hotel-grief.mp3": "f59fc4699df9c30b004e414e0f104c7fc1f3cf795887294cc92d8c190e3e348f",
    "public/game/audio/glass-hotel-hope.mp3": "fa985bea46b90d242040db5bcab58b8981ef01b210bc76b38d2a6f05db46de6a",
    "public/game/audio/glass-hotel-mystery.mp3": "1bba8e1ca4b16e5de08df7f869313949e766b1a4763934884baa9d0556c284d1",
    "public/game/audio/glass-hotel-tension.mp3": "aed39e7c0084c68fdd4da27c0a5e325e783c7197e38fc724b92a581e27568e4d",
    "public/game/audio/last-train-calm.mp3": "cc1d9610c69d45305b4e60b064fac7eaec109c6690b315bbaecda43316456129",
    "public/game/audio/last-train-danger.mp3": "a122ca92f49ff7dc89c84a07a30158e01f0259b3c9a6cd7b8d8e5d6d4840efc9",
    "public/game/audio/last-train-grief.mp3": "ba73ecd4352a39e8bdee5cb88d6eb0275bc304ff5cd9d028e602a8809ee09229",
    "public/game/audio/last-train-hope.mp3": "f361f3a68076fa1003268f4fae8cc8218cae69212baa11178cdfe70aba72a798",
    "public/game/audio/last-train-mystery.mp3": "26e9a2579bced413768b277fab7bfffe9b872719e00742d2067eafed0880b19d",
    "public/game/audio/last-train-tension.mp3": "c058da075599085340c78092a85d5bf0b94f78006be122dd66efec7df43c3e14",
    "public/game/audio/mixed.mp3": "7e14ebcc28e8f4c34ad511b7ce30e6e64f411f93f2904fade42001718a571bfa",
    "public/game/audio/moon-market-calm.mp3": "8a0adb11410c552a458d0b8d88b16fa3c964b691a66fb2c493a4011df0b24bc0",
    "public/game/audio/moon-market-danger.mp3": "3aa77da1d5d1d403e91191358a744e24e600b2a709ddd17c246a735b0043c321",
    "public/game/audio/moon-market-grief.mp3": "8092d3e886a00ddbde9f7a3398caccc20520c577cb149496bcd227d3f548729d",
    "public/game/audio/moon-market-hope.mp3": "d9813570b553a5812f1b9b31de515b1deb9463c4112c59f9969db3f19f6961a5",
    "public/game/audio/moon-market-mystery.mp3": "203f60116c14f9c657d24fc59600bc65dacccb3f4580e4fc4ecca3a60a31b91b",
    "public/game/audio/moon-market-tension.mp3": "d49992defcce1f4860dd9c66261209f444c4b33cd26b645faf0147d35250df35",
    "public/game/audio/reveal.mp3": "45499f6bf09c7656415e9908e47ee979a1a36615221593aca65876e4dd36b4e0",
    "public/game/audio/revive.mp3": "7167177eac95afeaf15be34fbc79a3e715f658334da482b1710496373042d154",
    "public/game/audio/snow-radio-calm.mp3": "9a293842d451b217cf25eeb4ad19b15706fde523f7867f923f80a7052d96a9e0",
    "public/game/audio/snow-radio-danger.mp3": "1f0aa4296940c3729062f7aba5eb50285e92898e4f204474cfffda805a6c8604",
    "public/game/audio/snow-radio-grief.mp3": "287ea625bb4689da9bdf72600e2fe22b5b20eda9f3756573827b8f4373db0f29",
    "public/game/audio/snow-radio-hope.mp3": "87cc1f43374019605f71e2700d8104dfff8a31c8cf4efc06de9f326e9b54682c",
    "public/game/audio/snow-radio-mystery.mp3": "636df819433809e09160a80325ac089abf0bb702c31caf267a668970ffa2e3b1",
    "public/game/audio/snow-radio-tension.mp3": "798c0bf328e6caa4dd375bbe626b868127f8ab45839f88d211a20d6fba95fa88",
    "public/game/audio/success.mp3": "8fd97b073c3059569852972289344cd8078cb705902f527289c660073d094613",
    "public/game/audio/transition.mp3": "b64af2d38663ec6537d5c98dfa35a141537cbd7492169f7f013b217f518dd10a",
    "public/game/audio/victory.mp3": "e0cf5943fdbb7561c6f9683f7abe53e91f479a9f082710f5d9cc14805604bb56",
    "public/game/campaigns/clock-city.js": "e4937c6cd7307d15f1ed3cee687e3398d052517080f6c66c9147cd30a731b85a",
    "public/game/campaigns/deep-sea.js": "a4ab786606a077e96b4e67e862dae0282f5d6c5c06794dd951b8b0a91c2d6faa",
    "public/game/campaigns/dragon-banquet.js": "43f220811a769db13ab0751f470b8b6ee03c669bb7e5b84c47c574c9b1dc5e89",
    "public/game/campaigns/glass-hotel.js": "a0bdc032c24b9c7523f315dd07a758ce70a8caeabc79321382f76fc99e5b50ee",
    "public/game/campaigns/last-train.js": "a6cd44dfbf95d24112b79afe809238c0c46eb4a74ed27a5df37b1f51c688b186",
    "public/game/campaigns/moon-market.js": "0b5a7581093c20948c57cce081505d9cb52d5d89e34856d2d639190235b6341d",
    "public/game/campaigns/openings-a.js": "f98a99d395faec29b3e94f6bc08c9970eb4f4261aa354db91323ddd6bdb3d5e9",
    "public/game/campaigns/openings-b.js": "f535897c2d0dba9b69b396f8bbc076ba0bbbe7b9ab0542fa14320b5440b4c4c7",
    "public/game/campaigns/snow-radio.js": "fb43510d8d1a55d4ed14576a5cca6d175f61103be04a49ea6b4568febcf71e78",
    "public/game/combat.js": "e7622ae107b649eec87017492b83fd5f6c4b97bec6c05cefb1ee4c88aed8b2a2",
    "public/game/dice.js": "c6b6de7de6fd847196cbf510bbfcf6b37acfa2a0ab936661624dc447a168fe08",
    "public/game/judgement.js": "648c5b322d602e6457004254546201130eabf7c48da9bf99576fcfc8b8012129",
    "public/game/professions.js": "01996adc171a97ca362d2cda57edd4498fb9d8273ec2930bd7bd3462b8f92593"
  }
};

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const full = relative => path.join(ROOT, relative);
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const shaFile = filename => hash(fs.readFileSync(filename));
const bytes = relative => fs.statSync(full(relative)).size;
const files = relative => fs.readdirSync(full(relative), { withFileTypes: true })
  .flatMap(entry => {
    const child = path.posix.join(relative, entry.name);
    return entry.isDirectory() ? files(child) : entry.isFile() ? [child] : [];
  }).sort();
const sum = paths => paths.reduce((total, relative) => total + bytes(relative), 0);
const sumProperty = (values, key) => values.reduce((total, value) => total + (value[key] || 0), 0);
const number = value => value.toLocaleString('en-US');
const amount = value => `${number(value)} B (${(value / 1_000_000).toFixed(3)} MB / ${(value / 1_048_576).toFixed(3)} MiB)`;
const md = value => String(value).replaceAll('|', '\\|').replaceAll('\n', ' ');
const issues = [];
const HORROR_KEYS = Object.freeze([
  'horror-apartment-ambient', 'horror-apartment-tension', 'horror-apartment-danger',
  'horror-broadcast-ambient', 'horror-broadcast-tension', 'horror-broadcast-danger',
  'horror-shared-grief', 'horror-shared-relief',
]);
const MUSIC_MOODS = ['calm', 'mystery', 'tension', 'danger', 'hope', 'grief'];

const args = process.argv.slice(2);
let optionalBaseline = null;
if (args.length) {
  if (args.length !== 2 || args[0] !== '--baseline') throw new Error('사용법: node scripts/report-v22.mjs [--baseline v21폴더]');
  optionalBaseline = path.resolve(args[1]);
  if (!fs.statSync(optionalBaseline).isDirectory()) throw new Error('v21 기준 폴더가 아닙니다.');
}
if (!BASELINE_V21?.preservedFiles) throw new Error('v21 보존 기준 manifest가 없습니다.');
if (CAMPAIGNS.length !== 9) throw new Error(`9개 이야기의 등록을 먼저 완료해야 합니다. 현재 ${CAMPAIGNS.length}개입니다.`);

function modeCounts(campaign) {
  const nodes = Object.values(campaign.nodes);
  const choices = nodes.flatMap(node => node.choices || []);
  return {
    estimatedMinutes: campaign.estimatedMinutes,
    playableScenes: nodes.filter(node => !node.ending).length,
    ordinaryEndings: nodes.filter(node => node.ending).length,
    partyDeathEndings: Number(Boolean(campaign.deathEnding)),
    choices: choices.length,
    riskyChoices: choices.filter(choice => !choice.automatic).length,
    outcomePassages: choices.reduce((total, choice) => total + Object.keys(choice.outcomes || {}).length, 0),
    clues: Object.keys(campaign.clues || {}).length,
    items: Object.keys(campaign.items || {}).length,
    flags: Object.keys(campaign.flags || {}).length,
    professions: campaign.classes.length,
    combatScenes: nodes.filter(node => node.encounter).length,
    resurrectionSceneBindings: nodes.filter(node => node.resurrection).length,
    sceneSoundBindings: nodes.filter(node => sceneSound(campaign.id, node)).length,
    outcomeSoundBindings: choices.flatMap(choice => Object.values(choice.outcomes || {})).filter(outcome => outcome.sound).length,
  };
}

/**
 * Structural lower bound: all ordinary edges and all four grades are included.
 * Ignoring gates can only shorten a route; a bound of 24 therefore also protects
 * gated routes. It is not a claim that every syntactic route can be played.
 */
function shortestAddedScenes(campaign, added) {
  const distance = new Map([[campaign.start, Number(added.has(campaign.start))]]);
  const queue = [campaign.start];
  while (queue.length) {
    const id = queue.shift();
    for (const choice of campaign.nodes[id].choices || []) for (const outcome of Object.values(choice.outcomes || {})) {
      if (!campaign.nodes[outcome.next]) throw new Error(`${campaign.id}/${id}: 없는 도착지 ${outcome.next}`);
      const value = distance.get(id) + Number(added.has(outcome.next));
      if (value < (distance.get(outcome.next) ?? Infinity)) {
        distance.set(outcome.next, value);
        queue.push(outcome.next);
      }
    }
  }
  return Object.fromEntries(Object.values(campaign.nodes).filter(node => node.ending).map(node => [node.id, distance.get(node.id) ?? null]));
}

const stories = CAMPAIGNS.map(base => {
  const basic = getCampaign(base.id, 'basic'), epic = getCampaign(base.id, 'epic'), spec = base.epicSpec;
  if (!spec?.chapters?.length) throw new Error(`${base.id}: 서사시 장이 등록되지 않았습니다.`);
  const chapterScenes = spec.chapters.flatMap(chapter => chapter.scenes);
  const addedIds = new Set(chapterScenes.map(scene => scene.id));
  const opening = OPENINGS[base.id];
  const professions = Object.entries(opening?.professions || {}).map(([id, value]) => ({
    id, name: base.classes.find(job => job.id === id)?.name || id,
    stages: value.stages.map(stage => ({ id: stage.id, title: stage.title, choices: stage.choices.length })),
  }));
  if (professions.length !== 4 || professions.some(job => job.stages.length !== 2)) issues.push(`${base.id}: 직업별 개인 도입 4종 × 2단계가 완성되지 않았습니다.`);
  const minima = shortestAddedScenes(epic, addedIds);
  if (Object.values(minima).some(value => value == null || value < 24)) issues.push(`${base.id}: 모든 일반 결말에 서사시 추가 24장면이 필요합니다.`);
  const baseCounts = modeCounts(basic), epicCounts = modeCounts(epic);
  if (baseCounts.ordinaryEndings !== 5 || epicCounts.ordinaryEndings !== 5) issues.push(`${base.id}: 일반 결말 수가 5개가 아닙니다.`);
  const artwork = `public/game/art/${base.id}.webp`;
  if (!fs.existsSync(full(artwork))) issues.push(`${base.id}: 장면 그림이 없습니다.`);
  return {
    id: base.id, title: base.title, newInV22: !BASELINE_V21.storyIds.includes(base.id),
    description: base.description,
    basic: baseCounts, epic: epicCounts,
    openingProfessions: professions.length,
    openingStages: professions.reduce((total, job) => total + job.stages.length, 0),
    openingChoices: professions.flatMap(job => job.stages).reduce((total, stage) => total + stage.choices, 0),
    openingDetails: professions,
    addedEpicScenes: addedIds.size,
    addedReturnScenes: spec.chapters.length,
    totalEpicAddedPlayableScenes: epicCounts.playableScenes - baseCounts.playableScenes,
    shortestAddedScenesByEnding: minima,
    smallestAddedSceneCount: Math.min(...Object.values(minima).map(value => value ?? Infinity)),
    chapters: spec.chapters.map(chapter => ({
      at: chapter.at, title: basic.nodes[chapter.at].title, entry: chapter.entry,
      sceneCount: chapter.scenes.length, first: chapter.scenes[0].id,
      firstTitle: chapter.scenes[0].title, last: chapter.scenes.at(-1).id,
      lastTitle: chapter.scenes.at(-1).title, return: chapter.return.id,
    })),
    pathSplits: chapterScenes.filter(scene => new Set(scene.choices.flatMap(choice => Object.values(choice.outcomes || {}).map(outcome => outcome.next))).size > 1)
      .map(scene => ({ id: scene.id, title: scene.title, destinations: [...new Set(scene.choices.flatMap(choice => Object.values(choice.outcomes || {}).map(outcome => outcome.next)))] })),
    addedEpicItems: Object.entries(spec.items || {}).map(([id, item]) => ({ id, ...item })),
    epicEndingEpiloguePassages: Object.values(spec.endingEpilogues || {}).reduce((total, passages) => total + passages.length, 0),
    musicTheme: musicTheme(base.id),
    musicAssets: Object.fromEntries(MUSIC_MOODS.map(mood => {
      const asset = resolveMusicAsset(base.id, mood);
      return [mood, { key: asset.key, version: asset.version }];
    })),
    artwork,
  };
});

const allGameFiles = files('public/game');
const audioFiles = files('public/game/audio');
const artFiles = files('public/game/art');
const mp3Files = audioFiles.filter(file => file.endsWith('.mp3'));
const webpFiles = artFiles.filter(file => file.endsWith('.webp'));
const musicFiles = mp3Files.filter(file => Object.hasOwn(MUSIC_LOOPS, path.basename(file, '.mp3')));
const originalMusicFiles = musicFiles.filter(file => Object.hasOwn(AUDIO_LOOPS, path.basename(file, '.mp3')));
const effectFiles = mp3Files.filter(file => !musicFiles.includes(file));
const oldMedia = Object.keys(BASELINE_V21.preservedFiles).filter(file => /\.(mp3|webp)$/u.test(file));
const newMp3 = mp3Files.filter(file => !oldMedia.includes(file));
const newArt = webpFiles.filter(file => !oldMedia.includes(file));
const horrorMusicFiles = HORROR_KEYS.map(key => `public/game/audio/${key}.mp3`);
const contextualFiles = SCENE_SOUNDS.map(id => `public/game/audio/${id}.mp3`);
const horrorAudit = JSON.parse(fs.readFileSync(full('scripts/horror-score-audit-v22_1.json'), 'utf8'));
if (JSON.stringify((horrorAudit.tracks || []).map(entry => entry.id).sort()) !== JSON.stringify([...HORROR_KEYS].sort())) issues.push('공포 배경음 검증 명세는 여덟 파일과 정확히 대응해야 합니다.');
if (JSON.stringify(Object.keys(HORROR_LOOPS).sort()) !== JSON.stringify([...HORROR_KEYS].sort())) issues.push('공포 배경음 루프는 지정한 여덟 파일과 정확히 대응해야 합니다.');
const horrorScores = HORROR_KEYS.map(key => {
  const file = `public/game/audio/${key}.mp3`, loop = HORROR_LOOPS[key];
  if (!fs.existsSync(full(file)) || !loop) { issues.push(`공포 배경음 누락: ${key}`); return { key, file, missing: true }; }
  if (!(loop.sampleRate === 32000 && loop.startFrame >= 0 && loop.endFrame > loop.startFrame && loop.sourceFrames > loop.endFrame)) issues.push(`공포 배경음 루프 범위가 올바르지 않습니다: ${key}`);
  const expected = horrorAudit.tracks?.find(entry => entry.id === key);
  const actualBytes = bytes(file), actualSha256 = shaFile(full(file));
  const matches = expected?.bytes === actualBytes && expected?.sha256 === actualSha256 && ['sampleRate', 'startFrame', 'endFrame', 'sourceFrames'].every(field => loop[field] === expected?.loop?.[field]);
  if (!matches) issues.push(`공포 배경음 검증 명세 불일치: ${key}`);
  return { key, file, bytes: actualBytes, sha256: actualSha256, manifestMatches: matches, version: HORROR_AUDIO_VERSION,
    sampleRate: loop.sampleRate, loopSeconds: (loop.endFrame - loop.startFrame) / loop.sampleRate,
    sourceSeconds: loop.sourceFrames / loop.sampleRate };
});
const foleyManifest = JSON.parse(fs.readFileSync(full('scripts/foley-v22.json'), 'utf8'));
const contextualEffects = SCENE_SOUNDS.map(id => {
  const relative = `public/game/audio/${id}.mp3`, expected = foleyManifest.files[id];
  if (!expected || !fs.existsSync(full(relative))) { issues.push(`상황 효과음 누락: ${id}`); return { id, file: relative, missing: true }; }
  const actualBytes = bytes(relative), actualSha256 = shaFile(full(relative));
  const matches = actualBytes === expected.bytes && actualSha256 === expected.sha256;
  if (!matches) issues.push(`상황 효과음 manifest 불일치: ${id}`);
  return { id, file: relative, bytes: actualBytes, sha256: actualSha256, authoredSeconds: expected.seconds, manifestMatches: matches };
});
if (contextualEffects.length !== 12 || newMp3.length !== 20 || JSON.stringify([...newMp3].sort()) !== JSON.stringify([...contextualFiles, ...horrorMusicFiles].sort())) issues.push('v21 이후 추가 MP3는 상황 효과음 12개와 공포 배경음 8개여야 합니다.');
if (mp3Files.length !== 75 || originalMusicFiles.length !== 42 || musicFiles.length !== 50 || effectFiles.length !== 25) issues.push('MP3 구성은 기존 배경음 42곡 + 공포 배경음 8곡 + 효과음 25개여야 합니다.');

const preservationFiles = Object.entries(BASELINE_V21.preservedFiles).map(([relative, expected]) => {
  const current = fs.existsSync(full(relative)) ? shaFile(full(relative)) : null;
  const local = optionalBaseline && fs.existsSync(path.join(optionalBaseline, relative)) ? shaFile(path.join(optionalBaseline, relative)) : null;
  const matches = current === expected;
  if (!matches) issues.push(`v21 보존 파일 변경: ${relative}`);
  if (optionalBaseline && local !== expected) issues.push(`지정한 v21 폴더가 내장 기준과 다름: ${relative}`);
  return { file: relative, expectedSha256: expected, actualSha256: current, matches, ...(optionalBaseline ? { suppliedBaselineSha256: local, suppliedBaselineMatches: local === expected } : {}) };
});
const preservationCategory = predicate => {
  const group = preservationFiles.filter(row => predicate(row.file));
  return { files: group.length, matches: group.every(row => row.matches), changed: group.filter(row => !row.matches).map(row => row.file) };
};
const baselineResources = BASELINE_V21.resources;
const staticResources = {
  publicGame: { files: allGameFiles.length, bytes: sum(allGameFiles), baselineBytes: baselineResources.publicGameBytes, increaseBytes: sum(allGameFiles) - baselineResources.publicGameBytes },
  audioDirectory: { files: audioFiles.length, bytes: sum(audioFiles), baselineBytes: baselineResources.audioDirectoryBytes, increaseBytes: sum(audioFiles) - baselineResources.audioDirectoryBytes },
  mp3: { files: mp3Files.length, bytes: sum(mp3Files), baselineBytes: sum(oldMedia.filter(file => file.endsWith('.mp3'))), increaseBytes: sum(newMp3), musicFiles: musicFiles.length, musicBytes: sum(musicFiles), effectFiles: effectFiles.length, effectBytes: sum(effectFiles) },
  newContextualEffects: { files: contextualEffects.length, bytes: sumProperty(contextualEffects, 'bytes'), assets: contextualEffects },
  newHorrorScores: { files: horrorScores.length, bytes: sumProperty(horrorScores, 'bytes'), assets: horrorScores },
  artDirectory: { files: artFiles.length, bytes: sum(artFiles), baselineBytes: baselineResources.artDirectoryBytes, increaseBytes: sum(artFiles) - baselineResources.artDirectoryBytes },
  webp: { files: webpFiles.length, bytes: sum(webpFiles), newFiles: newArt.length, newBytes: sum(newArt) },
  diceModule: { file: 'public/game/dice.js', bytes: bytes('public/game/dice.js'), sha256: shaFile(full('public/game/dice.js')) },
  offlineHtml: { file: 'public/offline.html', bytes: bytes('public/offline.html'), baselineBytes: baselineResources.offlineHtmlBytes, increaseBytes: bytes('public/offline.html') - baselineResources.offlineHtmlBytes },
  indexHtml: { file: 'public/index.html', bytes: bytes('public/index.html'), copyPasteExact: fs.readFileSync(full('public/index.html')).equals(fs.readFileSync(full('COPYPASTE/index.html.txt'))) },
};
if (staticResources.publicGame.bytes > 22_000_000) issues.push('public/game 정적 파일이 22,000,000바이트 한도를 초과했습니다.');
if (staticResources.audioDirectory.bytes > 17_000_000) issues.push('오디오 정적 파일이 17,000,000바이트 한도를 초과했습니다.');
if (staticResources.newHorrorScores.bytes > 2_400_000) issues.push('추가 공포 배경음이 2,400,000바이트 한도를 초과했습니다.');
const modeTotals = mode => Object.fromEntries(['playableScenes', 'ordinaryEndings', 'partyDeathEndings', 'choices', 'riskyChoices', 'outcomePassages', 'clues', 'items', 'flags', 'professions', 'combatScenes', 'resurrectionSceneBindings', 'sceneSoundBindings', 'outcomeSoundBindings']
  .map(key => [key, stories.reduce((total, story) => total + story[mode][key], 0)]));
const report = {
  version: VERSION, baseline: '21.0.0', generatedAt: new Date().toISOString(),
  command: 'node scripts/report-v22.mjs',
  definitions: {
    playableScenes: '각 모드 데이터에 있는 일반 장면 노드 수. 대체 갈래와 복귀 장면을 포함하며 한 번의 플레이에서 모두 방문하는 수가 아니다. 개인 도입·관찰·전투 턴·결말은 제외한다.',
    ordinaryEndings: '명시적으로 작성한 일반 결말 노드 수. 기본과 서사시가 공유하는 결말을 합쳐 새로운 결말 수로 세지 않는다. 조건별 후일담과 생존·사망 조합도 별개 결말로 부풀리지 않는다.',
    partyDeathEndings: '전원 사망 전용 결말 템플릿 수. 일반 결말과 별도로 센다.',
    choices: '모든 일반 장면의 선택지 정의 수. 조건부로 잠기는 선택지도 포함하며 네 판정 결과는 outcomePassages에서 따로 센다.',
    openingStages: '이야기별 네 직업에 작성된 개인 도입 장면의 합계. 1인 플레이에서 다른 세 직업 도입까지 보는 것은 아니다.',
    minimumAddedScenes: '모든 결과 간선에서 계산한 구조상 하한. 추가 본문 장면만 세고 복귀 장면·개인 도입·관찰·전투 턴은 제외한다. 조건을 무시한 더 짧은 그래프에서도 24 이상인지 확인한다.',
    bytes: '현재 파일의 원시 바이트 수. public/game은 하위 전체, audio/art는 각 하위 디렉터리 전체이며 서로 포함 관계이므로 더해서 합계를 만들지 않는다.',
    playTime: '제작자가 의도한 읽기·토론·조사 분량에 대한 예상 범위. 사람 대상 시간 측정 결과나 1시간 강제 보장이 아니다.',
  },
  totals: {
    stories: stories.length,
    newHorrorStories: stories.filter(story => story.newInV22).length,
    basic: modeTotals('basic'), epic: modeTotals('epic'),
    distinctOrdinaryEndingTemplates: modeTotals('basic').ordinaryEndings,
    distinctPartyDeathTemplates: modeTotals('basic').partyDeathEndings,
    openingProfessions: sumProperty(stories, 'openingProfessions'), openingStages: sumProperty(stories, 'openingStages'),
    openingChoices: sumProperty(stories, 'openingChoices'),
    authoredEpicScenes: sumProperty(stories, 'addedEpicScenes'), returnScenes: sumProperty(stories, 'addedReturnScenes'),
    addedEpicItems: stories.reduce((total, story) => total + story.addedEpicItems.length, 0),
    minimumAddedScenesAcrossAllOrdinaryEndings: Math.min(...stories.map(story => story.smallestAddedSceneCount)),
    epicEndingEpiloguePassages: sumProperty(stories, 'epicEndingEpiloguePassages'),
  },
  stories,
  staticResources,
  preservation: {
    baseline: '21.0.0', method: 'Exact SHA-256 bytes; no normalization or re-encoding exceptions.',
    embeddedManifestFiles: preservationFiles.length,
    allMatch: preservationFiles.every(row => row.matches),
    suppliedBaselineChecked: Boolean(optionalBaseline),
    suppliedBaselineAllMatch: optionalBaseline ? preservationFiles.every(row => row.suppliedBaselineMatches) : null,
    originalSevenAtlases: preservationCategory(file => file.endsWith('.webp')),
    original55Mp3: preservationCategory(file => file.endsWith('.mp3')),
    originalSevenBasicFiles: preservationCategory(file => BASELINE_V21.storyIds.some(id => file === `public/game/campaigns/${id}.js`)),
    originalMechanicsAndOpeningData: preservationCategory(file => !/\.(mp3|webp)$/u.test(file) && !BASELINE_V21.storyIds.some(id => file === `public/game/campaigns/${id}.js`)),
    files: preservationFiles,
  },
  musicReuse: {
    existingMusicFiles: originalMusicFiles.length,
    horrorThemes: stories.filter(story => story.newInV22).map(story => ({ campaignId: story.id, title: story.title, themeId: story.musicTheme, moodAssets: story.musicAssets })),
    newMusicFiles: horrorMusicFiles.length,
    sharedHorrorFiles: ['horror-shared-grief', 'horror-shared-relief'],
    horrorScoreSource: '프로젝트용으로 작성한 공포 배경음 8곡. 이야기별 탐색·긴장·전투 3곡씩과 공유하는 상실·절제된 안도 2곡이다. 평상과 조사는 같은 탐색곡을 사용한다.',
    contextualEffectSource: foleyManifest.source,
  },
  validation: { complete: issues.length === 0, issues },
  scope: '정적 콘텐츠와 파일 보존을 재현하는 보고서다. 사람 대상 플레이 시간, 프레임 속도, 브라우저 메모리, 서버 부하, Supabase 계정 용량·요금·트래픽은 측정하지 않는다. 엔진·온라인·오프라인 통합 검증 결과는 VALIDATION_V22.md에서 별도로 확인한다.',
};

// Incomplete authoring must not overwrite a complete release report.
if (issues.length) {
  console.error(JSON.stringify({ complete: false, issues }, null, 2));
  process.exitCode = 1;
} else {
  const CAUSAL = {
    'last-train': '차장실 뒤에서 반복되는 대피 방송의 시작을 확인한다. 이후 분기기를 조작하기 전에 뒤따르는 점검차를 멈추며, 아이의 동네 지도를 실제 길과 맞춘다.',
    'glass-hotel': '장부에서 빠진 직원들의 저녁을 따라간다. 금고 안쪽에서는 서로 섞이려는 시간과 이름표를 정리하고, 빌린 태엽시계로 반복 기록과 현재를 가린다.',
    'moon-market': '달에게 매인 소원 끈을 노점의 부탁과 연결한다. 큰 줄을 풀기 전에 하역대의 보조 매듭을 정리하며, 마친 부탁과 아직 남은 부탁의 무게를 나눈다.',
    'deep-sea': '기록실의 역류를 멈추는 동안 미연과 은재가 열었던 수동문의 흔적을 찾는다. 마지막 연결교에서는 연구 계류선을 분리하고 사진과 독립 부표에 무엇을 남길지 고른다.',
    'dragon-banquet': '납품 상자를 옮긴 피프에게 향한 의심을 두 경로의 흔적으로 확인한다. 굴뚝 아래의 차가운 방과 작은 화덕 시험이 왕의 은퇴 뒤 겨울 문제로 이어진다.',
    'clock-city': '접힌 정지 서고에서 계약의 숫자로 담지 못한 생활의 순간을 만난다. 돌아갈 동선을 복구하는 긴 경험은 바깥의 13분을 늘리지 않으며, 복귀 뒤 원래의 계약 문제를 이어 간다.',
    'snow-radio': '사라진 출구로 부르는 작년 안내와 비명 녹음을 현재의 요청에서 분리한다. 송신실에서는 눈 하중이 실린 계단을 피해 사람들이 실제로 걸을 실내 길을 만든다.',
    'hollow-apartment': '배전함 뒤에서 나타난 도면 밖 통로를 조사한다. 옥상에서는 관리 부속실의 마지막 방화문 흔적을 찾아, 문밖의 목소리와 실제로 사람이 잡을 출구를 연결한다.',
    'drowned-broadcast': '스튜디오 전선 밑 배선표를 따라 예비 편집동의 되먹임을 조사한다. 안테나 아래 기상 관측동에서는 도시와 바다로 이어지는 실제 선을 확인한 뒤 송출을 결정한다.',
  };
  const EFFECT_NAMES = { knock: '문 두드림', scream: '비명 느낌의 합성음', murmur: '웅성거림', footsteps: '발걸음', 'door-creak': '문 경첩', glass: '유리', metal: '금속 충격', water: '물', wind: '바람', 'radio-static': '무전 잡음', heartbeat: '심장 박동', chime: '종' };
  const lines = [
    `# 크로니클 게이트 v${VERSION} — 이야기와 분량 안내`, '',
    `v22에는 **${report.totals.stories}개 이야기**가 있으며, 모든 이야기에서 **기본 / 서사시**를 고릅니다. 기존 일곱 편의 기본 원고를 유지하고 공포 중심 이야기 두 편을 추가했습니다. 시작 방식은 직업별 개인 도입 후 이야기 속에서 합류하는 방식으로 통일했습니다.`, '',
    '## 기본과 서사시', '',
    '| 이야기 | 기본 장면 | 서사시 장면 | 일반 결말 | 기본 예상 | 서사시 예상 | 개인 도입 직업 |',
    '|---|---:|---:|---:|---|---|---:|',
    ...stories.map(story => `| ${md(story.title)}${story.newInV22 ? ' · 새 공포편' : ''} | ${story.basic.playableScenes} | ${story.epic.playableScenes} | ${story.basic.ordinaryEndings} | ${story.basic.estimatedMinutes}분 | ${story.epic.estimatedMinutes}분 | ${story.openingProfessions} |`),
    '',
    `기본 모드 전체에는 일반 장면 **${report.totals.basic.playableScenes}개**, 서사시 모드 전체에는 **${report.totals.epic.playableScenes}개**가 있습니다. 이 수는 대체 갈래를 포함한 데이터 전체의 장면 수이며 한 번에 모두 방문하는 분량은 아닙니다. 개인 도입·관찰·전투 턴·결말은 이 장면 수에서 제외했습니다.`, '',
    `서사시에는 별도로 쓴 추가 본문 **${report.totals.authoredEpicScenes}장면**과 복귀 장면 **${report.totals.returnScenes}개**가 있습니다. 각 일반 결말에 이르는 경로에는 최소 **${report.totals.minimumAddedScenesAcrossAllOrdinaryEndings}개의 추가 본문 장면**이 포함됩니다. 이 하한을 계산할 때는 개인 도입, 관찰, 전투 턴, 복귀 장면을 세지 않았습니다.`, '',
    `일반 결말은 이야기마다 5개로, 전체 **${report.totals.distinctOrdinaryEndingTemplates}개**입니다. 기본과 서사시가 공유하는 결말을 두 번 더해 세지 않았습니다. 전원 사망 전용 결말 **${report.totals.distinctPartyDeathTemplates}개**는 별도입니다. 서사시의 선택에 따른 후일담 ${report.totals.epicEndingEpiloguePassages}문단과 개인별 생존·죽음·귀환의 차이도 별도 결말 개수로 부풀리지 않았습니다.`, '',
    '표의 시간은 읽기·조사·친구와의 토론을 포함해 의도한 예상 분량입니다. 대체로 서사시 70–110분을 목표로 하며 시계 도시와 새 공포 두 편은 75–115분으로 표시합니다. 사람을 대상으로 측정한 플레이 시간이나 최소 한 시간의 보장이 아닙니다. 빠르게 넘기거나 진행 중 전멸하면 더 짧아질 수 있으며, 시간을 채우기 위한 강제 대기 장치는 넣지 않았습니다.', '',
    '## 이야기 사이를 잇는 새 사건', '',
    '| 이야기 | 서사시가 들어가는 기존 장소 | 이어지는 사건과 선택 | 새 물건 |',
    '|---|---|---|---|',
    ...stories.map(story => `| ${md(story.title)} | ${story.chapters.map(chapter => md(chapter.title)).join(' / ')} | ${md(CAUSAL[story.id])} | ${story.addedEpicItems.map(item => md(item.name)).join(' / ')} |`),
    '',
    '추가 장은 기존 장소에서 구체적인 이유로 출발하고, 원래 결정을 남겨 둔 장소로 돌아옵니다. 따라서 점검을 했다고 이미 다리를 건넜다거나, 작은 화덕을 시험했다고 겨울 예산이 승인된 것으로 처리하지 않습니다. 갈래에서 얻은 물건·단서·행동 기록은 이후 문장과 후일담에 연결됩니다.', '',
    '### 새 공포 이야기 두 편', '',
    ...stories.filter(story => story.newInV22).flatMap(story => [`**${story.title}** — ${story.description}`, '', `기본 ${story.basic.playableScenes}장면 / 서사시 ${story.epic.playableScenes}장면이며 일반 결말 5개와 전원 사망 결말을 가집니다. 기본 소지품 ${story.basic.items}종에 서사시에서 ${story.addedEpicItems.length}종이 더해집니다. 직업별 개인 도입을 마치면 본편의 같은 장소로 합류합니다.`, '']),
    '## 직업별 도입과 합류', '',
    `각 이야기에는 고유 직업 네 가지가 있으며 전체 ${report.totals.openingProfessions}개 직업 도입이 있습니다. 한 직업의 개인 도입은 두 단계이고, 작성된 개인 도입 장면은 전체 ${report.totals.openingStages}개입니다. 한 사람이 다른 직업의 도입까지 모두 플레이하는 방식은 아닙니다.`, '',
    '새 게임은 각자 직업의 도입을 진행한 뒤 정해진 만남으로 이어집니다. 기본과 서사시는 도입 방식이 아니라 본편의 분량을 고르는 설정입니다. 기존 이야기의 전투와 직업 기본 공격·고유 능력, 고정 능력치, 실제 주사위 판정은 유지합니다.', '',
    '## 장면 효과음과 배경음', '',
    `새 상황 효과음은 **${contextualEffects.length}개**, MP3 합계 **${amount(staticResources.newContextualEffects.bytes)}**입니다. 장면에 실제로 등장하는 소리에 연결합니다. 사람 음성이나 외부 음원 샘플을 가져온 녹음이 아니라 프로젝트의 합성 스크립트로 만든 효과음입니다.`, '',
    '| 효과음 | 파일 | 파일 크기 |', '|---|---|---:|',
    ...contextualEffects.map(effect => `| ${EFFECT_NAMES[effect.id]} | \`${effect.file}\` | ${number(effect.bytes)} B |`), '',
    `기존 배경음 ${originalMusicFiles.length}곡과 기존 판정·전투 효과음을 포함한 **v21 MP3 55개는 SHA-256이 모두 동일**합니다. v22.1에서는 공포 두 편에 쓰던 호텔·설원 음악 연결을 새 공포 배경음 **${horrorScores.length}곡**으로 교체했습니다. 새 배경음 합계는 **${amount(staticResources.newHorrorScores.bytes)}**입니다. 원작 일곱 이야기의 음원은 재인코딩하지 않았습니다.`, '',
    '| 공포 이야기 | 평상·조사 | 긴장·전투 | 상실·안도 |', '|---|---|---|---|',
    ...report.musicReuse.horrorThemes.map(theme => `| ${md(theme.title)} | \`${theme.moodAssets.calm.key}\` | \`${theme.moodAssets.tension.key}\` / \`${theme.moodAssets.danger.key}\` | 공통 상실곡 / 절제된 안도곡 |`), '',
    '각 공포편의 평상·조사는 같은 어두운 탐색곡을 사용해 관찰만으로 곡이 다시 시작되지 않도록 했습니다. 긴장·전투에는 해당 이야기의 별도 곡을 사용하고, 희망·부활은 밝은 축하곡 대신 절제된 안도곡으로 연결합니다. 사망과 전멸에는 상실곡이 우선합니다. 상실·안도 두 곡만 두 공포편이 공유하므로 중복 MP3를 저장하지 않습니다. 상황 효과음은 새 읽기 장면이나 새 결과에 연결하며, 같은 화면의 재전송·관찰·인원 갱신 때마다 다시 반복하지 않도록 별도 수신 기록으로 관리합니다. 기존 v22 검사 범위는 `VALIDATION_V22.md`, 이번 배경음 수정 결과는 v22.1 패치 안내에서 확인합니다.', '',
    '## 정적 파일 용량과 보존 범위', '',
    `| 범위 | v${VERSION} 파일 수 | v${VERSION} 바이트 | v21 대비 바이트 |`, '|---|---:|---:|---:|',
    `| \`public/game/\` 전체 | ${staticResources.publicGame.files} | ${number(staticResources.publicGame.bytes)} | +${number(staticResources.publicGame.increaseBytes)} |`,
    `| \`public/game/audio/\` 전체 | ${staticResources.audioDirectory.files} | ${number(staticResources.audioDirectory.bytes)} | +${number(staticResources.audioDirectory.increaseBytes)} |`,
    `| MP3만 | ${staticResources.mp3.files} | ${number(staticResources.mp3.bytes)} | +${number(staticResources.mp3.increaseBytes)} |`,
    `| \`public/game/art/\` 전체 | ${staticResources.artDirectory.files} | ${number(staticResources.artDirectory.bytes)} | +${number(staticResources.artDirectory.increaseBytes)} |`,
    `| 장면 WebP만 | ${staticResources.webp.files} | ${number(staticResources.webp.bytes)} | +${number(staticResources.webp.newBytes)} |`,
    `| \`public/offline.html\` | 1 | ${number(staticResources.offlineHtml.bytes)} | +${number(staticResources.offlineHtml.increaseBytes)} |`, '',
    '`public/game/` 안에 audio와 art가 포함되므로 위 행들을 더하면 중복 집계가 됩니다. 오프라인 HTML은 별도 파일이며, 이야기를 묶어 담은 크기를 따로 표시했습니다. MB는 1,000,000바이트, MiB는 1,048,576바이트 기준입니다.', '',
    `기존 일곱 이야기의 기본 파일 ${report.preservation.originalSevenBasicFiles.files}개, 그림 ${report.preservation.originalSevenAtlases.files}개, MP3 ${report.preservation.original55Mp3.files}개와 주사위·판정·전투·직업·개인 도입 데이터·음악 루프 설정을 포함해 **${report.preservation.embeddedManifestFiles}개 파일**을 v21 SHA-256 기준으로 확인했습니다. 모두 일치합니다. UI와 모드·효과음 연결을 위해 바뀌는 실행 파일까지 동일하다고 주장하는 검사는 아닙니다.`, '',
    '이 값은 저장된 정적 파일의 실제 크기입니다. Supabase 계정의 데이터베이스 사용량이나 월간 트래픽, 브라우저 메모리, 서버 속도를 측정한 값은 아닙니다. 파일 용량을 근거로 끊김이나 렉이 없다고 단정하지 않습니다.', '',
    '## 다시 계산하는 방법', '',
    '프로젝트 루트에서 다음 명령을 실행하면 현재 소스와 파일을 읽어 이 안내와 `RESOURCE_REPORT_V22.json`을 다시 만듭니다.', '',
    '```bash', 'node scripts/report-v22.mjs', '```', '',
    '스크립트 안에 v21 보존 기준 해시가 들어 있어 v21 폴더 없이도 재실행할 수 있습니다. v21 원본 폴더를 추가로 대조하려면 다음처럼 경로를 넘깁니다.', '',
    '```bash', 'node scripts/report-v22.mjs --baseline ../chronicle-v21', '```', '',
    '아홉 이야기·개인 도입·그림·효과음·공포 배경음이 완성되지 않았거나 보존 기준과 용량 한도가 맞지 않으면 종료 코드 1을 반환하고 완성 보고서를 덮어쓰지 않습니다. 이 스크립트는 소스·정적 자원 검사이며 실제 게임 엔진과 서버 검증을 대신하지 않습니다.', '',
  ];
  fs.writeFileSync(full('RESOURCE_REPORT_V22.json'), JSON.stringify(report, null, 2) + '\n');
  fs.writeFileSync(full('STORY_EXPANSION_V22.md'), lines.join('\n'));
  console.log(JSON.stringify({ version: report.version, stories: report.totals.stories, basicScenes: report.totals.basic.playableScenes, epicScenes: report.totals.epic.playableScenes, ordinaryEndings: report.totals.distinctOrdinaryEndingTemplates, openingProfessions: report.totals.openingProfessions, preservedFiles: report.preservation.embeddedManifestFiles, preserved: report.preservation.allMatch, publicGameBytes: staticResources.publicGame.bytes, newSfxBytes: staticResources.newContextualEffects.bytes, newHorrorScoreBytes: staticResources.newHorrorScores.bytes, complete: true }, null, 2));
}
