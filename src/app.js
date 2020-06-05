/* eslint-disable vars-on-top */
/* eslint-disable no-var */
/* eslint-disable global-require */
const appRoot = require('app-root-path');
const createError = require('http-errors');
const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const xss = require('xss-clean');
const hpp = require('hpp');
const passport = require('passport');
const { v4: uuid } = require('uuid');
const favicon = require('serve-favicon');
const flash = require('express-flash-2');
const redis = require('redis');
const RedisStore = require('connect-redis')(session);
const config = require('./config/dotenv');
const Maintenance = require('./modules/maintenance-mode');
const winston = require('./config/winston');
const morgan = require('./config/morgan')();
const beforeRequest = require('./middleware/before-request');
const error = require('./middleware/error-handler');
const indexRouter = require('./routes/index');
const pagesRouter = require('./routes/pages');
const usersRouter = require('./routes/users');
const flightsRouter = require('./routes/flight');
const bookingRouter = require('./routes/booking');
if (config.mailgun.enabled) var newsletterRouter = require('./routes/newsletter');

const app = express();
const redisClient = redis.createClient();

app.set('views', appRoot.resolve('/dist/views'));
app.set('view engine', 'pug');

app.use(morgan.infoLogger());
app.use(morgan.errorLogger());

app.use(
  helmet({
    hsts: config.isProd(),
  })
);
app.use(xss());
app.use(hpp());

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use('/static', express.static(appRoot.resolve('/dist/static')));
app.use(favicon(appRoot.resolve('/dist/static/images/favicon.ico')));

app.use(
  session({
    genid: (req) => uuid(),
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: config.isProd(), expires: false },
    store: new RedisStore({ host: 'localhost', port: 6379, client: redisClient, ttl: 260 }),
  })
);
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

app.use(Maintenance(app, { endpoint: true, view: '503' }).middleware);
app.use(beforeRequest);
app.use('/', indexRouter);
app.use('/pages', pagesRouter);
app.use('/user', usersRouter);
app.use('/flight', flightsRouter);
app.use('/booking', bookingRouter);
if (config.mailgun.enabled) app.use('/newsletter', newsletterRouter);
app.use(error.notFound);
app.use(error.handler);

process.on('unhandledRejection', (reason) => {
  throw reason;
});

process.on('uncaughtException', (err) => {
  winston.error(`Uncaught Exception: 500 - ${err.message} \n\n${err.stack}`);
});

module.exports = app;
