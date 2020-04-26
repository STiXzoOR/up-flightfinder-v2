const express = require('express');
const createError = require('http-errors');
const bcrypt = require('bcrypt');
const passport = require('passport');
const mysql = new (require('../config/mysql'))();

require('../config/passport')(passport);

const router = express.Router();

/* GET users listing. */
router.get('/', (req, res, next) => {
  next(createError(400));
});

router.get('/sign-in', (req, res, next) => {
  res.render('sign-in');
});

router.get('/sign-up', (req, res, next) => {
  res.render('sign-up');
});

router.get('/sign-out', (req, res) => {
  req.session.destroy(() => {
    req.logout();
    res.redirect('/');
  });
});

router.post('/sign-in', (req, res, next) => {
  passport.authenticate('login', (err, response) => {
    if (err) {
      return next(err);
    }

    if (response.error) {
      const error = response.message;
      return res.render('sign-in', { error });
    }

    req.login(response.user, (err) => {
      if (err) {
        return next(err);
      }
      req.session.user = response.user;
      req.session.user.isAuthenticated = req.isAuthenticated();
      return res.redirect('/');
    });
  })(req, res, next);
});

router.post('/sign-up', async (req, res, next) => {
  const data = req.body;
  const response = {
    status: 400,
    error: true,
    message: '',
  };

  const salt = bcrypt.genSaltSync(10);
  const password = bcrypt.hashSync(data.password, salt);

  const userExistsQuery = 'SELECT email FROM customer WHERE email=:email';
  const userInsertQuery =
    'INSERT INTO customer (first_name, last_name, email, password, mobile, gender, joined_date, status, customer_type) VALUES (:firstName, :lastName, :email, :password, :mobile, :gender, NOW(), :status, "USER")';

  await mysql
    .fetch(userExistsQuery, { email: data.email })
    .then((result) => {
      if (result.length !== 0) throw new Error();
      const fields = {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        password,
        mobile: data.mobile,
        gender: data.gender,
        status: 'CONFIRMED',
      };
      return mysql.commit(userInsertQuery, fields);
    })
    .catch(() => {
      response.status = 401;
      response.error = true;
      response.message = 'The user already exists. Please sign in.';
    })
    .then(() => {
      if (response.status === 401) return;
      response.status = 200;
      response.error = false;
      response.message = 'Sign up success. Please sign in.';
    })
    .catch(() => {
      response.status = 500;
      response.error = true;
      response.message = 'Something went wrong while signing you up. Please try again.';
    });

  if (response.error) {
    res.status(response.status).render('sign-up', { error: response.message });
  } else {
    res.flash('success', response.message);
    res.redirect('/user/sign-in');
  }
});

module.exports = router;
