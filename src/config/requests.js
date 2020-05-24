/* eslint-disable vars-on-top */
/* eslint-disable no-var */
/* eslint-disable global-require */
const useMailgun = process.env.MAILGUN_ENABLED;

const createError = require('http-errors');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const mysql = require('./mysql');

if (useMailgun) var mailgun = require('./mailgun');

// TODO #1: Replace sendVerificationLink function with class
// TODO #2: Write checkUserExists standalone function
// TODO #3: Replace everything with Sequelize ORM

const permit = ({ roles = [], requireVerification = true } = {}) => {
  if (typeof roles === 'string') {
    roles = [roles];
  }

  const isAllowed = (role) => roles.includes(role);
  const checkVerification = (verified) => (requireVerification ? verified === 1 : true);

  return (req, res, next) => {
    if (req.user && isAllowed(req.user.role) && checkVerification(req.user.isVerified)) return next();
    return next(createError(403));
  };
};

const generateToken = () => crypto.randomBytes(40).toString('hex');

const checkPasswordMatch = async (args = {}) => {
  const response = {
    status: 400,
    error: true,
    message: '',
  };

  const query = 'SELECT password From customer WHERE customer_id=:customerID';

  try {
    const data = await mysql.fetch(query, { customerID: args.customerID });

    if (data === null) {
      response.status = 500;
      response.error = true;
      response.message = 'Database internal error.';
    } else if (data.length === 0) {
      response.status = 400;
      response.error = true;
      response.message = 'A user with the provided email does not exist. Please sign up.';
    } else if (bcrypt.compareSync(args.currentPassword, data[0].password)) {
      response.status = 200;
      response.error = false;
      response.message = 'Passwords match.';
    } else {
      response.status = 401;
      response.error = true;
      response.message =
        "The provided password doesn't match the one stored in our database. Please validate that your current password is correct.";
    }

    return response;
  } catch (err) {
    console.log(err);
    response.status = 400;
    response.error = true;
    response.message = err;
    return response;
  }
};

const checkBookingExists = async ({ args = {}, byID = false, byLastName = true } = {}) => {
  let query = 'SELECT booking_id FROM booking WHERE booking_id=:bookingID';

  if (byID) {
    query += ' and customer_id=:customerID';
  }

  if (byLastName) {
    query += ' and last_name=:lastName';
  }

  try {
    const data = await mysql.fetchOne(query, args);

    return data.length !== 0;
  } catch (err) {
    console.log(err);
    response.status = 400;
    response.error = true;
    response.message = err;
    return response;
  }
};

const verifyToken = async ({ token = '', type = 'email' } = {}) => {
  const response = {
    status: 400,
    error: true,
    message: '',
  };

  let query = `SELECT customer_id as id FROM customer WHERE ${type}_token=:token and ${type}_token_expire > NOW()`;

  if (type === 'newsletter') {
    query =
      'SELECT email, first_name as firstName, last_name as lastName FROM newsletter WHERE token=:token and token_expire > NOW()';
  }

  try {
    const data = await mysql.fetchOne(query, { token });

    if (data === null) {
      response.status = 500;
      response.error = true;
      response.message = 'Database internal error.';
    } else if (data.length === 0) {
      response.status = 400;
      response.error = true;
      response.message = 'The requested link is invalid or has expired';
    } else {
      response.status = 200;
      response.error = false;
      response.message = 'Token has been verified.';
      response.result = data;
    }

    return response;
  } catch (err) {
    console.log(err);
    return false;
  }
};

