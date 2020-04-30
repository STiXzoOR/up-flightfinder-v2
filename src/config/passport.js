const LocalStrategy = require('passport-local').Strategy;
const { getUser } = require('./requests');

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
        const response = await getUser(email, password);
        done(null, response);
      } catch (err) {
        done(err, {});
      }
    })
  );
};
