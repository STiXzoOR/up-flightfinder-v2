const express = require('express');
const createError = require('http-errors');

const router = express.Router();

router.get('/', (req, res, next) => {
  return next(createError(400));
});

router.get('/about-us', (req, res, next) => {
  return res.render('about-us');
});

router.get('/contact-us', (req, res, next) => {
  return res.render('contact-us');
});

router.get('/terms-and-conditions', (req, res, next) => {
  return res.render('terms-and-conditions');
});

router.get('/privacy-policy', (req, res, next) => {
  return res.render('privacy-policy');
});

module.exports = router;
