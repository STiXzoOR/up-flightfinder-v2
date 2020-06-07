const mysql = require('../config/mysql');
const logger = require('../config/winston');

class Base {
  constructor() {
    this.db = mysql;
  }

  async execute(query = '', args = {}, type = 'fetch') {
    const response = {
      status: 400,
      error: true,
      message: 'No results found.',
      result: [],
    };

    await this.db[type](query, args)
      .then((data) => {
        if (data === null) {
          response.status = 500;
          response.error = true;
          response.message = 'Database internal error.';
        } else if (data.length !== 0) {
          response.status = 200;
          response.error = false;
          response.message = 'Success.';
          response.result = data;
        }
      })
      .catch((error) => {
        response.error = true;
        response.tryCatchError = true;
        response.status = error.status;
        response.result = error;
      });

    return response;
  }
}

module.exports = Base;
