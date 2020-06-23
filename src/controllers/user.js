/* eslint-disable import/no-dynamic-require */
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const config = require('../config/dotenv');
const Mailer = require(config.dynamicModules.mailer);
const Base = require('./base');

class User extends Base {
  constructor() {
    super();

    this.queries = {
      password: 'SELECT password From user WHERE user_id=:userID',
      exists: {
        byID: 'SELECT user_id as id, email FROM user WHERE user_id=:userID',
        byEmail: 'SELECT user_id as id, email FROM user WHERE email=:userID',
      },
      get: {
        full:
          'SELECT DISTINCT u.first_name as firstName, u.last_name as lastName, u.email as email, u.gender as gender, u.mobile as mobile, DATE_FORMAT(u.joined_date, "%a, %d %b") as date, u.address_line_1 as addressLine1, u.address_line_2 as addressLine2, u.city as city, u.region as region, IF(u.country IS NOT NULL, cs.name, u.country) as country, u.postal_code as postalCode, u.status = "VERIFIED" as isVerified, u.has_avatar as hasAvatar FROM user as u, countries as cs WHERE IF(u.country IS NOT NULL, cs.country_code=u.country, 1)',
        partial:
          'SELECT u.user_id as id, u.first_name as firstName, u.last_name as lastName, u.email as email, u.user_type as role, u.status = "VERIFIED" as isVerified, u.has_avatar as hasAvatar FROM user as u WHERE 1',
      },
      insert:
        'INSERT INTO user (first_name, last_name, email, password, mobile, gender, joined_date, status, user_type) VALUES (:firstName, :lastName, :email, :password, :mobile, :gender, NOW(), :status, "USER")',
      remove: 'DELETE FROM user WHERE user_id=:userID',
      verify: {
        status: 'UPDATE user SET status="VERIFIED", email_token=NULL, email_token_expire=NULL WHERE user_id=:userID',
        token: {
          email: 'SELECT user_id as id FROM user WHERE email_token=:token and email_token_expire > NOW()',
          password: 'SELECT user_id as id FROM user WHERE password_token=:token and password_token_expire > NOW()',
        },
      },
      update: {
        avatar: 'UPDATE user SET has_avatar=:hasAvatar WHERE user_id=:userID',
        details:
          'UPDATE user SET first_name=:firstName, last_name=:lastName, mobile=:mobile, gender=:gender, address_line_1=:addressLine1, address_line_2=:addressLine2, city=:city, region=:region, postal_code=:postal, country=:country WHERE user_id=:userID',
        password: {
          token: 'UPDATE user SET password=:password, password_token=NULL, password_token_expire=NULL',
          noToken: 'UPDATE user SET password=:password',
        },
        verification: {
          email: 'UPDATE user SET email_token=:token, email_token_expire=:tokenExpire WHERE email=:email',
          password: 'UPDATE user SET password_token=:token, password_token_expire=:tokenExpire WHERE email=:email',
        },
      },
      bookings:
        'SELECT b.booking_id as id, b.last_name as lastName, DATE_FORMAT(b.booking_date, "%a, %d %b") as date, b.total_passengers as quantity, b.flight_type <> "Roundtrip" as isRoundtrip, b.status <> "CANCELED" as isCanceled, a1.city as fromCity, a2.city as toCity, DATE_FORMAT(b.depart_flight_date, "%a, %d %b") as departDate FROM booking as b, flight as f, airport as a1, airport as a2 WHERE b.user_id=:userID and f.flight_id=b.depart_flight_id and f.dep_date=b.depart_flight_date and f.class=b.flight_class and a1.airport_code=f.from_airport and a2.airport_code=f.to_airport ORDER BY b.depart_flight_date DESC',
    };

    this.messages = {
      generic: 'Something went wrong. Please contact our support team.',
      password: {
        success: 'Passwords match',
        error:
          "The provided password doesn't match the one stored in our database. Please validate that your current password is correct.",
      },
      exists: {
        found: 'A user with the provided email already exists. Please sign in.',
        notFound: "A user with the provided email does't exist. Please sign up.",
      },
      insert: {
        success: 'Sign up was successfull. Please sign in.',
      },
      remove: {
        success: 'Your account has been successfully deleted.',
      },
      verify: {
        status: {
          success: 'Your account has been successfully verified.',
        },
        token: {
          error: 'The requested link is invalid or has expired.',
        },
      },
      update: {
        avatar: {
          success: 'Avatar status updated.',
        },
        details: {
          success: 'Your personal information has been successfully updated.',
        },
        password: {
          success: 'Your password has been successfully changed. You can now get back into your account.',
        },
      },
      verification: {
        email: {
          success:
            'A mail to verify your account was sent to the provided email. The link will expire after 1 day. Follow the instructions to complete the sign up process.',
        },
        password: {
          success:
            'A mail to reset your password was sent to the provided email. The link will expire after 10 minutes. Follow the instructions to enter a new password.',
        },
      },
    };
  }

  async passwordMatch(args = {}, { checkUserExistence = false } = {}) {
    let response;

    if (checkUserExistence) {
      response = await this.exists(args.userID);

      if (response.error || !response.result) {
        response.error = true;
        return response;
      }
    }

    const query = this.queries.password;
    response = await this.execute(query, { userID: args.userID }, 'fetchOne');

    if (response.error) return response;

    if (bcrypt.compareSync(args.currentPassword, response.result[0].password)) {
      response.status = 200;
      response.error = false;
      response.message = this.messages.password.success;
    } else {
      response.status = 401;
      response.error = true;
      response.message = this.messages.password.error;
    }

    return response;
  }

