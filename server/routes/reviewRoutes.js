const express = require("express");
const router = express.Router();
const {
  saveReview,
  getMovieReviews,
  deleteReview,
  getAllReviews,
} = require("../controllers/reviewController");
const { protect, adminOnly } = require("../middleware/authMiddleware");

router.get("/movie/:movieId", getMovieReviews);

router.post("/", protect, saveReview);
router.get("/", protect, adminOnly, getAllReviews);
router.delete("/:id", protect, deleteReview);

module.exports = router;