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
    origin: ["https://www.hellomagent.com", "http://localhost:3000"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

// Trust reverse proxy
app.set("trust proxy", 1);

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
app.use("/twitter", require("./routes/twitter"));
app.use("/transactions", require("./routes/transactions"));
app.use("/campaign", require("./routes/campaign"));
app.use("/admin", require("./routes/admin"));
app.use("/form", require("./routes/form"));
app.use("/newsletter", require("./routes/newsletter"));

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something broke!" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
