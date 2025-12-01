const express = require("express");
const app = express();
const cors = require("cors");
const path = require("path");

app.use(cors());
app.use(express.json());

// Serve static files from the "frontend-test" folder
app.use(express.static(path.join(__dirname, "frontend-test")));

// Optional: serve home.html on root explicitly
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "frontend-test", "home.html"));
});

// Test API endpoint
app.get("/api/test", (req, res) => {
    res.json({ message: "Hello from Render backend!" });
});

// OpenAI chat endpoint
const OpenAI = require("openai");
const client = new OpenAI({ apiKey: process.env.OPENAI_KEY });

app.post("/api/chat", async (req, res) => {
  const { message } = req.body;

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: message }],
  });

  res.json({ reply: response.choices[0].message.content });
});

// Use Render's port or 3000 locally
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on port ${port}`));
