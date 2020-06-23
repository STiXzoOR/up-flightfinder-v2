/* eslint-disable vars-on-top */
/* eslint-disable global-require */
/* eslint-disable no-var */
const express = require('express');
const { unlink, rmdir } = require('fs').promises;
const path = require('path');
const appRoot = require('app-root-path');
const createError = require('http-errors');
const passport = require('passport');
const jimp = require('jimp');
const config = require('../config/dotenv');
const Common = require('../controllers/common');
const User = require('../controllers/user');
const routeAsync = require('../middleware/route-async');
const handleResponseError = require('../middleware/handle-response-error');
const permit = require('../middleware/permit');
const uploader = require('../middleware/file-upload');
const rateLimiter = require('../config/rate-limit');
const { validate } = require('../middleware/superstruct');

if (config.mailgun.enabled || config.nodemailer.enabled)
  // eslint-disable-next-line import/no-dynamic-require
  var Mailer = require(config.dynamicModules.mailer);
require('../config/passport')(passport);

const router = express.Router();

router.get('/', (req, res, next) => {
  return next(createError(400));
});

router.get('/sign-in', (req, res) => {
  return res.render('user/sign-in');
});

router.get('/sign-up', (req, res) => {
  return res.render('user/sign-up');
});

router.get('/sign-out', permit('USER', { requireVerification: false }), (req, res, next) => {
  req.session.destroy((err) => {
    if (err) return next(err);

    req.logout();
    return res.redirect('/');
  });
});

router.post('/sign-in', (req, res, next) => {
  passport.authenticate('login', (err, response) => {
    if (err) return next(err);
    if (response.error)
      return handleResponseError(response, { redirectOnError: true, flashMessage: true, redirect: '/user/sign-in' })(
        req,
        res,
        next
      );

    return req.login(response.result[0], (err) => {
      if (err) return next(err);

      if (req.body.rememberMyPassword && req.body.rememberMyPassword === 'on')
        req.session.cookie.maxAge = 90 * 24 * 60 * 60 * 1000;

      req.session.user = { id: req.user.id };
      return res.redirect('/');
    });
  })(req, res, next);
});

router.post(
  '/sign-up',
  rateLimiter.createAccount,
  routeAsync(async (req, res, next) => {
    const { body } = req;
    let response = await User.insert(body);

    if (response.error)
      return handleResponseError(response, { redirectOnError: true, flashMessage: true, redirect: '/user/sign-up' })(
        req,
        res,
        next
      );

    if (config.mailgun.enabled || config.nodemailer.enabled) {
      const args = {
        email: body.email,
        firstName: body.firstName,
        lastName: body.lastName,
        url: req.getUrl(),
      };

      response = await User.sendVerification(args);
      if (response.error)
        return handleResponseError(response, { redirectOnError: true, flashMessage: true, redirect: '/user/sign-up' })(
          req,
          res,
          next
        );
    }

    res.flash('success', response.message);
    return res.redirect('/user/sign-in');
  })
);

router.get(
  '/profile',
  permit('USER', { requireVerification: false }),
  routeAsync(async (req, res, next) => {
    const userID = req.user.id;
    let response = await User.get({ userID });

    if (response.error) return handleResponseError(response)(req, res, next);

    const details = response.result[0];
    response = await User.bookings(userID);

    if (response.error && (response.tryCatchError || !response.status === 404))
      return handleResponseError(response)(req, res, next);

    const bookings = response.result;
    response = await Common.getCountries();

    if (response.error) return handleResponseError(response)(req, res, next);
    const countries = response.result;

    return res.render('user/profile', {
      details,
      bookings,
      countries,
    });
  })
);

