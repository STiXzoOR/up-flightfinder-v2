module.exports = function cache(seconds = 600) {
  return (req, res, next) => {
    res.setHeader('Cache-Control', `public, max-age=${seconds}`);
    return next();
  };
};
