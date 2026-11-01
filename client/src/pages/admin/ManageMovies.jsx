// client/src/pages/admin/ManageMovies.jsx
import { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import api from "../../services/api";
import LoadingSpinner from "../../components/LoadingSpinner";
import ConfirmModal from "../../components/ConfirmModal";
import Pagination from "../../components/Pagination";
import AdminNav from "../../components/AdminNav";
import {
  getPosterUrl,
  createTitlePosterSvg,
  TMDB_CATALOG_PRESETS,
} from "../../utils/tmdbHelper";
import toast from "react-hot-toast";

export default function ManageMovies() {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Search & Pagination for existing cinema catalog
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Template Search / Autofill Selection State
  const [catalogSearch, setCatalogSearch] = useState("");
  const [catalogFilter, setCatalogFilter] = useState("all"); // 'all' | 'database' | 'tmdb'
  const [showCatalogPicker, setShowCatalogPicker] = useState(true);

  // Poster Selection Modal State
  const [posterModalOpen, setPosterModalOpen] = useState(false);
  const [availablePosters, setAvailablePosters] = useState([]);
  const [loadingPosters, setLoadingPosters] = useState(false);
  const [posterSearch, setPosterSearch] = useState("");

  // Confirmation Modal State for Deletion
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const initialForm = {
    title: "",
    language: "Hindi",
    genre: "Action, Drama",
    certification: "U/A",
    duration: 150,
    theatricalStatus: "Now Showing",
    isAdvanceBooking: false,
    director: "",
    cast: "",
    releaseDate: new Date().toISOString().split("T")[0],
    poster: "",
    description: "",
  };

  const [formData, setFormData] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);

  const fetchMovies = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/movies");
      setMovies(Array.isArray(res.data) ? res.data : []);
    } catch {
      setError("Failed to load movie catalog from server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMovies();
  }, [fetchMovies]);

  // Load available posters from backend on demand
  const loadAvailablePosters = async () => {
    if (availablePosters.length > 0) return;
    try {
      setLoadingPosters(true);
      const res = await api.get("/api/movies/posters/available");
      if (Array.isArray(res.data)) {
        setAvailablePosters(res.data);
      }
    } catch {
      // Fallback posters from existing movies and presets
      const fallbackMap = new Map();
      movies.forEach((m) => {
        if (m.poster) {
          fallbackMap.set(m.poster, {
            title: m.title || m.movieName,
            poster: m.poster,
            source: "Database",
          });
        }
      });
      TMDB_CATALOG_PRESETS.forEach((p) => {
        if (p.poster && !fallbackMap.has(p.poster)) {
          fallbackMap.set(p.poster, {
            title: p.title,
            poster: p.poster,
            source: "TMDB Synchronized",
          });
        }
      });
      setAvailablePosters(Array.from(fallbackMap.values()));
    } finally {
      setLoadingPosters(false);
    }
  };

  const handleOpenPosterModal = () => {
    setPosterModalOpen(true);
    loadAvailablePosters();
  };

  const handleSelectPoster = (posterUrl) => {
    setFormData((prev) => ({ ...prev, poster: posterUrl }));
    setPosterModalOpen(false);
    toast.success("Poster selected and preview updated!");
  };

  // Combine database movies and TMDB presets for the auto-fill picker
  const combinedCatalogList = useMemo(() => {
    const list = [];
    const seenTitles = new Set();

    // 1. Database movies
    if (catalogFilter === "all" || catalogFilter === "database") {
      movies.forEach((m) => {
        const title = m.title || m.movieName || "";
        const lower = title.toLowerCase().trim();
        seenTitles.add(lower);
        list.push({
          ...m,
          source: "Database",
          isDatabase: true,
          releaseYear: m.releaseDate ? new Date(m.releaseDate).getFullYear() : "2024",
        });
      });
    }

    // 2. TMDB Synchronized Presets
    if (catalogFilter === "all" || catalogFilter === "tmdb") {
      TMDB_CATALOG_PRESETS.forEach((p) => {
        const lower = p.title.toLowerCase().trim();
        const existsInDb = seenTitles.has(lower);
        list.push({
          ...p,
          source: existsInDb ? "Database & TMDB" : "TMDB Catalog",
          isDatabase: existsInDb,
          releaseYear: p.releaseDate ? new Date(p.releaseDate).getFullYear() : "2024",
        });
      });
    }

    if (!catalogSearch.trim()) return list;

    const q = catalogSearch.toLowerCase().trim();
    return list.filter((item) => {
      const title = (item.title || item.movieName || "").toLowerCase();
      const lang = (item.language || "").toLowerCase();
      const genres = Array.isArray(item.genre)
        ? item.genre.join(" ").toLowerCase()
        : (item.genre || "").toLowerCase();
      return title.includes(q) || lang.includes(q) || genres.includes(q);
    });
  }, [movies, catalogFilter, catalogSearch]);

  // Handle selecting a movie card to autofill form
  const handleSelectTemplateMovie = (m) => {
    const titleKey = (m.title || m.movieName || "").trim().toLowerCase();
    const existingDbMovie = movies.find(
      (dbM) => (dbM.title || dbM.movieName || "").trim().toLowerCase() === titleKey
    );

    if (existingDbMovie) {
      // If already exists in DB, edit existing to prevent duplicate record
      handleEdit(existingDbMovie);
      toast.success(
        `Loaded existing movie "${existingDbMovie.title || existingDbMovie.movieName}" for editing. Duplicate creation prevented.`
      );
    } else {
      // Populate fields from TMDB preset for quick adding
      setEditingId(null);
      setFormData({
        title: m.title || m.movieName || "",
        language: m.language || "Hindi",
        genre: Array.isArray(m.genre)
          ? m.genre.join(", ")
          : m.genre || "Action, Drama",
        certification: m.certification || "U/A",
        duration: m.duration || m.runtime || 150,
        theatricalStatus: m.theatricalStatus || "Now Showing",
        isAdvanceBooking: Boolean(m.isAdvanceBooking),
        director: m.director || "",
        cast: Array.isArray(m.cast) ? m.cast.join(", ") : m.cast || "",
        releaseDate: m.releaseDate
          ? new Date(m.releaseDate).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0],
        poster: m.poster || "",
        description: m.description || "",
      });
      toast.success(
        `Autofilled "${m.title}" details from TMDB catalog! Customize fields and click Add Movie.`
      );
    }

    // Scroll smoothly to form
    const formEl = document.getElementById("movie-form-section");
    if (formEl) {
      formEl.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    const normalizedTitle = formData.title.trim();
    if (!normalizedTitle) {
      toast.error("Movie title is required.");
      return;
    }

    // Duplicate Movie Prevention (case-insensitive check against catalog)
    if (!editingId) {
      const duplicate = movies.find(
        (m) =>
          (m.title || m.movieName || "").trim().toLowerCase() ===
          normalizedTitle.toLowerCase()
      );
      if (duplicate) {
        const msg = `Movie "${normalizedTitle}" already exists in the catalog. Edit the existing movie instead of creating a duplicate.`;
        setError(msg);
        toast.error(msg);
        return;
      }
    }

    const payload = {
      ...formData,
      title: normalizedTitle,
      movieName: normalizedTitle,
      duration: Number(formData.duration) || 150,
      theatricalStatus: formData.theatricalStatus,
      isAdvanceBooking: Boolean(formData.isAdvanceBooking),
      director: formData.director.trim(),
      cast:
        typeof formData.cast === "string"
          ? formData.cast
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : formData.cast,
      genre:
        typeof formData.genre === "string"
          ? formData.genre
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : formData.genre,
    };

    try {
      setSubmitting(true);
      if (editingId) {
        await api.put(`/api/movies/${editingId}`, payload);
        toast.success(`"${formData.title}" updated successfully!`);
        setSuccessMsg("Movie updated successfully!");
      } else {
        await api.post("/api/movies", payload);
        toast.success(`"${formData.title}" added to catalog!`);
        setSuccessMsg("Movie added to catalog successfully!");
      }
      setFormData(initialForm);
      setEditingId(null);
      fetchMovies();
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to save movie.";
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (m) => {
    setEditingId(m._id || m.id);
    setFormData({
      title: m.title || m.movieName || "",
      language: m.language || "Hindi",
      genre: Array.isArray(m.genre)
        ? m.genre.join(", ")
        : Array.isArray(m.genres)
        ? m.genres.join(", ")
        : m.genre || "Action",
      certification: m.certification || "U/A",
      duration: m.duration || m.runtime || 150,
      theatricalStatus: m.theatricalStatus || "Now Showing",
      isAdvanceBooking: Boolean(m.isAdvanceBooking),
      director: m.director || "",
      cast: Array.isArray(m.cast) ? m.cast.join(", ") : m.cast || "",
      releaseDate: m.releaseDate
        ? new Date(m.releaseDate).toISOString().split("T")[0]
        : "",
      poster: m.poster || m.media || "",
      description: m.description || "",
    });
    const formEl = document.getElementById("movie-form-section");
    if (formEl) formEl.scrollIntoView({ behavior: "smooth" });
  };

  const confirmDeleteMovie = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await api.delete(`/api/movies/${deleteTarget.id}`);
      toast.success(`Movie "${deleteTarget.title}" deleted.`);
      setDeleteTarget(null);
      fetchMovies();
    } catch {
      toast.error("Failed to delete movie.");
    } finally {
      setDeleting(false);
    }
  };

  const filteredMovies = movies.filter((m) => {
    const t = m.title || m.movieName || "";
    return t.toLowerCase().includes(search.toLowerCase());
  });

  const totalPages = Math.ceil(filteredMovies.length / itemsPerPage) || 1;
  const paginatedMovies = filteredMovies.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Filtered available posters inside poster modal
  const filteredPosters = useMemo(() => {
    if (!posterSearch.trim()) return availablePosters.slice(0, 100);
    const q = posterSearch.toLowerCase().trim();
    return availablePosters.filter((p) => {
      const title = (p.title || "").toLowerCase();
      const lang = (p.language || "").toLowerCase();
      return title.includes(q) || lang.includes(q);
    });
  }, [availablePosters, posterSearch]);

  return (
    <div className="container py-4 fade-in" style={{ maxWidth: "1150px" }}>
      {/* Top Admin Navigation */}
      <AdminNav />

      {/* Top Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <Link to="/admin" className="text-secondary small text-decoration-none">
            &larr; Admin Dashboard
          </Link>
          <h2 className="text-white fw-bold mb-0">Manage Movie Catalog</h2>
        </div>
        <Link to="/admin/shows" className="btn btn-secondary-cinema btn-sm py-2 px-3">
          <i className="fa-solid fa-clock me-1 text-danger"></i> Schedule Shows
        </Link>
      </div>

      {/* 1. Quick Movie Selection & TMDB Autofill Section */}
      <div className="glass-panel p-4 mb-4" style={{ background: "#131726", borderColor: "rgba(229, 9, 20, 0.25)" }}>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div>
            <h5 className="text-white fw-bold mb-1">
              <i className="fa-solid fa-bolt text-warning me-2"></i>
              Select Existing Movie or TMDB Catalog to Autofill
            </h5>
            <div className="text-secondary small">
              Choose from existing database movies or verified TMDB blockbusters to automatically populate details without manual typing.
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowCatalogPicker((prev) => !prev)}
            className="btn btn-sm btn-secondary-cinema"
          >
            {showCatalogPicker ? "Collapse Picker" : "Expand Picker"}
          </button>
        </div>

        {showCatalogPicker && (
          <div>
            {/* Search and Filters */}
            <div className="row g-2 mb-3">
              <div className="col-12 col-md-7">
                <div className="input-group">
                  <span className="input-group-text bg-dark border-secondary text-secondary">
                    <i className="fa-solid fa-magnifying-glass"></i>
                  </span>
                  <input
                    type="text"
                    className="form-control cinema-input"
                    placeholder="Search existing movies or TMDB catalog (e.g. Inception, Fighter, Jawan, Drishyam)..."
                    value={catalogSearch}
                    onChange={(e) => setCatalogSearch(e.target.value)}
                  />
                  {catalogSearch && (
                    <button
                      className="btn btn-outline-secondary"
                      onClick={() => setCatalogSearch("")}
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
              <div className="col-12 col-md-5 d-flex gap-2 justify-content-md-end">
                <button
                  type="button"
                  onClick={() => setCatalogFilter("all")}
                  className={`btn btn-sm ${catalogFilter === "all" ? "btn-danger" : "btn-secondary-cinema"}`}
                >
                  All ({movies.length + TMDB_CATALOG_PRESETS.length})
                </button>
                <button
                  type="button"
                  onClick={() => setCatalogFilter("database")}
                  className={`btn btn-sm ${catalogFilter === "database" ? "btn-danger" : "btn-secondary-cinema"}`}
                >
                  In Database ({movies.length})
                </button>
                <button
                  type="button"
                  onClick={() => setCatalogFilter("tmdb")}
                  className={`btn btn-sm ${catalogFilter === "tmdb" ? "btn-danger" : "btn-secondary-cinema"}`}
                >
                  TMDB Presets ({TMDB_CATALOG_PRESETS.length})
                </button>
              </div>
            </div>

            {/* Horizontal Scrollable Movie Cards */}
            <div
              className="d-flex gap-3 overflow-auto pb-3 pt-1"
              style={{
                scrollbarWidth: "thin",
                scrollbarColor: "#e50914 #151828",
              }}
            >
              {combinedCatalogList.slice(0, 16).map((m, idx) => {
                const title = m.title || m.movieName;
                const poster = getPosterUrl(m);
                const isDb = m.isDatabase || Boolean(m._id);
                return (
                  <div
                    key={`${title}-${idx}`}
                    onClick={() => handleSelectTemplateMovie(m)}
                    className="glass-card p-2 flex-shrink-0 cursor-pointer text-start"
                    style={{
                      width: "185px",
                      background: "#181b2e",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      borderRadius: "8px",
                      cursor: "pointer",
                      transition: "transform 0.2s, border-color 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "#e50914";
                      e.currentTarget.style.transform = "translateY(-3px)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
                      e.currentTarget.style.transform = "translateY(0)";
                    }}
                    title="Click to automatically fill movie details"
                  >
                    <div
                      style={{
                        height: "170px",
                        overflow: "hidden",
                        borderRadius: "6px",
                        backgroundColor: "#111422",
                      }}
                    >
                      <img
                        src={poster}
                        alt={title}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = createTitlePosterSvg(title);
                        }}
                      />
                    </div>
                    <div className="pt-2">
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <span
                          className={`badge ${isDb ? "bg-primary" : "bg-danger"}`}
                          style={{ fontSize: "0.6rem" }}
                        >
                          {isDb ? "In Database" : "TMDB Autofill"}
                        </span>
                        <span className="text-secondary" style={{ fontSize: "0.68rem" }}>
                          {m.releaseYear || "2024"}
                        </span>
                      </div>
                      <h6
                        className="text-white fw-bold mb-1 text-truncate"
                        style={{ fontSize: "0.82rem" }}
                        title={title}
                      >
                        {title}
                      </h6>
                      <div className="text-secondary small d-flex justify-content-between" style={{ fontSize: "0.7rem" }}>
                        <span>{m.language || "Hindi"}</span>
                        <span className="text-danger fw-semibold">
                          {m.theatricalStatus || "Now Showing"}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger w-100 mt-2 py-1"
                        style={{ fontSize: "0.72rem" }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectTemplateMovie(m);
                        }}
                      >
                        <i className="fa-solid fa-wand-magic-sparkles me-1"></i>
                        {isDb ? "Edit Movie" : "Autofill Fields"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            {combinedCatalogList.length === 0 && (
              <div className="text-center py-3 text-secondary small">
                No matching movies found in database or TMDB presets.
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. Add / Edit Movie Form with Live Poster Preview and Poster Picker */}
      <div
        id="movie-form-section"
        className="glass-panel p-4 p-md-5 mb-5"
        style={{ background: "#151828" }}
      >
        <div className="d-flex justify-content-between align-items-center mb-4 border-bottom border-secondary border-opacity-25 pb-3">
          <div>
            <h4 className="text-white fw-bold mb-1" style={{ color: "#e50914" }}>
              {editingId ? "Edit Movie Details" : "Add Movie to Catalog"}
            </h4>
            <div className="text-secondary small">
              {editingId
                ? "Editing existing database record. All changes update across shows."
                : "New movie will be verified and added to the cinema catalog."}
            </div>
          </div>
          {editingId && (
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setFormData(initialForm);
              }}
              className="btn btn-sm btn-secondary-cinema"
            >
              Cancel Edit & Add New
            </button>
          )}
        </div>

        {error && <div className="alert alert-danger py-2 small mb-3">{error}</div>}
        {successMsg && <div className="alert alert-success py-2 small mb-3">{successMsg}</div>}

        <form onSubmit={handleSubmit}>
          {/* Live Poster Preview Box and Gallery Selector */}
          <div className="d-flex flex-column align-items-center mb-4">
            <div
              className="rounded-3 d-flex align-items-center justify-content-center overflow-hidden border shadow mb-2"
              style={{
                width: "160px",
                height: "230px",
                backgroundColor: "#1a1d2e",
                borderColor: "rgba(255, 255, 255, 0.15)",
              }}
            >
              {formData.poster ? (
                <img
                  src={getPosterUrl({ poster: formData.poster, title: formData.title })}
                  alt="Poster Preview"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = createTitlePosterSvg(formData.title || "Preview");
                  }}
                />
              ) : (
                <div className="text-center p-3 text-secondary">
                  <i className="fa-regular fa-image fs-1 mb-2"></i>
                  <div style={{ fontSize: "0.75rem" }}>Live Poster Preview</div>
                </div>
              )}
            </div>

            <div className="d-flex gap-2">
              <button
                type="button"
                onClick={handleOpenPosterModal}
                className="btn btn-sm btn-secondary-cinema"
                style={{ fontSize: "0.78rem" }}
              >
                <i className="fa-regular fa-images me-1 text-danger"></i>
                Browse Existing Posters
              </button>
              {formData.poster && (
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, poster: "" }))}
                  className="btn btn-sm btn-outline-secondary"
                  style={{ fontSize: "0.78rem" }}
                >
                  Clear Poster
                </button>
              )}
            </div>
          </div>

          <div className="row g-3">
            <div className="col-12 col-md-6">
              <label className="text-secondary small fw-bold mb-1 d-block">
                Movie Title <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                className="form-control cinema-input"
                placeholder="e.g. Inception, Fighter, Jawan"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>

            <div className="col-12 col-md-3">
              <label className="text-secondary small fw-bold mb-1 d-block">
                Language <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                className="form-control cinema-input"
                placeholder="Hindi, English, Telugu..."
                value={formData.language}
                onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                required
              />
            </div>

            <div className="col-12 col-md-3">
              <label className="text-secondary small fw-bold mb-1 d-block">Theatrical Status</label>
              <select
                className="form-select cinema-input"
                value={formData.theatricalStatus}
                onChange={(e) => setFormData({ ...formData, theatricalStatus: e.target.value })}
              >
                <option value="Now Showing">Now Showing</option>
                <option value="Coming Soon">Coming Soon</option>
                <option value="Advance Booking">Advance Booking</option>
                <option value="Last Day">Last Day</option>
                <option value="Ended">Ended (Closed)</option>
              </select>
            </div>

            <div className="col-12 col-md-4">
              <label className="text-secondary small fw-bold mb-1 d-block">Genres (comma separated)</label>
              <input
                type="text"
                className="form-control cinema-input"
                placeholder="Action, Thriller, Sci-Fi"
                value={formData.genre}
                onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
              />
            </div>

            <div className="col-6 col-md-2">
              <label className="text-secondary small fw-bold mb-1 d-block">Certificate</label>
              <select
                className="form-select cinema-input"
                value={formData.certification}
                onChange={(e) => setFormData({ ...formData, certification: e.target.value })}
              >
                <option value="U">U</option>
                <option value="U/A">U/A</option>
                <option value="A">A</option>
                <option value="R">R</option>
              </select>
            </div>

            <div className="col-6 col-md-2">
              <label className="text-secondary small fw-bold mb-1 d-block">Duration (mins)</label>
              <input
                type="number"
                className="form-control cinema-input"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
              />
            </div>

            <div className="col-12 col-md-4">
              <label className="text-secondary small fw-bold mb-1 d-block">Release Date</label>
              <input
                type="date"
                className="form-control cinema-input"
                value={formData.releaseDate}
                onChange={(e) => setFormData({ ...formData, releaseDate: e.target.value })}
              />
            </div>

            <div className="col-12 col-md-6">
              <label className="text-secondary small fw-bold mb-1 d-block">Director</label>
              <input
                type="text"
                className="form-control cinema-input"
                placeholder="e.g. Christopher Nolan, Siddharth Anand"
                value={formData.director}
                onChange={(e) => setFormData({ ...formData, director: e.target.value })}
              />
            </div>

            <div className="col-12 col-md-6">
              <label className="text-secondary small fw-bold mb-1 d-block">Star Cast (comma separated)</label>
              <input
                type="text"
                className="form-control cinema-input"
                placeholder="e.g. Hrithik Roshan, Deepika Padukone"
                value={formData.cast}
                onChange={(e) => setFormData({ ...formData, cast: e.target.value })}
              />
            </div>

            {/* Poster URL with Inline Browse Button */}
            <div className="col-12">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <label className="text-secondary small fw-bold mb-0">Poster Image URL</label>
                <button
                  type="button"
                  onClick={handleOpenPosterModal}
                  className="btn btn-link btn-sm text-danger p-0 text-decoration-none"
                  style={{ fontSize: "0.78rem" }}
                >
                  <i className="fa-regular fa-images me-1"></i> Choose from Existing Posters
                </button>
              </div>
              <div className="input-group">
                <input
                  type="text"
                  className="form-control cinema-input"
                  placeholder="https://image.tmdb.org/t/p/w780/... or /posters/..."
                  value={formData.poster}
                  onChange={(e) => setFormData({ ...formData, poster: e.target.value })}
                />
                <button
                  type="button"
                  className="btn btn-secondary-cinema"
                  onClick={handleOpenPosterModal}
                >
                  Browse Posters
                </button>
              </div>
              <span className="text-secondary" style={{ fontSize: "0.72rem" }}>
                Select from verified TMDB posters or enter a custom image URL.
              </span>
            </div>

            <div className="col-12">
              <label className="text-secondary small fw-bold mb-1 d-block">Movie Description / Synopsis</label>
              <textarea
                className="form-control cinema-input"
                rows="3"
                placeholder="Detailed plot synopsis and background..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              ></textarea>
            </div>
          </div>

          <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top border-secondary border-opacity-25">
            {editingId && (
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setFormData(initialForm);
                }}
                className="btn btn-secondary-cinema"
              >
                Cancel Edit
              </button>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="btn btn-cinema px-4 py-2 fw-bold"
            >
              {submitting ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2"></span> Saving...
                </>
              ) : editingId ? (
                "Update Movie"
              ) : (
                "Add Movie"
              )}
            </button>
          </div>
        </form>
      </div>

      {/* 3. Existing Movies Catalog Section */}
      <div className="glass-panel p-4 mb-4">
        <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-2 mb-4">
          <div>
            <h4 className="text-white fw-bold mb-0">Cinema Movies ({filteredMovies.length})</h4>
            <span className="text-secondary small">Live catalog loaded from database</span>
          </div>
          <input
            type="text"
            className="form-control cinema-input py-1 px-3"
            placeholder="Search movie title..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            style={{ width: "220px", fontSize: "0.85rem" }}
          />
        </div>

        {loading ? (
          <LoadingSpinner message="Loading catalog..." />
        ) : paginatedMovies.length === 0 ? (
          <div className="text-center py-4 text-secondary">No movies found.</div>
        ) : (
          <div className="row row-cols-2 row-cols-sm-3 row-cols-md-4 g-3">
            {paginatedMovies.map((m) => {
              const poster = getPosterUrl(m);
              const title = m.title || m.movieName;
              const status = m.theatricalStatus || "Now Showing";
              return (
                <div key={m._id || m.id} className="col">
                  <div className="glass-card p-2 h-100 d-flex flex-column justify-content-between position-relative">
                    <div style={{ height: "220px", overflow: "hidden", borderRadius: "8px", background: "#1a1c2b" }}>
                      <img
                        src={poster}
                        alt={title}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = createTitlePosterSvg(title);
                        }}
                      />
                    </div>

                    <div className="pt-2">
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <span className="badge bg-danger small" style={{ fontSize: "0.65rem" }}>
                          {status}
                        </span>
                        <span className="text-warning small" style={{ fontSize: "0.72rem" }}>
                          <i className="fa-solid fa-star me-1" style={{ fontSize: "0.62rem" }}></i>{m.rating || "8.0"}
                        </span>
                      </div>
                      <h6 className="text-white fw-bold mb-0 text-truncate" title={title} style={{ fontSize: "0.85rem" }}>
                        {title}
                      </h6>
                      <div className="text-secondary small" style={{ fontSize: "0.7rem" }}>
                        {m.language || "Hindi"}
                      </div>
                    </div>

                    <div className="d-flex gap-1 mt-2 pt-2 border-top border-secondary border-opacity-25">
                      <button
                        onClick={() => handleEdit(m)}
                        className="btn btn-sm btn-secondary-cinema flex-fill py-1"
                        style={{ fontSize: "0.72rem" }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setDeleteTarget({ id: m._id || m.id, title })}
                        className="btn btn-sm btn-danger py-1 px-2"
                        style={{ fontSize: "0.72rem" }}
                        title="Delete movie"
                      >
                        <i className="fa-solid fa-trash-can"></i>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          totalItems={filteredMovies.length}
        />
      </div>

      {/* 4. Poster Gallery Picker Modal */}
      {posterModalOpen && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.8)", zIndex: 1060 }}
        >
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
            <div
              className="modal-content text-white"
              style={{ backgroundColor: "#151828", borderColor: "rgba(255, 255, 255, 0.15)" }}
            >
              <div className="modal-header border-secondary border-opacity-25">
                <div>
                  <h5 className="modal-title fw-bold">Select Existing Movie Poster</h5>
                  <div className="text-secondary small">
                    Browse posters from database catalog and verified TMDB synchronized blockbusters
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setPosterModalOpen(false)}
                ></button>
              </div>

              <div className="modal-body p-4">
                {/* Search posters */}
                <div className="mb-3">
                  <input
                    type="text"
                    className="form-control cinema-input"
                    placeholder="Search poster by movie title (e.g. Inception, Fighter, Jawan)..."
                    value={posterSearch}
                    onChange={(e) => setPosterSearch(e.target.value)}
                  />
                </div>

                {loadingPosters ? (
                  <LoadingSpinner message="Loading poster gallery..." />
                ) : filteredPosters.length === 0 ? (
                  <div className="text-center py-5 text-secondary">
                    No matching posters found.
                  </div>
                ) : (
                  <div className="row row-cols-3 row-cols-sm-4 row-cols-md-5 g-3">
                    {filteredPosters.map((p, pIdx) => {
                      const displayTitle = p.title || `Poster ${pIdx + 1}`;
                      const isSelected = formData.poster === p.poster;
                      return (
                        <div key={`${p.poster}-${pIdx}`} className="col">
                          <div
                            onClick={() => handleSelectPoster(p.poster)}
                            className="glass-card p-1 text-center cursor-pointer h-100 d-flex flex-column"
                            style={{
                              border: isSelected
                                ? "2px solid #e50914"
                                : "1px solid rgba(255, 255, 255, 0.1)",
                              backgroundColor: isSelected ? "#2a151d" : "#191c2c",
                              borderRadius: "6px",
                              cursor: "pointer",
                            }}
                          >
                            <div
                              style={{
                                height: "135px",
                                overflow: "hidden",
                                borderRadius: "4px",
                                backgroundColor: "#111422",
                              }}
                            >
                              <img
                                src={p.poster}
                                alt={displayTitle}
                                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                onError={(e) => {
                                  e.currentTarget.onerror = null;
                                  e.currentTarget.src = createTitlePosterSvg(displayTitle);
                                }}
                              />
                            </div>
                            <div className="p-1 mt-auto">
                              <div
                                className="text-white text-truncate small fw-semibold"
                                style={{ fontSize: "0.72rem" }}
                                title={displayTitle}
                              >
                                {displayTitle}
                              </div>
                              <span
                                className="badge bg-secondary text-light mt-1"
                                style={{ fontSize: "0.58rem" }}
                              >
                                {p.source || "Database"}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="modal-footer border-secondary border-opacity-25">
                <button
                  type="button"
                  className="btn btn-secondary-cinema"
                  onClick={() => setPosterModalOpen(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Confirm Movie Deletion"
        message={
          deleteTarget
            ? `Are you sure you want to permanently delete "${deleteTarget.title}"? Warning: All scheduled screenings associated with this movie will also be removed.`
            : ""
        }
        confirmLabel="Yes, Delete Movie"
        confirmVariant="danger"
        loading={deleting}
        onConfirm={confirmDeleteMovie}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
