const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');
const mysql = new (require('./mysql'))();

module.exports = (passport) => {
  passport.serializeUser((user, done) => {
    done(null, user);
  });

  passport.deserializeUser((user, done) => {
    done(null, user);
  });

  passport.use(
    'login',
    new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
      try {
        const response = {
          status: 400,
          error: true,
          message: '',
          user: {},
        };

        const query =
          'SELECT customer_id, first_name, last_name, password, customer_type FROM customer WHERE email=:email';

        const data = await mysql.fetch(query, { email });

        if (data === null) {
          response.status = 500;
          response.error = true;
          response.message = 'Database internal error.';
        } else if (data.length === 0) {
          response.status = 400;
          response.error = true;
          response.message = 'Email does not exist. Please sign up.';
        } else if (bcrypt.compareSync(password, data[0].password)) {
          response.status = 200;
          response.error = false;
          response.message = 'Sign in success.';
          response.user = {
            id: data[0].customer_id,
            firstName: data[0].first_name,
            lastName: data[0].last_name,
            fullname: `${this.firstName} ${this.lastName}`,
            role: data[0].customer_type,
          };
        } else {
          response.status = 401;
          response.error = true;
          response.message = 'Password is incorrect. Please try again.';
        }
        done(null, response);
      } catch (e) {
        done(e, {});
      }
    })
  );
};
