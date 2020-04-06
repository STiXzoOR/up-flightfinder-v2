const express = require('express');

const router = express.Router();

/* GET users listing. */
router.get('/', (req, res, next) => {
  res.send('respond with a resource');
});

router.get('/sign-in', (req, res, next) => {
  res.render('sign-in');
});

router.get('/sign-up', (req, res, next) => {
  res.render('sign-up');
});

module.exports = router;
