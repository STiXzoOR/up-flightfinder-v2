const mysql = new (require('./mysql'))();

const getPopularDestinations = async () => {
  const response = {
    status: 400,
    error: true,
    message: '',
  };

  const query =
    'SELECT CASE WHEN ap.airport_code IN ("ATH", "LCA", "SHA") THEN ap.country ELSE ap.city END as name, MIN(f.price) as price FROM FLIGHT as f, AIRPORT as ap WHERE f.dep_date = CURRENT_DATE and ap.airport_code = f.from_airport and f.from_airport in ( "ATH", "LCA", "DME", "HND", "JFK", "LHR", "ORY", "MAD", "SHA" ) GROUP BY ap.city, ap.country, ap.airport_code';

  try {
    const data = await mysql.fetch(query, null);

    if (data === null) {
      response.status = 500;
      response.error = true;
      response.message = 'Database internal error.';
    } else if (data.length === 0) {
      response.status = 400;
      response.error = true;
      response.message = 'No results found for the requested query.';
    } else {
      response.status = 200;
      response.error = false;
      response.message = 'Popular destinations retrieved.';
      response.result = data;
    }

    return response;
  } catch (err) {
    return err;
  }
};
const getAirports = async () => {
  const response = {
    status: 400,
    error: true,
    message: '',
  };

  const query = 'SELECT city, airport_code as code FROM airport';

  try {
    const data = await mysql.fetch(query, null);

    if (data === null) {
      response.status = 500;
      response.error = true;
      response.message = 'Database internal error.';
    } else if (data.length === 0) {
      response.status = 400;
      response.error = true;
      response.message = 'No results found for the requested query.';
    } else {
      response.status = 200;
      response.error = false;
      response.message = 'Airports retrieved.';
      response.result = data;
    }

    return response;
  } catch (err) {
    return err;
  }
};

module.exports = {
  getPopularDestinations,
  getAirports,
};