const sendVerificationLink = async ({ args = {}, type = 'email' } = {}) => {
  const response = {
    status: 400,
    error: true,
    message: '',
  };

  const config = {
    email: {
      messages: {
        success: `An email to verify your account was sent to: ${args.email}. The link will expire after 1 day. Follow the instructions to complete the sign up process.`,
        error: 'Something went wrong while sending you the verification code. Please contact our support team.',
      },
      tokenDuration: 86400000,
      send: (data) => mailgun.sendVerifyAccount(data),
    },
    password: {
      messages: {
        success: `An email to reset your password was sent to: ${args.email}. The link will expire after 10 minutes. Follow the instructions to enter a new password.`,
        error: 'Something went wrong while sending you the verification code. Please contact our support team.',
      },
      tokenDuration: 600000,
      send: (data) => mailgun.sendResetPassword(data),
    },
    newsletter: {
      messages: {
        success: `An email to verify your subscription was sent to: ${args.email}. The link will expire after 30 minutes.`,
        error: 'Something went wrong while sending you the verification code. Please contact our support team.',
      },
      tokenDuration: 1800000,
      send: (data) => mailgun.sendVerifySubscription(data),
    },
  };

  const isNewsletter = type === 'newsletter';

  let needsUpdate = false;
  let query = `UPDATE customer SET ${type}_token=:token, ${type}_token_expire=:tokenExpire WHERE email=:email`;

  if (isNewsletter) {
    query = `INSERT INTO newsletter (email, first_name, last_name, token, token_expire) VALUES(:email, :firstName, :lastName, :token, :tokenExpire)`;
  }

  const token = generateToken();
  const tokenExpire = new Date(Date.now() + config[type].tokenDuration);

  await mysql
    .commit(query, { email: args.email, firstName: args.firstName, lastName: args.lastName, token, tokenExpire })
    .then(() => {
      response.status = 200;
      response.error = false;
      response.message = 'Verification token was successfully stored.';
    })
    .catch((err) => {
      console.log(err);

      if (isNewsletter) {
        needsUpdate = true;
        return;
      }

      response.status = 500;
      response.error = true;
      response.message = 'Something went wrong while updating your account. Please contact our support team.';
    });

  if (isNewsletter && needsUpdate) {
    query = `UPDATE newsletter SET first_name=:firstName, last_name=:lastName, token=:token, token_expire=:tokenExpire WHERE email=:email`;

    await mysql
      .commit(query, { email: args.email, firstName: args.firstName, lastName: args.lastName, token, tokenExpire })
      .then(() => {
        response.status = 200;
        response.error = false;
        response.message = 'Verification token was successfully stored.';
      })
      .catch((err) => {
        console.log(err);
        response.status = 500;
        response.error = true;
        response.message = 'Something went wrong while updating your account. Please contact our support team.';
      });
  }

  if (response.error) return response;

  const data = {
    url: args.url,
    token,
    recipient: `${args.firstName} ${args.lastName} <${args.email}>`,
  };

  await config[type]
    .send(data)
    .then((result) => {
      console.log(result);
      response.status = 200;
      response.error = false;
      response.message = config[type].messages.success;
    })
    .catch((err) => {
      console.log(err);
      response.status = 500;
      response.error = true;
      response.message = config[type].messages.error;
    });

  return response;
};

const getUserDetails = async ({ args = {}, byID = true, byEmail = false, partial = false } = {}) => {
  const response = {
    status: 400,
    error: true,
    message: '',
  };

  let query = !partial
    ? 'SELECT DISTINCT c.first_name as firstName, c.last_name as lastName, c.email as email, c.gender as gender, c.mobile as mobile, DATE_FORMAT(c.joined_date, "%a, %d %b") as date, c.address_line_1 as addressLine1, c.address_line_2 as addressLine2, c.city as city, c.region as region, IF(c.country IS NOT NULL, cs.name, c.country) as country, c.postal_code as postalCode, c.status = "VERIFIED" as isVerified FROM customer as c, countries as cs WHERE IF(c.country IS NOT NULL, cs.country_code=c.country, 1)'
    : 'SELECT c.customer_id as id, c.first_name as firstName, c.last_name as lastName, c.email as email, c.customer_type as role, c.status = "VERIFIED" as isVerified FROM customer as c WHERE 1';

  if (byID && byEmail) {
    query += ' and c.customer_id=:customerID and c.email=:email';
  } else if (byID) {
    query += ' and c.customer_id=:customerID';
  } else if (byEmail) {
    query += ' and c.email=:email';
  }

  try {
    const data = await mysql.fetch(query, args);

    if (data === null) {
      response.status = 500;
      response.error = true;
      response.message = 'Database internal error.';
    } else if (data.length === 0) {
      response.status = 400;
      response.error = true;
      response.message = 'A user with the provided email does not exist. Please sign up.';
    } else {
      response.status = 200;
      response.error = false;
      response.message = 'User details retrieved.';
      response.result = data;
    }

    return response;
  } catch (err) {
    console.log(err);
    response.status = 400;
    response.error = true;
    response.message = err;
    return response;
  }
};

const getSessionUser = async (args = {}) => {
  let response;

  try {
    response = await getUserDetails({ args, byID: false, byEmail: true, partial: true });

    if (response.error) return response;

    const responsePassword = await checkPasswordMatch({
      customerID: response.result[0].id,
      currentPassword: args.password,
    });

    return !responsePassword.error ? response : responsePassword;
  } catch (err) {
    console.log(err);
    response.status = 400;
    response.error = true;
    response.message = err;
    return response;
  }
};

const getCountries = async () => {
  const response = {
    status: 400,
    error: true,
    message: '',
  };

  const query = 'SELECT country_code as code, name, nationality from countries';

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
      response.message = 'Countries retrieved.';
      response.result = data;
    }

    return response;
  } catch (err) {
    console.log(err);
    response.status = 400;
    response.error = true;
    response.message = err;
    return response;
  }
};

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
    console.log(err);
    response.status = 400;
    response.error = true;
    response.message = err;
    return response;
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
    console.log(err);
    response.status = 400;
    response.error = true;
    response.message = err;
    return response;
  }
};

