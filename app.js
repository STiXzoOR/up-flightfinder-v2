require('dotenv').config();

const express = require('express');
const session = require('express-session');
const passport = require('passport');
const { v4: uuid } = require('uuid');
const favicon = require('serve-favicon');
const path = require('path');
const logger = require('morgan');
const flash = require('express-flash-2');
const redis = require('redis');
const RedisStore = require('connect-redis')(session);

const indexRouter = require('./src/routes/index');
const pagesRouter = require('./src/routes/pages');
const usersRouter = require('./src/routes/users');
const flightsRouter = require('./src/routes/flight');
const bookingRouter = require('./src/routes/booking');

const app = express();
const redisClient = redis.createClient();

app.set('views', path.join(__dirname, '/dist/views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use('/static', express.static(path.join(__dirname, '/dist/static')));
app.use(favicon(path.join(__dirname, '/dist/static/images', 'favicon.ico')));

app.use(
  session({
    genid: (req) => {
      return uuid();
    },
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

app.use((req, res, next) => {
  req.getUrl = () => `${req.protocol}://${req.app.get('env') === 'development' ? req.get('host') : req.hostname}`;

  return next();
});

app.use((req, res, next) => {
  if (req.session.user === undefined || !req.isAuthenticated()) {
    req.session.user = { id: 0 };
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

app.use((req, res, next) => {
  return res.status(404).render('404');
});

app.use((err, req, res, next) => {
  if (req.app.get('env') === 'development') {
    res.locals.message = err.message;
    res.locals.error = err;
    return res.render('error');
  }

  const error = err.status || 500;
  return res.status(error).render(`${error}`);
});

module.exports = app;
