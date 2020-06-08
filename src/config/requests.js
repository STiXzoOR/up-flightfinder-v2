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
  getCountries,
  getPopularDestinations,
  getAirports,
  insertNewsletterSubscriber,
  updateNewsletterSubscriber,
  removeNewsletterSubscriber,
};
