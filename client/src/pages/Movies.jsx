// client/src/pages/Movies.jsx
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import api from "../services/api";
import MovieCard from "../components/MovieCard";
import LoadingSpinner from "../components/LoadingSpinner";
import EmptyState from "../components/EmptyState";
import { useAuth } from "../hooks/useAuth";
import { useCity } from "../hooks/useCity";
import { buildDiscoveryCategories, CATEGORY_DEFINITIONS } from "../utils/categoryHelper";
import { getMovieFormats } from "../utils/tmdbHelper";

// Showcase Row Component with Smooth Scrolling Controls
const DiscoveryRow = ({ category, onSelectCategory, onToggleFavourite, favourites }) => {
  const rowRef = useRef(null);

  const scroll = (direction) => {
    if (rowRef.current) {
      const offset = direction === "left" ? -400 : 400;
      rowRef.current.scrollBy({ left: offset, behavior: "smooth" });
    }
  };

  if (!category.movies || category.movies.length === 0) return null;

  return (
    <section className="mb-5">
      {/* Category Header */}
      <div className="d-flex justify-content-between align-items-end mb-3 flex-wrap gap-2">
        <div>
          <div className="d-flex align-items-center gap-2 mb-1">
            <h3 className="text-white fw-bold mb-0 fs-4">{category.title}</h3>
            <span className={`badge ${category.badgeColor || "bg-danger"} small px-2 py-1`}>
              {category.badge}
            </span>
            <span className="badge bg-secondary bg-opacity-25 text-secondary border border-secondary border-opacity-25 small">
              {category.movies.length} {category.movies.length === 1 ? "Movie" : "Movies"}
            </span>
          </div>
          <p className="text-secondary small mb-0">{category.subtitle}</p>
        </div>

        {/* View All & Horizontal Scroll Controls */}
        <div className="d-flex align-items-center gap-2">
          <button
            onClick={() => onSelectCategory(category.id)}
            className="btn btn-sm btn-link text-danger fw-bold text-decoration-none p-0 me-2"
            style={{ fontSize: "0.85rem" }}
          >
            View All ({category.movies.length}) <i className="fa-solid fa-arrow-right small ms-1"></i>
          </button>
          <button
            type="button"
            onClick={() => scroll("left")}
            className="btn btn-sm btn-secondary-cinema rounded-circle d-flex align-items-center justify-content-center p-0"
            style={{ width: "32px", height: "32px" }}
            title="Scroll Left"
          >
            <i className="fa-solid fa-chevron-left small"></i>
          </button>
          <button
            type="button"
            onClick={() => scroll("right")}
            className="btn btn-sm btn-secondary-cinema rounded-circle d-flex align-items-center justify-content-center p-0"
            style={{ width: "32px", height: "32px" }}
            title="Scroll Right"
          >
            <i className="fa-solid fa-chevron-right small"></i>
          </button>
        </div>
      </div>

      {/* Horizontal Carousel Row */}
      <div
        ref={rowRef}
        className="d-flex gap-3 overflow-x-auto pb-2"
        style={{
          scrollBehavior: "smooth",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        {category.movies.map((movie) => (
          <div
            key={movie._id || movie.movieId || movie.id}
            style={{ flex: "0 0 auto", width: "190px" }}
          >
            <MovieCard
              movie={movie}
              onToggleFavourite={onToggleFavourite}
              isFavourite={favourites.has(movie._id || movie.movieId || movie.id)}
            />
          </div>
        ))}
      </div>
    </section>
  );
};

const Movies = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlStatus = searchParams.get("status");
  const urlCategory = searchParams.get("category");

  const { selectedCity, setSelectedCity, cities } = useCity();

  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);

  // Active Category Tab ("all" shows showcase rows; any category id shows focused grid)
  const [activeCategoryTab, setActiveCategoryTab] = useState(() => {
    if (urlCategory) return urlCategory;
    if (urlStatus) {
      const match = urlStatus.toLowerCase().replace(/ /g, "_");
      return match;
    }
    return "all";
  });

  // Multi-facet filters
  const [search, setSearch] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("All");
  const [selectedLanguage, setSelectedLanguage] = useState("All");
  const [selectedFormat, setSelectedFormat] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [selectedRating, setSelectedRating] = useState("0");
  const [selectedYear, setSelectedYear] = useState("All");
  const [selectedCert, setSelectedCert] = useState("All");
  const [sortBy, setSortBy] = useState("rating");
  const [favourites, setFavourites] = useState(new Set());

  const { user } = useAuth();
  const navigate = useNavigate();

  const fetchMovies = useCallback(async () => {
    try {
      setLoading(true);
      const endpoint =
        selectedCity && selectedCity !== "All"
          ? `/api/movies?city=${encodeURIComponent(selectedCity)}`
          : "/api/movies";
      const res = await api.get(endpoint);
      const fetched = Array.isArray(res.data) ? res.data : [];
      setMovies(fetched);
    } catch {
      setMovies([]);
    } finally {
      setLoading(false);
    }
  }, [selectedCity]);

  const fetchFavourites = useCallback(async () => {
    try {
      const res = await api.get("/api/users/favourites");
      const favSet = new Set(res.data.map((f) => (f.movie ? f.movie._id : f.movie)));
      setFavourites(favSet);
    } catch {
      // Ignore if server unreachable
    }
  }, []);

  useEffect(() => {
    if (urlCategory) {
      setActiveCategoryTab(urlCategory);
    } else if (urlStatus) {
      const match = urlStatus.toLowerCase().replace(/ /g, "_");
      setActiveCategoryTab(match);
      if (match === "now_showing") setSelectedStatus("Now Showing");
      else if (match === "advance_booking") setSelectedStatus("Advance Booking");
      else if (match === "coming_soon") setSelectedStatus("Coming Soon");
    }
  }, [urlCategory, urlStatus]);

  useEffect(() => {
    fetchMovies();
    if (user) fetchFavourites();
  }, [user, fetchMovies, fetchFavourites]);

  const handleToggleFavourite = async (movieId) => {
    if (!user) {
      navigate("/login");
      return;
    }
    try {
      if (favourites.has(movieId)) {
        await api.delete(`/api/users/favourites/${movieId}`);
        setFavourites((prev) => {
          const next = new Set(prev);
          next.delete(movieId);
          return next;
        });
      } else {
        await api.post(`/api/users/favourites/${movieId}`);
        setFavourites((prev) => new Set(prev).add(movieId));
      }
    } catch {
      // Toggle failure handled silently
    }
  };

  // Build the 18 dynamic categories reactively
  const discoveryCategories = useMemo(() => {
    return buildDiscoveryCategories(movies, selectedCity);
  }, [movies, selectedCity]);

  // Current category in focused grid mode
  const currentCategoryObj = useMemo(() => {
    if (activeCategoryTab === "all") return null;
    return discoveryCategories.find((c) => c.id === activeCategoryTab) || discoveryCategories[0];
  }, [discoveryCategories, activeCategoryTab]);

  // Check if any filter is actively engaged
  const isFilterActive = useMemo(() => {
    return (
      Boolean(search.trim()) ||
      selectedGenre !== "All" ||
      selectedLanguage !== "All" ||
      selectedFormat !== "All" ||
      selectedStatus !== "All" ||
      selectedRating !== "0" ||
      selectedYear !== "All" ||
      selectedCert !== "All" ||
      activeCategoryTab !== "all"
    );
  }, [
    search,
    selectedGenre,
    selectedLanguage,
    selectedFormat,
    selectedStatus,
    selectedRating,
    selectedYear,
    selectedCert,
    activeCategoryTab,
  ]);

  // Movies to display in filtered grid mode, combining all multi-facet filters
  const gridMovies = useMemo(() => {
    const baseList = currentCategoryObj ? currentCategoryObj.movies : movies;

    return baseList
      .filter((m) => {
        // Keyword Search with phonetic and vowel tolerance
        const q = search.toLowerCase().trim();
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

        const mTitle = String(m.title || m.movieName || "").toLowerCase();
        const mDirector = String(m.director || "").toLowerCase();
        const mDesc = String(m.description || "").toLowerCase();
        const mCast = Array.isArray(m.cast) ? m.cast.map(c => String(c).toLowerCase()) : [];

        const qTokens = q.split(/[\s:,\-_]+/).filter(Boolean);
        const matchSearch =
          !q ||
          fuzzyMatch(mTitle, q) ||
          fuzzyMatch(mDirector, q) ||
          fuzzyMatch(mDesc, q) ||
          mCast.some((c) => fuzzyMatch(c, q)) ||
          (qTokens.length > 1 &&
            qTokens.every(
              (tok) =>
                fuzzyMatch(mTitle, tok) ||
                fuzzyMatch(mDirector, tok) ||
                fuzzyMatch(mDesc, tok) ||
                mCast.some((c) => fuzzyMatch(c, tok))
            ));

        // Genre
        const movieGenres = (m.genre || m.genres || []).map((g) => g.toLowerCase());
        const matchGenre =
          selectedGenre === "All" || movieGenres.some((g) => g.includes(selectedGenre.toLowerCase()));

        // Language with bilingual mapping (hi/hindi, en/english, etc.)
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
        const lang = (m.language || "").toLowerCase().trim();
        let matchLang = true;
        if (selectedLanguage !== "All") {
          const lTarget = selectedLanguage.toLowerCase().trim();
          const allowed = langMap[lTarget] || [lTarget];
          matchLang = allowed.includes(lang) || lang.includes(lTarget);
        }

        // Format
        const formats = getMovieFormats(m);
        const matchFormat = selectedFormat === "All" || formats.includes(selectedFormat);

        // Status
        let matchStatus = true;
        if (selectedStatus !== "All") {
          const s = String(m.computedStatus || m.theatricalStatus || "").toLowerCase();
          if (selectedStatus === "Now Showing") {
            matchStatus = s === "now showing" || s === "now_playing";
            if (selectedCity && selectedCity !== "All" && m.isScreeningInCity !== undefined) {
              matchStatus = matchStatus && m.isScreeningInCity;
            }
          } else if (selectedStatus === "Advance Booking") {
            matchStatus = s === "advance booking" || (m.isAdvanceBooking && s !== "now showing");
          } else if (selectedStatus === "Coming Soon") {
            matchStatus = (s === "coming soon" || s === "upcoming") && !m.isAdvanceBooking && s !== "now showing";
          } else if (selectedStatus === "Ended") {
            matchStatus = s === "ended";
          }
        }

        // Minimum Rating
        const ratingVal = Number(m.rating) || 0;
        const matchRating = selectedRating === "0" || ratingVal >= Number(selectedRating);

        // Release Year
        let matchYear = true;
        if (selectedYear !== "All" && m.releaseDate) {
          const yr = new Date(m.releaseDate).getFullYear();
          if (selectedYear === "2022 & Earlier") {
            matchYear = yr <= 2022;
          } else {
            matchYear = yr === Number(selectedYear);
          }
        }

        // Certification
        const cert = (m.certification || "U/A").toUpperCase();
        const matchCert = selectedCert === "All" || cert === selectedCert.toUpperCase();

        return (
          matchSearch &&
          matchGenre &&
          matchLang &&
          matchFormat &&
          matchStatus &&
          matchRating &&
          matchYear &&
          matchCert
        );
      })
      .sort((a, b) => {
        if (search && search.trim()) {
          const q = search.trim().toLowerCase();
          const tA = (a.title || a.movieName || "").toLowerCase();
          const tB = (b.title || b.movieName || "").toLowerCase();
          const exactA = tA === q ? 1 : 0;
          const exactB = tB === q ? 1 : 0;
          if (exactA !== exactB) return exactB - exactA;
          const startsA = tA.startsWith(q) ? 1 : 0;
          const startsB = tB.startsWith(q) ? 1 : 0;
          if (startsA !== startsB) return startsB - startsA;
        }

        if (sortBy === "rating") return (Number(b.rating) || 0) - (Number(a.rating) || 0);
        if (sortBy === "popularity") {
          const popA = Number(a.popularity) || (Number(a.rating) || 0) * 10;
          const popB = Number(b.popularity) || (Number(b.rating) || 0) * 10;
          return popB - popA;
        }
        if (sortBy === "title")
          return (a.title || a.movieName || "").localeCompare(b.title || b.movieName || "");
        if (sortBy === "newest") {
          const da = a.releaseDate ? new Date(a.releaseDate).getTime() : 0;
          const db = b.releaseDate ? new Date(b.releaseDate).getTime() : 0;
          return db - da;
        }
        if (sortBy === "duration") return (b.duration || b.runtime || 0) - (a.duration || a.runtime || 0);
        return 0;
      });
  }, [
    currentCategoryObj,
    movies,
    search,
    selectedGenre,
    selectedLanguage,
    selectedFormat,
    selectedStatus,
    selectedRating,
    selectedYear,
    selectedCert,
    sortBy,
    selectedCity,
  ]);

  const genres = [
    "All",
    "Action",
    "Adventure",
    "Comedy",
    "Drama",
    "Horror",
    "Sci-Fi",
    "Thriller",
    "Romance",
    "Animation",
    "Fantasy",
    "Mystery",
    "Crime",
    "Family",
    "Biography",
    "History",
  ];

  const languages = [
    "All",
    "Hindi",
    "English",
    "Tamil",
    "Telugu",
    "Malayalam",
    "Kannada",
    "Marathi",
    "Bengali",
    "Punjabi",
  ];

  const years = ["All", "2026", "2025", "2024", "2023", "2022 & Earlier"];
  const certifications = ["All", "U", "U/A", "A"];
  const formatsList = ["All", "2D", "3D", "IMAX", "4DX", "Dolby Atmos"];

  const handleResetFilters = () => {
    setSearch("");
    setSelectedGenre("All");
    setSelectedLanguage("All");
    setSelectedFormat("All");
    setSelectedStatus("All");
    setSelectedRating("0");
    setSelectedYear("All");
    setSelectedCert("All");
    setSortBy("rating");
    setActiveCategoryTab("all");
    setSearchParams({});
  };

  const handleTabChange = (tabId) => {
    setActiveCategoryTab(tabId);
    if (tabId === "all") {
      handleResetFilters();
    } else {
      setSearchParams({ category: tabId });
    }
  };

  if (loading) return <LoadingSpinner message="Curating real-world cinema categories..." />;

  return (
    <div className="container py-4 fade-in" style={{ maxWidth: "1320px" }}>
      {/* Title Header */}
      <div className="text-center mb-4">
        <h1 className="text-white fw-bold mb-2">
          Explore <span style={{ color: "#e50914" }}>Cinema</span> Categories
        </h1>
        <p className="text-secondary small">
          {selectedCity && selectedCity !== "All" ? (
            <>
              Dynamic real-world discovery synchronized across <strong>{selectedCity}</strong> multiplexes
            </>
          ) : (
            <>Dynamic real-world discovery synchronized across premier cinema multiplexes</>
          )}
        </p>
      </div>

      {/* Universal Cinema Multi-Facet Filter Bar */}
      <div className="glass-panel p-3 mb-4">
        <div className="row g-2 align-items-center">
          {/* Search Box */}
          <div className="col-12 col-md-3">
            <div className="position-relative">
              <i className="fa-solid fa-magnifying-glass position-absolute top-50 start-0 translate-middle-y ms-3 text-secondary small"></i>
              <input
                type="text"
                className="form-control cinema-input ps-5 pe-3 py-2"
                placeholder="Search movies, cast, director..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ fontSize: "0.82rem" }}
              />
            </div>
          </div>

          {/* City Selector */}
          <div className="col-6 col-md-2">
            <select
              className="form-select cinema-input py-2 px-2"
              value={selectedCity || ""}
              onChange={(e) => setSelectedCity(e.target.value)}
              style={{ fontSize: "0.82rem" }}
              title="City Selection"
            >
              <option value="">All Cities / India</option>
              {(cities || []).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Genre Dropdown */}
          <div className="col-6 col-md-2">
            <select
              className="form-select cinema-input py-2 px-2"
              value={selectedGenre}
              onChange={(e) => setSelectedGenre(e.target.value)}
              style={{ fontSize: "0.82rem" }}
            >
              {genres.map((g) => (
                <option key={g} value={g}>
                  {g === "All" ? "All Genres" : g}
                </option>
              ))}
            </select>
          </div>

          {/* Language Dropdown */}
          <div className="col-6 col-md-2">
            <select
              className="form-select cinema-input py-2 px-2"
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              style={{ fontSize: "0.82rem" }}
            >
              {languages.map((l) => (
                <option key={l} value={l}>
                  {l === "All" ? "All Languages" : l}
                </option>
              ))}
            </select>
          </div>

          {/* Movie Format Dropdown */}
          <div className="col-6 col-md-1">
            <select
              className="form-select cinema-input py-2 px-2"
              value={selectedFormat}
              onChange={(e) => setSelectedFormat(e.target.value)}
              style={{ fontSize: "0.82rem" }}
              title="Movie Experience Format"
            >
              <option value="All">Format</option>
              {formatsList.filter(f => f !== "All").map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>

          {/* Status Dropdown */}
          <div className="col-6 col-md-2">
            <select
              className="form-select cinema-input py-2 px-2"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              style={{ fontSize: "0.82rem" }}
            >
              <option value="All">All Statuses</option>
              <option value="Now Showing">Now Showing</option>
              <option value="Advance Booking">Advance Booking</option>
              <option value="Coming Soon">Coming Soon</option>
            </select>
          </div>

          {/* Min Rating Dropdown */}
          <div className="col-6 col-md-2">
            <select
              className="form-select cinema-input py-2 px-2"
              value={selectedRating}
              onChange={(e) => setSelectedRating(e.target.value)}
              style={{ fontSize: "0.82rem" }}
              title="Minimum IMDb Rating"
            >
              <option value="0">All Ratings</option>
              <option value="8">★ 8.0+ Stars</option>
              <option value="7">★ 7.0+ Stars</option>
              <option value="6">★ 6.0+ Stars</option>
            </select>
          </div>

          {/* Sort By Dropdown */}
          <div className="col-6 col-md-2">
            <select
              className="form-select cinema-input py-2 px-2"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{ fontSize: "0.82rem" }}
            >
              <option value="rating">Top Rated</option>
              <option value="popularity">Most Popular</option>
              <option value="newest">Release Date</option>
              <option value="title">Alphabetical (A-Z)</option>
              <option value="duration">Runtime Length</option>
            </select>
          </div>

          {/* Year Dropdown */}
          <div className="col-6 col-md-2">
            <select
              className="form-select cinema-input py-2 px-2"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              style={{ fontSize: "0.82rem" }}
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y === "All" ? "All Years" : `Year: ${y}`}
                </option>
              ))}
            </select>
          </div>

          {/* Cert Dropdown */}
          <div className="col-6 col-md-2">
            <select
              className="form-select cinema-input py-2 px-2"
              value={selectedCert}
              onChange={(e) => setSelectedCert(e.target.value)}
              style={{ fontSize: "0.82rem" }}
            >
              {certifications.map((c) => (
                <option key={c} value={c}>
                  {c === "All" ? "All Certs" : `Cert: ${c}`}
                </option>
              ))}
            </select>
          </div>

          {/* Reset Filters Button */}
          <div className="col-12 col-md-2 d-flex justify-content-end">
            <button
              onClick={handleResetFilters}
              className="btn btn-sm btn-secondary-cinema w-100 py-2 d-flex align-items-center justify-content-center gap-1"
              style={{ fontSize: "0.82rem" }}
            >
              <i className="fa-solid fa-rotate-left"></i>
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Active Filter Tags Strip */}
        {isFilterActive && (
          <div className="d-flex flex-wrap align-items-center gap-2 pt-2 mt-2 border-top border-secondary border-opacity-25">
            <span className="text-secondary small fw-bold">Active Filters:</span>
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
            {selectedGenre !== "All" && (
              <span className="badge bg-secondary d-flex align-items-center gap-1">
                {selectedGenre}
                <button
                  type="button"
                  className="btn btn-sm btn-link text-white p-0 ms-1"
                  onClick={() => setSelectedGenre("All")}
                  style={{ textDecoration: "none", fontSize: "0.75rem" }}
                >
                  &times;
                </button>
              </span>
            )}
            {selectedLanguage !== "All" && (
              <span className="badge bg-secondary d-flex align-items-center gap-1">
                {selectedLanguage}
                <button
                  type="button"
                  className="btn btn-sm btn-link text-white p-0 ms-1"
                  onClick={() => setSelectedLanguage("All")}
                  style={{ textDecoration: "none", fontSize: "0.75rem" }}
                >
                  &times;
                </button>
              </span>
            )}
            {selectedFormat !== "All" && (
              <span className="badge bg-primary d-flex align-items-center gap-1">
                {selectedFormat}
                <button
                  type="button"
                  className="btn btn-sm btn-link text-white p-0 ms-1"
                  onClick={() => setSelectedFormat("All")}
                  style={{ textDecoration: "none", fontSize: "0.75rem" }}
                >
                  &times;
                </button>
              </span>
            )}
            {selectedStatus !== "All" && (
              <span className="badge bg-warning text-dark d-flex align-items-center gap-1">
                {selectedStatus}
                <button
                  type="button"
                  className="btn btn-sm btn-link text-dark p-0 ms-1"
                  onClick={() => setSelectedStatus("All")}
                  style={{ textDecoration: "none", fontSize: "0.75rem" }}
                >
                  &times;
                </button>
              </span>
            )}
            {selectedRating !== "0" && (
              <span className="badge bg-warning text-dark d-flex align-items-center gap-1">
                ★ {selectedRating}.0+
                <button
                  type="button"
                  className="btn btn-sm btn-link text-dark p-0 ms-1"
                  onClick={() => setSelectedRating("0")}
                  style={{ textDecoration: "none", fontSize: "0.75rem" }}
                >
                  &times;
                </button>
              </span>
            )}
            {search && (
              <span className="badge bg-dark border border-secondary d-flex align-items-center gap-1">
                "{search}"
                <button
                  type="button"
                  className="btn btn-sm btn-link text-white p-0 ms-1"
                  onClick={() => setSearch("")}
                  style={{ textDecoration: "none", fontSize: "0.75rem" }}
                >
                  &times;
                </button>
              </span>
            )}
            {activeCategoryTab !== "all" && currentCategoryObj && (
              <span className="badge bg-danger d-flex align-items-center gap-1">
                Category: {currentCategoryObj.title}
                <button
                  type="button"
                  className="btn btn-sm btn-link text-white p-0 ms-1"
                  onClick={() => handleTabChange("all")}
                  style={{ textDecoration: "none", fontSize: "0.75rem" }}
                >
                  &times;
                </button>
              </span>
            )}
            <button
              onClick={handleResetFilters}
              className="btn btn-sm btn-link text-danger text-decoration-none p-0 ms-auto fw-semibold small"
            >
              <i className="fa-solid fa-rotate-left me-1"></i> Clear All
            </button>
          </div>
        )}
      </div>

      {/* Dynamic Category Navigation Pills Bar (Horizontal Scrollable) */}
      <div className="d-flex align-items-center gap-2 overflow-x-auto pb-3 mb-4 scrollbar-none">
        <button
          type="button"
          onClick={() => handleTabChange("all")}
          className={`btn btn-sm px-3 rounded-pill fw-semibold text-nowrap d-flex align-items-center gap-1 ${activeCategoryTab === "all" ? "btn-cinema shadow-sm" : "btn-secondary-cinema text-secondary"
            }`}
          style={{ fontSize: "0.82rem" }}
        >
          <i className="fa-solid fa-layer-group text-danger"></i>
          <span>Showcase Rows</span>
        </button>

        {CATEGORY_DEFINITIONS.map((def) => {
          const isActive = activeCategoryTab === def.id;
          return (
            <button
              key={def.id}
              type="button"
              onClick={() => handleTabChange(def.id)}
              className={`btn btn-sm px-3 rounded-pill fw-semibold text-nowrap d-flex align-items-center gap-1 ${isActive ? "btn-cinema shadow-sm" : "btn-secondary-cinema text-secondary"
                }`}
              style={{ fontSize: "0.82rem" }}
            >
              <i className={def.icon}></i>
              <span>{def.label}</span>
            </button>
          );
        })}
      </div>

      {/* VIEW SELECTION: SHOWCASE ROWS vs FILTERED GRID */}
      {!isFilterActive && activeCategoryTab === "all" ? (
        /* VIEW MODE 1: ALL SHOWCASE ROWS */
        <div>
          {discoveryCategories.map((cat) => (
            <DiscoveryRow
              key={cat.id}
              category={cat}
              onSelectCategory={handleTabChange}
              onToggleFavourite={handleToggleFavourite}
              favourites={favourites}
            />
          ))}
        </div>
      ) : (
        /* VIEW MODE 2: FILTERED MOVIES GRID */
        <div>
          {/* Active Banner */}
          <div className="glass-panel p-3 mb-4 d-flex justify-content-between align-items-center flex-wrap gap-2">
            <div>
              <div className="d-flex align-items-center gap-2">
                <h2 className="text-white fw-bold mb-0 fs-4">
                  {currentCategoryObj ? currentCategoryObj.title : "Filtered Results"}
                </h2>
                <span className="badge bg-danger">
                  {gridMovies.length} {gridMovies.length === 1 ? "Movie" : "Movies"}
                </span>
                {selectedCity && (
                  <span className="badge bg-secondary">
                    <i className="fa-solid fa-location-dot me-1"></i>
                    {selectedCity}
                  </span>
                )}
              </div>
              <p className="text-secondary small mb-0 mt-1">
                {currentCategoryObj ? currentCategoryObj.subtitle : "Multi-facet filtered movie catalogue"}
              </p>
            </div>

            <button
              onClick={handleResetFilters}
              className="btn btn-sm btn-secondary-cinema d-flex align-items-center gap-2 px-3 py-2 fw-semibold"
              style={{ fontSize: "0.82rem" }}
            >
              <i className="fa-solid fa-arrow-left"></i>
              <span>Back to Showcase Rows</span>
            </button>
          </div>

          {/* Grid of Movie Cards */}
          {gridMovies.length === 0 ? (
            <EmptyState
              icon="fa-solid fa-clapperboard"
              title="No Movies Match Your Filter Criteria"
              message="No titles in the catalogue match your selected combination of genre, language, format, rating, or status."
              actionLabel="Reset All Filters"
              onAction={handleResetFilters}
            />
          ) : (
            <div className="row row-cols-2 row-cols-sm-3 row-cols-md-4 row-cols-lg-5 row-cols-xl-6 g-3">
              {gridMovies.map((movie) => (
                <div key={movie._id || movie.movieId || movie.id} className="col d-flex justify-content-center">
                  <MovieCard
                    movie={movie}
                    onToggleFavourite={handleToggleFavourite}
                    isFavourite={favourites.has(movie._id || movie.movieId || movie.id)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Movies;
