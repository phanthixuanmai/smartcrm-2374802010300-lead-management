const crypto = require('node:crypto');

const SESSION_COOKIE = 'smartcrm_session';
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

function constantTimeEqual(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length
    && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function createAuth({ username, password } = {}) {
  const sessions = new Map();
  const configured = typeof username === 'string' && username.length > 0
    && typeof password === 'string' && password.length > 0;
  const secureCookie = process.env.NODE_ENV === 'production' ? '; Secure' : '';

  function readSessionToken(req) {
    const cookieHeader = req.headers.cookie || '';
    const cookie = cookieHeader.split(';').map((part) => part.trim())
      .find((part) => part.startsWith(`${SESSION_COOKIE}=`));
    return cookie ? cookie.slice(SESSION_COOKIE.length + 1) : '';
  }

  function getSession(req) {
    const token = readSessionToken(req);
    const session = sessions.get(token);
    if (!session) {
      return null;
    }
    if (session.expiresAt <= Date.now()) {
      sessions.delete(token);
      return null;
    }
    return { username: session.username };
  }

  function setSessionCookie(res, token) {
    res.setHeader(
      'Set-Cookie',
      `${SESSION_COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/api; Max-Age=${SESSION_TTL_MS / 1000}${secureCookie}`
    );
  }

  function clearSessionCookie(res) {
    res.setHeader(
      'Set-Cookie',
      `${SESSION_COOKIE}=; HttpOnly; SameSite=Lax; Path=/api; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT${secureCookie}`
    );
  }

  function login(req, res) {
    if (!configured) {
      return res.status(503).json({ error: 'Đăng nhập chưa được cấu hình trên máy chủ.' });
    }

    const body = req.body;
    if (!body || typeof body.username !== 'string' || typeof body.password !== 'string'
      || body.username.length > 200 || body.password.length > 1024
      || !constantTimeEqual(body.username, username)
      || !constantTimeEqual(body.password, password)) {
      return res.status(401).json({ error: 'Tên đăng nhập hoặc mật khẩu không đúng.' });
    }

    for (const [sessionToken, session] of sessions) {
      if (session.expiresAt <= Date.now()) {
        sessions.delete(sessionToken);
      }
    }
    const token = crypto.randomBytes(32).toString('hex');
    sessions.set(token, { username, expiresAt: Date.now() + SESSION_TTL_MS });
    setSessionCookie(res, token);
    return res.status(200).json({ user: { username } });
  }

  function logout(req, res) {
    sessions.delete(readSessionToken(req));
    clearSessionCookie(res);
    return res.status(200).json({ success: true });
  }

  function requireAuth(req, res, next) {
    if (!configured) {
      return res.status(503).json({ error: 'Đăng nhập chưa được cấu hình trên máy chủ.' });
    }
    if (!getSession(req)) {
      return res.status(401).json({ error: 'Vui lòng đăng nhập để tiếp tục.' });
    }
    return next();
  }

  return { configured, getSession, login, logout, requireAuth };
}

module.exports = { createAuth };