const getFlights = async ({
  isRoundtrip = false,
  args = {},
  WHERE = '',
  HAVING = '',
  ORDER = '',
  LIMIT = '',
  FETCH_ALL = true,
} = {}) => {
  const response = {
    status: 400,
    error: true,
    message: '',
  };

  let query =
    'SELECT f.flight_id as departFlightID, f.airline as departAirlineCode, al.airline_name as departAirlineName, DATE_FORMAT(f.dep_date, "%a, %d %b") as departDate, f.from_airport as departFromAirport, aprt1.city as departFromCity, aprt1.country as departFromCountry, TIME_FORMAT(f.dep_time, "%H:%i") as departTime, DATE_FORMAT(f.arr_date, "%a, %d %b") as departArrivalDate, f.to_airport as departToAirport, aprt2.city as departToCity, aprt2.country as departToCountry, TIME_FORMAT(f.arr_time, "%H:%i") as departArrivalTime, f.price as departPrice, f.taxes as departTaxes, f.class as departClass, TIME_FORMAT(f.duration, "%hh %im") as departDuration, ap.airplane_name as departAirplaneName, f.taxes as totalTaxes, (f.price + f.taxes) as totalFarePrice, ((f.price+f.taxes)*:quantity) as totalPrice FROM flight as f, airline as al, airplane as ap, airport as aprt1, airport as aprt2';

  let countQuery =
    'SELECT COUNT(*) as total, MIN(((f.price+f.taxes)*:quantity)) as minTotalPrice, MAX(((f.price+f.taxes)*:quantity)) as maxTotalPrice, CAST(MIN(f.dep_time) as DATETIME) as minDepartTime, CAST(MAX(f.dep_time) as DATETIME) as maxDepartTime FROM flight as f, airline as al, airplane as ap, airport as aprt1, airport as aprt2';

  let airlinesQuery =
    'SELECT DISTINCT al.airline_name as name FROM flight as f, airline as al, airplane as ap, airport as aprt1, airport as aprt2';

  if (isRoundtrip) {
    query =
      'SELECT f1.flight_id as departFlightID, f1.airline as departAirlineCode, al1.airline_name as departAirlineName, DATE_FORMAT(f1.dep_date, "%a, %d %b") as departDate, f1.from_airport as departFromAirport, aprt1.city as departFromCity, aprt1.country as departFromCountry, TIME_FORMAT(f1.dep_time, "%H:%i") as departTime, DATE_FORMAT(f1.arr_date, "%a, %d %b") as departArrivalDate, f1.to_airport as departToAirport, aprt2.city as departToCity, aprt2.country as departToCountry, TIME_FORMAT(f1.arr_time, "%H:%i") as departArrivalTime, f1.price as departPrice, f1.taxes as departTaxes, f1.class as departClass, TIME_FORMAT(f1.duration, "%hh %im") as departDuration, ap1.airplane_name as departAirplaneName, f2.flight_id as returnFlightID, f2.airline as returnAirlineCode, al2.airline_name as returnAirlineName, DATE_FORMAT(f2.dep_date, "%a, %d %b") as returnDate, f2.from_airport as returnFromAirport, aprt3.city as returnFromCity, aprt3.country as returnFromCountry, TIME_FORMAT(f2.dep_time, "%H:%i") as returnTime, DATE_FORMAT(f2.arr_date, "%a, %d %b") as returnArrivalDate, f2.to_airport as returnToAirport, aprt4.city as returnToCity, aprt4.country as returnToCountry, TIME_FORMAT(f2.arr_time, "%H:%i") as returnArrivalTime, f2.price as returnPrice, f2.taxes as returnTaxes, f2.class as returnClass, TIME_FORMAT(f2.duration, "%hh %im") as returnDuration, ap2.airplane_name as returnAirplaneName, (f1.taxes + f2.taxes) as totalTaxes, (f1.price + f2.price + f1.taxes + f2.taxes) as totalFarePrice, ((f1.price + f2.price + f1.taxes + f2.taxes)*:quantity) as totalPrice FROM flight as f1, flight as f2, airline as al1, airline as al2, airplane as ap1, airplane as ap2, airport as aprt1, airport as aprt2, airport as aprt3, airport as aprt4';

    countQuery =
      'SELECT COUNT(*) as total, MIN(((f1.price + f2.price + f1.taxes + f2.taxes)*:quantity)) as minTotalPrice, MAX(((f1.price + f2.price + f1.taxes + f2.taxes)*:quantity)) as maxTotalPrice, CAST(MIN(f1.dep_time) as DATETIME) as minDepartTime, CAST(MAX(f1.dep_time) as DATETIME) as maxDepartTime, CAST(MIN(f2.dep_time) as DATETIME) as minReturnTime, CAST(MAX(f2.dep_time) as DATETIME) as maxReturnTime FROM flight as f1, flight as f2, airline as al1, airline as al2, airplane as ap1, airplane as ap2, airport as aprt1, airport as aprt2, airport as aprt3, airport as aprt4';

    airlinesQuery =
      'SELECT DISTINCT al3.airline_name as name FROM flight as f1, flight as f2, airline as al1, airline as al2, airline as al3, airplane as ap1, airplane as ap2, airport as aprt1, airport as aprt2, airport as aprt3, airport as aprt4 WHERE al3.airline_name in (al1.airline_name, al2.airline_name)';
  }

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

  try {
    let data = await mysql.fetchOne(countQuery, args);

    if (data === null) {
      response.status = 500;
      response.error = true;
      response.message = 'Database internal error.';
    } else if (data.length === 0) {
      response.status = 400;
      response.error = true;
      response.message = 'No results found for the requested query.';
      response.result = { isEmpty: true };
    } else {
      response.status = 200;
      response.error = false;
      response.message = 'Counted flights.';
    }

    if (response.error) return response;

    const counters = data[0];

    if (!args.hasFilters) {
      data = await mysql.fetch(airlinesQuery, args);

      if (data === null) {
        response.status = 500;
        response.error = true;
        response.message = 'Database internal error.';
      } else if (data.length === 0) {
        response.status = 400;
        response.error = true;
        response.message = 'No results found for the requested query.';
        response.result = { isEmpty: true };
      } else {
        response.status = 200;
        response.error = false;
        response.message = 'Airlines retrieved.';
      }

      if (response.error) return response;

      var airlines = data;


    }

    data = FETCH_ALL ? await mysql.fetch(query, args) : await mysql.fetchOne(query, args);

    if (data === null) {
      response.status = 500;
      response.error = true;
      response.message = 'Database internal error.';
    } else if (data.length === 0) {
      response.status = 400;
      response.error = true;
      response.message = 'No results found for the requested query.';
      response.result = { isEmpty: true };
    } else {
      response.status = 200;
      response.error = false;
      response.message = 'Flights retrieved.';
      response.result = { isEmpty: false, data, counters, airlines };
    }

    return response;
  } catch (err) {
    console.log(err);
    response.status = 400;
    response.error = true;
    response.message = err;
    return response;
  }
};

