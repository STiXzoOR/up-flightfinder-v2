const mailgun = require('../config/mailgun');
const Base = require('./base');

class Booking extends Base {
  constructor() {
    super();

    this.queries = {
      exists: 'SELECT booking_id FROM booking WHERE booking_id=:bookingID',
      get: {
        full:
          'SELECT booking_id as bookingID, customer_id as customerID, depart_flight_id as departFlightID, return_flight_id as returnFlightID, depart_flight_date as departDate, return_flight_date as returnDate, flight_class as class, first_name as contactFirstName, last_name as contactLastName, email as contactEmail, mobile as contactMobile, booking_date as bookedDate, last_modify_date as lastModifyDate, total_passengers as quantity, total_baggage as baggageQuantity, price_per_passenger as pricePerPassenger, total_price as totalPrice, payment_type as paymentType, flight_type as flightType, status FROM booking WHERE booking_id=:bookingID and first_name=:firstName and last_name=:lastName',
        partial:
          'SELECT booking_id as id, depart_flight_id as departFlightID, depart_flight_date as departDate, return_flight_id as returnFlightID, return_flight_date as returnDate, flight_class as class, DATE_FORMAT(booking_date, "%a, %d %b") as bookedDate, first_name as contactFirstName, last_name as contactLastName, email as contactEmail, mobile as contactMobile, total_passengers as quantity, price_per_passenger as pricePerPassenger, total_price as totalPrice, flight_type as flightType, flight_type = "Roundtrip" as isRoundtrip, status, status = "CANCELED" as isCanceled FROM booking WHERE booking_id=:bookingID',
        flights:
          'SELECT depart_flight_id as departFlightID, return_flight_id as returnFlightID, depart_flight_date as departDate, return_flight_date as returnDate, flight_class as class, total_passengers as quantity, flight_type = "Roundtrip" as isRoundtrip, last_name as lastName FROM booking WHERE booking_id=:bookingID and last_name=:lastName',
      },
      passengers:
        'SELECT p.passenger_id as id, p.first_name as firstName, p.last_name as lastName, hb.insurance as insurance, hb.chkd_cabin_bag_dep_amount as departCabinBagQuantity, hb.chkd_small_bag_dep_amount as departSmallBagQuantity, hb.chkd_large_bag_dep_amount as departLargeBagQuantity, hb.chkd_cabin_bag_ret_amount as returnCabinBagQuantity, hb.chkd_small_bag_ret_amount as returnSmallBagQuantity, hb.chkd_large_bag_ret_amount as returnLargeBagQuantity, IF(i.price <> 0, i.price, "free") as insurancePrice, IF(b1.price <> 0, b1.price, "free") as cabinBagPrice, b2.price as smallBagPrice, b3.price as largeBagPrice, (b1.price*(hb.chkd_cabin_bag_dep_amount + hb.chkd_cabin_bag_ret_amount) + b2.price*(hb.chkd_small_bag_dep_amount + hb.chkd_small_bag_ret_amount) + b3.price*(hb.chkd_large_bag_dep_amount + hb.chkd_large_bag_ret_amount) + i.price) as totalPaidPrice FROM passenger as p, has_booking as hb, insurance as i, baggage as b1, baggage as b2, baggage as b3 WHERE p.passenger_id=hb.passenger_id and hb.booking_id=:bookingID and i.insurance_id=hb.insurance and b1.bag_id=hb.chkd_cabin_bag_dep and b2.bag_id=hb.chkd_small_bag_dep and b3.bag_id=hb.chkd_large_bag_dep',
      insert: {
        booking:
          'INSERT INTO booking (booking_id, customer_id, depart_flight_id, return_flight_id, depart_flight_date, return_flight_date, flight_class, first_name, last_name, email, mobile, booking_date, last_modify_date, total_passengers, total_baggage, price_per_passenger, total_price, payment_type, flight_type, status) VALUES (:bookingID, :customerID, :departFlightID, :returnFlightID, :departDate, :returnDate, :class, :contactFirstName, :contactLastName, :contactEmail, :contactMobile, :bookedDate, :lastModifyDate, :quantity, :baggageQuantity, :pricePerPassenger, :totalPrice, :paymentType, :flightType, :status)',
        passenger:
          'INSERT INTO passenger (passenger_id, first_name, last_name, date_of_birth, gender, id_type, id_expiration_date, nationality) VALUE (:id, :firstName, :lastName, :dateOfBirth, :gender, :idType, :idExpirationDate, :nationality)',
      },
      update: {
        booking: {
          details:
            'UPDATE booking SET first_name=:contactFirstName, last_name=:contactLastName, email=:contactEmail, mobile=:contactMobile, last_modify_date=NOW() WHERE booking_id=:bookingID and last_name=:lastName',
          status: 'UPDATE booking SET status="CANCELED" WHERE booking_id=:bookingID and last_name=:lastName',
        },
        flight: {
          plus:
            'UPDATE flight SET occupied_capacity=occupied_capacity+:quantity WHERE flight_id=:flightID and dep_date=:departDate and class=:class',
          minus:
            'UPDATE flight SET occupied_capacity=occupied_capacity-:quantity WHERE flight_id=:flightID and dep_date=:departDate and class=:class',
        },
        passenger: {
          details:
            'UPDATE passenger SET first_name=:firstName, last_name=:lastName, date_of_birth=:dateOfBirth, gender=:gender, id_type=:idType, id_expiration_date=:idExpirationDate, nationality=:nationality WHERE passenger_id=:id',
          booking:
            'INSERT INTO has_booking (booking_id, passenger_id, insurance, chkd_small_bag_dep_amount, chkd_large_bag_dep_amount, chkd_cabin_bag_ret_amount, chkd_small_bag_ret_amount, chkd_large_bag_ret_amount) VALUE (:bookingID, :id, :insurance, :departSmallBag, :departLargeBag, :returnCabinBag, :returnSmallBag, :returnLargeBag)',
        },
      },
      canBook: {
        oneway:
          'SELECT IF(f1.arr_date < f2.dep_date or (f1.arr_date >= f2.dep_date and b.status="CANCELED"), 1, 0) as canBook FROM booking as b, flight as f1, flight as f2, (SELECT IF(MAX(return_flight_date) IS NOT NULL, IF(MAX(depart_flight_date) > MAX(return_flight_date), MAX(depart_flight_date), MAX(return_flight_date)), MAX(depart_flight_date)) as max_date FROM booking WHERE customer_id=:customerID) as t WHERE IF(b.return_flight_date IS NOT NULL and b.return_flight_date=t.max_date, (b.return_flight_date=t.max_date and f1.flight_id=b.return_flight_id and f1.dep_date=b.return_flight_date), (b.depart_flight_date=t.max_date and f1.flight_id=b.depart_flight_id and f1.dep_date=b.depart_flight_date)) and f1.class=b.flight_class and b.customer_id=:customerID and f2.flight_id=:departFlightID and f2.dep_date=:departDate and f2.class=:class',
        roundtrip:
          'SELECT IF((f1.arr_date < f2.dep_date or (f1.arr_date >= f2.dep_date and b.status="CANCELED")) and (f1.arr_date < f3.dep_date or (f1.arr_date >= f3.dep_date and b.status="CANCELED")), 1, 0) as canBook FROM booking as b, flight as f1, flight as f2, flight as f3, (SELECT IF(MAX(return_flight_date) IS NOT NULL, IF(MAX(depart_flight_date) > MAX(return_flight_date), MAX(depart_flight_date), MAX(return_flight_date)), MAX(depart_flight_date)) as max_date FROM booking WHERE customer_id=:customerID) as t WHERE IF(b.return_flight_date IS NOT NULL and b.return_flight_date=t.max_date, (b.return_flight_date=t.max_date and f1.flight_id=b.return_flight_id and f1.dep_date=b.return_flight_date), (b.depart_flight_date=t.max_date and f1.flight_id=b.depart_flight_id and f1.dep_date=b.depart_flight_date)) and f1.class=b.flight_class and b.customer_id=:customerID and f2.flight_id=:departFlightID and f2.dep_date=:departDate and f2.class=:class and f3.flight_id=:returnFlightID and f3.dep_date=returnDate and f3.class=:class',
      },
    };

    this.messages = {
      generic: 'Something went wrong. Please contact our support team.',
      exists: {
        general: {
          found: 'Booking found.',
          notFound:
            'We are unable to find the booking reference you provided. Please validate that your information is correct and try again.',
        },
        byLastName: { found: 'Booking found.', notFound: "The booking you are trying to add doesn't exist." },
        byID: {
          found: 'The booking you are trying to add already exists in your bookings history.',
          notFound: 'Booking not found.',
        },
      },
      update: {
        booking: {
          success: 'Booking updated successfully. Navigate to passengers & contact to see the changes.',
        },
        password: {
          success: 'Your password has been successfully changed. You can now get back into your account.',
        },
      },
      cancel: {
        lastName: {
          noMatch:
            "The provided last name doesn't match the one stored in our database. Please validate that your last name is correct.",
        },
      },
      canBook: {
        error:
          "You can't book this flight route right now as you have recently booked a similar flight route. You can only book a flight route which doesn't overlap with your last booking. Meanwhile you can manage your latest booking below.",
      },
    };
  }

