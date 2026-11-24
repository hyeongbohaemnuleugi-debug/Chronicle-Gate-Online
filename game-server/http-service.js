/**
 * Chronicle Gate v18 default host. This module never imports legacy persistence,
 * account code or a Supabase client. Static serving uses Node built-ins so the
 * shared-device offline server also works without npm install.
 */
import http from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzip } from 'node:zlib';
import { promisify } from 'node:util';
import crypto from 'node:crypto';

const gzipAsync = promisify(gzip);
const PUBLIC_ROOT = fileURLToPath(new URL('../public/', import.meta.url));
const VERSION = '21.0.0';
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.ico': 'image/x-icon',
};
const TEXT_EXTENSIONS = new Set(['.html', '.js', '.css', '.json', '.svg']);
const MEDIA_EXTENSIONS = new Set(['.webp', '.png', '.jpg', '.jpeg', '.mp3', '.ogg', '.ico', '.svg']);
const MAX_COMPRESSIBLE_BYTES = 1024 * 1024;
const MAX_COMPRESSED_CACHE_BYTES = 1024 * 1024;

function acceptsGzip(request) {
  return String(request.headers['accept-encoding'] || '').split(',').some(part => {
    const [name, ...parameters] = part.trim().toLowerCase().split(';');
    if (name !== 'gzip') return false;
    const weight = parameters.find(value => value.trim().startsWith('q='));
    return !weight || Number(weight.trim().slice(2)) > 0;
  });
}
function originFor(request) {
  const forwarded = String(request.headers['x-forwarded-proto'] || '').split(',')[0].trim();
  const protocol = request.socket.encrypted || forwarded === 'https' ? 'https:' : 'http:';
  const host = String(request.headers.host || 'localhost');
  if (!/^[a-z0-9.\[\]:-]+$/i.test(host)) return null;
  try { return new URL(`${protocol}//${host}`); } catch { return null; }
}
function securityHeaders(request, response, { offline = false } = {}) {
  const origin = originFor(request);
  const socketSource = !offline && origin ? ` ${origin.protocol === 'https:' ? 'wss:' : 'ws:'}//${origin.host}` : '';
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Referrer-Policy', 'same-origin');
  response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  response.setHeader('X-Chronicle-Version', VERSION);
  response.setHeader('Content-Security-Policy', [
    "default-src 'self'", "script-src 'self'", "style-src 'self' 'unsafe-inline'", "font-src 'self'",
    "img-src 'self' data: blob:", "media-src 'self' blob:", `connect-src 'self'${socketSource}`,
    "object-src 'none'", "base-uri 'self'", "frame-ancestors 'none'",
  ].join('; '));
}
function empty(response, status, headers = {}) {
  response.writeHead(status, { 'Content-Length': 0, ...headers });
  response.end();
}
function etagMatches(header, etag) {
  if (!header) return false;
  const plain = value => value.trim().replace(/^W\//, '');
  return String(header).split(',').some(value => value.trim() === '*' || plain(value) === plain(etag));
}
function fresh(request, etag, modified) {
  if (request.headers['if-none-match']) return etagMatches(request.headers['if-none-match'], etag);
  if (!request.headers['if-modified-since']) return false;
  const since = Date.parse(request.headers['if-modified-since']);
  return Number.isFinite(since) && Math.floor(modified / 1000) * 1000 <= since;
}
function parseRange(header, size) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(String(header));
  if (!match || (!match[1] && !match[2]) || size === 0) return null;
  let start = 0, end = size - 1;
  if (!match[1]) {
    const suffix = Number(match[2]);
    if (!Number.isSafeInteger(suffix) || suffix <= 0) return null;
    start = Math.max(0, size - suffix);
  } else {
    start = Number(match[1]);
    if (match[2]) end = Math.min(end, Number(match[2]));
  }
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start > end || start >= size) return null;
  return { start, end };
}
function rangeIsCurrent(request, etag, modified) {
  const conditional = request.headers['if-range'];
  if (!conditional) return true;
  // These static validators are weak metadata validators, so an ETag in If-Range
  // cannot establish byte-for-byte identity. A valid modification date can.
  if (/^(?:W\/)?"/.test(conditional)) return !etag.startsWith('W/') && conditional === etag;
  const since = Date.parse(conditional);
  return Number.isFinite(since) && Math.floor(modified / 1000) * 1000 <= since;
}

/** Returns an async request handler using only Node built-ins. */
export function createStaticHandler({ root = PUBLIC_ROOT, offline = false } = {}) {
  const absoluteRoot = path.resolve(root);
  const canonicalRoot = fsp.realpath(absoluteRoot);
  const compressed = new Map(), inFlight = new Map();
  let compressedBytes = 0;
  async function compressedFile(filename, stat) {
    const key = `${filename}:${stat.size}:${stat.mtimeMs}`;
    if (compressed.has(key)) {
      const value = compressed.get(key); compressed.delete(key); compressed.set(key, value); return value;
    }
    if (inFlight.has(key)) return inFlight.get(key);
    const work = (async () => {
      const bytes = await gzipAsync(await fsp.readFile(filename), { level: 6 });
      if (bytes.length <= MAX_COMPRESSED_CACHE_BYTES) {
        while (compressed.size && (compressed.size >= 32 || compressedBytes + bytes.length > MAX_COMPRESSED_CACHE_BYTES)) {
          const first = compressed.keys().next().value;
          compressedBytes -= compressed.get(first).length; compressed.delete(first);
        }
        compressed.set(key, bytes); compressedBytes += bytes.length;
      }
      return bytes;
    })().finally(() => inFlight.delete(key));
    inFlight.set(key, work); return work;
  }
  return async function serveStatic(request, response) {
    securityHeaders(request, response, { offline });
    if (!['GET', 'HEAD'].includes(request.method)) { empty(response, 405, { Allow: 'GET, HEAD' }); return; }
    let url, pathname;
    try { url = new URL(request.url, 'http://localhost'); pathname = decodeURIComponent(url.pathname); }
    catch { empty(response, 400); return; }
    // The single-file bundle is for file:// double-click use. Over HTTP, use the
    // external-module offline entry so the normal script CSP remains effective.
    if (pathname === '/offline.html') { empty(response, 302, { Location: '/index.html?offline=1', 'Cache-Control': 'no-store' }); return; }
    if (pathname === '/' && offline) { empty(response, 302, { Location: '/index.html?offline=1' }); return; }
    if (pathname === '/legacy.html') {
      const text = Buffer.from('구형 계정 모드는 기본 서버에서 비활성화되어 있습니다. 현재 게임은 첫 화면에서 시작하세요. 구형 계정이 필요하면 운영자가 start:legacy를 명시적으로 실행해야 합니다.');
      response.writeHead(410, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', 'Content-Length': text.length });
      response.end(request.method === 'HEAD' ? undefined : text); return;
    }
    if (pathname === '/') pathname = '/index.html';
    // Old files may remain after a changed-files ZIP is applied. They must not
    // silently reintroduce large WAV downloads or the old account application.
    if (pathname.includes('\0') || pathname.includes('\\')) { empty(response, 403); return; }
    const allowed = ['/index.html', '/offline.html', '/favicon.svg'].includes(pathname) || pathname.startsWith('/game/');
    const extension = path.extname(pathname).toLowerCase();
    if (!allowed || !Object.hasOwn(MIME, extension) || extension === '.wav') { empty(response, 404); return; }
    const target = path.resolve(absoluteRoot, `.${pathname}`);
    if (!target.startsWith(absoluteRoot + path.sep)) { empty(response, 403); return; }
    let stat, canonical;
    try { canonical = await fsp.realpath(target); stat = await fsp.stat(canonical); }
    catch (error) { empty(response, ['ENOENT', 'ENOTDIR'].includes(error.code) ? 404 : 500); return; }
    const realRoot = await canonicalRoot;
    if (!canonical.startsWith(realRoot + path.sep)) { empty(response, 403); return; }
    if (!stat.isFile()) { empty(response, 404); return; }
    const etag = `W/"${stat.size.toString(16)}-${Math.floor(stat.mtimeMs).toString(16)}"`;
    const media = MEDIA_EXTENSIONS.has(extension);
    const cache = media ? (['17000','19000','20000'].includes(url.searchParams.get('v')) ? 'public, max-age=31536000, immutable' : 'public, max-age=3600, must-revalidate') : 'no-cache, must-revalidate';
    response.setHeader('Cache-Control', cache);
    response.setHeader('ETag', etag);
    response.setHeader('Last-Modified', stat.mtime.toUTCString());
    response.setHeader('Content-Type', MIME[extension]);
    response.setHeader('Accept-Ranges', 'bytes');
    if (TEXT_EXTENSIONS.has(extension)) response.setHeader('Vary', 'Accept-Encoding');
    if (fresh(request, etag, stat.mtimeMs)) { response.writeHead(304); response.end(); return; }
    let range = null;
    if (request.headers.range && rangeIsCurrent(request, etag, stat.mtimeMs)) {
      range = parseRange(request.headers.range, stat.size);
      if (!range) { empty(response, 416, { 'Content-Range': `bytes */${stat.size}` }); return; }
    }
    if (!range && TEXT_EXTENSIONS.has(extension) && stat.size > 1024 && stat.size <= MAX_COMPRESSIBLE_BYTES && acceptsGzip(request)) {
      const body = await compressedFile(canonical, stat);
      response.writeHead(200, { 'Content-Encoding': 'gzip', 'Content-Length': body.length });
      response.end(request.method === 'HEAD' ? undefined : body); return;
    }
    const start = range?.start ?? 0, end = range?.end ?? stat.size - 1;
    const headers = { 'Content-Length': Math.max(0, end - start + 1) };
    if (range) headers['Content-Range'] = `bytes ${start}-${end}/${stat.size}`;
    response.writeHead(range ? 206 : 200, headers);
    if (request.method === 'HEAD' || stat.size === 0) { response.end(); return; }
    const stream = fs.createReadStream(canonical, { start, end });
    stream.on('error', () => response.destroy());
    response.on('close', () => stream.destroy());
    stream.pipe(response);
  };
}

async function jsonResponse(request, response, value, { cache = 'no-store' } = {}) {
  const body = Buffer.from(JSON.stringify(value));
  const etag = `W/"${crypto.createHash('sha256').update(body).digest('hex').slice(0, 24)}"`;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', cache);
  response.setHeader('Vary', 'Accept-Encoding');
  response.setHeader('ETag', etag);
  if (cache !== 'no-store' && etagMatches(request.headers['if-none-match'], etag)) { response.writeHead(304); response.end(); return; }
  const useGzip = body.length > 1024 && body.length <= MAX_COMPRESSIBLE_BYTES && acceptsGzip(request);
  const bytes = useGzip ? await gzipAsync(body, { level: 6 }) : body;
  if (useGzip) response.setHeader('Content-Encoding', 'gzip');
  response.writeHead(200, { 'Content-Length': bytes.length });
  response.end(request.method === 'HEAD' ? undefined : bytes);
}

/** In-process integration entry point; no global signal handlers or external calls. */
export async function startHttpService({ port = Number(process.env.PORT || 3000), host = '0.0.0.0', tableOptions = {} } = {}) {
  const [{ Server }, { attachTableService }] = await Promise.all([import('socket.io'), import('./table-service.js')]);
  const serveStatic = createStaticHandler();
  let service, maxConnections;
  const unseatedSocketTtl = Number(tableOptions.unseatedSocketTtl) > 0 ? Number(tableOptions.unseatedSocketTtl) : 60_000;
  const connectionTimers = new Set();
  const server = http.createServer((request, response) => {
    (async () => {
      securityHeaders(request, response);
      let pathname;
      try { pathname = new URL(request.url, 'http://localhost').pathname; } catch { empty(response, 400); return; }
      if (pathname === '/health' || pathname === '/api/table/catalog') {
        if (!['GET', 'HEAD'].includes(request.method)) { empty(response, 405, { Allow: 'GET, HEAD' }); return; }
        const status = service.status();
        const value = pathname === '/health' ? {
          ok: true, version: VERSION, mode: 'story-table', rooms: status.rooms, diskRooms: status.diskRooms,
          storage: status.storage, storageError: status.storageError,
          connections: io.engine.clientsCount,
          limits: { ...status.limits, maxConnections, unseatedSocketTtlMs: unseatedSocketTtl },
          supabase: { enabled: false, requests: 0 }, legacyEnabled: false,
          uptimeSeconds: Math.floor(process.uptime()),
        } : { ok: true, version: VERSION, campaigns: service.catalog, storage: status.storage };
        await jsonResponse(request, response, value, { cache: pathname === '/health' ? 'no-store' : 'no-cache, must-revalidate' });
        return;
      }
      await serveStatic(request, response);
    })().catch(error => {
      console.error('[http]', error.code || error.name || 'request failed');
      if (!response.headersSent) empty(response, 500); else response.destroy();
    });
  });
  const io = new Server(server, {
    serveClient: true, pingInterval: 25_000, pingTimeout: 20_000, maxHttpBufferSize: 2 * 1024 * 1024 + 16 * 1024,
    allowRequest: (request, callback) => {
      if (io.engine.clientsCount >= maxConnections) { callback('Connection limit reached', false); return; }
      const originHeader = request.headers.origin;
      if (!originHeader) { callback(null, true); return; }
      let allowed = false;
      try {
        const origin = new URL(originHeader), own = originFor(request);
        allowed = ['http:', 'https:'].includes(origin.protocol) && Boolean(own && origin.origin === own.origin);
      } catch {}
      callback(null, allowed);
    },
  });
  // The default namespace belonged to account-based legacy sessions. It is not
  // mounted here, even if the deployment still has old SUPABASE_* variables.
  io.of('/').use((_socket, next) => next(new Error('이 서버는 이야기 탁자 /table 연결만 지원합니다.')));
  service = attachTableService(io, tableOptions);
  const configuredConnections = tableOptions.maxConnections ?? process.env.CHRONICLE_MAX_CONNECTIONS;
  maxConnections = Number.isFinite(Number(configuredConnections)) && Number(configuredConnections) > 0
    ? Math.max(tableOptions.maxConnections === undefined ? 8 : 1, Math.min(1024, Math.floor(Number(configuredConnections))))
    : service.limits.maxRooms * 4 + 32;
  // Cap the transport itself, including connections which never join /table.
  io.engine.on('connection', connection => {
    if (io.engine.clientsCount > maxConnections) { connection.close(true); return; }
    const timer = setTimeout(() => {
      connectionTimers.delete(timer);
      const seated = [...io.of('/table').sockets.values()].some(socket => socket.conn === connection && socket.data.roomCode);
      if (!seated) connection.close(true);
    }, unseatedSocketTtl);
    timer.unref?.(); connectionTimers.add(timer);
    connection.once('close', () => { clearTimeout(timer); connectionTimers.delete(timer); });
  });
  server.requestTimeout = 30_000;
  server.headersTimeout = 15_000;
  server.keepAliveTimeout = 5_000;
  server.maxRequestsPerSocket = 200;
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, host, resolve); });
  let closing;
  const close = () => closing ||= (async () => {
    for (const timer of connectionTimers) clearTimeout(timer); connectionTimers.clear();
    service.close();
    await new Promise(resolve => io.close(resolve));
    if (server.listening) await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  })();
  return { server, io, service, url: `http://${host === '0.0.0.0' ? '127.0.0.1' : host}:${server.address().port}`, close };
}
