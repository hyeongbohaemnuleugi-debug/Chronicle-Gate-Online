#!/usr/bin/env node
/** Removes only superseded project-generated WAVs whose bytes match the shipped manifest.
 * Default is a preview. --apply performs the reviewed, bounded cleanup.
 * Modified files, links, media outside public/game/audio, and every save are untouched.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const audio = path.join(root, 'public/game/audio');
const manifest = JSON.parse(fs.readFileSync(path.join(audio, 'manifest.json'), 'utf8'));
const apply = process.argv.includes('--apply');
if (![17,19,20].includes(manifest.version) || !Array.isArray(manifest.files)) throw new Error('Supported audio manifest required');
const removed = [], retained = []; let bytes = 0;
for (const entry of manifest.files) {
  if (!/^[a-z0-9-]+\.mp3$/.test(entry.file) || !/^[a-f0-9]{64}$/.test(entry.sha256 || '')) throw new Error('Invalid cleanup record');
  const masterHash = entry.sourceWavSha256;
  if (masterHash === undefined && [19,20].includes(manifest.version)) continue;
  if (!/^[a-f0-9]{64}$/.test(masterHash || '')) throw new Error('Invalid master hash');
  const name = entry.file.replace(/\.mp3$/, '.wav'), target = path.join(audio, name);
  if (!fs.existsSync(target)) continue;
  const stat = fs.lstatSync(target);
  if (!stat.isFile() || stat.isSymbolicLink()) { retained.push({ file: name, reason: 'Not a regular file' }); continue; }
  const actual = crypto.createHash('sha256').update(fs.readFileSync(target)).digest('hex');
  if (actual !== masterHash) { retained.push({ file: name, reason: 'Modified bytes: preserve user changes' }); continue; }
  // Require the compact replacement to be present and byte-identical before deleting a master.
  const replacement = path.join(audio, entry.file);
  if (!fs.existsSync(replacement) || crypto.createHash('sha256').update(fs.readFileSync(replacement)).digest('hex') !== entry.sha256) {
    retained.push({ file: name, reason: 'Verified MP3 replacement missing' }); continue;
  }
  if (apply) fs.unlinkSync(target);
  removed.push(name); bytes += stat.size;
}
console.log(JSON.stringify({ mode: apply ? 'apply' : 'preview', files: removed.length, bytes, retained }, null, 2));
if (!apply && removed.length) console.log('Use node scripts/cleanup-v17.mjs --apply to remove only these verified obsolete WAVs.');
