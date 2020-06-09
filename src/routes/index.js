const express = require('express');
const routeAsync = require('../middleware/route-async');
const handleResponseError = require('../middleware/handle-response-error');
const Common = require('../controllers/common');

const router = express.Router();

router.get(
  '/',
  routeAsync(async (req, res, next) => {
    const airports = await Common.getAirports();
    const destinations = await Common.getPopularDestinations();

    if (airports.error || destinations.error) {
      const response = (airports.error && airports) || destinations;

      return handleResponseError(response)(req, res, next);
    }

    return res.render('index', { airports: airports.result, destinations: destinations.result });
  })
);

module.exports = router;
