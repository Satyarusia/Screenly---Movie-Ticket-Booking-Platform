const mongoose = require("mongoose");
const Show = require("../models/showModel");
const Theatre = require("../models/theatreModel");
const Movie = require("../models/movieModel");
const Booking = require("../models/bookingModel");

// Releases expired temporary seat holds back to available state
const releaseExpiredReservations = async (showId = null) => {
  try {
    const query = {
      status: "pending",
      expiresAt: { $lt: new Date() },
    };
    if (showId) query.show = showId;

    const expiredBookings = await Booking.find(query);
    if (!expiredBookings || expiredBookings.length === 0) return;

    for (const booking of expiredBookings) {
      booking.status = "expired";
      booking.paymentStatus = "Failed";
      await booking.save();

      if (booking.show && booking.seats && booking.seats.length > 0) {
        await Show.updateOne(
          { _id: booking.show },
          { $pull: { bookedSeats: { $in: booking.seats } } }
        );
      }
    }
  } catch (e) {
    console.error("Error releasing expired reservations:", e.message);
  }
};

// Computes dynamic lifecycle status based on current time and show duration
const computeShowLifecycle = (show) => {
  const now = new Date();
  const startTime = new Date(show.showTime);
  const duration = show.durationMinutes || 150;
  const endTime = show.endTime
    ? new Date(show.endTime)
    : new Date(startTime.getTime() + duration * 60000);

  let status = show.status || "Upcoming";
  if (status === "Cancelled") {
    // Preserve cancelled status
  } else if (now >= endTime) {
    status = "Completed";
  } else if (now >= startTime) {
    status = "Running";
  } else {
    status = "Upcoming";
  }

  // Update in background if state transitioned
  if (show.status !== status && typeof show.save === "function") {
    show.status = status;
    show.save().catch(() => { });
  }

  return {
    status,
    isBookable: (status === "Upcoming" || status === "Booking Open") && now < startTime,
    startTime,
    endTime,
  };
};

// Builds the seat map: L1..Ln (lower), M1..Mn (middle), B1..Bn (balcony)
// Returns 3 discrete states: 'available' | 'reserved' | 'booked'
const buildSeats = (theatre, confirmedSeats = [], reservedSeats = [], showPrices = null) => {
  const seats = theatre?.seats || { lower: 40, middle: 40, balcony: 20 };
  const prices = {
    balcony: showPrices?.balcony || theatre?.prices?.balcony || 350,
    middle: showPrices?.middle || theatre?.prices?.middle || 250,
    lower: showPrices?.lower || theatre?.prices?.lower || 150,
  };

  const make = (prefix, count, price) =>
    Array.from({ length: count }, (_, i) => {
      const id = `${prefix}${i + 1}`;
      const isConfirmed = confirmedSeats.includes(id);
      const isReserved = reservedSeats.includes(id);

      let status = "available";
      if (isConfirmed) status = "booked";
      else if (isReserved) status = "reserved";

      return {
        id,
        price,
        status,
        booked: isConfirmed || isReserved, // backward compatible flag
      };
    });

  return {
    balcony: make("B", seats.balcony || 20, prices.balcony),
    middle: make("M", seats.middle || 40, prices.middle),
    lower: make("L", seats.lower || 40, prices.lower),
  };
};

