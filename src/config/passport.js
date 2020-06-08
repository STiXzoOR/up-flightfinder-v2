const LocalStrategy = require('passport-local').Strategy;
const User = require('../controllers/user');

module.exports = (passport) => {
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser((customerID, done) => {
    return User.get({ customerID }, { partial: true })
      .then((response) => {
        if (response.error) throw new Error(response.message);
        return done(null, response.result[0]);
      })
      .catch(() => done(null, false));
  });

  passport.use(
    'login',
    new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
      try {
        const response = await User.session({ email, password });
        done(null, response);
      } catch (err) {
        done(err, {});
      }
    })
  );
};
