/* eslint-disable no-shadow */
const createError = require('http-errors');
const RateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const MongoStore = require('rate-limit-mongo');
const config = require('./dotenv');

const options = {
  limiters: [
    {
      name: 'createAccount',
      options: {
        store: {
          type: 'mongo',
          options: {
            uri: config.mongo.uri,
            expireTimeMs: 60 * 60 * 1000,
            collectionName: 'createAccountRateLimit',
          },
        },
        windowMs: 60 * 60 * 1000,
        max: 3,
        message: 'Too many requests for creating new account',
        skip: {
          type: 'environment',
          condition: 'development',
        },
        handler: 'default',
      },
    },
    {
      name: 'flightSearch',
      options: {
        store: {
          type: 'mongo',
          options: {
            uri: config.mongo.uri,
            expireTimeMs: 60 * 60 * 1000,
            collectionName: 'flightSearchRateLimit',
          },
        },
        windowMs: 60 * 60 * 1000,
        max: 15,
        message: 'Too many requests for new flight search',
        skip: {
          type: 'environment',
          condition: 'development',
        },
        handler: 'default',
      },
    },
  ],
  skippers: {
    environment(env) {
      return function check() {
        return this.env === env;
      };
    },
  },
  handlers: {
    default(req, res, next) {
      return next(createError(this.statusCode, this.message));
    },
  },
};

class RateLimiter {
  constructor(options) {
    this.env = config.env;
    this.config = options;

    this.init();
  }

  init() {
    this.config.limiters.forEach((limiter) => {
      let options = {
        env: this.env,
        max: limiter.options.max || 5,
        message: limiter.options.message || 'Too many requests, please try again later.',
        headers: limiter.options.headers || true,
        statusCode: limiter.options.statusCode || 429,
        skipFailedRequests: limiter.options.skipFailedRequests || false,
        skipSuccessfulRequests: limiter.options.skipSuccessfulRequests || false,
      };

      if (limiter.options.store) {
        let store;

        switch (limiter.options.store.type) {
          case 'redis':
            store = new RedisStore(limiter.options.store.options);
            break;
          case 'mongo':
            store = new MongoStore(limiter.options.store.options);
            break;
          default:
            throw new Error("Rate Limiter - Can't create the specific store type");
        }

        options.store = store;
      } else {
        options.store = limiter.options.store;
        options = {
          ...options,
          ...limiter.options.store.options,
        };
      }

      if (limiter.options.skip)
        options.skip = this.config.skippers[limiter.options.skip.type](limiter.options.skip.condition);
      if (limiter.options.handler) options.handler = this.config.handlers[limiter.options.handler];

      this[limiter.name] = new RateLimit(options);
    });
  }
}

module.exports = new RateLimiter(options);
