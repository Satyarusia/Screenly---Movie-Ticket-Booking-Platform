const express = require("express");
const router = express.Router();
const {
  createShow,
  getShows,
  getShowById,
  getShowSeats,
  updateShow,
  deleteShow,
} = require("../controllers/showController");
const { protect, adminOnly } = require("../middleware/authMiddleware");

router.get("/", getShows);
router.get("/:id", getShowById);
router.get("/:id/seats", getShowSeats);

router.post("/", protect, adminOnly, createShow);
router.put("/:id", protect, adminOnly, updateShow);
router.delete("/:id", protect, adminOnly, deleteShow);

module.exports = router;