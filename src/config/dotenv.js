/* eslint-disable class-methods-use-this */
const dotenv = require('dotenv');
const { platform } = require('os');

class Config {
  load() {
    this.raw = dotenv.config().parsed;
    return this;
  }

  get env() {
    return process.env.NODE_ENV;
  }

  get port() {
    return Number(process.env.PORT || 8080);
  }

  get sessionSecret() {
    return process.env.SESSION_SECRET;
  }

  get database() {
    return {
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT || 3306),
    };
  }

  get mailgun() {
    return {
      enabled: process.env.MAILGUN_ENABLED === 'True',
      apiKey: process.env.MAILGUN_API_KEY,
      host: process.env.MAILGUN_HOST,
      domain: process.env.MAILGUN_DOMAIN,
      sender: process.env.MAILGUN_SENDER_EMAIL,
    };
  }

  isProd() {
    return this.env === 'production';
  }

  isDev() {
    return this.env === 'development';
  }

  isOSX() {
    return platform() === 'darwin';
  }

  isLINUX() {
    return platform() === 'linux';
  }

  isWINDOWS() {
    return platform() === 'win32';
  }
}

module.exports = new Config();
