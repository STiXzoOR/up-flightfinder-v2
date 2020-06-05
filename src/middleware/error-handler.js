const createError = require('http-errors');
const config = require('../config/dotenv');
const logger = require('../config/winston');

const handler = (err, req, res, next) => {
  const statusCode = err.status || 500;
  const loggerMessages = {
    development: `${req.method} ${req.originalUrl} ${logger.colorize('error', statusCode)} ${err.message} \n\n${
      err.stack
    }\n`,
    production: `${req.method} ${req.originalUrl} HTTP/${req.httpVersion} ${statusCode} ${err.message}`,
  };

  logger.error(loggerMessages[config.env]);

  return res
    .status(statusCode)
    .render(config.isDev() ? 'error' : `${statusCode}`, { error: err, message: err.message });
};

const notFound = (req, res, next) => {
  return next(createError(404));
};

module.exports = {
  handler,
  notFound,
};
