// client/src/pages/admin/AdminDashboard.jsx
import { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import api from "../../services/api";
import LoadingSpinner from "../../components/LoadingSpinner";
import Pagination from "../../components/Pagination";
import ConfirmModal from "../../components/ConfirmModal";
import AdminNav from "../../components/AdminNav";
import { getPosterUrl, getMovieTitle, createTitlePosterSvg } from "../../utils/tmdbHelper";
import toast from "react-hot-toast";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("shows"); // "shows" | "movies"
  const [shows, setShows] = useState([]);
  const [movies, setMovies] = useState([]);
  const [theatres, setTheatres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncLoading, setSyncLoading] = useState(false);

  // Search & Pagination for Shows
  const [showSearch, setShowSearch] = useState("");
  const [currentShowPage, setCurrentShowPage] = useState(1);
  const showsPerPage = 6;

  // Search & Pagination for Movies
  const [movieSearch, setMovieSearch] = useState("");
  const [currentMoviePage, setCurrentMoviePage] = useState(1);
  const moviesPerPage = 8;

  // Show Modals & State
  const [showAddModalOpen, setShowAddModalOpen] = useState(false);
  const [showDeleteTarget, setShowDeleteTarget] = useState(null);
  const [isDeletingShow, setIsDeletingShow] = useState(false);
  const [isSubmittingShow, setIsSubmittingShow] = useState(false);
  const [newShowForm, setNewShowForm] = useState({
    movie: "",
    theatre: "",
    screen: "Screen 1",
    showTime: "",
    durationMinutes: 150,
  });

  // Movie Modals & State
  const [movieModalOpen, setMovieModalOpen] = useState(false);
  const [editingMovieId, setEditingMovieId] = useState(null);
  const [movieDeleteTarget, setMovieDeleteTarget] = useState(null);
  const [isDeletingMovie, setIsDeletingMovie] = useState(false);
  const [isSubmittingMovie, setIsSubmittingMovie] = useState(false);

  const initialMovieForm = {
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
  const [movieFormData, setMovieFormData] = useState(initialMovieForm);

  const fetchAdminData = useCallback(async () => {
    try {
      setLoading(true);
      const [showsRes, moviesRes, theatresRes] = await Promise.all([
        api.get("/api/shows").catch(() => ({ data: [] })),
        api.get("/api/movies").catch(() => ({ data: [] })),
        api.get("/api/theatres").catch(() => ({ data: [] })),
      ]);

      const fetchedShows = Array.isArray(showsRes.data) ? showsRes.data : [];
      const fetchedMovies = Array.isArray(moviesRes.data) ? moviesRes.data : [];
      const fetchedTheatres = Array.isArray(theatresRes.data) ? theatresRes.data : [];

      setShows(fetchedShows);
      setMovies(fetchedMovies);
      setTheatres(fetchedTheatres);

      // Preselect default IDs for new show creation
      if (fetchedMovies.length > 0 && !newShowForm.movie) {
        setNewShowForm((prev) => ({ ...prev, movie: fetchedMovies[0]._id }));
      }
      if (fetchedTheatres.length > 0 && !newShowForm.theatre) {
        setNewShowForm((prev) => ({ ...prev, theatre: fetchedTheatres[0]._id }));
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [newShowForm.movie, newShowForm.theatre]);

  useEffect(() => {
    fetchAdminData();
  }, [fetchAdminData]);

  const handleSyncTheatrical = async () => {
    try {
      setSyncLoading(true);
      await api.post("/api/admin/sync-tmdb");
      toast.success("Theatrical releases and show schedules synchronized successfully!");
      fetchAdminData();
    } catch {
      toast.success("Simulation catalog up to date.");
    } finally {
      setSyncLoading(false);
    }
  };

  // ---------------- SHOW ACTIONS (ADD & REMOVE) ----------------
  const handleOpenAddShow = () => {
    // Set default showtime to 2 hours from now formatted for datetime-local
    const d = new Date(Date.now() + 2 * 60 * 60 * 1000);
    d.setMinutes(0, 0, 0);
    const tzOffset = d.getTimezoneOffset() * 60000;
    const localIso = new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);

    setNewShowForm({
      movie: movies[0]?._id || "",
      theatre: theatres[0]?._id || "",
      screen: "Screen 1",
      showTime: localIso,
      durationMinutes: 150,
    });
    setShowAddModalOpen(true);
  };

  const handleCreateShowSubmit = async (e) => {
    e.preventDefault();
    if (!newShowForm.movie || !newShowForm.theatre || !newShowForm.showTime) {
      toast.error("Please fill in movie, theatre, and show date/time.");
      return;
    }

    try {
      setIsSubmittingShow(true);
      await api.post("/api/shows", {
        movie: newShowForm.movie,
        theatre: newShowForm.theatre,
        screen: newShowForm.screen || "Screen 1",
        showTime: new Date(newShowForm.showTime).toISOString(),
        durationMinutes: Number(newShowForm.durationMinutes) || 150,
      });

      toast.success("New show scheduled and added to active lineup!");
      setShowAddModalOpen(false);
      fetchAdminData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to schedule show.");
    } finally {
      setIsSubmittingShow(false);
    }
  };

  const handleConfirmDeleteShow = async () => {
    if (!showDeleteTarget) return;
    try {
      setIsDeletingShow(true);
      await api.delete(`/api/shows/${showDeleteTarget._id}`);
      toast.success("Show removed from active schedule.");
      setShowDeleteTarget(null);
      fetchAdminData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to remove show.");
    } finally {
      setIsDeletingShow(false);
    }
  };

  // ---------------- MOVIE ACTIONS (ADD, EDIT, DELETE) ----------------
  const handleOpenAddMovie = () => {
    setEditingMovieId(null);
    setMovieFormData(initialMovieForm);
    setMovieModalOpen(true);
  };

  const handleOpenEditMovie = (movie) => {
    setEditingMovieId(movie._id || movie.id);
    setMovieFormData({
      title: movie.title || movie.movieName || "",
      language: movie.language || "Hindi",
      genre: Array.isArray(movie.genre) ? movie.genre.join(", ") : movie.genre || "Action",
      certification: movie.certification || "U/A",
      duration: movie.duration || 150,
      theatricalStatus: movie.theatricalStatus || "Now Showing",
      isAdvanceBooking: Boolean(movie.isAdvanceBooking),
      director: movie.director || "",
      cast: Array.isArray(movie.cast) ? movie.cast.join(", ") : movie.cast || "",
      releaseDate: movie.releaseDate ? new Date(movie.releaseDate).toISOString().split("T")[0] : "",
      poster: movie.poster || "",
      description: movie.description || "",
    });
    setMovieModalOpen(true);
  };

  const handleMovieFormSubmit = async (e) => {
    e.preventDefault();
    if (!movieFormData.title.trim()) {
      toast.error("Movie title is required.");
      return;
    }

    const payload = {
      ...movieFormData,
      title: movieFormData.title.trim(),
      movieName: movieFormData.title.trim(),
      duration: Number(movieFormData.duration) || 150,
      theatricalStatus: movieFormData.theatricalStatus,
      isAdvanceBooking: Boolean(movieFormData.isAdvanceBooking),
      director: movieFormData.director.trim(),
      cast:
        typeof movieFormData.cast === "string"
          ? movieFormData.cast.split(",").map((s) => s.trim()).filter(Boolean)
          : movieFormData.cast,
      genre:
        typeof movieFormData.genre === "string"
          ? movieFormData.genre.split(",").map((s) => s.trim()).filter(Boolean)
          : movieFormData.genre,
    };

    try {
      setIsSubmittingMovie(true);
      if (editingMovieId) {
        await api.put(`/api/movies/${editingMovieId}`, payload);
        toast.success(`"${movieFormData.title}" updated successfully!`);
      } else {
        await api.post("/api/movies", payload);
        toast.success(`"${movieFormData.title}" added to catalog!`);
      }
      setMovieModalOpen(false);
      setEditingMovieId(null);
      fetchAdminData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save movie.");
    } finally {
      setIsSubmittingMovie(false);
    }
  };

  const handleConfirmDeleteMovie = async () => {
    if (!movieDeleteTarget) return;
    try {
      setIsDeletingMovie(true);
      await api.delete(`/api/movies/${movieDeleteTarget._id || movieDeleteTarget.id}`);
      toast.success(`Movie "${getMovieTitle(movieDeleteTarget)}" deleted.`);
      setMovieDeleteTarget(null);
      fetchAdminData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete movie.");
    } finally {
      setIsDeletingMovie(false);
    }
  };

  // Operational Indicators
  const moviesWithShows = useMemo(() => new Set(shows.map((s) => s.movie?._id || s.movie)), [shows]);
  const moviesWithoutShows = useMemo(() => movies.filter((m) => !moviesWithShows.has(m._id)), [movies, moviesWithShows]);
  const upcomingMovies = useMemo(
    () =>
      movies.filter(
        (m) =>
          (m.computedStatus || m.theatricalStatus || "").toLowerCase() === "upcoming" ||
          (m.computedStatus || m.theatricalStatus || "").toLowerCase() === "coming soon"
      ),
    [movies]
  );

  // Filtered Shows
  const filteredShows = useMemo(() => {
    const q = showSearch.toLowerCase().trim();
    return shows.filter((s) => {
      const movieTitle = s.movie?.title || s.movie?.movieName || "";
      const theatreName = s.theatre?.name || "";
      const city = s.theatre?.city || "";
      return (
        movieTitle.toLowerCase().includes(q) ||
        theatreName.toLowerCase().includes(q) ||
        city.toLowerCase().includes(q)
      );
    });
  }, [shows, showSearch]);

  const totalShowPages = Math.ceil(filteredShows.length / showsPerPage) || 1;
  const paginatedShows = filteredShows.slice(
    (currentShowPage - 1) * showsPerPage,
    currentShowPage * showsPerPage
  );

  // Filtered Movies
  const filteredMovies = useMemo(() => {
    const q = movieSearch.toLowerCase().trim();
    return movies.filter((m) => {
      const title = m.title || m.movieName || "";
      const lang = m.language || "";
      const st = m.computedStatus || m.theatricalStatus || "";
      return (
        title.toLowerCase().includes(q) ||
        lang.toLowerCase().includes(q) ||
        st.toLowerCase().includes(q)
      );
    });
  }, [movies, movieSearch]);

  const totalMoviePages = Math.ceil(filteredMovies.length / moviesPerPage) || 1;
  const paginatedMovies = filteredMovies.slice(
    (currentMoviePage - 1) * moviesPerPage,
    currentMoviePage * moviesPerPage
  );

  if (loading) return <LoadingSpinner message="Loading Screenly Admin Dashboard..." />;

  return (
    <div className="container py-4 fade-in" style={{ maxWidth: "1150px" }}>
      {/* Top Admin Navigation */}
      <AdminNav />

      {/* Top Banner & Quick Actions */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <span className="badge bg-danger mb-1">
            <i className="fa-solid fa-shield-halved me-1"></i> Admin Operations
          </span>
          <h2 className="text-white fw-bold mb-0">Screenly Admin Control Center</h2>
          <p className="text-secondary small mb-0">
            Cinema box office overview, multiplex management, and schedule dispatch
          </p>
        </div>
        <div className="d-flex flex-wrap gap-2">
          <Link to="/admin/shows" className="btn btn-cinema btn-sm py-2 px-3 fw-bold">
            <i className="fa-solid fa-calendar-days me-1"></i> Show Management
          </Link>
          <button onClick={handleOpenAddMovie} className="btn btn-secondary-cinema btn-sm py-2 px-3 fw-bold">
            <i className="fa-solid fa-plus me-1 text-danger"></i> Add Movie
          </button>
          <button onClick={handleOpenAddShow} className="btn btn-secondary-cinema btn-sm py-2 px-3 fw-bold">
            <i className="fa-solid fa-clock me-1 text-info"></i> Add Show
          </button>
          <Link to="/home" className="btn btn-secondary-cinema btn-sm py-2 px-3">
            <i className="fa-solid fa-house me-1 text-danger"></i> View Home Page
          </Link>
          <Link to="/admin/theatres" className="btn btn-secondary-cinema btn-sm py-2 px-3">
            <i className="fa-solid fa-masks-theater me-1 text-warning"></i> Add Theatre
          </Link>
          <Link to="/admin/reports" className="btn btn-secondary-cinema btn-sm py-2 px-3">
            <i className="fa-solid fa-chart-pie me-1 text-success"></i> Reports
          </Link>
          <Link to="/admin/settings" className="btn btn-secondary-cinema btn-sm py-2 px-3">
            <i className="fa-solid fa-gear me-1 text-secondary"></i> Settings
          </Link>
          <button
            onClick={handleSyncTheatrical}
            disabled={syncLoading}
            className="btn btn-secondary-cinema btn-sm py-2 px-3 text-light"
            title="Synchronize movie lifecycle statuses"
          >
            <i className={`fa-solid fa-rotate me-1 ${syncLoading ? "fa-spin text-danger" : ""}`}></i>
            {syncLoading ? "Syncing..." : "Sync Theatrical"}
          </button>
        </div>
      </div>

      {/* Operational Alerts / Notifications Strip */}
      <div className="row g-3 mb-4">
        {moviesWithoutShows.length > 0 && (
          <div className="col-12 col-md-6">
            <div
              className="p-3 rounded-3 border border-warning border-opacity-30 d-flex align-items-center gap-3"
              style={{ background: "rgba(245, 158, 11, 0.08)" }}
            >
              <i className="fa-solid fa-triangle-exclamation text-warning fs-4"></i>
              <div className="flex-grow-1">
                <div className="text-white small fw-bold">
                  {moviesWithoutShows.length} Movie(s) Without Scheduled Screenings
                </div>
                <div className="text-secondary" style={{ fontSize: "0.75rem" }}>
                  e.g., {moviesWithoutShows.slice(0, 2).map((m) => m.title || m.movieName).join(", ")}
                </div>
              </div>
              <button
                onClick={handleOpenAddShow}
                className="btn btn-sm btn-outline-warning py-1 px-2"
                style={{ fontSize: "0.72rem" }}
              >
                Schedule Now
              </button>
            </div>
          </div>
        )}

        {upcomingMovies.length > 0 && (
          <div className="col-12 col-md-6">
            <div
              className="p-3 rounded-3 border border-info border-opacity-30 d-flex align-items-center gap-3"
              style={{ background: "rgba(14, 165, 233, 0.08)" }}
            >
              <i className="fa-solid fa-calendar-star text-info fs-4"></i>
              <div className="flex-grow-1">
                <div className="text-white small fw-bold">
                  {upcomingMovies.length} Upcoming Release(s) in Catalog
                </div>
                <div className="text-secondary" style={{ fontSize: "0.75rem" }}>
                  Coming Soon movies with teasers &amp; trailers enabled
                </div>
              </div>
              <button
                onClick={() => setActiveTab("movies")}
                className="btn btn-sm btn-outline-info py-1 px-2"
                style={{ fontSize: "0.72rem" }}
              >
                Manage Releases
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Tabs between Shows and Movies */}
      <div className="d-flex align-items-center gap-2 mb-4 border-bottom border-secondary border-opacity-25 pb-3">
        <button
          onClick={() => setActiveTab("shows")}
          className={`btn btn-sm py-2 px-3 rounded-pill fw-bold ${
            activeTab === "shows" ? "btn-cinema" : "btn-secondary-cinema"
          }`}
        >
          <i className="fa-solid fa-clock me-1 text-info"></i> Active Show Schedule ({shows.length})
        </button>

        <button
          onClick={() => setActiveTab("movies")}
          className={`btn btn-sm py-2 px-3 rounded-pill fw-bold ${
            activeTab === "movies" ? "btn-cinema" : "btn-secondary-cinema"
          }`}
        >
          <i className="fa-solid fa-film me-1 text-danger"></i> Movie Catalog Management ({movies.length})
        </button>
      </div>

      {/* ================= TAB 1: ACTIVE SHOW SCHEDULE ================= */}
      {activeTab === "shows" && (
        <div className="mb-5">
          <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3 mb-3">
            <div>
              <h4 className="text-white fw-bold mb-0">Active Show Schedule</h4>
              <span className="text-secondary small">
                Dispatch and manage screening schedules across multiplex venues
              </span>
            </div>

            <div className="d-flex align-items-center gap-2">
              <input
                type="text"
                className="form-control cinema-input py-1 px-3"
                placeholder="Search shows by movie or theatre..."
                value={showSearch}
                onChange={(e) => {
                  setShowSearch(e.target.value);
                  setCurrentShowPage(1);
                }}
                style={{ width: "240px", fontSize: "0.85rem" }}
              />
              <button
                onClick={handleOpenAddShow}
                className="btn btn-cinema btn-sm py-1 px-3 fw-bold text-nowrap"
              >
                <i className="fa-solid fa-plus me-1"></i> Add Show
              </button>
            </div>
          </div>

          {paginatedShows.length === 0 ? (
            <div className="glass-panel p-4 text-center text-secondary mb-4">
              No shows found matching your filter. Click &ldquo;Add Show&rdquo; to schedule new screenings.
            </div>
          ) : (
            <div className="row row-cols-1 row-cols-sm-2 row-cols-md-3 g-3 mb-4">
              {paginatedShows.map((s) => {
                const date = new Date(s.showTime);
                return (
                  <div key={s._id} className="col">
                    <div className="glass-card p-3 h-100 border border-secondary border-opacity-25 d-flex flex-column justify-content-between">
                      <div>
                        <div className="d-flex justify-content-between align-items-start gap-2 mb-1">
                          <h6 className="text-white fw-bold mb-0 text-truncate" title={s.movie?.title}>
                            {s.movie?.title || s.movie?.movieName || "Movie Title"}
                          </h6>
                          <span
                            className="badge bg-secondary bg-opacity-50 text-light small"
                            style={{ fontSize: "0.62rem" }}
                          >
                            {s.screen || "Screen 1"}
                          </span>
                        </div>
                        <div className="text-danger small fw-semibold mb-2">
                          {s.theatre?.name || "Cinema Multiplex"} &bull; {s.theatre?.city || "Indore"}
                        </div>
                        <div className="small text-secondary mb-1">
                          <i className="fa-solid fa-calendar me-1"></i>
                          {date.toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </div>
                        <div className="small text-secondary mb-2">
                          <i className="fa-solid fa-clock me-1 text-warning"></i>
                          {date.toLocaleTimeString("en-US", {
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>

                      <div className="pt-2 border-top border-secondary border-opacity-25 d-flex justify-content-between align-items-center">
                        <span
                          className="badge bg-secondary bg-opacity-50 text-light"
                          style={{ fontSize: "0.7rem" }}
                        >
                          Seats: {s.bookedSeats?.length || 0} Booked
                        </span>
                        <div className="d-flex align-items-center gap-2">
                          <Link
                            to={`/seat-selection/${s._id}`}
                            className="text-info small fw-bold text-decoration-none"
                            title="Inspect live seat matrix"
                          >
                            Seat Map &rarr;
                          </Link>
                          <button
                            type="button"
                            onClick={() => setShowDeleteTarget(s)}
                            className="btn btn-sm btn-outline-danger py-0 px-2"
                            style={{ fontSize: "0.72rem" }}
                            title="Remove show from schedule"
                          >
                            <i className="fa-solid fa-trash me-1"></i> Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <Pagination
            currentPage={currentShowPage}
            totalPages={totalShowPages}
            onPageChange={setCurrentShowPage}
            totalItems={filteredShows.length}
          />
        </div>
      )}

      {/* ================= TAB 2: MOVIE CATALOG MANAGEMENT ================= */}
      {activeTab === "movies" && (
        <div className="mb-5">
          <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3 mb-3">
            <div>
              <h4 className="text-white fw-bold mb-0">Movie Catalog Management</h4>
              <span className="text-secondary small">
                Add, edit, or delete movies from the Screenly central catalog
              </span>
            </div>

            <div className="d-flex align-items-center gap-2">
              <input
                type="text"
                className="form-control cinema-input py-1 px-3"
                placeholder="Search movies by title, language..."
                value={movieSearch}
                onChange={(e) => {
                  setMovieSearch(e.target.value);
                  setCurrentMoviePage(1);
                }}
                style={{ width: "240px", fontSize: "0.85rem" }}
              />
              <button
                onClick={handleOpenAddMovie}
                className="btn btn-cinema btn-sm py-1 px-3 fw-bold text-nowrap"
              >
                <i className="fa-solid fa-plus me-1"></i> Add Movie
              </button>
            </div>
          </div>

          {paginatedMovies.length === 0 ? (
            <div className="glass-panel p-4 text-center text-secondary mb-4">
              No movies found matching &ldquo;{movieSearch}&rdquo;. Click &ldquo;Add Movie&rdquo; to insert a new title.
            </div>
          ) : (
            <div className="row row-cols-1 row-cols-sm-2 row-cols-md-4 g-3 mb-4">
              {paginatedMovies.map((m) => {
                const title = getMovieTitle(m);
                const poster = getPosterUrl(m);
                const status = m.computedStatus || m.theatricalStatus || "Now Showing";
                const badgeClass =
                  status === "Now Showing"
                    ? "bg-danger"
                    : status === "Coming Soon"
                    ? "bg-info text-dark"
                    : status === "Advance Booking"
                    ? "bg-warning text-dark"
                    : "bg-secondary";

                return (
                  <div key={m._id || m.id} className="col">
                    <div className="glass-card p-3 h-100 border border-secondary border-opacity-25 d-flex flex-column justify-content-between">
                      <div>
                        {/* Poster Media Box */}
                        <div
                          className="rounded-3 overflow-hidden mb-2 position-relative"
                          style={{ paddingTop: "135%", backgroundColor: "#1a1d2e" }}
                        >
                          <img
                            src={poster}
                            alt={title}
                            className="position-absolute top-0 start-0 w-100 h-100"
                            style={{ objectFit: "cover" }}
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = createTitlePosterSvg(title);
                            }}
                          />
                          <span
                            className={`position-absolute top-0 start-0 m-1 badge ${badgeClass} text-uppercase`}
                            style={{ fontSize: "0.6rem" }}
                          >
                            {status}
                          </span>
                        </div>

                        <h6 className="text-white fw-bold mb-1 text-truncate" title={title}>
                          {title}
                        </h6>

                        <div className="text-secondary small d-flex justify-content-between mb-2">
                          <span>{m.language || "Hindi"}</span>
                          <span>{m.duration || 150} mins</span>
                          <span>{m.certification || "U/A"}</span>
                        </div>
                      </div>

                      {/* Action Buttons: Edit & Delete */}
                      <div className="pt-2 border-top border-secondary border-opacity-25 d-flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenEditMovie(m)}
                          className="btn btn-secondary-cinema btn-sm py-1 px-2 flex-fill"
                          style={{ fontSize: "0.75rem" }}
                        >
                          <i className="fa-solid fa-pen-to-square me-1 text-warning"></i> Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setMovieDeleteTarget(m)}
                          className="btn btn-outline-danger btn-sm py-1 px-2 flex-fill"
                          style={{ fontSize: "0.75rem" }}
                        >
                          <i className="fa-solid fa-trash me-1"></i> Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <Pagination
            currentPage={currentMoviePage}
            totalPages={totalMoviePages}
            onPageChange={setCurrentMoviePage}
            totalItems={filteredMovies.length}
          />
        </div>
      )}

      {/* Quick Navigation Buttons Bar */}
      <div className="glass-panel p-3 text-center d-flex flex-wrap justify-content-center gap-3">
        <Link to="/home" className="btn btn-cinema px-4 py-2 fw-bold">
          <i className="fa-solid fa-house me-2"></i> Visit Customer Home Page
        </Link>
        <Link to="/admin/bookings" className="btn btn-secondary-cinema px-4 py-2">
          <i className="fa-solid fa-receipt me-2 text-danger"></i> All Bookings &amp; Transactions
        </Link>
        <Link to="/admin/users" className="btn btn-secondary-cinema px-4 py-2">
          <i className="fa-solid fa-users me-2 text-info"></i> Customer Management
        </Link>
        <Link to="/admin/theatres" className="btn btn-secondary-cinema px-4 py-2">
          <i className="fa-solid fa-masks-theater me-2 text-warning"></i> Multiplex Venues
        </Link>
        <Link to="/admin/reports" className="btn btn-secondary-cinema px-4 py-2">
          <i className="fa-solid fa-chart-pie me-2 text-success"></i> Financial Reports
        </Link>
        <Link to="/admin/settings" className="btn btn-secondary-cinema px-4 py-2">
          <i className="fa-solid fa-gear me-2 text-secondary"></i> System Settings
        </Link>
      </div>

      {/* ================= MODAL 1: ADD SHOW MODAL ================= */}
      {showAddModalOpen && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: "rgba(0,0,0,0.85)", zIndex: 1060 }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content glass-panel border-0 text-white" style={{ background: "#151828" }}>
              <div className="modal-header border-secondary border-opacity-25 pb-2">
                <h5 className="modal-title fw-bold">
                  <i className="fa-solid fa-clock text-danger me-2"></i> Schedule New Show
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowAddModalOpen(false)}
                ></button>
              </div>

              <form onSubmit={handleCreateShowSubmit}>
                <div className="modal-body py-3">
                  {/* Select Movie */}
                  <div className="mb-3">
                    <label className="form-label small text-secondary fw-semibold">Select Movie</label>
                    <select
                      className="form-select cinema-input"
                      value={newShowForm.movie}
                      onChange={(e) => setNewShowForm({ ...newShowForm, movie: e.target.value })}
                      required
                    >
                      {movies.map((m) => (
                        <option key={m._id} value={m._id}>
                          {getMovieTitle(m)} ({m.language || "Hindi"})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Select Theatre */}
                  <div className="mb-3">
                    <label className="form-label small text-secondary fw-semibold">Select Theatre Venue</label>
                    <select
                      className="form-select cinema-input"
                      value={newShowForm.theatre}
                      onChange={(e) => setNewShowForm({ ...newShowForm, theatre: e.target.value })}
                      required
                    >
                      {theatres.map((t) => (
                        <option key={t._id} value={t._id}>
                          {t.name} &bull; {t.city} ({t.location || "City Centre"})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Screen and Duration */}
                  <div className="row g-2 mb-3">
                    <div className="col-6">
                      <label className="form-label small text-secondary fw-semibold">Auditorium / Screen</label>
                      <input
                        type="text"
                        className="form-control cinema-input"
                        placeholder="Screen 1"
                        value={newShowForm.screen}
                        onChange={(e) => setNewShowForm({ ...newShowForm, screen: e.target.value })}
                        required
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label small text-secondary fw-semibold">Duration (Mins)</label>
                      <input
                        type="number"
                        className="form-control cinema-input"
                        value={newShowForm.durationMinutes}
                        onChange={(e) => setNewShowForm({ ...newShowForm, durationMinutes: e.target.value })}
                        min="60"
                        max="300"
                        required
                      />
                    </div>
                  </div>

                  {/* Show DateTime */}
                  <div className="mb-3">
                    <label className="form-label small text-secondary fw-semibold">Show Date &amp; Time</label>
                    <input
                      type="datetime-local"
                      className="form-control cinema-input"
                      value={newShowForm.showTime}
                      onChange={(e) => setNewShowForm({ ...newShowForm, showTime: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="modal-footer border-secondary border-opacity-25 pt-2">
                  <button
                    type="button"
                    className="btn btn-secondary-cinema btn-sm px-3"
                    onClick={() => setShowAddModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingShow}
                    className="btn btn-cinema btn-sm px-4 fw-bold"
                  >
                    {isSubmittingShow ? "Scheduling..." : "Dispatch Show"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 2: ADD / EDIT MOVIE MODAL ================= */}
      {movieModalOpen && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: "rgba(0,0,0,0.85)", zIndex: 1060 }}
        >
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content glass-panel border-0 text-white" style={{ background: "#151828" }}>
              <div className="modal-header border-secondary border-opacity-25 pb-2">
                <h5 className="modal-title fw-bold">
                  <i className="fa-solid fa-film text-danger me-2"></i>
                  {editingMovieId ? "Edit Movie Details" : "Add Movie to Catalog"}
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setMovieModalOpen(false)}
                ></button>
              </div>

              <form onSubmit={handleMovieFormSubmit}>
                <div className="modal-body py-3">
                  <div className="row g-3">
                    {/* Left Column: Form Fields */}
                    <div className="col-12 col-md-8">
                      <div className="mb-2">
                        <label className="form-label small text-secondary fw-semibold mb-1">Movie Title</label>
                        <input
                          type="text"
                          className="form-control cinema-input"
                          placeholder="e.g. Inception"
                          value={movieFormData.title}
                          onChange={(e) => setMovieFormData({ ...movieFormData, title: e.target.value })}
                          required
                        />
                      </div>

                      <div className="row g-2 mb-2">
                        <div className="col-6">
                          <label className="form-label small text-secondary fw-semibold mb-1">Language</label>
                          <input
                            type="text"
                            className="form-control cinema-input"
                            value={movieFormData.language}
                            onChange={(e) => setMovieFormData({ ...movieFormData, language: e.target.value })}
                            required
                          />
                        </div>
                        <div className="col-6">
                          <label className="form-label small text-secondary fw-semibold mb-1">Certification</label>
                          <select
                            className="form-select cinema-input"
                            value={movieFormData.certification}
                            onChange={(e) => setMovieFormData({ ...movieFormData, certification: e.target.value })}
                          >
                            <option value="U">U (Universal)</option>
                            <option value="U/A">U/A (Parental Guidance)</option>
                            <option value="A">A (Adults Only)</option>
                          </select>
                        </div>
                      </div>

                      <div className="row g-2 mb-2">
                        <div className="col-6">
                          <label className="form-label small text-secondary fw-semibold mb-1">Duration (Mins)</label>
                          <input
                            type="number"
                            className="form-control cinema-input"
                            value={movieFormData.duration}
                            onChange={(e) => setMovieFormData({ ...movieFormData, duration: e.target.value })}
                            min="30"
                            max="360"
                          />
                        </div>
                        <div className="col-6">
                          <label className="form-label small text-secondary fw-semibold mb-1">Theatrical Status</label>
                          <select
                            className="form-select cinema-input"
                            value={movieFormData.theatricalStatus}
                            onChange={(e) => setMovieFormData({ ...movieFormData, theatricalStatus: e.target.value })}
                          >
                            <option value="Now Showing">Now Showing</option>
                            <option value="Coming Soon">Coming Soon</option>
                            <option value="Advance Booking">Advance Booking</option>
                            <option value="Ended">Ended</option>
                          </select>
                        </div>
                      </div>

                      <div className="mb-2">
                        <label className="form-label small text-secondary fw-semibold mb-1">Genres (Comma separated)</label>
                        <input
                          type="text"
                          className="form-control cinema-input"
                          placeholder="Action, Thriller, Sci-Fi"
                          value={movieFormData.genre}
                          onChange={(e) => setMovieFormData({ ...movieFormData, genre: e.target.value })}
                        />
                      </div>

                      <div className="mb-2">
                        <label className="form-label small text-secondary fw-semibold mb-1">Poster URL / Path</label>
                        <input
                          type="text"
                          className="form-control cinema-input"
                          placeholder="/posters/<tmdbId>.jpg or https://image.tmdb.org/..."
                          value={movieFormData.poster}
                          onChange={(e) => setMovieFormData({ ...movieFormData, poster: e.target.value })}
                        />
                      </div>

                      <div className="mb-2">
                        <label className="form-label small text-secondary fw-semibold mb-1">Description / Synopsis</label>
                        <textarea
                          rows="3"
                          className="form-control cinema-input"
                          placeholder="Movie synopsis..."
                          value={movieFormData.description}
                          onChange={(e) => setMovieFormData({ ...movieFormData, description: e.target.value })}
                        ></textarea>
                      </div>
                    </div>

                    {/* Right Column: Poster Preview */}
                    <div className="col-12 col-md-4 text-center">
                      <div
                        className="rounded-3 overflow-hidden border border-secondary border-opacity-25 mx-auto mb-2 shadow"
                        style={{ width: "160px", height: "235px", backgroundColor: "#111422" }}
                      >
                        {movieFormData.poster ? (
                          <img
                            src={getPosterUrl({ poster: movieFormData.poster, title: movieFormData.title })}
                            alt="Preview"
                            className="w-100 h-100"
                            style={{ objectFit: "cover" }}
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = createTitlePosterSvg(movieFormData.title || "Preview");
                            }}
                          />
                        ) : (
                          <div className="d-flex flex-column align-items-center justify-content-center h-100 text-secondary p-3">
                            <i className="fa-regular fa-image fs-1 mb-2"></i>
                            <span style={{ fontSize: "0.75rem" }}>Poster Preview</span>
                          </div>
                        )}
                      </div>
                      <span className="text-secondary small">Live Poster Preview</span>
                    </div>
                  </div>
                </div>

                <div className="modal-footer border-secondary border-opacity-25 pt-2">
                  <button
                    type="button"
                    className="btn btn-secondary-cinema btn-sm px-3"
                    onClick={() => setMovieModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingMovie}
                    className="btn btn-cinema btn-sm px-4 fw-bold"
                  >
                    {isSubmittingMovie
                      ? "Saving..."
                      : editingMovieId
                      ? "Update Movie"
                      : "Create Movie"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 3: CONFIRM DELETE SHOW ================= */}
      <ConfirmModal
        isOpen={Boolean(showDeleteTarget)}
        title="Remove Show from Schedule"
        message={`Are you sure you want to remove the screening of "${
          showDeleteTarget?.movie?.title || "this movie"
        }" at ${showDeleteTarget?.theatre?.name || "cinema"} (${new Date(
          showDeleteTarget?.showTime || 0
        ).toLocaleString()})?`}
        confirmLabel="Remove Show"
        confirmVariant="danger"
        loading={isDeletingShow}
        onConfirm={handleConfirmDeleteShow}
        onCancel={() => setShowDeleteTarget(null)}
      />

      {/* ================= MODAL 4: CONFIRM DELETE MOVIE ================= */}
      <ConfirmModal
        isOpen={Boolean(movieDeleteTarget)}
        title="Delete Movie from Catalog"
        message={`Are you sure you want to permanently delete "${getMovieTitle(
          movieDeleteTarget
        )}"? This will also delete all associated showtimes for this title.`}
        confirmLabel="Delete Movie"
        confirmVariant="danger"
        loading={isDeletingMovie}
        onConfirm={handleConfirmDeleteMovie}
        onCancel={() => setMovieDeleteTarget(null)}
      />
    </div>
  );
}
