const mongoose = require("mongoose");
const Theatre = require("../models/theatreModel");
const Show = require("../models/showModel");

// @desc    Get all theatres, optionally filtered by city, movie, or active shows
// @route   GET /api/theatres
// @access  Public
const getTheatres = async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.json([]);
    }
    const { city, chain, movie, hasShows } = req.query;
    const filter = {};

    if (city && city !== "All") {
      filter.city = new RegExp(`^${city.trim()}$`, "i");
    }

    if (chain && chain !== "All") {
      filter.chain = new RegExp(`^${chain.trim()}$`, "i");
    }

    // Only show theatres screening the selected movie
    if (movie) {
      const showFilter = { movie, showTime: { $gte: new Date() } };
      const theatreIds = await Show.distinct("theatre", showFilter);
      filter._id = { $in: theatreIds };
    } else if (hasShows === "true") {
      // Hide theatres with zero active scheduled shows
      const theatreIds = await Show.distinct("theatre", {
        showTime: { $gte: new Date() },
      });
      filter._id = { $in: theatreIds };
    }

    const theatres = await Theatre.find(filter).sort({ name: 1 });
    res.json(theatres);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single theatre by ID
// @route   GET /api/theatres/:id
// @access  Public
const getTheatreById = async (req, res) => {
  try {
    const theatre = await Theatre.findById(req.params.id);
    if (!theatre) return res.status(404).json({ message: "Theatre not found" });
    res.json(theatre);
  } catch (error) {
    res.status(400).json({ message: "Invalid theatre ID" });
  }
};

// @desc    Create a new theatre
// @route   POST /api/theatres
// @access  Private/Admin
const createTheatre = async (req, res) => {
  try {
    const theatre = await Theatre.create(req.body);
    res.status(201).json(theatre);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Update a theatre
// @route   PUT /api/theatres/:id
// @access  Private/Admin
const updateTheatre = async (req, res) => {
  try {
    const theatre = await Theatre.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!theatre) return res.status(404).json({ message: "Theatre not found" });
    res.json(theatre);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Delete a theatre
// @route   DELETE /api/theatres/:id
// @access  Private/Admin
const deleteTheatre = async (req, res) => {
  try {
    const theatre = await Theatre.findByIdAndDelete(req.params.id);
    if (!theatre) return res.status(404).json({ message: "Theatre not found" });

    // Also delete shows in this theatre
    await Show.deleteMany({ theatre: req.params.id });

    res.json({ message: "Theatre and its scheduled shows deleted successfully" });
  } catch (error) {
    res.status(400).json({ message: "Invalid theatre ID" });
  }
};

module.exports = {
  createTheatre,
  getTheatres,
  getTheatreById,
  updateTheatre,
  deleteTheatre,
};
