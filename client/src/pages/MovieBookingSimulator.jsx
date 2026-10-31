import { useState, useEffect, useMemo } from "react";
import { useParams, useLocation, useNavigate, Link } from "react-router-dom";
import api from "../services/api";
import LoadingSpinner from "../components/LoadingSpinner";
import {
  getPosterUrl,
  getMovieTitle,
  getMovieRating,
  getMovieLanguage,
  createTitlePosterSvg,
} from "../utils/tmdbHelper";
import toast from "react-hot-toast";

const MULTIPLEXES = [
  { name: "PVR: Director's Cut", city: "Mumbai", screen: "Screen 1" },
  { name: "INOX Megaplex", city: "Indore", screen: "Screen 2 (IMAX)" },
  { name: "Cinépolis VIP", city: "Bhopal", screen: "Screen 3 (4K VIP)" },
];

const DEFAULT_SHOWTIMES = [
  "10:15 AM",
  "01:45 PM",
  "05:15 PM",
  "08:45 PM",
  "11:15 PM",
];

export default function MovieBookingSimulator() {
  const { movieId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [movie, setMovie] = useState(location.state?.movie || null);
  const [loading, setLoading] = useState(!location.state?.movie);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const movieShowtimes = useMemo(() => {
    return movie?.showtimes && movie.showtimes.length > 0
      ? movie.showtimes
      : DEFAULT_SHOWTIMES;
  }, [movie]);

  const [selectedMultiplex, setSelectedMultiplex] = useState(MULTIPLEXES[0]);
  const [selectedTime, setSelectedTime] = useState(DEFAULT_SHOWTIMES[0]);
  const [selectedDate, setSelectedDate] = useState("Today");
  const [selectedSeats, setSelectedSeats] = useState([]);

  // Fetch movie details if navigated directly via URL without location state
  useEffect(() => {
    let isMounted = true;
    if (!movie && movieId) {
      api
        .get(`/api/movies/${movieId}`)
        .then((res) => {
          if (isMounted && res.data) setMovie(res.data);
        })
        .catch(() => {
          if (isMounted) {
            setMovie({
              title: decodeURIComponent(movieId),
              language: "Hindi",
              rating: "8.2",
            });
          }
        })
        .finally(() => {
          if (isMounted) setLoading(false);
        });
    }
    return () => {
      isMounted = false;
    };
  }, [movieId, movie]);

  const tiers = [
    { name: "Balcony Recliner", price: 350, rows: ["A", "B"] },
    { name: "Middle Executive", price: 250, rows: ["C", "D", "E"] },
    { name: "Lower Standard", price: 150, rows: ["F", "G"] },
  ];

  // Strictly isolates seat availability to this exact Show (Date, Time, Theatre, Screen)
  const { bookedSeatSet, reservedSeatSet } = useMemo(() => {
    const booked = new Set();
    const reserved = new Set();
    const title = getMovieTitle(movie);

    try {
      const existingBookings = JSON.parse(
        localStorage.getItem("screenly_user_bookings") || "[]"
      );

      existingBookings.forEach((b) => {
        const matchesMovie = (b.movie?.title === title || b.movieName === title);
        const matchesTheatre = (b.theatre?.name === selectedMultiplex.name);
        const matchesScreen =
          (b.theatre?.screen === selectedMultiplex.screen || b.screen === selectedMultiplex.screen);
        const matchesDate = (b.showDate === selectedDate);
        const matchesTime = (b.showTime === selectedTime);

        // Only block seats if this booking is for this EXACT show screening
        if (matchesMovie && matchesTheatre && matchesScreen && matchesDate && matchesTime) {
          if (b.status === "confirmed") {
            b.seats?.forEach((s) => booked.add(s));
          } else if (b.status === "pending") {
            const isExpired = b.expiresAt && new Date(b.expiresAt) < new Date();
            if (!isExpired) {
              b.seats?.forEach((s) => reserved.add(s));
            }
          }
        }
      });
    } catch {
      // ignore
    }

    return { bookedSeatSet: booked, reservedSeatSet: reserved };
  }, [movie, selectedMultiplex, selectedDate, selectedTime]);

  const toggleSeat = (seatId, price) => {
    if (bookedSeatSet.has(seatId)) {
      toast.error(`Seat ${seatId} is already booked for this show.`);
      return;
    }

    if (reservedSeatSet.has(seatId)) {
      toast("Seat is temporarily reserved by another user. Please choose another seat.");
      return;
    }

    if (selectedSeats.some((s) => s.id === seatId)) {
      setSelectedSeats(selectedSeats.filter((s) => s.id !== seatId));
    } else {
      if (selectedSeats.length >= 8) {
        toast.error("Maximum 8 seats allowed per booking reservation.");
        return;
      }
      setSelectedSeats([...selectedSeats, { id: seatId, price }]);
    }
  };

  const totalAmount = selectedSeats.reduce((acc, curr) => acc + curr.price, 0);

  const handleProceedToPayment = async () => {
    if (selectedSeats.length === 0) {
      toast.error("Please select at least 1 seat to proceed.");
      return;
    }

    setIsSubmitting(true);
    const bookingId = "BK" + Date.now().toString().slice(-8);

    const ticketsData = selectedSeats.map((s) => ({
      ticketId: `${bookingId}-${s.id}`,
      seatNumber: s.id,
      originalPrice: s.price,
      status: "confirmed",
    }));

    const bookingDraft = {
      _id: bookingId,
      bookingId,
      movie: {
        title: getMovieTitle(movie),
        poster: getPosterUrl(movie),
        language: getMovieLanguage(movie),
        rating: getMovieRating(movie),
      },
      theatre: {
        name: selectedMultiplex.name,
        city: selectedMultiplex.city,
        screen: selectedMultiplex.screen,
      },
      screen: selectedMultiplex.screen,
      showDate: selectedDate,
      showTime: selectedTime,
      seats: selectedSeats.map((s) => s.id),
      tickets: ticketsData,
      originalTotalAmount: totalAmount,
      totalAmount,
      refundAmount: 0,
      status: "pending",
      paymentStatus: "Pending",
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
    };

    sessionStorage.setItem(`booking_${bookingId}`, JSON.stringify(bookingDraft));
    toast.success("Seats temporarily reserved for 10 minutes!");

    setTimeout(() => {
      navigate(`/payment/${bookingId}`, { state: { booking: bookingDraft } });
    }, 400);
  };

  const dates = ["Today", "Tomorrow", "In 2 Days", "In 3 Days"];

  const poster = getPosterUrl(movie);
  const title = getMovieTitle(movie);

  if (loading) {
    return <LoadingSpinner message="Loading movie booking simulator..." />;
  }

  return (
    <div className="container py-4 fade-in" style={{ maxWidth: "1050px" }}>
      {/* Header Info */}
      <div className="glass-panel p-4 mb-4">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
          <div className="d-flex align-items-center gap-3">
            <img
              src={poster}
              alt={title}
              className="rounded-3 shadow"
              style={{ width: "65px", height: "90px", objectFit: "cover" }}
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = createTitlePosterSvg(title);
              }}
            />
            <div>
              <div className="d-flex align-items-center gap-2 mb-1">
                <h4 className="text-white fw-bold mb-0">{title}</h4>
                <span className="badge bg-danger small">Cinema Screening</span>
                <span className="badge bg-success small">Independent Show Seating</span>
              </div>
              <div className="text-secondary small">
                <i className="fa-solid fa-masks-theater text-danger me-1"></i>
                <strong className="text-light">{selectedMultiplex.name}</strong> &bull;{" "}
                <span className="text-info fw-semibold">{selectedMultiplex.screen}</span> &bull;{" "}
                {selectedMultiplex.city}
              </div>
              <div className="text-white small mt-1">
                <i className="fa-regular fa-clock text-warning me-1"></i>
                {selectedDate} &bull; <strong className="text-danger">{selectedTime}</strong>
              </div>
            </div>
          </div>

          <Link to={`/movies/${movieId || encodeURIComponent(title)}`} className="btn btn-sm btn-secondary-cinema">
            <i className="fa-solid fa-arrow-left me-1"></i> Movie Details
          </Link>
        </div>
      </div>

      {/* Date & Multiplex Selectors */}
      <div className="glass-panel p-3 mb-4">
        <div className="row g-3 align-items-center">
          <div className="col-12 col-md-6">
            <span className="text-secondary small fw-bold text-uppercase d-block mb-1">Select Date:</span>
            <div className="d-flex gap-2">
              {dates.map((d) => (
                <button
                  key={d}
                  onClick={() => setSelectedDate(d)}
                  className={`btn btn-sm py-2 px-3 fw-bold rounded-3 ${
                    selectedDate === d ? "btn-cinema" : "btn-secondary-cinema"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div className="col-12 col-md-6">
            <span className="text-secondary small fw-bold text-uppercase d-block mb-1">Select Multiplex & Screen:</span>
            <select
              className="form-select cinema-input"
              value={selectedMultiplex.name}
              onChange={(e) => {
                const found = MULTIPLEXES.find((m) => m.name === e.target.value);
                if (found) setSelectedMultiplex(found);
              }}
            >
              {MULTIPLEXES.map((m) => (
                <option key={m.name} value={m.name}>
                  {m.name} ({m.city}) &mdash; {m.screen}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Showtime Slots */}
        <div className="mt-3 pt-3 border-top border-secondary border-opacity-25">
          <span className="text-secondary small fw-bold text-uppercase d-block mb-2">Showtime:</span>
          <div className="d-flex flex-wrap gap-2">
            {movieShowtimes.map((time) => (
              <button
                key={time}
                onClick={() => setSelectedTime(time)}
                className={`btn btn-sm py-2 px-3 fw-bold ${
                  selectedTime === time ? "btn-danger" : "btn-outline-secondary text-light"
                }`}
              >
                {time}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Cinema Screen Projection & Seat Map */}
      <div className="glass-panel p-4 p-md-5 mb-4 text-center">
        {/* Curved Screen */}
        <div className="mb-5">
          <div
            style={{
              height: "6px",
              background: "linear-gradient(90deg, transparent, #e50914, transparent)",
              borderRadius: "50%",
              width: "70%",
              margin: "0 auto 10px auto",
              boxShadow: "0 0 20px #e50914",
            }}
          ></div>
          <div className="text-secondary small text-uppercase" style={{ letterSpacing: "2px", fontSize: "0.7rem" }}>
            <i className="fa-solid fa-film me-2 text-danger"></i> {selectedMultiplex.screen} Projection This Way
          </div>
        </div>

        {/* Seat Legend with 3 Discrete States */}
        <div className="d-flex justify-content-center flex-wrap gap-4 mb-4 small text-secondary">
          <div className="d-flex align-items-center gap-2">
            <div style={{ width: "22px", height: "22px", backgroundColor: "#1e293b", borderRadius: "5px", border: "1px solid rgba(255,255,255,0.2)" }}></div>
            <span>Available</span>
          </div>
          <div className="d-flex align-items-center gap-2">
            <div style={{ width: "22px", height: "22px", backgroundColor: "#e50914", borderRadius: "5px", boxShadow: "0 0 10px #e50914" }}></div>
            <span>Selected</span>
          </div>
          <div className="d-flex align-items-center gap-2">
            <div style={{ width: "22px", height: "22px", backgroundColor: "#78350f", borderRadius: "5px", border: "1px solid #f59e0b" }}></div>
            <span>Reserved (Held)</span>
          </div>
          <div className="d-flex align-items-center gap-2">
            <div style={{ width: "22px", height: "22px", backgroundColor: "#151722", borderRadius: "5px", opacity: 0.45 }}></div>
            <span>Booked (Sold Out)</span>
          </div>
        </div>

        {/* Tiers */}
        {tiers.map((tier) => (
          <div key={tier.name} className="mb-4">
            <div className="d-flex align-items-center justify-content-center gap-2 mb-3">
              <span className="badge bg-secondary bg-opacity-50 text-light fw-bold px-3 py-1 text-uppercase">
                {tier.name}
              </span>
              <span className="text-secondary small">₹{tier.price} per ticket</span>
            </div>

            {tier.rows.map((rowLetter) => (
              <div key={rowLetter} className="d-flex justify-content-center align-items-center gap-2 mb-2">
                <span className="text-secondary fw-bold small me-2" style={{ width: "20px" }}>
                  {rowLetter}
                </span>
                {Array.from({ length: 10 }, (_, i) => {
                  const num = i + 1;
                  const seatId = `${rowLetter}${num}`;
                  const isBooked = bookedSeatSet.has(seatId);
                  const isReserved = reservedSeatSet.has(seatId);
                  const isSelected = selectedSeats.some((s) => s.id === seatId);

                  let bg = "#1e293b";
                  let color = "#ffffff";
                  let border = "1px solid rgba(255, 255, 255, 0.12)";
                  let cursor = "pointer";
                  let titleText = `Seat ${seatId} - ₹${tier.price} (Available)`;

                  if (isSelected) {
                    bg = "#e50914";
                    border = "1px solid #ff4d58";
                    titleText = `Seat ${seatId} - Selected`;
                  } else if (isReserved) {
                    bg = "#78350f";
                    border = "1px solid #f59e0b";
                    color = "#fde68a";
                    cursor = "not-allowed";
                    titleText = `Seat ${seatId} - Reserved (Temporarily Held)`;
                  } else if (isBooked) {
                    bg = "#151722";
                    border = "1px solid #232738";
                    color = "#4a5168";
                    cursor = "not-allowed";
                    titleText = `Seat ${seatId} - Booked (Sold Out)`;
                  }

                  return (
                    <button
                      key={seatId}
                      type="button"
                      disabled={isBooked || isReserved}
                      onClick={() => toggleSeat(seatId, tier.price)}
                      style={{
                        width: "36px",
                        height: "36px",
                        padding: 0,
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        borderRadius: "6px",
                        cursor,
                        backgroundColor: bg,
                        color,
                        border,
                        boxShadow: isSelected ? "0 0 10px rgba(229, 9, 20, 0.8)" : "none",
                        opacity: isBooked ? 0.45 : 1,
                      }}
                      title={titleText}
                    >
                      {num}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Summary Footer Bar */}
      <div className="glass-panel p-4 d-flex flex-column flex-md-row justify-content-between align-items-center gap-3">
        <div>
          <span className="text-secondary small d-block">Selected Seats ({selectedSeats.length}/8):</span>
          <span className="text-white fw-bold fs-5">
            {selectedSeats.length > 0
              ? selectedSeats.map((s) => s.id).join(", ")
              : "No seats selected"}
          </span>
        </div>

        <div className="text-md-end">
          <span className="text-secondary small d-block">Total Due:</span>
          <span className="text-danger fw-bold fs-4">₹{totalAmount}</span>
        </div>

        <button
          onClick={handleProceedToPayment}
          disabled={selectedSeats.length === 0 || isSubmitting}
          className="btn btn-cinema px-5 py-3 fs-6 fw-bold shadow"
        >
          {isSubmitting ? (
            <>
              <span className="spinner-border spinner-border-sm me-2"></span> Reserving...
            </>
          ) : (
            <>
              <i className="fa-solid fa-credit-card me-2"></i> Proceed to Checkout
            </>
          )}
        </button>
      </div>
    </div>
  );
}