const getBooking = async ({ args = {}, byID = false, byLastName = true } = {}) => {
  const response = {
    status: 400,
    error: true,
    message: '',
  };

  let query =
    'SELECT booking_id as id, depart_flight_id as departFlightID, depart_flight_date as departDate, return_flight_id as returnFlightID, return_flight_date as returnDate, flight_class as class, DATE_FORMAT(booking_date, "%a, %d %b") as bookedDate, first_name as contactFirstName, last_name as contactLastName, email as contactEmail, mobile as contactMobile, total_passengers as quantity, price_per_passenger as pricePerPassenger, total_price as totalPrice, flight_type as flightType, status, status = "CANCELED" as isCanceled FROM booking WHERE booking_id=:bookingID';

  if (byID) {
    query += ' and customer_id=:customerID';
  }

  if (byLastName) {
    query += ' and last_name=:lastName';
  }

  try {
    const data = await mysql.fetch(query, args);

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
      response.message = 'Booking retrieved.';
      response.result = data;
    }

    return response;
  } catch (err) {
    console.log(err);
    response.status = 400;
    response.error = true;
    response.message = err;
    return response;
  }
};

const getBookingPassengers = async (bookingID = '') => {
  const response = {
    status: 400,
    error: true,
    message: '',
  };

  const query =
    'SELECT p.passenger_id as id, p.first_name as firstName, p.last_name as lastName, hb.insurance as insurance, hb.chkd_cabin_bag_dep_amount as departCabinBagQuantity, hb.chkd_small_bag_dep_amount as departSmallBagQuantity, hb.chkd_large_bag_dep_amount as departLargeBagQuantity, hb.chkd_cabin_bag_ret_amount as returnCabinBagQuantity, hb.chkd_small_bag_ret_amount as returnSmallBagQuantity, hb.chkd_large_bag_ret_amount as returnLargeBagQuantity, IF(i.price <> 0, i.price, "free") as insurancePrice, IF(b1.price <> 0, b1.price, "free") as cabinBagPrice, b2.price as smallBagPrice, b3.price as largeBagPrice, (b1.price*(hb.chkd_cabin_bag_dep_amount + hb.chkd_cabin_bag_ret_amount) + b2.price*(hb.chkd_small_bag_dep_amount + hb.chkd_small_bag_ret_amount) + b3.price*(hb.chkd_large_bag_dep_amount + hb.chkd_large_bag_ret_amount) + i.price) as totalPaidPrice FROM passenger as p, has_booking as hb, insurance as i, baggage as b1, baggage as b2, baggage as b3 WHERE p.passenger_id=hb.passenger_id and hb.booking_id=:bookingID and i.insurance_id=hb.insurance and b1.bag_id=hb.chkd_cabin_bag_dep and b2.bag_id=hb.chkd_small_bag_dep and b3.bag_id=hb.chkd_large_bag_dep';

  try {
    const data = await mysql.fetch(query, { bookingID });

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
      response.message = 'Passengers retrieved.';
      response.result = data;
    }

    return response;
  } catch (err) {
    console.log(err);
    response.status = 400;
    response.error = true;
    response.message = err;
    return response;
  }
};

