const createError = require('http-errors');
const bcrypt = require('bcrypt');
const mysql = new (require('./mysql'))();

const permit = (...allowed) => {
  const isAllowed = (role) => allowed.indexOf(role) > -1;

  return (req, res, next) => {
    if (req.user && isAllowed(req.user.role)) return next();
    return next(createError(403));
  };
};

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
    return err;
  }
};

const checkBookingExists = async ({ args = {}, byID = false, byLastName = true } = {}) => {
  let found = false;

  let query = 'SELECT booking_id FROM booking WHERE booking_id=:bookingID';

  if (byID) {
    query += ' and customer_id=:customerID';
  }

  if (byLastName) {
    query += ' and last_name=:lastName';
  }

  try {
    const data = await mysql.fetchOne(query, args);

    if (data.length !== 0) {
      found = true;
    }

    return found;
  } catch (err) {
    return err;
  }
};

const getUserDetails = async ({ args = {}, byID = true, byEmail = false, partial = false } = {}) => {
  const response = {
    status: 400,
    error: true,
    message: '',
  };

  let query = !partial
    ? 'SELECT DISTINCT c.first_name as firstName, c.last_name as lastName, c.email as email, c.gender as gender, c.mobile as mobile, DATE_FORMAT(c.joined_date, "%a, %d %b") as date, c.address_line_1 as addressLine1, c.address_line_2 as addressLine2, c.city as city, c.region as region, IF(c.country IS NOT NULL, cs.name, c.country) as country, c.postal_code as postalCode, c.status <> "VERIFIED" as isVerified FROM customer as c, countries as cs WHERE IF(c.country IS NOT NULL, cs.country_code=c.country, 1)'
    : 'SELECT c.customer_id as id, c.first_name as firstName, c.last_name as lastName, c.customer_type as role FROM customer as c WHERE 1';

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
    return err;
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
    return err;
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
    return err;
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

const getFlights = async ({
  isRoundtrip = false,
  args = {},
  WHERE = '',
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

  if (isRoundtrip) {
    query =
      'SELECT f1.flight_id as departFlightID, f1.airline as departAirlineCode, al1.airline_name as departAirlineName, DATE_FORMAT(f1.dep_date, "%a, %d %b") as departDate, f1.from_airport as departFromAirport, aprt1.city as departFromCity, aprt1.country as departFromCountry, TIME_FORMAT(f1.dep_time, "%H:%i") as departTime, DATE_FORMAT(f1.arr_date, "%a, %d %b") as departArrivalDate, f1.to_airport as departToAirport, aprt2.city as departToCity, aprt2.country as departToCountry, TIME_FORMAT(f1.arr_time, "%H:%i") as departArrivalTime, f1.price as departPrice, f1.taxes as departTaxes, f1.class as departClass, TIME_FORMAT(f1.duration, "%hh %im") as departDuration, ap1.airplane_name as departAirplaneName, f2.flight_id as returnFlightID, f2.airline as returnAirlineCode, al2.airline_name as returnAirlineName, DATE_FORMAT(f2.dep_date, "%a, %d %b") as returnDate, f2.from_airport as returnFromAirport, aprt3.city as returnFromCity, aprt3.country as returnFromCountry, TIME_FORMAT(f2.dep_time, "%H:%i") as returnTime, DATE_FORMAT(f2.arr_date, "%a, %d %b") as returnArrivalDate, f2.to_airport as returnToAirport, aprt4.city as returnToCity, aprt4.country as returnToCountry, TIME_FORMAT(f2.arr_time, "%H:%i") as returnArrivalTime, f2.price as returnPrice, f2.taxes as returnTaxes, f2.class as returnClass, TIME_FORMAT(f2.duration, "%hh %im") as returnDuration, ap2.airplane_name as returnAirplaneName, (f1.taxes + f2.taxes) as totalTaxes, (f1.price + f2.price + f1.taxes + f2.taxes) as totalFarePrice, ((f1.price + f2.price + f1.taxes + f2.taxes)*:quantity) as totalPrice FROM flight as f1, flight as f2, airline as al1, airline as al2, airplane as ap1, airplane as ap2, airport as aprt1, airport as aprt2, airport as aprt3, airport as aprt4';
  }

  if (WHERE) query += ` WHERE ${WHERE}`;

  if (ORDER) query += ` ORDER BY ${ORDER}`;

  if (LIMIT) query += ` LIMIT ${LIMIT}`;

  try {
    const data = FETCH_ALL ? await mysql.fetch(query, args) : await mysql.fetchOne(query, args);

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
      response.message = 'Flights retrieved.';
      response.result = data;
    }

    return response;
  } catch (err) {
    return err;
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
    return err;
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
    return err;
  }
};

const insertUser = async (data) => {
  const response = {
    status: 400,
    error: true,
    message: '',
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
      status: 'VERIFIED',
    };

    await mysql
      .commit(userInsertQuery, fields)
      .then(() => {
        response.status = 200;
        response.error = false;
        response.message = 'Sign up was successfull. Please sign in.';
      })
      .catch(() => {
        response.status = 500;
        response.error = true;
        response.message = 'Something went wrong while signing you up. Please contact our support team.';
      });

    return response;
  } catch (err) {
    return err;
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
    return err;
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
module.exports = {
  permit,
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
  insertUser,
  insertBooking,
  insertPassenger,
  updateBooking,
};
