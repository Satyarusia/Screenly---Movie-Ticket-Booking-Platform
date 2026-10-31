const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const connectDB = require("./config/db");
const { startCleanup } = require("./utils/cleanupService");
const { syncRealWorldMovieAvailability } = require("./services/tmdbSyncService");
const { apiLimiter, authLimiter } = require("./middleware/rateLimiters");
const sanitizeInput = require("./middleware/sanitizeInput");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");

// Active Core Route Imports
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const movieRoutes = require("./routes/movieRoutes");
const theatreRoutes = require("./routes/theatreRoutes");
const showRoutes = require("./routes/showRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const adminRoutes = require("./routes/adminRoutes");

// Initialize Database Connection
connectDB().then((connected) => {
  if (connected) {
    // Sync real-world movie availability on startup
    syncRealWorldMovieAvailability().catch((err) =>
      console.error("Initial theatrical sync error:", err.message)
    );
  }
});

// Start background cleanup task for expired held bookings (runs every 60s)
startCleanup();

// Continuous real-world movie availability & schedule synchronization (runs every 30 mins)
setInterval(() => {
  const mongoose = require("mongoose");
  if (mongoose.connection.readyState === 1) {
    syncRealWorldMovieAvailability().catch((err) =>
      console.error("Scheduled theatrical sync error:", err.message)
    );
  }
}, 30 * 60 * 1000);

const app = express();

// Middlewares
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(sanitizeInput);

// Static Poster Serving (enables direct loading from backend port 5000)
const posterDir = path.join(__dirname, "..", "client", "public", "posters");
app.use("/posters", express.static(posterDir, { maxAge: "7d" }));

app.use("/api", apiLimiter);
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);

// Root test route
app.get("/", (req, res) => {
  res.json({
    status: "online",
    message: "Screenly Cinema Backend API is running smoothly",
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/movies", movieRoutes);
app.use("/api/theatres", theatreRoutes);
app.use("/api/shows", showRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/admin", adminRoutes);

// Error Middlewares (must stay last)
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`==========================================`);
  console.log(` Screenly Server running on port ${PORT}`);
  console.log(` API URL: http://localhost:${PORT}`);
  console.log(`==========================================`);
});

module.exports = app;
