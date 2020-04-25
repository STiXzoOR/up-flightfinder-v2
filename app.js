require('dotenv').config();

const express = require('express');
const expressSession = require('express-session');
const favicon = require('serve-favicon');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const flash = require('express-flash-2');
const redis = require('redis');
const RedisStore = require('connect-redis')(expressSession);

const indexRouter = require('./src/routes/index');
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
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '/dist/static')));
app.use(favicon(path.join(__dirname, '/dist/static/images', 'favicon.ico')));

app.use(
  expressSession({
    secret: 'session',
    secret: process.env.SECRET_KEY,
    resave: false,
    saveUninitialized: false,
    duration: 30 * 60 * 1000,
    activeDuration: 5 * 6 * 1000,
    store: new RedisStore({ host: 'localhost', port: 6379, client: redisClient, ttl: 260 })
  })
);
app.use(flash());

app.use('/', indexRouter);
app.use('/user', usersRouter);
app.use('/flight', flightsRouter);
app.use('/booking', bookingRouter);

app.use((req, res, next) => {
  res.status(404);
  res.render('404');
});

app.use((err, req, res, next) => {
  if (req.app.get('env') === 'development') {
    res.locals.message = err.message;
    res.locals.error = err;
    res.render('error');
    return;
  }

  const error = err.status || 500;
  res.status(error);
  res.render(`${error}`);
});

module.exports = app;
