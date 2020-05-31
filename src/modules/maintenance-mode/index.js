/* eslint-disable no-unused-expressions */

// TODO #1: Enable/Disable through package.json
// TODO #2: Convert it into a npm package
// TODO #3: Generate tests

const { existsSync, readFileSync, writeFileSync, mkdirSync } = require('fs');
const { open, utimes, unlink } = require('fs').promises;
const createError = require('http-errors');
const crypto = require('crypto');
const appRoot = require('app-root-path');
const express = require('express');

const defaults = (options) => ({
  enabled: false,
  endpoint: false,
  apiMode: false,
  message: 'Sorry for the inconvenience, we are on maintenance.',
  path: '/maintenance',
  checkpoint: '/status',
  view: 'maintenance.html',
  retryAfter: 30,
  ...options,
});

const touch = async (path) => {
  const time = new Date();
  await utimes(path, time, time).catch(async () => {
    let filehandle;
    try {
      filehandle = await open(path, 'w');
    } finally {
      if (filehandle !== undefined) await filehandle.close();
    }
  });
  return true;
};

class MaintenanceMode {
  constructor(app, options) {
    this.app = app;
    this.options = defaults(options);
    this.isEnabled = this.options.enabled;
    this.statusCode = 503;
    this.endpointStatusCode = 404;
    this.accesKeyPath = `${appRoot}/config`;
    this.filename = `${appRoot}/maintenance`;
    this.serialize = JSON.stringify;
    this.deserialize = JSON.parse;
    this.init();
  }

  init() {
    this.generateKeyFile();
    if (this.maintenanceFileExists()) {
      this.isEnabled = true;
      this.endpointStatusCode = 401;
    }

    if (this.options.endpoint) {
      const router = express.Router();
      const verifyAccess = (req, res, next) => {
        if (!this.options.accessKey || this.allowedAccess(req)) return next();
        return this.options.apiMode
          ? res.sendStatus(this.endpointStatusCode)
          : next(createError(this.endpointStatusCode));
      };
      const verifyStatus = (req, res, next) => {
        if (this.isEnabled) return next();
        return this.options.apiMode ? res.sendStatus(404) : next(createError(404));
      };

      if (!this.options.apiMode) {
        router.get('/', verifyStatus, (req, res) => {
          return res.render(this.options.view);
        });
      }

      router.get(this.options.checkpoint, verifyStatus, (req, res) => {
        return res.status(200).json({
          current_status: this.status,
          retry_after: `${this.options.retryAfter} minutes`,
        });
      });

      router.post('/on', verifyAccess, async (req, res) => {
        await this.enable();
        return res.sendStatus(200);
      });

      router.post('/off', verifyAccess, async (req, res) => {
        await this.disable();
        return res.sendStatus(200);
      });

      router.delete('/', verifyAccess, async (req, res) => {
        await this.reset();
        return res.sendStatus(200);
      });

      this.app.use(this.options.path, router);
    }
  }

  generateKeyFile() {
    const keyFile = `${this.accesKeyPath}/maintenance_key.json`;
    if (!existsSync(this.accesKeyPath)) mkdirSync(this.accesKeyPath, { recursive: true });

    if (existsSync(keyFile)) {
      const data = this.deserialize(readFileSync(keyFile, 'utf8').trim());
      if (data.key && data.key.length === 32) {
        this.options.accessKey = data.key;
        return;
      }
    }

    this.options.accessKey = crypto.randomBytes(16).toString('hex');

    writeFileSync(
      `${this.accesKeyPath}/maintenance_key.json`,
      this.serialize({ key: this.options.accessKey }, null, 2)
    );
  }

  maintenanceFileExists() {
    return existsSync(this.filename);
  }

  get middleware() {
    return this.mainMiddleware();
  }

  mainMiddleware() {
    return (req, res, next) => {
      return this.isEnabled && !this.allowedAccess(req) ? this.handle(req, res) : next();
    };
  }

  allowedAccess(req) {
    return req.get('X-Maintenance-Key') === this.options.accessKey;
  }

  handle(req, res) {
    res.set('Retry-After', this.options.retryAfter);
    return this.options.apiMode
      ? res.status(this.statusCode).json({ message: this.options.message })
      : res.redirect(this.options.path);
  }

  async enable() {
    if (this.isEnabled) return;

    await touch(this.filename)
      .then(() => {
        this.isEnabled = true;
        this.endpointStatusCode = 401;
      })
      .catch((err) => {
        throw err;
      });
  }

  async disable() {
    if (!this.isEnabled) return;

    await unlink(this.filename);
    this.isEnabled = false;
    this.endpointStatusCode = 404;
  }

  async reset() {
    if (!this.isEnabled) return;

    await this.disable();
    this.isEnabled = this.options.enabled;
  }

  get status() {
    return this.getStatus();
  }

  getStatus() {
    return this.isEnabled ? 'enabled' : 'disabled';
  }
}

module.exports = (app, options) => new MaintenanceMode(app, options);
