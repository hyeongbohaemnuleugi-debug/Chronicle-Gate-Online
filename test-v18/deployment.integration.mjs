/**
 * Starts the real production entry and dependency-free offline HTTP entry.
 * Uses actual HTTP requests, not a browser. Run with node --test or directly.
 * The configured Supabase destination is a local recording server; no external
 * network, real account, hosted project or credential is required.
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
  '.html': /^text\/html\b/i, '.js': /^(?:text|application)\/javascript\b/i,
  '.css': /^text\/css\b/i, '.json': /^application\/json\b/i,
  '.webp': /^image\/webp\b/i, '.mp3': /^audio\/mpeg\b/i,
  '.png': /^image\/png\b/i, '.jpg': /^image\/jpeg\b/i,
  '.svg': /^image\/svg\+xml\b/i,
};
const get = (base, pathname, init = {}) => fetch(base + pathname, { signal: AbortSignal.timeout(3000), ...init });
async function freePort() {
  const listener = net.createServer();
  await new Promise((resolve, reject) => { listener.once('error', reject); listener.listen(0, '127.0.0.1', resolve); });
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

async function spawnServer(script, { offline = false, supabaseURL, envFile, environment = {} } = {}) {
  const port = await freePort();
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'chronicle-v18-deploy-'));
  const env = { ...process.env, NODE_ENV: 'production' };
  for (const key of Object.keys(env)) if (/^(?:SUPABASE_|CHRONICLE_)/.test(key) || key === 'RENDER_DISK_PATH') delete env[key];
  env.CHRONICLE_V18_DATA_DIR = path.join(temporary, 'tables');
  env.PORT = String(port); env.OFFLINE_PORT = String(port);
  if (supabaseURL) { env.SUPABASE_URL = supabaseURL; env.SUPABASE_SERVICE_ROLE_KEY = 'test-only-not-a-real-service-role-key'; }
  Object.assign(env, environment);
  if (envFile !== undefined) await fs.writeFile(path.join(temporary, '.env'), envFile, { mode: 0o600 });
  const child = spawn(process.execPath, [path.join(ROOT, script)], { cwd: envFile === undefined ? ROOT : temporary, env, stdio: ['ignore', 'pipe', 'pipe'] });
  let log = '', stopped = false;
  const collect = bytes => { log = (log + bytes.toString()).slice(-32_000); };
  child.stdout.on('data', collect); child.stderr.on('data', collect);
  const exited = new Promise(resolve => {
    child.once('exit', (code, signal) => resolve({ code, signal }));
    child.once('error', error => resolve({ code: null, signal: null, error }));
  });
  const instance = {
    base: `http://127.0.0.1:${port}`, get log() { return log; },
    async stop() {
      if (stopped) return; stopped = true;
      if (child.exitCode === null && child.signalCode === null) child.kill('SIGTERM');
      const timeout = new AbortController();
      const outcome = await Promise.race([exited, delay(4000, null, { signal: timeout.signal }).catch(() => null)]);
      timeout.abort();
      if (!outcome) { child.kill('SIGKILL'); await exited; }
      await fs.rm(temporary, { recursive: true, force: true });
      assert.ok(outcome, `${script} did not stop within four seconds`);
      assert.ok(!outcome.error, `${script} spawn error: ${outcome.error?.message}`);
      assert.equal(outcome.code, 0, `${script} shutdown was not clean: ${JSON.stringify(outcome)}\n${log}`);
      assert.equal(outcome.signal, null, `${script} should handle SIGTERM`);
      if (!offline) assert.match(log, /\[shutdown\] SIGTERM:/);
      assert.doesNotMatch(log, /\[uncaughtException\]|\[unhandledRejection\]|ERR_MODULE_NOT_FOUND|SyntaxError:|EADDRINUSE/, log);
    },
  };
  const deadline = Date.now() + 10_000;
  try {
    while (Date.now() < deadline) {
      if (child.exitCode !== null || child.signalCode !== null) throw new Error(`${script} exited before readiness:\n${log}`);
      try {
        const response = await fetch(instance.base + (offline ? '/index.html?offline=1' : '/health'), { signal: AbortSignal.timeout(700) });
        if (response.ok) { await response.arrayBuffer(); return instance; }
        await response.arrayBuffer();
      } catch {}
      await delay(80);
    }
    throw new Error(`${script} did not become ready:\n${log}`);
  } catch (error) { await instance.stop().catch(() => {}); throw error; }
}
function checkCSP(value) {
  assert.ok(value, 'Content-Security-Policy missing');
  assert.match(value, /(?:^|;)\s*default-src 'self'(?:;|$)/);
  assert.match(value, /(?:^|;)\s*script-src 'self'(?:;|$)/);
  assert.match(value, /(?:^|;)\s*object-src 'none'(?:;|$)/);
  assert.match(value, /(?:^|;)\s*frame-ancestors 'none'(?:;|$)/);
  assert.doesNotMatch(value, /unsafe-eval/);
}
async function checkAssets(base) {
  const failures = [];
  for (let offset = 0; offset < GAME_FILES.length; offset += 8) {
    const results = await Promise.allSettled(GAME_FILES.slice(offset, offset + 8).map(async absolute => {
      const url = '/' + path.relative(PUBLIC, absolute).split(path.sep).join('/');
      const size = (await fs.stat(absolute)).size;
      const response = await get(base, url, { method: 'HEAD', headers: { 'accept-encoding': 'identity' } });
      assert.equal(response.status, 200, `${url}: HEAD status`);
      assert.match(response.headers.get('content-type') || '', MIME[path.extname(absolute)], `${url}: MIME`);
      assert.equal(Number(response.headers.get('content-length')), size, `${url}: raw Content-Length`);
      assert.equal(response.headers.get('x-content-type-options'), 'nosniff', `${url}: nosniff`);
      assert.equal((await response.arrayBuffer()).byteLength, 0, `${url}: HEAD body`);
    }));
    for (const result of results) if (result.status === 'rejected') failures.push(result.reason.message);
  }
  assert.equal(failures.length, 0, `${failures.length} asset failures:\n${failures.slice(0, 8).join('\n')}`);
}
async function mediaContract(base, pathname) {
  const absolute = path.join(PUBLIC, pathname.slice(1));
  const expected = await fs.readFile(absolute);
  const full = await get(base, pathname, { headers: { 'accept-encoding': 'identity' } });
  assert.equal(full.status, 200); assert.deepEqual(Buffer.from(await full.arrayBuffer()), expected);
  assert.match(full.headers.get('cache-control') || '', /max-age=3600\b/);
  assert.match(full.headers.get('cache-control') || '', /must-revalidate/);
  assert.equal(full.headers.get('accept-ranges'), 'bytes');
  assert.match(full.headers.get('content-type') || '', MIME[path.extname(pathname)]);
  const etag = full.headers.get('etag'); assert.ok(etag);
  const cached = await get(base, pathname, { headers: { 'if-none-match': etag } });
  assert.equal(cached.status, 304); assert.equal((await cached.arrayBuffer()).byteLength, 0, 'cache revalidation should send zero media bytes');
  const dated = await get(base, pathname, { headers: { 'if-modified-since': full.headers.get('last-modified') } });
  assert.equal(dated.status, 304); await dated.arrayBuffer();
  const versioned = await get(base, pathname + '?v=17000', { method: 'HEAD', headers: { 'accept-encoding': 'identity' } });
  assert.match(versioned.headers.get('cache-control') || '', /max-age=31536000\b/);
  assert.match(versioned.headers.get('cache-control') || '', /immutable/);
  assert.equal(Number(versioned.headers.get('content-length')), expected.length);
  const first = await get(base, pathname, { headers: { range: 'bytes=0-127' } });
  assert.equal(first.status, 206); assert.equal(first.headers.get('content-range'), `bytes 0-127/${expected.length}`);
  assert.equal(Number(first.headers.get('content-length')), 128); assert.deepEqual(Buffer.from(await first.arrayBuffer()), expected.subarray(0, 128));
  const tail = await get(base, pathname, { headers: { range: 'bytes=-128' } });
  assert.equal(tail.status, 206); assert.deepEqual(Buffer.from(await tail.arrayBuffer()), expected.subarray(-128));
  const outside = await get(base, pathname, { headers: { range: `bytes=${expected.length}-` } });
  assert.equal(outside.status, 416); assert.equal(outside.headers.get('content-range'), `bytes */${expected.length}`); await outside.arrayBuffer();
  const staleRange = await get(base, pathname, { headers: { range: 'bytes=0-127', 'if-range': '"old-file-version"' } });
  assert.equal(staleRange.status, 200, 'changed file must not be joined to a cached range');
  assert.deepEqual(Buffer.from(await staleRange.arrayBuffer()), expected);
}
async function compressionContract(base, pathname) {
  const identity = await get(base, pathname, { headers: { 'accept-encoding': 'identity' } });
  const raw = Buffer.from(await identity.arrayBuffer()); assert.equal(identity.status, 200);
  const compressed = await get(base, pathname, { headers: { 'accept-encoding': 'gzip' } });
  assert.equal(compressed.status, 200); assert.equal(compressed.headers.get('content-encoding'), 'gzip');
  assert.ok(Number(compressed.headers.get('content-length')) < raw.length, `${pathname}: gzip should reduce transferred bytes`);
  // fetch decodes the actual gzip body; equality catches incorrect encoding headers.
  assert.deepEqual(Buffer.from(await compressed.arrayBuffer()), raw);
  assert.match(compressed.headers.get('vary') || '', /Accept-Encoding/i);
  const refused = await get(base, pathname, { headers: { 'accept-encoding': 'gzip;q=0, identity' } });
  assert.equal(refused.headers.get('content-encoding'), null); assert.deepEqual(Buffer.from(await refused.arrayBuffer()), raw);
  assert.match(identity.headers.get('cache-control') || '', /no-cache/);
  const fresh = await get(base, pathname, { headers: { 'if-none-match': identity.headers.get('etag') } });
  assert.equal(fresh.status, 304); assert.equal((await fresh.arrayBuffer()).byteLength, 0);
}
async function rawRequest(base, requestPath) {
  return new Promise((resolve, reject) => {
    const request = http.request(base, { path: requestPath, method: 'GET' }, response => {
      const chunks = []; response.on('data', bytes => chunks.push(bytes));
      response.on('end', () => resolve({ status: response.statusCode, body: Buffer.concat(chunks).toString() }));
    });
    request.setTimeout(3000, () => request.destroy(new Error('raw HTTP request timed out')));
    request.once('error', reject); request.end();
  });
}
async function blockedRoutes(base) {
  for (const name of ['/server.js', '/legacy-server.js', '/package.json', '/.env.example', '/%2e%2e%2fserver.js', '/game/%2e%2e/%2e%2e/server.js']) {
    const response = await rawRequest(base, name);
    assert.ok([403, 404].includes(response.status), `${name}: private source/traversal returned ${response.status}`);
    assert.doesNotMatch(response.body, /startHttpService|SUPABASE_SERVICE_ROLE_KEY/);
  }
  for (const name of ['/legacy.html', '/app.js', '/styles.css', '/vendor/three.module.js', '/audio/bgm.wav', '/game/audio/dice.wav', '/api/account/me']) {
    const response = await get(base, name); assert.ok([404, 410].includes(response.status), `${name}: old account or WAV route remains exposed`); await response.arrayBuffer();
  }
}

await test('production entry has an isolated account-free surface and compact cacheable media', { timeout: 30_000 }, async t => {
  const calls = [];
  const fakeSupabase = http.createServer((request, response) => { calls.push(request.url); request.resume(); response.writeHead(200, { 'content-type': 'application/json' }); response.end('[]'); });
  await new Promise(resolve => fakeSupabase.listen(0, '127.0.0.1', resolve));
  let server;
  try {
    server = await spawnServer('server.js', { supabaseURL: `http://127.0.0.1:${fakeSupabase.address().port}` });
    await t.test('health exposes truthful runtime limits and seven-story catalog', async () => {
      const health = await (await get(server.base, '/health')).json();
      assert.equal(health.ok, true); assert.equal(health.version, '19.0.0'); assert.equal(health.legacyEnabled, false);
      assert.deepEqual(health.supabase, { enabled: false, requests: 0 });
      assert.equal(health.limits.maxRooms, 32); assert.equal(health.limits.roomTtlMs, 24 * 60 * 60 * 1000);
      assert.equal(health.limits.chatTtlMs, 30 * 60 * 1000); assert.equal(health.limits.maxChatMessages, 30);
      assert.equal(health.limits.maxRoomBytes, 256 * 1024);
      const catalog = await (await get(server.base, '/api/table/catalog')).json();
      assert.equal(catalog.ok, true); assert.equal(catalog.version, '19.0.0'); assert.equal(catalog.storage, 'disk');
      assert.equal(catalog.campaigns.length, 7); assert.equal(new Set(catalog.campaigns.map(story => story.id)).size, 7);
    });
    await t.test('homepage and Socket.IO client load under restrictive CSP', async () => {
      const response = await get(server.base, '/'); assert.equal(response.status, 200); checkCSP(response.headers.get('content-security-policy'));
      assert.match(await response.text(), /\/game\/app\.js\?v=19000/);
      const localEntry = await get(server.base, '/offline.html', { redirect: 'manual' });
      assert.equal(localEntry.status, 302); assert.equal(localEntry.headers.get('location'), '/index.html?offline=1'); await localEntry.arrayBuffer();
      const socketClient = await get(server.base, '/socket.io/socket.io.js'); assert.equal(socketClient.status, 200);
      assert.match(socketClient.headers.get('content-type') || '', MIME['.js']); await socketClient.arrayBuffer();
    });
    await t.test(`all ${GAME_FILES.length} game modules and media have exact HEAD sizes and MIME types`, () => checkAssets(server.base));
    await t.test('MP3 and WebP support cache reuse and byte-range playback', async () => {
      await mediaContract(server.base, '/game/audio/last-train-mystery.mp3');
      await mediaContract(server.base, '/game/art/last-train.webp');
    });
    await t.test('JavaScript and catalog use negotiated gzip plus conditional revalidation', async () => {
      await compressionContract(server.base, '/game/app.js'); await compressionContract(server.base, '/api/table/catalog');
    });
    await t.test('private source, legacy accounts and old WAV routes are inaccessible', () => blockedRoutes(server.base));
    assert.deepEqual(calls, [], 'production entry contacted the configured Supabase recorder');
  } finally {
    if (server) await server.stop();
    fakeSupabase.closeIdleConnections?.(); await new Promise(resolve => fakeSupabase.close(resolve));
  }
});

