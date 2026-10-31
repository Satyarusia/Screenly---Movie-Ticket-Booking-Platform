const mongoose = require("mongoose");

const favoriteSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    movie: { type: mongoose.Schema.Types.ObjectId, ref: "Movie", required: true },
  },
  { timestamps: true }
);

// a user can save a movie only once
favoriteSchema.index({ user: 1, movie: 1 }, { unique: true });

module.exports = mongoose.model("Favorite", favoriteSchema);