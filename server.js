require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const connectDB = require("./config/database");
const { globalLimiter } = require("./middlewares/rateLimit");
const jobScheduler = require("./scheduler");

const app = express();

// Connect to MongoDB and initialize job scheduler
const initializeApp = async () => {
  try {
    // Connect to MongoDB first
    await connectDB();

    // Initialize job scheduler after database connection is established
    await jobScheduler.initialize();
    console.log("Job scheduler initialized successfully");
  } catch (error) {
    console.error("Application initialization error:", error);
    process.exit(1);
  }
};

// Initialize the application
initializeApp();

// Middleware
app.use(helmet());
app.use(
  cors({
    origin: [
      "https://www.hellomagent.com",
      "https://hellomagent.com",
      "http://localhost:3000",
      "http://localhost:8771",
    ],
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

// Health check endpoint that includes job scheduler status
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    message: "API is running",
    scheduledJobs: jobScheduler.getActiveJobs(),
    timestamp: new Date().toISOString(),
  });
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
  console.log(
    `Active scheduled jobs: ${
      jobScheduler.getActiveJobs().join(", ") || "None"
    }`
  );
});

// Handle graceful shutdown
// const gracefulShutdown = async (signal) => {
//   console.log(`${signal} received, shutting down gracefully...`);

//   try {
//     if (jobScheduler && typeof jobScheduler.shutdown === "function") {
//       await jobScheduler.shutdown();
//     }
//     console.log("Application shut down successfully");
//     process.exit(0);
//   } catch (error) {
//     console.error("Error during shutdown:", error);
//     process.exit(1);
//   }
// };

// process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
// process.on("SIGINT", () => gracefulShutdown("SIGINT"));
