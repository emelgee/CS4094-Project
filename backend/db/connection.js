const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'db',          // important: docker service name
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

module.exports = pool;