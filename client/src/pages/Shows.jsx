// client/src/pages/Shows.jsx
import { useState, useEffect, useCallback } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import api from "../services/api";
import LoadingSpinner from "../components/LoadingSpinner";
import EmptyState from "../components/EmptyState";
import { useAuth } from "../hooks/useAuth";
import { useCity } from "../hooks/useCity";
import toast from "react-hot-toast";
import { getMovieTitle, getPosterUrl, getMovieLanguage, getCertification, handleImageError } from "../utils/tmdbHelper";

export default function Shows() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const initialMovieFilter = searchParams.get("movie") || "All";
  const initialTheatreFilter = searchParams.get("theatre") || "All";

  const { selectedCity, setSelectedCity, cities, openCityModal } = useCity();

  const [liveShows, setLiveShows] = useState([]);
  const [moviesList, setMoviesList] = useState([]);
  const [theatresList, setTheatresList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedMovie, setSelectedMovie] = useState(initialMovieFilter);
  const [selectedTheatre, setSelectedTheatre] = useState(initialTheatreFilter);
  const [selectedFormat, setSelectedFormat] = useState("All");
  const [selectedTimeSlot, setSelectedTimeSlot] = useState("All");
  const [selectedPriceTier, setSelectedPriceTier] = useState("All");
  const [selectedDateIndex, setSelectedDateIndex] = useState(0);

  // Generate 5 consecutive dates: Today, Tomorrow, +2, +3, +4
  const dateOptions = Array.from({ length: 5 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return {
      label: i === 0 ? "Today" : i === 1 ? "Tomorrow" : d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
      isoString: d.toISOString().split("T")[0],
      dayName: d.toLocaleDateString("en-US", { weekday: "short" }),
      dateNumber: d.getDate(),
      monthName: d.toLocaleDateString("en-US", { month: "short" }),
    };
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [showsRes, moviesRes, theatresRes] = await Promise.all([
        api.get("/api/shows"),
        api.get("/api/movies"),
        api.get("/api/theatres"),
      ]);

      setLiveShows(Array.isArray(showsRes.data) ? showsRes.data : []);
      setMoviesList(Array.isArray(moviesRes.data) ? moviesRes.data : []);
      setTheatresList(Array.isArray(theatresRes.data) ? theatresRes.data : []);
    } catch {
      setLiveShows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const selectedIsoDate = dateOptions[selectedDateIndex].isoString;

  // Filter shows based STRICTLY on real scheduled shows (No fake generated schedules)
  const filteredShows = liveShows.filter((show) => {
    if (!show.movie || !show.theatre) return false;

    // Filter by Date
    const showDateStr = new Date(show.showTime).toISOString().split("T")[0];
    if (showDateStr !== selectedIsoDate) return false;

    // Filter by City (Strict real-world city location)
    if (!selectedCity) return false;
    if ((show.theatre?.city || "").toLowerCase() !== selectedCity.toLowerCase()) {
      return false;
    }

    // Filter by Movie
    if (selectedMovie !== "All") {
      const mId = show.movie._id || show.movie.id;
      if (mId !== selectedMovie) return false;
    }

    // Filter by Theatre
    if (selectedTheatre !== "All") {
      const tId = show.theatre._id || show.theatre.id;
      if (tId !== selectedTheatre) return false;
    }

    // Filter by Format (2D, 3D, IMAX, etc.)
    if (selectedFormat !== "All") {
      const fmt = (show.format || "").toLowerCase();
      const screenFmt = (show.screen || "").toLowerCase();
      if (!fmt.includes(selectedFormat.toLowerCase()) && !screenFmt.includes(selectedFormat.toLowerCase())) {
        return false;
      }
    }

    // Filter by Time Slot
    if (selectedTimeSlot !== "All") {
      const hours = new Date(show.showTime).getHours();
      if (selectedTimeSlot === "Morning" && hours >= 12) return false;
      if (selectedTimeSlot === "Afternoon" && (hours < 12 || hours >= 16)) return false;
      if (selectedTimeSlot === "Evening" && (hours < 16 || hours >= 20)) return false;
      if (selectedTimeSlot === "Night" && hours < 20) return false;
    }

    // Filter by Price Range
    if (selectedPriceTier !== "All") {
      const price = show.price || show.theatre.prices?.lower || 150;
      if (selectedPriceTier === "<150" && price >= 150) return false;
      if (selectedPriceTier === "150-250" && (price < 150 || price > 250)) return false;
      if (selectedPriceTier === "250-400" && (price < 250 || price > 400)) return false;
      if (selectedPriceTier === ">400" && price <= 400) return false;
    }

    return true;
  });

  // Group filtered shows by Movie & Theatre for direct multiplex comparison
  const groupMap = new Map();

  filteredShows.forEach((s) => {
    const key = `${s.movie._id}_${s.theatre._id}`;
    if (!groupMap.has(key)) {
      groupMap.set(key, {
        movie: s.movie,
        theatre: s.theatre,
        screenings: [s],
      });
    } else {
      groupMap.get(key).screenings.push(s);
    }
  });

  const groupedSchedule = [];
  groupMap.forEach((val) => {
    // Sort screenings chronologically
    val.screenings.sort((a, b) => new Date(a.showTime) - new Date(b.showTime));
    groupedSchedule.push(val);
  });

  const formats = ["All", "2D", "3D", "IMAX", "4DX", "Dolby Cinema"];
  const timeSlots = ["All", "Morning", "Afternoon", "Evening", "Night"];
  const priceTiers = [
    { label: "All Prices", val: "All" },
    { label: "< ₹150", val: "<150" },
    { label: "₹150 - ₹250", val: "150-250" },
    { label: "₹250 - ₹400", val: "250-400" },
    { label: "> ₹400", val: ">400" },
  ];

  if (loading) return <LoadingSpinner message="Checking real-time cinema schedules..." />;

  return (
    <div className="container py-4 fade-in" style={{ maxWidth: "1280px" }}>
      {/* Title */}
      <div className="text-center mb-4">
        <h1 className="text-white fw-bold mb-2">
          Verified Cinema <span style={{ color: "#e50914" }}>Showtimes</span>
        </h1>
        <p className="text-secondary small">
          Compare partner multiplexes, screening formats, timings, and ticket prices in real time
        </p>
      </div>

      {!selectedCity ? (
        /* Dedicated City Selection Prompt When No City Chosen */
        <div
          className="glass-panel p-5 text-center my-4 rounded-4"
          style={{
            backgroundColor: "#151828",
            border: "1px solid rgba(229, 9, 20, 0.35)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
          }}
        >
          <div
            className="d-inline-flex align-items-center justify-content-center rounded-circle p-3 mb-3"
            style={{ width: "64px", height: "64px", background: "rgba(229, 9, 20, 0.15)", color: "#e50914" }}
          >
            <i className="fa-solid fa-location-dot fs-3"></i>
          </div>
          <h3 className="text-white fw-bold mb-2">Select Your City to View Real Showtimes</h3>
          <p className="text-secondary small mb-4" style={{ maxWidth: "560px", margin: "0 auto" }}>
            Cinema schedules, auditorium formats (2D/3D/IMAX), and seat matrices are location-specific.
            Please choose your metropolitan area to view real multiplex showtimes.
          </p>
          <button
            type="button"
            onClick={() => openCityModal()}
            className="btn btn-cinema px-4 py-2 fs-6 fw-bold shadow-lg mb-4"
          >
            <i className="fa-solid fa-location-dot me-2"></i> Select Your Location
          </button>
          <div className="d-flex align-items-center justify-content-center gap-2 flex-wrap">
            <span className="text-secondary small me-2">Or select a metropolitan market:</span>
            {cities.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setSelectedCity(c)}
                className="btn btn-sm btn-secondary-cinema py-1 px-3 text-secondary hover-white"
                style={{ fontSize: "0.8rem" }}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Date & City Selector Header */}
          <div className="glass-panel p-3 mb-4 d-flex justify-content-between align-items-center flex-wrap gap-3">
            {/* Date Tabs */}
            <div className="d-flex align-items-center gap-2 overflow-auto py-1">
              <span className="text-secondary small fw-bold text-uppercase me-1 d-none d-md-inline">Date:</span>
              {dateOptions.map((d, index) => (
                <button
                  key={d.isoString}
                  onClick={() => setSelectedDateIndex(index)}
                  className={`btn btn-sm py-2 px-3 fw-bold rounded-3 text-nowrap ${
                    selectedDateIndex === index ? "btn-cinema" : "btn-secondary-cinema"
                  }`}
                >
                  <span className="d-block" style={{ fontSize: "0.72rem", opacity: 0.85 }}>
                    {d.dayName}
                  </span>
                  <span>
                    {d.dateNumber} {d.monthName}
                  </span>
                </button>
              ))}
            </div>

            {/* City Filter Controls */}
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <span className="text-secondary small fw-bold text-uppercase">
                <i className="fa-solid fa-location-dot text-danger me-1"></i> City:
              </span>
              <span className="badge bg-danger bg-opacity-25 text-danger border border-danger border-opacity-25 px-3 py-2 small fw-bold d-flex align-items-center gap-2">
                <i className="fa-solid fa-location-dot"></i> {selectedCity}
              </span>
              <button
                type="button"
                onClick={() => openCityModal()}
                className="btn btn-sm btn-outline-danger py-1 px-3 ms-1"
                style={{ fontSize: "0.78rem" }}
              >
                <i className="fa-solid fa-arrows-rotate me-1"></i> Change City
              </button>
              {cities
                .filter((c) => c.toLowerCase() !== selectedCity.toLowerCase())
                .map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setSelectedCity(c)}
                    className="btn btn-sm py-1 px-2 text-secondary hover-white rounded-pill"
                    style={{ fontSize: "0.78rem", border: "1px solid rgba(255, 255, 255, 0.08)" }}
                  >
                    {c}
                  </button>
                ))}
            </div>
          </div>

      {/* Multi-Facet Filter Bar */}
      <div className="glass-panel p-3 mb-4">
        <div className="row g-3">
          {/* Movie Filter */}
          <div className="col-12 col-md-3">
            <label className="text-secondary small fw-bold mb-1 d-block">Movie:</label>
            <select
              className="form-select cinema-input py-1 px-2"
              value={selectedMovie}
              onChange={(e) => setSelectedMovie(e.target.value)}
              style={{ fontSize: "0.82rem" }}
            >
              <option value="All">All Movies</option>
              {moviesList.map((m) => (
                <option key={m._id} value={m._id}>
                  {m.title || m.movieName}
                </option>
              ))}
            </select>
          </div>

          {/* Theatre Filter */}
          <div className="col-12 col-md-3">
            <label className="text-secondary small fw-bold mb-1 d-block">Theatre:</label>
            <select
              className="form-select cinema-input py-1 px-2"
              value={selectedTheatre}
              onChange={(e) => setSelectedTheatre(e.target.value)}
              style={{ fontSize: "0.82rem" }}
            >
              <option value="All">All Theatres</option>
              {theatresList.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.name} ({t.city})
                </option>
              ))}
            </select>
          </div>

          {/* Format Filter */}
          <div className="col-6 col-md-2">
            <label className="text-secondary small fw-bold mb-1 d-block">Format:</label>
            <select
              className="form-select cinema-input py-1 px-2"
              value={selectedFormat}
              onChange={(e) => setSelectedFormat(e.target.value)}
              style={{ fontSize: "0.82rem" }}
            >
              {formats.map((f) => (
                <option key={f} value={f}>
                  {f === "All" ? "All Formats" : f}
                </option>
              ))}
            </select>
          </div>

          {/* Time Slot Filter */}
          <div className="col-6 col-md-2">
            <label className="text-secondary small fw-bold mb-1 d-block">Time of Day:</label>
            <select
              className="form-select cinema-input py-1 px-2"
              value={selectedTimeSlot}
              onChange={(e) => setSelectedTimeSlot(e.target.value)}
              style={{ fontSize: "0.82rem" }}
            >
              {timeSlots.map((ts) => (
                <option key={ts} value={ts}>
                  {ts === "All" ? "Any Time" : `${ts} Shows`}
                </option>
              ))}
            </select>
          </div>

          {/* Price Range */}
          <div className="col-12 col-md-2">
            <label className="text-secondary small fw-bold mb-1 d-block">Price Range:</label>
            <select
              className="form-select cinema-input py-1 px-2"
              value={selectedPriceTier}
              onChange={(e) => setSelectedPriceTier(e.target.value)}
              style={{ fontSize: "0.82rem" }}
            >
              {priceTiers.map((p) => (
                <option key={p.val} value={p.val}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Screenings List: Real Scheduled Shows Only */}
      {groupedSchedule.length === 0 ? (
        <EmptyState
          icon="fa-solid fa-calendar-xmark"
          title={`No Shows Available in ${selectedCity}`}
          message="There are currently no real scheduled shows matching your chosen filters in your selected city. Try switching dates or selecting another city."
          actionLabel="Change City"
          onAction={() => openCityModal()}
        />
      ) : (
        <div className="d-flex flex-column gap-3">
          <div className="d-flex justify-content-between align-items-center mb-1">
            <span className="text-secondary small">
              Found <strong>{groupedSchedule.length}</strong> multiplex screenings for {dateOptions[selectedDateIndex].label}
            </span>
          </div>

          {groupedSchedule.map((item, idx) => {
            const poster = getPosterUrl(item.movie);
            const title = getMovieTitle(item.movie);
            const cert = getCertification(item.movie);
            const lang = getMovieLanguage(item.movie);
            const basePrice = item.theatre.prices?.lower || 150;

            return (
              <div key={idx} className="glass-card p-4">
                <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3">
                  {/* Movie & Multiplex Info */}
                  <div className="d-flex gap-3 align-items-center">
                    <img
                      src={poster}
                      alt={title}
                      className="rounded-3 shadow-sm"
                      style={{ width: "65px", height: "95px", objectFit: "cover" }}
                      onError={(e) => handleImageError(e, title, item.movie?.tmdbId)}
                    />
                    <div>
                      <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
                        <Link
                          to={`/movies/${item.movie._id || item.movie.movieId || item.movie.id}`}
                          className="text-white fw-bold text-decoration-none fs-5 hover-danger"
                        >
                          {title}
                        </Link>
                        {cert && <span className="badge bg-danger small">{cert}</span>}
                        <span className="badge bg-secondary bg-opacity-50 small">{lang}</span>
                      </div>
                      <div className="text-secondary small mb-1">
                        <i className="fa-solid fa-masks-theater text-danger me-1"></i>
                        <strong className="text-light">{item.theatre.name}</strong> &bull; {item.theatre.city} &bull; {item.theatre.location}
                      </div>
                      <div className="text-secondary small">
                        Pricing starts from <strong className="text-white">₹{basePrice}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Real Scheduled Showtimes with Format Badges */}
                  <div className="d-flex flex-wrap gap-2">
                    {item.screenings.map((sc) => {
                      const showDate = new Date(sc.showTime);
                      const timeDisplay = showDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                      const isPast = showDate < new Date() || sc.status === "Completed";
                      const screenName = sc.screen || "Screen 1";
                      const formatBadge = sc.format || "2D";
                      const ticketPrice = sc.price || basePrice;

                      return (
                        <Link
                          key={sc._id}
                          to={isPast ? "#" : `/seat-selection/${sc._id}`}
                          onClick={(e) => {
                            if (isPast) {
                              e.preventDefault();
                              return;
                            }
                            if (!user) {
                              e.preventDefault();
                              toast("Please log in or create an account to continue booking.");
                              navigate("/login", {
                                state: {
                                  from: { pathname: `/seat-selection/${sc._id}` },
                                  message: "Please log in or create an account to continue booking.",
                                },
                              });
                            }
                          }}
                          className={`btn py-2 px-3 fw-bold rounded-3 d-flex flex-column align-items-center text-decoration-none ${
                            isPast
                              ? "btn-outline-secondary opacity-50 cursor-not-allowed"
                              : "btn-outline-danger"
                          }`}
                          style={{
                            minWidth: "120px",
                            borderColor: isPast ? "#334155" : "rgba(229, 9, 20, 0.45)",
                            cursor: isPast ? "not-allowed" : "pointer",
                          }}
                          title={isPast ? "Screening has ended" : `Select seats on ${screenName} (${formatBadge})`}
                        >
                          <span className="text-white fs-6">{timeDisplay}</span>
                          <span className="badge bg-danger bg-opacity-25 text-danger px-1 py-0 my-1" style={{ fontSize: "0.62rem" }}>
                            {formatBadge} &bull; ₹{ticketPrice}
                          </span>
                          <span className="text-secondary small" style={{ fontSize: "0.68rem" }}>
                            {screenName} &bull; {isPast ? "Ended" : "Available"}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  )}
</div>
);
}
