const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    adminCode: {
      type: String,
      unique: true,
      sparse: true,
    },
    department: {
      type: String,
      default: "Cinema Operations",
    },
    permissions: {
      type: [String],
      default: ["manage_movies", "manage_theatres", "manage_shows", "manage_bookings", "view_reports"],
    },
    lastLogin: {
      type: Date,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Admin", adminSchema);
