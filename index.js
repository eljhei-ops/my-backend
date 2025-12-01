const express = require("express");
const app = express();

app.use(express.json());

app.get("/", (req, res) => {
     app.use(express.static("Home"));

});

app.get("/api/test", (req, res) => {
    res.json({ message: "Hello from Render backend!" });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on port ${port}`));

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
