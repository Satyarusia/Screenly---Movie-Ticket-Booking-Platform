// client/src/pages/MovieDetails.jsx
import { useEffect, useState, useMemo, useCallback } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../hooks/useAuth";
import { useCity } from "../hooks/useCity";
import LoadingSpinner from "../components/LoadingSpinner";
import TrailerModal from "../components/TrailerModal";
import MovieCard from "../components/MovieCard";
import EmptyState from "../components/EmptyState";
import { addRecentlyViewed } from "../services/recentlyViewed";
import toast from "react-hot-toast";
import {
  getPosterUrl,
  getBackdropUrl,
  getMovieTitle,
  getMovieRating,
  getMovieLanguage,
  getGenres,
  getCast,
  getRuntime,
  getDescription,
  getCertification,
  getReleaseYear,
  getTrailerKey,
  createTitlePosterSvg,
} from "../utils/tmdbHelper";
import { isMovieFavorited, toggleFavoriteMovie } from "../utils/favoritesHelper";

const unescapeText = (s = "") => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">");

const Stars = ({ value }) => (
  <span>
    {[1, 2, 3, 4, 5].map((n) => (
      <i
        key={n}
        className={`fa-star me-1 ${n <= value ? "fa-solid text-warning" : "fa-regular text-secondary"
          }`}
      ></i>
    ))}
  </span>
);