  async exists(userID = '', { byID = true } = {}) {
    const query = this.queries.exists[byID ? 'byID' : 'byEmail'];
    const response = await this.execute(query, { userID }, 'fetchOne');

    if (response.tryCatchError || response.status === 500) return response;

    const found = response.result.length !== 0;
    const message = byID ? response.message : this.messages.exists[found ? 'found' : 'notFound'];

    response.error = false;
    response.message = message;
    response.result = found;

    return response;
  }

  async get(args = {}, { byID = true, byEmail = false, partial = false } = {}) {
    const response = await this.exists(byID ? args.userID : args.email, { byID });

    if (response.error || !response.result) {
      response.error = true;
      return response;
    }

    let query = this.queries.get[partial ? 'partial' : 'full'];

    if (byID && byEmail) {
      query += ' and u.user_id=:userID and u.email=:email';
    } else if (byID) {
      query += ' and u.user_id=:userID';
    } else if (byEmail) {
      query += ' and u.email=:email';
    }

    return this.execute(query, args);
  }

  async session(args = {}) {
    const response = await this.get(args, { byID: false, byEmail: true, partial: true });

    if (response.error || !response.result) {
      response.error = true;
      return response;
    }

    const responsePassword = await this.passwordMatch({
      userID: response.result[0].id,
      currentPassword: args.password,
    });

    return !responsePassword.error ? response : responsePassword;
  }

  async insert(args = {}) {
    const salt = bcrypt.genSaltSync(10);
    const password = bcrypt.hashSync(args.password, salt);

    let response = await this.exists(args.email, { byID: false });

    if (response.error || response.result) {
      response.error = true;
      return response;
    }

    const fields = {
      firstName: args.firstName,
      lastName: args.lastName,
      email: args.email,
      password,
      mobile: args.mobile,
      gender: args.gender,
      status: config.mailgun.enabled || config.nodemailer.enabled ? 'UNVERIFIED' : 'VERIFIED',
    };

    const query = this.queries.insert;
    response = await this.execute(query, fields, 'commit');

    if (response.error) {
      response.status = 500;
      response.message = this.messages.generic;
    } else response.message = this.messages.insert.success;

    return response;
  }

  async remove(args = {}) {
    let response = await this.passwordMatch(args);

    if (response.error) return response;

    const query = this.queries.remove;
    response = await this.execute(query, { userID: args.userID }, 'commit');
    response.message = response.error ? this.messages.generic : this.messages.remove.success;

    return response;
  }

  async verify(userID = '') {
    const query = this.queries.verify.status;
    const response = await this.execute(query, { userID }, 'commit');
    response.message = response.error ? this.messages.generic : this.messages.verify.status.success;

    return response;
  }

  async updateAvatarStatus(args = {}) {
    const query = this.queries.update.avatar;
    const response = await this.execute(query, args, 'commit');
    response.message = response.error ? this.messages.generic : this.messages.update.avatar.success;

    return response;
  }

  async updateDetails(args = {}) {
    const query = this.queries.update.details;
    const response = await this.execute(query, args, 'commit');
    response.message = response.error ? this.messages.generic : this.messages.update.details.success;

    return response;
  }

  async updatePassword(args = {}, { matchPasswords = true, expireToken = false } = {}) {
    let response;
    if (matchPasswords) {
      response = await this.passwordMatch(args);

      if (response.error) return response;
    }

    let query = this.queries.update.password[expireToken ? 'token' : 'noToken'];
    query += ' WHERE user_id=:userID';

    const salt = bcrypt.genSaltSync(10);
    const password = bcrypt.hashSync(args.password, salt);

    response = await this.execute(query, { ...args, password }, 'commit');
    response.message = response.error ? this.messages.generic : this.messages.update.password.success;

    return response;
  }

  async bookings(userID = '') {
    const query = this.queries.bookings;
    const bookingsData = { isEmpty: true };
    const response = await this.execute(query, { userID });

    if (!response.error && response.result.length) {
      bookingsData.isEmpty = false;
      bookingsData.data = response.result;
    }

    response.result = bookingsData;
    return response;
  }

  async verifyToken(token = '', type = 'email') {
    const query = this.queries.verify.token[type];
    const response = await this.execute(query, { token }, 'fetchOne');

    if (response.tryCatchError || response.status === 500) return response;

    response.error = response.result.length === 0;
    response.message = response.result.length !== 0 ? response.message : this.messages.verify.token.error;

    return response;
  }

  async sendVerification(args = {}, type = 'email') {
    const options = {
      email: {
        tokenDuration: 86400000,
        send: (data) => Mailer.sendVerifyAccount(data),
      },
      password: {
        tokenDuration: 600000,
        send: (data) => Mailer.sendResetPassword(data),
      },
    };

    const fields = {
      email: args.email,
      token: crypto.randomBytes(40).toString('hex'),
      tokenExpire: new Date(Date.now() + options[type].tokenDuration),
    };

    const query = this.queries.update.verification[type];
    const response = await this.execute(query, fields, 'commit');

    if (response.error) {
      if (!response.tryCatchError) response.message = this.messages.generic;
      return response;
    }

    const data = {
      email: args.email,
      firstName: args.firstName,
      lastName: args.lastName,
      url: args.url,
      token: fields.token,
      recipient: `${args.firstName} ${args.lastName} <${args.email}>`,
    };

    await options[type]
      .send(data)
      .then((result) => {
        response.message = this.messages.verification[type].success;
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

module.exports = new User();
