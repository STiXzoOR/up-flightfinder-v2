const express = require('express');
const createError = require('http-errors');
const Common = require('../controllers/common');
const Flight = require('../controllers/flight');
const Booking = require('../controllers/booking');
const routeAsync = require('../middleware/route-async');
const handleResponseError = require('../middleware/handle-response-error');
const permit = require('../middleware/permit');
const { validate } = require('../middleware/superstruct');

const router = express.Router();

router.get('/', (req, res, next) => {
  return next(createError(400));
});

router.post(
  '/add',
  permit('USER'),
  routeAsync(async (req, res, next) => {
    const { body } = req;
    const response = await Booking.addUserBooking({ userID: req.user.id, ...body });

    if (response.error && response.tryCatchError) return next(response.result);
    if (!response.error) {
      response.message = 'The booking has been successfully added to your bookings history.';
    }

    res.flash(response.error ? 'error' : 'success', response.message);
    return res.redirect('/user/profile');
  })
);

router.get(
  '/new-booking',
  validate('newBookingQuery'),
  routeAsync(async (req, res, next) => {
    const { query } = req;
    query.isRoundtrip = query.isRoundtrip === 'true';
    query.quantity = parseInt(query.quantity, 10);
    query.passengers = JSON.parse(query.passengers);

    let response;

    if (req.user && req.user.role === 'USER') {
      const args = {
        userID: req.user.id,
        departFlightID: query.departFlightID,
        departDate: query.departDate,
        class: query.class,
      };

      if (query.isRoundtrip) {
        args.returnFlightID = query.returnFlightID;
        args.returnDate = query.returnDate;
      }

      response = await Booking.canBook(args);
      if (response.error) return handleResponseError(response)(req, res, next);

      if (!response.result) {
        res.flash('error', response.message);
        return res.redirect('/user/profile');
      }
    }

    let WHERE =
      'f.flight_id=:departFlightID and f.dep_date=:departDate and f.class=:class and al.airline_code=f.airline and ap.airplane_model=f.airplane and aprt1.airport_code=f.from_airport and aprt2.airport_code=f.to_airport and f.dep_date >= CURRENT_DATE';

    if (query.isRoundtrip) {
      WHERE =
        'f1.flight_id=:departFlightID and f1.dep_date=:departDate and f1.class=:class and f2.flight_id=:returnFlightID and f2.dep_date=:returnDate and f2.class=:class and al1.airline_code=f1.airline and ap1.airplane_model=f1.airplane and aprt1.airport_code=f1.from_airport and aprt2.airport_code=f1.to_airport and al2.airline_code=f2.airline and ap2.airplane_model=f2.airplane and aprt3.airport_code=f2.from_airport and aprt4.airport_code=f2.to_airport and f1.dep_date >= CURRENT_DATE and f2.dep_date >= CURRENT_DATE';
    }

    response = await Flight.get(query, {
      WHERE,
      FETCH_ALL: false,
      isRoundtrip: query.isRoundtrip,
      getAirlines: false,
      getCounters: false,
    });

    if (response.error) return handleResponseError(response)(req, res, next);

    const [flight] = response.result.data;
    response = await Common.getCountries();

    if (response.error) return handleResponseError(response)(req, res, next);

    const countries = response.result;
    req.session.flightData = { query, route: flight };

    return res.render('booking/new-booking', { query, flight, countries });
  })
);

