const mongoose = require("mongoose");
const Review = require("../models/reviewModel");
const Movie = require("../models/movieModel");

// write a review (or update your existing one)
const saveReview = async (req, res) => {
  try {
    const { movieId, rating, comment } = req.body;

    if (!mongoose.isValidObjectId(movieId)) {
      return res.status(400).json({ message: "A valid movieId is required" });
    }
    const stars = Number(rating);
    if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
      return res.status(400).json({ message: "Rating must be a whole number from 1 to 5" });
    }
    const movie = await Movie.findById(movieId);
    if (!movie) return res.status(404).json({ message: "Movie not found" });

    const review = await Review.findOneAndUpdate(
      { user: req.user._id, movie: movieId },
      { user: req.user._id, movie: movieId, rating: stars, comment },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    );
    res.status(201).json(review);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// all reviews of one movie, with the average rating
const getMovieReviews = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.movieId)) {
      return res.status(400).json({ message: "Invalid movie id" });
    }
    const reviews = await Review.find({ movie: req.params.movieId })
      .populate("user", "name")
      .sort({ createdAt: -1 });

    const count = reviews.length;
    const average = count
      ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / count) * 10) / 10
      : 0;

    res.json({ average, count, reviews });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// delete a review (the owner or an admin)
const deleteReview = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid review id" });
    }
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: "Review not found" });

    const isOwner = review.user.toString() === req.user._id.toString();
    if (!isOwner && req.user.role !== "admin") {
      return res.status(403).json({ message: "You can only delete your own review" });
    }
    await review.deleteOne();
    res.json({ message: "Review deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// every review (admin moderation)
const getAllReviews = async (req, res) => {
  try {
    const reviews = await Review.find()
      .populate("user", "name email")
      .populate("movie", "title")
      .sort({ createdAt: -1 });
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { saveReview, getMovieReviews, deleteReview, getAllReviews };