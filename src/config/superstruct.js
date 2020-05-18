/* eslint-disable no-restricted-syntax */
/* eslint-disable guard-for-in */
/* eslint-disable no-restricted-globals */
const { validate, superstruct } = require('express-superstruct');
const kindOf = require('kind-of');
const isEmail = require('is-email');
const isNumber = require('is-number');
const isValidJSON = require('is-json-valid');

function isEmpty(value) {
  const type = kindOf(value);

  if (type === 'object') {
    for (const x in value) {
      return false;
    }
    return true;
  }

  if (type === 'function') return /^(function\s?[^(]*(\(.*\))|(\(.*\))\s?(=>))\s?\{\s*\}/m.test(value.toString());

  if (['null', 'undefined'].includes(type)) return true;

  return value.length === 0;
}

function isValidPassword(value) {
  return /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!^+%/()=?_:`@~|\}\]\[{$.,*-])[A-Za-z\d!^+%/()=?_:`@~|\}\]\[{$.,*-]{8,30}$/.text(
    value
  );
}

function isStringBoolean(value) {
  return ['true', 'false', '1', '0'].includes(value.toString().trim().toLowerCase());
}

function isStringDate(value) {
  const date = new Date(value);
  return kindOf(date) === 'date' && !isNaN(date);
}

function isValidPassengersObject(value) {
  if (!isValidJSON(value, { allowObjects: true })) return false;

  const keys = ['adults', 'children', 'infants'];
  const data = kindOf(value) === 'object' ? value : JSON.parse(value);

  if (data.total) keys.push('total');

  if (isEmpty(data) || Object.keys(data).toString() !== keys.toString()) return false;

  for (const x of Object.values(data)) {
    if (kindOf(x) !== 'number') return false;
  }

  return true;
}

function isValidPassengersClassObject(value) {
  if (!isValidJSON(value)) return false;

  const keys = ['passengers', 'class'];
  const data = JSON.parse(value);

  if (isEmpty(data) || Object.keys(data).toString() !== keys.toString()) return false;

  const classType = kindOf(data.class);

  if (classType !== 'string' || (classType === 'string' && isEmpty(data.class))) return false;
  if (!isValidPassengersObject(data.passengers)) return false;

  return true;
}

const struct = superstruct({
  types: {
    isEmpty: (value) => isEmpty(value),
    '!isEmpty': (value) => !isEmpty(value),
    email: (value) => isEmail(value),
    password: (value) => isValidPassword(value),
    number: (value) => isNumber(value),
    json: (value) => isValidJSON(value),
    stringBoolean: (value) => isStringBoolean(value),
    stringDate: (value) => isStringDate(value),
    passengersObject: (value) => isValidPassengersObject(value),
    passengersClassObject: (value) => isValidPassengersClassObject(value),
  },
});

const SCHEMAS = {
  userSignUpForm: {
    firstName: 'string & !isEmpty',
    lastName: 'string & !isEmpty',
    mobile: 'string & !isEmpty',
    gender: 'string & !isEmpty',
    email: 'email & !isEmpty',
    password: 'password & !isEmpty',
    acceptTOU: 'string & !isEmpty',
  },
  userSignInForm: {
    email: 'email & !isEmpty',
    password: 'string & !isEmpty',
  },
  searchFlightsQuery: {
    type: 'string',
    fromAirport: 'string',
    toAirport: 'string',
    flightDates: struct.function((value) => {
      let dates = value.split(' - ');
      dates = dates.map((date) => isStringDate(date));
      return !dates.some((date) => date === false);
    }),
    passengersClass: 'passengersClassObject',
  },
  newBookingQuery: {
    isRoundtrip: 'stringBoolean',
    fromCity: 'string',
    toCity: 'string',
    departFlightID: 'string',
    departDate: 'stringDate',
    returnFlightID: 'string | undefined',
    returnDate: 'stringDate | undefined',
    class: 'string',
    quantity: 'number',
    passengers: 'passengersObject',
  },
};

const validateMiddleware = (name) => validate(kindOf(name) === 'string' ? SCHEMAS[name] : name, struct);
const validateVerbose = (name, data) => {
  const fields = Array.isArray(SCHEMAS[name]) ? SCHEMAS[name] : [SCHEMAS[name]];
  const Schema = struct(...fields);

  return Schema.validate(data);
};

module.exports = {
  validate: validateMiddleware,
  validateVerbose,
};
