// server/controllers/adminController.js
const User = require("../models/userModel");
const Booking = require("../models/bookingModel");
const Movie = require("../models/movieModel");
const Theatre = require("../models/theatreModel");
const Show = require("../models/showModel");
const { syncRealWorldMovieAvailability } = require("../services/tmdbSyncService");

// 1. Dashboard Overview Stats
exports.getAdminStats = async (req, res) => {
  try {
    const totalMovies = await Movie.countDocuments();
    const totalTheatres = await Theatre.countDocuments();
    const totalShows = await Show.countDocuments();
    const totalBookings = await Booking.countDocuments();
    const totalUsers = await User.countDocuments({ role: "user" });

    const revenueResult = await Booking.aggregate([
      { $match: { status: { $ne: "cancelled" } } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]);
    const totalRevenue = revenueResult[0]?.total || 0;

    res.json({
      stats: {
        totalMovies,
        totalTheatres,
        totalShows,
        totalBookings,
        totalUsers,
        totalRevenue,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 2. Customer Directory
exports.getAllCustomers = async (req, res) => {
  try {
    const { search } = req.query;
    let query = { role: "user" };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }

    const customers = await User.find(query).select("-password").sort({ createdAt: -1 });
    const userIds = customers.map((c) => c._id);
    const bookings = await Booking.find({ user: { $in: userIds } });

    const enriched = customers.map((c) => {
      const userBookings = bookings.filter((b) => String(b.user) === String(c._id));
      const totalSpent = userBookings
        .filter((b) => b.status !== "cancelled")
        .reduce((sum, b) => sum + (b.totalAmount || 0), 0);

      return {
        ...c.toObject(),
        bookingCount: userBookings.length,
        totalSpent,
      };
    });

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 3. Customer Profile & Full Booking History Inspection
exports.getCustomerDetails = async (req, res) => {
  try {
    const customer = await User.findById(req.params.id).select("-password");
    if (!customer) return res.status(404).json({ message: "Customer not found." });

    const history = await Booking.find({ user: customer._id })
      .populate("show")
      .sort({ createdAt: -1 });

    res.json({ customer, history });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 4. Trigger Real-Time TMDB Sync from Admin Dashboard
exports.triggerTheatricalSync = async (req, res) => {
  try {
    await syncRealWorldMovieAvailability();
    res.json({ message: "Theatrical movie availability synchronized." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
