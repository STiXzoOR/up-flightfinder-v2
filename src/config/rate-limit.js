const createError = require('http-errors');
const RateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const { isProduction } = require('./requests');

// TODO: convert it into a Class object

const createAccountLimiter = new RateLimit({
  store: new RedisStore({
    expiry: 3600,
  }),
  max: 3,
  message: 'Too many requests for creating new account.',
  skip: () => !isProduction,
  handler(req, res, next) {
    return next(createError(this.statusCode, this.message));
  },
});

const flightSearchLimiter = new RateLimit({
  store: new RedisStore({
    expiry: 3600,
  }),
  max: 15,
  message: 'Too many requests for new flight search.',
  skip: () => !isProduction,
  handler(req, res, next) {
    return next(createError(this.statusCode, this.message));
  },
});

module.exports = {
  createAccountLimiter,
  flightSearchLimiter,
};
