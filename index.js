const express = require("express");
const app = express();

app.use(express.json());

app.get("/", (req, res) => {
    res.send("Server is running!");
});

app.get("/api/test", (req, res) => {
    res.json({ message: "Hello from Render backend!" });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on port ${port}`));
