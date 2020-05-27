const express = require('express');
const createError = require('http-errors');
const { getPopularDestinations, getAirports } = require('../config/requests');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const airports = await getAirports();
    const destinations = await getPopularDestinations();

    if (airports.error || destinations.error) {
      const response = (airports.error && airports) || destinations;

      if (response.tryCatchError) return next(response.result);
      return next(createError(response.status, response.message));
    }

    return res.render('index', { airports: airports.result, destinations: destinations.result });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
