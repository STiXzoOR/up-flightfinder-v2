const config = require('../config/dotenv');

module.exports = function beforeRequest(req, res, next) {
  req.getUrl = () => `${req.protocol}://${config.isDev() ? req.get('host') : req.hostname}`;

  if (!req.session.user) req.session.user = { id: 1, role: 'GUEST' };
  res.locals.user = req.user || req.session.user;
  res.locals.user.isAuthenticated = req.isAuthenticated();
  res.locals.env = config.env;

  if (req.isAuthenticated() && req.user.hasAvatar) {
    const url = `/user/${req.user.id}/uploads/avatar/profile`;
    res.locals.user.avatar = { small: `${url}_32.jpg`, large: `${url}_256.jpg` };
  }

  return next();
};