router.post(
  '/new-booking/thank-you',
  routeAsync(async (req, res, next) => {
    if (req.session.flightData === undefined) {
      return next(createError(400));
    }

    const userID = req.user && req.user.isVerified ? req.user.id : 1;
    const { flightData } = req.session;
    delete req.session.flightData;
    req.session.save((err) => {
      if (err) next(err);
    });

    const bookingData = req.body;
    bookingData.finalPrice = parseInt(bookingData.finalPrice, 10);

    const passengerInfo = [];
    let bookingID = '';
    let response = true;

    do {
      bookingID = await Math.random().toString(36).toUpperCase().substr(2, 6);
      response = await Booking.exists({ bookingID }, { byLastName: false });

      if (response.error) return handleResponseError(response)(req, res, next);

      response = response.result;
    } while (response);

    for (let i = 0; i < flightData.query.quantity; i++) {
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
        departCabinBag: baggage.oneway.cabin,
        departSmallBag: baggage.oneway.small,
        departLargeBag: baggage.oneway.large,
        returnCabinBag: 0,
        returnSmallBag: 0,
        returnLargeBag: 0,
      };

      if (flightData.query.isRoundtrip) {
        passenger.returnCabinBag = baggage.roundtrip.cabin;
        passenger.returnSmallBag = baggage.roundtrip.small;
        passenger.returnLargeBag = baggage.roundtrip.large;
      }

      passengerInfo.push(passenger);
    }

    const bookingDetails = {
      bookingID,
      userID,
      departFlightID: flightData.query.departFlightID,
      departDate: flightData.query.departDate,
      returnFlightID: null,
      returnDate: null,
      class: flightData.query.class,
      contactFirstName: bookingData.contactFirstName,
      contactLastName: bookingData.contactLastName,
      contactEmail: bookingData.contactEmail,
      contactMobile: bookingData.contactMobile,
      bookedDate: new Date(),
      lastModifyDate: new Date(),
      quantity: flightData.query.quantity,
      baggageQuantity: passengerInfo.reduce(
        (acc, { departSmallBag, departLargeBag, returnSmallBag, returnLargeBag }) =>
          acc + departSmallBag + departLargeBag + returnSmallBag + returnLargeBag,
        0
      ),
      pricePerPassenger: bookingData.finalPrice / flightData.query.quantity,
      totalPrice: bookingData.finalPrice,
      paymentType: bookingData.paymentType,
      flightType: flightData.query.isRoundtrip ? 'Roundtrip' : 'Oneway',
      status: 'UPCOMING',
    };

    if (flightData.query.isRoundtrip) {
      bookingDetails.returnFlightID = flightData.query.returnFlightID;
      bookingDetails.returnDate = flightData.query.returnDate;
    }

    response = await Booking.insert(bookingDetails);
    if (response.error) return handleResponseError(response)(req, res, next);

    await Promise.all(passengerInfo.map(async (passenger) => Booking.insertPassenger(passenger))).catch((err) => {
      return next(err);
    });

    const cabinBagQuantity = passengerInfo.reduce(
      (acc, { departCabinBag, returnCabinBag }) => acc + departCabinBag + returnCabinBag,
      0
    );
    const smallBagQuantity = passengerInfo.reduce(
      (acc, { departSmallBag, returnSmallBag }) => acc + departSmallBag + returnSmallBag,
      0
    );
    const largeBagQuantity = passengerInfo.reduce(
      (acc, { departLargeBag, returnLargeBag }) => acc + departLargeBag + returnLargeBag,
      0
    );
    const passengers = passengerInfo.map(
      ({
        firstName,
        lastName,
        insurance,
        departCabinBag,
        departSmallBag,
        departLargeBag,
        returnCabinBag,
        returnSmallBag,
        returnLargeBag,
      }) => ({
        name: `${firstName} ${lastName}`,
        insurance,
        departCabinBag,
        departSmallBag,
        departLargeBag,
        returnCabinBag,
        returnSmallBag,
        returnLargeBag,
      })
    );

    const baggage = {
      cabin: {
        quantity: cabinBagQuantity,
        price: 'free',
      },
      small: { quantity: smallBagQuantity, price: (25 * smallBagQuantity).toLocaleString() },
      large: { quantity: largeBagQuantity, price: (50 * largeBagQuantity).toLocaleString() },
    };

    const insurance = passengerInfo.reduce(
      (acc, { insurance }) => {
        if (insurance) {
          acc.included = true;
          acc[insurance].quantity += 1;
          // eslint-disable-next-line no-nested-ternary
          acc[insurance].price += insurance === 'plus' ? 25 : insurance === 'basic' ? 15 : '';
          return acc;
        }
      },
      {
        included: false,
        none: { quantity: 0, price: 'free' },
        basic: { quantity: 0, price: 0 },
        plus: { quantity: 0, price: 0 },
      }
    );

    const data = {
      email: {
        address: bookingData.contactEmail,
        firstName: bookingData.contactFirstName,
        lastName: bookingData.contactLastName,
        url: req.getUrl(),
      },
      variables: {
        booking: {
          id: bookingID,
          bookedDate: bookingDetails.bookedDate.toLocaleDateString('en-gb', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
          }),
          contactName: `${bookingData.contactFirstName} ${bookingData.contactLastName}`,
          contactEmail: bookingData.contactEmail,
          contactMobile: bookingData.contactMobile,
          quantity: flightData.query.quantity,
          totalPrice: bookingData.finalPrice.toLocaleString(),
          baggage,
          insurance,
        },
        flight: flightData.route,
        passengers,
      },
    };

    data.variables.flight.isRoundtrip = flightData.query.isRoundtrip;
    data.variables.flight.totalUntaxedPrice = data.variables.flight.totalUntaxedPrice.toLocaleString();
    data.variables.flight.totalPrice = data.variables.flight.totalPrice.toLocaleString();
    data.variables.flight.totalTaxes = data.variables.flight.totalTaxes.toLocaleString();
    if (data.variables.flight.departDuration.startsWith('0'))
      data.variables.flight.departDuration = data.variables.flight.departDuration.slice(1);
    if (flightData.query.isRoundtrip && data.variables.flight.returnDuration.startsWith('0'))
      data.variables.flight.returnDuration = data.variables.flight.returnDuration.slice(1);

    response = await Booking.sendConfirmation(data);
    if (response.error) return handleResponseError(response)(req, res, next);

    return res.render('booking/new-booking-booked', { booking: { ...flightData.query, ...bookingDetails } });
  })
);

