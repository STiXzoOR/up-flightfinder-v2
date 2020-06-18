/* eslint-disable no-shadow */
const mysql = require('mysql2');
const config = require('./dotenv');

const options = {
  ...config.mysql,
  connectionLimit: 100,
  namedPlaceholders: true,
  debug: false,
};

if (config.isOSX()) {
  options.socketPath = '/Applications/MAMP/tmp/mysql/mysql.sock';
}

class Database {
  constructor(options) {
    this.pool = mysql.createPool(options);
  }

  fetch(sql, args) {
    return new Promise((resolve, reject) => {
      this.pool.getConnection((err, connection) => {
        if (err) return reject(err);

        return connection.execute(sql, args, (err, rows) => {
          connection.release();

          if (err) return reject(err);

          return resolve(rows);
        });
      });
    });
  }

  fetchOne(sql, args) {
    const query = `${sql} LIMIT 1`;
    return this.fetch(query, args);
  }

  commit(sql, args) {
    return new Promise((resolve, reject) => {
      this.pool.getConnection((err, connection) => {
        if (err) return reject(err);

        return connection.beginTransaction((err) => {
          if (err) return reject(err);

          return connection.execute(sql, args, (err, rows) => {
            if (err) {
              connection.rollback(() => {
                connection.release();
                return reject(err);
              });
            }

            connection.commit((err) => {
              if (err) {
                connection.rollback(() => {
                  connection.release();
                  return reject(err);
                });
              }

              return resolve(rows);
            });
          });
        });
      });
    });
  }

  close() {
    return new Promise((resolve, reject) => {
      this.pool.end((err) => {
        if (err) return reject(err);
        return resolve();
      });
    });
  }
}

module.exports = new Database(options);
