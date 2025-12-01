import dotenv from "dotenv";
// Load environment variables FIRST before any other imports
dotenv.config();

import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { database } from "./config/database";
import router from "./routes";

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());

// CORS configuration
const allowedOrigins = (
  process.env.ALLOWED_ORIGINS || "http://localhost:4200"
).split(",");
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later",
});
app.use("/api", limiter);

// Body parsing middleware - increased limit for image uploads
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));

// API routes
app.use("/api", router);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Error handler
app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error("Error:", err);
    res.status(err.status || 500).json({
      message: err.message || "Internal server error",
      ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
    });
  }
);

// Start server
const startServer = async () => {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017";
    const dbName = process.env.DATABASE_NAME || "library";
    await database.connect(mongoUri, dbName);

    // Start Express server
    app.listen(PORT, () => {
      console.log(`========================================`);
      console.log(`Library Management Backend Server`);
      console.log(`========================================`);
      console.log(`✓ Server running on port ${PORT}`);
      console.log(`✓ Environment: ${process.env.NODE_ENV || "development"}`);
      console.log(`✓ API: http://localhost:${PORT}/api`);
      console.log(`✓ Health: http://localhost:${PORT}/health`);
      console.log(`========================================`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

// Handle shutdown
process.on("SIGINT", async () => {
  console.log("\nShutting down gracefully...");
  await database.disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\nShutting down gracefully...");
  await database.disconnect();
  process.exit(0);
});

startServer();
