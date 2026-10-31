const express = require("express");
const router = express.Router();
const { getAdminStats } = require("../controllers/adminController");
const { protect, adminOnly } = require("../middleware/authMiddleware");

// All admin routes require login + admin role
router.use(protect, adminOnly);

router.get("/stats", getAdminStats);

module.exports = router;
