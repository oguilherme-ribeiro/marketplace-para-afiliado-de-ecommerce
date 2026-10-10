const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  if (!process.env.JWT_SECRET) {
    return res.status(503).json({ message: 'JWT_SECRET não configurada no servidor.' });
  }

  const authorization = req.headers.authorization || '';
  const [scheme, token] = authorization.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'Autenticação necessária.' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (typeof payload.sub !== 'string') {
      return res.status(401).json({ message: 'Token inválido.' });
    }
    req.adminId = payload.sub;
    next();
  } catch {
    res.status(401).json({ message: 'Token inválido ou expirado.' });
  }
};