// @desc    Create a new show with screen support, collision detection, and tiered pricing
// @route   POST /api/shows
// @access  Private/Admin
const createShow = async (req, res) => {
  try {
    const {
      movie,
      theatre,
      screen = "Screen 1",
      format = "2D",
      language,
      price,
      prices,
      showTime,
      durationMinutes = 150,
      status = "Upcoming",
    } = req.body;

    if (!movie || !theatre || !showTime) {
      return res.status(400).json({
        message: !movie
          ? "Please select an existing movie. A show cannot be scheduled without a movie."
          : !theatre
          ? "Please select a multiplex theatre venue."
          : "Show date and time are required.",
      });
    }

    const parsedStartTime = new Date(showTime);
    if (isNaN(parsedStartTime.getTime())) {
      return res.status(400).json({ message: "Invalid show date and time." });
    }

    // Validation: No past dates (with 5-minute buffer for network request latency)
    if (parsedStartTime.getTime() < Date.now() - 5 * 60 * 1000) {
      return res.status(400).json({ message: "Show date and time cannot be scheduled in the past." });
    }

    // Validation: Movie must exist
    const movieDoc = await Movie.findById(movie);
    if (!movieDoc) {
      return res.status(404).json({ message: "Selected movie was not found in the catalog." });
    }

    // Validation: Theatre must exist
    const theatreDoc = await Theatre.findById(theatre);
    if (!theatreDoc) {
      return res.status(404).json({ message: "Selected multiplex venue was not found." });
    }

    const duration = Number(durationMinutes) || movieDoc.duration || 150;
    const parsedEndTime = new Date(parsedStartTime.getTime() + duration * 60000);
    const normalizedScreen = (screen || "Screen 1").trim();

    // Validation: Collision detection (startTime < otherEnd && endTime > otherStart)
    const conflictingShow = await Show.findOne({
      theatre: theatreDoc._id,
      screen: normalizedScreen,
      status: { $ne: "Cancelled" },
      showTime: { $lt: parsedEndTime },
      endTime: { $gt: parsedStartTime },
    }).populate("movie", "title movieName");

    if (conflictingShow) {
      const conflictMovie = conflictingShow.movie?.title || conflictingShow.movie?.movieName || "Another show";
      const conflictStart = new Date(conflictingShow.showTime).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
      const conflictEnd = new Date(conflictingShow.endTime || conflictingShow.showTime).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
      return res.status(400).json({
        message: `Schedule conflict: "${normalizedScreen}" at ${theatreDoc.name} is already occupied by "${conflictMovie}" from ${conflictStart} to ${conflictEnd}. Please select another screen or time slot.`,
      });
    }

    // Tiered pricing configuration
    const finalPrices = {
      lower: Number(prices?.lower) || theatreDoc.prices?.lower || 150,
      middle: Number(prices?.middle) || theatreDoc.prices?.middle || 250,
      balcony: Number(prices?.balcony) || theatreDoc.prices?.balcony || 350,
      recliner: Number(prices?.recliner) || 500,
      vip: Number(prices?.vip) || 600,
    };
    const basePrice = Number(price) || finalPrices.lower;

    const show = await Show.create({
      movie: movieDoc._id,
      theatre: theatreDoc._id,
      screen: normalizedScreen,
      format: format || "2D",
      language: language || movieDoc.language || "Hindi",
      price: basePrice,
      prices: finalPrices,
      showTime: parsedStartTime,
      durationMinutes: duration,
      endTime: parsedEndTime,
      status: status || "Upcoming",
      bookedSeats: [],
    });

    const populated = await Show.findById(show._id)
      .populate("movie")
      .populate("theatre");

    res.status(201).json(populated);
  } catch (error) {
    const message =
      error.code === 11000
        ? "This theatre screen already has a show scheduled at this exact time"
        : error.message;
    res.status(400).json({ message });
  }
};

// @desc    Get all shows with optional filters (?movie=ID & ?theatre=ID & ?screen=Name & ?date=YYYY-MM-DD & ?city=Name & ?format=Format & ?status=Status)
// @route   GET /api/shows
// @access  Public
const getShows = async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.json([]);
    }
    await releaseExpiredReservations();

    const filter = {};
    if (req.query.movie) filter.movie = req.query.movie;
    if (req.query.theatre) filter.theatre = req.query.theatre;
    if (req.query.screen) filter.screen = req.query.screen;
    if (req.query.format) filter.format = new RegExp(`^${req.query.format.trim()}$`, "i");
    if (req.query.language) filter.language = new RegExp(`^${req.query.language.trim()}$`, "i");

    if (req.query.date) {
      const start = new Date(`${req.query.date}T00:00:00.000Z`);
      const end = new Date(`${req.query.date}T23:59:59.999Z`);
      filter.showTime = { $gte: start, $lte: end };
    } else if (req.query.upcomingOnly === "true") {
      filter.showTime = { $gte: new Date() };
    }

    if (req.query.city) {
      const matchingTheatres = await Theatre.find({
        city: new RegExp(`^${req.query.city.trim()}$`, "i"),
      }).select("_id");
      const theatreIds = matchingTheatres.map((t) => t._id);
      if (!filter.theatre) {
        filter.theatre = { $in: theatreIds };
      }
    }

    const shows = await Show.find(filter)
      .populate("movie", "title movieName poster language duration genre certification rating theatricalStatus isAdvanceBooking")
      .populate("theatre", "name city location address chain facilities formats languages googleMapsUrl screens seats prices")
      .sort({ showTime: 1 });

    const enriched = shows.map((show) => {
      const lifecycle = computeShowLifecycle(show);
      const totalSeats =
        (show.theatre?.seats?.balcony || 20) +
        (show.theatre?.seats?.middle || 40) +
        (show.theatre?.seats?.lower || 40);
      const bookedCount = show.bookedSeats ? show.bookedSeats.length : 0;
      const basePrice = show.price || show.prices?.lower || show.theatre?.prices?.lower || 150;

      return {
        ...show.toObject(),
        screen: show.screen || "Screen 1",
        format: show.format || "2D",
        language: show.language || show.movie?.language || "Hindi",
        price: basePrice,
        prices: show.prices || show.theatre?.prices || { lower: 150, middle: 250, balcony: 350 },
        status: lifecycle.status,
        isBookable: lifecycle.isBookable,
        totalSeats,
        bookedCount,
        availableCount: Math.max(0, totalSeats - bookedCount),
      };
    });

    const statusQuery = req.query.status;
    const finalResult = statusQuery && statusQuery !== "All"
      ? enriched.filter((s) => s.status.toLowerCase() === statusQuery.toLowerCase())
      : enriched;

    res.json(finalResult);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get show by ID
