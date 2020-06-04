/* eslint-disable no-shadow */
const morgan = require('morgan');
const config = require('./dotenv');

function headersSent(res) {
  return typeof res.headersSent !== 'boolean' ? Boolean(res._header) : res.headersSent;
}

function getStatusColor(status) {
  let color = 'none';

  if (status >= 500) color = 'red';
  else if (status >= 400) color = 'yellow';
  else if (status >= 300) color = 'cyan';
  else if (status >= 200) color = 'green';

  return color;
}

function colorize(color, str) {
  const colors = {
    none: 0,
    red: 31,
    green: 32,
    yellow: 33,
    cyan: 36,
    white: 37,
  };

  return `\x1b[${colors[color]}m${str}\x1b[0m`;
}

const timestamp = {
  now: () => new Date(),
  get() {
    return this.now().toISOString().slice(0, 19).replace(/T/, ' ');
  },
  date() {
    return this.now().toISOString().slice(0, 10);
  },
  time() {
    return this.now().toISOString().slice(11, 19);
  },
  toString() {
    return this.get();
  },
};

const options = {
  format: {
    type: 'environment',
    names: {
      development: 'dev-v2',
      production: 'combined-v2',
    },
  },
  formats: {
    'dev-v2': ':morgan-prefix-colored - :method :url :status-colored :response-time ms - :res[content-length]',
    'combined-v2': '[:timestamp] [:remote-addr] - HTTP/:http-version :method :url :status ":user-agent"',
  },
  tokens: [
    { name: 'timestamp', value: (req, res) => timestamp.get() },
    { name: 'id', value: (req, res) => req.session.user.id },
    {
      name: 'status-colored',
      value: (req, res) => {
        const status = headersSent(res) ? res.statusCode : undefined;
        const color = getStatusColor(status);

        return colorize(color, status);
      },
    },
    { name: 'timestamp-colored', value: (req, res, color) => colorize(color, timestamp) },
    {
      name: 'timestamp-auto-colored',
      value: (req, res) => {
        const status = headersSent(res) ? res.statusCode : undefined;
        const color = getStatusColor(status);

        return colorize(color, timestamp);
      },
    },
    {
      name: 'morgan-prefix',
      value: (req, res) => `[${timestamp.time()}] [morgan]`,
    },
    {
      name: 'morgan-prefix-colored',
      value: (req, res) => {
        const status = headersSent(res) ? res.statusCode : undefined;
        const color = getStatusColor(status);

        return colorize(color, `[${timestamp.time()}] [morgan]`);
      },
    },
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
