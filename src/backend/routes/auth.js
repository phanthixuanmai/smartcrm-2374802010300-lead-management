const express = require('express');

function createAuthRouter(auth) {
  const router = express.Router();

  router.post('/login', (req, res) => auth.login(req, res));
  router.post('/logout', (req, res) => auth.logout(req, res));
  router.get('/session', (req, res) => {
    if (!auth.configured) {
      return res.status(503).json({ error: 'Đăng nhập chưa được cấu hình trên máy chủ.' });
    }
    const user = auth.getSession(req);
    if (!user) {
      return res.status(401).json({ error: 'Vui lòng đăng nhập để tiếp tục.' });
    }
    return res.status(200).json({ user });
  });

  return router;
}

module.exports = { createAuthRouter };
