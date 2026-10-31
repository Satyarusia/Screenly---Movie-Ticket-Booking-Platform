// client/src/pages/admin/ManageMovies.jsx
import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import api from "../../services/api";
import LoadingSpinner from "../../components/LoadingSpinner";
import ConfirmModal from "../../components/ConfirmModal";
import Pagination from "../../components/Pagination";
import AdminNav from "../../components/AdminNav";
import { getPosterUrl, createTitlePosterSvg } from "../../utils/tmdbHelper";
import toast from "react-hot-toast";

export default function ManageMovies() {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Search & Pagination
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (!formData.title.trim()) {
      toast.error("Movie title is required.");
      return;
    }

    const payload = {
      ...formData,
      title: formData.title.trim(),
      movieName: formData.title.trim(),
      duration: Number(formData.duration) || 150,
      theatricalStatus: formData.theatricalStatus,
      isAdvanceBooking: Boolean(formData.isAdvanceBooking),
      director: formData.director.trim(),
      cast: typeof formData.cast === "string" ? formData.cast.split(",").map((s) => s.trim()).filter(Boolean) : formData.cast,
      genre: typeof formData.genre === "string" ? formData.genre.split(",").map((s) => s.trim()).filter(Boolean) : formData.genre,
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
      genre: Array.isArray(m.genre) ? m.genre.join(", ") : m.genre || "Action",
      certification: m.certification || "U/A",
      duration: m.duration || m.runtime || 150,
      theatricalStatus: m.theatricalStatus || "Now Showing",
      isAdvanceBooking: Boolean(m.isAdvanceBooking),
      director: m.director || "",
      cast: Array.isArray(m.cast) ? m.cast.join(", ") : m.cast || "",
      releaseDate: m.releaseDate ? new Date(m.releaseDate).toISOString().split("T")[0] : "",
      poster: m.poster || m.media || "",
      description: m.description || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
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

      {/* Add / Edit Movie Card with Poster Preview */}
      <div className="glass-panel p-4 p-md-5 mb-5" style={{ background: "#151828" }}>
        <h4 className="text-white fw-bold text-center mb-4" style={{ color: "#e50914" }}>
          {editingId ? "Edit Movie Details" : "Add Movie to Catalog"}
        </h4>

        {error && <div className="alert alert-danger py-2 small mb-3">{error}</div>}
        {successMsg && <div className="alert alert-success py-2 small mb-3">{successMsg}</div>}

        <form onSubmit={handleSubmit}>
          {/* Poster Preview Box on Top */}
          <div className="text-center mb-4">
            <div
              className="mx-auto rounded-3 d-flex align-items-center justify-content-center overflow-hidden border shadow"
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
                  <div style={{ fontSize: "0.75rem" }}>Poster Preview</div>
                </div>
              )}
            </div>
          </div>

          <div className="row g-3">
            <div className="col-12 col-md-6">
              <label className="text-secondary small fw-bold mb-1 d-block">Movie Title *</label>
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
              <label className="text-secondary small fw-bold mb-1 d-block">Language *</label>
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

            <div className="col-12">
              <label className="text-secondary small fw-bold mb-1 d-block">Poster Image URL</label>
              <input
                type="url"
                className="form-control cinema-input"
                placeholder="https://image.tmdb.org/t/p/w500/..."
                value={formData.poster}
                onChange={(e) => setFormData({ ...formData, poster: e.target.value })}
              />
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
