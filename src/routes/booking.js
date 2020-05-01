const express = require('express');
const createError = require('http-errors');
const {
  getFlights,
  insertBooking,
  insertPassenger,
  checkBookingExists,
} = require('../config/requests');

const router = express.Router();

router.get('/', (req, res, next) => {
  return next(createError(400));
});

router.get('/new-booking', async (req, res, next) => {
  const { query } = req;
  query.isRoundtrip = query.isRoundtrip === 'true';
  query.quantity = parseInt(query.quantity, 10);
  query.passengers = JSON.parse(query.passengers);

  try {
    let WHERE =
      'f.flight_id=:departFlightID and f.dep_date=:departDate and f.class=:class and al.airline_code=f.airline and ap.airplane_model=f.airplane and aprt1.airport_code=f.from_airport and aprt2.airport_code=f.to_airport and f.dep_date >= CURRENT_DATE';

    if (query.isRoundtrip) {
      WHERE =
        'f1.flight_id=:departFlightID and f1.dep_date=:departDate and f1.class=:class and f2.flight_id=:returnFlightID and f2.dep_date=:returnDate and f2.class=:class and al1.airline_code=f1.airline and ap1.airplane_model=f1.airplane and aprt1.airport_code=f1.from_airport and aprt2.airport_code=f1.to_airport and al2.airline_code=f2.airline and ap2.airplane_model=f2.airplane and aprt3.airport_code=f2.from_airport and aprt4.airport_code=f2.to_airport and f1.dep_date >= CURRENT_DATE and f2.dep_date >= CURRENT_DATE';
    }

    const flight = await getFlights({ isRoundtrip: query.isRoundtrip, args: query, WHERE, FETCH_ALL: false });

    if (flight.error) {
      return next(createError(flight.status));
    }

    const data = {
      query,
      flight: flight.result[0],
    };

    req.session.flightData = query;

    return res.render('new-booking', { data });
  } catch (err) {
    console.log(err);
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
    let bookingDetails = {};

    let bookingID = '';
    let found = true;

    do {
      bookingID = await Math.random().toString(36).toUpperCase().substr(2, 6);
      found = await checkBookingExists({ bookingID });

      if (typeof found !== 'boolean') return next(found);
    } while (found);

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

    bookingDetails = {
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
    };

    if (flightData.isRoundtrip) {
      bookingDetails.returnFlightID = flightData.returnFlightID;
      bookingDetails.returnDate = flightData.returnDate;
    }

    const bookingResponse = await insertBooking(bookingDetails);

    if (bookingResponse.error) {
      return next(createError(bookingResponse.status));
    }

    await Promise.all(passengerInfo.map(async (passenger) => insertPassenger(passenger))).catch((err) => {
      console.log(err);
      return next(err);
    });

    return res.render('new-booking-booked', { booking: { ...flightData, ...bookingDetails } });
  } catch (err) {
    console.log(err);
    return next(err);
  }
});

router.get('/manage-booking', (req, res, next) => {
  res.render('manage-booking');
});

module.exports = router;
