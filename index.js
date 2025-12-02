const express = require("express");
const app = express();
const cors = require("cors");
const path = require("path");
const db = require("./db"); // db.js now uses pg
const bcrypt = require("bcryptjs");
const OpenAI = require("openai");
require("dotenv").config();

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
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.post("/api/chat", async (req, res) => {
  const { message } = req.body;

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: message }],
  });

  res.json({ reply: response.choices[0].message.content });
});

// REGISTER ENDPOINT
app.post("/api/register", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password)
    return res.json({ success: false, message: "Missing fields." });

  try {
    const hash = await bcrypt.hash(password, 10);
    const sql = "INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id";
    const result = await db.query(sql, [username, hash]);
    res.json({ success: true, message: "User registered successfully!", userId: result.rows[0].id });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: "User creation failed." });
  }
});

// LOGIN ENDPOINT
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password)
    return res.json({ success: false, message: "Missing fields." });

  try {
    const sql = "SELECT * FROM users WHERE username = $1";
    const result = await db.query(sql, [username]);

    if (result.rows.length === 0) {
      return res.json({ success: false, message: "User not found." });
    }

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password);

    if (match) {
      return res.json({ success: true, message: "Login successful!" });
    } else {
      return res.json({ success: false, message: "Wrong password." });
    }
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: "Login failed." });
  }
});

// DB TEST
app.get("/api/db-test", async (req, res) => {
  try {
    const result = await db.query("SELECT 1 + 1 AS result");
    res.json({ success: true, message: "Database connected", data: result.rows[0] });
  } catch (err) {
    console.error("DB Connection Error:", err);
    res.json({ success: false, message: "Database not connected" });
  }
});

// Start server
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on port ${port}`));