router.get('/manage-booking', (req, res) => {
  return res.render('booking/manage-booking');
});

router.post(
  '/manage-booking',
  routeAsync(async (req, res) => {
    const { bookingID, lastName } = req.body;

    return res.redirect(`/booking/manage-booking/bookingID=${bookingID}&lastName=${lastName}`);
  })
);

router.get(
  '/manage-booking/bookingID=:bookingID&lastName=:lastName',
  routeAsync(async (req, res, next) => {
    const { bookingID, lastName } = req.params;
    const userID = req.session.user.id;
    const byID = /(\/user\/profile)/.test(req.get('Referrer'));

    let response = await Booking.exists(
      { bookingID, userID, lastName },
      {
        byID,
        byLastName: true,
      }
    );

    if (response.error) return handleResponseError(response)(req, res, next);
    if (!response.result) {
      res.flash('error', response.message);
      return res.redirect('/booking/manage-booking');
    }

    response = await Booking.get({ bookingID, userID, lastName }, { byID, byLastName: true });
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

    response = await Flight.get(args, {
      WHERE,
      FETCH_ALL: false,
      isRoundtrip: booking.isRoundtrip,
      getAirlines: false,
      getCounters: false,
    });

    if (response.error) return handleResponseError(response)(req, res, next);

    const [flight] = response.result.data;
    flight.isRoundtrip = booking.isRoundtrip;

    response = await Booking.getPassengers(booking.id);
    if (response.error) return handleResponseError(response)(req, res, next);

    const passengers = response.result;

    return res.render('booking/manage-booking-post', { booking, flight, passengers });
  })
);

router.post(
  '/manage-booking/bookingID=:bookingID&lastName=:lastName/edit',
  routeAsync(async (req, res, next) => {
    const { params } = req;
    const { body } = req;
    const response = await Booking.update({ ...params, ...body });

    if (response.error && response.tryCatchError) return next(response.result);

    res.flash(response.error ? 'error' : 'success', response.message);
    return res.redirect(
      `/booking/manage-booking/bookingID=${params.bookingID}&lastName=${
        response.error ? params.lastName : body.contactLastName
      }`
    );
  })
);

router.post(
  '/manage-booking/bookingID=:bookingID&lastName=:lastName/cancel',
  routeAsync(async (req, res, next) => {
    const { params } = req;
    const { body } = req;
    const response = await Booking.cancel({ ...params, ...body });

    if (response.error) {
      if (response.tryCatchError) return next(response.result);
      res.flash('error', response.message);
    }

    return res.redirect(`/booking/manage-booking/bookingID=${params.bookingID}&lastName=${params.lastName}`);
  })
);

module.exports = router;
