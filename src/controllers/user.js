const bcrypt = require('bcrypt');
const config = require('../config/dotenv');
const Base = require('./base');

class User extends Base {
  constructor() {
    super();

    this.queries = {
      password: 'SELECT password From customer WHERE customer_id=:customerID',
      exists: {
        byID: 'SELECT customer_id as id, email FROM customer WHERE customer_id=:customerID',
        byEmail: 'SELECT customer_id as id, email FROM customer WHERE email=:customerID',
      },
      get: {
        full:
          'SELECT DISTINCT c.first_name as firstName, c.last_name as lastName, c.email as email, c.gender as gender, c.mobile as mobile, DATE_FORMAT(c.joined_date, "%a, %d %b") as date, c.address_line_1 as addressLine1, c.address_line_2 as addressLine2, c.city as city, c.region as region, IF(c.country IS NOT NULL, cs.name, c.country) as country, c.postal_code as postalCode, c.status = "VERIFIED" as isVerified FROM customer as c, countries as cs WHERE IF(c.country IS NOT NULL, cs.country_code=c.country, 1)',
        partial:
          'SELECT c.customer_id as id, c.first_name as firstName, c.last_name as lastName, c.email as email, c.customer_type as role, c.status = "VERIFIED" as isVerified FROM customer as c WHERE 1',
      },
      insert:
        'INSERT INTO customer (first_name, last_name, email, password, mobile, gender, joined_date, status, customer_type) VALUES (:firstName, :lastName, :email, :password, :mobile, :gender, NOW(), :status, "USER")',
      remove: 'DELETE FROM customer WHERE customer_id=:customerID',
      verify:
        'UPDATE customer SET status="VERIFIED", email_token=NULL, email_token_expire=NULL WHERE customer_id=:customerID',
      update: {
        details:
          'UPDATE customer SET first_name=:firstName, last_name=:lastName, mobile=:mobile, gender=:gender, address_line_1=:addressLine1, address_line_2=:addressLine2, city=:city, region=:region, postal_code=:postal, country=:country WHERE customer_id=:customerID',
        password: {
          token: 'UPDATE customer SET password=:password, password_token=NULL, password_token_expire=NULL',
          noToken: 'UPDATE customer SET password=:password',
        },
      },
      bookings:
        'SELECT b.booking_id as id, b.last_name as lastName, DATE_FORMAT(b.booking_date, "%a, %d %b") as date, b.total_passengers as quantity, b.flight_type <> "Roundtrip" as isRoundtrip, b.status <> "CANCELED" as isCanceled, a1.city as fromCity, a2.city as toCity, DATE_FORMAT(b.depart_flight_date, "%a, %d %b") as departDate FROM booking as b, flight as f, airport as a1, airport as a2 WHERE b.customer_id=:customerID and f.flight_id=b.depart_flight_id and f.dep_date=b.depart_flight_date and f.class=b.flight_class and a1.airport_code=f.from_airport and a2.airport_code=f.to_airport ORDER BY b.depart_flight_date DESC',
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
        success: 'Your account has been successfully verified.',
      },
      update: {
        details: {
          success: 'Your personal information has been successfully updated.',
        },
        password: {
          success: 'Your password has been successfully changed. You can now get back into your account.',
        },
      },
    };
  }

  async passwordMatch(args = {}, { checkUserExistence = false } = {}) {
    let response;

    if (checkUserExistence) {
      response = await this.exists(args.customerID);

      if (response.error || !response.result) {
        response.error = true;
        return response;
      }
    }

    const query = this.queries.password;
    response = await this.execute(query, { customerID: args.customerID }, 'fetchOne');

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

  async exists(customerID = '', { byID = true } = {}) {
    const query = this.queries.exists[byID ? 'byID' : 'byEmail'];
    const response = await this.execute(query, { customerID }, 'fetchOne');

    if (response.tryCatchError || response.status === 500) return response;

    const found = response.result.length !== 0;
    const message = byID ? response.message : this.messages.exists[found ? 'found' : 'notFound'];

    response.error = false;
    response.message = message;
    response.result = found;

    return response;
  }

  async get(args = {}, { byID = true, byEmail = false, partial = false } = {}) {
    const response = await this.exists(byID ? args.customerID : args.email, { byID });

    if (response.error || !response.result) {
      response.error = true;
      return response;
    }

    let query = this.queries.get[partial ? 'partial' : 'full'];

    if (byID && byEmail) {
      query += ' and c.customer_id=:customerID and c.email=:email';
    } else if (byID) {
      query += ' and c.customer_id=:customerID';
    } else if (byEmail) {
      query += ' and c.email=:email';
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
      customerID: response.result[0].id,
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
      status: config.mailgun.enabled ? 'UNVERIFIED' : 'VERIFIED',
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
    response = await this.execute(query, { customerID: args.customerID }, 'commit');
    response.message = response.error ? this.messages.generic : this.messages.remove.success;

    return response;
  }

  async verify(customerID = '') {
    const query = this.queries.verify;
    const response = await this.execute(query, { customerID });
    response.message = response.error ? this.messages.generic : this.messages.verify.success;

    return response;
  }

  async updateDetails(args = {}) {
    const query = this.queries.update.details;
    const response = await this.execute(query, args);
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
    query += ' WHERE customer_id=:customerID';

    const salt = bcrypt.genSaltSync(10);
    const password = bcrypt.hashSync(args.password, salt);

    response = this.execute(query, { ...args, password });
    response.message = response.error ? this.messages.generic : this.messages.update.password.success;

    return response;
  }

  async bookings(customerID = '') {
    const query = this.queries.bookings;
    const bookingsData = { isEmpty: true };
    const response = await this.execute(query, { customerID });

    if (!response.error && response.result.length) {
      bookingsData.isEmpty = false;
      bookingsData.data = response.result;
    }

    response.result = bookingsData;
    return response;
  }
}

module.exports = new User();
