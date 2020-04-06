const express = require('express');

const router = express.Router();

router.get('/', (req, res, next) => {
  res.send('respond with a resource');
});

router.get('/manage-booking', (req, res, next) => {
  res.render('manage-booking');
});

module.exports = router;
