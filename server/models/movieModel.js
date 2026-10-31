const mongoose = require("mongoose");

const movieSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    movieName: { type: String, trim: true },
    poster: { type: String },
    media: { type: String },
    backdrop: { type: String },
    rating: { type: Number, default: 8.0 },
    language: { type: String, default: "Hindi" },
    genres: [{ type: String }],
    genre: [{ type: String }],
    cast: [{ type: String }],
    director: { type: String, trim: true },
    crew: [{ type: String }],
    duration: { type: Number, default: 150 },
    runtime: { type: Number },
    certification: { type: String, default: "U/A" },
    releaseDate: { type: Date },
    description: { type: String },
    trailerYoutubeId: { type: String },
    theatricalStatus: {
      type: String,
      enum: [
        "now_playing",
        "upcoming",
        "advance_booking",
        "last_day",
        "ended",
        "Now Showing",
        "Coming Soon",
        "Advance Booking",
        "Last Day",
        "Ended",
      ],
      default: "Ended",
    },
    isAdvanceBooking: { type: Boolean, default: false },
    popularity: { type: Number, default: 80 },
    isAwardWinner: { type: Boolean, default: false },
    awards: [{ type: String }],
    tmdbId: { type: Number },
    hasActiveShows: { type: Boolean, default: false },
    status: { type: String },
  },
  { timestamps: true }
);

// High performance query indexes
movieSchema.index({ theatricalStatus: 1 });
movieSchema.index({ title: 1 });
movieSchema.index({ rating: -1 });

module.exports = mongoose.model("Movie", movieSchema);
