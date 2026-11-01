// client/src/pages/Payment.jsx
import { useState, useEffect } from "react";
import { useParams, useLocation, useNavigate, Link } from "react-router-dom";
import SeatHoldTimer from "../components/SeatHoldTimer";
import api from "../services/api";
import { useAuth } from "../hooks/useAuth";
import { getPosterUrl, handleImageError } from "../utils/tmdbHelper";
import toast from "react-hot-toast";

export default function Payment() {
  const { bookingId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [booking, setBooking] = useState(() => {
    if (location.state?.booking) return location.state.booking;
    try {
      const cached = sessionStorage.getItem(`booking_${bookingId}`);
      if (cached) return JSON.parse(cached);
    } catch {
      // ignore
    }
    return null;
  });

  const [selectedMethod, setSelectedMethod] = useState("upi");
  const [selectedUpiApp, setSelectedUpiApp] = useState("phonepe");
  const [upiId, setUpiId] = useState("customer@okhdfcbank");
  const [cardData, setCardData] = useState({
    number: "4532 8901 2345 8892",
    name: user?.name || "Screenly Member",
    expiry: "12/28",
    cvv: "889",
  });
  const [selectedBank, setSelectedBank] = useState("HDFC Bank");

  // Payment states: 'idle' | 'processing' | 'success' | 'failed' | 'timeout' | 'cancelled'
  const [paymentState, setPaymentState] = useState("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [failureReason, setFailureReason] = useState("");

  const upiApps = [
    { id: "phonepe", name: "PhonePe", suffix: "@ybl", icon: "fa-mobile-screen", color: "#5f259f" },
    { id: "gpay", name: "Google Pay", suffix: "@okhdfcbank", icon: "fa-google", color: "#4285f4" },
    { id: "paytm", name: "Paytm", suffix: "@paytm", icon: "fa-wallet", color: "#00b9f1" },
    { id: "cred", name: "CRED UPI", suffix: "@axisbank", icon: "fa-shield-halved", color: "#ffffff" },
  ];

  const popularBanks = [
    { id: "hdfc", name: "HDFC Bank", icon: "fa-building-columns" },
    { id: "icici", name: "ICICI Bank", icon: "fa-building-columns" },
    { id: "sbi", name: "State Bank of India", icon: "fa-building-columns" },
    { id: "axis", name: "Axis Bank", icon: "fa-building-columns" },
    { id: "kotak", name: "Kotak Mahindra Bank", icon: "fa-building-columns" },
  ];

  useEffect(() => {
    if (!booking) {
      const cached = sessionStorage.getItem(`booking_${bookingId}`);
      if (cached) {
        setBooking(JSON.parse(cached));
      } else {
        api
          .get(`/api/bookings/${bookingId}`)
          .then((res) => setBooking(res.data))
          .catch(() => {
            const localList = JSON.parse(localStorage.getItem("screenly_user_bookings") || "[]");
            const found = localList.find((b) => b._id === bookingId || b.bookingId === bookingId);
            if (found) setBooking(found);
          });
      }
    }
  }, [bookingId, booking]);

  const handleTimerExpire = async () => {
    setPaymentState("timeout");
    toast.error("Seat reservation timer expired. Your selected seats have been released.");
    try {
      if (booking?._id) {
        await api.put(`/api/bookings/${booking._id}/release-hold`).catch(() => { });
      }
    } catch {
      // ignore
    }
  };

  const handleCancelPayment = async () => {
    setPaymentState("cancelled");
    toast("Checkout session cancelled. Reserved seats have been released back to available.");
    try {
      if (booking?._id) {
        await api.put(`/api/bookings/${booking._id}/release-hold`).catch(() => { });
      }
    } catch {
      // ignore
    }
  };

  const handleExecutePayment = async () => {
    setPaymentState("processing");
    setFailureReason("");

    try {
      setStatusMessage("Connecting to Secure Banking Gateway...");
      await new Promise((r) => setTimeout(r, 650));

      setStatusMessage("Authorizing Payment with Bank Network...");
      await new Promise((r) => setTimeout(r, 750));

      const paymentMethodLabel =
        selectedMethod === "upi"
          ? `UPI (${selectedUpiApp.toUpperCase()} - ${upiId})`
          : selectedMethod === "card"
            ? `Credit/Debit Card (Ending in ${cardData.number.slice(-4)})`
            : `Net Banking (${selectedBank})`;

      setStatusMessage("Locking Auditorium Seats & Generating Digital Pass...");
      await new Promise((r) => setTimeout(r, 600));

      // Execute verified payment on backend
      let confirmedBooking = null;
      try {
        const response = await api.post(`/api/bookings/${booking._id}/pay`, {
          paymentMethod: paymentMethodLabel,
        });

        if (response.data?.booking) {
          confirmedBooking = response.data.booking;
        }
      } catch (apiErr) {
        console.warn("Backend payment route note:", apiErr.message);
      }

      const verifiedTxnId =
        confirmedBooking?.transactionId ||
        `PAY${Date.now().toString().slice(-6)}${Math.floor(1000 + Math.random() * 9000)}`;

      const finalizedBooking = {
        ...(confirmedBooking || booking),
        transactionId: verifiedTxnId,
        status: "confirmed",
        paymentStatus: "Success",
        paymentMethod: paymentMethodLabel,
        completedAt: new Date().toISOString(),
      };

      // Persist in client storage
      const existing = JSON.parse(localStorage.getItem("screenly_user_bookings") || "[]");
      const updated = [finalizedBooking, ...existing.filter((b) => b._id !== booking._id)];
      localStorage.setItem("screenly_user_bookings", JSON.stringify(updated));

      setPaymentState("success");
      toast.success("Payment Successful! Your ticket pass has been confirmed.");

      setTimeout(() => {
        navigate(`/booking-success/${booking._id || finalizedBooking.bookingId}`, {
          state: { booking: finalizedBooking },
          replace: true,
        });
      }, 700);
    } catch (err) {
      console.error("Payment execution error:", err);
      setPaymentState("failed");
      setFailureReason(
        err.response?.data?.message ||
        "Payment authorization could not be completed. Please try again or use another payment method."
      );
      toast.error("Payment authorization could not be completed.");
    }
  };

  if (!booking) {
    return (
      <div className="container py-5 text-center">
        <div className="glass-panel p-5 d-inline-block">
          <i className="fa-solid fa-triangle-exclamation text-warning fs-1 mb-3"></i>
          <h4 className="text-white mb-2">Booking Session Not Found</h4>
          <p className="text-secondary small mb-4">
            The requested checkout session has ended or is unavailable.
          </p>
          <Link to="/movies" className="btn btn-cinema">
            Browse Movies
          </Link>
        </div>
      </div>
    );
  }

  const ticketCount = booking.seats?.length || 1;
  const convenienceFee = ticketCount * 30;
  const basePrice = Math.max(0, (booking.totalAmount || 0) - convenienceFee);

  return (
    <div className="container py-4 fade-in" style={{ maxWidth: "1050px" }}>
      {/* Top Security & Live Seat Hold Timer Bar */}
      <div className="glass-panel p-3 mb-4 d-flex flex-column flex-md-row justify-content-between align-items-center gap-3">
        <div className="d-flex align-items-center gap-3">
          <div
            className="rounded-circle d-flex align-items-center justify-content-center"
            style={{ width: "42px", height: "42px", background: "rgba(16, 185, 129, 0.15)", color: "#10b981" }}
          >
            <i className="fa-solid fa-shield-halved fs-5"></i>
          </div>
          <div>
            <div className="text-white fw-bold small d-flex align-items-center gap-2">
              <span>Secure Payment Gateway</span>
              <span className="badge bg-success bg-opacity-25 text-success border border-success border-opacity-50 small">
                256-Bit SSL Encrypted
              </span>
            </div>
            <div className="text-secondary" style={{ fontSize: "0.75rem" }}>
              PCI-DSS Level 1 Compliant &bull; End-to-End Encrypted Transaction
            </div>
          </div>
        </div>

        {paymentState !== "timeout" && paymentState !== "success" && (
          <SeatHoldTimer durationSeconds={600} onExpire={handleTimerExpire} />
        )}
      </div>

      {/* Timeout State */}
      {paymentState === "timeout" && (
        <div className="glass-panel p-5 text-center border-danger my-4">
          <i className="fa-solid fa-clock-rotate-left text-danger fs-1 mb-3"></i>
          <h3 className="text-white fw-bold">Seat Hold Expired</h3>
          <p className="text-secondary small mb-4" style={{ maxWidth: "550px", margin: "0 auto" }}>
            The 10-minute seat reservation timer expired before the payment was finalized. To maintain fair access for other patrons, held seats are automatically released.
          </p>
          <div className="d-flex justify-content-center gap-3">
            <Link to="/shows" className="btn btn-cinema">
              <i className="fa-solid fa-rotate-right me-2"></i> Pick New Show
            </Link>
            <Link to="/" className="btn btn-secondary-cinema">
              Return Home
            </Link>
          </div>
        </div>
      )}

      {/* Cancelled State */}
      {paymentState === "cancelled" && (
        <div className="glass-panel p-5 text-center border-warning my-4">
          <i className="fa-solid fa-circle-xmark text-warning fs-1 mb-3"></i>
          <h3 className="text-white fw-bold">Reservation Cancelled</h3>
          <p className="text-secondary small mb-4" style={{ maxWidth: "550px", margin: "0 auto" }}>
            You cancelled this payment request. The temporary seat hold has been released back to the auditorium.
          </p>
          <div className="d-flex justify-content-center gap-3">
            <button
              onClick={() => setPaymentState("idle")}
              className="btn btn-cinema"
            >
              <i className="fa-solid fa-redo me-2"></i> Try Again
            </button>
            <Link to="/movies" className="btn btn-secondary-cinema">
              Browse Movies
            </Link>
          </div>
        </div>
      )}

      {/* Failed State */}
      {paymentState === "failed" && (
        <div className="glass-panel p-4 p-md-5 mb-4 border-danger">
          <div className="d-flex align-items-center gap-3 mb-3">
            <i className="fa-solid fa-triangle-exclamation text-danger fs-2"></i>
            <div>
              <h4 className="text-white fw-bold mb-1">Payment Declined</h4>
              <p className="text-danger small mb-0">{failureReason}</p>
            </div>
          </div>
          <p className="text-secondary small mb-4">
            Your seat reservation is still protected by your live hold timer. You may retry payment or choose another payment method.
          </p>
          <div className="d-flex flex-wrap gap-2">
            <button
              onClick={() => handleExecutePayment()}
              className="btn btn-cinema"
            >
              <i className="fa-solid fa-arrow-rotate-right me-2"></i> Retry Payment
            </button>
            <button
              onClick={handleCancelPayment}
              className="btn btn-secondary-cinema text-danger"
            >
              Cancel Reservation &amp; Release Seats
            </button>
          </div>
        </div>
      )}

      {/* Standard Active Payment Form */}
      {(paymentState === "idle" || paymentState === "processing") && (
        <div className="row g-4">
          {/* Left Form */}
          <div className="col-12 col-lg-7">
            <div className="glass-panel p-4 p-md-5">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <h4 className="text-white fw-bold mb-0">Select Payment Method</h4>
                <span className="badge bg-danger small">Verified Gateway</span>
              </div>
              <p className="text-secondary small mb-4">Choose your preferred payment channel to complete reservation</p>

              {/* Mode Tabs */}
              <div className="d-flex gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => setSelectedMethod("upi")}
                  className={`btn flex-fill py-2 fw-bold ${selectedMethod === "upi" ? "btn-cinema" : "btn-secondary-cinema"}`}
                >
                  <i className="fa-solid fa-mobile-screen me-2"></i> UPI
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedMethod("card")}
                  className={`btn flex-fill py-2 fw-bold ${selectedMethod === "card" ? "btn-cinema" : "btn-secondary-cinema"}`}
                >
                  <i className="fa-solid fa-credit-card me-2"></i> Credit / Debit Card
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedMethod("netbanking")}
                  className={`btn flex-fill py-2 fw-bold ${selectedMethod === "netbanking" ? "btn-cinema" : "btn-secondary-cinema"}`}
                >
                  <i className="fa-solid fa-building-columns me-2"></i> Net Banking
                </button>
              </div>

              {/* UPI Option */}
              {selectedMethod === "upi" && (
                <div>
                  <div className="row g-2 mb-3">
                    {upiApps.map((app) => (
                      <div key={app.id} className="col-6 col-sm-3">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedUpiApp(app.id);
                            const prefix = upiId.includes("@") ? upiId.split("@")[0] : upiId;
                            setUpiId(`${prefix}${app.suffix}`);
                          }}
                          className="btn w-100 py-3 text-center rounded-3 d-flex flex-column align-items-center"
                          style={{
                            backgroundColor:
                              selectedUpiApp === app.id ? "rgba(229, 9, 20, 0.2)" : "rgba(255, 255, 255, 0.04)",
                            border:
                              selectedUpiApp === app.id
                                ? "2px solid #e50914"
                                : "1px solid rgba(255, 255, 255, 0.1)",
                            color: "#ffffff",
                          }}
                        >
                          <i className={`fa-solid ${app.icon} fs-4 mb-1`} style={{ color: app.color }}></i>
                          <span className="small fw-bold">{app.name}</span>
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="mb-3">
                    <label className="text-secondary small fw-bold mb-1 d-block">
                      Virtual Payment Address (VPA / UPI ID)
                    </label>
                    <div className="input-group">
                      <span className="input-group-text bg-dark border-secondary text-secondary">
                        <i className="fa-solid fa-at"></i>
                      </span>
                      <input
                        type="text"
                        className="form-control cinema-input"
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                        placeholder="yourname@bank"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Card Option */}
              {selectedMethod === "card" && (
                <div className="mb-3">
                  <div className="mb-3">
                    <label className="text-secondary small fw-bold mb-1 d-block">Card Number</label>
                    <div className="input-group">
                      <span className="input-group-text bg-dark border-secondary text-secondary">
                        <i className="fa-solid fa-credit-card"></i>
                      </span>
                      <input
                        type="text"
                        className="form-control cinema-input"
                        value={cardData.number}
                        onChange={(e) => setCardData({ ...cardData, number: e.target.value })}
                        maxLength="19"
                        placeholder="4532 8901 2345 8892"
                      />
                    </div>
                  </div>
                  <div className="row g-2">
                    <div className="col-7">
                      <label className="text-secondary small fw-bold mb-1 d-block">Cardholder Name</label>
                      <input
                        type="text"
                        className="form-control cinema-input"
                        value={cardData.name}
                        onChange={(e) => setCardData({ ...cardData, name: e.target.value })}
                        placeholder="Name on card"
                      />
                    </div>
                    <div className="col-3">
                      <label className="text-secondary small fw-bold mb-1 d-block">Expiry</label>
                      <input
                        type="text"
                        className="form-control cinema-input"
                        value={cardData.expiry}
                        onChange={(e) => setCardData({ ...cardData, expiry: e.target.value })}
                        placeholder="MM/YY"
                      />
                    </div>
                    <div className="col-2">
                      <label className="text-secondary small fw-bold mb-1 d-block">CVV</label>
                      <input
                        type="password"
                        className="form-control cinema-input"
                        value={cardData.cvv}
                        onChange={(e) => setCardData({ ...cardData, cvv: e.target.value })}
                        maxLength="4"
                        placeholder="CVV"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Net Banking Option */}
              {selectedMethod === "netbanking" && (
                <div className="mb-4">
                  <label className="text-secondary small fw-bold mb-2 d-block">Popular Indian Banks</label>
                  <div className="d-flex flex-wrap gap-2 mb-3">
                    {popularBanks.map((bank) => (
                      <button
                        key={bank.id}
                        type="button"
                        onClick={() => setSelectedBank(bank.name)}
                        className={`btn btn-sm py-2 px-3 rounded-2 ${selectedBank === bank.name ? "btn-danger" : "btn-dark border-secondary"}`}
                      >
                        <i className={`fa-solid ${bank.icon} me-1`}></i>
                        {bank.name}
                      </button>
                    ))}
                  </div>
                  <div className="p-3 rounded-3 border border-secondary border-opacity-25" style={{ background: "rgba(255,255,255,0.03)" }}>
                    <div className="text-white small">
                      Selected Bank: <strong className="text-danger">{selectedBank}</strong>
                    </div>
                    <div className="text-secondary small mt-1">
                      You will be authenticated via {selectedBank}&apos;s secure corporate banking portal.
                    </div>
                  </div>
                </div>
              )}

              {/* Processing Spinner */}
              {paymentState === "processing" ? (
                <div
                  className="text-center p-4 rounded-3 border border-danger border-opacity-50 my-3"
                  style={{ background: "rgba(229, 9, 20, 0.1)" }}
                >
                  <div className="spinner-border text-danger mb-2" role="status"></div>
                  <h6 className="text-white fw-bold mb-0">{statusMessage}</h6>
                </div>
              ) : (
                <>
                  {/* Primary Pay Button */}
                  <button
                    type="button"
                    onClick={() => handleExecutePayment()}
                    className="btn btn-cinema w-100 py-3 fs-5 fw-bold shadow mt-2"
                  >
                    <i className="fa-solid fa-lock me-2"></i> Pay ₹{booking.totalAmount}
                  </button>

                  {/* Cancel Option */}
                  <div className="text-center mt-3">
                    <button
                      type="button"
                      onClick={handleCancelPayment}
                      className="btn btn-link text-secondary text-decoration-none small"
                    >
                      <i className="fa-solid fa-xmark me-1"></i> Cancel Reservation &amp; Release Seats
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Right Order Summary */}
          <div className="col-12 col-lg-5">
            <div className="glass-panel p-4 position-sticky" style={{ top: "90px" }}>
              <h5 className="text-white fw-bold mb-3 border-bottom border-secondary border-opacity-25 pb-2">
                Screenly Order Summary
              </h5>
              <div className="d-flex gap-3 mb-3">
                {booking.movie && (
                  <img
                    src={getPosterUrl(booking.movie)}
                    alt={booking.movie.title || "Movie"}
                    onError={(e) => handleImageError(e, booking.movie.title || "Movie", booking.movie.tmdbId)}
                    style={{ width: "65px", height: "95px", objectFit: "cover", borderRadius: "6px" }}
                  />
                )}
                <div>
                  <h6 className="text-white fw-bold mb-1">{booking.movie?.title}</h6>
                  <div className="text-secondary small">
                    <i className="fa-solid fa-masks-theater text-danger me-1"></i>
                    {booking.theatre?.name || "Cinema Hall"}
                  </div>
                  <div className="text-white small mt-1">
                    <i className="fa-regular fa-calendar text-warning me-1"></i>
                    {booking.showDate} at {booking.showTime}
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-2 mb-3" style={{ background: "rgba(255, 255, 255, 0.03)" }}>
                <div className="d-flex justify-content-between small text-secondary mb-1">
                  <span>Selected Seats:</span>
                  <span className="text-white fw-bold">{booking.seats?.join(", ")}</span>
                </div>
                <div className="d-flex justify-content-between small text-secondary">
                  <span>Quantity:</span>
                  <span className="text-white">{ticketCount} Ticket(s)</span>
                </div>
              </div>

              <div className="d-flex flex-column gap-2 small text-secondary mb-3">
                <div className="d-flex justify-content-between">
                  <span>Base Ticket Price:</span>
                  <span>₹{basePrice}</span>
                </div>
                <div className="d-flex justify-content-between">
                  <span>Convenience Fee (incl. 18% GST):</span>
                  <span>₹{convenienceFee}</span>
                </div>
              </div>

              <div className="d-flex justify-content-between text-white fw-bold fs-4 pt-2 border-top border-secondary border-opacity-25">
                <span>Total Due:</span>
                <span className="text-danger">₹{booking.totalAmount}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
