const mysql = require('mysql');
const async = require('async');

const pool = mysql.createPool({
  connectionLimit: 100,
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'flightfinderdb',
  debug: false
});

function fetchData(query, fields, callback) {
  async.waterfall(
    [
      () => {
        pool.getConnection((err, connection) => {
          if (err) {
            callback(true);
          } else {
            callback(null, connection);
          }
        });
      },
      (connection) => {
        connection.query(query, fields, (err, rows) => {
          connection.release();
          if (!err) {
            callback(rows.length === 0 ? false : rows);
          } else {
            callback(true);
          }
        });
      }
    ],
    (result) => {
      if (typeof result === 'boolean' && result === true) {
        callback(null);
      } else {
        callback(result);
      }
    }
  );
}

function transactionData(query, fields, callback) {
  async.waterfall(
    [
      () => {
        pool.getConnection((err, connection) => {
          if (err) {
            callback(true);
          } else {
            callback(null, connection);
          }
        });
      },
      (connection) => {
        connection.beginTransaction((err) => {
          if (err) {
            connection.release();
            callback(true);
          } else {
            connection.query(query, fields, (queryErr, result) => {
              if (queryErr) {
                connection.rollback(() => {
                  connection.release();
                  callback(true);
                });
              } else {
                connection.commit((commitErr) => {
                  if (commitErr) {
                    connection.rollback(() => {
                      connection.release();
                      callback(true);
                    });
                  } else {
                    connection.release();
                    callback(result.length === 0 ? false : result);
                  }
                });
              }
            });
          }
        });
      }
    ],
    (result) => {
      if (typeof result === 'boolean' && result === true) {
        callback(null);
      } else {
        callback(result);
      }
    }
  );
}

module.exports.fetchData = fetchData;
module.exports.insertData = transactionData;
module.exports.updateData = transactionData;
module.exports.deleteData = transactionData;
