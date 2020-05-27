const express = require('express');
const createError = require('http-errors');
const { validate } = require('../config/superstruct');
const { getAirports, getFlights } = require('../config/requests');
const { compileFile } = require('../config/templates');
const { flightSearchLimiter } = require('../config/rate-limit');

const router = express.Router();
const generateFlightsHTML = compileFile('flight-card');

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

  if (query.filters) {
    parsedQuery.hasFilters = true;
    parsedQuery.filters = JSON.parse(query.filters);
  }

  return parsedQuery;
}

function generateConditions(query) {
  const data = {};

  data.WHERE =
    'al.airline_code=f.airline and ap.airplane_model=f.airplane and aprt1.airport_code=f.from_airport and aprt2.airport_code=f.to_airport and f.from_airport=:from and f.to_airport=:to and f.dep_date=:departDate and f.dep_date >= CURRENT_DATE and IF(f.dep_date=CURRENT_DATE, f.dep_time>=CURRENT_TIME, 1) and f.occupied_capacity <= (ap.capacity-:quantity) and f.class=:class and f.status="UPCOMING"';

  data.ORDER = 'totalPrice';
  data.LIMIT = `${(query.filters && query.filters.skip) || 0},5`;

  data.args = {
    from: query.from,
    to: query.to,
    departDate: query.dates,
    quantity: query.passengers.total,
    class: query.class,
    hasFilters: query.hasFilters,
  };

  if (query.isRoundtrip) {
    data.args = {
      ...data.args,
      departDate: query.dates.from,
      returnDate: query.dates.to,
    };

    data.WHERE =
      'al1.airline_code=f1.airline and ap1.airplane_model=f1.airplane and aprt1.airport_code=f1.from_airport and aprt2.airport_code=f1.to_airport and f1.from_airport=:from and f1.to_airport=:to and f1.dep_date=:departDate and f1.dep_date >= CURRENT_DATE and IF(f1.dep_date=CURRENT_DATE, f1.dep_time>=CURRENT_TIME, 1) and f1.occupied_capacity <= (ap1.capacity-:quantity) and f1.class=:class and f1.status="UPCOMING" and al2.airline_code=f2.airline and ap2.airplane_model=f2.airplane and aprt3.airport_code=f2.from_airport and aprt4.airport_code=f2.to_airport and f2.from_airport=:to and f2.to_airport=:from and f2.dep_date=:returnDate and f2.occupied_capacity <= (ap2.capacity-:quantity) and f2.class=:class and f2.status="UPCOMING"';

    if (query.dates.from === query.dates.to) {
      data.WHERE += ' and f2.dep_time>=ADDTIME(f1.arr_time, "05:00:00")';
      data.WHERE += ' and f1.arr_date=f1.dep_date';
    }
  }

  if (query.hasFilters) {
    const { filters } = query;
    data.getAirlines = false;

    if (filters.orderBy) {
      data.ORDER = `${filters.orderBy}`;
    }

    if (filters.skip || filters.limit) {
      data.LIMIT = ':skip,:limit';
      data.args.skip = filters.skip;
      data.args.limit = filters.limit;
    }

    if (filters.priceRange) {
      data.WHERE += ` and ((${
        query.isRoundtrip ? 'f1.price+f2.price+f1.taxes+f2.taxes' : 'f.price+f.taxes'
      })*:quantity) BETWEEN :minPrice AND :maxPrice`;
      data.args.minPrice = filters.priceRange.from;
      data.args.maxPrice = filters.priceRange.to;
    }

    if (filters.departTimeRange) {
      data.WHERE += ` and f${query.isRoundtrip ? 1 : ''}.dep_time BETWEEN :minDepartTime AND :maxDepartTime`;
      data.args.minDepartTime = filters.departTimeRange.from;
      data.args.maxDepartTime = filters.departTimeRange.to;
    }

    if (filters.returnTimeRange) {
      data.WHERE += ` and f2.dep_time BETWEEN :minReturnTime AND :maxReturnTime`;
      data.args.minReturnTime = filters.returnTimeRange.from;
      data.args.maxReturnTime = filters.returnTimeRange.to;
    }

    if (filters.stops) {
      const stops = filters.stops.toString();

      if (query.isRoundtrip) {
        data.WHERE += ` and IF(f1.stops IN (${stops}) or f2.stops IN (${stops}), 1, 0)`;
      } else {
        data.WHERE += ` and f.stops IN (${stops})`;
      }
    }

    if (filters.airlines) {
      const airlines = filters.airlines.join('", "');

      if (query.isRoundtrip) {
        data.WHERE += ` and IF(al1.airline_name IN ("${airlines}") or al2.airline_name IN ("${airlines}"), 1, 0)`;
      } else {
        data.WHERE += ` and al.airline_name IN ("${airlines}")`;
      }
    }
  }

  return data;
}

router.get('/', (req, res, next) => {
  return next(createError(400));
});

router.get('/search-flights', flightSearchLimiter, validate('searchFlightsQuery'), async (req, res, next) => {
  const query = parseQuery(req.query);

  try {
    const conditions = generateConditions(query);
    let flights = await getFlights({ isRoundtrip: query.isRoundtrip, ...conditions });

    if (flights.error && (flights.tryCatchError || flights.status === 500)) {
      if (flights.tryCatchError) return next(flights.result);
      return next(createError(flights.status, flights.message));
    }

    flights = flights.result;

    const flightsHTML = generateFlightsHTML(
      !flights.isEmpty
        ? {
            query,
            skip: (query.filters && query.filters.skip) || 0,
            flights: { data: flights.data, total: flights.counters.total },
          }
        : { isEmpty: flights.isEmpty }
    );

    if (req.get('X-Custom-Header') === 'FetchMoreFlights') {
      return res.json({
        flights: {
          isEmpty: flights.isEmpty,
          result: flightsHTML,
          total: (!flights.isEmpty && flights.counters.total) || 0,
        },
      });
    }

    const airports = await getAirports();

    if (airports.error) {
      if (airports.tryCatchError) return next(airports.result);
      return next(createError(airports.status, airports.message));
    }

    return res.render('search-flights', {
      query,
      airports: airports.result,
      airlines: flights.airlines,
      flights: { isEmpty: flights.isEmpty, data: flights.counters, html: flightsHTML },
    });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
