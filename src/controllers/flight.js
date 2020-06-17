const Base = require('./base');

class Flight extends Base {
  constructor() {
    super();

    this.queries = {
      flights: {
        oneway:
          'SELECT f.flight_id as departFlightID, f.airline as departAirlineCode, al.airline_name as departAirlineName, DATE_FORMAT(f.dep_date, "%a, %d %b") as departDate, f.from_airport as departFromAirport, aprt1.city as departFromCity, aprt1.country as departFromCountry, TIME_FORMAT(f.dep_time, "%H:%i") as departTime, DATE_FORMAT(f.arr_date, "%a, %d %b") as departArrivalDate, f.to_airport as departToAirport, aprt2.city as departToCity, aprt2.country as departToCountry, TIME_FORMAT(f.arr_time, "%H:%i") as departArrivalTime, f.price as departPrice, f.taxes as departTaxes, f.class as departClass, TIME_FORMAT(f.duration, "%hh %im") as departDuration, ap.airplane_name as departAirplaneName, f.taxes as taxes, (f.taxes*:quantity) as totalTaxes, f.price as totalUntaxedFarePrice, (f.price + f.taxes) as totalFarePrice, (f.price*:quantity) as totalUntaxedPrice, ((f.price+f.taxes)*:quantity) as totalPrice FROM flight as f, airline as al, airplane as ap, airport as aprt1, airport as aprt2',
        roundtrip:
          'SELECT f1.flight_id as departFlightID, f1.airline as departAirlineCode, al1.airline_name as departAirlineName, DATE_FORMAT(f1.dep_date, "%a, %d %b") as departDate, f1.from_airport as departFromAirport, aprt1.city as departFromCity, aprt1.country as departFromCountry, TIME_FORMAT(f1.dep_time, "%H:%i") as departTime, DATE_FORMAT(f1.arr_date, "%a, %d %b") as departArrivalDate, f1.to_airport as departToAirport, aprt2.city as departToCity, aprt2.country as departToCountry, TIME_FORMAT(f1.arr_time, "%H:%i") as departArrivalTime, f1.price as departPrice, f1.taxes as departTaxes, f1.class as departClass, TIME_FORMAT(f1.duration, "%hh %im") as departDuration, ap1.airplane_name as departAirplaneName, f2.flight_id as returnFlightID, f2.airline as returnAirlineCode, al2.airline_name as returnAirlineName, DATE_FORMAT(f2.dep_date, "%a, %d %b") as returnDate, f2.from_airport as returnFromAirport, aprt3.city as returnFromCity, aprt3.country as returnFromCountry, TIME_FORMAT(f2.dep_time, "%H:%i") as returnTime, DATE_FORMAT(f2.arr_date, "%a, %d %b") as returnArrivalDate, f2.to_airport as returnToAirport, aprt4.city as returnToCity, aprt4.country as returnToCountry, TIME_FORMAT(f2.arr_time, "%H:%i") as returnArrivalTime, f2.price as returnPrice, f2.taxes as returnTaxes, f2.class as returnClass, TIME_FORMAT(f2.duration, "%hh %im") as returnDuration, ap2.airplane_name as returnAirplaneName, (f1.taxes + f2.taxes) as taxes, ((f1.taxes + f2.taxes)*:quantity) as totalTaxes, (f1.price + f2.price) as totalUntaxedFarePrice, (f1.price + f2.price + f1.taxes + f2.taxes) as totalFarePrice, ((f1.price + f2.price)*:quantity) as totalUntaxedPrice, ((f1.price + f2.price + f1.taxes + f2.taxes)*:quantity) as totalPrice FROM flight as f1, flight as f2, airline as al1, airline as al2, airplane as ap1, airplane as ap2, airport as aprt1, airport as aprt2, airport as aprt3, airport as aprt4',
      },
      airlines: {
        oneway:
          'SELECT DISTINCT al.airline_name as name FROM flight as f, airline as al, airplane as ap, airport as aprt1, airport as aprt2',
        roundtrip:
          'SELECT DISTINCT al3.airline_name as name FROM flight as f1, flight as f2, airline as al1, airline as al2, airline as al3, airplane as ap1, airplane as ap2, airport as aprt1, airport as aprt2, airport as aprt3, airport as aprt4 WHERE al3.airline_name in (al1.airline_name, al2.airline_name)',
      },
      counters: {
        oneway:
          'SELECT COUNT(*) as total, MIN(((f.price+f.taxes)*:quantity)) as minTotalPrice, MAX(((f.price+f.taxes)*:quantity)) as maxTotalPrice, CAST(MIN(f.dep_time) as DATETIME) as minDepartTime, CAST(MAX(f.dep_time) as DATETIME) as maxDepartTime FROM flight as f, airline as al, airplane as ap, airport as aprt1, airport as aprt2',
        roundtrip:
          'SELECT COUNT(*) as total, MIN(((f1.price + f2.price + f1.taxes + f2.taxes)*:quantity)) as minTotalPrice, MAX(((f1.price + f2.price + f1.taxes + f2.taxes)*:quantity)) as maxTotalPrice, CAST(MIN(f1.dep_time) as DATETIME) as minDepartTime, CAST(MAX(f1.dep_time) as DATETIME) as maxDepartTime, CAST(MIN(f2.dep_time) as DATETIME) as minReturnTime, CAST(MAX(f2.dep_time) as DATETIME) as maxReturnTime FROM flight as f1, flight as f2, airline as al1, airline as al2, airplane as ap1, airplane as ap2, airport as aprt1, airport as aprt2, airport as aprt3, airport as aprt4',
      },
    };
  }

  async get(
    args = {},
    {
      WHERE = '',
      HAVING = '',
      ORDER = '',
      LIMIT = '',
      FETCH_ALL = true,
      isRoundtrip = false,
      getAirlines = true,
      getCounters = true,
    } = {}
  ) {
    const type = isRoundtrip ? 'roundtrip' : 'oneway';
    const flightData = { isEmpty: true };
    let query = this.queries.flights[type];
    let countQuery = this.queries.counters[type];
    let airlinesQuery = this.queries.airlines[type];
    let response;

    if (WHERE) {
      countQuery += ` WHERE ${WHERE}`;
      query += ` WHERE ${WHERE}`;
      airlinesQuery += ` ${isRoundtrip ? 'and' : 'WHERE'} ${WHERE}`;
    }

    if (HAVING) {
      countQuery += ` HAVING ${HAVING}`;
      query += ` HAVING ${HAVING}`;
    }

    if (ORDER) query += ` ORDER BY ${ORDER}`;

    if (LIMIT) query += ` LIMIT ${LIMIT}`;

    if (getCounters) {
      response = await this.execute(countQuery, args, 'fetchOne');

      if (!response.result.length) response.result = flightData;
      if (response.error) return response;

      [flightData.counters] = response.result;
    }

    if (getAirlines) {
      response = await this.execute(airlinesQuery, args);

      if (!response.result.length) response.result = flightData;
      if (response.error) return response;

      flightData.airlines = response.result;
    }

    response = await this.execute(query, args, FETCH_ALL ? 'fetch' : 'fetchOne');

    if (!response.error && response.result.length) {
      flightData.isEmpty = false;
      flightData.data = response.result;
    }

    response.result = flightData;
    return response;
  }
}

module.exports = new Flight();
