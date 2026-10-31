// client/src/pages/Home.jsx
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import { useCity } from "../hooks/useCity";
import { useAuth } from "../hooks/useAuth";
import MovieCard from "../components/MovieCard";
import LoadingSpinner from "../components/LoadingSpinner";
import EmptyState from "../components/EmptyState";
import { getRecentlyViewed } from "../services/recentlyViewed";
import {
  getMovieTitle,
  getMovieRating,
  getMovieLanguage,
  getMovieId,
  getGenres,
  getPosterUrl,
  getRuntime,
  getDescription,
  getCertification,
  createTitlePosterSvg,
} from "../utils/tmdbHelper";

const ROW_LIMIT = 20;
const NON_TAMIL_SOUTH_LANGUAGES = ["telugu", "kannada", "malayalam"];

const hasGenre = (movie, word) =>
  getGenres(movie).some((g) => g.toLowerCase().includes(word));

const byRatingDesc = (a, b) =>
  (Number(b.rating || b.vote_average) || 0) - (Number(a.rating || a.vote_average) || 0);

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { selectedCity } = useCity();
  const isAdmin = (user?.role || "").toLowerCase() === "admin";
  const [movies, setMovies] = useState([]);
  const [recentlyViewed, setRecentlyViewed] = useState(() => getRecentlyViewed());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const endpoint =
      selectedCity && selectedCity !== "All"
        ? `/api/movies?city=${encodeURIComponent(selectedCity)}`
        : "/api/movies";

    api
      .get(endpoint)
      .then((res) => {
        if (isMounted) {
          const fetched = Array.isArray(res.data) ? res.data : [];
          setMovies(fetched);
        }
      })
      .catch(() => {
        if (isMounted) setMovies([]);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedCity]);

  const { featured, sections } = useMemo(() => {
    const isTamil = (m) => {
      const l = (m.original_language || m.language || "").toLowerCase();
      return l === "ta" || l.includes("tamil");
    };

    const usable = movies.filter((m) => m && (m.title || m.movieName || m.name) && !isTamil(m));
    const lang = (m) => getMovieLanguage(m).toLowerCase();

    // Exclude ended movies from active theatrical categories
    const isActiveTheatrical = (m) => {
      const st = (m.computedStatus || m.theatricalStatus || "").toLowerCase();
      return st !== "ended" && st !== "closed" && st !== "concluded";
    };
    const activeUsable = usable.filter(isActiveTheatrical);

    // Active Categorization - strictly uses active theatrical movies (never contains Ended / No Longer Playing)
    const hindiMovies = activeUsable.filter((m) => lang(m) === "hindi");
    const hollywoodMovies = activeUsable.filter((m) => lang(m) === "english");

    const nowShowingMovies = usable.filter((m) => {
      const st = (m.computedStatus || m.theatricalStatus || "").toLowerCase();
      if (st !== "now showing" && st !== "now_playing" && st !== "last_day" && st !== "last day") return false;
      if (selectedCity && selectedCity !== "All" && m.isScreeningInCity !== undefined) {
        if (!m.isScreeningInCity) return false;
      }
      return true;
    });

    const advanceBookingMovies = usable.filter((m) => {
      const st = (m.computedStatus || m.theatricalStatus || "").toLowerCase();
      return st === "advance booking" || (m.isAdvanceBooking && st !== "now showing" && st !== "now_playing");
    });

    const comingSoonMovies = usable.filter((m) => {
      const st = (m.computedStatus || m.theatricalStatus || "").toLowerCase();
      return (
        (st === "coming soon" || st === "upcoming" || st === "coming_soon") &&
        !m.isAdvanceBooking &&
        st !== "now showing" &&
        st !== "now_playing"
      );
    });

    const trendingMovies = [...activeUsable].sort(byRatingDesc);

    const famousSouthIndian = activeUsable.filter((m) =>
      NON_TAMIL_SOUTH_LANGUAGES.includes(lang(m))
    );

    const rows = [
      // 1. Now Showing in Theatres
      {
        id: "now-showing",
        title: selectedCity && selectedCity !== "All" ? `Now Showing in ${selectedCity} Cinemas` : "Now Showing in Theatres",
        subtitle: selectedCity && selectedCity !== "All" ? `Real multiplex screenings currently running across ${selectedCity}` : "Real multiplex screenings currently running in theatres",
        badge: "Book Now",
        link: "/movies?status=Now%20Showing",
        list: nowShowingMovies,
      },
      // 2. Trending & Blockbusters
      {
        id: "trending",
        title: "Trending Movies",
        subtitle: "Top-rated audience favorites of the week",
        badge: "Trending",
        link: "/movies?category=trending",
        list: trendingMovies.slice(0, 12),
      },
      // 3. Advance Booking Available
      {
        id: "advance-booking",
        title: "Advance Booking Open",
        subtitle: "Lock in prime balcony recliner seats before anyone else",
        badge: "Advance",
        link: "/movies?status=Advance%20Booking",
        list: advanceBookingMovies,
      },
      // 4. Coming Soon
      {
        id: "coming-soon",
        title: "Coming Soon to Cinemas",
        subtitle: "Watch trailers, read synopsis & tap 'Notify Me'",
        badge: "Upcoming",
        link: "/movies?status=Coming%20Soon",
        list: comingSoonMovies,
      },
      // 5. Popular Bollywood
      {
        id: "bollywood",
        title: "Popular Bollywood Hits",
        subtitle: "Active blockbusters in Hindi cinema",
        link: "/search?language=Hindi",
        list: hindiMovies.sort(byRatingDesc),
      },
      // 6. Hollywood Spectacles
      {
        id: "hollywood",
        title: "Hollywood & Global Cinema",
        subtitle: "4K Laser & IMAX cinematic experiences",
        link: "/search?language=English",
        list: hollywoodMovies.sort(byRatingDesc),
      },
      // 7. Action Hits
      {
        id: "action",
        title: "High-Octane Action Blockbusters",
        subtitle: "Adrenaline, stunts, and sound design",
        link: "/search?genre=Action",
        list: activeUsable.filter((m) => hasGenre(m, "action")),
      },
      // 8. South Indian Hits
      {
        id: "south",
        title: "Celebrated South Indian Cinema",
        subtitle: "Telugu, Kannada & Malayalam pan-Indian spectacles",
        link: "/search",
        list: famousSouthIndian.sort(byRatingDesc),
      },
      // 9. Complete Catalog (Admin Live Overview)
      ...(isAdmin
        ? [
          {
            id: "admin-catalog",
            title: "Complete Movie Catalog (Admin View)",
            subtitle: "All movies currently active in MongoDB database with live edit/delete controls",
            badge: "Admin Access",
            link: "/admin/movies",
            list: usable,
          },
        ]
        : []),
    ];

    const featuredMovie = nowShowingMovies[0] || advanceBookingMovies[0] || comingSoonMovies[0] || activeUsable[0] || usable[0];

    let finalSections = rows.filter((r) => r.list && r.list.length > 0);
    if (finalSections.length === 0 && usable.length > 0) {
      finalSections = [
        {
          id: "all-movies",
          title: "All Cinema Releases",
          subtitle: "Browse movies available across all cinema locations",
          badge: "All Movies",
          link: "/movies",
          list: usable.slice(0, 30),
        },
      ];
    }

    return {
      featured: featuredMovie,
      sections: finalSections,
    };
  }, [movies, selectedCity, isAdmin]);

  if (loading) return <LoadingSpinner message="Loading Screenly cinema catalog..." />;

  const featuredPoster = featured ? getPosterUrl(featured) : "";
  const featuredTitle = featured ? getMovieTitle(featured) : "";
  const featuredRuntime = featured ? getRuntime(featured) : "";
  const featuredCert = featured ? getCertification(featured) : "";

  return (
    <div className="pb-5" style={{ backgroundColor: "#0a0b12", minHeight: "100vh" }}>
      {/* Admin Mode Top Indicator Banner */}
      {isAdmin && (
        <div
          className="container-fluid px-3 px-md-5 py-2 mb-3 d-flex flex-wrap align-items-center justify-content-between gap-2 border-bottom border-danger border-opacity-25"
          style={{
            backgroundColor: "rgba(229, 9, 20, 0.12)",
          }}
        >
          <div className="d-flex align-items-center gap-2">
            <span className="badge bg-danger">ADMIN MODE</span>
            <span className="text-white small fw-bold">
              Viewing live customer Home Page. You can edit movies, add shows, or visit the control center.
            </span>
          </div>
          <div className="d-flex gap-2">
            <Link to="/admin" className="btn btn-cinema btn-sm py-1 px-3">
              <i className="fa-solid fa-gauge me-1"></i> Admin Dashboard
            </Link>
            <Link to="/admin/movies" className="btn btn-secondary-cinema btn-sm py-1 px-3">
              <i className="fa-solid fa-film me-1 text-warning"></i> Manage Movies
            </Link>
            <Link to="/admin/shows" className="btn btn-secondary-cinema btn-sm py-1 px-3">
              <i className="fa-solid fa-clock me-1 text-info"></i> Schedule Shows
            </Link>
          </div>
        </div>
      )}

      {/* Featured Spotlight Billboard Hero */}
      {featured && (
        <div className="position-relative overflow-hidden mb-5">
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage: `url("${featuredPoster}")`,
              backgroundSize: "cover",
              backgroundPosition: "center 25%",
              filter: "blur(30px) brightness(0.32)",
              transform: "scale(1.2)",
            }}
          ></div>
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(90deg, rgba(10,11,18,0.95) 0%, rgba(10,11,18,0.65) 60%, rgba(10,11,18,0.3) 100%)",
            }}
          ></div>

          <div
            className="container-fluid px-4 px-md-5 py-5 position-relative d-flex align-items-center justify-content-between gap-5"
            style={{ minHeight: "56vh" }}
          >
            <div style={{ maxWidth: "680px" }}>
              <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
                <span
                  className="badge px-3 py-2 text-uppercase fw-bold"
                  style={{ backgroundColor: "#e50914", letterSpacing: "1.2px", fontSize: "0.72rem" }}
                >
                  <i className="fa-solid fa-sparkles me-1"></i> Spotlight Blockbuster
                </span>
                {featuredCert && <span className="badge-cert">{featuredCert}</span>}
                <span className="text-secondary small fw-semibold">
                  {getMovieLanguage(featured)}
                  {featuredRuntime && <> &bull; {featuredRuntime}</>}
                </span>
              </div>

              <h1
                className="display-4 fw-bold text-white mb-2"
                style={{ fontFamily: "'Outfit', sans-serif", letterSpacing: "-1px" }}
              >
                {featuredTitle}
              </h1>

              <div className="d-flex flex-wrap align-items-center gap-3 mb-3">
                <span className="text-warning fw-bold small">
                  <i className="fa-solid fa-star me-1"></i>
                  Rating {getMovieRating(featured)} / 10
                </span>
                <span className="text-secondary small">{getGenres(featured).join(" / ")}</span>
              </div>

              <p
                className="text-light text-opacity-75 small mb-4"
                style={{
                  maxWidth: "600px",
                  display: "-webkit-box",
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {getDescription(featured)}
              </p>

              <div className="d-flex flex-wrap gap-3">
                <Link
                  to={`/movies/${getMovieId(featured)}`}
                  state={{ movie: featured }}
                  className="btn btn-cinema px-4 py-2 fs-6 fw-bold"
                >
                  <i className="fa-solid fa-ticket me-2"></i> Book Tickets
                </Link>
                <Link to="/shows" className="btn btn-secondary-cinema px-4 py-2 fs-6">
                  <i className="fa-regular fa-clock me-2"></i> View Showtimes
                </Link>
              </div>
            </div>

            <img
              src={featuredPoster}
              alt={featuredTitle}
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = createTitlePosterSvg(featuredTitle);
              }}
              className="d-none d-md-block rounded-4 shadow-lg"
              style={{ height: "390px", border: "1px solid rgba(255,255,255,0.15)" }}
            />
          </div>
        </div>
      )}

      {/* Main Rows Container */}
      <div className="container-fluid px-3 px-md-5">
        {/* Recently Viewed & Continue Browsing Row */}
        {recentlyViewed && recentlyViewed.length > 0 && (
          <div className="mb-5 pb-2">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div>
                <h4 className="text-white fw-bold mb-0 d-flex align-items-center gap-2">
                  <i className="fa-solid fa-clock-rotate-left text-danger"></i> Recently Viewed &amp; Continue Browsing
                </h4>
                <p className="text-secondary small mb-0">Jump right back into movies you inspected earlier</p>
              </div>
              <button
                onClick={() => {
                  localStorage.removeItem("screenly_recently_viewed");
                  setRecentlyViewed([]);
                }}
                className="btn btn-sm btn-secondary-cinema py-1 px-2"
                style={{ fontSize: "0.72rem" }}
              >
                Clear History
              </button>
            </div>

            <div
              className="d-flex gap-3 overflow-auto pb-3 pt-1"
              style={{
                scrollSnapType: "x mandatory",
                scrollbarWidth: "thin",
                scrollbarColor: "#232738 #0a0b12",
              }}
            >
              {recentlyViewed.map((movie) => (
                <div key={getMovieId(movie)} style={{ scrollSnapAlign: "start" }}>
                  <MovieCard movie={movie} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Categorized Cinema Rows */}
        {sections.map((section) => (
          <div key={section.id || section.title} className="mb-5">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <div>
                <div className="d-flex align-items-center gap-2">
                  <h4
                    className="text-white fw-bold mb-0"
                    style={{ fontFamily: "'Outfit', sans-serif", letterSpacing: "0.5px" }}
                  >
                    {section.title}
                  </h4>
                  {section.badge && (
                    <span className="badge bg-danger bg-opacity-75 small text-uppercase">
                      {section.badge}
                    </span>
                  )}
                </div>
                {section.subtitle && (
                  <p className="text-secondary small mb-0 mt-1">{section.subtitle}</p>
                )}
              </div>
              <Link to={section.link} className="text-danger small fw-semibold text-decoration-none">
                Explore All &rarr;
              </Link>
            </div>

            <div
              className="d-flex gap-3 overflow-auto pb-3 pt-2"
              style={{
                scrollSnapType: "x mandatory",
                scrollbarWidth: "thin",
                scrollbarColor: "#232738 #0a0b12",
              }}
            >
              {section.list.slice(0, ROW_LIMIT).map((movie) => (
                <div key={getMovieId(movie)} style={{ scrollSnapAlign: "start" }}>
                  <MovieCard movie={movie} />
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Graceful Empty State */}
        {sections.length === 0 && (
          <EmptyState
            icon="fa-solid fa-film"
            title="No Movies Found"
            message="We couldn't locate active movies matching your selection. Try clearing filters or searching for another title."
            actionLabel="Search All Movies"
            onAction={() => navigate("/search")}
          />
        )}
      </div>
    </div>
  );
}
