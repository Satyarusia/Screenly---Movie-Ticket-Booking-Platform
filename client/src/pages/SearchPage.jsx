// client/src/pages/SearchPage.jsx
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../services/api";
import MovieCard from "../components/MovieCard";
import LoadingSpinner from "../components/LoadingSpinner";
import EmptyState from "../components/EmptyState";
import { useCity } from "../hooks/useCity";
import {
  getMovieTitle,
  getGenres,
  getCast,
  getMovieLanguage,
  getMovieFormats,
} from "../utils/tmdbHelper";

const PAGE_SIZE = 24;
const POPULAR_SEARCHES = ["Stree 2", "Jawan", "Animal", "Fighter", "Action", "Comedy", "Sci-Fi", "Advance Booking"];

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const { selectedCity, setSelectedCity, cities } = useCity();

  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [genre, setGenre] = useState(searchParams.get("genre") || "All");
  const [language, setLanguage] = useState(searchParams.get("language") || "All");
  const [status, setStatus] = useState(searchParams.get("status") || "All");
  const [format, setFormat] = useState("All");
  const [sortBy, setSortBy] = useState("rating");
  const [minRating, setMinRating] = useState("0");
  const [maxDuration, setMaxDuration] = useState("0");
  const [visible, setVisible] = useState(PAGE_SIZE);

  // Search History
  const [searchHistory, setSearchHistory] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("screenly_search_history") || "[]");
    } catch {
      return [];
    }
  });

  useEffect(() => {
    const endpoint = selectedCity ? `/api/movies?city=${encodeURIComponent(selectedCity)}` : "/api/movies";
    api
      .get(endpoint)
      .then((res) => setMovies(Array.isArray(res.data) ? res.data : []))
      .catch(() => setError("Could not load movies from server."))
      .finally(() => setLoading(false));
  }, [selectedCity]);

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    const trimmed = query.trim();
    if (trimmed && !searchHistory.includes(trimmed)) {
      const updated = [trimmed, ...searchHistory.slice(0, 5)];
      setSearchHistory(updated);
      localStorage.setItem("screenly_search_history", JSON.stringify(updated));
    }
  };

  const handleSelectSearchTag = (term) => {
    setQuery(term);
    const updated = [term, ...searchHistory.filter((t) => t !== term).slice(0, 5)];
    setSearchHistory(updated);
    localStorage.setItem("screenly_search_history", JSON.stringify(updated));
  };

  // Genre and Language Options
  const genreOptions = useMemo(() => {
    const counts = {};
    movies.forEach((m) =>
      getGenres(m).forEach((g) => {
        counts[g] = (counts[g] || 0) + 1;
      })
    );
    return Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
  }, [movies]);

  const languageOptions = useMemo(() => {
    const counts = {};
    movies.forEach((m) => {
      const l = getMovieLanguage(m);
      counts[l] = (counts[l] || 0) + 1;
    });
    return Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
  }, [movies]);

  const filteredMovies = useMemo(() => {
    const q = query.trim().toLowerCase();
    const result = movies.filter((movie) => {
      const genres = getGenres(movie).map((g) => g.toLowerCase());
      const lang = getMovieLanguage(movie).toLowerCase();
      const rating = Number(movie.rating) || 0;
      const duration = Number(movie.duration || movie.runtime || 0);
      const movieStatus = (movie.computedStatus || movie.theatricalStatus || "").toLowerCase();
      const formats = getMovieFormats(movie);

      const mTitle = getMovieTitle(movie).toLowerCase();
      const mDirector = String(movie.director || "").toLowerCase();
      const mDesc = String(movie.description || "").toLowerCase();
      const mCast = getCast(movie).map((c) => String(c).toLowerCase());

      const fuzzyMatch = (text, term) => {
        if (!term) return true;
        if (text.includes(term)) return true;
        try {
          const vFlex = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/([aeiouy]+)/gi, "$1+");
          return new RegExp(vFlex, "i").test(text);
        } catch {
          return false;
        }
      };

      const queryTokens = q.split(/[\s:,\-_]+/).filter(Boolean);
      const matchAllTokens =
        queryTokens.length > 0 &&
        queryTokens.every(
          (tok) =>
            fuzzyMatch(mTitle, tok) ||
            fuzzyMatch(mDirector, tok) ||
            fuzzyMatch(mDesc, tok) ||
            genres.some((g) => fuzzyMatch(g, tok)) ||
            mCast.some((c) => fuzzyMatch(c, tok))
        );

      const matchQuery =
        !q ||
        fuzzyMatch(mTitle, q) ||
        fuzzyMatch(mDirector, q) ||
        fuzzyMatch(mDesc, q) ||
        genres.some((g) => fuzzyMatch(g, q)) ||
        fuzzyMatch(lang, q) ||
        mCast.some((actor) => fuzzyMatch(actor, q)) ||
        matchAllTokens;

      const matchGenre = genre === "All" || genres.includes(genre.toLowerCase());

      const langMap = {
        hindi: ["hindi", "hi"],
        english: ["english", "en"],
        telugu: ["telugu", "te"],
        tamil: ["tamil", "ta"],
        malayalam: ["malayalam", "ml"],
        kannada: ["kannada", "kn"],
        marathi: ["marathi", "mr"],
        bengali: ["bengali", "bn"],
        punjabi: ["punjabi", "pa"],
      };
      let matchLanguage = true;
      if (language !== "All") {
        const lTarget = language.toLowerCase();
        const allowed = langMap[lTarget] || [lTarget];
        matchLanguage = allowed.includes(lang) || lang.includes(lTarget);
      }

      const matchRating = rating >= Number(minRating);
      const matchDuration =
        maxDuration === "0" || duration === 0 || duration <= Number(maxDuration);
      const matchFormat = format === "All" || formats.includes(format);

      let matchStatus = true;
      if (status !== "All") {
        const target = status.toLowerCase();
        if (target.includes("advance")) {
          matchStatus = movie.isAdvanceBooking || movieStatus.includes("advance");
        } else if (target.includes("coming") || target.includes("upcoming")) {
          matchStatus =
            (movieStatus.includes("upcoming") || movieStatus.includes("coming")) &&
            !movie.isAdvanceBooking &&
            !movieStatus.includes("now");
        } else if (target.includes("ended") || target.includes("concluded")) {
          matchStatus = movieStatus.includes("ended") || movieStatus.includes("concluded");
        } else if (target.includes("now")) {
          matchStatus =
            (movieStatus.includes("now") || movieStatus === "now_playing") &&
            !movieStatus.includes("ended");
        }
      }

      return matchQuery && matchGenre && matchLanguage && matchRating && matchDuration && matchFormat && matchStatus;
    });

    // Intelligent Sorting & Search Relevance Ranking
    if (q) {
      result.sort((a, b) => {
        const titleA = getMovieTitle(a).toLowerCase();
        const titleB = getMovieTitle(b).toLowerCase();
        const exactA = titleA === q ? 1 : 0;
        const exactB = titleB === q ? 1 : 0;
        if (exactA !== exactB) return exactB - exactA;

        const startsA = titleA.startsWith(q) ? 1 : 0;
        const startsB = titleB.startsWith(q) ? 1 : 0;
        if (startsA !== startsB) return startsB - startsA;

        return (Number(b.rating) || 0) - (Number(a.rating) || 0);
      });
    } else {
      if (sortBy === "rating") {
        result.sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0));
      } else if (sortBy === "name") {
        result.sort((a, b) => getMovieTitle(a).localeCompare(getMovieTitle(b)));
      } else if (sortBy === "date") {
        result.sort((a, b) => new Date(b.releaseDate || 0) - new Date(a.releaseDate || 0));
      } else if (sortBy === "duration") {
        result.sort((a, b) => (Number(b.duration) || 0) - (Number(a.duration) || 0));
      }
    }

    return result;
  }, [movies, query, genre, language, status, format, minRating, maxDuration, sortBy]);

  const clearFilters = () => {
    setQuery("");
    setGenre("All");
    setLanguage("All");
    setStatus("All");
    setFormat("All");
    setMinRating("0");
    setMaxDuration("0");
    setSortBy("rating");
  };

  if (loading) return <LoadingSpinner message="Searching Screenly catalogue..." />;

  return (
    <div
      className="container-fluid px-3 px-md-5 py-4"
      style={{ minHeight: "100vh", backgroundColor: "#0a0b12" }}
    >
      <div className="mx-auto" style={{ maxWidth: "900px" }}>
        <h2 className="text-white fw-bold text-center mb-2">
          Find Any <span style={{ color: "#e50914" }}>Movie</span> In Theatres
        </h2>
        <p className="text-secondary small text-center mb-3">
          Explore by title, star cast, language, runtime, or screening status
        </p>

        {/* Search Input */}
        <form onSubmit={handleSearchSubmit}>
          <div className="position-relative mb-3">
            <i
              className="fa-solid fa-magnifying-glass position-absolute start-0 top-50 translate-middle-y ms-3 fs-5"
              style={{ color: "#333333" }}
            ></i>
            <input
              type="text"
              className="form-control"
              placeholder="Search by movie title, actor, director or genre..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onBlur={handleSearchSubmit}
              autoFocus
              style={{
                backgroundColor: "#ffffff",
                color: "#000000",
                fontWeight: "600",
                fontSize: "1.05rem",
                borderRadius: "14px",
                padding: "16px 20px 16px 48px",
                border: "3px solid #e50914",
                boxShadow: "0 0 20px rgba(229, 9, 20, 0.35)",
                outline: "none",
              }}
            />
          </div>
        </form>

        {/* Popular & Recent Searches Chips */}
        <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
          <span className="text-secondary small fw-bold">Popular:</span>
          {POPULAR_SEARCHES.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => handleSelectSearchTag(tag)}
              className="btn btn-sm btn-secondary-cinema py-1 px-2 rounded-pill"
              style={{ fontSize: "0.72rem" }}
            >
              {tag}
            </button>
          ))}
          {searchHistory.length > 0 && (
            <>
              <span className="text-secondary small fw-bold ms-2">Recent:</span>
              {searchHistory.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => handleSelectSearchTag(item)}
                  className="btn btn-sm btn-outline-secondary py-1 px-2 rounded-pill text-light"
                  style={{ fontSize: "0.72rem" }}
                >
                  <i className="fa-solid fa-clock-rotate-left me-1"></i>
                  {item}
                </button>
              ))}
            </>
          )}
        </div>

        {/* Filter Controls Bar */}
        <div className="row g-2">
          {/* City Dropdown */}
          <div className="col-6 col-md-3">
            <select
              className="form-select cinema-input"
              value={selectedCity || ""}
              onChange={(e) => setSelectedCity(e.target.value)}
              title="Filter by City"
            >
              <option value="">All Cities / India</option>
              {(cities || []).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Genre Dropdown */}
          <div className="col-6 col-md-3">
            <select
              className="form-select cinema-input"
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
            >
              <option value="All">All Genres</option>
              {genreOptions.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          {/* Language Dropdown */}
          <div className="col-6 col-md-2">
            <select
              className="form-select cinema-input"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              <option value="All">All Languages</option>
              {languageOptions.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>

          {/* Movie Format Dropdown */}
          <div className="col-6 col-md-2">
            <select
              className="form-select cinema-input"
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              title="Experience Format"
            >
              <option value="All">All Formats</option>
              <option value="2D">2D</option>
              <option value="3D">3D</option>
              <option value="IMAX">IMAX</option>
              <option value="4DX">4DX</option>
              <option value="Dolby Atmos">Dolby Atmos</option>
            </select>
          </div>

          {/* Status Dropdown */}
          <div className="col-6 col-md-2">
            <select
              className="form-select cinema-input"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="All">All Statuses</option>
              <option value="Now Showing">Now Showing</option>
              <option value="Advance Booking">Advance Booking</option>
              <option value="Coming Soon">Coming Soon</option>
              <option value="Ended">Ended (Closed)</option>
            </select>
          </div>

          {/* Min Rating Dropdown */}
          <div className="col-6 col-md-2">
            <select
              className="form-select cinema-input"
              value={minRating}
              onChange={(e) => setMinRating(e.target.value)}
              title="Minimum IMDb Rating"
            >
              <option value="0">All Ratings</option>
              <option value="8">8.0+ Stars</option>
              <option value="7">7.0+ Stars</option>
              <option value="6">6.0+ Stars</option>
            </select>
          </div>

          {/* Sort By Dropdown */}
          <div className="col-6 col-md-2">
            <select
              className="form-select cinema-input"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="rating">Sort: Top Rated</option>
              <option value="name">Sort: Name (A-Z)</option>
              <option value="date">Sort: Release Date</option>
              <option value="duration">Sort: Runtime</option>
            </select>
          </div>
        </div>

        {/* Active Filter Chips */}
        {(selectedCity || genre !== "All" || language !== "All" || status !== "All" || format !== "All" || minRating !== "0" || query) && (
          <div className="d-flex flex-wrap align-items-center gap-2 mt-3 pt-2 border-top border-secondary border-opacity-25">
            <span className="text-secondary small fw-bold">Active:</span>
            {selectedCity && (
              <span className="badge bg-danger d-flex align-items-center gap-1">
                <i className="fa-solid fa-location-dot small"></i> {selectedCity}
                <button
                  type="button"
                  className="btn btn-sm btn-link text-white p-0 ms-1"
                  onClick={() => setSelectedCity("")}
                  style={{ textDecoration: "none", fontSize: "0.75rem" }}
                >
                  &times;
                </button>
              </span>
            )}
            {genre !== "All" && (
              <span className="badge bg-secondary d-flex align-items-center gap-1">
                {genre}
                <button
                  type="button"
                  className="btn btn-sm btn-link text-white p-0 ms-1"
                  onClick={() => setGenre("All")}
                  style={{ textDecoration: "none", fontSize: "0.75rem" }}
                >
                  &times;
                </button>
              </span>
            )}
            {language !== "All" && (
              <span className="badge bg-secondary d-flex align-items-center gap-1">
                {language}
                <button
                  type="button"
                  className="btn btn-sm btn-link text-white p-0 ms-1"
                  onClick={() => setLanguage("All")}
                  style={{ textDecoration: "none", fontSize: "0.75rem" }}
                >
                  &times;
                </button>
              </span>
            )}
            {format !== "All" && (
              <span className="badge bg-primary d-flex align-items-center gap-1">
                {format}
                <button
                  type="button"
                  className="btn btn-sm btn-link text-white p-0 ms-1"
                  onClick={() => setFormat("All")}
                  style={{ textDecoration: "none", fontSize: "0.75rem" }}
                >
                  &times;
                </button>
              </span>
            )}
            {status !== "All" && (
              <span className="badge bg-warning text-dark d-flex align-items-center gap-1">
                {status}
                <button
                  type="button"
                  className="btn btn-sm btn-link text-dark p-0 ms-1"
                  onClick={() => setStatus("All")}
                  style={{ textDecoration: "none", fontSize: "0.75rem" }}
                >
                  &times;
                </button>
              </span>
            )}
            {minRating !== "0" && (
              <span className="badge bg-warning text-dark d-flex align-items-center gap-1">
                ★ {minRating}+
                <button
                  type="button"
                  className="btn btn-sm btn-link text-dark p-0 ms-1"
                  onClick={() => setMinRating("0")}
                  style={{ textDecoration: "none", fontSize: "0.75rem" }}
                >
                  &times;
                </button>
              </span>
            )}
            {query && (
              <span className="badge bg-dark border border-secondary d-flex align-items-center gap-1">
                "{query}"
                <button
                  type="button"
                  className="btn btn-sm btn-link text-white p-0 ms-1"
                  onClick={() => setQuery("")}
                  style={{ textDecoration: "none", fontSize: "0.75rem" }}
                >
                  &times;
                </button>
              </span>
            )}
            <button
              onClick={clearFilters}
              className="btn btn-sm btn-link text-danger text-decoration-none p-0 ms-auto fw-semibold small"
            >
              <i className="fa-solid fa-rotate-left me-1"></i> Clear All
            </button>
          </div>
        )}
      </div>

      {/* Result Metrics Strip */}
      <div
        style={{
          marginTop: "32px",
          borderTop: "1px dashed rgba(255, 255, 255, 0.15)",
          paddingTop: "16px",
          marginBottom: "24px",
        }}
      >
        <div className="d-flex justify-content-between align-items-center">
          <span className="text-secondary small fw-bold text-uppercase">
            Search Results ({filteredMovies.length} movies)
          </span>
          <button onClick={clearFilters} className="btn btn-sm btn-secondary-cinema">
            <i className="fa-solid fa-rotate-left me-1"></i> Clear Filters
          </button>
        </div>
      </div>

      {error && <p className="text-danger text-center">{error}</p>}

      {!error && filteredMovies.length === 0 ? (
        <EmptyState
          icon="fa-solid fa-film"
          title="No Movies Match Your Search Criteria"
          message="Try adjusting your search keywords, clearing status filters, or choosing All Genres."
          actionLabel="Reset All Filters"
          onAction={clearFilters}
        />
      ) : (
        <>
          <div className="d-flex flex-wrap gap-3 justify-content-center justify-content-md-start pb-4">
            {filteredMovies.slice(0, visible).map((movie) => (
              <MovieCard key={movie._id || movie.movieId || movie.id} movie={movie} />
            ))}
          </div>

          {visible < filteredMovies.length && (
            <div className="text-center pb-5">
              <button
                onClick={() => setVisible(visible + PAGE_SIZE)}
                className="btn btn-cinema px-5 py-2"
              >
                Show More Movies
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
