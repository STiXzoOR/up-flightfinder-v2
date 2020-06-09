const Base = require('./base');

class Common extends Base {
  constructor() {
    super();

    this.queries = {
      airports: 'SELECT city, airport_code as code FROM airport',
      countries: 'SELECT country_code as code, name, nationality from countries',
      destinations:
        'SELECT CASE WHEN ap.airport_code IN ("ATH", "LCA", "SHA") THEN ap.country ELSE ap.city END as name, MIN(f.price) as price FROM FLIGHT as f, AIRPORT as ap WHERE f.dep_date = CURRENT_DATE and ap.airport_code = f.from_airport and f.from_airport in ( "ATH", "LCA", "DME", "HND", "JFK", "LHR", "ORY", "MAD", "SHA" ) GROUP BY ap.city, ap.country, ap.airport_code',
    };
  }

  getAirports() {
    const query = this.queries.airports;
    return this.execute(query, null);
  }

  getCountries() {
    const query = this.queries.countries;
    return this.execute(query, null);
  }

  getPopularDestinations() {
    const query = this.queries.destinations;
    return this.execute(query, null);
  }
}

module.exports = new Common();