// @route   GET /api/shows/:id
// @access  Public
const getShowById = async (req, res) => {
  try {
    await releaseExpiredReservations(req.params.id);

    const show = await Show.findById(req.params.id)
      .populate("movie", "title movieName poster language duration genre certification rating description cast releaseDate theatricalStatus")
      .populate("theatre", "name city location address chain facilities formats languages googleMapsUrl screens seats prices");

    if (!show) return res.status(404).json({ message: "Show not found" });

    const lifecycle = computeShowLifecycle(show);
    const totalSeats =
      (show.theatre?.seats?.balcony || 20) +
      (show.theatre?.seats?.middle || 40) +
      (show.theatre?.seats?.lower || 40);
    const bookedCount = show.bookedSeats ? show.bookedSeats.length : 0;
    const basePrice = show.price || show.prices?.lower || show.theatre?.prices?.lower || 150;

    res.json({
      ...show.toObject(),
      screen: show.screen || "Screen 1",
      format: show.format || "2D",
      language: show.language || show.movie?.language || "Hindi",
      price: basePrice,
      prices: show.prices || show.theatre?.prices || { lower: 150, middle: 250, balcony: 350 },
      status: lifecycle.status,
      isBookable: lifecycle.isBookable,
      totalSeats,
      bookedCount,
      availableCount: Math.max(0, totalSeats - bookedCount),
    });
  } catch (error) {
    res.status(400).json({ message: "Invalid show ID" });
  }
};

// @desc    Get seat matrix for a specific show with booked & reserved statuses
// @route   GET /api/shows/:id/seats
// @access  Public
const getShowSeats = async (req, res) => {
  try {
    await releaseExpiredReservations(req.params.id);

    const show = await Show.findById(req.params.id)
      .populate("theatre")
      .populate("movie", "title movieName poster duration certification language");

    if (!show) return res.status(404).json({ message: "Show not found" });

    const lifecycle = computeShowLifecycle(show);

    const confirmedBookings = await Booking.find({
      show: show._id,
      status: { $in: ["confirmed", "completed", "partially_cancelled", "Partially Cancelled"] },
    }).select("seats");

    const confirmedSeatsSet = new Set();
    confirmedBookings.forEach((b) => (b.seats || []).forEach((s) => confirmedSeatsSet.add(s)));

    const pendingBookings = await Booking.find({
      show: show._id,
      status: "pending",
      expiresAt: { $gt: new Date() },
    }).select("seats");

    const reservedSeatsSet = new Set();
    pendingBookings.forEach((b) => (b.seats || []).forEach((s) => reservedSeatsSet.add(s)));

    (show.bookedSeats || []).forEach((s) => {
      if (!reservedSeatsSet.has(s)) confirmedSeatsSet.add(s);
    });

    const seatMatrix = buildSeats(
      show.theatre,
      Array.from(confirmedSeatsSet),
      Array.from(reservedSeatsSet),
      show.prices
    );

    const totalSeats =
      (show.theatre?.seats?.balcony || 20) +
      (show.theatre?.seats?.middle || 40) +
      (show.theatre?.seats?.lower || 40);

    const bookedCount = confirmedSeatsSet.size;
    const reservedCount = reservedSeatsSet.size;
    const availableCount = Math.max(0, totalSeats - bookedCount - reservedCount);

    res.json({
      showId: show._id,
      screen: show.screen || "Screen 1",
      format: show.format || "2D",
      language: show.language || show.movie?.language || "Hindi",
      showTime: show.showTime,
      endTime: show.endTime,
      lifecycleStatus: lifecycle.status,
      isBookable: lifecycle.isBookable,
      movie: show.movie,
      theatre: show.theatre,
      seats: seatMatrix,
      totalSeats,
      bookedCount,
      reservedCount,
      availableCount,
    });
  } catch (error) {
    res.status(400).json({ message: error.message || "Invalid show ID" });
  }
};

