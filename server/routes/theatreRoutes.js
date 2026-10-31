const express = require("express");
const router = express.Router();
const {
  createTheatre,
  getTheatres,
  getTheatreById,
  updateTheatre,
  deleteTheatre,
} = require("../controllers/theatreController");
const { protect, adminOnly } = require("../middleware/authMiddleware");

router.get("/", getTheatres);
router.get("/:id", getTheatreById);

router.post("/", protect, adminOnly, createTheatre);
router.put("/:id", protect, adminOnly, updateTheatre);
router.delete("/:id", protect, adminOnly, deleteTheatre);

module.exports = router;