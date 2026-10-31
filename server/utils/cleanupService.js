const mongoose = require("mongoose");
const Booking = require("../models/bookingModel");
const Show = require("../models/showModel");

const cleanupExpiredBookings = async () => {
  try {
    if (mongoose.connection.readyState !== 1) return;
    const now = new Date();

    // 1. Release expired temporary seat holds (Reserved -> Available)
    const expired = await Booking.find({
      status: "pending",
      expiresAt: { $lt: now },
    });

    for (const booking of expired) {
      booking.status = "expired";
      booking.paymentStatus = "Expired";
      await booking.save();

      if (booking.show && booking.seats && booking.seats.length > 0) {
        await Show.updateOne(
          { _id: booking.show },
          { $pull: { bookedSeats: { $in: booking.seats } } }
        );
      }
    }

    if (expired.length > 0) {
      console.log(`[Seat Cleanup] Released seats from ${expired.length} expired reservation hold(s)`);
    }

    // 2. Automatically advance show lifecycles (Booking Open -> Running -> Completed)
    // Completed shows: endTime in past
    await Show.updateMany(
      { endTime: { $lte: now }, status: { $ne: "Completed" } },
      { $set: { status: "Completed" } }
    );

    // Running shows: between showTime and endTime
    await Show.updateMany(
      { showTime: { $lte: now }, endTime: { $gt: now }, status: { $nin: ["Running", "Completed"] } },
      { $set: { status: "Running" } }
    );
  } catch (error) {
    // Silent catch if DB is temporarily disconnected
  }
};

// Periodic background runner every 60 seconds
const startCleanup = () => {
  // Run once shortly after startup
  setTimeout(cleanupExpiredBookings, 3000);
  return setInterval(cleanupExpiredBookings, 60 * 1000);
};

module.exports = { startCleanup, cleanupExpiredBookings };