const getUserBookings = async (userID = '') => {
  const response = {
    status: 400,
    error: true,
    message: '',
  };

  const query =
    'SELECT b.booking_id as id, b.last_name as lastName, DATE_FORMAT(b.booking_date, "%a, %d %b") as date, b.total_passengers as quantity, b.flight_type <> "Roundtrip" as isRoundtrip, b.status <> "CANCELED" as isCanceled, a1.city as fromCity, a2.city as toCity, DATE_FORMAT(b.depart_flight_date, "%a, %d %b") as departDate FROM booking as b, flight as f, airport as a1, airport as a2 WHERE b.customer_id=:userID and f.flight_id=b.depart_flight_id and f.dep_date=b.depart_flight_date and f.class=b.flight_class and a1.airport_code=f.from_airport and a2.airport_code=f.to_airport ORDER BY departDate DESC';

  try {
    const data = await mysql.fetch(query, { userID });

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
      response.message = 'Bookings retrieved.';
      response.result = data;
    }

    return response;
  } catch (err) {
    console.log(err);
    response.status = 400;
    response.error = true;
    response.message = err;
    return response;
  }
};

const insertUser = async (args = {}) => {
  const response = {
    status: 400,
    error: true,
    message: '',
  };

  const salt = bcrypt.genSaltSync(10);
  const password = bcrypt.hashSync(args.password, salt);

  const userExistsQuery = 'SELECT email FROM customer WHERE email=:email';
  const userInsertQuery =
    'INSERT INTO customer (first_name, last_name, email, password, mobile, gender, joined_date, status, customer_type) VALUES (:firstName, :lastName, :email, :password, :mobile, :gender, NOW(), :status, "USER")';

  try {
    const result = await mysql.fetch(userExistsQuery, { email: args.email });

    if (result.length !== 0) {
      response.status = 401;
      response.error = true;
      response.message = 'A user with the provided email already exists. Please sign in.';
      return response;
    }

    const fields = {
      firstName: args.firstName,
      lastName: args.lastName,
      email: args.email,
      password,
      mobile: args.mobile,
      gender: args.gender,
      status: useMailgun ? 'UNVERIFIED' : 'VERIFIED',
    };

    await mysql
      .commit(userInsertQuery, fields)
      .then(() => {
        response.status = 200;
        response.error = false;
        response.message = 'Sign up was successfull. Please sign in.';
      })
      .catch((err) => {
        console.log(err);
        response.status = 500;
        response.error = true;
        response.message = 'Something went wrong while signing you up. Please contact our support team.';
      });

    return response;
  } catch (err) {
    console.log(err);
    response.status = 400;
    response.error = true;
    response.message = err;
    return response;
  }
};

