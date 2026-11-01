const mongoose = require("mongoose");
const Booking = require("../models/bookingModel");
const Show = require("../models/showModel");
const { releaseExpiredReservations, computeShowLifecycle } = require("./showController");

const HOLD_MINUTES = 10;
const MAX_SEATS = 8;

// Calculate price of seat based on theatre tier
const seatPrice = (theatre, seatId) => {
  const match = /^([LMB])(\d+)$/.exec(seatId);
  if (!match) return null;
  const key = { L: "lower", M: "middle", B: "balcony" }[match[1]];
  const number = Number(match[2]);
  if (!theatre.seats || number < 1 || number > theatre.seats[key]) return null;
  return theatre.prices[key];
};

// Release seats from show
const releaseSeats = (showId, seats) =>
  Show.updateOne({ _id: showId }, { $pull: { bookedSeats: { $in: seats } } });

const showDetails = [
  {
    path: "show",
    populate: [
      {
        path: "movie",
        select:
          "title movieName poster backdrop language duration genre certification rating description tmdbId releaseDate theatricalStatus formats",
      },
      {
        path: "theatre",
        select:
          "name city location address chain facilities formats languages googleMapsUrl screens seats prices",
      },
    ],
  },
  {
    path: "movie",
    select:
      "title movieName poster backdrop language duration genre certification rating description tmdbId releaseDate theatricalStatus formats",
  },
  {
    path: "theatre",
    select:
      "name city location address chain facilities formats languages googleMapsUrl screens seats prices",
  },
  {
    path: "user",
    select: "name email phone",
  },
];

// Helper to annotate booking records with lifecycle info
const enrichBookingsWithLifecycle = (bookings) => {
  const now = new Date();
  return bookings.map((b) => {
    const obj = b.toObject ? b.toObject() : { ...b };

    // Resolve unified movie and theatre references
    if (!obj.movie && obj.show && obj.show.movie) {
      obj.movie = obj.show.movie;
    }
    if (!obj.theatre && obj.show && obj.show.theatre) {
      obj.theatre = obj.show.theatre;
    }
    if (!obj.screen && obj.show && obj.show.screen) {
      obj.screen = obj.show.screen;
    }

    const show = obj.show;
    if (show && show.showTime) {
      const showTime = new Date(show.showTime);
      const duration = show.durationMinutes || obj.movie?.duration || 150;
      const endTime = show.endTime
        ? new Date(show.endTime)
        : new Date(showTime.getTime() + duration * 60000);

      const isCompleted = now >= endTime;
      const isRunning = now >= showTime && now < endTime;

      const isToday =
        now.getFullYear() === showTime.getFullYear() &&
        now.getMonth() === showTime.getMonth() &&
        now.getDate() === showTime.getDate();

      obj.isPastShow = isCompleted;
      obj.showLifecycle = isCompleted ? "Completed" : isRunning ? "Running" : "Upcoming";

      if (obj.status === "cancelled") {
        obj.computedStatus = "Cancelled";
        obj.displayStatus = "Cancelled";
      } else if (obj.status === "partially_cancelled" || obj.status === "Partially Cancelled") {
        obj.computedStatus = "Partially Cancelled";
        obj.displayStatus = "Partially Cancelled";
        obj.isPartiallyCancelled = true;
      } else if (obj.status === "expired") {
        obj.computedStatus = "Expired";
        obj.displayStatus = "Expired";
      } else if (isCompleted) {
        obj.computedStatus = "Completed";
        obj.displayStatus = "Completed";
      } else if (isToday) {
        obj.computedStatus = "Today";
        obj.displayStatus = "Today";
      } else if (showTime > now) {
        obj.computedStatus = "Upcoming";
        obj.displayStatus = "Upcoming";
      } else {
        obj.computedStatus = "Completed";
        obj.displayStatus = "Completed";
      }
    } else {
      obj.isPastShow = false;
      obj.showLifecycle = "Upcoming";
      if (obj.status === "cancelled") {
        obj.computedStatus = "Cancelled";
        obj.displayStatus = "Cancelled";
      } else if (obj.status === "partially_cancelled" || obj.status === "Partially Cancelled") {
        obj.computedStatus = "Partially Cancelled";
        obj.displayStatus = "Partially Cancelled";
        obj.isPartiallyCancelled = true;
      } else {
        obj.computedStatus = "Upcoming";
        obj.displayStatus = "Upcoming";
      }
    }
    return obj;
  });
};

