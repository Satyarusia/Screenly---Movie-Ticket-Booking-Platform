const mongoose = require("mongoose");

const showSchema = new mongoose.Schema(
  {
    movie: { type: mongoose.Schema.Types.ObjectId, ref: "Movie", required: true },
    theatre: { type: mongoose.Schema.Types.ObjectId, ref: "Theatre", required: true },
    screen: { type: String, default: "Screen 1", trim: true },
    format: { type: String, default: "2D", trim: true },
    language: { type: String, default: "Hindi", trim: true },
    price: { type: Number, default: 250 },
    prices: {
      lower: { type: Number, default: 150 },
      middle: { type: Number, default: 250 },
      balcony: { type: Number, default: 350 },
      recliner: { type: Number, default: 500 },
      vip: { type: Number, default: 600 },
    },
    showTime: { type: Date, required: true },
    durationMinutes: { type: Number, default: 150 },
    endTime: { type: Date },
    bookedSeats: { type: [String], default: [] },
    status: {
      type: String,
      enum: ["Upcoming", "Running", "Completed", "Cancelled", "Booking Open", "Coming Soon"],
      default: "Upcoming",
    },
  },
  { timestamps: true }
);

// Auto-compute endTime before saving
showSchema.pre("save", function (next) {
  if (this.showTime) {
    const duration = this.durationMinutes || 150;
    this.endTime = new Date(this.showTime.getTime() + duration * 60000);
  }
  if (!this.price && this.prices?.lower) {
    this.price = this.prices.lower;
  }
  if (typeof next === "function") {
    next();
  }
});

// Compound index for uniqueness: one show per theatre & screen at any given time
showSchema.index({ theatre: 1, screen: 1, showTime: 1 }, { unique: true });

// Query optimization indexes
showSchema.index({ theatre: 1, showTime: 1 });
showSchema.index({ movie: 1, showTime: 1 });
showSchema.index({ showTime: 1 });
showSchema.index({ status: 1 });
showSchema.index({ format: 1 });
showSchema.index({ language: 1 });

module.exports = mongoose.model("Show", showSchema);

