'use strict';

const path = require('path');
const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const { Pool } = require('pg');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const JWT_SECRET = process.env.JWT_SECRET || 'local-development-secret-change-me';
const ADMIN_EMAIL = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
const isProduction = process.env.NODE_ENV === 'production';

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL 환경변수가 필요합니다.');
  process.exit(1);
}
if (isProduction && JWT_SECRET.includes('change-me')) {
  console.error('운영 환경에서는 안전한 JWT_SECRET을 설정해야 합니다.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isProduction ? { rejectUnauthorized: false } : false
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 2 },
  fileFilter: (_req, file, cb) => {
    const allowed = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);
    cb(allowed.has(file.mimetype) ? null : new Error('PNG, JPG, WEBP, GIF 이미지만 가능합니다.'), allowed.has(file.mimetype));
  }
});

app.set('trust proxy', 1);
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'blob:'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      scriptSrc: ["'self'"]
    }
  }
}));
app.use(compression());
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

const authLimiter = rateLimit({ windowMs: 10 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false });
const clickLimiter = rateLimit({ windowMs: 1000, limit: 20, standardHeaders: true, legacyHeaders: false });

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}
function cleanNickname(value) {
  return String(value || '').replace(/[<>]/g, '').trim().slice(0, 14);
}
function makeToken(user) {
  return jwt.sign({ sub: user.id, email: user.email, isAdmin: user.is_admin }, JWT_SECRET, { expiresIn: '30d' });
}
function setAuthCookie(res, token) {
  res.cookie('popclick_token', token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: '/'
  });
}
function authRequired(req, res, next) {
  const token = req.cookies.popclick_token;
  if (!token) return res.status(401).json({ error: '로그인이 필요합니다.' });
  try {
    req.auth = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.clearCookie('popclick_token', { path: '/' });
    return res.status(401).json({ error: '로그인이 만료되었습니다.' });
  }
}
async function adminRequired(req, res, next) {
  try {
    const result = await pool.query('SELECT is_admin FROM users WHERE id = $1', [req.auth.sub]);
    if (!result.rows[0]?.is_admin) return res.status(403).json({ error: '관리자만 사용할 수 있습니다.' });
    next();
  } catch (error) {
    next(error);
  }
}

async function initDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGSERIAL PRIMARY KEY,
      email VARCHAR(254) UNIQUE NOT NULL,
      nickname VARCHAR(14) NOT NULL,
      password_hash TEXT NOT NULL,
      is_admin BOOLEAN NOT NULL DEFAULT FALSE,
      clicks BIGINT NOT NULL DEFAULT 0 CHECK (clicks >= 0),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS game_images (
      slot VARCHAR(20) PRIMARY KEY CHECK (slot IN ('normal', 'pressed')),
      mime_type VARCHAR(50) NOT NULL,
      image_data BYTEA NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_users_clicks ON users (clicks DESC, created_at ASC);
  `);
}

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.post('/api/auth/signup', authLimiter, async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.email);
    const nickname = cleanNickname(req.body.nickname);
    const password = String(req.body.password || '');
    if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: '올바른 이메일을 입력해 주세요.' });
    if (nickname.length < 2) return res.status(400).json({ error: '닉네임은 2자 이상 입력해 주세요.' });
    if (password.length < 6 || password.length > 72) return res.status(400).json({ error: '비밀번호는 6~72자로 입력해 주세요.' });

    const passwordHash = await bcrypt.hash(password, 12);
    const isAdmin = Boolean(ADMIN_EMAIL && email === ADMIN_EMAIL);
    const result = await pool.query(
      `INSERT INTO users (email, nickname, password_hash, is_admin)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, nickname, is_admin, clicks`,
      [email, nickname, passwordHash, isAdmin]
    );
    const user = result.rows[0];
    setAuthCookie(res, makeToken(user));
    res.status(201).json({ user });
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ error: '이미 가입된 이메일입니다.' });
    next(error);
  }
});

app.post('/api/auth/login', authLimiter, async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || '');
    const result = await pool.query('SELECT id, email, nickname, password_hash, is_admin, clicks FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: '이메일 또는 비밀번호가 맞지 않습니다.' });
    }
    delete user.password_hash;
    setAuthCookie(res, makeToken(user));
    res.json({ user });
  } catch (error) {
    next(error);
  }
});

app.post('/api/auth/logout', (_req, res) => {
  res.clearCookie('popclick_token', { path: '/' });
  res.json({ ok: true });
});

app.get('/api/me', authRequired, async (req, res, next) => {
  try {
    const result = await pool.query('SELECT id, email, nickname, is_admin, clicks FROM users WHERE id = $1', [req.auth.sub]);
    if (!result.rows[0]) return res.status(401).json({ error: '사용자 정보를 찾을 수 없습니다.' });
    res.json({ user: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

app.post('/api/clicks', clickLimiter, authRequired, async (req, res, next) => {
  try {
    const delta = Number(req.body.delta);
    if (!Number.isInteger(delta) || delta < 1 || delta > 100) {
      return res.status(400).json({ error: '잘못된 클릭 수입니다.' });
    }
    const result = await pool.query(
      'UPDATE users SET clicks = clicks + $1 WHERE id = $2 RETURNING clicks',
      [delta, req.auth.sub]
    );
    res.json({ clicks: Number(result.rows[0].clicks) });
  } catch (error) {
    next(error);
  }
});

app.get('/api/leaderboard', async (_req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, nickname, clicks
       FROM users
       ORDER BY clicks DESC, created_at ASC
       LIMIT 50`
    );
    res.json({ rows: result.rows.map((row) => ({ ...row, clicks: Number(row.clicks) })) });
  } catch (error) {
    next(error);
  }
});

