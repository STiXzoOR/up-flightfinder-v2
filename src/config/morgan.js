/* eslint-disable no-shadow */
const morgan = require('morgan');
const config = require('./dotenv');

const options = {
  format: {
    type: 'environment',
    names: {
      development: 'dev',
      production: 'combined-v2',
    },
  },
  formats: {
    'combined-v2': '[:timestamp] [:remote-addr] - HTTP/:http-version :method :url :status ":user-agent"',
  },
  tokens: [
    { name: 'timestamp', value: (req, res) => new Date().toISOString().slice(0, 19).replace(/T/, ' ') },
    { name: 'id', value: (req, res) => req.session.user.id },
  ],
  loggers: [
    {
      name: 'infoLogger',
      options: {
        skip: (req, res) => res.statusCode >= 400,
        stream: process.stdout,
      },
    },
    {
      name: 'errorLogger',
      options: {
        skip: (req, res) => res.statusCode < 400,
        stream: process.stderr,
      },
    },
  ],
};

class MorganWrapper {
  constructor(format, options) {
    this.env = config.env;
    this.config = options;
    this.format = format;
    this.morgan = morgan;

    this.init();
  }

  init() {
    this.format = this.parseFormat(this.format || this.config.format);
    if (this.config.tokens && this.config.tokens.length > 0) this.parseTokens();
    if (this.config.loggers && this.config.loggers.length > 0) this.parseLoggers();
  }

  parseFormat(format) {
    const parsedFormat = typeof format === 'string' ? format : format.names[this.env];
    const isCustom = Object.keys(this.config.formats).includes(parsedFormat);

    return isCustom ? this.config.formats[parsedFormat] : parsedFormat;
  }

  parseLoggers() {
    this.config.loggers.forEach((logger) => {
      const format = logger.format ? this.parseFormat(logger.format) : this.format;

      this[logger.name] = () => this.morgan(format, logger.options);
    });
  }

  parseTokens() {
    this.config.tokens.forEach((token) => {
      this.morgan.token(token.name, token.value);
    });
  }
}

module.exports = (format) => new MorganWrapper(format, options);
