/* eslint-disable vars-on-top */
/* eslint-disable global-require */
/* eslint-disable no-var */
const express = require('express');
const createError = require('http-errors');
const passport = require('passport');
const config = require('../config/dotenv');
const routeAsync = require('../middleware/route-async');
const handleResponseError = require('../middleware/handle-response-error');
const permit = require('../middleware/permit');
const rateLimiter = require('../middleware/rate-limit');
const { validate } = require('../middleware/superstruct');
const {
  verifyToken,
  sendVerificationLink,
  getCountries,
  getUserDetails,
  getUserBookings,
  insertUser,
  updateUserStatus,
  updateUserDetails,
  updateUserPassword,
  removeUser,
} = require('../config/requests');

if (config.mailgun.enabled) var mailgun = require('../config/mailgun');

require('../config/passport')(passport);

const router = express.Router();

router.get('/', (req, res, next) => {
  return next(createError(400));
});

router.get('/sign-in', (req, res) => {
  return res.render('sign-in');
});

router.get('/sign-up', (req, res) => {
  return res.render('sign-up');
});

router.get('/sign-out', permit({ roles: 'USER', requireVerification: false }), (req, res, next) => {
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
    let response = await insertUser(body);

    if (response.error)
      return handleResponseError(response, { redirectOnError: true, flashMessage: true, redirect: '/user/sign-up' })(
        req,
        res,
        next
      );

    if (config.mailgun.enabled) {
      const args = {
        email: body.email,
        firstName: body.firstName,
        lastName: body.lastName,
        url: req.getUrl(),
      };

      response = await sendVerificationLink({ args });

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
  permit({ roles: 'USER', requireVerification: false }),
  routeAsync(async (req, res, next) => {
    const customerID = req.user.id;
    let response = await getUserDetails({ args: { customerID } });

    if (response.error) return handleResponseError(response)(req, res, next);

    const details = response.result[0];
    response = await getUserBookings(customerID);

    if (response.error && (response.tryCatchError || !response.status === 400))
      return handleResponseError(response)(req, res, next);

    const bookings = response.result;
    response = await getCountries();

    if (response.error) return handleResponseError(response)(req, res, next);

    const countries = response.result;

    return res.render('profile', {
      details,
      bookings,
      countries,
    });
  })
);

router.post(
  '/edit/personal',
  permit({ roles: 'USER' }),
  routeAsync(async (req, res, next) => {
    const { body } = req;
    body.country = body.country || null;

    const response = await updateUserDetails({ customerID: req.user.id, ...body });

    if (response.error && response.tryCatchError) return next(response.result);

    res.flash(response.error ? 'error' : 'success', response.message);
    return res.redirect('/user/profile');
  })
);

router.post(
  '/edit/password',
  permit({ roles: 'USER' }),
  routeAsync(async (req, res, next) => {
    const { body } = req;
    const response = await updateUserPassword({ args: { customerID: req.user.id, ...body } });

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
  permit({ roles: 'USER' }),
  routeAsync(async (req, res, next) => {
    const response = await removeUser({ customerID: req.user.id, ...req.body });

    if (response.error)
      return handleResponseError(response, { redirectOnError: true, flashMessage: true, redirect: '/user/profile' })(
        req,
        res,
        next
      );

    return res.redirect('/user/sign-out');
  })
);

if (config.mailgun.enabled) {
  router.get('/forgot-password', (req, res) => {
    return res.render('forgot-password');
  });

  router.post(
    '/forgot-password',
    routeAsync(async (req, res, next) => {
      const { email } = req.body;
      let response = await getUserDetails({ args: { email }, byID: false, byEmail: true, partial: true });

      if (response.error)
        return handleResponseError(response, {
          redirectOnError: 400,
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

      response = await sendVerificationLink({ args, type: 'password' });

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
      const response = await verifyToken({ token, type: 'password' });

      if (response.error)
        return handleResponseError(response, { redirectOnError: true, flashMessage: true, redirect: '/user/sign-in' })(
          req,
          res,
          next
        );

      return res.render('reset-password', { customerID: response.result[0].id });
    })
  );

  router.post(
    '/account/reset-password',
    routeAsync(async (req, res, next) => {
      const { body } = req;
      const { token } = req.query;
      const route = `/user/reset-password?token=${token}`;
      let response = await getUserDetails({ args: { customerID: body.customerID }, partial: true });

      if (response.error)
        return handleResponseError(response, { redirectOnError: 400, flashMessage: true, redirect: '/user/sign-in' })(
          req,
          res,
          next
        );

      const data = response.result[0];
      response = await updateUserPassword({ args: body, matchPasswords: false, expireToken: true });

      if (response.error)
        return handleResponseError(response, { redirectOnError: true, flashMessage: true, redirect: route })(
          req,
          res,
          next
        );

      const args = {
        url: req.getUrl(),
        recipient: `${data.firstName} ${data.lastName} <${data.email}>`,
      };

      await mailgun.sendChangedPassword(args);

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
      let response = await verifyToken({ token });

      if (response.error)
        return handleResponseError(response, { redirectOnError: true, flashMessage: true, redirect: route })(
          req,
          res,
          next
        );

      const customerID = response.result[0].id;
      response = await updateUserStatus(customerID);

      if (response.error)
        return handleResponseError(response, { redirectOnError: true, flashMessage: true, redirect: route })(
          req,
          res,
          next
        );

      const { message } = response;
      response = await getUserDetails({ args: { customerID }, partial: true });

      if (response.error)
        return handleResponseError(response, { redirectOnError: 400, flashMessage: true, redirect: route })(
          req,
          res,
          next
        );

      const data = response.result[0];
      const args = {
        url: req.getUrl(),
        recipient: `${data.firstName} ${data.lastName} <${data.email}>`,
      };

      await mailgun.sendWelcome(args);

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
      let response = await getUserDetails({ args: { email }, byID: false, byEmail: true, partial: true });

      if (response.error) return handleResponseError(response)(req, res, next);

      const data = response.result[0];
      const args = {
        email,
        firstName: data.firstName,
        lastName: data.lastName,
        url: req.getUrl(),
      };

      response = await sendVerificationLink({ args });

      if (response.error && response.tryCatchError) return next(response.result);

      res.flash(response.error ? 'error' : 'success', response.message);
      return res.redirect(route);
    })
  );
}

module.exports = router;