// @desc    Update show details with collision check and booking protection
// @route   PUT /api/shows/:id
// @access  Private/Admin
const updateShow = async (req, res) => {
  try {
    const existingShow = await Show.findById(req.params.id);
    if (!existingShow) return res.status(404).json({ message: "Show not found" });

    const activeBookingsCount = await Booking.countDocuments({
      show: existingShow._id,
      status: { $in: ["confirmed", "pending", "partially_cancelled", "Partially Cancelled"] },
    });

    const {
      movie,
      theatre,
      screen,
      showTime,
      durationMinutes,
      format,
      language,
      price,
      prices,
      status,
      forceConfirmed,
    } = req.body;

    const newScreen = screen !== undefined ? screen.trim() : existingShow.screen;
    const newShowTime = showTime ? new Date(showTime) : existingShow.showTime;
    const newTheatreId = theatre || existingShow.theatre;
    const duration = Number(durationMinutes) || existingShow.durationMinutes || 150;
    const newEndTime = new Date(newShowTime.getTime() + duration * 60000);

    // Safeguard: protect against destructive screen/time changes if active bookings exist
    const isScreenChanged = newScreen !== existingShow.screen;
    const isTimeChanged = Math.abs(newShowTime.getTime() - existingShow.showTime.getTime()) > 5 * 60 * 1000;

    if (activeBookingsCount > 0 && (isScreenChanged || isTimeChanged) && !forceConfirmed) {
      return res.status(400).json({
        message: `Warning: This show has ${activeBookingsCount} active booking(s). Modifying screen or show time will affect booked customers. Please confirm to proceed.`,
        activeBookingsCount,
        requiresConfirmation: true,
      });
    }

    // Overlap collision detection (excluding this show)
    const conflictingShow = await Show.findOne({
      _id: { $ne: existingShow._id },
      theatre: newTheatreId,
      screen: newScreen,
      status: { $ne: "Cancelled" },
      showTime: { $lt: newEndTime },
      endTime: { $gt: newShowTime },
    }).populate("movie", "title movieName");

    if (conflictingShow) {
      const conflictMovie = conflictingShow.movie?.title || conflictingShow.movie?.movieName || "Another show";
      return res.status(400).json({
        message: `Collision detected on screen "${newScreen}": "${conflictMovie}" is already scheduled in this timeframe.`,
      });
    }

    if (movie) existingShow.movie = movie;
    if (theatre) existingShow.theatre = theatre;
    if (screen) existingShow.screen = newScreen;
    if (format) existingShow.format = format;
    if (language) existingShow.language = language;
    if (status) existingShow.status = status;
    if (prices) existingShow.prices = prices;
    if (price !== undefined) existingShow.price = Number(price);
    existingShow.durationMinutes = duration;
    existingShow.showTime = newShowTime;
    existingShow.endTime = newEndTime;

    await existingShow.save();

    const populated = await Show.findById(existingShow._id)
      .populate("movie")
      .populate("theatre");

    res.json(populated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Delete a show with active booking protection
// @route   DELETE /api/shows/:id
// @access  Private/Admin
const deleteShow = async (req, res) => {
  try {
    const show = await Show.findById(req.params.id);
    if (!show) return res.status(404).json({ message: "Show not found" });

    const activeBookingsCount = await Booking.countDocuments({
      show: show._id,
      status: { $in: ["confirmed", "pending", "partially_cancelled", "Partially Cancelled"] },
    });

    const isForce = req.query.force === "true" || req.body?.force === true;

    if (activeBookingsCount > 0 && !isForce) {
      return res.status(400).json({
        message: `Cannot delete show: There are ${activeBookingsCount} active reservation(s) on this screening. Please confirm to cancel the reservations and delete the show.`,
        activeBookingsCount,
        requiresConfirmation: true,
      });
    }

    // If forced deletion, cancel active bookings and release holds
    if (activeBookingsCount > 0 && isForce) {
      await Booking.updateMany(
        { show: show._id, status: { $in: ["confirmed", "pending", "partially_cancelled", "Partially Cancelled"] } },
        { $set: { status: "cancelled", paymentStatus: "Refunded" } }
      );
    }

    await Show.findByIdAndDelete(req.params.id);
    res.json({
      message: "Show deleted successfully",
      cancelledBookings: activeBookingsCount,
    });
  } catch (error) {
    res.status(400).json({ message: "Invalid show ID" });
  }
};

module.exports = {
  createShow,
  getShows,
  getShowById,
  getShowSeats,
  updateShow,
  deleteShow,
  releaseExpiredReservations,
  computeShowLifecycle,
  buildSeats,
};
