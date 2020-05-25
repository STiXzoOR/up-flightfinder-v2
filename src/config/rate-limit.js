const createError = require('http-errors');
const RateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');

const options = {
  store: new RedisStore({
    expiry: 3600,
  }),
  handler: (req, res, next) => next(createError(options.statusCode, options.message)),
};

const createAccountLimiter = new RateLimit({
  ...options,
  max: 3,
  message: 'requests for creating new account',
});

const flightSearchLimiter = new RateLimit({
  ...options,
  max: 15,
  message: 'requests for new flight search',
});

module.exports = {
  createAccountLimiter,
  flightSearchLimiter,
};
