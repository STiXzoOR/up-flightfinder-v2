const mysql = require('mysql2');
const os = require('os');

const OSX = os.platform() === 'darwin';

const options = {
  connectionLimit: 100,
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  namedPlaceholders: true,
  debug: false,
};

if (OSX) {
  options.socketPath = '/Applications/MAMP/tmp/mysql/mysql.sock';
}

class Database {
  constructor() {
    this.pool = mysql.createPool(options);
  }

  fetch(sql, args) {
    return new Promise((resolve, reject) => {
      this.pool.getConnection((err, connection) => {
        if (err) return reject(err);

        connection.execute(sql, args, (err, rows) => {
          connection.release();

          if (err) return reject(err);

          resolve(rows);
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

        connection.beginTransaction((err) => {
          if (err) return reject(err);

          connection.execute(sql, args, (err, rows) => {
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

              resolve(rows);
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
        resolve();
      });
    });
  }
}

module.exports = Database;