  async exists(args = {}, { byID = false, byLastName = false, checkingFor = 'general' } = {}) {
    let query = this.queries.exists;
    if (byID) query += ' and customer_id=:customerID';
    if (byLastName) query += ' and last_name=:lastName';

    const response = await this.execute(query, args, 'fetchOne');
    if (response.tryCatchError || response.status === 500) return response;

    const found = response.result.length !== 0;
    let message = this.messages.exists.general;

    if (checkingFor === 'insert') {
      if (byID && !byLastName) message = this.messages.exists.byID;
      else if (byLastName && !byID) message = this.messages.exists.byLastName;
    }
    message = message[found ? 'found' : 'notFound'];

    response.error = false;
    response.message = message;
    response.result = found;

    return response;
  }

  async get(args = {}, { byID = false, byLastName = false } = {}) {
    let query = this.queries.get.partial;
    if (byID) query += ' and customer_id=:customerID';
    if (byLastName) query += ' and last_name=:lastName';

    return this.execute(query, args);
  }

  async insert(args = {}, { updateFlight = true } = {}) {
    const query = this.queries.insert.booking;

    let response = await this.execute(query, args, 'commit');
    if (updateFlight) response = await this.updateFlight({ ...args, isRoundtrip: args.flightType === 'Roundtrip' });

    return response;
  }

