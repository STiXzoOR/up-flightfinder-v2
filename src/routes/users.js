/* eslint-disable vars-on-top */
/* eslint-disable global-require */
/* eslint-disable no-var */
const express = require('express');
const createError = require('http-errors');
const passport = require('passport');
const { validate } = require('../config/superstruct');
const { createAccountLimiter } = require('../config/rate-limit');
const {
  useMailgun,
  permit,
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

if (useMailgun) var mailgun = require('../config/mailgun');

require('../config/passport')(passport);

const router = express.Router();

router.get('/', (req, res, next) => {
  return next(createError(400));
});

router.get('/sign-in', (req, res, next) => {
  return res.render('sign-in');
});

router.get('/sign-up', (req, res, next) => {
  return res.render('sign-up');
});

router.get('/sign-out', permit({ roles: 'USER' }), (req, res) => {
  req.session.destroy((err) => {
    if (err) return next(err);

    req.logout();
    return res.redirect('/');
  });
});

router.post('/sign-in', (req, res, next) => {
  passport.authenticate('login', (err, response) => {
    if (err) {
      return next(err);
    }

    if (response.error) {
      if (response.tryCatchError) return next(response.result);

      res.flash('error', response.message);
      return res.redirect('/user/sign-in');
    }

    req.login(response.result[0], (err) => {
      if (err) {
        return next(err);
      }

      if (req.body.rememberMyPassword && req.body.rememberMyPassword === 'on') {
        req.session.cookie.maxAge = 90 * 24 * 60 * 60 * 1000;
      }

      req.session.user = { id: req.user.id };
      return res.redirect('/');
    });
  })(req, res, next);
});

router.post('/sign-up', createAccountLimiter, async (req, res, next) => {
  const { body } = req;
  try {
    let response = await insertUser(body);

    if (response.error) {
      if (response.tryCatchError) return next(response.result);

      res.flash('error', response.message);
      return res.redirect('/user/sign-up');
    }

    if (useMailgun) {
      const args = {
        email: body.email,
        firstName: body.firstName,
        lastName: body.lastName,
        url: req.getUrl(),
      };

      response = await sendVerificationLink({ args });

      if (response.error) {
        if (response.tryCatchError) return next(response.result);

        res.flash('error', response.message);
        return res.redirect('/user/sign-up');
      }
    }

    res.flash('success', response.message);
    return res.redirect('/user/sign-in');
  } catch (err) {
    return next(err);
  }
});

router.get('/profile', permit({ roles: 'USER', requireVerification: false }), async (req, res, next) => {
  const customerID = req.user.id;
  try {
    const details = await getUserDetails({ args: { customerID } });

    if (details.error) {
      if (details.tryCatchError) return next(details.result);
      return next(createError(details.status, details.message));
    }

    const bookings = await getUserBookings(customerID);

    if (bookings.error && (bookings.tryCatchError || bookings.status === 500)) {
      if (bookings.tryCatchError) return next(bookings.result);
      return next(createError(bookings.status, bookings.message));
    }

    const countries = await getCountries();

    if (countries.error) {
      if (countries.tryCatchError) return next(countries.result);
      return next(createError(countries.status, countries.message));
    }

    return res.render('profile', {
      details: details.result[0],
      bookings: bookings.result,
      countries: countries.result,
    });
  } catch (err) {
    return next(err);
  }
});

router.post('/edit/personal', permit({ roles: 'USER' }), async (req, res, next) => {
  const { body } = req;
  body.country = body.country || null;

  try {
    const response = await updateUserDetails({ customerID: req.user.id, ...body });

    if (response.error && response.tryCatchError) return next(response.result);

    res.flash(response.error ? 'error' : 'success', response.message);
    return res.redirect('/user/profile');
  } catch (err) {
    return next(err);
  }
});

router.post('/edit/password', permit({ roles: 'USER' }), async (req, res, next) => {
  const { body } = req;

  try {
    const response = await updateUserPassword({ args: { customerID: req.user.id, ...body } });

    if (response.error) {
      if (response.tryCatchError) return next(response.result);

      res.flash('error', response.message);
      return res.redirect('/user/profile');
    }

    return req.session.destroy((err) => {
      if (err) return next(err);

      req.logout();
      return res.redirect('/user/sign-in');
    });
  } catch (err) {
    return next(err);
  }
});

router.post('/delete', permit({ roles: 'USER' }), async (req, res, next) => {
  try {
    const response = await removeUser({ customerID: req.user.id, ...req.body });

    if (response.error) {
      if (response.tryCatchError) return next(response.result);

      res.flash('error', response.message);
      return res.redirect('/user/profile');
    }

    return res.redirect('/user/sign-out');
  } catch (err) {
    return next(err);
  }
});

if (useMailgun) {
  router.get('/forgot-password', (req, res, next) => {
    return res.render('forgot-password');
  });

  router.post('/forgot-password', async (req, res, next) => {
    const { email } = req.body;

    try {
      let response = await getUserDetails({ args: { email }, byID: false, byEmail: true, partial: true });

      if (response.error) {
        if (response.tryCatchError) return next(response.result);

        if (response.status === 400) {
          res.flash('error', response.message);
          return res.redirect('/user/forgot-password');
        }

        return next(createError(response.status, response.message));
      }

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
    } catch (err) {
      return next(err);
    }
  });

  router.get('/account/reset-password', validate('validateToken'), async (req, res, next) => {
    const { token } = req.query;

    try {
      const response = await verifyToken({ token, type: 'password' });

      if (response.error) {
        if (response.tryCatchError) return next(response.result);

        res.flash('error', response.message);
        return res.redirect('/user/sign-in');
      }

      return res.render('reset-password', { customerID: response.result[0].id });
    } catch (err) {
      return next(err);
    }
  });

  router.post('/account/reset-password', async (req, res, next) => {
    const { body } = req;
    const { token } = req.query;
    const route = `/user/reset-password?token=${token}`;

    try {
      let response = await getUserDetails({ args: { customerID: body.customerID }, partial: true });

      if (response.error) {
        if (response.tryCatchError) return next(response.result);

        if (response.status === 400) {
          res.flash('error', response.message);
          return res.redirect('/user/sign-in');
        }

        return next(createError(response.status, response.message));
      }

      const data = response.result[0];

      response = await updateUserPassword({ args: body, matchPasswords: false, expireToken: true });

      if (response.error) {
        if (response.tryCatchError) return next(response.result);

        res.flash('error', response.message);
        return res.redirect(route);
      }

      const args = {
        url: req.getUrl(),
        recipient: `${data.firstName} ${data.lastName} <${data.email}>`,
      };

      await mailgun.sendChangedPassword(args);

      res.flash('success', response.message);
      return res.redirect('/user/sign-in');
    } catch (err) {
      return next(err);
    }
  });

  router.get('/account/verify', validate('validateToken'), async (req, res, next) => {
    const { token } = req.query;
    const route = `/user/${req.isAuthenticated() ? 'profile' : 'sign-in'}`;

    try {
      let response = await verifyToken({ token });

      if (response.error) {
        if (response.tryCatchError) return next(response.result);

        res.flash('error', response.message);
        return res.redirect(route);
      }

      const customerID = response.result[0].id;

      response = await updateUserStatus(customerID);

      if (response.error) {
        if (response.tryCatchError) return next(response.result);

        res.flash('error', response.message);
        return res.redirect(route);
      }

      const { message } = response;

      response = await getUserDetails({ args: { customerID }, partial: true });

      if (response.error) {
        if (response.tryCatchError) return next(response.result);

        if (response.status === 400) {
          res.flash('error', response.message);
          return res.redirect(route);
        }

        return next(createError(response.status, response.message));
      }

      const data = response.result[0];

      const args = {
        url: req.getUrl(),
        recipient: `${data.firstName} ${data.lastName} <${data.email}>`,
      };

      await mailgun.sendWelcome(args);

      res.flash('success', message);
      return res.redirect(route);
    } catch (err) {
      return next(err);
    }
  });

  router.get('/account/verify/resend', validate({ email: 'email' }), async (req, res, next) => {
    const { email } = req.query;
    const route = `/user/${req.isAuthenticated() ? 'profile' : 'sign-in'}`;

    try {
      let response = await getUserDetails({ args: { email }, byID: false, byEmail: true, partial: true });

      if (response.error) {
        if (response.tryCatchError) return next(response.result);
        return next(createError(response.status, response.message));
      }

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
    } catch (err) {
      return next(err);
    }
  });
}

module.exports = router;
