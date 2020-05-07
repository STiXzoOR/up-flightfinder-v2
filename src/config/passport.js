const LocalStrategy = require('passport-local').Strategy;
const { getUserDetails, getSessionUser } = require('./requests');

module.exports = (passport) => {
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser((customerID, done) => {
    return getUserDetails({ args: { customerID }, partial: true })
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
        const response = await getSessionUser({ email, password });
        done(null, response);
      } catch (err) {
        done(err, {});
      }
    })
  );
};
