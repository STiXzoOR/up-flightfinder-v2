/* eslint-disable no-eval */
/* eslint-disable no-param-reassign */
/* eslint-disable no-unused-expressions */
const { createLogger, format, transports, addColors } = require('winston');
const { existsSync, mkdirSync } = require('fs');
const appRoot = require('app-root-path');
require('winston-daily-rotate-file');

const logsDir = `${appRoot}/logs`;
const infoDir = `${logsDir}/info`;
const errorDir = `${logsDir}/errors`;
existsSync(infoDir) || mkdirSync(infoDir, { recursive: true });
existsSync(errorDir) || mkdirSync(errorDir, { recursive: true });

const parser = (param) => {
  if (!param) return '';
  if (typeof param === 'string') return param;

  return Object.keys(param).length ? JSON.stringify(param, undefined, 2) : '';
};

const config = {
  level: 'trace',
  silent: false,
  exitOnError: false,
  format: [
    {
      type: 'timestamp',
      options: {
        format: 'HH:mm:ss',
      },
    },
    {
      type: 'printf',
      options: {
        template: 'simple',
      },
    },
  ],
  levels: {
    values: {
      trace: 6,
      debug: 5,
      info: 4,
      warn: 3,
      error: 2,
      fatal: 1,
      mark: 0,
    },
    colors: {
      trace: 'blue',
      debug: 'cyan',
      info: 'green',
      warn: 'yellow',
      error: 'red',
      fatal: 'magenta',
      mark: 'white',
    },
  },
  transports: [
    {
      type: 'Console',
      name: 'dev-logger',
      env: 'dev',
      options: {
        stderrLevels: ['fatal', 'error'],
        consoleWarnLevels: ['debug', 'warn'],
        handleExceptions: true,
        format: [
          {
            type: 'printf',
            options: {
              template: 'simple-colored',
            },
          },
        ],
      },
    },
    {
      type: 'DailyRotateFile',
      env: 'prod',
      name: 'info-logger',
      options: {
        filename: `${infoDir}/%DATE%-info.log`,
        datePattern: 'YYYY-MM-DD-HH',
        zippedArchive: true,
        handleExceptions: true,
        maxSize: '100m',
        maxFiles: '14d',
        format: [
          {
            type: 'align',
            options: {},
          },
        ],
        levels: ['info', 'mark'],
      },
    },
    {
      type: 'DailyRotateFile',
      env: 'prod',
      name: 'warn-logger',
      options: {
        filename: `${errorDir}/%DATE%-warn.log`,
        datePattern: 'YYYY-MM-DD-HH',
        zippedArchive: true,
        handleExceptions: true,
        maxSize: '20m',
        maxFiles: '30d',
        format: [
          {
            type: 'align',
            options: {},
          },
        ],
        levels: ['warn'],
      },
    },
    {
      type: 'DailyRotateFile',
      env: 'prod',
      name: 'error-logger',
      options: {
        filename: `${errorDir}/%DATE%-error.log`,
        datePattern: 'YYYY-MM-DD-HH',
        zippedArchive: true,
        handleExceptions: true,
        maxSize: '20m',
        maxFiles: '30d',
        format: [
          {
            type: 'align',
            options: {},
          },
        ],
        levels: ['error', 'fatal'],
      },
    },
  ],
  templates: {
    simple: ({ level, message, timestamp, meta }) => {
      const metaMsg = meta ? `: ${parser(meta)}` : '';
      return `[${timestamp}] [${level.toUpperCase()}] - ${message} ${metaMsg}`;
    },
    'simple-colored': ({ level, message, timestamp, meta }) => {
      const metaMsg = meta ? `: ${parser(meta)}` : '';

      return `${format
        .colorize({ all: true })
        .colorize(level, `[${timestamp}] [${level.toUpperCase()}]`)} - ${message} ${metaMsg}`;
    },
  },
};

class Logger {
  constructor(config) {
    this.env = process.env.NODE_ENV;
    this.config = config;
    this.formatter = format;

    this.init();
  }

  init() {
    this.options = {
      level: this.config.level || 'info',
      silent: this.config.silent || false,
      exitOnError: this.config.exitOnError || true,
      transports: [],
    };

    if (this.config.format) this.options.format = this.parseFormats(this.config.format);
    if (this.options.format === undefined) delete this.options.format;
    if (this.config.transports && this.config.transports.length > 0) this.parseTransports();
    if (this.config.levels && this.config.levels.values) this.options.levels = this.config.levels.values;
    if (this.config.levels && this.config.levels.colors) addColors(this.config.levels.colors);

    this.logger = createLogger(this.options);
  }

  parseTransports() {
    this.config.transports.forEach((transport) => {
      if (transport.env === this.env) {
        if (transport.options.format || transport.options.levels) {
          transport.options.format = this.parseFormats(transport.options.format, transport.options.levels);
          if (transport.options.format === undefined) delete transport.options.format;
        }

        this.options.transports.push(new transports[transport.type](transport.options));
      }
    });
  }

  parseFormats(formats, levels) {
    if (!formats && !levels) return undefined;

    const parsedFormats = [];

    if (levels && levels.length > 0) {
      const transform = (info) => (levels.includes(info.level) ? info : false);
      parsedFormats.push(format(transform)());
    }

    if (formats && formats.length > 0) {
      formats.forEach((f) => {
        if (f.type === 'printf') f.options = this.config.templates[f.options.template];
        parsedFormats.push(format[f.type](f.options));
      });
    }

    return parsedFormats.length > 1 ? format.combine(...parsedFormats) : parsedFormats[0];
  }

  colorize(level, msg) {
    return this.formatter.colorize({ all: true }).colorize(level, msg);
  }

  trace(msg, meta) {
    this.logger.log('trace', msg, meta);
  }

  debug(msg, meta) {
    this.logger.debug(msg, meta);
  }

  info(msg, meta) {
    this.logger.info(msg, meta);
  }

  warn(msg, meta) {
    this.logger.warn(msg, meta);
  }

  error(msg, meta) {
    this.logger.error(msg, meta);
  }

  fatal(msg, meta) {
    this.logger.log('fatal', msg, meta);
  }

  mark(msg, meta) {
    this.logger.log('mark', msg, meta);
  }
}

module.exports = new Logger(config);
