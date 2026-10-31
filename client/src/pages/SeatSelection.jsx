import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../services/api";
import LoadingSpinner from "../components/LoadingSpinner";
import { useAuth } from "../hooks/useAuth";
import toast from "react-hot-toast";
import { handleImageError, getPosterUrl } from "../utils/tmdbHelper";

const MAX_SEATS = 8;

const SeatSelection = () => {
  const { showId } = useParams();
  const [showData, setShowData] = useState(null);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [error, setError] = useState("");

  const { user } = useAuth();
  const navigate = useNavigate();

  const fetchSeatData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await api.get(`/api/shows/${showId}/seats`);
      setShowData(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load seat layout");
    } finally {
      setLoading(false);
    }
  }, [showId]);

  useEffect(() => {
    fetchSeatData();
  }, [fetchSeatData]);

  const toggleSeat = (seat) => {
    // If show is running or completed, lock selections
    if (showData?.isBookable === false) {
      toast.error("Bookings are closed. This screening has already started or ended.");
      return;
    }

    if (seat.status === "booked" || (seat.booked && seat.status !== "reserved")) {
      toast.error("This seat is already booked for this show.");
      return;
    }

    if (seat.status === "reserved") {
      toast.error("This seat is temporarily held by another customer completing payment.");
      return;
    }

    if (selectedSeats.some((s) => s.id === seat.id)) {
      setSelectedSeats(selectedSeats.filter((s) => s.id !== seat.id));
    } else {
      if (selectedSeats.length >= MAX_SEATS) {
        toast.error(`You can select a maximum of ${MAX_SEATS} seats per reservation.`);
        return;
      }
      setSelectedSeats([...selectedSeats, seat]);
    }
  };

  const calculateSubtotal = () => {
    return selectedSeats.reduce((sum, seat) => sum + seat.price, 0);
  };

  const handleProceedToPayment = async () => {
    if (!user) {
      navigate("/login", { state: { from: { pathname: `/seat-selection/${showId}` } } });
      return;
    }

    if (selectedSeats.length === 0) {
      setError("Please select at least one seat to proceed.");
      return;
    }

    if (showData?.isBookable === false) {
      setError("Bookings are closed for this screening.");
      return;
    }

    try {
      setBookingLoading(true);
      setError("");

      // Reserve seats in MongoDB (holds seats for 10 minutes)
      const seatIds = selectedSeats.map((s) => s.id);
      const res = await api.post("/api/bookings", {
        showId,
        seats: seatIds,
      });

      const booking = res.data;
      navigate(`/payment/${booking._id}`);
    } catch (err) {
      console.error("Booking hold failed:", err);
      setError(
        err.response?.data?.message ||
          "Some seats were just reserved by another user. Refreshing seat layout..."
      );
      fetchSeatData();
      setSelectedSeats([]);
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Rendering cinema seating arrangement..." />;
  }

  if (error && !showData) {
    return (
      <div className="container py-5 text-center">
        <div className="glass-panel p-5">
          <i className="fa-solid fa-triangle-exclamation text-danger fs-1 mb-3"></i>
          <h3 className="text-white">Unable to Load Show</h3>
          <p className="text-secondary small mb-4">{error}</p>
          <Link to="/shows" className="btn btn-cinema">
            Back to Shows
          </Link>
        </div>
      </div>
    );
  }

  const { movie, theatre, showTime, screen, lifecycleStatus, isBookable, seats } = showData;
  const formattedShowTime = new Date(showTime).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const subtotal = calculateSubtotal();

  const renderSeatElement = (seat) => {
    const isSelected = selectedSeats.some((s) => s.id === seat.id);
    const isReserved = seat.status === "reserved";
    const isBooked = seat.status === "booked" || (seat.booked && !isReserved);

    let seatClass = "seat available";
    let title = `${seat.id} - ₹${seat.price} (Available)`;

    if (isSelected) {
      seatClass = "seat selected";
      title = `${seat.id} - Selected`;
    } else if (isReserved) {
      seatClass = "seat reserved";
      title = `${seat.id} - Reserved (Temporarily Held)`;
    } else if (isBooked) {
      seatClass = "seat booked";
      title = `${seat.id} - Booked (Sold Out)`;
    }

    return (
      <div
        key={seat.id}
        onClick={() => toggleSeat(seat)}
        className={seatClass}
        title={title}
      >
        {seat.id}
      </div>
    );
  };

  return (
    <div className="container py-4 fade-in">
      {/* Show Header Information Card */}
      <div className="glass-panel p-4 mb-4">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
          <div className="d-flex align-items-center gap-3">
            <img
              src={getPosterUrl(movie)}
              alt={movie.title}
              className="rounded-3 shadow-sm"
              style={{ width: "60px", height: "85px", objectFit: "cover" }}
              onError={(e) => handleImageError(e, movie.title || movie.movieName, movie.tmdbId)}
            />
            <div>
              <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
                <h4 className="text-white fw-bold mb-0">{movie.title || movie.movieName}</h4>
                <span className="badge bg-danger bg-opacity-75 small">
                  {movie.certification || "U/A"}
                </span>
                <span className="badge bg-secondary bg-opacity-50 small">
                  {movie.language}
                </span>

                {/* Show Lifecycle Badge */}
                {lifecycleStatus === "Completed" ? (
                  <span className="badge bg-secondary small">
                    <i className="fa-solid fa-flag-checkered me-1"></i> Completed Show
                  </span>
                ) : lifecycleStatus === "Running" ? (
                  <span className="badge bg-warning text-dark small">
                    <i className="fa-solid fa-play me-1"></i> Running Screening
                  </span>
                ) : (
                  <span className="badge bg-success small">
                    <i className="fa-solid fa-circle-check me-1"></i> Booking Open
                  </span>
                )}
              </div>

              <div className="text-secondary small">
                <i className="fa-solid fa-masks-theater text-danger me-1"></i>
                <strong className="text-light">{theatre.name}</strong> &bull;{" "}
                <span className="text-info fw-semibold">{screen || "Screen 1"}</span> &bull;{" "}
                {theatre.location}, {theatre.city}
              </div>

              <div className="d-flex align-items-center gap-3 text-white small mt-1 flex-wrap">
                <div>
                  <i className="fa-regular fa-clock text-warning me-1"></i>
                  {formattedShowTime}
                </div>
                <div className="text-secondary">
                  Available: <strong className="text-success">{showData.availableCount ?? "--"}</strong> / {showData.totalSeats ?? 100}
                </div>
                {showData.reservedCount > 0 && (
                  <div className="text-warning">
                    <i className="fa-solid fa-hourglass-half me-1"></i>
                    {showData.reservedCount} currently held
                  </div>
                )}
              </div>
            </div>
          </div>

          <Link to={`/movies/${movie._id}`} className="btn btn-sm btn-secondary-cinema align-self-start align-self-md-center">
            <i className="fa-solid fa-arrow-left me-1"></i> Change Show
          </Link>
        </div>
      </div>

      {/* Show Inactive / Completed Warning */}
      {!isBookable && (
        <div className="alert alert-warning py-3 px-4 mb-4 d-flex align-items-center gap-3 rounded-3" role="alert">
          <i className="fa-solid fa-triangle-exclamation fs-3 text-warning"></i>
          <div>
            <h6 className="fw-bold mb-1">Bookings Closed for this Show</h6>
            <p className="small mb-0 opacity-90">
              This screening is currently {lifecycleStatus?.toLowerCase() || "completed"}. Seats cannot be booked for past or running shows. Please select a future showtime from the schedule.
            </p>
          </div>
        </div>
      )}

      {/* Error Alert if any */}
      {error && (
        <div className="alert alert-danger py-2 small d-flex align-items-center gap-2 mb-4" role="alert">
          <i className="fa-solid fa-triangle-exclamation"></i>
          <div>{error}</div>
        </div>
      )}

      <div className="row g-4">
        {/* Left Side: Cinema Seat Layout */}
        <div className="col-12 col-lg-8">
          <div className="glass-panel p-4 p-md-5 text-center">
            {/* Screen Projection Indicator */}
            <div className="screen-container">
              <div className="screen-curve"></div>
              <div className="screen-text">
                <i className="fa-solid fa-film me-2"></i> {screen || "Cinema Screen"} This Way
              </div>
            </div>

            {/* Seat Map Legend: 3 Discrete States + Selected */}
            <div className="d-flex justify-content-center flex-wrap gap-3 gap-md-4 mb-5 small text-secondary">
              <div className="d-flex align-items-center gap-2">
                <div className="seat available" style={{ width: "24px", height: "24px" }}></div>
                <span>Available</span>
              </div>
              <div className="d-flex align-items-center gap-2">
                <div className="seat selected" style={{ width: "24px", height: "24px" }}></div>
                <span>Selected</span>
              </div>
              <div className="d-flex align-items-center gap-2">
                <div className="seat reserved" style={{ width: "24px", height: "24px" }}></div>
                <span>Reserved (Held)</span>
              </div>
              <div className="d-flex align-items-center gap-2">
                <div className="seat booked" style={{ width: "24px", height: "24px" }}></div>
                <span>Booked (Sold Out)</span>
              </div>
            </div>

            {/* Balcony Tier (Top) */}
            {seats.balcony && seats.balcony.length > 0 && (
              <div className="mb-5">
                <div className="d-flex align-items-center justify-content-center gap-2 mb-3">
                  <span className="badge bg-warning text-dark fw-bold px-3 py-1">BALCONY RECLINER</span>
                  <span className="text-secondary small fw-semibold">
                    ₹{theatre.prices?.balcony || 350} per seat
                  </span>
                </div>
                <div className="d-flex flex-wrap justify-content-center gap-2" style={{ maxWidth: "560px", margin: "0 auto" }}>
                  {seats.balcony.map((seat) => renderSeatElement(seat))}
                </div>
              </div>
            )}

            {/* Middle Tier */}
            {seats.middle && seats.middle.length > 0 && (
              <div className="mb-5">
                <div className="d-flex align-items-center justify-content-center gap-2 mb-3">
                  <span className="badge bg-primary text-white fw-bold px-3 py-1">MIDDLE EXECUTIVE</span>
                  <span className="text-secondary small fw-semibold">
                    ₹{theatre.prices?.middle || 250} per seat
                  </span>
                </div>
                <div className="d-flex flex-wrap justify-content-center gap-2" style={{ maxWidth: "620px", margin: "0 auto" }}>
                  {seats.middle.map((seat) => renderSeatElement(seat))}
                </div>
              </div>
            )}

            {/* Lower Tier */}
            {seats.lower && seats.lower.length > 0 && (
              <div className="mb-4">
                <div className="d-flex align-items-center justify-content-center gap-2 mb-3">
                  <span className="badge bg-secondary text-white fw-bold px-3 py-1">LOWER CLASS</span>
                  <span className="text-secondary small fw-semibold">
                    ₹{theatre.prices?.lower || 150} per seat
                  </span>
                </div>
                <div className="d-flex flex-wrap justify-content-center gap-2" style={{ maxWidth: "620px", margin: "0 auto" }}>
                  {seats.lower.map((seat) => renderSeatElement(seat))}
                </div>
              </div>
            )}

            <div className="text-secondary small mt-4 opacity-75">
              <i className="fa-solid fa-circle-info me-1"></i>
              Seats are reserved and held for 10 minutes upon proceeding to checkout.
            </div>
          </div>
        </div>

        {/* Right Side: Order Summary & Checkout Card */}
        <div className="col-12 col-lg-4">
          <div className="glass-panel p-4 position-sticky" style={{ top: "90px" }}>
            <h4 className="text-white fw-bold mb-3 border-bottom border-secondary border-opacity-25 pb-3">
              Booking Summary
            </h4>

            {/* Selected Seats Badges */}
            <div className="mb-4">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="text-secondary small fw-bold">Selected Seats:</span>
                <span className="badge bg-secondary text-light">
                  {selectedSeats.length} / {MAX_SEATS}
                </span>
              </div>

              {selectedSeats.length === 0 ? (
                <div className="p-3 rounded-3 text-center border border-dashed border-secondary border-opacity-50 text-secondary small">
                  Click on the cinema seat layout to select your preferred seats
                </div>
              ) : (
                <div className="d-flex flex-wrap gap-2">
                  {selectedSeats.map((seat) => (
                    <span
                      key={seat.id}
                      className="badge bg-danger bg-opacity-75 text-white p-2 d-flex align-items-center gap-2 fs-6 rounded-2"
                    >
                      <span>{seat.id}</span>
                      <span className="small opacity-75">(₹{seat.price})</span>
                      <i
                        className="fa-solid fa-xmark cursor-pointer"
                        style={{ cursor: "pointer" }}
                        onClick={() => toggleSeat(seat)}
                      ></i>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Price Calculations */}
            <div className="d-flex flex-column gap-2 border-top border-secondary border-opacity-25 pt-3 mb-4">
              <div className="d-flex justify-content-between text-secondary small">
                <span>Tickets Subtotal</span>
                <span>₹{subtotal}</span>
              </div>
              <div className="d-flex justify-content-between text-secondary small">
                <span>Convenience Fee</span>
                <span className="text-success fw-bold">FREE</span>
              </div>
              <div className="d-flex justify-content-between text-secondary small">
                <span>Taxes & Fees</span>
                <span className="text-success fw-bold">₹0</span>
              </div>
              <hr className="border-secondary border-opacity-50 my-1" />
              <div className="d-flex justify-content-between text-white fw-bold fs-5">
                <span>Total Payable</span>
                <span className="text-danger">₹{subtotal}</span>
              </div>
            </div>

            {/* Proceed to Payment Action */}
            <button
              onClick={handleProceedToPayment}
              disabled={selectedSeats.length === 0 || bookingLoading || !isBookable}
              className="btn btn-cinema w-100 py-3 fs-6 d-flex align-items-center justify-content-center gap-2 shadow"
            >
              {bookingLoading ? (
                <>
                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                  Holding Seats...
                </>
              ) : !isBookable ? (
                <>
                  <i className="fa-solid fa-ban"></i> Bookings Closed
                </>
              ) : (
                <>
                  <i className="fa-solid fa-credit-card"></i> Proceed to Payment
                </>
              )}
            </button>

            {!user && isBookable && (
              <div className="text-center text-secondary small mt-3">
                <i className="fa-solid fa-lock me-1"></i> You will be prompted to sign in before confirming payment.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SeatSelection;