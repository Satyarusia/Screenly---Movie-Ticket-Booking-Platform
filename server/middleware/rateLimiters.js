const rateLimit = require("express-rate-limit");

const isProduction = process.env.NODE_ENV === "production";

// for the whole API
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isProduction ? 300 : 5000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests. Please try again in a few minutes." },
});

// stricter, for login and register (stops password guessing)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isProduction ? 10 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many attempts. Please try again in 15 minutes." },
});

module.exports = { apiLimiter, authLimiter };