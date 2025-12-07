const express = require("express");
const app = express();
const cors = require("cors");
const path = require("path");
const db = require("./db");
const bcrypt = require("bcryptjs");
const OpenAI = require("openai");
const jwt = require("jsonwebtoken");
require("dotenv").config();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

app.use(express.static(path.join(__dirname, "frontend-test")));
app.use("/admin", express.static(path.join(__dirname, "frontend-test/admin")));
app.use("/admin2", express.static(path.join(__dirname, "frontend-test/admin2")));
app.use("/client-folder", express.static(path.join(__dirname,"frontend-test/client-folder")));

/* -------------------------------
   JWT AUTH MIDDLEWARE
--------------------------------*/
function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader)
        return res.status(401).json({ error: "Missing token" });

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; 
        next();
    } catch (err) {
        res.status(403).json({ error: "Invalid or expired token" });
    }
}

function requireAdmin(req, res, next) {
    if (req.user.user_type !== "Admin") {
        return res.status(403).json({ error: "Admin access only" });
    }
    next();
}

function requireClient(req, res, next) {
    if (req.user.user_type !== "Client") {
        return res.status(403).json({ error: "Client access only" });
    }
    next();
}

function requireIT(req, res, next) {
    if (req.user.user_type !== "IT") {
        return res.status(403).json({ error: "IT access only" });
    }
    next();
}

/* -------------------------------
   OPENAI ENDPOINT (unchanged)
--------------------------------*/
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.post("/api/chat", async (req, res) => {
    const { message } = req.body;

    const response = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: message }],
    });

    res.json({ reply: response.choices[0].message.content });
});

/* -------------------------------
   LOGIN
--------------------------------*/
app.post("/api/login", async (req, res) => {
    const { username, password } = req.body;

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
            token,
            user_type: user.user_type,
            user_name: user.user_name,
            id: user.id
        });

    } catch (err) {
        res.status(500).json({ message: "Login failed" });
    }
});

/* -------------------------------
      IT USER MANAGEMENT
      (IT ONLY)
--------------------------------*/

// GET USERS
app.get("/api/admin/users", requireAuth, requireIT, async (req, res) => {
    try {
        const users = await db.query("SELECT id, user_name, user_type, date_created FROM users ORDER BY id ASC");
        res.json({ success: true, users: users.rows });
    } catch (err) {
        res.status(500).json({ message: "Failed to load users" });
    }
});

// ADD USER
app.post("/api/register", requireAuth, requireIT, async (req, res) => {
    const { user_name, pass_word, user_type } = req.body;

    try {
        const hashed = await bcrypt.hash(pass_word, 10);

        const result = await db.query(
            `INSERT INTO users (user_name, pass_word, user_type)
             VALUES ($1, $2, $3)
             RETURNING id`,
            [user_name, hashed, user_type]
        );

        res.json({ success: true, userId: result.rows[0].id });
    } catch (err) {
        res.status(500).json({ message: "Failed to create user" });
    }
});

// UPDATE USER
app.put("/api/admin/users/:id", requireAuth, requireIT, async (req, res) => {
    const { id } = req.params;
    const { user_name, pass_word, user_type } = req.body;

    let sql = "";
    let params = [];

    try {
        if (pass_word) {
            const hash = await bcrypt.hash(pass_word, 10);
            sql = `
                UPDATE users SET user_name=$1, pass_word=$2, user_type=$3
                WHERE id=$4
            `;
            params = [user_name, hash, user_type, id];
        } else {
            sql = `
                UPDATE users SET user_name=$1, user_type=$2
                WHERE id=$3
            `;
            params = [user_name, user_type, id];
        }

        await db.query(sql, params);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ message: "Update failed" });
    }
});

// DELETE USER
app.delete("/api/admin/users/:id", requireAuth, requireIT, async (req, res) => {
    try {
        await db.query("DELETE FROM users WHERE id=$1", [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ message: "Delete failed" });
    }
});

/* -------------------------------
      CLIENT CLAIM SUBMISSION
--------------------------------*/

// CLIENT SUBMITS A CLAIM
app.post("/api/client/submit", requireAuth, requireClient, async (req, res) => {
    const { claim_code, claim_amount, hospital_name, patient_name, date_of_claim } = req.body;
    const submitted_by = req.user.id;

    try {
        const result = await db.query(
            `INSERT INTO claims 
             (claim_code, claim_amount, hospital_name, patient_name, date_of_claim, submitted_by)
             VALUES ($1,$2,$3,$4,$5,$6)
             RETURNING *`,
            [claim_code, claim_amount, hospital_name, patient_name, date_of_claim, submitted_by]
        );

        res.json({ success: true, claim: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: "Failed to submit claim" });
    }
});

// CLIENT FETCH THEIR CLAIMS
app.get("/api/client/my-claims", requireAuth, requireClient, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT c.*, u.user_name AS submitted_by_name
             FROM claims c
             LEFT JOIN users u ON c.submitted_by = u.id
             WHERE submitted_by = $1
             ORDER BY claim_date_created DESC`,
            [req.user.id]
        );

        res.json({ claims: result.rows });
    } catch (err) {
        res.status(500).json({ error: "Failed to load claims" });
    }
});

/* -------------------------------
      ADMIN CLAIM MANAGEMENT
--------------------------------*/

// ADMIN GET ALL CLAIMS
app.get("/api/admin2/claims", requireAuth, requireAdmin, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT c.*, u.user_name AS submitted_by_name
             FROM claims c
             LEFT JOIN users u ON c.submitted_by = u.id
             ORDER BY claim_id DESC`
        );

        res.json({ claims: result.rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// UPDATE CLAIM STATUS
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

app.put("/api/admin2/claims/:id/approve", requireAuth, requireAdmin, (req, res) => {
    updateClaimStatus(req.params.id, "Approved", res);
});

app.put("/api/admin2/claims/:id/deny", requireAuth, requireAdmin, (req, res) => {
    updateClaimStatus(req.params.id, "Denied", res);
});

app.put("/api/admin2/claims/:id/resubmit", requireAuth, requireAdmin, (req, res) => {
    updateClaimStatus(req.params.id, "Resubmit", res);
});

// CLAIMS STATS
app.get("/api/admin2/claim-stats", requireAuth, requireAdmin, async (req, res) => {
    try {
        const stats = await db.query(`
            SELECT
                COUNT(*) FILTER (WHERE claim_status='Pending') AS pending,
                COUNT(*) FILTER (WHERE claim_status='Approved') AS approved,
                COUNT(*) FILTER (WHERE claim_status='Denied') AS denied,
                COUNT(*) FILTER (WHERE claim_status='Resubmit') AS resubmit,
                COUNT(*) AS total
            FROM claims
        `);

        res.json(stats.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* -------------------------------
   FALLBACK ROUTE
--------------------------------*/
app.get(/^\/(?!api).*/, (req, res) => {
    res.sendFile(path.join(__dirname, "frontend-test/login.html"));
});

/* -------------------------------
   START SERVER
--------------------------------*/
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`🚀 Server running on port ${port}`));