await test('offline HTTP entry uses the same media contract without npm modules or a remote account', { timeout: 30_000 }, async t => {
  const server = await spawnServer('scripts/offline-server.mjs', { offline: true });
  try {
    await t.test('root enters local mode and complete media remains available', async () => {
      const redirect = await get(server.base, '/', { redirect: 'manual' }); assert.equal(redirect.status, 302);
      assert.equal(redirect.headers.get('location'), '/index.html?offline=1'); await redirect.arrayBuffer();
      const page = await get(server.base, '/index.html?offline=1'); assert.equal(page.status, 200); checkCSP(page.headers.get('content-security-policy'));
      assert.match(await page.text(), /\/game\/app\.js/); await checkAssets(server.base);
      await mediaContract(server.base, '/game/audio/victory.mp3');
    });
    await t.test('old account/oversized WAV routes and source remain blocked offline', () => blockedRoutes(server.base));
    await t.test('double-click distribution bundles code and uses relative media paths', async () => {
      const launcher = await fs.readFile(path.join(ROOT, 'PLAY_OFFLINE.html'), 'utf8'); assert.match(launcher, /\.\/public\/offline\.html\?offline=1/);
      const bundled = await fs.readFile(path.join(PUBLIC, 'offline.html'), 'utf8');
      assert.match(bundled, /<script>/); assert.doesNotMatch(bundled, /<script[^>]+(?:type="module"|src="\/game\/app\.js)/);
      assert.doesNotMatch(bundled, /<link[^>]+href="\/game\/styles\.css/);
      assert.ok(bundled.includes('./game/art/')); assert.ok(bundled.includes('./game/audio/'));
      assert.ok(bundled.includes('.mp3?v=19000'));
      assert.ok(/PRIORITY_EFFECTS\.has\(name\)\s*\?\s*["']19000["']\s*:\s*["']17000["']/u.test(bundled), 'Bundled effects preserve the old cache version while new death/revival use v19');
      assert.doesNotMatch(bundled, /\/game\/audio\/[^\s'"`]*\.wav/);
      // This is a bundle/HTTP check, not a claim that a real file:// browser ran.
      // HTTP must route to the modular local mode instead of serving an inline
      // bundle that its deliberately restrictive CSP would refuse to execute.
      const head = await get(server.base, '/offline.html', { method: 'HEAD', redirect: 'manual' });
      assert.equal(head.status, 302); assert.equal(head.headers.get('location'), '/index.html?offline=1');
      checkCSP(head.headers.get('content-security-policy'));
    });
  } finally { await server.stop(); }
});

await test('production loads a local env file while preserving host-provided settings and Supabase isolation', { timeout: 15_000 }, async () => {
  const calls = [];
  const fakeSupabase = http.createServer((request, response) => { calls.push(request.url); request.resume(); response.writeHead(200, { 'content-type': 'application/json' }); response.end('[]'); });
  await new Promise(resolve => fakeSupabase.listen(0, '127.0.0.1', resolve));
  let server;
  try {
    const envFile = [
      '# Entirely synthetic fixture: never read a developer or deployed account key.',
      'PORT=0',
      'CHRONICLE_MAX_ROOMS=3',
      'CHRONICLE_MAX_ROOM_KB=96',
      `SUPABASE_URL=http://127.0.0.1:${fakeSupabase.address().port}`,
      'SUPABASE_SERVICE_ROLE_KEY=test-only-not-a-real-secret',
      '',
    ].join('\n');
    server = await spawnServer('server.js', { envFile, environment: { CHRONICLE_MAX_ROOMS: '5' } });
    // Readiness at the allocated parent PORT already proves .env PORT=0 did not win.
    const health = await (await get(server.base, '/health')).json();
    assert.equal(health.ok, true); assert.equal(health.version, '19.0.0');
    assert.equal(health.limits.maxRooms, 5, 'host environment must take precedence over the local file');
    assert.equal(health.limits.maxRoomBytes, 96 * 1024, 'setting absent from host environment should load from the local file');
    assert.equal(health.legacyEnabled, false); assert.deepEqual(health.supabase, { enabled: false, requests: 0 });
    const catalog = await (await get(server.base, '/api/table/catalog')).json(); assert.equal(catalog.campaigns.length, 7);
    assert.deepEqual(calls, [], 'loading obsolete account settings must not activate Supabase in default mode');
  } finally {
    if (server) await server.stop(); fakeSupabase.closeIdleConnections?.(); await new Promise(resolve => fakeSupabase.close(resolve));
  }
});
