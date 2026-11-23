/**
 * Optional deployment smoke test. Starts the actual production entry point and
 * the dependency-free offline HTTP server in child processes, then uses HTTP.
 * Run: node tests-v14/deployment.integration.mjs
 * No browser, external service, Supabase credential, or listening server required.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import net from 'node:net';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const PUBLIC = path.join(ROOT, 'public');
const MIME = {
  '.html': /^text\/html\b/i,
  '.js': /^(?:text|application)\/javascript\b/i,
  '.css': /^text\/css\b/i,
  '.json': /^application\/json\b/i,
  '.webp': /^image\/webp\b/i,
  '.wav': /^audio\/(?:wav|x-wav|wave)\b/i,
};

async function freePort() {
  const listener = net.createServer();
  await new Promise((resolve, reject) => {
    listener.once('error', reject);
    listener.listen(0, '127.0.0.1', resolve);
  });
  const port = listener.address().port;
  await new Promise((resolve, reject) => listener.close(error => error ? reject(error) : resolve()));
  return port;
}

async function descendants(directory) {
  const found = [];
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) found.push(...await descendants(absolute));
    else if (MIME[path.extname(entry.name)]) found.push(absolute);
  }
  return found.sort();
}

const GAME_FILES = await descendants(path.join(PUBLIC, 'game'));

async function spawnServer(script, { offline = false } = {}) {
  const port = await freePort();
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'chronicle-v14-deploy-'));
  const env = { ...process.env, NODE_ENV: 'production' };
  // Never contact a real account store or reuse a caller's save directory.
  for (const key of Object.keys(env)) {
    if (/^SUPABASE_/.test(key) || /^CHRONICLE_(?:V14_DATA_DIR|DATA_DIR)$/.test(key) || key === 'RENDER_DISK_PATH') delete env[key];
  }
  env.CHRONICLE_V14_DATA_DIR = path.join(temporary, 'tables');
  env.PORT = String(port);
  env.OFFLINE_PORT = String(port);
  const child = spawn(process.execPath, [script], { cwd: ROOT, env, stdio: ['ignore', 'pipe', 'pipe'] });
  let log = '';
  const collect = bytes => { log = (log + bytes.toString()).slice(-32_000); };
  child.stdout.on('data', collect);
  child.stderr.on('data', collect);
  const exited = new Promise(resolve => {
    child.once('exit', (code, signal) => resolve({ code, signal }));
    child.once('error', error => resolve({ code: null, signal: null, error }));
  });
  let stopped = false;
  const instance = {
    base: `http://127.0.0.1:${port}`,
    get log() { return log; },
    async stop() {
      if (stopped) return;
      stopped = true;
      if (child.exitCode === null && child.signalCode === null) child.kill('SIGTERM');
      const outcome = await Promise.race([exited, delay(4_000).then(() => null)]);
      if (!outcome) {
        child.kill('SIGKILL');
        await exited;
      }
      await fs.rm(temporary, { recursive: true, force: true });
      assert.ok(outcome, `${script} did not stop within four seconds`);
      assert.ok(!outcome.error, `${script} spawn error: ${outcome.error?.message}`);
      if (offline) {
        assert.ok(outcome.code === 0 || outcome.signal === 'SIGTERM', `offline server exited unexpectedly: ${JSON.stringify(outcome)}`);
      } else {
        assert.equal(outcome.code, 0, `production server shutdown code: ${JSON.stringify(outcome)}\n${log}`);
        assert.equal(outcome.signal, null, 'production server should handle SIGTERM, not be killed by it');
        assert.match(log, /\[shutdown\] SIGTERM:/, 'production graceful shutdown handler did not run');
      }
      assert.doesNotMatch(log, /\[uncaughtException\]|\[unhandledRejection\]|ERR_MODULE_NOT_FOUND|SyntaxError:|EADDRINUSE/,
        `server logged a fatal error even if its exit code looked successful:\n${log}`);
    },
  };
  const deadline = Date.now() + 10_000;
  const readinessPath = offline ? '/index.html?offline=1' : '/health';
  try {
    while (Date.now() < deadline) {
      if (child.exitCode !== null || child.signalCode !== null) throw new Error(`${script} exited before readiness:\n${log}`);
      try {
        const response = await fetch(instance.base + readinessPath, { signal: AbortSignal.timeout(700) });
        if (response.ok) { await response.arrayBuffer(); return instance; }
        await response.arrayBuffer();
      } catch {}
      await delay(80);
    }
    throw new Error(`${script} did not become ready within ten seconds:\n${log}`);
  } catch (error) {
    await instance.stop().catch(() => {});
    throw error;
  }
}

async function get(base, pathname, init = {}) {
  return fetch(base + pathname, { signal: AbortSignal.timeout(3_000), ...init });
}

function checkCSP(value, { offline = false } = {}) {
  assert.ok(value, 'Content-Security-Policy header missing');
  assert.match(value, /(?:^|;)\s*default-src 'self'(?:;|$)/);
  assert.match(value, /(?:^|;)\s*script-src 'self'(?:;|$)/, 'HTTP pages should not permit inline scripts');
  assert.match(value, /(?:^|;)\s*object-src 'none'(?:;|$)/);
  assert.doesNotMatch(value, /unsafe-eval/);
  if (!offline) assert.match(value, /(?:^|;)\s*frame-ancestors 'none'(?:;|$)/);
}

async function checkAssets(base) {
  const failures = [];
  for (let offset = 0; offset < GAME_FILES.length; offset += 8) {
    const chunk = GAME_FILES.slice(offset, offset + 8);
    const results = await Promise.allSettled(chunk.map(async absolute => {
      const relative = '/' + path.relative(PUBLIC, absolute).split(path.sep).join('/');
      const size = (await fs.stat(absolute)).size;
      const response = await get(base, relative, { method: 'HEAD' });
      assert.equal(response.status, 200, `${relative}: HEAD status`);
      assert.match(response.headers.get('content-type') || '', MIME[path.extname(absolute)], `${relative}: MIME`);
      assert.equal(Number(response.headers.get('content-length')), size, `${relative}: Content-Length`);
      assert.equal(response.headers.get('x-content-type-options'), 'nosniff', `${relative}: nosniff`);
      assert.equal((await response.arrayBuffer()).byteLength, 0, `${relative}: HEAD response should have no body`);
    }));
    for (const result of results) if (result.status === 'rejected') failures.push(result.reason.message);
  }
  assert.equal(failures.length, 0, `${failures.length} asset failures:\n${failures.slice(0, 8).join('\n')}`);
}

async function checkAudioManifest(base) {
  const response = await get(base, '/game/audio/manifest.json');
  assert.equal(response.status, 200);
  const manifest = await response.json();
  const music = manifest.files.filter(entry => entry.kind === 'music');
  const effects = manifest.files.filter(entry => entry.kind === 'effect');
  assert.equal(music.length, 35, 'seven themes times five moods');
  assert.equal(effects.length, 7, 'seven interaction effects');
  assert.equal(new Set(manifest.files.map(entry => entry.file)).size, 42);
  assert.equal(new Set(music.map(entry => entry.theme)).size, 7);
  for (const theme of new Set(music.map(entry => entry.theme))) {
    assert.deepEqual(music.filter(entry => entry.theme === theme).map(entry => entry.mood).sort(), ['calm', 'danger', 'hope', 'mystery', 'tension']);
  }
  for (const entry of manifest.files) {
    assert.ok(entry.seconds > 0 && entry.sampleRate >= 22_050, `${entry.file}: media metadata`);
  }
  // Decode container signatures over GET as well as testing all HEAD responses.
  const wave = new Uint8Array(await (await get(base, '/game/audio/dice.wav')).arrayBuffer());
  assert.equal(Buffer.from(wave.slice(0, 4)).toString(), 'RIFF');
  assert.equal(Buffer.from(wave.slice(8, 12)).toString(), 'WAVE');
  const webp = new Uint8Array(await (await get(base, '/game/art/last-train.webp')).arrayBuffer());
  assert.equal(Buffer.from(webp.slice(0, 4)).toString(), 'RIFF');
  assert.equal(Buffer.from(webp.slice(8, 12)).toString(), 'WEBP');
}

async function rawRequest(base, requestPath) {
  return new Promise((resolve, reject) => {
    const request = http.request(base, { path: requestPath, method: 'GET' }, response => {
      const chunks = [];
      response.on('data', bytes => chunks.push(bytes));
      response.on('end', () => resolve({ status: response.statusCode, body: Buffer.concat(chunks).toString() }));
    });
    request.setTimeout(3_000, () => request.destroy(new Error('raw HTTP request timed out')));
    request.once('error', reject);
    request.end();
  });
}

async function checkPrivateFiles(base) {
  for (const requestPath of ['/server.js', '/package.json', '/.env.example', '/%2e%2e%2fserver.js', '/game/%2e%2e/%2e%2e/server.js']) {
    const response = await rawRequest(base, requestPath);
    assert.ok([403, 404].includes(response.status), `${requestPath}: unexpected status ${response.status}`);
    assert.ok(!response.body.includes("import express from 'express'"), `${requestPath}: private server source exposed`);
  }
}

await test('actual production server entry point and complete v14 HTTP surface', { timeout: 25_000 }, async t => {
  const server = await spawnServer('server.js');
  try {
    await t.test('health and seven-story catalog', async () => {
      const health = await (await get(server.base, '/health')).json();
      assert.equal(health.ok, true);
      assert.equal(health.version, '14.0.0');
      const catalog = await (await get(server.base, '/api/table/catalog')).json();
      assert.equal(catalog.ok, true);
      assert.equal(catalog.version, '14.0.0');
      assert.equal(catalog.campaigns.length, 7);
      assert.equal(new Set(catalog.campaigns.map(c => c.id)).size, 7);
      assert.equal(catalog.storage, 'disk');
    });
    await t.test('new homepage, retained legacy entry, and restrictive CSP', async () => {
      const response = await get(server.base, '/');
      assert.equal(response.status, 200);
      assert.match(response.headers.get('content-type') || '', MIME['.html']);
      checkCSP(response.headers.get('content-security-policy'));
      const html = await response.text();
      assert.match(html, /\/game\/app\.js\?v=14000/);
      assert.match(html, /이야기 탁자/);
      const legacy = await get(server.base, '/legacy.html');
      assert.equal(legacy.status, 200);
      assert.match(await legacy.text(), /Chronicle Gate Online/);
      const script = await get(server.base, '/socket.io/socket.io.js');
      assert.equal(script.status, 200);
      assert.match(script.headers.get('content-type') || '', MIME['.js']);
      await script.arrayBuffer();
    });
    await t.test(`all ${GAME_FILES.length} new modules and media have correct HEAD responses`, () => checkAssets(server.base));
    await t.test('35 music tracks, seven effects, valid audio/image containers', () => checkAudioManifest(server.base));
    await t.test('private source and traversal attempts stay outside public files', () => checkPrivateFiles(server.base));
  } finally {
    await server.stop();
  }
});

await test('dependency-free offline HTTP server and double-click distribution contract', { timeout: 25_000 }, async t => {
  const server = await spawnServer('scripts/offline-server.mjs', { offline: true });
  try {
    await t.test('root redirects to local mode and modules are accessible', async () => {
      const response = await get(server.base, '/', { redirect: 'manual' });
      assert.equal(response.status, 302);
      assert.equal(response.headers.get('location'), '/index.html?offline=1');
      const page = await get(server.base, '/index.html?offline=1');
      assert.equal(page.status, 200);
      checkCSP(page.headers.get('content-security-policy'), { offline: true });
      assert.match(await page.text(), /\/game\/app\.js/);
      const module = await get(server.base, '/game/client.js');
      assert.equal(module.status, 200, 'local HTTP module path must not be rejected as traversal');
      assert.match(module.headers.get('content-type') || '', MIME['.js']);
      await module.arrayBuffer();
    });
    await t.test(`all ${GAME_FILES.length} new modules and media have correct HEAD responses`, () => checkAssets(server.base));
    await t.test('offline media manifest and file containers', () => checkAudioManifest(server.base));
    await t.test('offline private source and traversal protection', () => checkPrivateFiles(server.base));
    await t.test('bundled offline entry is for direct file opening, not HTTP inline-script execution', async () => {
      const launcher = await fs.readFile(path.join(ROOT, 'PLAY_OFFLINE.html'), 'utf8');
      assert.match(launcher, /\.\/public\/offline\.html\?offline=1/);
      const bundled = await fs.readFile(path.join(PUBLIC, 'offline.html'), 'utf8');
      assert.match(bundled, /<script>/);
      assert.doesNotMatch(bundled, /<script[^>]+(?:type="module"|src="\/game\/app\.js)/);
      assert.doesNotMatch(bundled, /<link[^>]+href="\/game\/styles\.css/);
      assert.ok(bundled.includes('./game/art/'), 'double-click bundle must use relative image paths');
      assert.ok(bundled.includes('./game/audio/'), 'double-click bundle must use relative audio paths');
      // A live HTTP response deliberately blocks inline scripts. This test does
      // not mistake that policy for a file:// browser execution test.
      const response = await get(server.base, '/offline.html', { method: 'HEAD' });
      assert.equal(response.status, 200);
      checkCSP(response.headers.get('content-security-policy'), { offline: true });
    });
  } finally {
    await server.stop();
  }
});
