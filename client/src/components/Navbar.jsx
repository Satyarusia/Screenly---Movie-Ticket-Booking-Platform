// client/src/components/Navbar.jsx
import { useState, useEffect, useRef, useMemo } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useCity } from "../hooks/useCity";
import api from "../services/api";
import { getPosterUrl, getMovieTitle, getMovieRating, createTitlePosterSvg } from "../utils/tmdbHelper";

export default function Navbar() {
  const { user, isAdmin, logout } = useAuth();
  const { selectedCity, openCityModal } = useCity();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [allMovies, setAllMovies] = useState([]);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    let isMounted = true;
    api
      .get("/api/movies")
      .then((res) => {
        if (isMounted) {
          setAllMovies(Array.isArray(res.data) ? res.data : []);
        }
      })
      .catch(() => {
        if (isMounted) setAllMovies([]);
      });

    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setIsInputFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      isMounted = false;
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Instant autocomplete filter derived cleanly via useMemo (zero cascading effect renders)
  const suggestions = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (q.length < 2) return [];

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

    const qTokens = q.split(/[\s:,\-_]+/).filter(Boolean);
    return allMovies
      .filter((m) => {
        const t = getMovieTitle(m).toLowerCase();
        const cast = Array.isArray(m.cast) ? m.cast.map((c) => String(c).toLowerCase()) : [];
        const dir = String(m.director || "").toLowerCase();
        return (
          fuzzyMatch(t, q) ||
          fuzzyMatch(dir, q) ||
          cast.some((c) => fuzzyMatch(c, q)) ||
          (qTokens.length > 1 &&
            qTokens.every(
              (tok) =>
                fuzzyMatch(t, tok) ||
                fuzzyMatch(dir, tok) ||
                cast.some((c) => fuzzyMatch(c, tok))
            ))
        );
      })
      .sort((a, b) => {
        const tA = getMovieTitle(a).toLowerCase();
        const tB = getMovieTitle(b).toLowerCase();
        const exactA = tA === q ? 1 : 0;
        const exactB = tB === q ? 1 : 0;
        if (exactA !== exactB) return exactB - exactA;
        const startsA = tA.startsWith(q) ? 1 : 0;
        const startsB = tB.startsWith(q) ? 1 : 0;
        if (startsA !== startsB) return startsB - startsA;
        return (Number(b.rating) || 0) - (Number(a.rating) || 0);
      })
      .slice(0, 6);
  }, [searchTerm, allMovies]);

  const showDropdown = isInputFocused && suggestions.length > 0;

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setIsInputFocused(false);
    navigate(`/search?q=${encodeURIComponent(searchTerm.trim())}`);
  };

  const handleSelectSuggestion = (movie) => {
    setIsInputFocused(false);
    setSearchTerm("");
    navigate(`/movies/${movie._id || movie.movieId || movie.id}`, { state: { movie } });
  };

  const isNavActive = (path, queryKey, queryVal) => {
    if (queryKey && queryVal) {
      return (
        location.pathname === path &&
        new URLSearchParams(location.search).get(queryKey)?.toLowerCase() === queryVal.toLowerCase()
      );
    }
    if (path === "/home") {
      return (location.pathname === "/home" || location.pathname === "/") && !location.search;
    }
    return location.pathname === path && !location.search;
  };

  return (
    <nav
      className="navbar navbar-expand sticky-top py-2"
      style={{
        background: "rgba(10, 11, 18, 0.96)",
        backdropFilter: "blur(18px)",
        borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
        zIndex: 1050,
      }}
    >
      <div className="container-fluid px-3 px-xl-4 d-flex align-items-center justify-content-between">
        {/* Left Side: Brand & Search */}
        <div className="d-flex align-items-center gap-3">
          {/* Brand Logo */}
          <Link to="/home" className="navbar-brand d-flex align-items-center gap-2 m-0 text-decoration-none">
            <div
              className="d-flex align-items-center justify-content-center rounded-3"
              style={{
                width: "36px",
                height: "36px",
                background: "linear-gradient(135deg, #e50914 0%, #8b0000 100%)",
                boxShadow: "0 0 14px rgba(229, 9, 20, 0.6)",
              }}
            >
              <i className="fa-solid fa-film text-white fs-6"></i>
            </div>
            <span
              style={{
                fontFamily: "'Outfit', sans-serif",
                fontSize: "1.7rem",
                fontWeight: "900",
                letterSpacing: "-0.5px",
                lineHeight: "1",
                color: "#ffffff",
                textShadow: "0 0 12px rgba(229, 9, 20, 0.5)",
              }}
            >
              SCREEN<span style={{ color: "#e50914" }}>LY</span>
            </span>
          </Link>

          {/* Quick Search Bar */}
          <div ref={searchRef} className="position-relative d-none d-xxl-block" style={{ width: "230px" }}>
            <form onSubmit={handleSearchSubmit}>
              <div className="position-relative">
                <i
                  className="fa-solid fa-magnifying-glass position-absolute start-0 top-50 translate-middle-y ms-3"
                  style={{ color: "#333333", zIndex: 2, fontSize: "0.8rem" }}
                ></i>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Quick search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onFocus={() => setIsInputFocused(true)}
                  style={{
                    backgroundColor: "#ffffff",
                    color: "#000000",
                    fontWeight: "600",
                    borderRadius: "20px",
                    padding: "6px 14px 6px 32px",
                    border: "2px solid #e50914",
                    fontSize: "0.82rem",
                    outline: "none",
                  }}
                />
              </div>
            </form>

            {/* Autocomplete Dropdown */}
            {showDropdown && (
              <div
                className="position-absolute start-0 w-100 mt-2 rounded-3 shadow-lg overflow-hidden border border-secondary border-opacity-25"
                style={{ backgroundColor: "#151828", zIndex: 1100 }}
              >
                {suggestions.map((m) => (
                  <div
                    key={m._id || m.movieId || m.id}
                    onClick={() => handleSelectSuggestion(m)}
                    className="p-2 d-flex align-items-center gap-2 border-bottom border-secondary border-opacity-10 cursor-pointer"
                    style={{ cursor: "pointer", transition: "background 0.15s" }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(229, 9, 20, 0.15)")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                  >
                    <img
                      src={getPosterUrl(m)}
                      alt={getMovieTitle(m)}
                      style={{ width: "28px", height: "38px", objectFit: "cover", borderRadius: "4px" }}
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = createTitlePosterSvg(getMovieTitle(m));
                      }}
                    />
                    <div className="flex-grow-1 overflow-hidden">
                      <div className="text-white small fw-bold text-truncate" style={{ fontSize: "0.78rem" }}>
                        {getMovieTitle(m)}
                      </div>
                      <div className="text-secondary" style={{ fontSize: "0.68rem" }}>
                        <i className="fa-solid fa-star text-warning me-1" style={{ fontSize: "0.62rem" }}></i>
                        {getMovieRating(m)} &bull; {m.language || "Hindi"}
                        {((m.computedStatus || m.theatricalStatus || "").toLowerCase() === "ended") && (
                          <span className="badge bg-secondary bg-opacity-75 ms-2" style={{ fontSize: "0.6rem" }}>
                            No Longer Playing
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Global City Selector */}
          <div className="position-relative">
            <button
              type="button"
              onClick={() => openCityModal()}
              className="btn btn-sm d-flex align-items-center gap-2 py-1 px-3 rounded-pill"
              style={{
                backgroundColor: selectedCity ? "rgba(229, 9, 20, 0.2)" : "rgba(229, 9, 20, 0.12)",
                border: selectedCity ? "1px solid rgba(229, 9, 20, 0.65)" : "1px solid rgba(229, 9, 20, 0.45)",
                color: "#ffffff",
                fontSize: "0.82rem",
                fontWeight: "600",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
              title={selectedCity ? `Current city: ${selectedCity}. Click to change.` : "Click to select your cinema location"}
            >
              <i className="fa-solid fa-location-dot text-danger"></i>
              <span>{selectedCity || "Select Your Location"}</span>
              <i
                className="fa-solid fa-chevron-down ms-1 text-secondary"
                style={{
                  fontSize: "0.65rem",
                }}
              ></i>
            </button>
          </div>
        </div>

        {/* Full Desktop Navigation Links */}
        <div className="d-flex align-items-center gap-1 gap-xl-2">
          {/* 1. Home */}
          <Link
            to="/home"
            className={`btn btn-sm py-1 px-2 fw-bold text-decoration-none ${
              isNavActive("/home", null, null) ? "text-danger" : "text-light"
            }`}
            style={{ fontSize: "0.85rem" }}
          >
            Home
          </Link>

          {/* 2. Movies */}
          <Link
            to="/movies"
            className={`btn btn-sm py-1 px-2 fw-bold text-decoration-none ${
              isNavActive("/movies", null, null) ? "text-danger" : "text-light"
            }`}
            style={{ fontSize: "0.85rem" }}
          >
            Movies
          </Link>

          {/* 3. Now Showing */}
          <Link
            to="/movies?status=Now%20Showing"
            className={`btn btn-sm py-1 px-2 fw-bold text-decoration-none ${
              isNavActive("/movies", "status", "Now Showing") ? "text-danger" : "text-light"
            }`}
            style={{ fontSize: "0.85rem" }}
          >
            <span className="badge bg-success bg-opacity-25 text-success me-1 p-1" style={{ fontSize: "0.65rem" }}>
              LIVE
            </span>
            Now Showing
          </Link>

          {/* 4. Coming Soon */}
          <Link
            to="/movies?status=Coming%20Soon"
            className={`btn btn-sm py-1 px-2 fw-bold text-decoration-none ${
              isNavActive("/movies", "status", "Coming Soon") ? "text-danger" : "text-light"
            }`}
            style={{ fontSize: "0.85rem" }}
          >
            Coming Soon
          </Link>

          {/* 5. Showtimes */}
          <Link
            to="/shows"
            className={`btn btn-sm py-1 px-2 fw-bold text-decoration-none ${
              isNavActive("/shows", null, null) ? "text-danger" : "text-light"
            }`}
            style={{ fontSize: "0.85rem" }}
          >
            Showtimes
          </Link>

          {/* 6. Theatres */}
          <Link
            to="/theatres"
            className={`btn btn-sm py-1 px-2 fw-bold text-decoration-none ${
              isNavActive("/theatres", null, null) ? "text-danger" : "text-light"
            }`}
            style={{ fontSize: "0.85rem" }}
          >
            Theatres
          </Link>

          {/* 7. My Bookings (Normal Users Only - Hidden for Admins) */}
          {!isAdmin && (
            <Link
              to={user ? "/bookings" : "/login"}
              className={`btn btn-sm py-1 px-2 fw-bold text-decoration-none ${
                location.pathname === "/bookings" || isNavActive("/profile", "tab", "bookings") ? "text-danger" : "text-light"
              }`}
              style={{ fontSize: "0.85rem" }}
            >
              My Bookings
            </Link>
          )}

          {/* 8. Wishlist */}
          <Link
            to={user ? "/profile?tab=favorites" : "/login"}
            className={`btn btn-sm py-1 px-2 fw-bold text-decoration-none ${
              isNavActive("/profile", "tab", "favorites") ? "text-danger" : "text-light"
            }`}
            style={{ fontSize: "0.85rem" }}
          >
            <i className="fa-solid fa-heart text-danger me-1" style={{ fontSize: "0.75rem" }}></i>
            Wishlist
          </Link>

          {/* 9. Profile */}
          <Link
            to={user ? "/profile" : "/login"}
            className={`btn btn-sm py-1 px-2 fw-bold text-decoration-none ${
              location.pathname === "/profile" && !location.search ? "text-danger" : "text-light"
            }`}
            style={{ fontSize: "0.85rem" }}
          >
            Profile
          </Link>

          {/* 10. Admin Dashboard & Show Management (Admin Only) */}
          {isAdmin && (
            <div className="d-flex align-items-center gap-1 ms-1">
              <Link
                to="/admin"
                className="badge bg-danger text-white text-decoration-none py-2 px-2 fw-bold"
                style={{ fontSize: "0.78rem" }}
              >
                <i className="fa-solid fa-shield-halved me-1"></i> Admin
              </Link>
              <Link
                to="/admin/shows"
                className="badge bg-secondary text-white text-decoration-none py-2 px-2 fw-bold"
                style={{ fontSize: "0.78rem" }}
                title="Admin Show Management"
              >
                <i className="fa-solid fa-clock me-1 text-info"></i> Shows
              </Link>
            </div>
          )}
        </div>

        {/* User Auth Buttons / User Pill */}
        <div className="d-flex align-items-center gap-2">
          {user ? (
            <div className="d-flex align-items-center gap-2">
              <Link
                to="/profile"
                className="btn btn-secondary-cinema btn-sm py-1 px-2 d-flex align-items-center gap-1 text-decoration-none"
                style={{ fontSize: "0.82rem" }}
              >
                <i className="fa-solid fa-user text-danger"></i>
                <span className="fw-semibold text-truncate" style={{ maxWidth: "100px" }}>
                  {user.name}
                </span>
              </Link>
              <button
                onClick={logout}
                className="btn btn-outline-danger btn-sm py-1 px-2"
                title="Sign Out"
                style={{ fontSize: "0.8rem" }}
              >
                <i className="fa-solid fa-arrow-right-from-bracket"></i>
              </button>
            </div>
          ) : (
            <div className="d-flex gap-2">
              <Link to="/login" className="btn btn-secondary-cinema btn-sm py-1 px-3 fw-bold" style={{ fontSize: "0.82rem" }}>
                Sign In
              </Link>
              <Link to="/register" className="btn btn-cinema btn-sm py-1 px-3 fw-bold" style={{ fontSize: "0.82rem" }}>
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