const insertBooking = async ({ args = {}, updateFlight = true } = {}) => {
  const response = {
    status: 400,
    error: true,
    message: '',
  };

  const queryBooking =
    'INSERT INTO booking (booking_id, customer_id, depart_flight_id, return_flight_id, depart_flight_date, return_flight_date, flight_class, first_name, last_name, email, mobile, booking_date, last_modify_date, total_passengers, total_baggage, price_per_passenger, total_price, payment_type, flight_type, status) VALUES (:bookingID, :customerID, :departFlightID, :returnFlightID, :departDate, :returnDate, :class, :contactFirstName, :contactLastName, :contactEmail, :contactMobile, :bookedDate, :lastModifyDate, :quantity, :baggageQuantity, :pricePerPassenger, :totalPrice, :paymentType, :flightType, :status)';

  await mysql
    .commit(queryBooking, args)
    .then(() => {
      response.status = 200;
      response.error = false;
      response.message = 'Booking inserted.';
    })
    .catch((err) => {
      console.log(err);
      response.status = 500;
      response.error = true;
      response.message = 'Database internal error.';
    });

  if (updateFlight) {
    const queryFlight =
      'UPDATE flight SET occupied_capacity=occupied_capacity+:quantity WHERE flight_id=:flightID and dep_date=:departDate and class=:class';

    await mysql
      .commit(queryFlight, {
        quantity: args.quantity,
        class: args.class,
        flightID: args.departFlightID,
        departDate: args.departDate,
      })
      .then(() => {
        response.status = 200;
        response.error = false;
        response.message = 'Flight updated.';
      })
      .catch((err) => {
        console.log(err);
        response.status = 500;
        response.error = true;
        response.message = 'Database internal error.';
      });

    if (args.flightType === 'Roundtrip') {
      await mysql
        .commit(queryFlight, {
          quantity: args.quantity,
          class: args.class,
          flightID: args.returnFlightID,
          departDate: args.returnDate,
        })
        .then(() => {
          response.status = 200;
          response.error = false;
          response.message = 'Flight updated.';
        })
        .catch((err) => {
          console.log(err);
          response.status = 500;
          response.error = true;
          response.message = 'Database internal error.';
        });
    }
  }

  return response;
};

const insertUserBooking = async (args = {}) => {
  const response = {
    status: 400,
    error: true,
    message: '',
  };

  const queryBooking =
    'SELECT booking_id as bookingID, customer_id as customerID, depart_flight_id as departFlightID, return_flight_id as returnFlightID, depart_flight_date as departDate, return_flight_date as returnDate, flight_class as class, first_name as contactFirstName, last_name as contactLastName, email as contactEmail, mobile as contactMobile, booking_date as bookedDate, last_modify_date as lastModifyDate, total_passengers as quantity, total_baggage as baggageQuantity, price_per_passenger as pricePerPassenger, total_price as totalPrice, payment_type as paymentType, flight_type as flightType, status FROM booking WHERE booking_id=:bookingID and first_name=:firstName and last_name=:lastName';

  try {
    const data = await mysql.fetchOne(queryBooking, args);

    if (data === null) {
      response.status = 500;
      response.error = true;
      response.message = 'Database internal error.';
    } else if (data.length === 0) {
      response.status = 400;
      response.error = true;
      response.message = "The booking you are trying to add doesn't exist.";
    } else {
      response.status = 200;
      response.error = false;
    }

    if (response.error) return response;

    const exists = await checkBookingExists({ args, byID: true });

    if (exists) {
      response.message = 'The booking you are trying to add already exists in your bookings history.';
      return response;
    }

    data[0].customerID = args.customerID;

    return await insertBooking({ args: data[0], updateFlight: false });
  } catch (err) {
    console.log(err);
    response.status = 400;
    response.error = true;
    response.message = err;
    return response;
  }
};

const insertPassenger = async (args = {}) => {
  const response = {
    status: 400,
    error: true,
    message: '',
  };
  let needsUpdate = false;

  const passengerInsertQuery =
    'INSERT INTO passenger (passenger_id, first_name, last_name, date_of_birth, gender, id_type, id_expiration_date, nationality) VALUE (:id, :firstName, :lastName, :dateOfBirth, :gender, :idType, :idExpirationDate, :nationality)';

  const passengerUpdateQuery =
    'UPDATE passenger SET first_name=:firstName, last_name=:lastName, date_of_birth=:dateOfBirth, gender=:gender, id_type=:idType, id_expiration_date=:idExpirationDate, nationality=:nationality WHERE passenger_id=:id';

  const passengerHBQuery =
    'INSERT INTO has_booking (booking_id, passenger_id, insurance, chkd_small_bag_dep_amount, chkd_large_bag_dep_amount, chkd_cabin_bag_ret_amount, chkd_small_bag_ret_amount, chkd_large_bag_ret_amount) VALUE (:bookingID, :id, :insurance, :departSmallBag, :departLargeBag, :returnCabinBag, :returnSmallBag, :returnLargeBag)';

  await mysql
    .commit(passengerInsertQuery, args)
    .then(() => {
      response.status = 200;
      response.error = false;
      response.message = 'Passenger inserted.';
    })
    .catch((err) => {
      console.log(err);
      needsUpdate = true;
    });

  if (needsUpdate) {
    await mysql
      .commit(passengerUpdateQuery, args)
      .then(() => {
        response.status = 200;
        response.error = false;
        response.message = 'Passenger details updated.';
      })
      .catch((err) => {
        console.log(err);
      });
  }

  await mysql
    .commit(passengerHBQuery, args)
    .then(() => {
      response.status = 200;
      response.error = false;
      response.message = 'Passenger assigned with the corresponding booking.';
    })
    .catch((err) => {
      console.log(err);
      response.status = 500;
      response.error = true;
      response.message = 'Database internal error.';
    });

  return response;
};