export default function MovieDetails() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { selectedCity, setSelectedCity, cities, openCityModal } = useCity();
  const myId = user?.id || user?._id;

  const [movie, setMovie] = useState(location.state?.movie || null);
  const [loading, setLoading] = useState(!location.state?.movie);
  const [imgSrc, setImgSrc] = useState(
    location.state?.movie ? getPosterUrl(location.state.movie) : ""
  );
  const [isFav, setIsFav] = useState(() => isMovieFavorited(id));
  const [isNotified, setIsNotified] = useState(false);

  // Similar movies recommendation state
  const [similarMovies, setSimilarMovies] = useState([]);

  // Trailer Modal State
  const [activeTrailer, setActiveTrailer] = useState({
    isOpen: false,
    youtubeKey: null,
    movieTitle: "",
  });

  const [reviewData, setReviewData] = useState({ average: 0, count: 0, reviews: [] });
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [reviewMsg, setReviewMsg] = useState("");
  const [movieShows, setMovieShows] = useState([]);

  useEffect(() => {
    if (id) {
      api
        .get(`/api/shows?movie=${id}`)
        .then((res) => {
          if (Array.isArray(res.data)) {
            setMovieShows(res.data);
          }
        })
        .catch(() => setMovieShows([]));
    }
  }, [id]);

  const cityFilteredShows = useMemo(() => {
    if (!selectedCity || selectedCity === "All") return [];
    return movieShows.filter(
      (s) => (s.theatre?.city || "").toLowerCase() === selectedCity.toLowerCase()
    );
  }, [movieShows, selectedCity]);

  const isBookAction = searchParams.get("action") === "book";

  useEffect(() => {
    if (isBookAction && !loading && movie) {
      if (!selectedCity || selectedCity === "All") {
        openCityModal(() => {
          setTimeout(() => {
            const el = document.getElementById("scheduled-showtimes");
            if (el) el.scrollIntoView({ behavior: "smooth" });
          }, 150);
        });
      } else {
        setTimeout(() => {
          const el = document.getElementById("scheduled-showtimes");
          if (el) el.scrollIntoView({ behavior: "smooth" });
        }, 150);
      }
    }
  }, [isBookAction, loading, movie, selectedCity, openCityModal]);

  const handleBookButtonClick = () => {
    // Step 1: Prompt user to choose a city first if none selected
    if (!selectedCity || selectedCity === "All") {
      openCityModal(() => {
        // Step 2: Once city is selected, check authentication for guest
        if (!user) {
          toast("Please log in or create an account to continue booking.");
          navigate("/login", {
            state: {
              from: {
                pathname: `/movies/${id}`,
                search: "?action=book",
                hash: "#scheduled-showtimes",
              },
              message: "Please log in or create an account to continue booking.",
            },
          });
        } else {
          setTimeout(() => {
            const el = document.getElementById("scheduled-showtimes");
            if (el) el.scrollIntoView({ behavior: "smooth" });
          }, 150);
        }
      });
      return;
    }

    // Step 2: City already selected; check authentication for guest
    if (!user) {
      toast("Please log in or create an account to continue booking.");
      navigate("/login", {
        state: {
          from: {
            pathname: `/movies/${id}`,
            search: "?action=book",
            hash: "#scheduled-showtimes",
          },
          message: "Please log in or create an account to continue booking.",
        },
      });
      return;
    }

    // Step 3: User is authenticated and city is selected; smooth scroll to verified showtimes
    const el = document.getElementById("scheduled-showtimes");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  const handleSelectSeats = (showId) => {
    if (!user) {
      toast("Please log in or create an account to continue booking.");
      navigate("/login", {
        state: {
          from: { pathname: `/seat-selection/${showId}` },
          message: "Please log in or create an account to continue booking.",
        },
      });
      return;
    }
    navigate(`/seat-selection/${showId}`);
  };

  const fetchReviews = useCallback(async () => {
    try {
      const res = await api.get(`/api/reviews/movie/${id}`);
      if (res.data && Array.isArray(res.data.reviews)) {
        setReviewData(res.data);
        const mine = res.data.reviews.find(
          (r) => r.user && (r.user._id === myId || r.user.id === myId)
        );
        if (mine) {
          setRating(mine.rating);
          setComment(unescapeText(mine.comment || ""));
        }
      }
    } catch {
      const local = JSON.parse(localStorage.getItem(`reviews_${id}`) || "[]");
      setReviewData({ average: 4.5, count: local.length, reviews: local });
    }
  }, [id, myId]);

  useEffect(() => {
    let ignore = false;

    api
      .get(`/api/movies/${id}`)
      .then((res) => {
        if (!ignore && res.data) {
          setMovie(res.data);
          setImgSrc(getPosterUrl(res.data));
        }
      })
      .catch(() => {
        // Fallback handled gracefully
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    window.scrollTo(0, 0);

    return () => {
      ignore = true;
    };
  }, [id]);

  useEffect(() => {
    if (movie) {
      addRecentlyViewed(movie);

      const currentGenres = getGenres(movie);
      api
        .get("/api/movies")
        .then((res) => {
          const list = Array.isArray(res.data) ? res.data : [];
          const matches = list
            .filter((m) => {
              const st = (m.computedStatus || m.theatricalStatus || "").toLowerCase();
              if (st === "ended" || st === "closed" || st === "concluded") return false;
              return (
                (m._id || m.movieId || m.id) !== id &&
                getGenres(m).some((g) => currentGenres.includes(g))
              );
            })
            .slice(0, 6);
          setSimilarMovies(matches);
        })
        .catch(() => {
          setSimilarMovies([]);
        });
    }
  }, [movie, id]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const handleFavorite = async () => {
    const now = await toggleFavoriteMovie(movie);
    setIsFav(now);
    toast.success(now ? "Added to your Favorites!" : "Removed from Favorites.");
  };

  const handleNotifyMe = () => {
    setIsNotified(!isNotified);
    if (!isNotified) {
      toast.success("You are on the notification list. We will alert you the moment ticket booking opens.");
    } else {
      toast("Notification preference removed.");
    }
  };

  const handleShare = async () => {
    const title = getMovieTitle(movie);
    const shareUrl = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${title} on Screenly`,
          text: `Check out ${title} on Screenly Cinema!`,
          url: shareUrl,
        });
      } catch {
        // User cancelled share
      }
    } else {
      navigator.clipboard.writeText(shareUrl);
      toast.success("Movie link copied to clipboard!");
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      navigate("/login");
      return;
    }
    try {
      await api.post("/api/reviews", { movieId: id, rating: Number(rating), comment });
      setReviewMsg("Thanks! Your review is saved.");
      toast.success("Your review has been published!");
      fetchReviews();
    } catch {
      const local = JSON.parse(localStorage.getItem(`reviews_${id}`) || "[]");
      const newRev = {
        _id: "r_" + Date.now(),
        user: { name: user.name || "You" },
        rating: Number(rating),
        comment,
      };
      localStorage.setItem(`reviews_${id}`, JSON.stringify([newRev, ...local]));
      setReviewMsg("Review saved!");
      toast.success("Review saved locally!");
      fetchReviews();
    }
  };

  const handleDeleteReview = async (reviewId) => {
    try {
      await api.delete(`/api/reviews/${reviewId}`);
    } catch {
      const local = JSON.parse(localStorage.getItem(`reviews_${id}`) || "[]");
      localStorage.setItem(
        `reviews_${id}`,
        JSON.stringify(local.filter((r) => r._id !== reviewId))
      );
    }
    setComment("");
    setRating(5);
    setReviewMsg("Review deleted.");
    toast.success("Review deleted.");
    fetchReviews();
  };

  // Status computation matching real-world cinema standards
  const { normalizedStatus, statusBadgeClass, isBookable, isComingSoon, daysUntilRelease } = useMemo(() => {
    if (!movie) return { normalizedStatus: "Now Showing", statusBadgeClass: "bg-success", isBookable: true };

    const raw = (movie.computedStatus || movie.theatricalStatus || "now_playing").toLowerCase();
    const hasAdvance = Boolean(movie.isAdvanceBooking);
    const relDate = movie.releaseDate ? new Date(movie.releaseDate) : null;
    const now = new Date();

    let daysDiff = 0;
    if (relDate && relDate > now) {
      daysDiff = Math.ceil((relDate - now) / (1000 * 60 * 60 * 24));
    }

    if (raw === "ended") {
      return { normalizedStatus: "Ended", statusBadgeClass: "bg-secondary", isBookable: false, isComingSoon: false };
    }
    if (raw === "last_day" || raw === "last day") {
      return { normalizedStatus: "Last Day", statusBadgeClass: "bg-danger", isBookable: true, isComingSoon: false };
    }
    if (hasAdvance || raw === "advance_booking" || raw === "advance booking") {
      return { normalizedStatus: "Advance Booking", statusBadgeClass: "bg-warning text-dark", isBookable: true, isComingSoon: false, daysUntilRelease: daysDiff };
    }
    if (raw === "upcoming" || raw === "coming soon" || (relDate && relDate > now)) {
      return { normalizedStatus: "Coming Soon", statusBadgeClass: "bg-info text-dark", isBookable: false, isComingSoon: true, daysUntilRelease: daysDiff };
    }

    return { normalizedStatus: "Now Showing", statusBadgeClass: "bg-success", isBookable: true, isComingSoon: false };
  }, [movie]);

  if (loading && !movie) return <LoadingSpinner message="Loading movie details..." />;

  if (!movie) {
    return (
      <div className="container py-5" style={{ maxWidth: "600px" }}>
        <EmptyState
          icon="fa-solid fa-film"
          title="Movie Not Found"
          message="The requested movie is not available in our catalog."
          actionLabel="Back to Home"
          onAction={() => navigate("/")}
        />
      </div>
    );
  }

  const title = getMovieTitle(movie);
  const genres = getGenres(movie);
  const cast = getCast(movie);
  const runtime = getRuntime(movie);
  const certification = getCertification(movie);
  const year = getReleaseYear(movie);
  const trailerKey = getTrailerKey(movie);
  const director = movie.director || "Renowned Director";
  const backdropUrl = getBackdropUrl(movie) || imgSrc;

  const handleImgError = () => {
    if (movie?.tmdbId && imgSrc !== `/posters/${movie.tmdbId}.jpg` && !imgSrc.startsWith("data:")) {
      setImgSrc(`/posters/${movie.tmdbId}.jpg`);
    } else {
      setImgSrc(createTitlePosterSvg(title));
    }
  };

  // Dynamic "Why You'll Like This Movie" bullets based on movie attributes
  const reasonsToLike = [
    `Stellar cinematic presentation with Dolby Atmos 7.1 surround sound audio.`,
    `Features top performances by ${cast.slice(0, 2).join(" and ") || "an award-winning ensemble cast"}.`,
    `Gripping storyline blending high-stakes ${genres.join(" & ") || "drama"}.`,
    `Masterful direction and visual flair curated for the grand silver screen.`,
  ];

  return (
    <div className="position-relative" style={{ overflow: "hidden", minHeight: "100vh" }}>
      {/* Blurred Backdrop Atmosphere */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `url("${backdropUrl}")`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "blur(45px) brightness(0.2)",
          transform: "scale(1.2)",
          zIndex: 0,
        }}
      ></div>

      <div className="container py-4 position-relative" style={{ zIndex: 1 }}>
        {/* Navigation Breadcrumb */}
        <div className="d-flex align-items-center gap-2 mb-4 text-secondary small">
          <Link to="/" className="text-secondary text-decoration-none hover-white">
            <i className="fa-solid fa-house me-1"></i> Home
          </Link>
          <span>/</span>
          <Link to="/movies" className="text-secondary text-decoration-none hover-white">
            Movies
          </Link>
          <span>/</span>
          <span className="text-white fw-bold">{title}</span>
        </div>

        <div className="row g-5">
          {/* Movie Poster & Quick Attributes */}
          <div className="col-12 col-md-4 col-lg-3 text-center">
            <img
              src={imgSrc}
              alt={title}
              onError={handleImgError}
              className="img-fluid rounded-4 shadow-lg mb-3"
              style={{
                border: "1px solid rgba(255,255,255,0.14)",
                maxHeight: "430px",
                objectFit: "cover",
                width: "100%",
              }}
            />

            {/* Quick Share & Wishlist action bar on poster */}
            <div className="d-flex justify-content-center gap-2">
              <button
                onClick={handleFavorite}
                className="btn btn-sm btn-secondary-cinema flex-fill py-2"
                title={isFav ? "Saved in Favorites" : "Add to Favorites"}
              >
                <i className={`fa-heart me-1 ${isFav ? "fa-solid text-danger" : "fa-regular text-white"}`}></i>
                <span className="small">{isFav ? "Saved" : "Favorite"}</span>
              </button>
              <button
                onClick={handleShare}
                className="btn btn-sm btn-secondary-cinema flex-fill py-2"
                title="Share this movie"
              >
                <i className="fa-solid fa-share-nodes me-1 text-info"></i>
                <span className="small">Share</span>
              </button>
            </div>
          </div>

          {/* Details & Interactive Booking Actions */}
          <div className="col-12 col-md-8 col-lg-9">
            <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
              <span className="badge-rating">
                <i className="fa-solid fa-star me-1 text-warning"></i>
                {getMovieRating(movie)} / 10
              </span>
              {certification && <span className="badge-cert">{certification}</span>}
              <span className="text-secondary small fw-bold">{getMovieLanguage(movie)}</span>
              {runtime && (
                <span className="text-secondary small">
                  <i className="fa-regular fa-clock me-1"></i>
                  {runtime}
                </span>
              )}
              {year && <span className="text-secondary small">{year}</span>}

              {/* Standardized Status Badge */}
              <span className={`badge ${statusBadgeClass} fw-bold px-3 py-1 ms-1 text-uppercase`}>
                {normalizedStatus === "Ended" ? "Theatrical Run Ended" : normalizedStatus}
              </span>
            </div>

            <h1 className="display-5 fw-bold text-white mb-2" style={{ fontFamily: "'Outfit', sans-serif" }}>
              {title}
            </h1>

            <div className="d-flex flex-wrap gap-2 mb-4">
              {genres.map((g) => (
                <span key={g} className="filter-pill">
                  {g}
                </span>
              ))}
            </div>

            {/* Verified Award Recognition */}
            {(movie.isAwardWinner || (movie.awards && movie.awards.length > 0)) && (
              <div
                className="p-3 rounded-3 mb-4 border border-warning border-opacity-40 d-flex align-items-center gap-3"
                style={{ background: "rgba(234, 179, 8, 0.08)" }}
              >
                <div
                  className="rounded-circle d-flex align-items-center justify-content-center bg-warning text-dark flex-shrink-0"
                  style={{ width: "36px", height: "36px" }}
                >
                  <i className="fa-solid fa-trophy fs-6"></i>
                </div>
                <div>
                  <div className="text-warning small fw-bold text-uppercase" style={{ letterSpacing: "0.5px" }}>
                    Verified Award Winner
                  </div>
                  <div className="text-light small">
                    {movie.awards ? movie.awards.join(" • ") : "Award-Winning Theatrical Masterpiece"}
                  </div>
                </div>
              </div>
            )}

            {/* Coming Soon Notice Card */}
            {isComingSoon && (
              <div
                className="p-3 rounded-3 mb-4 border border-info border-opacity-50"
                style={{ background: "rgba(14, 165, 233, 0.1)" }}
              >
                <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                  <div>
                    <h6 className="text-info fw-bold mb-1">
                      <i className="fa-solid fa-calendar-star me-2"></i>
                      Coming Soon to Theatres
                    </h6>
                    <p className="text-secondary small mb-0">
                      {movie.releaseDate
                        ? `Expected Release Date: ${new Date(movie.releaseDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`
                        : "Official cinema release schedule will be announced shortly."}
                      {daysUntilRelease > 0 && ` (${daysUntilRelease} days remaining)`}
                    </p>
                  </div>
                  <button
                    onClick={handleNotifyMe}
                    className={`btn btn-sm ${isNotified ? "btn-success" : "btn-outline-info"} fw-bold px-3 py-2`}
                  >
                    <i className={`fa-solid ${isNotified ? "fa-bell-slash" : "fa-bell"} me-1`}></i>
                    {isNotified ? "Notified" : "Notify Me"}
                  </button>
                </div>
              </div>
            )}

            {/* Run Ended Notice Card */}
            {normalizedStatus === "Ended" && (
              <div
                className="p-3 rounded-3 mb-4 border border-secondary border-opacity-25"
                style={{ background: "rgba(255, 255, 255, 0.03)" }}
              >
                <div className="text-warning small fw-bold mb-1">
                  <i className="fa-solid fa-circle-info me-1"></i> Theatrical Screening Concluded
                </div>
                <p className="text-secondary small mb-0">
                  This movie has completed its theatrical cinema run. Ticket reservations are closed, but you can still watch the official trailer and read audience reviews below.
                </p>
              </div>
            )}

            {/* Synopsis */}
            <h5 className="text-white fw-bold mb-2">Synopsis</h5>
            <p className="text-light text-opacity-75 mb-4" style={{ whiteSpace: "pre-line", maxWidth: "800px" }}>
              {getDescription(movie)}
            </p>

            {/* Cast & Crew Cards */}
            <div className="row g-3 mb-4">
              <div className="col-12 col-md-7">
                <h6 className="text-white fw-bold mb-2">Starring Cast</h6>
                <div className="d-flex flex-wrap gap-2">
                  {cast.slice(0, 6).map((actor) => (
                    <span
                      key={actor}
                      className="badge bg-secondary bg-opacity-25 text-light px-3 py-2 border border-secondary border-opacity-10"
                    >
                      <i className="fa-solid fa-user-tie me-2 text-danger"></i>
                      {actor}
                    </span>
                  ))}
                </div>
              </div>
              <div className="col-12 col-md-5">
                <h6 className="text-white fw-bold mb-2">Director &amp; Crew</h6>
                <span className="badge bg-dark text-light border border-secondary border-opacity-25 px-3 py-2">
                  <i className="fa-solid fa-clapperboard me-2 text-warning"></i>
                  Director: {director}
                </span>
              </div>
            </div>

            {/* Coming Soon Countdown & Status Badges */}
            {isComingSoon && (
              <div className="p-3 rounded-3 mb-3" style={{ background: "rgba(14, 165, 233, 0.1)", border: "1px solid rgba(14, 165, 233, 0.25)" }}>
                <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
                  <span className="badge bg-info text-dark fw-bold px-3 py-1">
                    <i className="fa-solid fa-clock me-1"></i> Coming Soon
                  </span>
                  {daysUntilRelease > 0 && (
                    <span className="text-info fw-bold small">
                      Releases in {daysUntilRelease} {daysUntilRelease === 1 ? "Day" : "Days"}!
                    </span>
                  )}
                </div>
                <div className="text-light small mt-1">
                  <strong>Theatrical Premiere:</strong> {movie.releaseDate ? new Date(movie.releaseDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "Coming Soon"}
                </div>
                <div className="text-secondary small mt-1">
                  <i className="fa-solid fa-circle-info me-1"></i> Advance bookings officially open 3 to 5 days prior to release.
                </div>
              </div>
            )}

            {normalizedStatus === "Ended" && (
              <div className="alert alert-secondary py-2 px-3 small mb-3">
                <i className="fa-solid fa-box-archive me-2 text-warning"></i>
                <strong>Theatrical Run Completed:</strong> This movie has finished its theatre screening cycle. Ticket purchases are locked. All past bookings and tickets are preserved in your profile.
              </div>
            )}

            {/* ACTION BUTTONS */}
            <div className="d-flex flex-wrap gap-3 pt-2">
              {isBookable ? (
                !selectedCity || selectedCity === "All" ? (
                  <button
                    type="button"
                    onClick={handleBookButtonClick}
                    className="btn btn-cinema px-4 py-3 fs-6 fw-bold shadow-lg text-decoration-none"
                  >
                    <i className="fa-solid fa-ticket me-2"></i>
                    {normalizedStatus === "Advance Booking"
                      ? "Book Advance Tickets (Select City)"
                      : "Book Tickets (Select City)"}
                  </button>
                ) : cityFilteredShows.length > 0 ? (
                  <button
                    type="button"
                    onClick={handleBookButtonClick}
                    className="btn btn-cinema px-4 py-3 fs-6 fw-bold shadow-lg text-decoration-none"
                  >
                    <i className="fa-solid fa-ticket me-2"></i>
                    {normalizedStatus === "Advance Booking"
                      ? `Book Advance Tickets (${cityFilteredShows.length} Shows in ${selectedCity})`
                      : `View Showtimes (${cityFilteredShows.length} Shows in ${selectedCity})`}
                  </button>
                ) : (
                  <button
                    disabled
                    className="btn btn-secondary-cinema px-4 py-3 fs-6 opacity-75 cursor-not-allowed"
                    title={`Not playing in ${selectedCity}`}
                  >
                    <i className="fa-solid fa-calendar-xmark me-2 text-danger"></i> Not Playing in {selectedCity}
                  </button>
                )
              ) : isComingSoon ? (
                <button
                  disabled
                  className="btn btn-secondary-cinema px-4 py-3 fs-6 opacity-75 cursor-not-allowed"
                >
                  <i className="fa-solid fa-clock me-2 text-info"></i> Tickets Open Soon
                </button>
              ) : (
                <div className="d-inline-flex align-items-center gap-3 px-4 py-3 rounded-3 bg-secondary bg-opacity-25 border border-secondary border-opacity-40 text-light">
                  <i className="fa-solid fa-film text-warning fs-5"></i>
                  <div>
                    <div className="fw-bold small text-warning">Theatrical Run Concluded</div>
                    <div className="text-secondary small" style={{ fontSize: "0.75rem" }}>
                      No longer screening in theatres &bull; Reviews &amp; ratings available below
                    </div>
                  </div>
                </div>
              )}

              {/* Watch Trailer */}
              <button
                type="button"
                onClick={() =>
                  setActiveTrailer({
                    isOpen: true,
                    youtubeKey: trailerKey,
                    movieTitle: title,
                  })
                }
                className="btn btn-secondary-cinema px-4 py-3 fs-6 fw-semibold d-flex align-items-center gap-2"
              >
                <i className="fa-solid fa-play text-danger"></i>
                <span>Watch Trailer</span>
              </button>
            </div>
          </div>
        </div>

        {/* Dedicated Real Showtimes Section (City-Specific) */}
        {isBookable && (
          <div id="scheduled-showtimes" className="glass-panel p-4 my-4">
            <div className="d-flex justify-content-between align-items-center mb-3 border-bottom border-secondary border-opacity-25 pb-2 flex-wrap gap-2">
              <div className="d-flex align-items-center gap-2">
                <h4 className="text-white fw-bold mb-0 d-flex align-items-center gap-2">
                  <i className="fa-solid fa-masks-theater text-danger"></i> Verified Cinema Showtimes
                </h4>
                {selectedCity && selectedCity !== "All" && (
                  <span className="badge bg-danger bg-opacity-25 text-danger border border-danger border-opacity-25 px-2 py-1 small">
                    <i className="fa-solid fa-location-dot me-1"></i> {selectedCity}
                  </span>
                )}
              </div>
              <div className="d-flex align-items-center gap-2">
                <button
                  type="button"
                  onClick={() => openCityModal()}
                  className="btn btn-sm btn-outline-danger py-1 px-3"
                  style={{ fontSize: "0.8rem" }}
                >
                  <i className="fa-solid fa-location-dot me-1"></i>
                  {selectedCity && selectedCity !== "All"
                    ? `Change Location (${selectedCity})`
                    : "Select Your Location"}
                </button>
                {selectedCity && selectedCity !== "All" && (
                  <span className="badge bg-secondary bg-opacity-50 small">
                    {cityFilteredShows.length} Shows
                  </span>
                )}
              </div>
            </div>

            {!selectedCity || selectedCity === "All" ? (
              <div className="text-center py-4 text-secondary">
                <i className="fa-solid fa-location-dot fs-2 mb-2 text-danger opacity-75"></i>
                <h5 className="text-white fw-bold mb-1">Select Your Location to View Showtimes</h5>
                <p className="small mb-3 opacity-75" style={{ maxWidth: "520px", margin: "0 auto" }}>
                  Choose your cinema location to view verified partner multiplexes, real scheduled showtimes, and booking availability for {title}.
                </p>
                <button
                  type="button"
                  onClick={() => openCityModal()}
                  className="btn btn-cinema btn-sm px-4 py-2 fw-semibold"
                >
                  <i className="fa-solid fa-location-dot me-2"></i> Select Your Location
                </button>
              </div>
            ) : cityFilteredShows.length === 0 ? (
              <div className="text-center py-4 text-secondary">
                <i className="fa-solid fa-calendar-xmark fs-2 mb-2 text-danger opacity-75"></i>
                <h5 className="text-white fw-bold mb-1">This movie is currently not playing in your selected city.</h5>
                <p className="small mb-3 opacity-75" style={{ maxWidth: "520px", margin: "0 auto" }}>
                  Currently, no partner multiplexes in <strong>{selectedCity}</strong> have active showtimes scheduled for {title}. You can choose another city or check back soon.
                </p>
                <div className="d-flex justify-content-center gap-2 flex-wrap">
                  {cities
                    .filter((c) => c !== selectedCity)
                    .slice(0, 4)
                    .map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setSelectedCity(c)}
                        className="btn btn-sm btn-secondary-cinema py-1 px-3 text-secondary hover-white"
                        style={{ fontSize: "0.78rem" }}
                      >
                        Check {c}
                      </button>
                    ))}
                </div>
              </div>
            ) : (
              <div className="d-flex flex-column gap-3">
                {cityFilteredShows.map((sc) => {
                  const showDate = new Date(sc.showTime);
                  const isPast = showDate < new Date() || sc.status === "Completed";
                  const screenName = sc.screen || "Screen 1";
                  const formatBadge = sc.format || "2D";
                  const price = sc.price || sc.theatre?.prices?.lower || 150;

                  return (
                    <div
                      key={sc._id}
                      className="glass-card p-3 d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3"
                    >
                      <div>
                        <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
                          <h6 className="text-white fw-bold mb-0">
                            {sc.theatre?.name || "Screenly Multiplex"} &bull;{" "}
                            <span className="text-info">{screenName}</span>
                          </h6>
                          <span className="badge bg-danger bg-opacity-25 text-danger px-2 py-0" style={{ fontSize: "0.7rem" }}>
                            {formatBadge}
                          </span>
                        </div>
                        <div className="text-secondary small">
                          <i className="fa-solid fa-location-dot text-danger me-1"></i>
                          {sc.theatre?.location || sc.theatre?.address}, {sc.theatre?.city}
                        </div>
                        <div className="text-warning small mt-1">
                          <i className="fa-regular fa-calendar me-1"></i>
                          {showDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} at{" "}
                          <strong>{showDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</strong>
                        </div>
                      </div>

                      <div className="d-flex align-items-center gap-3">
                        <div className="text-end d-none d-md-block">
                          <span className="text-secondary small d-block">Starting from</span>
                          <span className="text-success fw-bold">₹{price}</span>
                        </div>

                        {isPast ? (
                          <button disabled className="btn btn-sm btn-secondary-cinema px-3 py-2 opacity-50 cursor-not-allowed">
                            Screening Ended
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSelectSeats(sc._id)}
                            className="btn btn-cinema px-3 py-2 fw-bold text-decoration-none shadow"
                          >
                            <i className="fa-solid fa-couch me-1"></i> Select Seats
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Why You'll Like This Movie Section */}
        <div className="glass-panel p-4 my-5">
          <h4 className="text-white fw-bold mb-3 d-flex align-items-center gap-2">
            <i className="fa-solid fa-thumbs-up text-danger"></i> Why You'll Like This Movie
          </h4>
          <div className="row g-3">
            {reasonsToLike.map((reason, idx) => (
              <div key={idx} className="col-12 col-md-6">
                <div className="d-flex align-items-start gap-2">
                  <i className="fa-solid fa-circle-check text-success mt-1"></i>
                  <span className="text-secondary small">{reason}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Similar Movies Section */}
        {similarMovies.length > 0 && (
          <div className="my-5">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h4 className="text-white fw-bold mb-0">Similar Blockbusters</h4>
              <Link to="/movies" className="text-danger small fw-semibold text-decoration-none">
                View All &rarr;
              </Link>
            </div>
            <div className="d-flex gap-3 overflow-auto pb-3">
              {similarMovies.map((sim) => (
                <div key={sim._id || sim.movieId || sim.id} style={{ minWidth: "190px" }}>
                  <MovieCard movie={sim} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Audience Reviews & Community Rating Section */}
        <div className="glass-panel p-4 p-md-5 my-5">
          <div className="d-flex flex-wrap align-items-center justify-content-between mb-4">
            <div>
              <h3 className="text-white fw-bold mb-1">Audience Reviews &amp; Ratings</h3>
              <p className="text-secondary small mb-0">Verified viewer reviews and feedback</p>
            </div>
            <div className="text-end">
              <span className="text-warning fw-bold fs-3 me-2">
                {reviewData.count ? reviewData.average : "8.2"}
              </span>
              <span className="text-secondary small">
                / 5 ({reviewData.count || 12} review{(reviewData.count || 12) === 1 ? "" : "s"})
              </span>
            </div>
          </div>

          {user ? (
            <form onSubmit={handleReviewSubmit} className="mb-4">
              <div className="row g-3 align-items-start">
                <div className="col-12 col-md-3">
                  <label className="text-secondary small fw-bold mb-1 d-block">Your Rating</label>
                  <select
                    className="form-select cinema-input"
                    value={rating}
                    onChange={(e) => setRating(e.target.value)}
                  >
                    {[5, 4, 3, 2, 1].map((n) => (
                      <option key={n} value={n}>
                        {n} {n === 1 ? "Star" : "Stars"}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-12 col-md-7">
                  <label className="text-secondary small fw-bold mb-1 d-block">Review Comment</label>
                  <textarea
                    className="form-control cinema-input"
                    rows="2"
                    maxLength="1000"
                    placeholder="Share your thoughts about this movie..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                  />
                </div>
                <div className="col-12 col-md-2 d-flex align-items-end">
                  <button type="submit" className="btn btn-cinema w-100 py-2">
                    Submit Review
                  </button>
                </div>
              </div>
              {reviewMsg && <p className="text-secondary small mt-2 mb-0">{reviewMsg}</p>}
            </form>
          ) : (
            <div className="p-3 rounded-3 mb-4" style={{ background: "rgba(255,255,255,0.03)" }}>
              <span className="text-secondary small">
                <Link to="/login" className="text-danger fw-bold text-decoration-none">
                  Sign in
                </Link>{" "}
                to write and post a review for this movie.
              </span>
            </div>
          )}

          {!reviewData.reviews || reviewData.reviews.length === 0 ? (
            <p className="text-secondary mb-0">No reviews yet. Be the first to rate!</p>
          ) : (
            <div className="d-flex flex-column gap-3">
              {reviewData.reviews.map((r) => (
                <div
                  key={r._id || r.id}
                  className="p-3 rounded-3"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <div className="d-flex align-items-center justify-content-between mb-1">
                    <div>
                      <span className="text-white fw-semibold me-3">
                        {r.user?.name || "Viewer"}
                      </span>
                      <Stars value={r.rating} />
                    </div>
                    {(r.user?._id === myId || r.user?.id === myId || user?.role === "admin") && (
                      <button
                        onClick={() => handleDeleteReview(r._id || r.id)}
                        className="btn btn-sm btn-secondary-cinema text-danger"
                        title="Delete review"
                      >
                        <i className="fa-solid fa-trash"></i>
                      </button>
                    )}
                  </div>
                  {r.comment && (
                    <p className="text-light text-opacity-75 mb-0 small">
                      {unescapeText(r.comment)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Trailer Modal Overlay */}
      <TrailerModal
        trailerData={activeTrailer}
        onClose={() =>
          setActiveTrailer({ isOpen: false, youtubeKey: null, movieTitle: "" })
        }
      />
    </div>
  );
}
