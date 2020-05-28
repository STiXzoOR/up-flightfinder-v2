const express = require('express');
const createError = require('http-errors');
const { validate } = require('../config/superstruct');
const {
  handleResponseError,
  permit,
  getCountries,
  getFlights,
  getBooking,
  getBookingPassengers,
  insertBooking,
  insertUserBooking,
  insertPassenger,
  updateBooking,
  cancelBooking,
  checkBookingExists,
  checkBookingAlreadyBooked,
} = require('../config/requests');

const router = express.Router();

router.get('/', (req, res, next) => {
  return next(createError(400));
});

router.post('/add', permit({ roles: 'USER' }), async (req, res, next) => {
  const { body } = req;

  try {
    const response = await insertUserBooking({ customerID: req.user.id, ...body });

    if (response.error && response.tryCatchError) return next(response.result);
    if (!response.error) {
      response.message = 'The booking has been successfully added to your bookings history.';
    }

    res.flash(response.error ? 'error' : 'success', response.message);
    return res.redirect('/user/profile');
  } catch (err) {
    return next(err);
  }
});

router.get('/new-booking', validate('newBookingQuery'), async (req, res, next) => {
  const { query } = req;
  query.isRoundtrip = query.isRoundtrip === 'true';
  query.quantity = parseInt(query.quantity, 10);
  query.passengers = JSON.parse(query.passengers);

  try {
    let response = null;

    if (req.user && req.user.role === 'USER') {
      let args = {
        customerID: req.user.id,
        flightID: query.departFlightID,
        departDate: query.departDate,
        class: query.class,
      };

      if (query.isRoundtrip) {
        args = {
          alreadyBooked: { ...args },
          canBook: { ...args },
        };

        args.canBook.flightID = query.returnFlightID;
        args.canBook.departDate = query.returnDate;
      }

      response = await checkBookingAlreadyBooked(args);

      if (response.error) return handleResponseError(response)(req, res, next);

      if (!response.result) {
        res.flash(
          'error',
          "You can't book this flight route right now as you have recently booked a similar flight route. You can only book a flight route which doesn't overlap with your last booking. Meanwhile you can manage your latest booking below."
        );

        return res.redirect('/user/profile');
      }
    }

    let WHERE =
      'f.flight_id=:departFlightID and f.dep_date=:departDate and f.class=:class and al.airline_code=f.airline and ap.airplane_model=f.airplane and aprt1.airport_code=f.from_airport and aprt2.airport_code=f.to_airport and f.dep_date >= CURRENT_DATE';

    if (query.isRoundtrip) {
      WHERE =
        'f1.flight_id=:departFlightID and f1.dep_date=:departDate and f1.class=:class and f2.flight_id=:returnFlightID and f2.dep_date=:returnDate and f2.class=:class and al1.airline_code=f1.airline and ap1.airplane_model=f1.airplane and aprt1.airport_code=f1.from_airport and aprt2.airport_code=f1.to_airport and al2.airline_code=f2.airline and ap2.airplane_model=f2.airplane and aprt3.airport_code=f2.from_airport and aprt4.airport_code=f2.to_airport and f1.dep_date >= CURRENT_DATE and f2.dep_date >= CURRENT_DATE';
    }

    response = await getFlights({
      isRoundtrip: query.isRoundtrip,
      args: query,
      WHERE,
      getAirlines: false,
      getCounters: false,
      FETCH_ALL: false,
    });

    if (response.error) return handleResponseError(response)(req, res, next);

    const [flight] = response.result.data;
    response = await getCountries();

    if (response.error) return handleResponseError(response)(req, res, next);

    const countries = response.result;
    req.session.flightData = query;

    return res.render('new-booking', { query, flight, countries });
  } catch (err) {
    return next(err);
  }
});

router.post('/new-booking/thank-you', async (req, res, next) => {
  if (req.session.flightData === undefined) {
    return next(createError(400));
  }

  const { flightData } = req.session;
  delete req.session.flightData;

  const bookingData = req.body;
  bookingData.finalPrice = parseInt(bookingData.finalPrice, 10);

  try {
    const passengerInfo = [];
    let bookingID = '';
    let response = true;

    do {
      bookingID = await Math.random().toString(36).toUpperCase().substr(2, 6);
      response = await checkBookingExists({ args: { bookingID }, byLastName: false });

      if (response.error) return handleResponseError(response)(req, res, next);

      response = response.result;
    } while (response);

    for (let i = 0; i < flightData.quantity; i++) {
      const baggage = JSON.parse(bookingData[`checkedBaggagePassenger-${i}`]);
      const passenger = {
        bookingID,
        firstName: bookingData[`firstNamePassenger-${i}`],
        lastName: bookingData[`lastNamePassenger-${i}`],
        dateOfBirth: bookingData[`birthDatePassenger-${i}`],
        gender: bookingData[`genderPassenger-${i}`],
        nationality: bookingData[`nationalityPassenger-${i}`],
        idType: bookingData[`idTypePassenger-${i}`],
        id: bookingData[`idPassenger-${i}`],
        idExpirationDate: bookingData[`idExpirationDatePassenger-${i}`],
        insurance: bookingData[`insurancePassenger-${i}`],
        departSmallBag: baggage.oneway.small,
        departLargeBag: baggage.oneway.large,
        returnCabinBag: 0,
        returnSmallBag: 0,
        returnLargeBag: 0,
      };

      if (flightData.isRoundtrip) {
        passenger.returnCabinBag = baggage.roundtrip.cabin;
        passenger.returnSmallBag = baggage.roundtrip.small;
        passenger.returnLargeBag = baggage.roundtrip.large;
      }

      passengerInfo.push(passenger);
    }

    const bookingDetails = {
      bookingID,
      customerID: req.session.user.id,
      departFlightID: flightData.departFlightID,
      departDate: flightData.departDate,
      returnFlightID: null,
      returnDate: null,
      class: flightData.class,
      contactFirstName: bookingData.contactFirstName,
      contactLastName: bookingData.contactLastName,
      contactEmail: bookingData.contactEmail,
      contactMobile: bookingData.contactMobile,
      bookedDate: new Date(),
      lastModifyDate: new Date(),
      quantity: flightData.quantity,
      baggageQuantity: passengerInfo.reduce(
        (acc, { departSmallBag, departLargeBag, returnSmallBag, returnLargeBag }) =>
          acc + departSmallBag + departLargeBag + returnSmallBag + returnLargeBag,
        0
      ),
      pricePerPassenger: bookingData.finalPrice / flightData.quantity,
      totalPrice: bookingData.finalPrice,
      paymentType: bookingData.paymentType,
      flightType: flightData.isRoundtrip ? 'Roundtrip' : 'Oneway',
      status: 'UPCOMING',
    };

    if (flightData.isRoundtrip) {
      bookingDetails.returnFlightID = flightData.returnFlightID;
      bookingDetails.returnDate = flightData.returnDate;
    }

    response = await insertBooking({ args: bookingDetails });

    if (response.error) return handleResponseError(response)(req, res, next);

    await Promise.all(passengerInfo.map(async (passenger) => insertPassenger(passenger))).catch((err) => {
      return next(err);
    });

    return res.render('new-booking-booked', { booking: { ...flightData, ...bookingDetails } });
  } catch (err) {
    return next(err);
  }
});

