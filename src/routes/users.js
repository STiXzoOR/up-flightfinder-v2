const express = require('express');
const createError = require('http-errors');
const passport = require('passport');
const { validate } = require('../config/superstruct');
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
  req.session.destroy(() => {
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

router.post('/sign-up', async (req, res, next) => {
  const { body } = req;
  try {
    let response = await insertUser(body);

    if (response.error) {
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
        res.flash('error', response.message);
        return res.redirect('/user/sign-up');
      }
    }

    res.flash('success', response.message);
    return res.redirect('/user/sign-in');
  } catch (err) {
    console.log(err);
    return next(err);
  }
});

router.get('/profile', permit({ roles: 'USER', requireVerification: false }), async (req, res, next) => {
  const customerID = req.user.id;
  try {
    const details = await getUserDetails({ args: { customerID } });

    if (details.error) {
      return next(createError(details.status));
    }

    const bookings = await getUserBookings(customerID);

    if (bookings.error && bookings.status === 500) {
      return next(createError(bookings.status));
    }

    const countries = await getCountries();

    if (countries.error) {
      return next(createError(countries.status));
    }

    return res.render('profile', {
      details: details.result[0],
      bookings: bookings.result,
      countries: countries.result,
    });
  } catch (err) {
    console.log(err);
    return next(createError(err));
  }
});

router.post('/edit/personal', permit({ roles: 'USER' }), async (req, res, next) => {
  const { body } = req;
  body.country = body.country || null;

  try {
    const response = await updateUserDetails({ customerID: req.user.id, ...body });

    res.flash(response.error ? 'error' : 'success', response.message);
    return res.redirect('/user/profile');
  } catch (err) {
    return next(createError(err));
  }
});

router.post('/edit/password', permit({ roles: 'USER' }), async (req, res, next) => {
  const { body } = req;

  try {
    const response = await updateUserPassword({ customerID: req.user.id, ...body });

    if (response.error) {
      res.flash('error', response.message);
      return res.redirect('/user/profile');
    }

    return req.session.destroy(() => {
      req.logout();
      return res.redirect('/user/sign-in');
    });
  } catch (err) {
    console.log(err);
    return next(err);
  }
});

router.post('/delete', permit({ roles: 'USER' }), async (req, res, next) => {
  try {
    const response = await removeUser({ customerID: req.user.id, ...req.body });

    if (response.error) {
      res.flash('error', response.message);
      return res.redirect('/user/profile');
    }

    return req.session.destroy(() => {
      req.logout();
      return res.redirect('/');
    });
  } catch (err) {
    console.log(err);
    return next(createError(err));
  }
});

if (useMailgun) {
  router.get('/account/verify', validate('validateToken'), async (req, res, next) => {
    const { token } = req.query;
    const route = `/user/${req.isAuthenticated() ? 'profile' : 'sign-in'}`;

    try {
      let response = await verifyToken({ token });

      if (response.error) {
        res.flash('error', response.message);
        return res.redirect(route);
      }

      const customerID = response.result[0].id;

      response = await updateUserStatus(customerID);

      if (response.error) {
        res.flash('error', response.message);
        return res.redirect(route);
      }

      const { message } = response;

      response = await getUserDetails({ args: { customerID }, partial: true });

      if (response.error) {
        if (response.status === 400 && typeof response.message === 'string') {
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
      console.log(err);
      return next(err);
    }
  });

  router.get('/account/verify/resend', validate({ email: 'email' }), async (req, res, next) => {
    const { email } = req.query;
    const route = `/user/${req.isAuthenticated() ? 'profile' : 'sign-in'}`;

    try {
      let response = await getUserDetails({ args: { email }, byID: false, byEmail: true, partial: true });

      if (response.error) {
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

      res.flash(response.error ? 'error' : 'success', response.message);
      return res.redirect(route);
    } catch (err) {
      console.log(err);
      return next(err);
    }
  });
}

module.exports = router;
