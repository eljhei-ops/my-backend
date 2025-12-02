const mysql = require("mysql2");

const db = mysql.createConnection({
  host: "Phielly",
  user: "root",
  password: "Phielly@2113",
  database: "users",
  port: "3306"
});

db.connect((err) => {
  if (err) throw err;
  console.log("MySQL Connected");
});

module.exports = db;
