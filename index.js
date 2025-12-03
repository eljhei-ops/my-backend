const express = require("express");
const app = express();
const cors = require("cors");
const path = require("path");
const db = require("./db"); // db.js now uses pg
const bcrypt = require("bcryptjs");
const OpenAI = require("openai");
const VALID_TYPES = ["IT", "Admin", "Client"];
const jwt = require("jsonwebtoken");
require("dotenv").config();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Serve static files
app.use(express.static(path.join(__dirname, "frontend-test")));

    // If the request is for an actual file (html/js/css/img), but the file does not exist → 404
    if (req.path.match(/\.(html|js|css|png|jpg|jpeg|gif|svg)$/)) {
        return res.status(404).send("File not found");
    }

    // Otherwise return login page
    res.sendFile(path.join(__dirname, "frontend-test", "login.html"));
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
  const { username, password, usertype } = req.body;

  if (!username || !password || !usertype) {
    return res.json({ success: false, message: "Missing fields." });
  }

  // Valid types (case-insensitive allowed from frontend)
  const allowedTypes = ["IT", "Admin", "Client"];

  // Normalize casing (Admin, Client)
  const formattedType =
    usertype.charAt(0).toUpperCase() + usertype.slice(1).toLowerCase();

  if (!allowedTypes.includes(formattedType)) {
    return res.json({
      success: false,
      message: "Invalid user type. Must be IT, Admin, or Client.",
    });
  }

  try {
    const hash = await bcrypt.hash(password, 10);

    const sql = `
      INSERT INTO users (user_name, pass_word, user_type)
      VALUES ($1, $2, $3)
      RETURNING id
    `;

    const result = await db.query(sql, [username, hash, formattedType]);

    res.json({
      success: true,
      message: "User registered successfully!",
      userId: result.rows[0].id,
    });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: "User creation failed." });
  }
});


// ADMIN DASHBOARD

// IT ADMIN STATS

app.get("/api/admin/stats", async (req, res) => {
  try {
    const total = await db.query("SELECT COUNT(*) FROM users");
    const it = await db.query("SELECT COUNT(*) FROM users WHERE user_type='IT'");
    const admin = await db.query("SELECT COUNT(*) FROM users WHERE user_type='Admin'");
    const client = await db.query("SELECT COUNT(*) FROM users WHERE user_type='Client'");

    res.json({
      total_users: total.rows[0].count,
      total_it: it.rows[0].count,
      total_admin: admin.rows[0].count,
      total_client: client.rows[0].count
    });

  } catch (err) {
    console.error(err);
    res.json({ success: false });
  }
});

// GET ALL USER
app.get("/api/admin/users", async (req, res) => {
  try {
    const sql = "SELECT id, user_name, user_type, date_created FROM users ORDER BY id ASC";
    const result = await db.query(sql);
    res.json({ success: true, users: result.rows });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: "Failed to fetch users." });
  }
});

// ADD USER
app.post("/api/register", async (req, res) => {
  const { user_name, pass_word, user_type } = req.body;

  if (!user_name || !pass_word)
    return res.json({ success: false, message: "Missing fields." });

  // If first user → force type to IT
  const existingUsers = await db.query("SELECT COUNT(*) FROM users");
  const isFirstUser = Number(existingUsers.rows[0].count) === 0;

  const finalType = isFirstUser ? "IT" : user_type;

  if (!VALID_TYPES.includes(finalType))
    return res.json({ success: false, message: "Invalid user type." });

  try {
    const hash = await bcrypt.hash(pass_word, 10);

    const sql = `
      INSERT INTO users (user_name, pass_word, user_type, date_created)
      VALUES ($1, $2, $3, NOW())
      RETURNING id
    `;

    const result = await db.query(sql, [user_name, hash, finalType]);

    res.json({
      success: true,
      message: "User registered successfully!",
      userId: result.rows[0].id,
      user_type: finalType
    });

  } catch (err) {
    console.error(err);
    res.json({ success: false, message: "User creation failed." });
  }
});


// UPDATE USER
app.put("/api/admin/users/:id", async (req, res) => {
  const { user_name, pass_word, user_type } = req.body;
  const { id } = req.params;

  if (!VALID_TYPES.includes(user_type))
    return res.json({ success: false, message: "Invalid user_type. Allowed: IT, Admin, Client" });

  try {
    let sql = "";
    let params = [];

    if (pass_word) {
      const hash = await bcrypt.hash(pass_word, 10);

      sql = `
        UPDATE users SET
        user_name = $1,
        pass_word = $2,
        user_type = $3
        WHERE id = $4
      `;

      params = [user_name, hash, user_type, id];

    } else {
      sql = `
        UPDATE users SET
        user_name = $1,
        user_type = $2
        WHERE id = $3
      `;

      params = [user_name, user_type, id];
    }

    await db.query(sql, params);
    res.json({ success: true, message: "User updated successfully!" });

  } catch (err) {
    console.error(err);
    res.json({ success: false, message: "Failed to update user." });
  }
});

// DELETE USER
app.delete("/api/admin/users/:id", async (req, res) => {
  const { id } = req.params;

  try {
    await db.query("DELETE FROM users WHERE id = $1", [id]);
    res.json({ success: true, message: "User deleted successfully!" });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: "Failed to delete user." });
  }
});


// LOGIN ENDPOINT
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;

  console.log("---- LOGIN DEBUG ----");
  console.log("BODY:", req.body);
  console.log("USERNAME:", username);
  console.log("PASSWORD PROVIDED:", password);

  if (!username || !password)
    return res.json({ success: false, message: "Missing fields." });

  try {
    const sql = "SELECT * FROM users WHERE user_name = $1";
    const result = await db.query(sql, [username]);

    if (result.rows.length === 0) {
      return res.json({ success: false, message: "User not found." });
    }

    const user = result.rows[0];

    console.log("HASH IN DB:", user.pass_word);

    const match = await bcrypt.compare(password, user.pass_word);

    if (!match) {
      return res.json({ success: false, message: "Wrong password." });
    }

    // Create a JWT token
    const token = jwt.sign(
      {
        id: user.id,
        username: user.user_name,
        user_type: user.user_type
      },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    return res.json({
      success: true,
      message: "Login successful!",
      token: token,
      user_type: user.user_type,
      user_name: user.user_name,
      user_id: user.id
    });

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

// Fallback route for ALL non-API requests (Express 5 safe)
app.get(/^(?!\/api\/).*/, (req, res) => {
    res.sendFile(path.join(__dirname, "frontend-test", "login.html"));
});


// Test DB connection on server start
db.query("SELECT NOW() AS now")
  .then(res => console.log("✅ Database connected! Current time:", res.rows[0].now))
  .catch(err => console.error("❌ DB connection error:", err));

// Start server
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on port ${port}`));
