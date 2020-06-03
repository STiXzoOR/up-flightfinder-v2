const config = require('../config/dotenv');

module.exports = function beforeRequest(req, res, next) {
  req.getUrl = () => `${req.protocol}://${config.isDev() ? req.get('host') : req.hostname}`;

  if (!req.session.user) req.session.user = { id: 1, role: 'GUEST' };
  res.locals.user = req.user || req.session.user;
  res.locals.user.isAuthenticated = req.isAuthenticated();
  res.locals.isProd = config.isProd;

  return next();
};
