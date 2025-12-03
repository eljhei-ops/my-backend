const express = require("express");
const app = express();
const cors = require("cors");
const path = require("path");
const db = require("./db"); 
const bcrypt = require("bcryptjs");
const OpenAI = require("openai");
const VALID_TYPES = ["IT", "Admin", "Client"];
const jwt = require("jsonwebtoken");
require("dotenv").config();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Serve static frontend files
app.use(express.static(path.join(__dirname, "frontend-test")));
app.use("/admin", express.static(path.join(__dirname, "frontend-test/admin")));
app.use("/admin2", express.static(path.join(__dirname, "frontend-test/admin2")));

/* ---------------------------------------------------
   TEST API
--------------------------------------------------- */
app.get("/api/test", (req, res) => {
  res.json({ message: "Hello from Render backend!" });
});

/* ---------------------------------------------------
   OPENAI ENDPOINT
--------------------------------------------------- */
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.post("/api/chat", async (req, res) => {
  const { message } = req.body;

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: message }],
  });

  res.json({ reply: response.choices[0].message.content });
});

/* ---------------------------------------------------
   ADMIN DASHBOARD – USER STATS
--------------------------------------------------- */
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

/* ---------------------------------------------------
   USER CRUD (IT ADMIN)
--------------------------------------------------- */
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
    return res.json({ success: false, message: "Invalid user_type." });

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

/* ---------------------------------------------------
   LOGIN
--------------------------------------------------- */
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password)
    return res.json({ success: false, message: "Missing fields." });

  try {
    const result = await db.query("SELECT * FROM users WHERE user_name = $1", [username]);

    if (result.rows.length === 0)
      return res.json({ success: false, message: "User not found." });

    const user = result.rows[0];

    const match = await bcrypt.compare(password, user.pass_word);
    if (!match)
      return res.json({ success: false, message: "Wrong password." });

    const token = jwt.sign(
      { id: user.id, username: user.user_name, user_type: user.user_type },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    res.json({
      success: true,
      message: "Login successful!",
      token,
      user_type: user.user_type,
      user_name: user.user_name,
      user_id: user.id
    });

  } catch (err) {
    console.error(err);
    res.json({ success: false, message: "Login failed." });
  }
});

/* ---------------------------------------------------
   CLAIMS MODULE (Admin2)
--------------------------------------------------- */

// GET ALL CLAIMS
app.get('/api/admin2/claims', async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM claims ORDER BY claim_id DESC");
    res.json({ claims: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// SUBMIT CLAIM
app.post('/api/admin2/claims', async (req, res) => {
  const {
    claim_code,
    claim_amount,
    hospital_name,
    patient_name,
    submitted_by,
  } = req.body;

  try {
    const sql = `
      INSERT INTO claims
      (claim_code, claim_amount, hospital_name, patient_name, submitted_by)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const result = await db.query(sql, [
      claim_code,
      claim_amount,
      hospital_name,
      patient_name,
      submitted_by,
    ]);

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Shared status updater
async function updateClaimStatus(id, status, res) {
  try {
    const sql = `
      UPDATE claims
      SET claim_status = $1, claim_date_updated = NOW()
      WHERE claim_id = $2
      RETURNING *
    `;
    const result = await db.query(sql, [status, id]);

    if (result.rows.length === 0)
      return res.status(404).json({ error: "Claim not found" });

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// APPROVE
app.put('/api/admin2/claims/:id/approve', (req, res) => {
  updateClaimStatus(req.params.id, "Approved", res);
});

// DENY
app.put('/api/admin2/claims/:id/deny', (req, res) => {
  updateClaimStatus(req.params.id, "Denied", res);
});

// RESUBMIT
app.put('/api/admin2/claims/:id/resubmit', (req, res) => {
  updateClaimStatus(req.params.id, "Resubmit", res);
});

// CLAIMS STATS
app.get('/api/admin2/stats', async (req, res) => {
  try {
    const sql = `
      SELECT
        COUNT(*) FILTER (WHERE claim_status = 'Pending') AS pending,
        COUNT(*) FILTER (WHERE claim_status = 'Approved') AS approved,
        COUNT(*) FILTER (WHERE claim_status = 'Denied') AS denied,
        COUNT(*) FILTER (WHERE claim_status = 'Resubmit') AS resubmit,
        COUNT(*) AS total
      FROM claims
    `;
    const result = await db.query(sql);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ---------------------------------------------------
   FALLBACK → LOAD login.html
--------------------------------------------------- */
app.get(/^\/(?!api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, "frontend-test/login.html"));
});


/* ---------------------------------------------------
   START SERVER
--------------------------------------------------- */
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`🚀 Server running on port ${port}`));