const updateBooking = async (args = {}) => {
  const response = {
    status: 400,
    error: true,
    message: '',
  };

  const query =
    'UPDATE booking SET first_name=:contactFirstName, last_name=:contactLastName, email=:contactEmail, mobile=:contactMobile, last_modify_date=NOW() WHERE booking_id=:bookingID and last_name=:lastName';

  await mysql
    .commit(query, args)
    .then(() => {
      response.status = 200;
      response.error = false;
      response.message = 'Booking updated successfully. Navigate to passengers & contact to see the changes.';
    })
    .catch((err) => {
      console.log(err);
      response.status = 500;
      response.error = true;
      response.message = 'Something went wrong while updating your booking. Please contact our support team.';
    });

  return response;
};

const insertNewsletterSubscriber = async (args = {}) => {
  const response = {
    status: 400,
    error: true,
    message: '',
  };

  const query = 'UPDATE newsletter SET token=NULL, token_expire=NULL WHERE email=:email';

  await mysql
    .commit(query, { email: args.email })
    .then(() => {
      response.status = 200;
      response.error = false;
      response.message = `Thank you for subscribing. You will receive the latest news and offers to: ${args.email}.`;

      return mailgun.addMember('newsletter', args);
    })
    .catch((err) => {
      console.log(err);
      response.status = 500;
      response.error = true;
      response.message =
        'Something went wrong while updating your subscription settings. Please contact our support team.';
    });

  return response;
};

const updateUserStatus = async (customerID) => {
  const response = {
    status: 400,
    error: true,
    message: '',
  };

  const query =
    'UPDATE customer SET status="VERIFIED", email_token=NULL, email_token_expire=NULL WHERE customer_id=:customerID';

  await mysql
    .commit(query, { customerID })
    .then(() => {
      response.status = 200;
      response.error = false;
      response.message = 'Your account has been successfully verified.';
    })
    .catch((err) => {
      console.log(err);
      response.status = 500;
      response.error = true;
      response.message = 'Something went wrong while updating your status. Please contact our support team.';
    });

  return response;
};

const updateUserDetails = async (args = {}) => {
  const response = {
    status: 400,
    error: true,
    message: '',
  };

  const query =
    'UPDATE customer SET first_name=:firstName, last_name=:lastName, mobile=:mobile, gender=:gender, address_line_1=:addressLine1, address_line_2=:addressLine2, city=:city, region=:region, postal_code=:postal, country=:country WHERE customer_id=:customerID';

  await mysql
    .commit(query, args)
    .then(() => {
      response.status = 200;
      response.error = false;
      response.message = 'Your personal information has been successfully updated.';
    })
    .catch((err) => {
      console.log(err);
      response.status = 500;
      response.error = true;
      response.message =
        'Something went wrong while updating your personal information. Please contact our support team.';
    });

  return response;
};

const updateUserPassword = async ({ args = {}, matchPasswords = true, expireToken = false }) => {
  const response = {
    status: 400,
    error: true,
    message: '',
  };

  if (matchPasswords) {
    const responsePassword = await checkPasswordMatch(args);

    if (responsePassword.error) return responsePassword;
  }

  let query = 'UPDATE customer SET password=:password';

  if (expireToken) {
    query += ', password_token=NULL, password_token_expire=NULL';
  }

  query += ' WHERE customer_id=:customerID';

  const salt = bcrypt.genSaltSync(10);
  const password = bcrypt.hashSync(args.password, salt);

  await mysql
    .commit(query, { ...args, password })
    .then(() => {
      response.status = 200;
      response.error = false;
      response.message = 'Your password has been successfully changed. You can now get back into your account.';
    })
    .catch((err) => {
      console.log(err);
      response.status = 500;
      response.error = true;
      response.message = 'Something went wrong while updating your password. Please contact our support team.';
    });

  return response;
};

const updateNewsletterSubscriber = async (args = {}) => {
  const response = {
    status: 400,
    error: true,
    message: '',
  };

  const query = 'UPDATE newsletter SET first_name=:firstName, last_name=:lastName WHERE email=:email';

  await mysql
    .commit(query, { email: args.email })
    .then(() => {
      response.status = 200;
      response.error = false;
      response.message = `Your subscription details have been successfully updated.`;

      const member = { email: args.email, info: { name: `${args.firstName} ${args.lastName}`.trim() } };
      return mailgun.updateMember('newsletter', member);
    })
    .catch((err) => {
      console.log(err);
      response.status = 500;
      response.error = true;
      response.message =
        'Something went wrong while updating your subscription details. Please contact our support team.';
    });

  return response;
};