app.get('/api/images/:slot', async (req, res, next) => {
  try {
    if (!['normal', 'pressed'].includes(req.params.slot)) return res.sendStatus(404);
    const result = await pool.query('SELECT mime_type, image_data, updated_at FROM game_images WHERE slot = $1', [req.params.slot]);
    const image = result.rows[0];
    if (!image) {
      return res.sendFile(path.join(__dirname, 'public', 'assets', `${req.params.slot}.png`));
    }
    res.set('Content-Type', image.mime_type);
    res.set('Cache-Control', 'no-cache');
    res.set('ETag', `"${new Date(image.updated_at).getTime()}"`);
    res.send(image.image_data);
  } catch (error) {
    next(error);
  }
});

app.post(
  '/api/admin/images',
  authRequired,
  adminRequired,
  upload.fields([{ name: 'normal', maxCount: 1 }, { name: 'pressed', maxCount: 1 }]),
  async (req, res, next) => {
    const client = await pool.connect();
    try {
      const normal = req.files?.normal?.[0];
      const pressed = req.files?.pressed?.[0];
      if (!normal && !pressed) return res.status(400).json({ error: '변경할 이미지를 선택해 주세요.' });
      await client.query('BEGIN');
      for (const [slot, file] of [['normal', normal], ['pressed', pressed]]) {
        if (!file) continue;
        await client.query(
          `INSERT INTO game_images (slot, mime_type, image_data, updated_at)
           VALUES ($1, $2, $3, NOW())
           ON CONFLICT (slot) DO UPDATE
           SET mime_type = EXCLUDED.mime_type, image_data = EXCLUDED.image_data, updated_at = NOW()`,
          [slot, file.mimetype, file.buffer]
        );
      }
      await client.query('COMMIT');
      res.json({ ok: true, version: Date.now() });
    } catch (error) {
      await client.query('ROLLBACK');
      next(error);
    } finally {
      client.release();
    }
  }
);

// -----------------------------------------------------------------------------
// 정적 웹 파일 제공
// GitHub 업로드 과정에서 파일이 public 폴더 또는 저장소 최상위에 놓인 경우를
// 모두 지원하도록 실제 index.html이 있는 위치를 자동으로 찾습니다.
// -----------------------------------------------------------------------------
const fs = require('fs');

const staticCandidates = [
  path.join(__dirname, 'public'),
  __dirname
];

const staticDir = staticCandidates.find((dir) =>
  fs.existsSync(path.join(dir, 'index.html'))
);

if (!staticDir) {
  console.error('index.html을 찾지 못했습니다. 다음 경로를 확인했습니다:', staticCandidates);
} else {
  console.log('정적 웹 파일 경로:', staticDir);
  console.log('index.html 경로:', path.join(staticDir, 'index.html'));
}

// 브라우저가 자동 요청하는 favicon 때문에 500 오류가 발생하지 않도록 처리합니다.
app.get('/favicon.ico', (_req, res) => res.status(204).end());

if (staticDir) {
  app.use(express.static(staticDir, {
    index: false,
    maxAge: isProduction ? '1h' : 0
  }));
}

function sendIndex(_req, res, next) {
  if (!staticDir) {
    return res.status(500).type('html').send(`
      <!doctype html>
      <html lang="ko">
        <head><meta charset="utf-8"><title>파일 경로 오류</title></head>
        <body style="font-family:sans-serif;padding:32px">
          <h1>index.html을 찾지 못했습니다.</h1>
          <p>GitHub 저장소에 <code>public/index.html</code>이 있는지 확인해 주세요.</p>
        </body>
      </html>
    `);
  }

  res.sendFile(path.join(staticDir, 'index.html'), (error) => {
    if (error) next(error);
  });
}

// 메인 주소
app.get('/', sendIndex);

// 존재하지 않는 API는 JSON 404로 반환합니다.
app.use('/api', (_req, res) => {
  res.status(404).json({ error: '존재하지 않는 API 주소입니다.' });
});

// 게임 내부 주소로 직접 접속해도 index.html을 보여줍니다.
app.use(sendIndex);

// 오류 처리기는 반드시 모든 라우트보다 마지막에 둡니다.
app.use((error, req, res, next) => {
  console.error('서버 오류:', {
    method: req.method,
    path: req.originalUrl,
    message: error.message,
    code: error.code,
    stack: error.stack
  });

  if (res.headersSent) return next(error);
  if (error instanceof multer.MulterError) {
    return res.status(400).json({ error: '이미지 파일이 너무 크거나 형식이 잘못되었습니다.' });
  }
  if (error.message?.includes('이미지만')) {
    return res.status(400).json({ error: error.message });
  }

  res.status(500).json({
    error: '서버에서 오류가 발생했습니다.',
    detail: isProduction ? undefined : error.message
  });
});

initDatabase()
  .then(() => app.listen(PORT, '0.0.0.0', () => console.log(`NEON POP CLICK server listening on ${PORT}`)))
  .catch((error) => {
    console.error('데이터베이스 초기화 실패:', error);
    process.exit(1);
  });
