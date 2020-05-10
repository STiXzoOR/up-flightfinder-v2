const express = require('express');
const createError = require('http-errors');
const passport = require('passport');
const {
  permit,
  getCountries,
  getUserDetails,
  getUserBookings,
  insertUser,
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

router.get('/sign-out', permit('USER'), (req, res) => {
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
        return next(createError(err));
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
  try {
    const response = await insertUser(req.body);

    if (response.error) {
      res.flash('error', response.message);
      return res.redirect('/user/sign-up');
    }

    res.flash('success', response.message);
    return res.redirect('/user/sign-in');
  } catch (err) {
    console.log(err);
    return next(err);
  }
});

router.get('/profile', permit('USER'), async (req, res, next) => {
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

router.post('/edit/personal', permit('USER'), async (req, res, next) => {
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

router.post('/edit/password', permit('USER'), async (req, res, next) => {
  const { body } = req;

  try {
    const response = await updateUserPassword({ customerID: req.user.id, ...body });

    res.flash(response.error ? 'error' : 'success', response.message);
    return res.redirect('/user/profile');
  } catch (err) {
    console.log(err);
    return next(createError(err));
  }
});

router.post('/delete', permit('USER'), async (req, res, next) => {
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

module.exports = router;
