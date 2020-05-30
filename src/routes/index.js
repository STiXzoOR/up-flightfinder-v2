const express = require('express');
const routeAsync = require('../config/routeAsync');
const { handleResponseError, getPopularDestinations, getAirports } = require('../config/requests');

const router = express.Router();

router.get(
  '/',
  routeAsync(async (req, res, next) => {
    const airports = await getAirports();
    const destinations = await getPopularDestinations();

    if (airports.error || destinations.error) {
      const response = (airports.error && airports) || destinations;

      return handleResponseError(response)(req, res, next);
    }

    return res.render('index', { airports: airports.result, destinations: destinations.result });
  })
);

module.exports = router;