router.put(
  '/edit/avatar/upload',
  permit('USER'),
  uploader(),
  routeAsync(async (req, res, next) => {
    let response = {
      status: 400,
      error: true,
      message: 'Either the file you uploaded is invalid or corrupted. Please upload again.',
    };

    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(404).json(response);
    }

    const { avatar } = req.files;
    const allowedMimes = ['image/jpeg', 'image/pjpeg', 'image/png'];

    if (!allowedMimes.includes(avatar.mimetype)) {
      response.message = 'Invalid file type. Only jpg and png image files are allowed.';
      return res.status(response.status).json(response);
    }

    if (avatar.truncated) {
      response.message = 'The file is too big. Please upload a file smaller than 1MB.';
      return res.status(response.status).json(response);
    }

    await jimp.read(avatar.tempFilePath).then((image) => {
      return Promise.all(
        [32, 256].map((size) => {
          const clone = image.clone().cover(size, size);
          const filename = `profile_${size}.jpg`;
          const filePath = appRoot.resolve(`/uploads/${req.user.id}/avatar`);

          return clone.write(path.join(filePath, filename));
        })
      );
    });
    await unlink(avatar.tempFilePath);

    response = await User.updateAvatarStatus({ userID: req.user.id, hasAvatar: true });

    if (response.error)
      return handleResponseError(response, { redirectOnError: true, flashMessage: true, redirect: '/user/profile' })(
        req,
        res,
        next
      );

    const url = `/user/${req.user.id}/uploads/avatar/profile`;
    response.urls = { small: `${url}_32.jpg`, large: `${url}_256.jpg` };
    return res.status(response.status).json(response);
  })
);

router.delete(
  '/edit/avatar/delete',
  permit('USER'),
  routeAsync(async (req, res, next) => {
    await Promise.all(
      [32, 256].map((size) => {
        const filename = `profile_${size}.jpg`;
        const filePath = appRoot.resolve(`/uploads/${req.user.id}/avatar`);

        return unlink(path.join(filePath, filename));
      })
    );

    const response = await User.updateAvatarStatus({ userID: req.user.id, hasAvatar: false });

    if (response.error)
      return handleResponseError(response, { redirectOnError: true, flashMessage: true, redirect: '/user/profile' })(
        req,
        res,
        next
      );

    return res.status(response.status).json(response);
  })
);

router.post(
  '/edit/personal',
  permit('USER'),
  routeAsync(async (req, res, next) => {
    const { body } = req;
    body.country = body.country || null;

    const response = await User.updateDetails({ userID: req.user.id, ...body });
    if (response.error && response.tryCatchError) return next(response.result);

    res.flash(response.error ? 'error' : 'success', response.message);
    return res.redirect('/user/profile');
  })
);

router.post(
  '/edit/password',
  permit('USER'),
  routeAsync(async (req, res, next) => {
    const { body } = req;
    const response = await User.updatePassword({ userID: req.user.id, ...body });

    if (response.error)
      return handleResponseError(response, { redirectOnError: true, flashMessage: true, redirect: '/user/profile' })(
        req,
        res,
        next
      );

    return req.session.destroy((err) => {
      if (err) return next(err);

      req.logout();
      return res.redirect('/user/sign-in');
    });
  })
);

router.post(
  '/delete',
  permit('USER'),
  routeAsync(async (req, res, next) => {
    const response = await User.remove({ userID: req.user.id, ...req.body });

    if (response.error)
      return handleResponseError(response, { redirectOnError: true, flashMessage: true, redirect: '/user/profile' })(
        req,
        res,
        next
      );

    await rmdir(appRoot.resolve(`/uploads/${req.user.id}`), { recursive: true });

    return req.session.destroy((err) => {
      if (err) return next(err);

      req.logout();
      return res.redirect('/');
    });
  })
);