  async update(args = {}) {
    const query = this.queries.update.booking.details;
    const response = await this.execute(query, args, 'commit');
    response.message = response.error ? this.messages.generic : this.messages.update.booking.success;

    return response;
  }

  async cancel(args = {}) {
    let booking = {};
    let query = this.queries.get.flights;
    let response = await this.execute(query, args, 'fetchOne');

    if (response.error) {
      response.message = this.messages.generic;
      return response;
    }

    if (args.cancelLastName !== response.result[0].lastName) {
      response.status = 400;
      response.error = true;
      response.message = this.messages.cancel.lastName.noMatch;
      return response;
    }

    [booking] = response.result;
    query = this.queries.update.booking.status;
    response = await this.execute(query, args, 'commit');

    if (response.error) {
      response.message = this.messages.generic;
      return response;
    }

    response = await this.updateFlight(booking, 'minus');
    return response;
  }

  async getPassengers(bookingID = '') {
    const query = this.queries.passengers;
    return this.execute(query, { bookingID });
  }

  async insertPassenger(args = {}) {
    let needsUpdate = false;
    let query = this.queries.insert.passenger;
    let response = await this.execute(query, args, 'commit');

    if (response.error) {
      if (!response.tryCatchError || (response.tryCatchError && response.result.errno !== 1062)) return response;
      needsUpdate = true;
    }

    if (needsUpdate) {
      query = this.queries.update.passenger.details;
      response = await this.execute(query, args, 'commit');
      if (response.error) return response;
    }

    query = this.queries.update.passenger.booking;
    response = await this.execute(query, args, 'commit');

    return response;
  }

  async updateFlight(args = {}, type = 'plus') {
    const query = this.queries.update.flight[type];
    const fields = {
      quantity: args.quantity,
      class: args.class,
      flightID: args.departFlightID,
      departDate: args.departDate,
    };

    let response = await this.execute(query, fields, 'commit');

    if (args.isRoundtrip) {
      fields.flightID = args.returnFlightID;
      fields.departDate = args.returnDate;
      response = await this.execute(query, fields, 'commit');
    }

    return response;
  }

  async addUserBooking(args = {}) {
    const query = this.queries.get.full;

    let response = await this.exists(args, { byLastName: true, checkingFor: 'insert' });
    if (response.error || !response.result) {
      response.error = true;
      return response;
    }

    response = await this.execute(query, args, 'fetchOne');
    if (response.error) return response;

    const [data] = response.result;
    data.customerID = args.customerID;

    response = await this.exists(args, { byID: true, checkingFor: 'insert' });
    if (response.error || response.result) {
      response.error = true;
      return response;
    }

    return this.insert(data, { updateFlight: false });
  }

  async canBook(args = {}) {
    const query = this.queries.canBook[args.isRoundtrip ? 'roundtrip' : 'oneway'];
    const response = await this.execute(query, args, 'fetchOne');

    if (response.error) return response;
    response.result = response.result[0].canBook === 1;
    response.message = !response.result ? this.messages.canBook.error : response.message;

    return response;
  }

  async sendConfirmation(data = {}) {
    const response = {
      status: 400,
      error: true,
      message: this.messages.generic,
      result: {},
    };

    // eslint-disable-next-line no-param-reassign
    data.email.recipient = `${data.email.firstName} ${data.email.lastName} <${data.email.address}>`;

    await mailgun
      .sendBookingConfirmation(data)
      .then((result) => {
        response.message = 'success.';
        response.error = false;
        response.result = result;
      })
      .catch((error) => {
        response.error = true;
        response.tryCatchError = true;
        response.status = error.statusCode || error.status || 500;
        response.result = error;
      });

    return response;
  }
}

module.exports = new Booking();
