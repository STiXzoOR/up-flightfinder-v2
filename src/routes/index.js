const express = require('express');
const createError = require('http-errors');
const { readFile } = require('fs').promises;
const appRoot = require('app-root-path');
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

router.get('/robots.txt', async (req, res, next) => {
  await readFile(appRoot.resolve('/dist/robots.txt'), 'utf-8')
    .then((content) => {
      res.header('Content-Type', 'text/plain');
      res.status(200).send(content || "found robots.txt but it's empty :(");
    })
    .catch(() => {
      return next(createError(404));
    });
});

module.exports = router;
