// client/src/pages/admin/ManageMovies.jsx
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
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

  // Search & Pagination for existing cinema catalog table at bottom
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Movie & Poster Selection Modal State
  const [movieModalOpen, setMovieModalOpen] = useState(false);
  const [modalSearch, setModalSearch] = useState("");
  const [modalLanguage, setModalLanguage] = useState("All");
  const [modalStatus, setModalStatus] = useState("All");
  const [modalPage, setModalPage] = useState(1);
  const modalPageSize = 12;

  // Confirmation Modal State for Deletion
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const posterFileInputRef = useRef(null);

  const handlePosterFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload a valid image file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target.result;
      setFormData((prev) => ({ ...prev, poster: result }));
      toast.success("Poster image uploaded successfully!");
    };
    reader.readAsDataURL(file);
  };

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

  // Unified Catalog of all available movies: existing database movies + TMDB verified presets
  const availableMoviesCatalog = useMemo(() => {
    const list = [];
    const seenTitles = new Set();

    // 1. Existing movies from MongoDB
    movies.forEach((m) => {
      const title = (m.title || m.movieName || "").trim();
      const lower = title.toLowerCase();
      if (!lower) return;
      seenTitles.add(lower);
      list.push({
        ...m,
        title,
        movieName: title,
        source: "Database",
        isDatabase: true,
        releaseYear: m.releaseDate ? new Date(m.releaseDate).getFullYear() : "2024",
      });
    });

    // 2. TMDB Synchronized Blockbuster Presets
    TMDB_CATALOG_PRESETS.forEach((p) => {
      const title = (p.title || p.movieName || "").trim();
      const lower = title.toLowerCase();
      const existsInDb = seenTitles.has(lower);
      list.push({
        ...p,
        title,
        movieName: title,
        source: existsInDb ? "Database & TMDB" : "TMDB Catalog",
        isDatabase: existsInDb,
        releaseYear: p.releaseDate ? new Date(p.releaseDate).getFullYear() : "2024",
      });
    });

    return list;
  }, [movies]);

  // Distinct languages derived dynamically from catalog
  const distinctLanguages = useMemo(() => {
    const set = new Set();
    availableMoviesCatalog.forEach((m) => {
      if (m.language && typeof m.language === "string") {
        set.add(m.language.trim());
      }
    });
    return ["All", ...Array.from(set).sort()];
  }, [availableMoviesCatalog]);

  // Distinct theatrical statuses derived dynamically from catalog
  const distinctStatuses = ["All", "Now Showing", "Coming Soon", "Advance Booking", "Ended"];

  // Filtered movies for the Movie Selection Modal
  const filteredModalMovies = useMemo(() => {
    return availableMoviesCatalog.filter((m) => {
      const title = (m.title || m.movieName || "").toLowerCase();
      const lang = (m.language || "").toLowerCase();
      const genre = Array.isArray(m.genre)
        ? m.genre.join(" ").toLowerCase()
        : Array.isArray(m.genres)
        ? m.genres.join(" ").toLowerCase()
        : (m.genre || "").toLowerCase();
      const director = (m.director || "").toLowerCase();
      const cast = Array.isArray(m.cast)
        ? m.cast.join(" ").toLowerCase()
        : (m.cast || "").toLowerCase();

      const q = modalSearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        title.includes(q) ||
        lang.includes(q) ||
        genre.includes(q) ||
        director.includes(q) ||
        cast.includes(q);

      if (!matchesSearch) return false;

      if (modalLanguage !== "All" && m.language !== modalLanguage) {
        return false;
      }

      if (modalStatus !== "All" && (m.theatricalStatus || "Now Showing") !== modalStatus) {
        return false;
      }

      return true;
    });
  }, [availableMoviesCatalog, modalSearch, modalLanguage, modalStatus]);

  // Modal Pagination
  const totalModalPages = Math.ceil(filteredModalMovies.length / modalPageSize) || 1;
  const paginatedModalMovies = useMemo(() => {
    return filteredModalMovies.slice(
      (modalPage - 1) * modalPageSize,
      modalPage * modalPageSize
    );
  }, [filteredModalMovies, modalPage, modalPageSize]);

  // Reset modal page when filters change
  useEffect(() => {
    setModalPage(1);
  }, [modalSearch, modalLanguage, modalStatus]);

  // Handle selecting a movie card inside the modal
  const handleSelectMovieFromModal = (m) => {
    const titleKey = (m.title || m.movieName || "").trim().toLowerCase();
    const existingDbMovie = movies.find(
      (dbM) => (dbM.title || dbM.movieName || "").trim().toLowerCase() === titleKey
    );

    if (existingDbMovie && !editingId) {
      // If adding a movie that already exists in DB, transition into edit mode to prevent duplicates
      handleEdit(existingDbMovie);
      toast.success(
        `Loaded existing movie "${existingDbMovie.title || existingDbMovie.movieName}" for editing. Duplicate creation prevented.`
      );
    } else {
      // Populate fields automatically from chosen movie / TMDB record
      setFormData((prev) => ({
        ...prev,
        title: m.title || m.movieName || "",
        language: m.language || "Hindi",
        genre: Array.isArray(m.genre)
          ? m.genre.join(", ")
          : Array.isArray(m.genres)
          ? m.genres.join(", ")
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
        poster: m.poster || m.media || "",
        description: m.description || "",
      }));
      toast.success(
        `Selected "${m.title || m.movieName}"! Poster and movie details auto-populated.`
      );
    }

    setMovieModalOpen(false);
    const formEl = document.getElementById("movie-form-section");
    if (formEl) formEl.scrollIntoView({ behavior: "smooth" });
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

    if (!formData.poster) {
      toast.error("Please select a movie from the database or upload a poster image.");
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

      {/* Quick Action Banner to Choose Movie from Database */}
      <div
        className="glass-panel p-4 mb-4 d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3"
        style={{ background: "#131726", border: "1px solid rgba(229, 9, 20, 0.3)" }}
      >
        <div>
          <h5 className="text-white fw-bold mb-1">
            <i className="fa-solid fa-clapperboard text-danger me-2"></i>
            Database Movie &amp; Poster Selection
          </h5>
          <div className="text-secondary small">
            Choose from {availableMoviesCatalog.length} existing database movies and verified TMDB blockbusters to automatically populate details and poster without manual URL typing.
          </div>
        </div>
        <button
          type="button"
          onClick={() => setMovieModalOpen(true)}
          className="btn btn-cinema px-4 py-2 fw-bold text-nowrap"
        >
          <i className="fa-solid fa-magnifying-glass me-2"></i>
          Select Existing Movie
        </button>
      </div>

      {/* Add / Edit Movie Form */}
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
                ? "Editing existing database record. All updates apply across scheduled screenings."
                : "Select an existing movie to autofill details, or configure customized metadata."}
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
              Cancel Edit &amp; Add New
            </button>
          )}
        </div>

        {error && <div className="alert alert-danger py-2 small mb-3">{error}</div>}
        {successMsg && <div className="alert alert-success py-2 small mb-3">{successMsg}</div>}

        <form onSubmit={handleSubmit}>
          {/* Live Poster Preview Box */}
          <div className="d-flex flex-column align-items-center mb-4">
            <div
              className="rounded-3 d-flex align-items-center justify-content-center overflow-hidden border shadow mb-2"
              style={{
                width: "160px",
                height: "230px",
                backgroundColor: "#1a1d2e",
                borderColor: formData.poster ? "#e50914" : "rgba(255, 255, 255, 0.15)",
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
                  <i className="fa-solid fa-film fs-1 mb-2 text-danger opacity-50"></i>
                  <div className="fw-semibold text-white small">No Poster Selected</div>
                  <div style={{ fontSize: "0.72rem" }} className="mt-1">
                    Click below to choose from database
                  </div>
                </div>
              )}
            </div>

            <input
              type="file"
              ref={posterFileInputRef}
              accept="image/*"
              style={{ display: "none" }}
              onChange={handlePosterFileUpload}
            />

            <div className="d-flex gap-2 flex-wrap justify-content-center">
              <button
                type="button"
                onClick={() => setMovieModalOpen(true)}
                className="btn btn-sm btn-cinema fw-bold"
                style={{ fontSize: "0.78rem" }}
              >
                <i className="fa-solid fa-clapperboard me-1"></i>
                {formData.poster ? "Change Movie & Poster" : "Choose Movie & Poster"}
              </button>
              <button
                type="button"
                onClick={() => posterFileInputRef.current?.click()}
                className="btn btn-sm btn-secondary-cinema fw-bold"
                style={{ fontSize: "0.78rem" }}
                title="Upload local poster image file"
              >
                <i className="fa-solid fa-upload me-1"></i> Upload Poster
              </button>
              {formData.poster && (
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, poster: "" }))}
                  className="btn btn-sm btn-outline-danger"
                  style={{ fontSize: "0.78rem" }}
                >
                  Clear Poster
                </button>
              )}
            </div>
          </div>

          <div className="row g-3">
            {/* Movie Title */}
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

            {/* Language */}
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

            {/* Theatrical Status */}
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

            {/* Genres */}
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

            {/* Certificate */}
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

            {/* Duration */}
            <div className="col-6 col-md-2">
              <label className="text-secondary small fw-bold mb-1 d-block">Duration (mins)</label>
              <input
                type="number"
                className="form-control cinema-input"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
              />
            </div>

            {/* Release Date */}
            <div className="col-12 col-md-4">
              <label className="text-secondary small fw-bold mb-1 d-block">Release Date</label>
              <input
                type="date"
                className="form-control cinema-input"
                value={formData.releaseDate}
                onChange={(e) => setFormData({ ...formData, releaseDate: e.target.value })}
              />
            </div>

            {/* Director */}
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

            {/* Star Cast */}
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

            {/* Movie Poster & Metadata Selector (Replaces manual URL/Path input) */}
            <div className="col-12">
              <label className="text-secondary small fw-bold mb-1 d-block">
                Movie Poster &amp; Metadata Selection <span className="text-danger">*</span>
              </label>
              <div
                className="glass-card p-3 d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3"
                style={{
                  backgroundColor: "#181b2e",
                  border: formData.poster
                    ? "1px solid rgba(229, 9, 20, 0.4)"
                    : "1px dashed rgba(255, 255, 255, 0.2)",
                  borderRadius: "8px",
                }}
              >
                <div className="d-flex align-items-center gap-3 min-w-0">
                  {formData.poster ? (
                    <div
                      className="rounded overflow-hidden flex-shrink-0 border border-secondary border-opacity-25"
                      style={{ width: "52px", height: "74px", backgroundColor: "#111422" }}
                    >
                      <img
                        src={getPosterUrl({ poster: formData.poster, title: formData.title })}
                        alt={formData.title || "Poster"}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = createTitlePosterSvg(formData.title || "Movie");
                        }}
                      />
                    </div>
                  ) : (
                    <div
                      className="rounded d-flex align-items-center justify-content-center text-secondary flex-shrink-0 border border-secondary border-opacity-25"
                      style={{ width: "52px", height: "74px", backgroundColor: "#141726" }}
                    >
                      <i className="fa-regular fa-image fs-4"></i>
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="text-white fw-bold small text-truncate">
                      {formData.poster
                        ? formData.title || "Poster Selected from Database"
                        : "No Poster Selected Yet"}
                    </div>
                    <div className="text-secondary small" style={{ fontSize: "0.75rem" }}>
                      {formData.poster
                        ? "Loaded from existing cinema database. Click button to choose another movie or poster."
                        : "Choose from existing database movies and TMDB blockbusters. No manual URL typing required."}
                    </div>
                  </div>
                </div>

                <div className="d-flex gap-2 flex-shrink-0 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setMovieModalOpen(true)}
                    className="btn btn-cinema btn-sm py-2 px-3 fw-bold text-nowrap"
                  >
                    <i className="fa-solid fa-clapperboard me-1"></i>
                    {formData.poster ? "Change Movie / Poster" : "Select Existing Movie"}
                  </button>
                  <button
                    type="button"
                    onClick={() => posterFileInputRef.current?.click()}
                    className="btn btn-secondary-cinema btn-sm py-2 px-3 fw-bold text-nowrap"
                    title="Upload poster image from your device"
                  >
                    <i className="fa-solid fa-upload me-1"></i> Upload Poster
                  </button>
                  {formData.poster && (
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, poster: "" }))}
                      className="btn btn-outline-danger btn-sm py-2 px-2"
                      title="Clear selected poster"
                    >
                      <i className="fa-solid fa-xmark"></i>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Description */}
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

      {/* Existing Movies Catalog Section */}
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
                        loading="lazy"
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

      {/* Movie Selection Modal */}
      {movieModalOpen && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.85)", zIndex: 1060 }}
        >
          <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
            <div
              className="modal-content text-white"
              style={{ backgroundColor: "#151828", borderColor: "rgba(255, 255, 255, 0.15)" }}
            >
              <div className="modal-header border-secondary border-opacity-25">
                <div>
                  <h5 className="modal-title fw-bold">Select Existing Movie &amp; Poster</h5>
                  <div className="text-secondary small">
                    Browse all movies from database and verified TMDB catalog. Selecting a movie auto-populates all details and poster.
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setMovieModalOpen(false)}
                ></button>
              </div>

              <div className="modal-body p-4">
                {/* Search & Filters */}
                <div className="row g-2 mb-3">
                  <div className="col-12 col-md-5">
                    <div className="input-group">
                      <span className="input-group-text bg-dark border-secondary text-secondary">
                        <i className="fa-solid fa-magnifying-glass"></i>
                      </span>
                      <input
                        type="text"
                        className="form-control cinema-input"
                        placeholder="Search by title, genre, actor, or director..."
                        value={modalSearch}
                        onChange={(e) => setModalSearch(e.target.value)}
                        autoFocus
                      />
                      {modalSearch && (
                        <button
                          className="btn btn-outline-secondary"
                          onClick={() => setModalSearch("")}
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Filter by Language */}
                  <div className="col-6 col-md-3">
                    <select
                      className="form-select cinema-input"
                      value={modalLanguage}
                      onChange={(e) => setModalLanguage(e.target.value)}
                    >
                      {distinctLanguages.map((lang) => (
                        <option key={lang} value={lang}>
                          Language: {lang}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Filter by Theatrical Status */}
                  <div className="col-6 col-md-4">
                    <select
                      className="form-select cinema-input"
                      value={modalStatus}
                      onChange={(e) => setModalStatus(e.target.value)}
                    >
                      {distinctStatuses.map((st) => (
                        <option key={st} value={st}>
                          Status: {st}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="d-flex justify-content-between align-items-center mb-3">
                  <span className="text-secondary small">
                    Showing {paginatedModalMovies.length} of {filteredModalMovies.length} matching movies
                  </span>
                  <span className="text-secondary small">
                    Page {modalPage} of {totalModalPages}
                  </span>
                </div>

                {/* Responsive Grid of Movie Cards */}
                {filteredModalMovies.length === 0 ? (
                  <div className="text-center py-5 text-secondary">
                    No movies found matching your search and filter criteria.
                  </div>
                ) : (
                  <div className="row row-cols-2 row-cols-sm-3 row-cols-md-4 row-cols-lg-6 g-3">
                    {paginatedModalMovies.map((m, mIdx) => {
                      const title = m.title || m.movieName;
                      const poster = getPosterUrl(m);
                      const isSelected = formData.poster === m.poster || (formData.title && formData.title.toLowerCase() === title.toLowerCase());
                      const releaseYear = m.releaseDate
                        ? new Date(m.releaseDate).getFullYear()
                        : "2024";

                      return (
                        <div key={`${title}-${mIdx}`} className="col">
                          <div
                            onClick={() => handleSelectMovieFromModal(m)}
                            className="glass-card p-2 text-start cursor-pointer h-100 d-flex flex-column justify-content-between"
                            style={{
                              border: isSelected
                                ? "2px solid #e50914"
                                : "1px solid rgba(255, 255, 255, 0.1)",
                              backgroundColor: isSelected ? "#2a151d" : "#191c2c",
                              borderRadius: "8px",
                              cursor: "pointer",
                              transition: "transform 0.2s, border-color 0.2s",
                            }}
                            onMouseEnter={(e) => {
                              if (!isSelected) e.currentTarget.style.borderColor = "#e50914";
                              e.currentTarget.style.transform = "translateY(-2px)";
                            }}
                            onMouseLeave={(e) => {
                              if (!isSelected)
                                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
                              e.currentTarget.style.transform = "translateY(0)";
                            }}
                          >
                            <div
                              style={{
                                height: "185px",
                                overflow: "hidden",
                                borderRadius: "6px",
                                backgroundColor: "#111422",
                              }}
                            >
                              <img
                                src={poster}
                                alt={title}
                                loading="lazy"
                                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                onError={(e) => {
                                  e.currentTarget.onerror = null;
                                  e.currentTarget.src = createTitlePosterSvg(title);
                                }}
                              />
                            </div>

                            <div className="pt-2 flex-grow-1 d-flex flex-column justify-content-between">
                              <div>
                                <div className="d-flex justify-content-between align-items-center mb-1">
                                  <span
                                    className="badge bg-danger small"
                                    style={{ fontSize: "0.58rem" }}
                                  >
                                    {m.theatricalStatus || "Now Showing"}
                                  </span>
                                  <span className="text-warning small" style={{ fontSize: "0.68rem" }}>
                                    <i className="fa-solid fa-star me-1" style={{ fontSize: "0.58rem" }}></i>
                                    {m.rating || "8.0"}
                                  </span>
                                </div>

                                <h6
                                  className="text-white fw-bold mb-0 text-truncate"
                                  title={title}
                                  style={{ fontSize: "0.8rem" }}
                                >
                                  {title}
                                </h6>
                                <div
                                  className="text-secondary small"
                                  style={{ fontSize: "0.68rem" }}
                                >
                                  {m.language || "Hindi"} &bull; {releaseYear}
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSelectMovieFromModal(m);
                                }}
                                className={`btn btn-sm w-100 mt-2 py-1 ${
                                  isSelected ? "btn-danger" : "btn-secondary-cinema"
                                }`}
                                style={{ fontSize: "0.72rem" }}
                              >
                                {isSelected ? "Selected" : "Select Movie"}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Modal Pagination */}
                {totalModalPages > 1 && (
                  <div className="d-flex justify-content-center align-items-center gap-2 mt-4 pt-2 border-top border-secondary border-opacity-25">
                    <button
                      type="button"
                      disabled={modalPage === 1}
                      onClick={() => setModalPage((p) => Math.max(1, p - 1))}
                      className="btn btn-sm btn-secondary-cinema"
                    >
                      &larr; Previous
                    </button>
                    <span className="text-secondary small px-2">
                      Page {modalPage} of {totalModalPages}
                    </span>
                    <button
                      type="button"
                      disabled={modalPage === totalModalPages}
                      onClick={() => setModalPage((p) => Math.min(totalModalPages, p + 1))}
                      className="btn btn-sm btn-secondary-cinema"
                    >
                      Next &rarr;
                    </button>
                  </div>
                )}
              </div>

              <div className="modal-footer border-secondary border-opacity-25">
                <button
                  type="button"
                  className="btn btn-secondary-cinema"
                  onClick={() => setMovieModalOpen(false)}
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