router.get('/manage-booking', (req, res) => {
  return res.render('manage-booking');
});

router.post('/manage-booking', async (req, res) => {
  const { bookingID, lastName } = req.body;

  return res.redirect(`/booking/manage-booking/bookingID=${bookingID}&lastName=${lastName}`);
});

router.get('/manage-booking/bookingID=:bookingID&lastName=:lastName', async (req, res, next) => {
  const { bookingID, lastName } = req.params;
  const customerID = req.session.user.id;
  const byID = /(\/user\/profile)/.test(req.get('Referrer'));

  try {
    let response = await checkBookingExists({
      args: { bookingID, customerID, lastName },
      byID,
      byLastName: true,
    });

    if (response.error) return handleResponseError(response)(req, res, next);

    if (!response.result) {
      res.flash(
        'error',
        'We are unable to find the booking reference you provided. Please validate that your information is correct and try again.'
      );
      return res.redirect('/booking/manage-booking');
    }

    response = await getBooking({ args: { bookingID, customerID, lastName }, byID });

    if (response.error) return handleResponseError(response)(req, res, next);

    const [booking] = response.result;

    let WHERE =
      'f.flight_id=:departFlightID and f.dep_date=:departDate and f.class=:class and al.airline_code=f.airline and ap.airplane_model=f.airplane and aprt1.airport_code=f.from_airport and aprt2.airport_code=f.to_airport';

    let args = {
      departFlightID: booking.departFlightID,
      departDate: booking.departDate,
      class: booking.class,
      quantity: booking.quantity,
    };

    if (booking.isRoundtrip) {
      WHERE =
        'f1.flight_id=:departFlightID and f1.dep_date=:departDate and f1.class=:class and f2.flight_id=:returnFlightID and f2.dep_date=:returnDate and f2.class=:class and al1.airline_code=f1.airline and ap1.airplane_model=f1.airplane and aprt1.airport_code=f1.from_airport and aprt2.airport_code=f1.to_airport and al2.airline_code=f2.airline and ap2.airplane_model=f2.airplane and aprt3.airport_code=f2.from_airport and aprt4.airport_code=f2.to_airport';

      args = {
        ...args,
        returnFlightID: booking.returnFlightID,
        returnDate: booking.returnDate,
      };
    }

    response = await getFlights({
      isRoundtrip: booking.isRoundtrip,
      args,
      WHERE,
      getAirlines: false,
      getCounters: false,
      FETCH_ALL: false,
    });

    if (response.error) return handleResponseError(response)(req, res, next);

    const [flight] = response.result.data;
    flight.isRoundtrip = booking.isRoundtrip;

    response = await getBookingPassengers(booking.id);

    if (response.error) return handleResponseError(response)(req, res, next);

    const passengers = response.result;

    return res.render('manage-booking-post', { booking, flight, passengers });
  } catch (err) {
    return next(err);
  }
});

router.post('/manage-booking/bookingID=:bookingID&lastName=:lastName/edit', async (req, res, next) => {
  const { params } = req;
  const { body } = req;

  try {
    const response = await updateBooking({ ...params, ...body });

    if (response.error && response.tryCatchError) return next(response.result);

    res.flash(response.error ? 'error' : 'success', response.message);
    return res.redirect(
      `/booking/manage-booking/bookingID=${params.bookingID}&lastName=${
        response.error ? params.lastName : body.contactLastName
      }`
    );
  } catch (err) {
    return next(err);
  }
});

router.post('/manage-booking/bookingID=:bookingID&lastName=:lastName/cancel', async (req, res, next) => {
  const { params } = req;
  const { body } = req;

  try {
    const response = await cancelBooking({ ...params, ...body });

    if (response.error) {
      if (response.tryCatchError) return next(response.result);
      res.flash('error', response.message);
    }

    return res.redirect(`/booking/manage-booking/bookingID=${params.bookingID}&lastName=${params.lastName}`);
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
