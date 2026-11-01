const User = require("../models/userModel");
const Favourite = require("../models/favoriteModel");
const bcrypt = require("bcryptjs");

// @desc    Get current user profile
// @route   GET /api/users/profile
// @access  Private
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateProfile = async (req, res) => {
  try {
    const { name, phone } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (name !== undefined) {
      if (typeof name !== "string") {
        return res.status(400).json({ message: "Name must be a valid text string." });
      }
      const trimmedName = name.trim();
      if (!trimmedName) {
        return res.status(400).json({ message: "Name cannot be empty or contain only spaces." });
      }
      if (trimmedName.length < 2) {
        return res.status(400).json({ message: "Name must be at least 2 characters long." });
      }
      if (trimmedName.length > 50) {
        return res.status(400).json({ message: "Name cannot exceed 50 characters." });
      }
      const nameRegex = /^[a-zA-Z\s'-]+$/;
      if (!nameRegex.test(trimmedName)) {
        return res.status(400).json({
          message: "Name can only contain alphabetic letters, spaces, hyphens (-), and apostrophes (').",
        });
      }
      user.name = trimmedName;
    }

    if (phone !== undefined) {
      user.phone = typeof phone === "string" ? phone.trim() : phone;
    }

    const updatedUser = await user.save();
    const safeUserData = {
      _id: updatedUser._id,
      id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      phone: updatedUser.phone,
      role: updatedUser.role,
      createdAt: updatedUser.createdAt,
    };

    res.json({
      success: true,
      message: "Profile updated successfully",
      ...safeUserData,
      user: safeUserData,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Change password
// @route   PUT /api/users/change-password
// @access  Private
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Both current and new password are required" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters" });
    }

    const user = await User.findById(req.user._id).select("+password");
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Incorrect current password" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get user favourites
// @route   GET /api/users/favourites
// @access  Private
const getFavourites = async (req, res) => {
  try {
    const favourites = await Favourite.find({ user: req.user._id })
      .populate("movie")
      .sort({ createdAt: -1 });
    res.json(favourites);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Add movie to favourites
// @route   POST /api/users/favourites/:movieId
// @access  Private
const addFavourite = async (req, res) => {
  try {
    const { movieId } = req.params;
    const existing = await Favourite.findOne({
      user: req.user._id,
      movie: movieId,
    });

    if (existing) {
      return res.json({ message: "Movie already in favourites", favourite: existing });
    }

    const favourite = await Favourite.create({
      user: req.user._id,
      movie: movieId,
    });

    const populated = await Favourite.findById(favourite._id).populate("movie");
    res.status(201).json({ message: "Added to favourites", favourite: populated });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Remove movie from favourites
// @route   DELETE /api/users/favourites/:movieId
// @access  Private
const removeFavourite = async (req, res) => {
  try {
    const { movieId } = req.params;
    await Favourite.findOneAndDelete({
      user: req.user._id,
      movie: movieId,
    });
    res.json({ message: "Removed from favourites" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get all users (Admin only)
// @route   GET /api/users
// @access  Private/Admin
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete user (Admin only)
// @route   DELETE /api/users/:id
// @access  Private/Admin
const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: "Cannot delete your own admin account" });
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  changePassword,
  getFavourites,
  addFavourite,
  removeFavourite,
  getAllUsers,
  deleteUser,
};
