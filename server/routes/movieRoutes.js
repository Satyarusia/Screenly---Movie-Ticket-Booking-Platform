const express = require("express");
const router = express.Router();
const {
  createMovie,
  getMovies,
  getMovieById,
  updateMovie,
  deleteMovie,
  proxyImage,
  getAvailablePosters,
} = require("../controllers/movieController");
const { protect, adminOnly } = require("../middleware/authMiddleware");

// Anyone can look at movies & proxy images
router.get("/image-proxy", proxyImage);
router.get("/posters/available", protect, adminOnly, getAvailablePosters);
router.get("/", getMovies);
router.get("/:id", getMovieById);

// Only a logged-in admin can change movies
router.post("/", protect, adminOnly, createMovie);
router.put("/:id", protect, adminOnly, updateMovie);
router.delete("/:id", protect, adminOnly, deleteMovie);

module.exports = router;
