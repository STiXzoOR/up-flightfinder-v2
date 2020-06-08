/* eslint-disable no-param-reassign */
/* eslint-disable consistent-return */
/* eslint-disable block-scoped-var */
/* eslint-disable vars-on-top */
/* eslint-disable no-var */
/* eslint-disable global-require */
const crypto = require('crypto');
const config = require('./dotenv');
const logger = require('./winston');
const mysql = require('./mysql');
if (config.mailgun.enabled) var mailgun = require('./mailgun');

// TODO #1: Replace sendVerificationLink function with class
// TODO #2: Replace everything with Sequelize ORM

const generateToken = () => crypto.randomBytes(40).toString('hex');

const checkBookingExists = async (args = {}, { byID = false, byLastName = true } = {}) => {
  const response = {
    status: 400,
    error: true,
    message: '',
  };

  let query = 'SELECT booking_id FROM booking WHERE booking_id=:bookingID';

  if (byID) {
    query += ' and customer_id=:customerID';
  }

  if (byLastName) {
    query += ' and last_name=:lastName';
  }

  try {
    const data = await mysql.fetchOne(query, args);

    if (data === null) {
      response.status = 500;
      response.error = true;
      response.message = 'Database internal error.';
    } else {
      response.status = 200;
      response.error = false;
      response.result = data.length !== 0;
    }

    return response;
  } catch (err) {
    response.error = true;
    response.tryCatchError = true;
    response.status = err.status;
    response.result = err;
    return response;
  }
};

// TODO: Needs more testing
const checkBookingAlreadyBooked = async (args = {}) => {
  const response = {
    status: 400,
    error: true,
    message: '',
  };

  const queryBooked =
    'SELECT booking_id FROM booking WHERE customer_id=:customerID and depart_flight_id=:flightID and depart_flight_date=:departDate and flight_class=:class';
  const queryCanBook =
    'SELECT IF(f1.arr_date < f2.dep_date or (f1.arr_date >= f2.dep_date and b.status="CANCELED"), 1, 0) as canBook FROM booking as b, flight as f1, flight as f2, (SELECT IF(MAX(return_flight_date) IS NOT NULL, IF(MAX(depart_flight_date) > MAX(return_flight_date), MAX(depart_flight_date), MAX(return_flight_date)), MAX(depart_flight_date)) as max_date FROM booking WHERE customer_id=:customerID) as t WHERE IF(b.return_flight_date IS NOT NULL and b.return_flight_date=t.max_date, (b.return_flight_date=t.max_date and f1.flight_id=b.return_flight_id and f1.dep_date=b.return_flight_date), (b.depart_flight_date=t.max_date and f1.flight_id=b.depart_flight_id and f1.dep_date=b.depart_flight_date)) and f1.class=b.flight_class and b.customer_id=:customerID and f2.flight_id=:flightID and f2.dep_date=:departDate and f2.class=:class';

  try {
    let data = await mysql.fetchOne(queryBooked, args.alreadyBooked || args);

    if (data === null) {
      response.status = 500;
      response.error = true;
      response.message = 'Database internal error.';
    } else {
      response.status = 200;
      response.error = false;
      response.result = data.length === 0;
    }

    if (response.error || data.length === 0) return response;

    data = await mysql.fetchOne(queryCanBook, args.canBook || args);

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
      response.result = data[0].canBook;
    }

    return response;
  } catch (err) {
    response.error = true;
    response.tryCatchError = true;
    response.status = err.status;
    response.result = err;
    return response;
  }
};

const verifyToken = async (token = '', type = 'email') => {
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
    logger.error(err);
    return false;
  }
};

const sendVerificationLink = async (args = {}, type = 'email') => {
  const response = {
    status: 400,
    error: true,
    message: '',
  };

  // eslint-disable-next-line no-shadow
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
      logger.error(err);

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
        logger.error(err);
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
      logger.info(result);
      response.status = 200;
      response.error = false;
      response.message = config[type].messages.success;
    })
    .catch((err) => {
      logger.error(err);
      response.status = 500;
      response.error = true;
      response.message = config[type].messages.error;
    });

  return response;
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
    response.error = true;
    response.tryCatchError = true;
    response.status = err.status;
    response.result = err;
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
    response.error = true;
    response.tryCatchError = true;
    response.status = err.status;
    response.result = err;
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
    response.error = true;
    response.tryCatchError = true;
    response.status = err.status;
    response.result = err;
    return response;
  }
};

const getBooking = async (args = {}, { byID = false, byLastName = true } = {}) => {
  const response = {
    status: 400,
    error: true,
    message: '',
  };

  let query =
    'SELECT booking_id as id, depart_flight_id as departFlightID, depart_flight_date as departDate, return_flight_id as returnFlightID, return_flight_date as returnDate, flight_class as class, DATE_FORMAT(booking_date, "%a, %d %b") as bookedDate, first_name as contactFirstName, last_name as contactLastName, email as contactEmail, mobile as contactMobile, total_passengers as quantity, price_per_passenger as pricePerPassenger, total_price as totalPrice, flight_type as flightType, flight_type = "Roundtrip" as isRoundtrip, status, status = "CANCELED" as isCanceled FROM booking WHERE booking_id=:bookingID';

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
    response.error = true;
    response.tryCatchError = true;
    response.status = err.status;
    response.result = err;
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
    response.error = true;
    response.tryCatchError = true;
    response.status = err.status;
    response.result = err;
    return response;
  }
};

const insertBooking = async (args = {}, { updateFlight = true } = {}) => {
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
      logger.error(err);
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
        logger.error(err);
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
          logger.error(err);
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

    const exists = await checkBookingExists(args, { byID: true });

    if (exists.error) return exists;
    if (exists.result) {
      response.message = 'The booking you are trying to add already exists in your bookings history.';
      return response;
    }

    data[0].customerID = args.customerID;

    return await insertBooking(data[0], { updateFlight: false });
  } catch (err) {
    response.error = true;
    response.tryCatchError = true;
    response.status = err.status;
    response.result = err;
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
      logger.error(err);
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
        logger.error(err);
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
      logger.error(err);
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
      logger.error(err);
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
      logger.error(err);
      response.status = 500;
      response.error = true;
      response.message =
        'Something went wrong while updating your subscription settings. Please contact our support team.';
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
      logger.error(err);
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
    response.error = true;
    response.tryCatchError = true;
    response.status = err.status;
    response.result = err;
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
      logger.error(err);
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
      logger.error(err);
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
        logger.error(err);
        response.status = 500;
        response.error = true;
        response.message = 'Database internal error.';
      });
  }

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
      logger.error(err);
      response.status = 500;
      response.error = true;
      response.message =
        'Something went wrong while unsubscrining you from our newsletter list. Please contact our support team.';
    });

  return response;
};

module.exports = {
  verifyToken,
  sendVerificationLink,
  checkBookingExists,
  checkBookingAlreadyBooked,
  getCountries,
  getPopularDestinations,
  getAirports,
  getBooking,
  getBookingPassengers,
  insertBooking,
  insertUserBooking,
  insertPassenger,
  insertNewsletterSubscriber,
  updateNewsletterSubscriber,
  updateBooking,
  cancelBooking,
  removeNewsletterSubscriber,
};
