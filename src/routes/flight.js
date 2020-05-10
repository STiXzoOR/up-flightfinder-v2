const express = require('express');
const createError = require('http-errors');
const { validate } = require('../config/superstruct');
const { getAirports, getFlights } = require('../config/requests');

const router = express.Router();

function parseQuery(query) {
  const parsedQuery = {
    type: query.type,
    from: query.fromAirport,
    to: query.toAirport,
    dates: query.flightDates,
    isRoundtrip: query.type === 'RT',
  };

  if (query.type === 'RT') {
    let dates = query.flightDates.split(' - ');
    dates = {
      from: dates[0],
      to: dates.length === 1 ? dates[0] : dates[1],
    };

    parsedQuery.dates = dates;
  }
  const passengersClass = JSON.parse(query.passengersClass);

  parsedQuery.passengers = passengersClass.passengers;
  parsedQuery.class = passengersClass.class;

  return parsedQuery;
}

router.get('/', (req, res, next) => {
  return next(createError(400));
});

router.get('/search-flights', validate('searchFlightsQuery'), async (req, res, next) => {
  const query = parseQuery(req.query);

  try {
    const airports = await getAirports();

    if (airports.error) {
      return next(createError(airports.status));
    }

    let WHERE =
      'al.airline_code=f.airline and ap.airplane_model=f.airplane and aprt1.airport_code=f.from_airport and aprt2.airport_code=f.to_airport and f.from_airport=:from and f.to_airport=:to and f.dep_date=:departDate and f.dep_date >= CURRENT_DATE and IF(f.dep_date=CURRENT_DATE, f.dep_time>=CURRENT_TIME, 1) and f.occupied_capacity <= (ap.capacity-:quantity) and f.class=:class and f.status="UPCOMING"';

    const ORDER = 'totalPrice';

    let args = {
      from: query.from,
      to: query.to,
      departDate: query.dates,
      quantity: query.passengers.total,
      class: query.class,
    };

    if (query.isRoundtrip) {
      args = {
        ...args,
        departDate: query.dates.from,
        returnDate: query.dates.to,
      };

      WHERE =
        'al1.airline_code=f1.airline and ap1.airplane_model=f1.airplane and aprt1.airport_code=f1.from_airport and aprt2.airport_code=f1.to_airport and f1.from_airport=:from and f1.to_airport=:to and f1.dep_date=:departDate and f1.dep_date >= CURRENT_DATE and IF(f1.dep_date=CURRENT_DATE, f1.dep_time>=CURRENT_TIME, 1) and f1.occupied_capacity <= (ap1.capacity-:quantity) and f1.class=:class and f1.status="UPCOMING" and al2.airline_code=f2.airline and ap2.airplane_model=f2.airplane and aprt3.airport_code=f2.from_airport and aprt4.airport_code=f2.to_airport and f2.from_airport=:to and f2.to_airport=:from and f2.dep_date=:returnDate and f2.occupied_capacity <= (ap2.capacity-:quantity) and f2.class=:class and f2.status="UPCOMING"';

      if (query.dates.from === query.dates.to) {
        WHERE += ' and f2.dep_time>=ADDTIME(f1.arr_time, "05:00:00")';
        WHERE += ' and f1.arr_date=f1.dep_date';
      }
    }

    const flights = await getFlights({ isRoundtrip: query.isRoundtrip, args, WHERE, ORDER });

    if (flights.error && flights.status === 500) {
      return next(createError(flights.status));
    }

    const airlines =
      (flights.result &&
        ((array) =>
          array.reduce((accu, obj) => {
            let index = accu.findIndex((item) => item.name === obj.departAirlineName);

            if (index === -1) {
              accu.push({ name: obj.departAirlineName, total: 1 });
            } else {
              accu[index].total += 1;
            }

            if (query.isRoundtrip) {
              index = accu.findIndex((item) => item.name === obj.returnAirlineName);

              if (index === -1) {
                accu.push({ name: obj.returnAirlineName, total: 1 });
              } else {
                accu[index].total += 1;
              }
            }

            return accu;
          }, []))(flights.result)) ||
      [];

    return res.render('search-flights', {
      query,
      airports: airports.result,
      airlines,
      flights: { results: flights.result, total: flights.result ? flights.result.length : 0 },
    });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
