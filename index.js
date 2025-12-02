const express = require("express");
const app = express();
const cors = require("cors");
const path = require("path");
const db = require("./db");
const bcrypt = require("bcryptjs");
const OpenAI = require("openai");
require("dotenv").config();
const OpenAI = require("openai");

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Serve static frontend folder
app.use(express.static(path.join(__dirname, "frontend-test")));

// Serve home.html on root
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "frontend-test", "home.html"));
});

// Test API endpoint
app.get("/api/test", (req, res) => {
  res.json({ message: "Hello from Render backend!" });
});

// OpenAI chat endpoint
const client = new OpenAI({ apiKey: process.env.OPENAI_KEY });

app.post("/api/chat", async (req, res) => {
  const { message } = req.body;

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: message }],
  });

  res.json({ reply: response.choices[0].message.content });
});

// REGISTER ENDPOINT (hashes password before storing)
app.post("/api/register", (req, res) => {
  const { username, password } = req.body;

  if (!username || !password)
    return res.json({ success: false, message: "Missing fields." });

  // Hash password
  bcrypt.hash(password, 10, (err, hash) => {
    if (err) throw err;

    const sql = "INSERT INTO users (username, password) VALUES (?, ?)";
    db.query(sql, [username, hash], (err, result) => {
      if (err) {
        console.error(err);
        return res.json({ success: false, message: "User creation failed." });
      }

      res.json({ success: true, message: "User registered successfully!" });
    });
  });
});

// LOGIN ENDPOINT (checks hashed password)
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;

  if (!username || !password)
    return res.json({ success: false, message: "Missing fields." });

  const sql = "SELECT * FROM users WHERE username = ?";
  db.query(sql, [username], (err, results) => {
    if (err) throw err;

    if (results.length === 0) {
      return res.json({ success: false, message: "User not found." });
    }

    const user = results[0];

    // Compare plain password with hashed password
    bcrypt.compare(password, user.password, (err, match) => {
      if (err) throw err;

      if (match) {
        return res.json({ success: true, message: "Login successful!" });
      } else {
        return res.json({ success: false, message: "Wrong password." });
      }
    });
  });
});

app.get("/api/db-test", (req, res) => {
  const sql = "SELECT 1 + 1 AS result"; // simple query
  db.query(sql, (err, results) => {
    if (err) {
      console.error("DB Connection Error:", err);
      return res.json({ success: false, message: "Database not connected" });
    }
    res.json({ success: true, message: "Database connected", data: results[0] });
  });
});


// Start server
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on port ${port}`));
