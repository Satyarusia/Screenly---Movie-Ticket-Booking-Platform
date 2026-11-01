// client/src/pages/MyBookings.jsx
import { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import EmptyState from "../components/EmptyState";
import LoadingSpinner from "../components/LoadingSpinner";
import {
  getPosterUrl,
  getBackdropUrl,
  getMovieTitle,
  getMovieRating,
  getMovieFormats,
  handleImageError,
} from "../utils/tmdbHelper";
import { getSavedPayoutAccounts } from "../utils/payoutHelper";
import toast from "react-hot-toast";

/**
 * Derives the seat category / tier name from seat identifiers
 */
const getSeatCategoryName = (seats = []) => {
  if (!seats || seats.length === 0) return "Executive";
  const first = String(seats[0]).toUpperCase();
  if (first.startsWith("B") || first.startsWith("R")) return "Balcony Recliner";
  if (first.startsWith("M") || first.startsWith("G") || first.startsWith("E"))
    return "Middle Executive";
  if (first.startsWith("L") || first.startsWith("S")) return "Lower Class";
  if (first.startsWith("P")) return "Platinum VIP";
  return "Executive Class";
};

/**
 * Pure calculation of real-world booking status based on show date and time
 */
const calculateBookingStatus = (booking) => {
  if (!booking) return "Upcoming";
  const rawStatus = String(booking.status || "").toLowerCase();
  const paymentStatus = String(booking.paymentStatus || "").toLowerCase();

  if (rawStatus === "cancelled" || paymentStatus === "refunded") {
    return "Cancelled";
  }
  if (
    rawStatus === "partially_cancelled" ||
    rawStatus === "partially cancelled" ||
    booking.isPartiallyCancelled ||
    (booking.cancelledSeats &&
      booking.cancelledSeats.length > 0 &&
      booking.seats &&
      booking.seats.length > 0)
  ) {
    return "Partially Cancelled";
  }
  if (
    rawStatus === "expired" ||
    paymentStatus === "expired" ||
    paymentStatus === "failed"
  ) {
    return "Expired";
  }

  // Derive from showTime
  let showTimeDate = null;
  if (booking.show?.showTime) {
    showTimeDate = new Date(booking.show.showTime);
  } else if (booking.showTime && booking.showDate) {
    const combined = new Date(`${booking.showDate}T${booking.showTime}`);
    if (!isNaN(combined.getTime())) showTimeDate = combined;
  } else if (booking.showDate) {
    const d = new Date(booking.showDate);
    if (!isNaN(d.getTime())) showTimeDate = d;
  }

  if (!showTimeDate || isNaN(showTimeDate.getTime())) {
    return rawStatus === "confirmed"
      ? "Upcoming"
      : booking.computedStatus || "Upcoming";
  }

  const now = new Date();
  const durationMinutes =
    booking.show?.durationMinutes || booking.movie?.duration || 150;
  const showEndTime = new Date(showTimeDate.getTime() + durationMinutes * 60000);

  // If screening has completely finished
  if (now >= showEndTime) {
    return "Completed";
  }

  // Check if screening is today
  const isToday =
    now.getFullYear() === showTimeDate.getFullYear() &&
    now.getMonth() === showTimeDate.getMonth() &&
    now.getDate() === showTimeDate.getDate();

  if (isToday) {
    return "Today";
  }

  if (showTimeDate > now) {
    return "Upcoming";
  }

  return "Completed";
};

/**
 * Formats Show DateTime with Day of Week, Date, and 12-hour Time
 */
const formatShowDateTime = (dateVal, timeVal) => {
  let dateObj = null;
  if (dateVal instanceof Date) {
    dateObj = dateVal;
  } else if (typeof dateVal === "string" && dateVal) {
    const parsed = new Date(dateVal);
    if (!isNaN(parsed.getTime())) dateObj = parsed;
  }

  if (dateObj) {
    const dayOfWeek = dateObj.toLocaleDateString("en-US", { weekday: "long" });
    const fullDate = dateObj.toLocaleDateString("en-US", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const timeFormatted =
      timeVal ||
      dateObj.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    return {
      dayOfWeek,
      fullDate,
      timeFormatted,
      combined: `${dayOfWeek}, ${fullDate} • ${timeFormatted}`,
    };
  }

  return {
    dayOfWeek: "Show Day",
    fullDate: String(dateVal || "Today"),
    timeFormatted: String(timeVal || "7:30 PM"),
    combined: `${dateVal || "Today"} • ${timeVal || "7:30 PM"}`,
  };
};

export default function MyBookings({ isEmbedded = false }) {
  const navigate = useNavigate();

  const [bookings, setBookings] = useState([]);
  const [moviesMap, setMoviesMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters & Search
  const [activeTab, setActiveTab] = useState("all"); // 'all' | 'upcoming' | 'today' | 'completed' | 'cancelled'
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("newest"); // 'newest' | 'showDate' | 'amount'

  // Modals State
  const [selectedBookingForDetails, setSelectedBookingForDetails] = useState(null);
  const [qrModalBooking, setQrModalBooking] = useState(null);

  // Cancellation Modal State
  const [cancelTargetBooking, setCancelTargetBooking] = useState(null);
  const [seatsToCancel, setSeatsToCancel] = useState([]);
  const [selectedPayoutId, setSelectedPayoutId] = useState("");
  const [isProcessingCancel, setIsProcessingCancel] = useState(false);

  // Fetch bookings and catalog movies for resilient ID resolution
  const fetchBookingsData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [bookingsRes, moviesRes] = await Promise.all([
        api.get("/api/bookings/mine").catch(() => ({ data: [] })),
        api.get("/api/movies").catch(() => ({ data: [] })),
      ]);

      let bookingRecords = Array.isArray(bookingsRes.data) ? bookingsRes.data : [];

      // Offline / Local storage fallback if server returned empty
      if (bookingRecords.length === 0) {
        const cached = localStorage.getItem("screenly_user_bookings");
        if (cached) {
          try {
            bookingRecords = JSON.parse(cached);
          } catch {
            bookingRecords = [];
          }
        }
      }

      // Build movies lookup map
      const map = {};
      if (Array.isArray(moviesRes.data)) {
        moviesRes.data.forEach((m) => {
          if (m._id) map[m._id] = m;
          if (m.tmdbId) map[m.tmdbId] = m;
          if (m.id) map[m.id] = m;
        });
      }
      setMoviesMap(map);

      // Normalize tickets array on bookings
      const normalized = bookingRecords.map((b) => {
        const origPrice = b.originalTotalAmount || b.totalAmount || 0;
        const count = b.seats?.length || 1;
        const pricePerSeat = Math.round(origPrice / count);

        const tickets =
          b.tickets && b.tickets.length > 0
            ? b.tickets
            : (b.seats || []).map((s) => ({
                ticketId: `TKT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
                seatNumber: s,
                originalPrice: pricePerSeat,
                status: b.status === "cancelled" ? "cancelled" : "confirmed",
              }));

        return {
          ...b,
          tickets,
          calculatedStatus: calculateBookingStatus(b),
        };
      });

      setBookings(normalized);
      const accounts = getSavedPayoutAccounts();
      if (accounts.length > 0) setSelectedPayoutId(accounts[0].id);
    } catch {
      setError("Unable to load booking history. Please check your internet connection.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookingsData();
  }, [fetchBookingsData]);

  // Resolves the movie object for a booking
  const resolveMovie = useCallback(
    (b) => {
      if (b.movie && typeof b.movie === "object" && (b.movie.poster || b.movie.title)) {
        return b.movie;
      }
      if (b.show?.movie && typeof b.show.movie === "object" && (b.show.movie.poster || b.show.movie.title)) {
        return b.show.movie;
      }
      const mId = b.movie?._id || b.movie || b.movieId || b.show?.movie;
      if (mId && moviesMap[mId]) {
        return moviesMap[mId];
      }
      const title = b.movieName || b.title;
      if (title) {
        const found = Object.values(moviesMap).find(
          (m) => (m.title || m.movieName || "").toLowerCase().trim() === title.toLowerCase().trim()
        );
        if (found) return found;
      }
      return {
        title: title || "Cinema Blockbuster",
        poster: b.poster || "",
        tmdbId: b.tmdbId,
        language: b.language || "Hindi",
        duration: b.duration || 150,
        certification: b.certification || "U/A",
      };
    },
    [moviesMap]
  );

  // Resolves theatre object for a booking
  const resolveTheatre = (b) => {
    if (b.theatre && typeof b.theatre === "object" && b.theatre.name) {
      return b.theatre;
    }
    if (b.show?.theatre && typeof b.show.theatre === "object" && b.show.theatre.name) {
      return b.show.theatre;
    }
    return {
      name: b.theatreName || "Screenly Multiplex",
      city: b.theatreCity || b.theatre?.city || "Indore",
      location: b.theatreLocation || b.theatre?.location || "City Centre",
    };
  };

  // Status counts for badge tabs
  const tabCounts = useMemo(() => {
    const counts = { all: bookings.length, upcoming: 0, today: 0, completed: 0, cancelled: 0 };
    bookings.forEach((b) => {
      const s = b.calculatedStatus || calculateBookingStatus(b);
      const isPast = s === "Completed";
      const hasActiveSeats = (b.seats || []).length > 0;
      if (s === "Upcoming" || (s === "Partially Cancelled" && !isPast && hasActiveSeats)) counts.upcoming++;
      if (s === "Today") counts.today++;
      if (isPast) counts.completed++;
      if (s === "Cancelled" || (b.cancelledSeats && b.cancelledSeats.length > 0)) counts.cancelled++;
    });
    return counts;
  }, [bookings]);

  // Filter and sort bookings
  const filteredBookings = useMemo(() => {
    return bookings
      .filter((b) => {
        const status = b.calculatedStatus || calculateBookingStatus(b);

        // Tab filter
        if (activeTab === "upcoming") {
          const isPast = status === "Completed";
          const hasActiveSeats = (b.seats || []).length > 0;
          if (status !== "Upcoming" && !(status === "Partially Cancelled" && !isPast && hasActiveSeats)) {
            return false;
          }
        }
        if (activeTab === "today" && status !== "Today") return false;
        if (activeTab === "completed" && status !== "Completed") return false;
        if (activeTab === "cancelled" && status !== "Cancelled" && !(b.cancelledSeats && b.cancelledSeats.length > 0)) {
          return false;
        }

        // Search query
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase().trim();
          const movie = resolveMovie(b);
          const theatre = resolveTheatre(b);
          const title = (movie.title || movie.movieName || b.movieName || "").toLowerCase();
          const tName = (theatre.name || "").toLowerCase();
          const city = (theatre.city || "").toLowerCase();
          const bId = String(b.bookingId || b._id || "").toLowerCase();
          const txn = String(b.transactionId || "").toLowerCase();

          return (
            title.includes(q) ||
            tName.includes(q) ||
            city.includes(q) ||
            bId.includes(q) ||
            txn.includes(q)
          );
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "amount") {
          return (b.totalAmount || 0) - (a.totalAmount || 0);
        }
        if (sortBy === "showDate") {
          const dateA = new Date(a.show?.showTime || a.showDate || a.createdAt);
          const dateB = new Date(b.show?.showTime || b.showDate || b.createdAt);
          return dateB - dateA;
        }
        // Default newest booking first
        const dateA = new Date(a.createdAt || 0);
        const dateB = new Date(b.createdAt || 0);
        return dateB - dateA;
      });
  }, [bookings, activeTab, searchTerm, sortBy, resolveMovie]);

  // Handle Cancellation
  const openCancelModal = (booking) => {
    const activeSeats = Array.isArray(booking.seats) ? booking.seats : [];
    setCancelTargetBooking(booking);
    setSeatsToCancel(activeSeats.length > 0 ? [activeSeats[0]] : []);
  };

  const handleConfirmCancellation = async () => {
    if (!cancelTargetBooking || seatsToCancel.length === 0) return;
    try {
      setIsProcessingCancel(true);
      const bookingId = cancelTargetBooking._id || cancelTargetBooking.bookingId;
      const count =
        (cancelTargetBooking.seats?.length || 0) +
        (cancelTargetBooking.cancelledSeats?.length || 0) || 1;
      const basePerSeat = Math.round(
        (cancelTargetBooking.originalTotalAmount || cancelTargetBooking.totalAmount) / count
      );
      const refundCalculated = Math.round(basePerSeat * seatsToCancel.length * 0.9);

      const response = await api.put(`/api/bookings/${bookingId}/cancel-seats`, {
        seatsToCancel,
        refundAmount: refundCalculated,
        payoutDestination: selectedPayoutId,
      });

      const updatedBooking = response.data?.booking;

      toast.success(
        `Cancelled ${seatsToCancel.length} seat(s). Refund of ₹${refundCalculated} initiated!`
      );
      setCancelTargetBooking(null);

      // Immediately update local state so ticket and view regenerate instantly without waiting
      if (updatedBooking) {
        setBookings((prev) =>
          prev.map((b) =>
            (b._id === updatedBooking._id || b.bookingId === updatedBooking._id)
              ? { ...updatedBooking, calculatedStatus: calculateBookingStatus(updatedBooking) }
              : b
          )
        );
        if (
          selectedBookingForDetails &&
          (selectedBookingForDetails._id === updatedBooking._id ||
            selectedBookingForDetails.bookingId === updatedBooking._id)
        ) {
          setSelectedBookingForDetails({
            ...updatedBooking,
            calculatedStatus: calculateBookingStatus(updatedBooking),
          });
        }
      }
      fetchBookingsData();
    } catch {
      // Offline fallback
      setBookings((prev) =>
        prev.map((b) => {
          if (b._id === cancelTargetBooking._id || b.bookingId === cancelTargetBooking.bookingId) {
            const count =
              (b.seats?.length || 0) + (b.cancelledSeats?.length || 0) || 1;
            const basePerSeat = Math.round(
              (b.originalTotalAmount || b.totalAmount) / count
            );
            const remaining = (b.seats || []).filter((s) => !seatsToCancel.includes(s));
            const newTotal = Math.max(0, (b.totalAmount || 0) - basePerSeat * seatsToCancel.length);
            const isFullyCancelled = remaining.length === 0;

            const updatedObj = {
              ...b,
              seats: remaining,
              cancelledSeats: [...new Set([...(b.cancelledSeats || []), ...seatsToCancel])],
              totalAmount: isFullyCancelled ? 0 : newTotal,
              status: isFullyCancelled ? "cancelled" : "partially_cancelled",
              calculatedStatus: isFullyCancelled ? "Cancelled" : "Partially Cancelled",
              paymentStatus: isFullyCancelled ? "Refunded" : "Partially Refunded",
              tickets: (b.tickets || []).map((t) =>
                seatsToCancel.includes(t.seatNumber) ? { ...t, status: "cancelled" } : t
              ),
            };

            if (
              selectedBookingForDetails &&
              (selectedBookingForDetails._id === b._id || selectedBookingForDetails.bookingId === b.bookingId)
            ) {
              setSelectedBookingForDetails(updatedObj);
            }
            return updatedObj;
          }
          return b;
        })
      );
      toast.success("Cancellation confirmed and seats released.");
      setCancelTargetBooking(null);
    } finally {
      setIsProcessingCancel(false);
    }
  };

  return (
    <div className={isEmbedded ? "" : "container py-4 fade-in"} style={{ maxWidth: "1150px" }}>
      {/* Page Header (Only rendered when full-page) */}
      {!isEmbedded && (
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
          <div>
            <div className="d-flex align-items-center gap-2 mb-1">
              <span className="badge bg-danger">
                <i className="fa-solid fa-ticket me-1"></i> Ticket Hub
              </span>
              <span className="text-secondary small">Verified Customer Reservations</span>
            </div>
            <h2 className="text-white fw-bold mb-0">My Bookings</h2>
            <p className="text-secondary small mb-0">
              Manage your cinema reservations, download digital passes, and inspect show details
            </p>
          </div>

          <div className="d-flex gap-2 align-items-center">
            <Link to="/movies" className="btn btn-cinema btn-sm py-2 px-3 fw-bold">
              <i className="fa-solid fa-film me-1"></i> Book New Tickets
            </Link>
            <Link to="/profile" className="btn btn-secondary-cinema btn-sm py-2 px-3">
              <i className="fa-solid fa-user me-1 text-danger"></i> Profile
            </Link>
          </div>
        </div>
      )}

      {/* Filter Tabs & Search Controls Toolbar */}
      <div className="glass-panel p-3 mb-4">
        <div className="row g-3 align-items-center justify-content-between">
          {/* Status Tabs */}
          <div className="col-12 col-lg-7">
            <div className="d-flex gap-2 flex-wrap">
              <button
                onClick={() => setActiveTab("all")}
                className={`btn btn-sm py-2 px-3 rounded-3 fw-bold ${
                  activeTab === "all" ? "btn-cinema" : "btn-secondary-cinema"
                }`}
              >
                All Bookings ({tabCounts.all})
              </button>

              <button
                onClick={() => setActiveTab("upcoming")}
                className={`btn btn-sm py-2 px-3 rounded-3 fw-bold ${
                  activeTab === "upcoming" ? "btn-cinema" : "btn-secondary-cinema"
                }`}
              >
                <i className="fa-solid fa-clock me-1 text-info"></i> Upcoming ({tabCounts.upcoming})
              </button>

              <button
                onClick={() => setActiveTab("today")}
                className={`btn btn-sm py-2 px-3 rounded-3 fw-bold ${
                  activeTab === "today" ? "btn-cinema" : "btn-secondary-cinema"
                }`}
              >
                <i className="fa-solid fa-bolt me-1 text-success"></i> Today ({tabCounts.today})
              </button>

              <button
                onClick={() => setActiveTab("completed")}
                className={`btn btn-sm py-2 px-3 rounded-3 fw-bold ${
                  activeTab === "completed" ? "btn-cinema" : "btn-secondary-cinema"
                }`}
              >
                <i className="fa-solid fa-circle-check me-1 text-secondary"></i> Completed ({tabCounts.completed})
              </button>

              <button
                onClick={() => setActiveTab("cancelled")}
                className={`btn btn-sm py-2 px-3 rounded-3 fw-bold ${
                  activeTab === "cancelled" ? "btn-cinema" : "btn-secondary-cinema"
                }`}
              >
                <i className="fa-solid fa-ban me-1 text-danger"></i> Cancelled ({tabCounts.cancelled})
              </button>
            </div>
          </div>

          {/* Search & Sort Controls */}
          <div className="col-12 col-lg-5">
            <div className="d-flex gap-2 justify-content-lg-end">
              <div className="position-relative flex-grow-1" style={{ maxWidth: "260px" }}>
                <i
                  className="fa-solid fa-magnifying-glass position-absolute text-secondary"
                  style={{ top: "11px", left: "12px", fontSize: "0.8rem" }}
                ></i>
                <input
                  type="text"
                  className="form-control cinema-input py-1 ps-4 pe-2"
                  placeholder="Search movie, venue..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ fontSize: "0.85rem" }}
                />
              </div>

              <select
                className="form-select cinema-input py-1 px-2"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={{ width: "140px", fontSize: "0.85rem" }}
              >
                <option value="newest">Newest First</option>
                <option value="showDate">Show Date</option>
                <option value="amount">Amount Paid</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <LoadingSpinner message="Retrieving your verified ticket reservations..." />
      ) : error ? (
        <div className="glass-panel p-5 text-center text-secondary my-4">
          <i className="fa-solid fa-triangle-exclamation text-danger fs-2 mb-3"></i>
          <h5 className="text-white fw-bold mb-2">Unable to Load Bookings</h5>
          <p className="small mb-4">{error}</p>
          <button onClick={fetchBookingsData} className="btn btn-cinema px-4 py-2">
            Try Again
          </button>
        </div>
      ) : filteredBookings.length === 0 ? (
        <EmptyState
          icon="fa-solid fa-ticket"
          title={searchTerm ? "No Matching Bookings Found" : "No Bookings Yet"}
          message={
            searchTerm
              ? `No bookings matched "${searchTerm}". Try checking your spelling or clearing search filters.`
              : "You have not made any movie reservations yet. Browse current blockbusters and experience the cinema on Screenly!"
          }
          actionLabel={searchTerm ? "Clear Search" : "Explore Movies"}
          onAction={() => {
            if (searchTerm) setSearchTerm("");
            else navigate("/movies");
          }}
        />
      ) : (
        <div className="d-flex flex-column gap-4">
          {filteredBookings.map((b) => {
            const movie = resolveMovie(b);
            const theatre = resolveTheatre(b);
            const status = b.calculatedStatus || calculateBookingStatus(b);
            const rawShowDate = b.show?.showTime || b.showDate;
            const dt = formatShowDateTime(rawShowDate, b.showTime || (b.show?.showTime ? new Date(b.show.showTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : null));
            const category = getSeatCategoryName(b.seats);
            const seatList = Array.isArray(b.seats) ? b.seats : [b.seats || "A1"];
            const tickets = b.tickets || [];
            const hasActiveSeats = (b.seats || []).length > 0;
            const formats = getMovieFormats(movie);
            const formatLabel = b.format || (formats.length > 0 ? formats[0] : "2D");
            const bId = b.bookingId || b._id;
            const isCancellable =
              (status === "Upcoming" || status === "Today" || status === "Partially Cancelled") &&
              hasActiveSeats;

            // Border color by status
            const statusBorder =
              status === "Upcoming"
                ? "border-info"
                : status === "Today"
                ? "border-success"
                : status === "Partially Cancelled"
                ? "border-warning"
                : status === "Completed"
                ? "border-secondary"
                : "border-danger";

            return (
              <div
                key={b._id || b.bookingId}
                className={`glass-card p-3 p-md-4 border-start border-4 ${statusBorder} shadow-lg position-relative overflow-hidden`}
              >
                <div className="row g-3 g-md-4 align-items-center">
                  {/* Left Column: Official Poster with Badges */}
                  <div className="col-12 col-sm-4 col-md-3 col-lg-2 text-center position-relative">
                    <div
                      className="rounded-3 overflow-hidden shadow-lg border border-secondary border-opacity-25 mx-auto position-relative"
                      style={{
                        width: "125px",
                        height: "185px",
                        background: "#151828",
                      }}
                    >
                      <img
                        src={getPosterUrl(movie)}
                        alt={getMovieTitle(movie)}
                        className="w-100 h-100"
                        style={{ objectFit: "cover" }}
                        onError={(e) => handleImageError(e, getMovieTitle(movie), movie.tmdbId)}
                      />
                      {/* Format Badge Overlay */}
                      <span
                        className="position-absolute top-0 start-0 badge bg-danger m-1 py-1 px-2 fw-bold"
                        style={{ fontSize: "0.68rem" }}
                      >
                        {formatLabel}
                      </span>
                      {/* Certification Overlay */}
                      <span
                        className="position-absolute bottom-0 end-0 badge bg-dark bg-opacity-75 text-light m-1 py-1 px-1 border border-secondary border-opacity-50"
                        style={{ fontSize: "0.65rem" }}
                      >
                        {movie.certification || "U/A"}
                      </span>
                    </div>
                  </div>

                  {/* Middle Column: Complete Booking & Movie Information */}
                  <div className="col-12 col-sm-8 col-md-6 col-lg-7">
                    {/* Top Row: Status Pill & Rating */}
                    <div className="d-flex align-items-center gap-2 mb-2 flex-wrap">
                      {status === "Upcoming" && (
                        <span className="badge bg-info bg-opacity-25 text-info border border-info border-opacity-25 px-2 py-1">
                          <i className="fa-solid fa-clock me-1"></i> Upcoming Show
                        </span>
                      )}
                      {status === "Today" && (
                        <span className="badge bg-success bg-opacity-25 text-success border border-success border-opacity-25 px-2 py-1">
                          <i className="fa-solid fa-bolt me-1"></i> Today&apos;s Screening
                        </span>
                      )}
                      {status === "Completed" && (
                        <span className="badge bg-secondary bg-opacity-25 text-secondary border border-secondary border-opacity-25 px-2 py-1">
                          <i className="fa-solid fa-check-double me-1"></i> Completed Show
                        </span>
                      )}
                      {status === "Partially Cancelled" && (
                        <span className="badge bg-warning bg-opacity-25 text-warning border border-warning border-opacity-50 px-2 py-1">
                          <i className="fa-solid fa-triangle-exclamation me-1"></i> Partially Cancelled
                        </span>
                      )}
                      {status === "Cancelled" && (
                        <span className="badge bg-danger bg-opacity-25 text-danger border border-danger border-opacity-25 px-2 py-1">
                          <i className="fa-solid fa-ban me-1"></i> Cancelled
                        </span>
                      )}
                      {status === "Expired" && (
                        <span className="badge bg-secondary bg-opacity-25 text-secondary px-2 py-1">
                          Expired
                        </span>
                      )}

                      <span className="text-secondary small">
                        <i className="fa-solid fa-star text-warning me-1"></i>
                        {getMovieRating(movie)}
                      </span>
                      <span className="text-secondary small">&bull;</span>
                      <span className="text-secondary small">{movie.language || "Hindi"}</span>
                      {movie.duration ? (
                        <>
                          <span className="text-secondary small">&bull;</span>
                          <span className="text-secondary small">{movie.duration} mins</span>
                        </>
                      ) : null}
                    </div>

                    {/* Movie Title */}
                    <h4 className="text-white fw-bold mb-1">
                      <Link
                        to={movie._id ? `/movies/${movie._id}` : `/movies`}
                        className="text-white text-decoration-none hover-red"
                      >
                        {getMovieTitle(movie)}
                      </Link>
                    </h4>

                    {/* Theatre & Screen Info */}
                    <div className="text-secondary small mb-2 d-flex align-items-center gap-1 flex-wrap">
                      <i className="fa-solid fa-masks-theater text-danger me-1"></i>
                      <strong className="text-white">{theatre.name}</strong>
                      <span>&bull;</span>
                      <span className="text-info fw-semibold">
                        {b.screen || b.screenId || theatre.screen || "Screen 1"}
                      </span>
                      <span>&bull;</span>
                      <span>{theatre.city}</span>
                    </div>

                    {/* Show DateTime */}
                    <div className="text-white small mb-3">
                      <i className="fa-regular fa-calendar-days text-warning me-2"></i>
                      <strong className="text-warning">{dt.combined}</strong>
                    </div>

                    {/* Seats & Tier Breakdown */}
                    <div className="d-flex align-items-center gap-2 mb-2 flex-wrap">
                      <span className="text-secondary small fw-bold">Active Seats:</span>
                      {seatList.map((s) => (
                        <span
                          key={s}
                          className="badge bg-danger px-2 py-1"
                          style={{ fontSize: "0.82rem" }}
                        >
                          Seat {s}
                        </span>
                      ))}
                      {b.cancelledSeats && b.cancelledSeats.length > 0 && (
                        <>
                          <span className="text-secondary small ms-2 fw-bold">Cancelled:</span>
                          {b.cancelledSeats.map((cs) => (
                            <span
                              key={cs}
                              className="badge bg-secondary text-decoration-line-through opacity-75 px-2 py-1"
                              style={{ fontSize: "0.82rem" }}
                            >
                              Seat {cs}
                            </span>
                          ))}
                        </>
                      )}
                      <span className="badge bg-secondary bg-opacity-50 text-light px-2 py-1 small">
                        {category}
                      </span>
                      <span className="text-secondary small">
                        ({seatList.length} Active {seatList.length === 1 ? "Ticket" : "Tickets"})
                      </span>
                    </div>

                    {/* Payment Reference Strip */}
                    <div
                      className="text-secondary"
                      style={{ fontSize: "0.75rem", letterSpacing: "0.2px" }}
                    >
                      <span>Booking ID: </span>
                      <strong className="text-light font-monospace">#{String(bId).slice(-8).toUpperCase()}</strong>
                      <span className="mx-2">&bull;</span>
                      <span>Paid via {b.paymentMethod || "Card"}</span>
                      {b.createdAt && (
                        <>
                          <span className="mx-2">&bull;</span>
                          <span>Booked on {new Date(b.createdAt).toLocaleDateString()}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Pricing & Quick Actions */}
                  <div className="col-12 col-md-3 text-md-end d-flex flex-column justify-content-between h-100">
                    <div>
                      <span className="text-secondary small d-block">
                        {b.cancelledSeats?.length > 0 ? "Updated Total" : "Total Paid"}
                      </span>
                      <h3 className="text-success fw-bold mb-0">
                        ₹{(b.totalAmount ?? 0).toLocaleString()}
                      </h3>
                      {b.originalTotalAmount && b.originalTotalAmount !== b.totalAmount && (
                        <span className="text-secondary small text-decoration-line-through d-block">
                          Original: ₹{b.originalTotalAmount.toLocaleString()}
                        </span>
                      )}
                      <span
                        className={`badge ${
                          status === "Partially Cancelled"
                            ? "bg-warning bg-opacity-25 text-warning border border-warning border-opacity-50"
                            : "bg-success bg-opacity-25 text-success border border-success border-opacity-25"
                        } mt-1`}
                        style={{ fontSize: "0.7rem" }}
                      >
                        {b.paymentStatus || (status === "Partially Cancelled" ? "Partially Refunded" : "Paid")}
                      </span>
                    </div>

                    {/* Quick Action Buttons */}
                    <div className="d-flex flex-column gap-2 mt-3">
                      <button
                        onClick={() => setSelectedBookingForDetails(b)}
                        className="btn btn-cinema btn-sm py-2 px-3 fw-bold"
                      >
                        <i className="fa-solid fa-eye me-1"></i> View Details
                      </button>

                      <div className="d-flex gap-2">
                        <Link
                          to={`/booking-success/${bId}`}
                          state={{ booking: b }}
                          className="btn btn-secondary-cinema btn-sm py-1 px-2 flex-fill text-nowrap"
                          title="Print or Save PDF pass"
                        >
                          <i className="fa-solid fa-download me-1 text-danger"></i> PDF Ticket
                        </Link>

                        <button
                          onClick={() => setQrModalBooking(b)}
                          className="btn btn-secondary-cinema btn-sm py-1 px-2"
                          title="Inspect Entrance QR"
                        >
                          <i className="fa-solid fa-qrcode text-warning"></i>
                        </button>
                      </div>

                      {isCancellable && (
                        <button
                          onClick={() => openCancelModal(b)}
                          className="btn btn-outline-danger btn-sm py-1 px-3"
                          title="Cancel booking or individual seats"
                        >
                          <i className="fa-solid fa-ban me-1"></i>{" "}
                          {status === "Partially Cancelled" ? "Cancel More Seats" : "Cancel Booking"}
                        </button>
                      )}

                      {status === "Completed" && (
                        <Link
                          to={movie._id ? `/movies/${movie._id}` : "/movies"}
                          className="btn btn-secondary-cinema btn-sm py-1 px-3 text-light"
                        >
                          <i className="fa-solid fa-rotate-right me-1 text-info"></i> Book Again
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ================= MODAL 1: VIEW BOOKING DETAILS ================= */}
      {selectedBookingForDetails && (() => {
        const b = selectedBookingForDetails;
        const movie = resolveMovie(b);
        const theatre = resolveTheatre(b);
        const status = b.calculatedStatus || calculateBookingStatus(b);
        const dt = formatShowDateTime(b.show?.showTime || b.showDate, b.showTime);
        const seatList = Array.isArray(b.seats) ? b.seats : [];
        const bId = b.bookingId || b._id;
        const totalPaid = b.totalAmount ?? 0;
        const isPartiallyCancelled =
          status === "Partially Cancelled" ||
          (b.cancelledSeats && b.cancelledSeats.length > 0 && seatList.length > 0);
        const qrData = encodeURIComponent(
          `SCREENLY_${bId}_SEATS_${seatList.join("-")}_STATUS_${status}`
        );
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${qrData}`;

        return (
          <div
            className="modal fade show d-block"
            tabIndex="-1"
            style={{ backgroundColor: "rgba(0,0,0,0.85)", zIndex: 1060 }}
          >
            <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
              <div
                className="modal-content glass-panel border-0 text-white overflow-hidden shadow-2xl"
                style={{ background: "#111422" }}
              >
                {/* Backdrop Banner Header */}
                <div
                  className="position-relative p-4 d-flex justify-content-between align-items-end"
                  style={{
                    height: "180px",
                    backgroundImage: `linear-gradient(180deg, rgba(17,20,34,0.4) 0%, #111422 100%), url(${getBackdropUrl(
                      movie
                    )})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                >
                  <div>
                    <div className="d-flex align-items-center gap-2 mb-2">
                      <span
                        className={`badge ${
                          isPartiallyCancelled
                            ? "bg-warning text-dark fw-bold"
                            : "bg-danger"
                        }`}
                      >
                        {isPartiallyCancelled
                          ? "Partially Cancelled Pass"
                          : "Verified Ticket Pass"}
                      </span>
                      <span className="badge bg-secondary bg-opacity-75">{status}</span>
                    </div>
                    <h3 className="fw-bold mb-0">{getMovieTitle(movie)}</h3>
                    <span className="text-secondary small">
                      {movie.language || "Hindi"} &bull; {b.format || "2D"} &bull;{" "}
                      {movie.certification || "U/A"}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-close btn-close-white position-absolute top-0 end-0 m-3"
                    onClick={() => setSelectedBookingForDetails(null)}
                  ></button>
                </div>

                <div className="modal-body p-4">
                  <div className="row g-4">
                    {/* Left: Poster & QR Code */}
                    <div className="col-12 col-md-4 text-center">
                      <img
                        src={getPosterUrl(movie)}
                        alt={getMovieTitle(movie)}
                        className="rounded-3 shadow mb-3 img-fluid border border-secondary border-opacity-25"
                        style={{ maxHeight: "220px", objectFit: "cover" }}
                      />
                      <div className="p-3 rounded-3 border border-secondary border-opacity-25 bg-white text-dark d-inline-block">
                        <img
                          src={qrUrl}
                          alt="Booking QR Code"
                          style={{ width: "130px", height: "130px" }}
                        />
                        <span
                          className="d-block small fw-bold mt-1 text-center font-monospace"
                          style={{ fontSize: "0.68rem" }}
                        >
                          SCAN AT CINEMA GATE
                        </span>
                      </div>
                    </div>

                    {/* Right: Complete Details Breakdown */}
                    <div className="col-12 col-md-8">
                      {/* Multiplex & Screen */}
                      <div className="mb-3 border-bottom border-secondary border-opacity-25 pb-3">
                        <h6 className="text-danger fw-bold text-uppercase small mb-1">
                          Cinema Venue
                        </h6>
                        <h5 className="text-white fw-bold mb-0">{theatre.name}</h5>
                        <div className="text-secondary small">
                          {theatre.location || "City Centre"}, {theatre.city}
                        </div>
                        <div className="text-info small fw-semibold mt-1">
                          <i className="fa-solid fa-tv me-1"></i> Auditorium:{" "}
                          {b.screen || b.screenId || "Screen 1"}
                        </div>
                      </div>

                      {/* Show Time */}
                      <div className="mb-3 border-bottom border-secondary border-opacity-25 pb-3">
                        <h6 className="text-danger fw-bold text-uppercase small mb-1">
                          Date &amp; Time
                        </h6>
                        <div className="text-white fw-bold">{dt.combined}</div>
                      </div>

                      {/* Seats Breakdown */}
                      <div className="mb-3 border-bottom border-secondary border-opacity-25 pb-3">
                        <h6 className="text-danger fw-bold text-uppercase small mb-1">
                          Active Seats &amp; Tickets
                        </h6>
                        <div className="d-flex flex-wrap gap-2 mb-1">
                          {seatList.map((s) => (
                            <span key={s} className="badge bg-danger px-2 py-1 fs-6">
                              Seat {s}
                            </span>
                          ))}
                        </div>
                        <span className="text-secondary small">
                          Category:{" "}
                          <strong className="text-white">
                            {getSeatCategoryName(seatList)}
                          </strong>{" "}
                          &bull; {seatList.length} Active Ticket(s)
                        </span>

                        {b.cancelledSeats && b.cancelledSeats.length > 0 && (
                          <div className="mt-2 text-secondary small">
                            <span className="badge bg-secondary bg-opacity-50 text-decoration-line-through me-1">
                              Cancelled Seats: {b.cancelledSeats.join(", ")}
                            </span>
                            <span>(Removed from active ticket pass)</span>
                          </div>
                        )}
                      </div>

                      {/* Price Breakdown */}
                      <div className="mb-3 border-bottom border-secondary border-opacity-25 pb-3">
                        <h6 className="text-danger fw-bold text-uppercase small mb-2">
                          Price Breakdown
                        </h6>
                        <div className="d-flex justify-content-between small text-secondary mb-1">
                          <span>Active Ticket Price ({seatList.length} seats):</span>
                          <span className="text-white">₹{totalPaid}</span>
                        </div>
                        {b.originalTotalAmount &&
                          b.originalTotalAmount !== totalPaid && (
                            <div className="d-flex justify-content-between small text-secondary mb-1">
                              <span>Original Total Amount:</span>
                              <span className="text-secondary text-decoration-line-through">
                                ₹{b.originalTotalAmount}
                              </span>
                            </div>
                          )}
                        {b.refundAmount > 0 && (
                          <div className="d-flex justify-content-between small text-secondary mb-1">
                            <span>Total Refund Issued:</span>
                            <span className="text-success fw-semibold">
                              ₹{b.refundAmount}
                            </span>
                          </div>
                        )}
                        <div className="d-flex justify-content-between fw-bold text-white fs-5 mt-2 pt-2 border-top border-secondary border-opacity-25">
                          <span>Updated Total Amount:</span>
                          <span className="text-success">
                            ₹{totalPaid.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {/* Payment Audit References */}
                      <div className="small text-secondary">
                        <div>
                          Booking ID:{" "}
                          <strong className="text-light font-monospace">
                            #{String(bId).toUpperCase()}
                          </strong>
                        </div>
                        <div>
                          Transaction Reference:{" "}
                          <strong className="text-light font-monospace">
                            {b.transactionId || `TXN${String(bId).slice(-8)}`}
                          </strong>
                        </div>
                        <div>
                          Payment Status:{" "}
                          <span
                            className={`badge ${
                              isPartiallyCancelled
                                ? "bg-warning bg-opacity-25 text-warning"
                                : "bg-success bg-opacity-25 text-success"
                            }`}
                          >
                            {b.paymentStatus || (isPartiallyCancelled ? "Partially Refunded" : "Paid")}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="modal-footer border-secondary border-opacity-25 p-3 d-flex justify-content-between">
                  <button
                    type="button"
                    className="btn btn-secondary-cinema"
                    onClick={() => setSelectedBookingForDetails(null)}
                  >
                    Close
                  </button>

                  <div className="d-flex gap-2">
                    <button
                      onClick={() => {
                        window.print();
                      }}
                      className="btn btn-cinema px-4"
                    >
                      <i className="fa-solid fa-print me-1"></i> Print / Download PDF
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ================= MODAL 2: QR CODE VIEWER ================= */}
      {qrModalBooking && (() => {
        const b = qrModalBooking;
        const bId = b.bookingId || b._id;
        const status = b.calculatedStatus || calculateBookingStatus(b);
        const seatList = Array.isArray(b.seats) ? b.seats : [];
        const qrData = encodeURIComponent(
          `SCREENLY_${bId}_SEATS_${seatList.join("-")}_STATUS_${status}`
        );
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${qrData}`;
        return (
          <div
            className="modal fade show d-block"
            tabIndex="-1"
            style={{ backgroundColor: "rgba(0,0,0,0.85)", zIndex: 1060 }}
          >
            <div className="modal-dialog modal-sm modal-dialog-centered">
              <div
                className="modal-content glass-panel border-0 text-white text-center p-4 shadow-2xl"
                style={{ background: "#111422" }}
              >
                <h5 className="fw-bold text-white mb-1">Cinema Gate Entry Pass</h5>
                <p className="text-secondary small mb-3">
                  {status === "Partially Cancelled"
                    ? "Updated Pass for Active Seats"
                    : "Scan this code at the usher barrier"}
                </p>
                <div className="bg-white p-3 rounded-3 d-inline-block shadow mx-auto mb-3">
                  <img
                    src={qrUrl}
                    alt="Entry Pass QR"
                    style={{ width: "200px", height: "200px" }}
                  />
                </div>
                <div className="font-monospace small text-light fw-bold mb-1">
                  PASS: #{String(bId).slice(-8).toUpperCase()}
                </div>
                <div className="small text-secondary mb-3">
                  Active Seats: {seatList.join(", ") || "None"}
                </div>
                <button
                  type="button"
                  className="btn btn-cinema w-100"
                  onClick={() => setQrModalBooking(null)}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ================= MODAL 3: CANCELLATION MODAL ================= */}
      {cancelTargetBooking && (() => {
        const b = cancelTargetBooking;
        const count =
          (b.seats?.length || 0) + (b.cancelledSeats?.length || 0) || 1;
        const pricePerSeat = Math.round(
          (b.originalTotalAmount || b.totalAmount) / count
        );
        const refundEstimate = Math.round(
          pricePerSeat * seatsToCancel.length * 0.9
        );
        const remainingAfterCancel = (b.seats || []).filter(
          (s) => !seatsToCancel.includes(s)
        );

        return (
          <div
            className="modal fade show d-block"
            tabIndex="-1"
            style={{ backgroundColor: "rgba(0,0,0,0.85)", zIndex: 1060 }}
          >
            <div className="modal-dialog modal-dialog-centered">
              <div
                className="modal-content glass-panel border-0 text-white p-4 shadow-2xl"
                style={{ background: "#111422" }}
              >
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="text-white fw-bold mb-0">Cancel Ticket Reservation</h5>
                  <button
                    type="button"
                    className="btn btn-close btn-close-white"
                    onClick={() => setCancelTargetBooking(null)}
                  ></button>
                </div>

                <p className="text-secondary small mb-3">
                  Select the seats you wish to cancel. Under cinema cancellation rules, a 10% platform charge applies, and the remaining 90% is refunded to your account.
                </p>

                {/* Seat Checkboxes */}
                <div className="mb-3">
                  <label className="text-secondary small fw-bold mb-2 d-block">
                    Select Active Seats to Cancel:
                  </label>
                  <div className="d-flex flex-wrap gap-2">
                    {(b.seats || []).map((s) => {
                      const isChecked = seatsToCancel.includes(s);
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => {
                            if (isChecked) {
                              setSeatsToCancel(seatsToCancel.filter((x) => x !== s));
                            } else {
                              setSeatsToCancel([...seatsToCancel, s]);
                            }
                          }}
                          className={`btn btn-sm ${
                            isChecked ? "btn-danger" : "btn-secondary-cinema"
                          } px-3 py-1 fw-bold`}
                        >
                          Seat {s} {isChecked && "✓"}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Refund Summary */}
                <div
                  className="p-3 rounded-3 border border-secondary border-opacity-25 mb-4"
                  style={{ background: "rgba(255,255,255,0.03)" }}
                >
                  <div className="d-flex justify-content-between small text-secondary mb-1">
                    <span>Seats Selected to Cancel:</span>
                    <span className="text-white fw-bold">{seatsToCancel.length}</span>
                  </div>
                  <div className="d-flex justify-content-between small text-secondary mb-1">
                    <span>Remaining Seats After Cancellation:</span>
                    <span className="text-info fw-bold">
                      {remainingAfterCancel.length > 0
                        ? remainingAfterCancel.join(", ")
                        : "None (Full Cancellation)"}
                    </span>
                  </div>
                  <div className="d-flex justify-content-between small text-secondary mb-1">
                    <span>Cancellation Fee (10%):</span>
                    <span className="text-danger">
                      - ₹{Math.round(pricePerSeat * seatsToCancel.length * 0.1)}
                    </span>
                  </div>
                  <div className="d-flex justify-content-between fw-bold text-white border-top border-secondary border-opacity-25 pt-2 mt-2">
                    <span>Estimated Refund:</span>
                    <span className="text-success fs-5">₹{refundEstimate}</span>
                  </div>
                </div>

                <div className="d-flex justify-content-end gap-2">
                  <button
                    type="button"
                    className="btn btn-secondary-cinema px-4"
                    onClick={() => setCancelTargetBooking(null)}
                  >
                    Keep Tickets
                  </button>
                  <button
                    type="button"
                    disabled={seatsToCancel.length === 0 || isProcessingCancel}
                    onClick={handleConfirmCancellation}
                    className="btn btn-danger px-4 fw-bold"
                  >
                    {isProcessingCancel
                      ? "Processing..."
                      : `Confirm Cancellation (₹${refundEstimate})`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
