const http = require('http');
const config = require('./config/dotenv').load();
const logger = require('./config/winston');
const app = require('./app');

app.set('port', config.port);
if (config.behindProxy()) app.set('trust proxy', true);

const server = http.createServer(app);

server.listen(config.port);
server.on('error', (error) => {
  if (error.syscall !== 'listen') {
    logger.error(error);
    process.exit(1);
  }

  switch (error.code) {
    case 'EACCES':
      logger.error(`Server.listen() requires elevated privileges`);
      process.exit(1);
      break;
    case 'EADDRINUSE':
      logger.error(`Port: ${config.port} is already in use`);
      process.exit(1);
      break;
    default:
      throw error;
  }
});

server.on('listening', () => {
  logger.info(`App server is running on port [${config.port}] in [${config.env}] environment`);
});

process.on('SIGINT', () => {
  logger.info('Alright! Bye bye!');
  server.close(() => process.exit());
});