// @desc    Create a booking (holds the seats for 10 minutes)
// @route   POST /api/bookings
// @access  Private
const createBooking = async (req, res) => {
  try {
    const { showId, seats } = req.body;

    if (!mongoose.isValidObjectId(showId) || !Array.isArray(seats) || seats.length === 0) {
      return res.status(400).json({ message: "A valid showId and at least one seat are required" });
    }

    const uniqueSeats = [...new Set(seats)];
    if (uniqueSeats.length > MAX_SEATS) {
      return res.status(400).json({ message: `You can book at most ${MAX_SEATS} seats at a time` });
    }

    // Release any expired holds across the system first
    await releaseExpiredReservations(showId);

    const show = await Show.findById(showId).populate("theatre").populate("movie");
    if (!show) return res.status(404).json({ message: "Show not found" });

    // Validate show lifecycle: lock tickets if show has started or completed
    const lifecycle = computeShowLifecycle(show);
    if (!lifecycle.isBookable) {
      return res.status(400).json({
        message: `Bookings are closed. This show is currently ${lifecycle.status.toLowerCase()}.`,
      });
    }

    let total = 0;
    const tickets = [];
    for (const seat of uniqueSeats) {
      const price = seatPrice(show.theatre, seat);
      if (price === null) {
        return res.status(400).json({ message: `Invalid seat: ${seat}` });
      }
      total += price;
      tickets.push({
        ticketId: `TKT-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
        seatNumber: seat,
        originalPrice: price,
        status: "confirmed",
      });
    }

    // Atomically reserve the seats only if none of them is already booked or held
    const held = await Show.findOneAndUpdate(
      { _id: showId, bookedSeats: { $nin: uniqueSeats } },
      { $push: { bookedSeats: { $each: uniqueSeats } } },
      { new: true }
    );

    if (!held) {
      return res.status(409).json({
        message: "One or more selected seats were just taken. Please choose different seats.",
      });
    }

    try {
      const booking = await Booking.create({
        user: req.user._id,
        movie: show.movie?._id || show.movie,
        show: showId,
        theatre: show.theatre?._id || show.theatre,
        screen: show.screen || "Screen 1",
        screenId: show.screen || "Screen 1",
        seats: uniqueSeats,
        tickets,
        originalTotalAmount: total,
        totalAmount: total,
        status: "pending",
        paymentStatus: "Pending",
        expiresAt: new Date(Date.now() + HOLD_MINUTES * 60 * 1000),
      });

      const populatedBooking = await Booking.findById(booking._id).populate(showDetails);
      res.status(201).json(populatedBooking);
    } catch (error) {
      await releaseSeats(showId, uniqueSeats);
      throw error;
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Process Verified Payment and automatically dispatch Confirmation Email
// @route   POST /api/bookings/:id/pay
// @access  Private
const processPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentMethod, transactionId, action, status, simulateFailure } = req.body;

    const booking = await Booking.findById(id).populate(showDetails);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const isOwner = booking.user && booking.user._id.toString() === req.user._id.toString();
    if (!isOwner && req.user.role !== "admin") {
      return res.status(403).json({ message: "Unauthorized to process payment for this booking" });
    }

    if (booking.status === "confirmed" && booking.paymentStatus === "Success") {
      return res.json({
        success: true,
        message: "Booking is already confirmed",
        booking,
      });
    }

    // Handle Payment Failure / Cancellation
    const isFailed = simulateFailure || action === "failed" || status === "failed" || status === "cancelled";
    if (isFailed) {
      booking.status = "cancelled";
      booking.paymentStatus = "Failed";
      await booking.save();

      // Release all temporarily reserved seats immediately back to the theatre
      if (booking.show) {
        const showId = booking.show._id || booking.show;
        await releaseSeats(showId, booking.seats);
      }

      return res.status(400).json({
        success: false,
        message: "Payment transaction declined. The reserved seats have been released.",
        booking,
      });
    }

    if (["cancelled", "expired"].includes(booking.status)) {
      return res.status(400).json({
        message: `Cannot pay for a ${booking.status} booking. Please make a new reservation.`,
      });
    }

    // Generate Verified Transaction ID
    const txnId =
      transactionId ||
      `PAY${Date.now().toString().slice(-6)}${Math.floor(1000 + Math.random() * 9000)}`;

    booking.status = "confirmed";
    booking.paymentStatus = "Success";
    booking.paymentMethod = paymentMethod || "UPI / Online Payment";
    booking.transactionId = txnId;
    booking.expiresAt = null; // Confirm booking, permanently lock seats for this show

    if (!booking.movie && booking.show?.movie) {
      booking.movie = booking.show.movie?._id || booking.show.movie;
    }
    if (!booking.theatre && booking.show?.theatre) {
      booking.theatre = booking.show.theatre?._id || booking.show.theatre;
    }

    await booking.save();

    const populated = await Booking.findById(booking._id).populate(showDetails);
    const [enriched] = enrichBookingsWithLifecycle([populated]);

    res.json({
      success: true,
      message: "Payment authorized successfully! Your booking is confirmed and your digital admission pass is ready.",
      booking: enriched,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Release expired or cancelled seat hold immediately
// @route   PUT /api/bookings/:id/release-hold
// @access  Public / Private
const releaseHold = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    if (booking.status === "pending") {
      booking.status = "expired";
      booking.paymentStatus = "Expired";
      await booking.save();

      if (booking.show && booking.seats && booking.seats.length > 0) {
        await releaseSeats(booking.show, booking.seats);
      }
    }

    res.json({ message: "Seat hold released successfully. Seats are now available.", booking });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get bookings of the logged-in user (preserves past shows)
// @route   GET /api/bookings/mine
// @access  Private
const getMyBookings = async (req, res) => {
  try {
    await releaseExpiredReservations();

    const filter = req.user ? { user: req.user._id } : {};
    const bookings = await Booking.find(filter)
      .populate(showDetails)
      .sort({ createdAt: -1 });

    const enriched = enrichBookingsWithLifecycle(bookings);
    res.json(enriched);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get booking by ID
// @route   GET /api/bookings/:id
// @access  Public / Private
const getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate(showDetails);
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    const [enriched] = enrichBookingsWithLifecycle([booking]);
    res.json(enriched);
  } catch (error) {
    res.status(400).json({ message: "Invalid booking ID" });
  }
};

// @desc    Partial & Single Seat Cancellation Endpoint
// @route   PUT /api/bookings/:id/cancel-seats
// @access  Private
const cancelSeats = async (req, res) => {
  try {
    const { seatsToCancel = [], refundAmount = 0, payoutDestination, reason } = req.body;
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    if (!Array.isArray(seatsToCancel) || seatsToCancel.length === 0) {
      return res.status(400).json({ message: "Please specify at least one seat to cancel" });
    }

    // Only cancel seats that are currently active in booking.seats
    const validSeatsToCancel = seatsToCancel.filter((s) => (booking.seats || []).includes(s));
    if (validSeatsToCancel.length === 0) {
      return res.status(400).json({ message: "None of the specified seats are currently active in this booking" });
    }

    // Store original total amount before any deduction
    if (!booking.originalTotalAmount) {
      booking.originalTotalAmount = booking.totalAmount;
    }

    // Calculate per-seat base price accurately
    const currentActiveCount = booking.seats.length;
    const originalCount = currentActiveCount + (booking.cancelledSeats?.length || 0);
    const basePerSeat = Math.round(booking.originalTotalAmount / (originalCount || 1));
    const cancelledBaseTotal = basePerSeat * validSeatsToCancel.length;

    // Remaining seats
    const remainingSeats = booking.seats.filter((s) => !validSeatsToCancel.includes(s));
    booking.seats = remainingSeats;

    // Update tickets array
    if (booking.tickets && Array.isArray(booking.tickets)) {
      booking.tickets = booking.tickets.map((t) => {
        const tObj = t.toObject ? t.toObject() : t;
        if (validSeatsToCancel.includes(tObj.seatNumber)) {
          return { ...tObj, status: "cancelled", cancelledAt: new Date() };
        }
        return tObj;
      });
    }

    // Append to cancelledSeats without duplicates
    booking.cancelledSeats = [
      ...new Set([...(booking.cancelledSeats || []), ...validSeatsToCancel]),
    ];

    // Compute refund amount: if provided in req.body, use that; otherwise calculate 90% (10% fee)
    const effectiveRefund =
      Number(refundAmount) > 0 ? Number(refundAmount) : Math.round(cancelledBaseTotal * 0.9);
    booking.refundAmount = (booking.refundAmount || 0) + effectiveRefund;
    if (payoutDestination) {
      booking.refundDestination = payoutDestination;
    }

    // Update total amount & booking status
    if (remainingSeats.length === 0) {
      booking.totalAmount = 0;
      booking.status = "cancelled";
      booking.paymentStatus = "Refunded";
    } else {
      booking.totalAmount = Math.max(0, booking.totalAmount - cancelledBaseTotal);
      booking.status = "partially_cancelled";
      booking.paymentStatus = "Partially Refunded";
    }

    // Record in cancellation history
    if (!booking.cancellationHistory) {
      booking.cancellationHistory = [];
    }
    booking.cancellationHistory.push({
      cancelledSeats: validSeatsToCancel,
      refundAmount: effectiveRefund,
      cancelledAt: new Date(),
      reason: reason || "User requested partial seat cancellation",
    });

    // Release cancelled seats from show atomically so other users can immediately book them
    if (booking.show && validSeatsToCancel.length > 0) {
      await releaseSeats(booking.show, validSeatsToCancel);
    }

    await booking.save();

    // Re-populate booking with full show details
    const populated = await Booking.findById(booking._id).populate(showDetails);
    const [enriched] = enrichBookingsWithLifecycle([populated]);

    res.json({
      message: `${validSeatsToCancel.length} seat(s) cancelled successfully`,
      booking: enriched,
    });
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to cancel seats" });
  }
};

// @desc    Cancel entire booking
// @route   PUT /api/bookings/:id/cancel
// @access  Private
const cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate("show");
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    if (!["pending", "confirmed", "partially_cancelled", "Partially Cancelled"].includes(booking.status)) {
      return res.status(400).json({ message: `A ${booking.status} booking cannot be cancelled` });
    }

    const remainingSeats = booking.seats || [];

    if (!booking.originalTotalAmount) {
      booking.originalTotalAmount = booking.totalAmount;
    }

    const currentRefund = Math.round(booking.totalAmount * 0.9);
    booking.refundAmount = (booking.refundAmount || 0) + currentRefund;

    if (remainingSeats.length > 0) {
      booking.cancelledSeats = [
        ...new Set([...(booking.cancelledSeats || []), ...remainingSeats]),
      ];
      if (!booking.cancellationHistory) booking.cancellationHistory = [];
      booking.cancellationHistory.push({
        cancelledSeats: remainingSeats,
        refundAmount: currentRefund,
        cancelledAt: new Date(),
        reason: "User cancelled remaining booking",
      });
    }

    booking.status = "cancelled";
    booking.paymentStatus = "Refunded";
    booking.totalAmount = 0;
    booking.seats = [];

    if (booking.tickets && Array.isArray(booking.tickets)) {
      booking.tickets = booking.tickets.map((t) => {
        const tObj = t.toObject ? t.toObject() : t;
        return { ...tObj, status: "cancelled", cancelledAt: new Date() };
      });
    }

    await booking.save();

    if (booking.show && remainingSeats.length > 0) {
      await releaseSeats(booking.show._id || booking.show, remainingSeats);
    }

    const populated = await Booking.findById(booking._id).populate(showDetails);
    const [enriched] = enrichBookingsWithLifecycle([populated]);

    res.json({ message: "Booking cancelled successfully and seats released", booking: enriched });
  } catch (error) {
    res.status(400).json({ message: error.message || "Invalid booking ID" });
  }
};

// @desc    Admin Verify Booking
// @route   PUT /api/bookings/:id/verify
// @access  Private/Admin
const verifyBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    booking.isVerified = !booking.isVerified;
    booking.verifiedAt = booking.isVerified ? new Date() : null;
    await booking.save();

    res.json({ message: `Booking ${booking.isVerified ? "Verified" : "Unverified"}`, booking });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Save simulation booking fallback
// @route   POST /api/bookings/save-simulator
// @access  Public
const saveSimulatorBooking = async (req, res) => {
  try {
    const newBooking = new Booking(req.body);
    await newBooking.save();
    res.status(201).json(newBooking);
  } catch (err) {
    res.status(200).json({ message: "Saved locally", booking: req.body });
  }
};

// @desc    Get all bookings (Admin only, preserves past records)
// @route   GET /api/bookings
// @access  Private/Admin
const getAllBookings = async (req, res) => {
  try {
    await releaseExpiredReservations();

    const bookings = await Booking.find()
      .populate(showDetails)
      .sort({ createdAt: -1 });

    const enriched = enrichBookingsWithLifecycle(bookings);
    res.json(enriched);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete booking (Admin only)
// @route   DELETE /api/bookings/:id
// @access  Private/Admin
const deleteBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    if (["pending", "confirmed", "partially_cancelled", "Partially Cancelled"].includes(booking.status)) {
      await releaseSeats(booking.show, booking.seats);
    }

    await Booking.findByIdAndDelete(req.params.id);
    res.json({ message: "Booking deleted successfully" });
  } catch (error) {
    res.status(400).json({ message: "Invalid booking ID" });
  }
};

module.exports = {
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
};