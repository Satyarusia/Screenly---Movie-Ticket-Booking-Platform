const mongoose = require("mongoose");

const ticketItemSchema = new mongoose.Schema(
  {
    ticketId: { type: String },
    seatNumber: { type: String, required: true },
    originalPrice: { type: Number },
    status: {
      type: String,
      enum: ["confirmed", "cancelled"],
      default: "confirmed",
    },
    cancelledAt: { type: Date },
  },
  { _id: false }
);

const bookingSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    movie: { type: mongoose.Schema.Types.ObjectId, ref: "Movie" },
    show: { type: mongoose.Schema.Types.ObjectId, ref: "Show", required: true },
    theatre: { type: mongoose.Schema.Types.ObjectId, ref: "Theatre" },
    screen: { type: String, default: "Screen 1" },
    screenId: { type: String, default: "Screen 1" },
    seats: { type: [String], required: true },
    totalAmount: { type: Number, required: true },
    originalTotalAmount: { type: Number },
    tickets: [ticketItemSchema],
    cancelledSeats: [{ type: String }],
    cancellationHistory: [
      {
        cancelledSeats: [String],
        refundAmount: Number,
        cancelledAt: { type: Date, default: Date.now },
        reason: String,
      },
    ],
    refundAmount: { type: Number, default: 0 },
    refundDestination: { type: String },
    status: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "partially_cancelled",
        "Partially Cancelled",
        "cancelled",
        "expired",
        "completed",
      ],
      default: "pending",
    },
    paymentStatus: {
      type: String,
      enum: [
        "Pending",
        "Success",
        "Failed",
        "Refunded",
        "Partially Refunded",
        "Refunded (Simulated)",
      ],
      default: "Pending",
    },
    paymentMethod: { type: String, default: "Card" },
    transactionId: { type: String, default: "" },
    isVerified: { type: Boolean, default: false },
    verifiedAt: { type: Date },
    expiresAt: { type: Date },
  },
  { timestamps: true }
);

// Indexes for high performance querying
bookingSchema.index({ user: 1, createdAt: -1 });
bookingSchema.index({ show: 1 });
bookingSchema.index({ movie: 1 });
bookingSchema.index({ theatre: 1 });
bookingSchema.index({ status: 1, expiresAt: 1 });

module.exports = mongoose.model("Booking", bookingSchema);
