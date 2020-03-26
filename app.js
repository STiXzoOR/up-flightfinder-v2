const createError = require('http-errors');
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
    resave: false,
    saveUninitialized: false,
    duration: 30 * 60 * 1000,
    activeDuration: 5 * 6 * 1000,
    store: new RedisStore({ host: 'localhost', port: 6379, client: redisClient, ttl: 260 })
  })
);
app.use(flash());

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/flight', flightsRouter);
app.use('/booking', bookingRouter);

app.use((req, res, next) => {
  next(createError(404));
});

app.use((err, req, res, next) => {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
