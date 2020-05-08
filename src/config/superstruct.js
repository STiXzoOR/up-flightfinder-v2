/* eslint-disable no-restricted-globals */
const { validate, superstruct } = require('express-superstruct');
const isEmail = require('is-email');
const isNumber = require('is-number');
const isValidJSON = require('is-json-valid');

function isStringBoolean(value) {
  return ['true', '1'].includes(value.toString().trim().toLowerCase());
}

function isStringDate(value) {
  const date = new Date(value);
  return date instanceof Date && !isNaN(date);
}

const struct = superstruct({
  types: {
    email: (value) => isEmail(value),
    number: (value) => isNumber(value),
    json: (value) => isValidJSON(value),
    stringBoolean: (value) => isStringBoolean(value),
    stringDate: (value) => isStringDate(value),
  },
});

const SCHEMAS = {
  searchFlights: {
    type: 'string',
    fromAirport: 'string',
    toAirport: 'string',
    flightDates: struct.function((value) => {
      let dates = value.split(' - ');
      dates = dates.map((date) => isStringDate(date));
      return !dates.some((date) => date === false);
    }),
    passengersClass: 'json',
  },
  newBooking: {
    isRoundtrip: 'stringBoolean',
    fromCity: 'string',
    toCity: 'string',
    departFlightID: 'string',
    departDate: 'stringDate',
    returnFlightID: 'string',
    returnDate: 'stringDate',
    class: 'string',
    quantity: 'number',
    passengers: 'json',
  },
};

module.exports = (name) => validate(SCHEMAS[name], struct);
