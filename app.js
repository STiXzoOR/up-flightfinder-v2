/* eslint-disable vars-on-top */
/* eslint-disable no-var */
/* eslint-disable global-require */
const env = require('dotenv').config().parsed;
const createError = require('http-errors');
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const { v4: uuid } = require('uuid');
const favicon = require('serve-favicon');
const path = require('path');
const morgan = require('morgan');
const flash = require('express-flash-2');
const redis = require('redis');
const RedisStore = require('connect-redis')(session);
const Maintenance = require('./config/modules/maintenance');
const winston = require('./src/config/winston');
const indexRouter = require('./src/routes/index');
const pagesRouter = require('./src/routes/pages');
const usersRouter = require('./src/routes/users');
const flightsRouter = require('./src/routes/flight');
const bookingRouter = require('./src/routes/booking');
if (env.MAILGUN_ENABLED) var newsletterRouter = require('./src/routes/newsletter');

const isProduction = env.NODE_ENV === 'production';
const app = express();
const redisClient = redis.createClient();
const morganFormat = isProduction ? 'combined' : 'dev';

app.set('views', path.join(__dirname, '/dist/views'));
app.set('view engine', 'pug');

app.use(
  morgan(morganFormat, {
    skip: (req, res) => res.statusCode < 400,
    stream: process.stderr,
  })
);

app.use(
  morgan(morganFormat, {
    skip: (req, res) => res.statusCode >= 400,
    stream: process.stdout,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use('/static', express.static(path.join(__dirname, '/dist/static')));
app.use(favicon(path.join(__dirname, '/dist/static/images', 'favicon.ico')));

app.use(
  session({
    genid: (req) => uuid(),
    secret: process.env.SECRET_KEY,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, expires: false },
    store: new RedisStore({ host: 'localhost', port: 6379, client: redisClient, ttl: 260 }),
  })
);
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

app.use(Maintenance(app, { endpoint: true, view: '503' }).middleware);

app.use((req, res, next) => {
  req.getUrl = () => `${req.protocol}://${req.app.get('env') === 'development' ? req.get('host') : req.hostname}`;

  return next();
});

app.use((req, res, next) => {
  if (req.session.user === undefined || !req.isAuthenticated()) {
    req.session.user = { id: 1 };
  }

  res.locals.user = {
    ...(req.user ? req.user : req.session.user),
    isAuthenticated: req.isAuthenticated() || false,
  };

  return next();
});

app.use('/', indexRouter);
app.use('/pages', pagesRouter);
app.use('/user', usersRouter);
app.use('/flight', flightsRouter);
app.use('/booking', bookingRouter);
if (env.MAILGUN_ENABLED) app.use('/newsletter', newsletterRouter);

app.use((req, res, next) => {
  return next(createError(404));
});

app.use((err, req, res, next) => {
  const statusCode = err.status || 500;

  const logMsg = [
    req.method,
    req.originalUrl,
    `${isProduction ? statusCode : winston.colorize('error', statusCode)}`,
    err.message,
    `${isProduction ? `\n${err.stack}` : `\n\n${err.stack}\n`}`,
  ].join(isProduction ? ' - ' : ' ');

  winston.error(logMsg);

  if (!isProduction) {
    res.locals.message = err.message;
    res.locals.error = err;
    return res.render('error');
  }

  const message = statusCode === 429 ? err.message : undefined;
  return res.status(statusCode).render(`${statusCode}`, { message });
});

process.on('unhandledRejection', (reason) => {
  throw reason;
});

process.on('uncaughtException', (err) => {
  winston.error(`Uncaught Exception: 500 - ${err.message} \n${err.stack}`);
});

process.on('SIGINT', () => {
  winston.info(' Alright! Bye bye!');
  process.exit();
});

module.exports = app;
