// client/src/pages/BookingSuccess.jsx
import { useState, useEffect } from "react";
import { useParams, useLocation, Link } from "react-router-dom";
import api from "../services/api";
import { getPosterUrl, handleImageError } from "../utils/tmdbHelper";
import toast from "react-hot-toast";

export default function BookingSuccess() {
  const { bookingId } = useParams();
  const location = useLocation();

  const [booking, setBooking] = useState(() => {
    if (location.state?.booking) return location.state.booking;
    const all = JSON.parse(localStorage.getItem("screenly_user_bookings") || "[]");
    return all.find((b) => b._id === bookingId || b.bookingId === bookingId) || null;
  });

  useEffect(() => {
    if (bookingId) {
      api
        .get(`/api/bookings/${bookingId}`)
        .then((res) => {
          if (res.data) setBooking(res.data);
        })
        .catch(() => {});
    }
  }, [bookingId]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    toast.success("E-Ticket generated! Ready to print or save as PDF.");
    window.print();
  };

  if (!booking) {
    return (
      <div className="container py-5 text-center text-white">
        <div className="glass-panel p-5 d-inline-block">
          <i className="fa-solid fa-ticket text-danger fs-1 mb-3"></i>
          <h4>Booking Pass Not Found</h4>
          <p className="text-secondary small mb-4">
            The requested booking confirmation was not found in your active session.
          </p>
          <Link to="/" className="btn btn-cinema">
            Back to Movies
          </Link>
        </div>
      </div>
    );
  }

  const bId = booking.bookingId || booking._id || bookingId;
  const movieTitle = booking.movie?.title || booking.movieName || "Cinema Movie";
  const theatreName = booking.theatre?.name || "Screenly Multiplex";
  const theatreLocation = booking.theatre?.location
    ? `${booking.theatre.location}, ${booking.theatre.city || ""}`
    : booking.theatre?.city || "Downtown Central";
  const screen = booking.screen || booking.theatre?.screen || "Screen 1 (Dolby Atmos 4K Laser)";
  const showDate =
    booking.showDate ||
    (booking.show?.showTime
      ? new Date(booking.show.showTime).toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        })
      : "Today");
  const showTime =
    booking.showTime ||
    (booking.show?.showTime
      ? new Date(booking.show.showTime).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "7:30 PM");
  const seatsList = Array.isArray(booking.seats) ? booking.seats : [];
  const totalAmount = booking.totalAmount ?? 0;
  const isPartiallyCancelled =
    booking.status === "partially_cancelled" ||
    booking.status === "Partially Cancelled" ||
    (booking.cancelledSeats && booking.cancelledSeats.length > 0 && seatsList.length > 0);
  const displayStatus = isPartiallyCancelled
    ? "Partially Cancelled"
    : booking.status === "cancelled"
    ? "Cancelled"
    : "Confirmed";
  const paymentStatus =
    booking.paymentStatus || (isPartiallyCancelled ? "Partially Refunded" : "Success");
  const transactionId =
    booking.transactionId ||
    (booking.createdAt
      ? `TXN${new Date(booking.createdAt).getTime().toString().slice(-6)}`
      : `TXN${String(bId).slice(-6)}`);
  const qrData = encodeURIComponent(
    `SCREENLY_${bId}_SEATS_${seatsList.join("-")}_STATUS_${displayStatus}`
  );
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=130x130&data=${qrData}`;

  return (
    <div className="container py-4 fade-in" style={{ maxWidth: "860px" }}>
      {/* Success Celebration Header */}
      <div className="text-center mb-4 no-print">
        <div
          className="rounded-circle d-inline-flex align-items-center justify-content-center mb-3 shadow"
          style={{
            width: "68px",
            height: "68px",
            background: isPartiallyCancelled
              ? "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
              : "linear-gradient(135deg, #10b981 0%, #059669 100%)",
            boxShadow: isPartiallyCancelled
              ? "0 0 20px rgba(245, 158, 11, 0.4)"
              : "0 0 20px rgba(16, 185, 129, 0.4)",
          }}
        >
          <i
            className={`fa-solid ${
              isPartiallyCancelled ? "fa-triangle-exclamation" : "fa-check"
            } text-white fs-2`}
          ></i>
        </div>
        <h2 className="text-white fw-bold mb-1">
          {isPartiallyCancelled ? "Pass Updated (Partially Cancelled)" : "Booking Confirmed!"}
        </h2>
        <p className="text-light small fw-semibold mb-2">
          {isPartiallyCancelled ? (
            <span className="text-warning">
              <i className="fa-solid fa-circle-info me-1"></i> Your updated pass reflects your active seats. Cancelled seats have been released.
            </span>
          ) : (
            <span className="text-success">
              <i className="fa-solid fa-circle-check me-1"></i> Your seats are reserved and your digital cinema pass is ready below.
            </span>
          )}
        </p>
      </div>

      {/* Action Buttons Toolbar */}
      <div className="d-flex flex-wrap justify-content-center gap-2 mb-4 no-print">
        <button onClick={handleDownload} className="btn btn-cinema px-4 py-2">
          <i className="fa-solid fa-download me-2"></i> Download Ticket (PDF)
        </button>
        <button onClick={handlePrint} className="btn btn-secondary-cinema px-4 py-2">
          <i className="fa-solid fa-print me-2"></i> Print Ticket
        </button>
        <Link to="/profile" className="btn btn-secondary-cinema px-3 py-2">
          <i className="fa-solid fa-ticket me-1"></i> My Bookings
        </Link>
      </div>

      {/* Printable Digital Pass */}
      <div
        className="printable-ticket rounded-4 overflow-hidden shadow-lg border"
        style={{ background: "#151828", borderColor: "rgba(255,255,255,0.12)" }}
      >
        {/* Pass Header */}
        <div
          className="p-4 d-flex justify-content-between align-items-center text-white"
          style={{
            background: isPartiallyCancelled
              ? "linear-gradient(135deg, #b45309 0%, #78350f 100%)"
              : "linear-gradient(135deg, #e50914 0%, #8b0000 100%)",
          }}
        >
          <div>
            <h3 className="fw-black mb-0" style={{ letterSpacing: "-0.5px" }}>
              SCREENLY DIGITAL PASS
            </h3>
            <span className="small text-white text-opacity-90">
              Official Cinema E-Ticket &bull; Confirmed Entry
            </span>
          </div>
          <div className="text-end font-monospace small">
            <div className="fw-bold">BOOKING ID: #{bId}</div>
            <span
              className={`badge ${
                isPartiallyCancelled
                  ? "bg-dark text-warning border border-warning border-opacity-50"
                  : displayStatus === "Cancelled"
                  ? "bg-dark text-danger border border-danger border-opacity-50"
                  : "bg-dark text-success"
              } mt-1 fw-bold`}
            >
              <i
                className={`fa-solid ${
                  isPartiallyCancelled
                    ? "fa-triangle-exclamation"
                    : displayStatus === "Cancelled"
                    ? "fa-ban"
                    : "fa-circle-check"
                } me-1`}
              ></i>{" "}
              {displayStatus.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Pass Body */}
        <div className="p-4 p-md-5">
          <div className="row g-4 align-items-center">
            {booking.movie && (
              <div className="col-12 col-sm-4 text-center">
                <img
                  src={getPosterUrl(booking.movie)}
                  alt={movieTitle}
                  onError={(e) => handleImageError(e, movieTitle, booking.movie?.tmdbId)}
                  className="img-fluid rounded-3 shadow-lg"
                  style={{
                    maxHeight: "250px",
                    objectFit: "cover",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                />
              </div>
            )}
            <div className={`col-12 ${booking.movie ? "col-sm-8" : "col-12"}`}>
              <div className="d-flex align-items-center gap-2 mb-1">
                <span className="badge bg-danger small">Cinema Screening</span>
                <span className="badge bg-dark border border-secondary border-opacity-25 small">
                  {screen}
                </span>
              </div>
              <h2 className="text-white fw-bold mb-2">{movieTitle}</h2>
              <div className="text-secondary small mb-2">
                <i className="fa-solid fa-masks-theater text-danger me-1"></i>
                <strong className="text-light">{theatreName}</strong> &bull; {theatreLocation}
              </div>
              <div className="text-white small mb-3">
                <i className="fa-solid fa-calendar-days text-warning me-1"></i>
                <strong>{showDate}</strong> at <strong className="text-danger">{showTime}</strong>
              </div>

              {/* Confirmed / Remaining Active Seats Badges */}
              <div className="mb-3">
                <span className="text-secondary small fw-bold text-uppercase d-block mb-1">
                  Active Seats ({seatsList.length}):
                </span>
                <div className="d-flex flex-wrap gap-2">
                  {seatsList.map((s) => (
                    <span
                      key={s}
                      className="badge bg-danger text-white fs-6 px-3 py-1 rounded-2 shadow-sm"
                    >
                      Seat {s}
                    </span>
                  ))}
                  {seatsList.length === 0 && (
                    <span className="text-secondary small">No active seats</span>
                  )}
                </div>
                {booking.cancelledSeats && booking.cancelledSeats.length > 0 && (
                  <div className="mt-2 text-secondary small">
                    <span className="badge bg-secondary bg-opacity-50 text-decoration-line-through me-1">
                      Cancelled Seats: {booking.cancelledSeats.join(", ")}
                    </span>
                    <span>(Released from entry pass)</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <hr className="border-secondary opacity-25 my-4" />

          {/* Pricing, Payment Status & Ticket QR Code */}
          <div className="row g-3 align-items-center">
            <div className="col-12 col-sm-8">
              <div className="row g-2">
                <div className="col-6">
                  <span className="text-secondary small text-uppercase fw-bold d-block">
                    Transaction ID
                  </span>
                  <span className="text-light font-monospace small fw-bold">{transactionId}</span>
                </div>
                <div className="col-6">
                  <span className="text-secondary small text-uppercase fw-bold d-block">
                    Payment Status
                  </span>
                  <span className="badge bg-success bg-opacity-25 text-success border border-success border-opacity-50 fw-bold">
                    <i className="fa-solid fa-check me-1"></i> {paymentStatus}
                  </span>
                </div>
                <div className="col-6 mt-2">
                  <span className="text-secondary small text-uppercase fw-bold d-block">
                    Payment Method
                  </span>
                  <span className="text-white small">
                    {booking.paymentMethod || "UPI / Card Online"}
                  </span>
                </div>
                <div className="col-6 mt-2">
                  <span className="text-secondary small text-uppercase fw-bold d-block">
                    {booking.cancelledSeats?.length > 0
                      ? "Updated Ticket Price"
                      : "Total Ticket Price"}
                  </span>
                  <span className="text-danger fw-bold fs-4">₹{totalAmount}</span>
                  {booking.originalTotalAmount &&
                    booking.originalTotalAmount !== totalAmount && (
                      <div className="text-secondary small text-decoration-line-through">
                        Original: ₹{booking.originalTotalAmount}
                      </div>
                    )}
                  {booking.refundAmount > 0 && (
                    <div className="text-success small fw-semibold">
                      Refund: ₹{booking.refundAmount}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="col-12 col-sm-4 text-center text-sm-end">
              <div className="d-inline-block p-2 bg-white rounded-3 shadow">
                <img
                  src={qrUrl}
                  alt="Ticket QR Pass"
                  style={{ width: "105px", height: "105px", display: "block" }}
                />
              </div>
              <div className="text-secondary mt-1" style={{ fontSize: "0.68rem" }}>
                Scan at cinema entry turnstile
              </div>
            </div>
          </div>
        </div>

        {/* Pass Footer */}
        <div
          className="p-3 text-center border-top border-secondary border-opacity-25"
          style={{ background: "rgba(255, 255, 255, 0.02)", fontSize: "0.75rem", color: "#94a3b8" }}
        >
          <i className="fa-solid fa-ticket text-danger me-1"></i>
          Screenly Admission Pass &bull; Present at box office or cinema usher kiosk
        </div>
      </div>
    </div>
  );
}
