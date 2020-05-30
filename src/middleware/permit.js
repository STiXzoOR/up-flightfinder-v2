/* eslint-disable no-param-reassign */
const createError = require('http-errors');

// TODO: Add support for guest role
module.exports = function permit(roles = [], { requireVerification = true } = {}) {
  if (typeof roles === 'string') roles = [roles];

  const isAllowed = (role) => roles.includes(role);
  const checkVerification = (verified) => (requireVerification ? verified === 1 : true);

  return (req, res, next) => {
    if (req.user && isAllowed(req.user.role) && checkVerification(req.user.isVerified)) return next();
    return next(createError(403));
  };
};
