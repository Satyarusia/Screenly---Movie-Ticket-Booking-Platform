// client/src/components/MovieCard.jsx
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useCity } from "../hooks/useCity";
import toast from "react-hot-toast";
import {
  getPosterUrl,
  getMovieTitle,
  getMovieRating,
  getMovieLanguage,
  getMovieId,
  getGenres,
  createTitlePosterSvg,
} from "../utils/tmdbHelper";
import { isMovieFavorited, toggleFavoriteMovie } from "../utils/favoritesHelper";

export default function MovieCard({
  movie,
  isFavourite,
  onToggleFavourite,
  className = "",
  style = {},
}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { selectedCity, openCityModal } = useCity();

  const id = getMovieId(movie);
  const title = getMovieTitle(movie);
  const rating = getMovieRating(movie);
  const language = getMovieLanguage(movie);
  const genres = getGenres(movie);
  const isAdmin = (user?.role || "").toLowerCase() === "admin";

  const [imgErrorStage, setImgErrorStage] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [internalFav, setInternalFav] = useState(() => isMovieFavorited(id));

  // Reset error stage and favorite state when the target movie changes
  useEffect(() => {
    setImgErrorStage(0);
    setInternalFav(isMovieFavorited(id));
  }, [id, movie]);

  const activeFav = isFavourite !== undefined ? isFavourite : internalFav;

  const posterSrc = useMemo(() => {
    if (!movie) return createTitlePosterSvg("Cinema");
    if (imgErrorStage === 0) {
      return getPosterUrl(movie);
    }
    if (imgErrorStage === 1 && movie?.tmdbId) {
      return `/posters/${movie.tmdbId}.jpg`;
    }
    return createTitlePosterSvg(title);
  }, [movie, title, imgErrorStage]);

  const handleImgError = () => {
    setImgErrorStage((prev) => prev + 1);
  };

  // Standardized 5-state system:
  // Now Showing, Coming Soon, Advance Booking, Last Day, Ended
  const { normalizedStatus, badgeColor, isBookable, buttonLabel } = useMemo(() => {
    if (!movie) {
      return {
        normalizedStatus: "Now Showing",
        badgeColor: "bg-danger",
        isBookable: true,
        buttonLabel: "Book Tickets",
      };
    }
    const raw = (movie.computedStatus || movie.theatricalStatus || "now_playing").toLowerCase();

    if (raw === "ended" || raw === "closed" || raw === "concluded") {
      return {
        normalizedStatus: "No Longer Playing",
        badgeColor: "bg-secondary",
        isBookable: false,
        buttonLabel: "View Details",
      };
    }
    if (raw === "last_day" || raw === "last day") {
      return {
        normalizedStatus: "Last Day",
        badgeColor: "bg-danger",
        isBookable: true,
        buttonLabel: "Book Last Shows",
      };
    }
    if (raw === "advance_booking" || raw === "advance booking" || movie.isAdvanceBooking) {
      return {
        normalizedStatus: "Advance Booking",
        badgeColor: "bg-warning text-dark",
        isBookable: true,
        buttonLabel: "Advance Book",
      };
    }
    if (raw === "coming_soon" || raw === "coming soon" || raw === "upcoming") {
      return {
        normalizedStatus: "Coming Soon",
        badgeColor: "bg-info text-dark",
        isBookable: false,
        buttonLabel: "View Details",
      };
    }
    return {
      normalizedStatus: "Now Showing",
      badgeColor: "bg-danger",
      isBookable: true,
      buttonLabel: "Book Tickets",
    };
  }, [movie]);

  if (!movie) return null;

  const handleCardClick = () => {
    navigate(`/movies/${id}`, { state: { movie } });
  };

  const handleButtonClick = (e) => {
    e.stopPropagation();
    e.preventDefault();

    if (!isBookable) {
      navigate(`/movies/${id}`, { state: { movie } });
      return;
    }

    // Step 1: If no city has been selected, prompt user to select a city first
    if (!selectedCity || selectedCity === "All") {
      openCityModal(() => {
        // Step 2: Once city is selected, check authentication
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
          navigate(`/movies/${id}?action=book#scheduled-showtimes`, { state: { movie } });
        }
      });
      return;
    }

    // Step 2: City is already selected; if guest user, redirect to Login
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

    // Step 3: User is authenticated and city is selected; proceed directly to movie showtimes
    navigate(`/movies/${id}?action=book#scheduled-showtimes`, { state: { movie } });
  };

  const handleFavoriteClick = async (e) => {
    e.stopPropagation();
    e.preventDefault();

    if (!user) {
      toast("Please log in to save movies to your watchlist.");
      navigate("/login", {
        state: {
          from: {
            pathname: `/movies/${id}`,
          },
          message: "Please log in to save movies to your watchlist.",
        },
      });
      return;
    }

    if (onToggleFavourite) {
      onToggleFavourite(id);
    } else {
      const nextFav = await toggleFavoriteMovie(movie);
      const isNowFav = nextFav.some((m) => (m.movieId || m._id || m.id) === id);
      setInternalFav(isNowFav);
      toast.success(isNowFav ? "Added to your watchlist" : "Removed from watchlist");
    }
  };

  return (
    <div
      onClick={handleCardClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleCardClick();
        }
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="button"
      tabIndex={0}
      aria-label={`View details for ${title}`}
      className={`card border-0 rounded-3 overflow-hidden text-start h-100 position-relative glass-card ${className}`}
      style={{
        width: "185px",
        minWidth: "185px",
        backgroundColor: "#131522",
        border: isHovered
          ? "1px solid rgba(229, 9, 20, 0.45)"
          : "1px solid rgba(255, 255, 255, 0.08)",
        boxShadow: isHovered
          ? "0 10px 24px -4px rgba(0, 0, 0, 0.7), 0 0 16px rgba(229, 9, 20, 0.22)"
          : "0 4px 12px rgba(0, 0, 0, 0.35)",
        transform: isHovered ? "translateY(-4px)" : "translateY(0)",
        cursor: "pointer",
        transition: "transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.25s ease, border-color 0.25s ease",
        ...style,
      }}
    >
      {/* Poster Media Box with 2:3 Cinematic Ratio */}
      <div
        className="position-relative overflow-hidden"
        style={{
          width: "100%",
          paddingTop: "148%",
          backgroundColor: "#1a1d2e",
        }}
      >
        <img
          src={posterSrc}
          alt={title}
          onError={handleImgError}
          className="position-absolute top-0 start-0 w-100 h-100"
          style={{
            objectFit: "cover",
            transform: isHovered ? "scale(1.04)" : "scale(1)",
            transition: "transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
          loading="lazy"
        />

        {/* Status Badge (Top-Left) */}
        <div className="position-absolute top-0 start-0 m-2" style={{ zIndex: 2 }}>
          <span
            className={`badge ${badgeColor} fw-semibold shadow-sm text-uppercase`}
            style={{ fontSize: "0.62rem", letterSpacing: "0.5px" }}
          >
            {normalizedStatus}
          </span>
        </div>

        {/* Action Controls (Top-Right): Format Badge, Admin Edit & Watchlist Heart */}
        <div
          className="position-absolute top-0 end-0 m-2 d-flex align-items-center gap-1"
          style={{ zIndex: 2 }}
        >
          {isAdmin && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                navigate("/admin/movies");
              }}
              className="btn btn-sm py-0 px-1 rounded bg-warning text-dark fw-bold border-0 shadow-sm"
              style={{ fontSize: "0.6rem", lineHeight: "1.4" }}
              title="Admin: Edit movie in catalog"
            >
              <i className="fa-solid fa-pen-to-square"></i> Edit
            </button>
          )}

          {movie.formats && movie.formats.length > 0 && (
            <span
              className="badge bg-dark bg-opacity-75 text-light border border-secondary border-opacity-50"
              style={{ fontSize: "0.6rem" }}
            >
              {movie.formats[0]}
            </span>
          )}

          <button
            type="button"
            onClick={handleFavoriteClick}
            className="btn btn-sm p-1 rounded-circle border-0 d-flex align-items-center justify-content-center"
            style={{
              width: "24px",
              height: "24px",
              backgroundColor: activeFav ? "rgba(229, 9, 20, 0.92)" : "rgba(10, 11, 18, 0.72)",
              backdropFilter: "blur(6px)",
              color: "#ffffff",
              boxShadow: "0 2px 6px rgba(0, 0, 0, 0.4)",
              transition: "transform 0.15s ease, background-color 0.2s ease",
            }}
            title={activeFav ? "Remove from Watchlist" : "Add to Watchlist"}
            aria-label={activeFav ? "Remove from Watchlist" : "Add to Watchlist"}
          >
            <i
              className={`fa-${activeFav ? "solid text-white" : "regular text-light"} fa-heart`}
              style={{ fontSize: "0.68rem" }}
            ></i>
          </button>
        </div>

        {/* Screening Status (Bottom gradient bar) */}
        {movie.hasActiveShows !== undefined && (
          <div
            className="position-absolute bottom-0 start-0 end-0 px-2 py-1"
            style={{
              background: "linear-gradient(to top, rgba(10, 11, 18, 0.95), transparent)",
              zIndex: 2,
            }}
          >
            <span
              className="d-flex align-items-center gap-1"
              style={{ fontSize: "0.64rem", color: "#e2e8f0" }}
            >
              <i
                className={`fa-solid fa-circle ${movie.hasActiveShows ? "text-success" : "text-secondary"
                  }`}
                style={{ fontSize: "0.45rem" }}
              ></i>
              {movie.hasActiveShows ? "Active Screenings" : "Limited Shows"}
            </span>
          </div>
        )}
      </div>

      {/* Card Details */}
      <div className="p-2 d-flex flex-column justify-content-between flex-grow-1">
        <div>
          <h6
            className="text-white fw-bold mb-1 text-truncate"
            title={title}
            style={{ fontSize: "0.92rem" }}
          >
            {title}
          </h6>
          <div
            className="d-flex flex-column gap-1"
            style={{ fontSize: "0.72rem", color: "#94a3b8" }}
          >
            <span className="text-truncate" style={{ maxWidth: "160px" }}>
              {genres.slice(0, 2).join(", ")}
            </span>
            <div className="d-flex align-items-center justify-content-between">
              <span className="fw-semibold text-warning">
                <i className="fa-solid fa-star me-1" style={{ fontSize: "0.65rem" }}></i>
                {rating && Number(rating) > 0 ? rating : "N/A"}
              </span>
              <div className="d-flex align-items-center gap-1">
                {movie.certification && (
                  <span
                    className="badge bg-dark bg-opacity-75 text-secondary border border-secondary border-opacity-25 px-1"
                    style={{ fontSize: "0.6rem" }}
                  >
                    {movie.certification}
                  </span>
                )}
                <span
                  className="badge bg-secondary bg-opacity-25 text-light px-1"
                  style={{ fontSize: "0.65rem" }}
                >
                  {language}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={handleButtonClick}
          className={`btn ${isBookable ? "btn-cinema" : "btn-secondary-cinema"
            } btn-sm w-100 py-1 mt-2 fw-semibold text-decoration-none`}
          style={{ fontSize: "0.76rem" }}
        >
          {buttonLabel}
        </button>
      </div>
    </div>
  );
}
