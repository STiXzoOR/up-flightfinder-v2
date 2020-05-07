const express = require('express');
const createError = require('http-errors');
const passport = require('passport');
const {
  permit,
  getCountries,
  getUserDetails,
  insertUser,
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
      return res.status(response.status).render('sign-in', { error: response.message });
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
      return res.status(response.status).render('sign-up', { error: response.message });
    }

    res.flash('success', response.message);
    return res.redirect('/user/sign-in');
  } catch (err) {
    console.log(err);
    return next(err);
  }
});

module.exports = router;
