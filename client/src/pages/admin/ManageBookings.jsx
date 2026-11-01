import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import api from "../../services/api";
import LoadingSpinner from "../../components/LoadingSpinner";
import EmptyState from "../../components/EmptyState";
import AdminNav from "../../components/AdminNav";
import toast from "react-hot-toast";

export default function ManageBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  // Admin Selective Cancellation Modal
  const [cancelTargetBooking, setCancelTargetBooking] = useState(null);
  const [seatsToCancel, setSeatsToCancel] = useState([]);
  const [isCancelling, setIsCancelling] = useState(false);

  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/bookings");
      setBookings(Array.isArray(res.data) ? res.data : []);
    } catch {
      const cached = JSON.parse(localStorage.getItem("screenly_user_bookings") || "[]");
      setBookings(cached);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const openAdminCancelModal = (b) => {
    setCancelTargetBooking(b);
    setSeatsToCancel([]);
  };

  const handleAdminSeatCancellation = async () => {
    if (!cancelTargetBooking || seatsToCancel.length === 0) {
      toast.error("Please choose at least 1 seat to cancel.");
      return;
    }

    setIsCancelling(true);
    const booking = cancelTargetBooking;
    const count =
      (booking.seats?.length || 0) + (booking.cancelledSeats?.length || 0) || 1;
    const basePerSeat = Math.round(
      (booking.originalTotalAmount || booking.totalAmount) / count
    );
    const refundAmount = Math.round(basePerSeat * seatsToCancel.length);

    try {
      await api.put(`/api/bookings/${booking._id}/cancel-seats`, {
        seatsToCancel,
        refundAmount,
        payoutDestination: "Admin Box Office Refund",
        reason: "Admin cancelled seat(s)",
      });
      toast.success(`Cancelled ${seatsToCancel.length} seat(s) successfully.`);
    } catch {
      // Local fallback
      const remainingSeats = (booking.seats || []).filter(
        (s) => !seatsToCancel.includes(s)
      );
      const updated = bookings.map((b) =>
        b._id === booking._id
          ? {
              ...b,
              seats: remainingSeats,
              cancelledSeats: [...new Set([...(b.cancelledSeats || []), ...seatsToCancel])],
              status: remainingSeats.length === 0 ? "cancelled" : "partially_cancelled",
              totalAmount: Math.max(0, (b.totalAmount || 0) - basePerSeat * seatsToCancel.length),
              refundAmount: (b.refundAmount || 0) + refundAmount,
            }
          : b
      );
      setBookings(updated);
      localStorage.setItem("screenly_user_bookings", JSON.stringify(updated));
      toast.success("Cancellation confirmed.");
    }

    setIsCancelling(false);
    setCancelTargetBooking(null);
    fetchBookings();
  };

  const filtered = bookings.filter((b) => {
    const title = b.movie?.title || b.movieName || "";
    const customer = b.user?.name || b.user?.email || "Customer";
    const matchesSearch =
      b._id.toLowerCase().includes(search.toLowerCase()) ||
      title.toLowerCase().includes(search.toLowerCase()) ||
      customer.toLowerCase().includes(search.toLowerCase());

    const showTimeDate = b.show?.showTime ? new Date(b.show.showTime) : null;
    const isPastShow =
      Boolean(b.isPastShow) ||
      b.showLifecycle === "Completed" ||
      (showTimeDate && showTimeDate < new Date()) ||
      (b.showDate && b.showDate !== "Today" && b.showDate !== "Tomorrow" && new Date(b.showDate) < new Date());

    let matchesStatus = true;
    if (statusFilter === "confirmed") {
      matchesStatus = b.status === "confirmed" && !isPastShow;
    } else if (statusFilter === "partially_cancelled") {
      matchesStatus =
        b.status === "partially_cancelled" ||
        b.status === "Partially Cancelled" ||
        (b.cancelledSeats?.length > 0 && (b.seats?.length || 0) > 0);
    } else if (statusFilter === "past") {
      matchesStatus = isPastShow;
    } else if (statusFilter !== "All") {
      matchesStatus = b.status === statusFilter;
    }

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="container py-4 fade-in" style={{ maxWidth: "1200px" }}>
      {/* Top Admin Navigation */}
      <AdminNav />

      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <Link to="/admin" className="text-secondary small text-decoration-none">
            &larr; Admin Dashboard
          </Link>
          <h2 className="text-white fw-bold mb-0">All Cinema Bookings</h2>
          <span className="text-secondary small">Comprehensive audit history across all auditoriums and screenings</span>
        </div>
        <button onClick={fetchBookings} className="btn btn-secondary-cinema btn-sm py-2 px-3">
          <i className="fa-solid fa-arrows-rotate me-1"></i> Refresh
        </button>
      </div>

      {/* Filter Matrix */}
      <div className="glass-panel p-3 mb-4">
        <div className="row g-2 align-items-center">
          <div className="col-12 col-md-6">
            <input
              type="text"
              className="form-control cinema-input"
              placeholder="Search by Booking ID, customer email, or movie..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="col-6 col-md-3">
            <select
              className="form-select cinema-input"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="All">All Statuses</option>
              <option value="confirmed">Active / Upcoming Shows</option>
              <option value="partially_cancelled">Partially Cancelled</option>
              <option value="past">Completed / Past Shows</option>
              <option value="pending">Pending Hold</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div className="col-6 col-md-3 text-end text-secondary small">
            Showing: <strong className="text-white">{filtered.length}</strong> reservations
          </div>
        </div>
      </div>

      {/* Bookings Table */}
      {loading ? (
        <LoadingSpinner message="Loading reservation records..." />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="fa-solid fa-receipt"
          title="No Transactions Found"
          message="No reservations matched your search query or status filter."
          actionLabel="Clear Filter"
          onAction={() => {
            setSearch("");
            setStatusFilter("All");
          }}
        />
      ) : (
        <div className="glass-panel p-4">
          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Booking ID</th>
                  <th>Movie & Venue</th>
                  <th>Screen & Showtime</th>
                  <th>Seats</th>
                  <th>Total Paid</th>
                  <th>Status</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((b) => {
                  const showTimeDate = b.show?.showTime ? new Date(b.show.showTime) : null;
                  const isPastShow =
                    Boolean(b.isPastShow) ||
                    b.showLifecycle === "Completed" ||
                    (showTimeDate && showTimeDate < new Date()) ||
                    (b.showDate && b.showDate !== "Today" && b.showDate !== "Tomorrow" && new Date(b.showDate) < new Date());
                  const isConfirmed = b.status === "confirmed";
                  const isPartiallyCancelled =
                    b.status === "partially_cancelled" ||
                    b.status === "Partially Cancelled" ||
                    (b.cancelledSeats?.length > 0 && (b.seats?.length || 0) > 0);

                  return (
                    <tr key={b._id}>
                      <td className="font-monospace small text-secondary">
                        #{b._id.slice(-6).toUpperCase()}
                      </td>
                      <td>
                        <div className="text-white fw-bold small">{b.movie?.title || b.movieName || "Movie"}</div>
                        <div className="text-secondary" style={{ fontSize: "0.75rem" }}>
                          {b.theatre?.name || "Multiplex"} &bull; {b.theatre?.city || "Indore"}
                        </div>
                      </td>
                      <td className="small text-light">
                        <span className="text-info fw-semibold">{b.screen || b.theatre?.screen || "Screen 1"}</span>
                        <div className="text-secondary" style={{ fontSize: "0.75rem" }}>
                          {b.showDate || (showTimeDate ? showTimeDate.toLocaleDateString() : "Date")} &bull; {b.showTime || (showTimeDate ? showTimeDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Time")}
                        </div>
                      </td>
                      <td>
                        <span className="badge bg-secondary text-white small">
                          {b.seats?.length > 0 ? b.seats.join(", ") : "No active seats"}
                        </span>
                        {b.cancelledSeats && b.cancelledSeats.length > 0 && (
                          <div className="mt-1">
                            <span
                              className="badge bg-danger bg-opacity-25 text-danger border border-danger border-opacity-50"
                              style={{ fontSize: "0.68rem" }}
                            >
                              Cancelled: {b.cancelledSeats.join(", ")}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="text-success fw-bold">
                        ₹{b.totalAmount ?? 0}
                        {b.originalTotalAmount && b.originalTotalAmount !== b.totalAmount && (
                          <div className="text-secondary small text-decoration-line-through">
                            Orig: ₹{b.originalTotalAmount}
                          </div>
                        )}
                        {b.refundAmount > 0 && (
                          <div className="text-info small" style={{ fontSize: "0.72rem" }}>
                            Refund: ₹{b.refundAmount}
                          </div>
                        )}
                      </td>
                      <td>
                        {b.status === "cancelled" ? (
                          <span className="badge bg-danger small">CANCELLED</span>
                        ) : isPartiallyCancelled ? (
                          <span className="badge bg-warning text-dark small fw-bold">
                            PARTIALLY CANCELLED
                          </span>
                        ) : isPastShow ? (
                          <span className="badge bg-secondary small">
                            <i className="fa-solid fa-flag-checkered me-1"></i> PAST SHOW
                          </span>
                        ) : isConfirmed ? (
                          <span className="badge bg-success small">CONFIRMED</span>
                        ) : (
                          <span className="badge bg-warning text-dark small">{b.status?.toUpperCase()}</span>
                        )}
                      </td>
                      <td className="text-end">
                        <div className="d-flex justify-content-end gap-1">
                          {(isConfirmed || isPartiallyCancelled) && !isPastShow && (b.seats?.length || 0) > 0 && (
                            <button
                              onClick={() => openAdminCancelModal(b)}
                              className="btn btn-sm btn-outline-danger py-1 px-2"
                              title="Cancel tickets"
                            >
                              <i className="fa-solid fa-ban"></i>
                            </button>
                          )}
                          <Link to={`/booking-success/${b._id}`} state={{ booking: b }} className="btn btn-sm btn-secondary-cinema py-1 px-2" title="View E-Pass">
                            <i className="fa-solid fa-qrcode"></i>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Admin Partial Cancellation Modal */}
      {cancelTargetBooking && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-3"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.88)", backdropFilter: "blur(10px)", zIndex: 99999 }}
          onClick={() => setCancelTargetBooking(null)}
        >
          <div
            className="glass-panel p-4 p-md-5 overflow-auto shadow-2xl border"
            style={{ maxWidth: "600px", width: "100%", background: "#151828" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="d-flex justify-content-between align-items-center mb-3 border-bottom border-secondary border-opacity-25 pb-3">
              <h5 className="text-white fw-bold mb-0">Admin Ticket Cancellation</h5>
              <button onClick={() => setCancelTargetBooking(null)} className="btn btn-sm btn-secondary-cinema rounded-circle">
                <i className="fa-solid fa-xmark text-white"></i>
              </button>
            </div>

            <p className="text-secondary small mb-3">
              Select which individual ticket(s) to cancel for Booking #{cancelTargetBooking._id}:
            </p>

            <div className="d-flex flex-column gap-2 mb-4">
              {cancelTargetBooking.seats?.map((seat) => {
                const isSelected = seatsToCancel.includes(seat);
                return (
                  <div
                    key={seat}
                    onClick={() =>
                      setSeatsToCancel((prev) =>
                        prev.includes(seat) ? prev.filter((s) => s !== seat) : [...prev, seat]
                      )
                    }
                    className="p-3 rounded-2 border d-flex justify-content-between align-items-center cursor-pointer"
                    style={{
                      backgroundColor: isSelected ? "rgba(229, 9, 20, 0.15)" : "rgba(255, 255, 255, 0.02)",
                      borderColor: isSelected ? "#e50914" : "rgba(255, 255, 255, 0.1)",
                      cursor: "pointer",
                    }}
                  >
                    <span className="text-white fw-bold">Seat {seat}</span>
                    <span className={`badge ${isSelected ? "bg-danger" : "bg-secondary"}`}>
                      {isSelected ? "Cancel This Seat" : "Keep Active"}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="d-flex justify-content-end gap-2">
              <button onClick={() => setCancelTargetBooking(null)} className="btn btn-secondary-cinema py-2 px-3">
                Dismiss
              </button>
              <button
                onClick={handleAdminSeatCancellation}
                disabled={seatsToCancel.length === 0 || isCancelling}
                className="btn btn-danger py-2 px-4 fw-bold"
              >
                {isCancelling ? "Processing..." : `Cancel ${seatsToCancel.length} Seat(s)`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}