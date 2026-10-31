const express = require("express");
const router = express.Router();
const {
  createBooking,
  processPayment,
  releaseHold,
  getMyBookings,
  getBookingById,
  cancelSeats,
  cancelBooking,
  verifyBooking,
  saveSimulatorBooking,
  getAllBookings,
  deleteBooking,
} = require("../controllers/bookingController");
const { protect, adminOnly } = require("../middleware/authMiddleware");

// 1. Partial & Single Seat Cancellation Endpoint
router.put("/:id/cancel-seats", protect, cancelSeats);

// 2. Cancel Entire Booking
router.put("/:id/cancel", protect, cancelBooking);

// 3. Release Expired / Cancelled Hold Immediately
router.put("/:id/release-hold", releaseHold);

// 4. Process Simulated Payment
router.post("/:id/pay", protect, processPayment);

// 5. Save / Create Simulator Booking
router.post("/save-simulator", protect, saveSimulatorBooking);

// 6. Fetch User Bookings
router.get("/mine", protect, getMyBookings);

// 7. Admin Verification
router.put("/:id/verify", protect, adminOnly, verifyBooking);

// 8. Base Routes
router.route("/")
  .get(protect, adminOnly, getAllBookings)
  .post(protect, createBooking);

router.route("/:id")
  .get(protect, getBookingById)
  .delete(protect, adminOnly, deleteBooking);

module.exports = router;
