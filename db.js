const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  host: process.env.DB_HOST,       // your database host
  user: process.env.DB_USER,       // your database user
  password: process.env.DB_PASSWORD, // your database password
  database: process.env.DB_NAME,   // your database name
  port: process.env.DB_PORT,       // usually 5432
  ssl: { rejectUnauthorized: false } // needed for Render PostgreSQL
});

module.exports = {
  query: (text, params) => pool.query(text, params),
};
