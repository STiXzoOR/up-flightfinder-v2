const express = require('express');
const createError = require('http-errors');

const router = express.Router();

router.get('/', (req, res, next) => {
  return next(createError(400));
});

router.get('/about-us', (req, res) => {
  return res.render('pages/about-us');
});

router.get('/contact-us', (req, res) => {
  return res.render('pages/contact-us');
});

router.get('/terms-and-conditions', (req, res) => {
  return res.render('pages/terms-and-conditions');
});

router.get('/privacy-policy', (req, res) => {
  return res.render('pages/privacy-policy');
});

module.exports = router;
