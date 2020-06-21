/* eslint-disable vars-on-top */
/* eslint-disable no-var */
/* eslint-disable global-require */
const appRoot = require('app-root-path');
const express = require('express');
const session = require('express-session');
const compression = require('compression');
const helmet = require('helmet');
const xss = require('xss-clean');
const hpp = require('hpp');
const passport = require('passport');
const { existsSync, mkdirSync } = require('fs');
const { v4: uuid } = require('uuid');
const favicon = require('serve-favicon');
const flash = require('express-flash-2');
const MongoStore = require('connect-mongo')(session);
const config = require('./config/dotenv');
const Maintenance = require('./modules/maintenance-mode');
const winston = require('./config/winston');
const morgan = require('./config/morgan')();
const beforeRequest = require('./middleware/before-request');
const error = require('./middleware/error-handler');
const permit = require('./middleware/permit');
const indexRouter = require('./routes/index');
const pagesRouter = require('./routes/pages');
const usersRouter = require('./routes/users');
const flightsRouter = require('./routes/flight');
const bookingRouter = require('./routes/booking');
if (config.mailgun.enabled || config.nodemailer.enabled) var newsletterRouter = require('./routes/newsletter');

const app = express();
const setStaticCacheHeaders = (res, duration) => {
  const date = new Date();
  date.setHours(date.getHours() + duration);

  res.set({ Expires: date.toUTCString(), 'Cache-Control': `public, max-age=${duration * 3600}, immutable` });
};
const userStaticRouter = (req, res, next) => {
  const { id } = req.params;

  // eslint-disable-next-line eqeqeq
  if (req.user.id != id) return next();

  const uploadPath = appRoot.resolve(`/uploads/${id}`);
  if (!existsSync(uploadPath)) mkdirSync(uploadPath, { recursive: true });

  return express.static(
    uploadPath,
    config.isDev
      ? {}
      : {
          setHeaders(res, path) {
            if (path.match(/\.(cur|gif|gz|htc|ico|jpeg|jpg|mp4|ogg|ogv|png|svg|svgz|ttf|webm|woff|woff2)$/)) {
              setStaticCacheHeaders(res, 336);
            }
          },
        }
  )(req, res, next);
};

app.set('views', appRoot.resolve('/dist/views'));
app.set('view engine', 'pug');

app.use(compression());
app.use(favicon(appRoot.resolve('/dist/static/images/favicons/favicon.ico')));
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
app.use(
  '/static',
  express.static(
    appRoot.resolve('/dist/static'),
    config.isDev
      ? {}
      : {
          setHeaders(res, path) {
            if (path.match(/\.(cur|gif|gz|htc|ico|jpeg|jpg|mp4|ogg|ogv|png|svg|svgz|ttf|webm|woff|woff2)$/)) {
              setStaticCacheHeaders(res, 336);
            }

            if (path.match(/\.(js|css)$/)) {
              setStaticCacheHeaders(res, 168);
            }
          },
        }
  )
);

app.use(
  session({
    genid: (req) => uuid(),
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: config.isProd(), expires: false },
    store: new MongoStore({ url: config.mongo.uri }),
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
app.use('/user/:id/uploads/', permit('USER'), userStaticRouter);
app.use('/flight', flightsRouter);
app.use('/booking', bookingRouter);
if (config.mailgun.enabled || config.nodemailer.enabled) app.use('/newsletter', newsletterRouter);
app.use(error.notFound);
app.use(error.handler);

process.on('unhandledRejection', (reason) => {
  throw reason;
});

process.on('uncaughtException', (err) => {
  winston.error(`Uncaught Exception: 500 - ${err.message} \n\n${err.stack}`);
});

module.exports = app;
