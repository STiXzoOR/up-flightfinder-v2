const createError = require('http-errors');

module.exports = function handleResponseError(response = {}, options = {}) {
  return (req, res, next) => {
    if (response.tryCatchError) return next(response.result);
    if (options.flashMessage) res.flash('error', response.message);
    if (typeof options.redirectOnError === 'boolean' || options.redirectOnError === response.status)
      return res.redirect(options.redirect);

    return next(createError(response.status, response.message));
  };
};