if (config.mailgun.enabled || config.nodemailer.enabled) {
  router.get('/forgot-password', (req, res) => {
    return res.render('user/forgot-password');
  });

  router.post(
    '/forgot-password',
    routeAsync(async (req, res, next) => {
      const { email } = req.body;
      let response = await User.get({ email }, { byID: false, byEmail: true, partial: true });

      if (response.error)
        return handleResponseError(response, {
          redirectOnError: 404,
          flashMessage: true,
          redirect: '/user/format-password',
        })(req, res, next);

      const data = response.result[0];
      const args = {
        email,
        firstName: data.firstName,
        lastName: data.lastName,
        url: req.getUrl(),
      };

      response = await User.sendVerification(args, 'password');
      if (response.error && response.tryCatchError) return next(response.result);

      res.flash(response.error ? 'error' : 'success', response.message);
      return res.redirect('/user/sign-in');
    })
  );

  router.get(
    '/account/reset-password',
    validate('validateToken'),
    routeAsync(async (req, res, next) => {
      const { token } = req.query;
      const response = await User.verifyToken(token, 'password');

      if (response.error)
        return handleResponseError(response, { redirectOnError: true, flashMessage: true, redirect: '/user/sign-in' })(
          req,
          res,
          next
        );

      return res.render('user/reset-password', { token, userID: response.result[0].id });
    })
  );

  router.post(
    '/account/reset-password',
    routeAsync(async (req, res, next) => {
      const { body } = req;
      const route = `/user/reset-password?token=${body.token}`;
      let response = await User.verifyToken(body.token, 'password');

      if (response.error)
        return handleResponseError(response, { redirectOnError: true, flashMessage: true, redirect: '/user/sign-in' })(
          req,
          res,
          next
        );

      response = await User.get({ userID: body.userID }, { partial: true });

      if (response.error)
        return handleResponseError(response, { redirectOnError: 404, flashMessage: true, redirect: '/user/sign-in' })(
          req,
          res,
          next
        );

      const data = response.result[0];
      response = await User.updatePassword(body, { matchPasswords: false, expireToken: true });

      if (response.error)
        return handleResponseError(response, { redirectOnError: true, flashMessage: true, redirect: route })(
          req,
          res,
          next
        );

      const args = {
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        url: req.getUrl(),
        recipient: `${data.firstName} ${data.lastName} <${data.email}>`,
      };

      await Mailer.sendChangedPassword(args);

      res.flash('success', response.message);
      return res.redirect('/user/sign-in');
    })
  );

  router.get(
    '/account/verify',
    validate('validateToken'),
    routeAsync(async (req, res, next) => {
      const { token } = req.query;
      const route = `/user/${req.isAuthenticated() ? 'profile' : 'sign-in'}`;
      let response = await User.verifyToken(token);

      if (response.error)
        return handleResponseError(response, { redirectOnError: true, flashMessage: true, redirect: route })(
          req,
          res,
          next
        );

      const userID = response.result[0].id;
      response = await User.verify(userID);

      if (response.error)
        return handleResponseError(response, { redirectOnError: true, flashMessage: true, redirect: route })(
          req,
          res,
          next
        );

      const { message } = response;
      response = await User.get({ userID }, { partial: true });

      if (response.error)
        return handleResponseError(response, { redirectOnError: 404, flashMessage: true, redirect: route })(
          req,
          res,
          next
        );

      const data = response.result[0];
      const args = {
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        url: req.getUrl(),
        recipient: `${data.firstName} ${data.lastName} <${data.email}>`,
      };

      await Mailer.sendWelcome(args);

      res.flash('success', message);
      return res.redirect(route);
    })
  );

  router.get(
    '/account/verify/resend',
    validate({ email: 'email' }),
    routeAsync(async (req, res, next) => {
      const { email } = req.query;
      const route = `/user/${req.isAuthenticated() ? 'profile' : 'sign-in'}`;
      let response = await User.get({ email }, { byID: false, byEmail: true, partial: true });

      if (response.error) return handleResponseError(response)(req, res, next);

      const data = response.result[0];
      const args = {
        email,
        firstName: data.firstName,
        lastName: data.lastName,
        url: req.getUrl(),
      };

      response = await User.sendVerification(args);
      if (response.error && response.tryCatchError) return next(response.result);

      res.flash(response.error ? 'error' : 'success', response.message);
      return res.redirect(route);
    })
  );
}

module.exports = router;
