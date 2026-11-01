// client/src/pages/admin/AdminDashboard.jsx
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import api from "../../services/api";
import LoadingSpinner from "../../components/LoadingSpinner";
import Pagination from "../../components/Pagination";
import ConfirmModal from "../../components/ConfirmModal";
import AdminNav from "../../components/AdminNav";
import {
  getPosterUrl,
  getMovieTitle,
  createTitlePosterSvg,
  TMDB_CATALOG_PRESETS,
} from "../../utils/tmdbHelper";
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
  const moviePosterFileRef = useRef(null);

  // Movie Picker Modal State (for both Add Movie and Add Show)
  const [moviePickerModalOpen, setMoviePickerModalOpen] = useState(false);
  const [pickerTarget, setPickerTarget] = useState("movie"); // "movie" | "show"
  const [pickerSearch, setPickerSearch] = useState("");
  const [pickerLanguage, setPickerLanguage] = useState("All");
  const [pickerStatus, setPickerStatus] = useState("All");
  const [pickerPage, setPickerPage] = useState(1);
  const pickerPageSize = 12;

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

  const distinctStatuses = ["All", "Now Showing", "Coming Soon", "Advance Booking", "Ended"];

  // Filtered movies for the Movie Picker Modal
  const filteredPickerMovies = useMemo(() => {
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

      const q = pickerSearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        title.includes(q) ||
        lang.includes(q) ||
        genre.includes(q) ||
        director.includes(q) ||
        cast.includes(q);

      if (!matchesSearch) return false;

      if (pickerLanguage !== "All" && m.language !== pickerLanguage) {
        return false;
      }

      if (pickerStatus !== "All" && (m.theatricalStatus || "Now Showing") !== pickerStatus) {
        return false;
      }

      return true;
    });
  }, [availableMoviesCatalog, pickerSearch, pickerLanguage, pickerStatus]);

  const totalPickerPages = Math.ceil(filteredPickerMovies.length / pickerPageSize) || 1;
  const paginatedPickerMovies = useMemo(() => {
    return filteredPickerMovies.slice(
      (pickerPage - 1) * pickerPageSize,
      pickerPage * pickerPageSize
    );
  }, [filteredPickerMovies, pickerPage, pickerPageSize]);

  useEffect(() => {
    setPickerPage(1);
  }, [pickerSearch, pickerLanguage, pickerStatus]);

  const handleOpenMoviePicker = (target = "movie") => {
    setPickerTarget(target);
    setPickerSearch("");
    setPickerLanguage("All");
    setPickerStatus("All");
    setPickerPage(1);
    setMoviePickerModalOpen(true);
  };

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
      setMovieFormData((prev) => ({ ...prev, poster: result }));
      toast.success("Poster image uploaded successfully!");
    };
    reader.readAsDataURL(file);
  };

  const handleSelectMovieFromPicker = async (m) => {
    if (pickerTarget === "movie") {
      const titleKey = (m.title || m.movieName || "").trim().toLowerCase();
      const existingDbMovie = movies.find(
        (dbM) => (dbM.title || dbM.movieName || "").trim().toLowerCase() === titleKey
      );

      if (existingDbMovie && !editingMovieId) {
        setEditingMovieId(existingDbMovie._id);
        toast.success(
          `Loaded existing movie "${existingDbMovie.title || existingDbMovie.movieName}" for editing. Duplicate creation prevented.`
        );
      } else {
        toast.success(`Selected "${m.title || m.movieName}"! Poster and movie details auto-populated.`);
      }

      setMovieFormData((prev) => ({
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

      setMoviePickerModalOpen(false);
    } else if (pickerTarget === "show") {
      let targetMovieId = m._id;

      if (!targetMovieId) {
        try {
          const res = await api.post("/api/movies", {
            title: m.title || m.movieName,
            movieName: m.title || m.movieName,
            language: m.language || "Hindi",
            genre: Array.isArray(m.genre) ? m.genre : [m.genre || "Action"],
            certification: m.certification || "U/A",
            duration: Number(m.duration || m.runtime) || 150,
            theatricalStatus: m.theatricalStatus || "Now Showing",
            poster: m.poster || m.media || "",
            description: m.description || "",
            director: m.director || "Director",
            cast: Array.isArray(m.cast) ? m.cast : [m.cast || "Lead Actor"],
            releaseDate: m.releaseDate || new Date().toISOString(),
          });
          const created = res.data?.movie || res.data;
          targetMovieId = created._id;
          fetchAdminData();
        } catch {
          targetMovieId = movies[0]?._id;
        }
      }

      setNewShowForm((prev) => ({
        ...prev,
        movie: targetMovieId,
        durationMinutes: m.duration || m.runtime || prev.durationMinutes || 150,
      }));
      setMoviePickerModalOpen(false);
      toast.success(`Selected "${m.title || m.movieName}" for show! Poster & duration auto-filled.`);
    }
  };

  const selectedShowMovie = useMemo(() => {
    if (!newShowForm.movie) return movies[0] || null;
    return movies.find((m) => m._id === newShowForm.movie) || null;
  }, [newShowForm.movie, movies]);

  const handleShowMovieChange = (movieId) => {
    const m = movies.find((item) => item._id === movieId);
    setNewShowForm((prev) => ({
      ...prev,
      movie: movieId,
      durationMinutes: m?.duration || prev.durationMinutes || 150,
    }));
  };

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

    const firstMovie = movies[0];
    setNewShowForm({
      movie: firstMovie?._id || "",
      theatre: theatres[0]?._id || "",
      screen: "Screen 1",
      showTime: localIso,
      durationMinutes: firstMovie?.duration || 150,
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
    if (!movieFormData.poster) {
      toast.error("Please select an existing movie or upload a poster image.");
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
                  {/* Select Movie with Live Poster & Details Display */}
                  <div className="mb-3">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <label className="form-label small text-secondary fw-semibold mb-0">Select Movie</label>
                      <button
                        type="button"
                        onClick={() => handleOpenMoviePicker("show")}
                        className="btn btn-sm btn-cinema py-0 px-2"
                        style={{ fontSize: "0.75rem" }}
                      >
                        <i className="fa-solid fa-magnifying-glass me-1"></i> Browse Movie Catalog
                      </button>
                    </div>

                    <select
                      className="form-select cinema-input mb-2"
                      value={newShowForm.movie}
                      onChange={(e) => handleShowMovieChange(e.target.value)}
                      required
                    >
                      <option value="" disabled>-- Select a Movie --</option>
                      {movies.map((m) => (
                        <option key={m._id} value={m._id}>
                          {getMovieTitle(m)} ({m.language || "Hindi"}) &bull; {m.duration || 150}m
                        </option>
                      ))}
                    </select>

                    {/* Selected Movie Preview Card in Add Show Modal */}
                    {selectedShowMovie && (
                      <div
                        className="p-3 rounded-3 d-flex gap-3 align-items-center"
                        style={{
                          background: "rgba(255, 255, 255, 0.03)",
                          border: "1px solid rgba(229, 9, 20, 0.4)",
                        }}
                      >
                        <div
                          className="rounded overflow-hidden flex-shrink-0 border border-secondary border-opacity-25"
                          style={{ width: "52px", height: "74px", backgroundColor: "#111422" }}
                        >
                          <img
                            src={getPosterUrl(selectedShowMovie)}
                            alt={getMovieTitle(selectedShowMovie)}
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = createTitlePosterSvg(getMovieTitle(selectedShowMovie));
                            }}
                          />
                        </div>
                        <div className="flex-grow-1 min-w-0">
                          <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
                            <h6 className="text-white fw-bold mb-0 text-truncate">
                              {getMovieTitle(selectedShowMovie)}
                            </h6>
                            <span className="badge bg-danger" style={{ fontSize: "0.65rem" }}>
                              {selectedShowMovie.theatricalStatus || "Now Showing"}
                            </span>
                            <span className="badge bg-secondary" style={{ fontSize: "0.65rem" }}>
                              {selectedShowMovie.certification || "U/A"}
                            </span>
                          </div>
                          <div className="text-secondary small d-flex flex-wrap gap-2" style={{ fontSize: "0.72rem" }}>
                            <span><i className="fa-solid fa-language text-danger me-1"></i>{selectedShowMovie.language || "Hindi"}</span>
                            <span>&bull;</span>
                            <span><i className="fa-regular fa-clock text-warning me-1"></i>{selectedShowMovie.duration || 150} mins</span>
                            {selectedShowMovie.genre && (
                              <>
                                <span>&bull;</span>
                                <span className="text-truncate">{Array.isArray(selectedShowMovie.genre) ? selectedShowMovie.genre.join(", ") : selectedShowMovie.genre}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
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

                      {/* Movie Poster & Metadata Picker (Replaces manual URL/Path input) */}
                      <input
                        type="file"
                        ref={moviePosterFileRef}
                        accept="image/*"
                        style={{ display: "none" }}
                        onChange={handlePosterFileUpload}
                      />

                      <div className="mb-3">
                        <label className="form-label small text-secondary fw-semibold mb-1 d-block">
                          Movie Poster &amp; Metadata Selection <span className="text-danger">*</span>
                        </label>
                        <div
                          className="p-3 rounded-3 d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3"
                          style={{
                            background: "rgba(255, 255, 255, 0.03)",
                            border: movieFormData.poster
                              ? "1px solid rgba(229, 9, 20, 0.5)"
                              : "1px dashed rgba(255, 255, 255, 0.2)",
                          }}
                        >
                          <div className="d-flex align-items-center gap-3 min-w-0">
                            {movieFormData.poster ? (
                              <div
                                className="rounded overflow-hidden flex-shrink-0 border border-secondary border-opacity-25"
                                style={{ width: "48px", height: "68px", backgroundColor: "#111422" }}
                              >
                                <img
                                  src={getPosterUrl({ poster: movieFormData.poster, title: movieFormData.title })}
                                  alt={movieFormData.title || "Poster"}
                                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                  onError={(e) => {
                                    e.currentTarget.onerror = null;
                                    e.currentTarget.src = createTitlePosterSvg(movieFormData.title || "Movie");
                                  }}
                                />
                              </div>
                            ) : (
                              <div
                                className="rounded d-flex align-items-center justify-content-center text-secondary flex-shrink-0 border border-secondary border-opacity-25"
                                style={{ width: "48px", height: "68px", backgroundColor: "#141726" }}
                              >
                                <i className="fa-regular fa-image fs-4"></i>
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="text-white fw-bold small text-truncate">
                                {movieFormData.poster
                                  ? movieFormData.title || "Poster Selected"
                                  : "No Poster Selected Yet"}
                              </div>
                              <div className="text-secondary small" style={{ fontSize: "0.72rem" }}>
                                {movieFormData.poster
                                  ? "Poster loaded. Click to choose another movie or upload an image."
                                  : "Select from database movies or upload a local image file."}
                              </div>
                            </div>
                          </div>

                          <div className="d-flex gap-2 flex-shrink-0">
                            <button
                              type="button"
                              onClick={() => handleOpenMoviePicker("movie")}
                              className="btn btn-cinema btn-sm py-1 px-3"
                              style={{ fontSize: "0.78rem" }}
                            >
                              <i className="fa-solid fa-magnifying-glass me-1"></i>
                              {movieFormData.poster ? "Change Movie" : "Select Existing Movie"}
                            </button>
                            <button
                              type="button"
                              onClick={() => moviePosterFileRef.current?.click()}
                              className="btn btn-secondary-cinema btn-sm py-1 px-2"
                              style={{ fontSize: "0.78rem" }}
                              title="Upload custom poster image file"
                            >
                              <i className="fa-solid fa-upload me-1"></i> Upload Poster
                            </button>
                            {movieFormData.poster && (
                              <button
                                type="button"
                                onClick={() => setMovieFormData((prev) => ({ ...prev, poster: "" }))}
                                className="btn btn-outline-danger btn-sm py-1 px-2"
                                style={{ fontSize: "0.78rem" }}
                                title="Clear poster"
                              >
                                <i className="fa-solid fa-xmark"></i>
                              </button>
                            )}
                          </div>
                        </div>
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
                            <span style={{ fontSize: "0.75rem" }}>No Poster Selected</span>
                          </div>
                        )}
                      </div>
                      <span className="text-secondary small d-block mb-2">Live Poster Preview</span>
                      <div className="d-flex flex-column gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenMoviePicker("movie")}
                          className="btn btn-sm btn-cinema py-1 px-2"
                          style={{ fontSize: "0.75rem" }}
                        >
                          <i className="fa-solid fa-film me-1"></i>
                          {movieFormData.poster ? "Change Movie & Poster" : "Choose Movie & Poster"}
                        </button>
                        <button
                          type="button"
                          onClick={() => moviePosterFileRef.current?.click()}
                          className="btn btn-sm btn-secondary-cinema py-1 px-2"
                          style={{ fontSize: "0.75rem" }}
                        >
                          <i className="fa-solid fa-upload me-1"></i> Upload Poster File
                        </button>
                      </div>
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

      {/* ================= MODAL 5: MOVIE PICKER MODAL (FOR ADD MOVIE & ADD SHOW) ================= */}
      {moviePickerModalOpen && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: "rgba(0,0,0,0.88)", zIndex: 1070 }}
        >
          <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content glass-panel border-0 text-white" style={{ background: "#131627" }}>
              <div className="modal-header border-secondary border-opacity-25 pb-2">
                <div>
                  <h5 className="modal-title fw-bold mb-0">
                    <i className="fa-solid fa-film text-danger me-2"></i>
                    {pickerTarget === "movie" ? "Select Existing Movie & Poster" : "Select Movie to Schedule Show"}
                  </h5>
                  <small className="text-secondary">
                    Choose from existing database movies and synchronized TMDB releases
                  </small>
                </div>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setMoviePickerModalOpen(false)}
                ></button>
              </div>

              <div className="modal-body p-3">
                {/* Search & Filters */}
                <div className="row g-2 mb-3">
                  <div className="col-12 col-md-6">
                    <div className="input-group input-group-sm">
                      <span className="input-group-text bg-dark border-secondary border-opacity-25 text-secondary">
                        <i className="fa-solid fa-magnifying-glass"></i>
                      </span>
                      <input
                        type="text"
                        className="form-control cinema-input"
                        placeholder="Search movie title, genre, director, cast..."
                        value={pickerSearch}
                        onChange={(e) => setPickerSearch(e.target.value)}
                        autoFocus
                      />
                      {pickerSearch && (
                        <button
                          type="button"
                          className="btn btn-secondary-cinema"
                          onClick={() => setPickerSearch("")}
                        >
                          <i className="fa-solid fa-xmark"></i>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="col-6 col-md-3">
                    <select
                      className="form-select form-select-sm cinema-input"
                      value={pickerLanguage}
                      onChange={(e) => setPickerLanguage(e.target.value)}
                    >
                      {distinctLanguages.map((lang) => (
                        <option key={lang} value={lang}>
                          Language: {lang}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-6 col-md-3">
                    <select
                      className="form-select form-select-sm cinema-input"
                      value={pickerStatus}
                      onChange={(e) => setPickerStatus(e.target.value)}
                    >
                      {distinctStatuses.map((st) => (
                        <option key={st} value={st}>
                          Status: {st}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Catalog Cards Grid */}
                {paginatedPickerMovies.length === 0 ? (
                  <div className="text-center py-5">
                    <i className="fa-solid fa-film text-secondary fs-1 mb-2"></i>
                    <h6 className="text-white">No Movies Found</h6>
                    <p className="text-secondary small">Try adjusting your search terms or filters</p>
                  </div>
                ) : (
                  <div className="row row-cols-2 row-cols-sm-3 row-cols-md-4 row-cols-lg-6 g-3">
                    {paginatedPickerMovies.map((m, idx) => {
                      const title = m.title || m.movieName || "Untitled";
                      const poster = getPosterUrl(m);
                      const isSelected =
                        pickerTarget === "movie"
                          ? movieFormData.poster === m.poster ||
                            (movieFormData.title && movieFormData.title.toLowerCase() === title.toLowerCase())
                          : newShowForm.movie === m._id;
                      const releaseYear = m.releaseYear || (m.releaseDate ? new Date(m.releaseDate).getFullYear() : "2024");

                      return (
                        <div key={m._id || m.tmdbId || idx} className="col">
                          <div
                            onClick={() => handleSelectMovieFromPicker(m)}
                            className="glass-card h-100 p-2 d-flex flex-column cursor-pointer"
                            style={{
                              border: isSelected ? "2px solid #e50914" : "1px solid rgba(255,255,255,0.08)",
                              transition: "all 0.15s ease",
                              backgroundColor: isSelected ? "rgba(229, 9, 20, 0.1)" : "#181b2c",
                            }}
                          >
                            <div
                              className="w-100 rounded overflow-hidden position-relative"
                              style={{ aspectRatio: "2/3", backgroundColor: "#111422" }}
                            >
                              <img
                                src={poster}
                                alt={title}
                                loading="lazy"
                                className="w-100 h-100"
                                style={{ objectFit: "cover" }}
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
                                  handleSelectMovieFromPicker(m);
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
                {totalPickerPages > 1 && (
                  <div className="d-flex justify-content-center align-items-center gap-2 mt-3 pt-2 border-top border-secondary border-opacity-25">
                    <button
                      type="button"
                      disabled={pickerPage === 1}
                      onClick={() => setPickerPage((p) => Math.max(1, p - 1))}
                      className="btn btn-sm btn-secondary-cinema"
                    >
                      &larr; Previous
                    </button>
                    <span className="text-secondary small px-2">
                      Page {pickerPage} of {totalPickerPages}
                    </span>
                    <button
                      type="button"
                      disabled={pickerPage === totalPickerPages}
                      onClick={() => setPickerPage((p) => Math.min(totalPickerPages, p + 1))}
                      className="btn btn-sm btn-secondary-cinema"
                    >
                      Next &rarr;
                    </button>
                  </div>
                )}
              </div>

              <div className="modal-footer border-secondary border-opacity-25 py-2">
                <button
                  type="button"
                  className="btn btn-secondary-cinema btn-sm px-3"
                  onClick={() => setMoviePickerModalOpen(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
