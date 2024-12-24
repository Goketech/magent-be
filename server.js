require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const connectDB = require("./config/database");
const { globalLimiter } = require("./middlewares/rateLimit");

const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(helmet());
app.use(
  cors({
    origin: ["https://www.hellomagent.com"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());
app.use(globalLimiter);

// Routes
app.get("/", (req, res) => {
  res.json({ message: "Welcome to the API" });
});
app.get("/workspace", (req, res) => {
  res.json({ message: "Welcome to the API" });
});

app.use("/auth", require("./routes/auth"));
app.use("/api", require("./routes/api"));

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something broke!" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