const cancelBooking = async (args = {}) => {
  const response = {
    status: 400,
    error: true,
    message: '',
  };

  let booking = {};

  const queryBooking =
    'SELECT depart_flight_id as departFlightID, return_flight_id as returnFlightID, depart_flight_date as departDate, return_flight_date as returnDate, flight_class as class, total_passengers as quantity, flight_type = "Roundtrip" as isRoundtrip, last_name as lastName FROM booking WHERE booking_id=:bookingID and last_name=:lastName';

  try {
    const data = await mysql.fetchOne(queryBooking, args);

    if (data === null) {
      response.status = 500;
      response.error = true;
      response.message = 'Database internal error.';
    } else if (data.length === 0) {
      response.status = 400;
      response.error = true;
      response.message = 'Something went wrong while verifing your last name. Please contact our support team.';
    } else {
      response.status = 200;
      response.error = false;
      response.message = 'Booking retrieved.';
    }

    if (response.error) return response;

    if (args.cancelLastName !== data[0].lastName) {
      response.status = 400;
      response.error = true;
      response.message =
        "The provided last name doesn't match the one stored in our database. Please validate that your last name is correct.";
      return response;
    }

    [booking] = data;
  } catch (err) {
    console.log(err);
    response.status = 400;
    response.error = true;
    response.message = err;
    return response;
  }

  const queryUpdateBooking = 'UPDATE booking SET status="CANCELED" WHERE booking_id=:bookingID and last_name=:lastName';

  await mysql
    .commit(queryUpdateBooking, args)
    .then(() => {
      response.status = 200;
      response.error = false;
      response.message = 'Booking status updated.';
    })
    .catch((err) => {
      console.log(err);
      response.status = 500;
      response.error = true;
      response.message = 'Database internal error.';
    });

  const queryFlight =
    'UPDATE flight SET occupied_capacity=occupied_capacity-:quantity WHERE flight_id=:flightID and dep_date=:departDate and class=:class';

  await mysql
    .commit(queryFlight, {
      quantity: booking.quantity,
      class: booking.class,
      flightID: booking.departFlightID,
      departDate: booking.departDate,
    })
    .then(() => {
      response.status = 200;
      response.error = false;
      response.message = 'Flight updated.';
    })
    .catch((err) => {
      console.log(err);
      response.status = 500;
      response.error = true;
      response.message = 'Database internal error.';
    });

  if (booking.isRoundtrip) {
    await mysql
      .commit(queryFlight, {
        quantity: booking.quantity,
        class: booking.class,
        flightID: booking.returnFlightID,
        departDate: booking.returnDate,
      })
      .then(() => {
        response.status = 200;
        response.error = false;
        response.message = 'Flight updated.';
      })
      .catch((err) => {
        console.log(err);
        response.status = 500;
        response.error = true;
        response.message = 'Database internal error.';
      });
  }

  return response;
};

const removeUser = async (args = {}) => {
  const response = {
    status: 400,
    error: true,
    message: '',
  };

  const responsePassword = await checkPasswordMatch(args);

  if (responsePassword.error) return responsePassword;

  const query = 'DELETE FROM customer WHERE customer_id=:customerID';

  await mysql
    .commit(query, { customerID: args.customerID })
    .then(() => {
      response.status = 200;
      response.error = false;
      response.message = 'Your account has been successfully deleted.';
    })
    .catch((err) => {
      console.log(err);
      response.status = 500;
      response.error = true;
      response.message = 'Something went wrong while deleting your account. Please contact our support team.';
    });

  return response;
};

const removeNewsletterSubscriber = async (email) => {
  const response = {
    status: 400,
    error: true,
    message: '',
  };

  const query = 'DELETE FROM newsletter WHERE email=:email';

  await mysql
    .commit(query, { email })
    .then(() => {
      response.status = 200;
      response.error = false;
      response.message = `You have been unsubscribed from our newsletter list.`;

      return mailgun.removeMember('newsletter', email);
    })
    .catch((err) => {
      console.log(err);
      response.status = 500;
      response.error = true;
      response.message =
        'Something went wrong while unsubscrining you from our newsletter list. Please contact our support team.';
    });

  return response;
};

module.exports = {
  useMailgun,
  permit,
  verifyToken,
  sendVerificationLink,
  checkPasswordMatch,
  checkBookingExists,
  getUserDetails,
  getSessionUser,
  getCountries,
  getPopularDestinations,
  getAirports,
  getFlights,
  getBooking,
  getBookingPassengers,
  getUserBookings,
  insertUser,
  insertBooking,
  insertUserBooking,
  insertPassenger,
  insertNewsletterSubscriber,
  updateUserStatus,
  updateUserDetails,
  updateUserPassword,
  updateNewsletterSubscriber,
  updateBooking,
  cancelBooking,
  removeUser,
  removeNewsletterSubscriber,
};
