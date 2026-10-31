// client/src/pages/admin/ManageShows.jsx
import { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import api from "../../services/api";
import LoadingSpinner from "../../components/LoadingSpinner";
import ConfirmModal from "../../components/ConfirmModal";
import Pagination from "../../components/Pagination";
import AdminNav from "../../components/AdminNav";
import { getPosterUrl, handleImageError } from "../../utils/tmdbHelper";
import toast from "react-hot-toast";

const FORMAT_OPTIONS = ["2D", "3D", "IMAX", "IMAX 3D", "Dolby Atmos", "4DX", "Other"];
const LANGUAGE_OPTIONS = [
  "Hindi",
  "English",
  "Tamil",
  "Telugu",
  "Malayalam",
  "Kannada",
  "Bengali",
  "Marathi",
  "Punjabi",
];

const TIME_PRESETS = [
  { label: "09:00 AM", slot: "09:00", name: "Morning Show" },
  { label: "12:30 PM", slot: "12:30", name: "Matinee Show" },
  { label: "03:45 PM", slot: "15:45", name: "Afternoon Show" },
  { label: "07:00 PM", slot: "19:00", name: "Evening Show" },
  { label: "10:30 PM", slot: "22:30", name: "Night Show" },
];

export default function ManageShows() {
  const [movies, setMovies] = useState([]);
  const [theatres, setTheatres] = useState([]);
  const [shows, setShows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  // Toolbar & Filtering State
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCity, setFilterCity] = useState("All");
  const [filterTheatre, setFilterTheatre] = useState("All");
  const [filterMovie, setFilterMovie] = useState("All");
  const [filterFormat, setFilterFormat] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [sortBy, setSortBy] = useState("showTime-asc");

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Add / Edit Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingShow, setEditingShow] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [forceConfirmed, setForceConfirmed] = useState(false);

  // View Seat Map Modal State
  const [viewingShow, setViewingShow] = useState(null);
  const [viewingSeats, setViewingSeats] = useState(null);
  const [loadingSeats, setLoadingSeats] = useState(false);

  // Delete Confirmation State
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmedWithBookings, setDeleteConfirmedWithBookings] = useState(false);

  // Default Form State
  const todayIso = new Date().toISOString().split("T")[0];
  const initialForm = {
    movie: "",
    theatre: "",
    screen: "Screen 1",
    showDate: todayIso,
    showTimeSlot: "19:00",
    format: "2D",
    language: "Hindi",
    durationMinutes: 150,
    status: "Upcoming",
    prices: {
      lower: 150,
      middle: 250,
      balcony: 350,
      recliner: 500,
      vip: 600,
    },
    basePrice: 150,
  };
  const [formData, setFormData] = useState(initialForm);

  // Load all foundational data
  const loadData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError("");

      const [moviesRes, theatresRes, showsRes] = await Promise.all([
        api.get("/api/movies"),
        api.get("/api/theatres"),
        api.get("/api/shows"),
      ]);

      const mList = Array.isArray(moviesRes.data) ? moviesRes.data : [];
      const tList = Array.isArray(theatresRes.data) ? theatresRes.data : [];
      const sList = Array.isArray(showsRes.data) ? showsRes.data : [];

      setMovies(mList);
      setTheatres(tList);
      setShows(sList);

      if (isRefresh) {
        toast.success("Show schedule synchronized with database.");
      }
    } catch {
      setError("Failed to load show management datasets from server.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Derived distinct cities and multiplex venues
  const distinctCities = useMemo(() => {
    const set = new Set();
    theatres.forEach((t) => {
      if (t.city) set.add(t.city.trim());
    });
    return Array.from(set).sort();
  }, [theatres]);

  // Derived available screens for currently selected theatre
  const currentTheatreObj = useMemo(() => {
    return theatres.find((t) => String(t._id) === String(formData.theatre));
  }, [theatres, formData.theatre]);

  const availableScreens = useMemo(() => {
    if (currentTheatreObj && Array.isArray(currentTheatreObj.screens) && currentTheatreObj.screens.length > 0) {
      return currentTheatreObj.screens;
    }
    return [
      "Screen 1",
      "Screen 2 (IMAX 3D)",
      "Screen 3 (4K Dolby)",
      "Audi 1 - VIP Recliner",
      "Audi 2 - Gold Class",
    ];
  }, [currentTheatreObj]);

  // Handle theatre change in form: auto update city, screens, and default pricing
  const handleTheatreChange = (theatreId) => {
    const selected = theatres.find((t) => String(t._id) === String(theatreId));
    const defaultPrices = selected?.prices || { lower: 150, middle: 250, balcony: 350 };
    const screens = selected?.screens?.length ? selected.screens : ["Screen 1", "Screen 2", "Screen 3"];

    setFormData((prev) => ({
      ...prev,
      theatre: theatreId,
      screen: screens[0] || "Screen 1",
      prices: {
        lower: defaultPrices.lower || 150,
        middle: defaultPrices.middle || 250,
        balcony: defaultPrices.balcony || 350,
        recliner: 500,
        vip: 600,
      },
      basePrice: defaultPrices.lower || 150,
    }));
  };

  // Handle movie change in form: auto update language, duration, and default format
  const handleMovieChange = (movieId) => {
    const selected = movies.find((m) => String(m._id) === String(movieId));
    if (selected) {
      setFormData((prev) => ({
        ...prev,
        movie: movieId,
        language: selected.language || "Hindi",
        durationMinutes: selected.duration || selected.runtime || 150,
      }));
    } else {
      setFormData((prev) => ({ ...prev, movie: movieId }));
    }
  };

  // Open Add Show Modal
  const handleOpenAddShow = () => {
    const defaultMovieId = movies[0]?._id || "";
    const defaultTheatreId = theatres[0]?._id || "";
    const defaultTheatre = theatres[0];
    const defaultPrices = defaultTheatre?.prices || { lower: 150, middle: 250, balcony: 350 };
    const screens = defaultTheatre?.screens?.length
      ? defaultTheatre.screens
      : ["Screen 1", "Screen 2", "Screen 3"];

    setEditingShow(null);
    setForceConfirmed(false);
    setFormData({
      movie: defaultMovieId,
      theatre: defaultTheatreId,
      screen: screens[0] || "Screen 1",
      showDate: todayIso,
      showTimeSlot: "19:00",
      format: "2D",
      language: movies[0]?.language || "Hindi",
      durationMinutes: movies[0]?.duration || 150,
      status: "Upcoming",
      prices: {
        lower: defaultPrices.lower || 150,
        middle: defaultPrices.middle || 250,
        balcony: defaultPrices.balcony || 350,
        recliner: 500,
        vip: 600,
      },
      basePrice: defaultPrices.lower || 150,
    });
    setModalOpen(true);
  };

  // Open Edit Show Modal
  const handleOpenEditShow = (show) => {
    setEditingShow(show);
    setForceConfirmed(false);

    const d = new Date(show.showTime);
    const dateStr = d.toISOString().split("T")[0];
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");

    const showPrices = show.prices || show.theatre?.prices || {
      lower: 150,
      middle: 250,
      balcony: 350,
    };

    setFormData({
      movie: show.movie?._id || show.movie || "",
      theatre: show.theatre?._id || show.theatre || "",
      screen: show.screen || "Screen 1",
      showDate: dateStr,
      showTimeSlot: `${hours}:${minutes}`,
      format: show.format || "2D",
      language: show.language || show.movie?.language || "Hindi",
      durationMinutes: show.durationMinutes || 150,
      status: show.status || "Upcoming",
      prices: {
        lower: showPrices.lower || 150,
        middle: showPrices.middle || 250,
        balcony: showPrices.balcony || 350,
        recliner: showPrices.recliner || 500,
        vip: showPrices.vip || 600,
      },
      basePrice: show.price || showPrices.lower || 150,
    });
    setModalOpen(true);
  };

  // Open View Seat Map Modal
  const handleViewSeatMap = async (show) => {
    setViewingShow(show);
    setViewingSeats(null);
    setLoadingSeats(true);
    try {
      const res = await api.get(`/api/shows/${show._id}/seats`);
      setViewingSeats(res.data);
    } catch {
      toast.error("Failed to load show seating chart.");
    } finally {
      setLoadingSeats(false);
    }
  };

  // Real-time client collision detector check
  const detectedConflict = useMemo(() => {
    if (!formData.theatre || !formData.screen || !formData.showDate || !formData.showTimeSlot) {
      return null;
    }

    try {
      const proposedStart = new Date(`${formData.showDate}T${formData.showTimeSlot}:00`);
      if (isNaN(proposedStart.getTime())) return null;

      const duration = Number(formData.durationMinutes) || 150;
      const proposedEnd = new Date(proposedStart.getTime() + duration * 60000);

      const overlap = shows.find((s) => {
        if (editingShow && s._id === editingShow._id) return false;
        if (s.status === "Cancelled") return false;
        const sTheatreId = s.theatre?._id || s.theatre;
        if (String(sTheatreId) !== String(formData.theatre)) return false;
        if ((s.screen || "Screen 1").trim().toLowerCase() !== formData.screen.trim().toLowerCase()) {
          return false;
        }

        const sStart = new Date(s.showTime);
        const sDuration = Number(s.durationMinutes) || 150;
        const sEnd = s.endTime ? new Date(s.endTime) : new Date(sStart.getTime() + sDuration * 60000);

        return proposedStart < sEnd && proposedEnd > sStart;
      });

      return overlap;
    } catch {
      return null;
    }
  }, [formData, shows, editingShow]);

  // Form Submission (Add or Update)
  const handleSubmitShow = async (e) => {
    e.preventDefault();

    if (!formData.movie || !formData.theatre) {
      toast.error("Please select both a movie and a multiplex theatre.");
      return;
    }

    const combinedDateTime = new Date(`${formData.showDate}T${formData.showTimeSlot}:00`);
    if (isNaN(combinedDateTime.getTime())) {
      toast.error("Invalid date or time slot.");
      return;
    }

    // Validation: No past dates
    if (combinedDateTime.getTime() < Date.now() - 5 * 60 * 1000) {
      toast.error("Show date and time cannot be scheduled in the past.");
      return;
    }

    const payload = {
      movie: formData.movie,
      theatre: formData.theatre,
      screen: formData.screen.trim(),
      showTime: combinedDateTime.toISOString(),
      durationMinutes: Number(formData.durationMinutes) || 150,
      format: formData.format,
      language: formData.language,
      price: Number(formData.basePrice) || Number(formData.prices.lower) || 150,
      prices: {
        lower: Number(formData.prices.lower) || 150,
        middle: Number(formData.prices.middle) || 250,
        balcony: Number(formData.prices.balcony) || 350,
        recliner: Number(formData.prices.recliner) || 500,
        vip: Number(formData.prices.vip) || 600,
      },
      status: formData.status || "Upcoming",
      forceConfirmed: Boolean(forceConfirmed),
    };

    try {
      setSubmitting(true);
      if (editingShow) {
        await api.put(`/api/shows/${editingShow._id}`, payload);
        toast.success("Show schedule updated successfully!");
      } else {
        await api.post("/api/shows", payload);
        toast.success("New screening scheduled successfully!");
      }
      setModalOpen(false);
      setEditingShow(null);
      loadData();
    } catch (err) {
      const data = err.response?.data;
      if (data?.requiresConfirmation) {
        toast.error(data.message, { duration: 6000 });
      } else {
        toast.error(data?.message || "Failed to schedule show.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Open Delete Confirmation Modal
  const handleOpenDelete = (show) => {
    const booked = show.bookedCount || show.bookedSeats?.length || 0;
    setDeleteTarget({
      id: show._id,
      title: `${show.movie?.title || "Movie"} at ${show.theatre?.name || "Theatre"} (${show.screen})`,
      bookedCount: booked,
    });
    setDeleteConfirmedWithBookings(false);
  };

  // Confirm Delete Show (with active booking check)
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    if (deleteTarget.bookedCount > 0 && !deleteConfirmedWithBookings) {
      toast.error("Please confirm that you want to cancel active reservations to delete this show.");
      return;
    }

    try {
      setDeleting(true);
      const forceQuery = deleteTarget.bookedCount > 0 ? "?force=true" : "";
      await api.delete(`/api/shows/${deleteTarget.id}${forceQuery}`);
      toast.success("Show deleted and associated slots released.");
      setDeleteTarget(null);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete show screening.");
    } finally {
      setDeleting(false);
    }
  };

  // Filter and Sort Processing
  const filteredShows = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();

    return shows.filter((s) => {
      // Search Match
      const movieTitle = s.movie?.title || s.movie?.movieName || "";
      const theatreName = s.theatre?.name || "";
      const city = s.theatre?.city || "";
      const screen = s.screen || "";
      const showId = s._id || "";

      const matchesSearch =
        !q ||
        movieTitle.toLowerCase().includes(q) ||
        theatreName.toLowerCase().includes(q) ||
        city.toLowerCase().includes(q) ||
        screen.toLowerCase().includes(q) ||
        showId.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      // Filter: City
      if (filterCity !== "All" && city.toLowerCase() !== filterCity.toLowerCase()) {
        return false;
      }

      // Filter: Theatre
      if (filterTheatre !== "All") {
        const tId = s.theatre?._id || s.theatre;
        if (String(tId) !== String(filterTheatre)) return false;
      }

      // Filter: Movie
      if (filterMovie !== "All") {
        const mId = s.movie?._id || s.movie;
        if (String(mId) !== String(filterMovie)) return false;
      }

      // Filter: Format
      if (filterFormat !== "All") {
        if ((s.format || "2D").toLowerCase() !== filterFormat.toLowerCase()) return false;
      }

      // Filter: Status
      if (filterStatus !== "All") {
        if ((s.status || "").toLowerCase() !== filterStatus.toLowerCase()) return false;
      }

      return true;
    });
  }, [shows, searchTerm, filterCity, filterTheatre, filterMovie, filterFormat, filterStatus]);

  // Sort Processed List
  const sortedShows = useMemo(() => {
    const list = [...filteredShows];
    switch (sortBy) {
      case "showTime-asc":
        return list.sort((a, b) => new Date(a.showTime) - new Date(b.showTime));
      case "showTime-desc":
        return list.sort((a, b) => new Date(b.showTime) - new Date(a.showTime));
      case "movie-asc":
        return list.sort((a, b) => {
          const tA = (a.movie?.title || "").toLowerCase();
          const tB = (b.movie?.title || "").toLowerCase();
          return tA.localeCompare(tB);
        });
      case "movie-desc":
        return list.sort((a, b) => {
          const tA = (a.movie?.title || "").toLowerCase();
          const tB = (b.movie?.title || "").toLowerCase();
          return tB.localeCompare(tA);
        });
      case "theatre-asc":
        return list.sort((a, b) => {
          const tA = (a.theatre?.name || "").toLowerCase();
          const tB = (b.theatre?.name || "").toLowerCase();
          return tA.localeCompare(tB);
        });
      case "price-asc":
        return list.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
      case "price-desc":
        return list.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
      case "seats-desc":
        return list.sort((a, b) => (Number(b.availableCount) || 0) - (Number(a.availableCount) || 0));
      case "seats-asc":
        return list.sort((a, b) => (Number(a.availableCount) || 0) - (Number(b.availableCount) || 0));
      default:
        return list;
    }
  }, [filteredShows, sortBy]);

  // Pagination calculation
  const totalPages = Math.ceil(sortedShows.length / pageSize) || 1;
  const paginatedShows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedShows.slice(start, start + pageSize);
  }, [sortedShows, currentPage, pageSize]);

  // Count summaries
  const countUpcoming = useMemo(() => shows.filter((s) => s.status === "Upcoming").length, [shows]);
  const countRunning = useMemo(() => shows.filter((s) => s.status === "Running").length, [shows]);
  const countCompleted = useMemo(() => shows.filter((s) => s.status === "Completed").length, [shows]);
  const countCancelled = useMemo(() => shows.filter((s) => s.status === "Cancelled").length, [shows]);

  // Reset Filters
  const handleResetFilters = () => {
    setSearchTerm("");
    setFilterCity("All");
    setFilterTheatre("All");
    setFilterMovie("All");
    setFilterFormat("All");
    setFilterStatus("All");
    setSortBy("showTime-asc");
    setCurrentPage(1);
  };

  const isFiltered =
    Boolean(searchTerm) ||
    filterCity !== "All" ||
    filterTheatre !== "All" ||
    filterMovie !== "All" ||
    filterFormat !== "All" ||
    filterStatus !== "All";

  // Export to CSV
  const handleExportCSV = () => {
    if (sortedShows.length === 0) {
      toast.error("No show data available to export.");
      return;
    }

    const headers = [
      "Show ID",
      "Movie Title",
      "Theatre Name",
      "Multiplex Chain",
      "Screen",
      "City",
      "Show Date",
      "Show Time",
      "Format",
      "Language",
      "Base Price (INR)",
      "Balcony Price (INR)",
      "Middle Price (INR)",
      "Lower Price (INR)",
      "Total Seats",
      "Booked Seats",
      "Available Seats",
      "Status",
      "Created Date",
      "Last Updated",
    ];

    const rows = sortedShows.map((s) => {
      const d = new Date(s.showTime);
      const dateStr = d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
      const timeStr = d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
      const createdStr = s.createdAt ? new Date(s.createdAt).toISOString().split("T")[0] : "";
      const updatedStr = s.updatedAt ? new Date(s.updatedAt).toISOString().split("T")[0] : "";

      return [
        `"${s._id}"`,
        `"${(s.movie?.title || s.movie?.movieName || "").replace(/"/g, '""')}"`,
        `"${(s.theatre?.name || "").replace(/"/g, '""')}"`,
        `"${(s.theatre?.chain || "PVR Cinemas").replace(/"/g, '""')}"`,
        `"${(s.screen || "Screen 1").replace(/"/g, '""')}"`,
        `"${(s.theatre?.city || "").replace(/"/g, '""')}"`,
        `"${dateStr}"`,
        `"${timeStr}"`,
        `"${s.format || "2D"}"`,
        `"${s.language || "Hindi"}"`,
        s.price || 150,
        s.prices?.balcony || 350,
        s.prices?.middle || 250,
        s.prices?.lower || 150,
        s.totalSeats || 100,
        s.bookedCount ?? (s.bookedSeats?.length || 0),
        s.availableCount ?? 100,
        `"${s.status || "Upcoming"}"`,
        `"${createdStr}"`,
        `"${updatedStr}"`,
      ].join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Screenly_Shows_Schedule_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Show schedule exported to CSV.");
  };

  // Export to JSON
  const handleExportJSON = () => {
    if (sortedShows.length === 0) {
      toast.error("No show data available to export.");
      return;
    }
    const blob = new Blob([JSON.stringify(sortedShows, null, 2)], {
      type: "application/json;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Screenly_Shows_Schedule_${new Date().toISOString().split("T")[0]}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Show schedule exported to JSON.");
  };

  // Helper: Copy Show ID
  const handleCopyShowId = (id) => {
    navigator.clipboard.writeText(id);
    toast.success(`Copied Show ID: ${id}`);
  };

  return (
    <div className="container-fluid px-3 px-md-4 py-4 fade-in" style={{ maxWidth: "1600px" }}>
      {/* Top Admin Horizontal Navigation Bar */}
      <AdminNav />

      {/* Header Section with Page Title, KPI Badges, and Primary Actions */}
      <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3 mb-4">
        <div>
          <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
            <h2 className="text-white fw-bold mb-0">Show Management</h2>
            <span className="badge bg-danger bg-opacity-25 text-danger border border-danger border-opacity-25 px-2 py-1">
              Active Screenings
            </span>
          </div>
          <p className="text-secondary small mb-0">
            Create, audit, filter, and dispatch multiplex screenings and tiered seat allocations across India
          </p>
        </div>

        {/* Action Controls */}
        <div className="d-flex flex-wrap align-items-center gap-2">
          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="btn btn-secondary-cinema btn-sm py-2 px-3 d-flex align-items-center gap-2"
            title="Reload show schedules"
          >
            <i className={`fa-solid fa-arrows-rotate ${refreshing ? "fa-spin text-danger" : ""}`}></i>
            <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
          </button>

          {/* Export Dropdown */}
          <div className="dropdown">
            <button
              className="btn btn-secondary-cinema btn-sm py-2 px-3 dropdown-toggle d-flex align-items-center gap-2"
              type="button"
              data-bs-toggle="dropdown"
              aria-expanded="false"
            >
              <i className="fa-solid fa-file-export text-info"></i>
              <span>Export</span>
            </button>
            <ul className="dropdown-menu dropdown-menu-dark shadow" style={{ background: "#151828" }}>
              <li>
                <button className="dropdown-item small py-2" onClick={handleExportCSV}>
                  <i className="fa-solid fa-file-csv me-2 text-success"></i> Export as CSV
                </button>
              </li>
              <li>
                <button className="dropdown-item small py-2" onClick={handleExportJSON}>
                  <i className="fa-solid fa-file-code me-2 text-warning"></i> Export as JSON
                </button>
              </li>
            </ul>
          </div>

          <button
            onClick={handleOpenAddShow}
            className="btn btn-cinema btn-sm py-2 px-4 fw-bold d-flex align-items-center gap-2 shadow"
          >
            <i className="fa-solid fa-plus"></i>
            <span>Add Show</span>
          </button>
        </div>
      </div>

      {/* KPI Metric Summary Strip */}
      <div className="row g-2 mb-4">
        <div className="col-6 col-md-3 col-xl">
          <div className="glass-panel p-3 rounded-3 d-flex align-items-center gap-3">
            <div
              className="rounded-circle p-2 d-flex align-items-center justify-content-center"
              style={{ background: "rgba(229, 9, 20, 0.15)", width: "42px", height: "42px" }}
            >
              <i className="fa-solid fa-film text-danger fs-5"></i>
            </div>
            <div>
              <div className="text-secondary small">Total Shows</div>
              <div className="text-white fw-bold fs-5">{shows.length}</div>
            </div>
          </div>
        </div>

        <div className="col-6 col-md-3 col-xl">
          <div className="glass-panel p-3 rounded-3 d-flex align-items-center gap-3">
            <div
              className="rounded-circle p-2 d-flex align-items-center justify-content-center"
              style={{ background: "rgba(6, 182, 212, 0.15)", width: "42px", height: "42px" }}
            >
              <i className="fa-solid fa-clock text-info fs-5"></i>
            </div>
            <div>
              <div className="text-secondary small">Upcoming</div>
              <div className="text-white fw-bold fs-5">{countUpcoming}</div>
            </div>
          </div>
        </div>

        <div className="col-6 col-md-3 col-xl">
          <div className="glass-panel p-3 rounded-3 d-flex align-items-center gap-3">
            <div
              className="rounded-circle p-2 d-flex align-items-center justify-content-center"
              style={{ background: "rgba(245, 158, 11, 0.15)", width: "42px", height: "42px" }}
            >
              <i className="fa-solid fa-play text-warning fs-5"></i>
            </div>
            <div>
              <div className="text-secondary small">Running</div>
              <div className="text-white fw-bold fs-5">{countRunning}</div>
            </div>
          </div>
        </div>

        <div className="col-6 col-md-3 col-xl">
          <div className="glass-panel p-3 rounded-3 d-flex align-items-center gap-3">
            <div
              className="rounded-circle p-2 d-flex align-items-center justify-content-center"
              style={{ background: "rgba(100, 116, 139, 0.15)", width: "42px", height: "42px" }}
            >
              <i className="fa-solid fa-check text-secondary fs-5"></i>
            </div>
            <div>
              <div className="text-secondary small">Completed</div>
              <div className="text-white fw-bold fs-5">{countCompleted}</div>
            </div>
          </div>
        </div>

        <div className="col-6 col-md-3 col-xl">
          <div className="glass-panel p-3 rounded-3 d-flex align-items-center gap-3">
            <div
              className="rounded-circle p-2 d-flex align-items-center justify-content-center"
              style={{ background: "rgba(239, 68, 68, 0.15)", width: "42px", height: "42px" }}
            >
              <i className="fa-solid fa-ban text-danger fs-5"></i>
            </div>
            <div>
              <div className="text-secondary small">Cancelled</div>
              <div className="text-white fw-bold fs-5">{countCancelled}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Container Card: Search, Filter Toolbar & Professional Data Table */}
      <div className="glass-panel p-3 p-md-4 mb-4" style={{ background: "#10121d" }}>
        {/* Toolbar: Search, Multi-Filter, Sorting & Row Limit */}
        <div className="row g-2 mb-3 align-items-center">
          {/* 1. Universal Search Input */}
          <div className="col-12 col-md-4 col-xl-3">
            <div className="input-group">
              <span className="input-group-text border-0" style={{ background: "#1a1d2d", color: "#94a3b8" }}>
                <i className="fa-solid fa-magnifying-glass"></i>
              </span>
              <input
                type="text"
                className="form-control cinema-input"
                placeholder="Search movie, venue, city, or ID..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                style={{ fontSize: "0.85rem" }}
              />
            </div>
          </div>

          {/* 2. City Filter */}
          <div className="col-6 col-md-2 col-xl-2">
            <select
              className="form-select cinema-input py-1 px-2"
              value={filterCity}
              onChange={(e) => {
                setFilterCity(e.target.value);
                setCurrentPage(1);
              }}
              style={{ fontSize: "0.82rem" }}
            >
              <option value="All">All Cities</option>
              {distinctCities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Theatre Filter */}
          <div className="col-6 col-md-3 col-xl-2">
            <select
              className="form-select cinema-input py-1 px-2"
              value={filterTheatre}
              onChange={(e) => {
                setFilterTheatre(e.target.value);
                setCurrentPage(1);
              }}
              style={{ fontSize: "0.82rem" }}
            >
              <option value="All">All Multiplexes</option>
              {theatres.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.name} ({t.city})
                </option>
              ))}
            </select>
          </div>

          {/* 4. Movie Filter */}
          <div className="col-6 col-md-3 col-xl-2">
            <select
              className="form-select cinema-input py-1 px-2"
              value={filterMovie}
              onChange={(e) => {
                setFilterMovie(e.target.value);
                setCurrentPage(1);
              }}
              style={{ fontSize: "0.82rem" }}
            >
              <option value="All">All Movies</option>
              {movies.map((m) => (
                <option key={m._id} value={m._id}>
                  {m.title || m.movieName}
                </option>
              ))}
            </select>
          </div>

          {/* 5. Format Filter */}
          <div className="col-6 col-md-2 col-xl-1">
            <select
              className="form-select cinema-input py-1 px-2"
              value={filterFormat}
              onChange={(e) => {
                setFilterFormat(e.target.value);
                setCurrentPage(1);
              }}
              style={{ fontSize: "0.82rem" }}
            >
              <option value="All">Format</option>
              {FORMAT_OPTIONS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>

          {/* 6. Status Filter */}
          <div className="col-6 col-md-2 col-xl-1">
            <select
              className="form-select cinema-input py-1 px-2"
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setCurrentPage(1);
              }}
              style={{ fontSize: "0.82rem" }}
            >
              <option value="All">Status</option>
              <option value="Upcoming">Upcoming</option>
              <option value="Running">Running</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          {/* 7. Sort Order Dropdown */}
          <div className="col-6 col-md-2 col-xl-1">
            <select
              className="form-select cinema-input py-1 px-2"
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setCurrentPage(1);
              }}
              style={{ fontSize: "0.82rem" }}
            >
              <option value="showTime-asc">Date (Soonest)</option>
              <option value="showTime-desc">Date (Latest)</option>
              <option value="movie-asc">Movie (A-Z)</option>
              <option value="movie-desc">Movie (Z-A)</option>
              <option value="theatre-asc">Theatre (A-Z)</option>
              <option value="price-asc">Price (Low-High)</option>
              <option value="price-desc">Price (High-Low)</option>
              <option value="seats-desc">Available Seats</option>
            </select>
          </div>
        </div>

        {/* Filter State Strip / Active Count */}
        <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
          <div className="text-secondary small">
            Showing <strong className="text-white">{sortedShows.length}</strong> show(s) scheduled across multiplexes
            {isFiltered && (
              <span className="ms-2 badge bg-secondary bg-opacity-25 text-info">Filters Active</span>
            )}
          </div>

          <div className="d-flex align-items-center gap-2">
            {isFiltered && (
              <button
                onClick={handleResetFilters}
                className="btn btn-outline-secondary btn-sm py-0 px-2 text-decoration-none"
                style={{ fontSize: "0.75rem" }}
              >
                <i className="fa-solid fa-xmark me-1"></i> Clear Filters
              </button>
            )}

            <div className="d-flex align-items-center gap-1 text-secondary small">
              <span>Rows:</span>
              <select
                className="form-select form-select-sm cinema-input py-0 px-2"
                style={{ width: "70px", fontSize: "0.78rem" }}
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
        </div>

        {/* Professional Data Table */}
        {loading ? (
          <div className="py-5">
            <LoadingSpinner message="Loading live multiplex schedule matrix..." />
          </div>
        ) : error ? (
          <div className="alert alert-danger py-3 text-center small">{error}</div>
        ) : paginatedShows.length === 0 ? (
          <div className="text-center py-5">
            <i className="fa-solid fa-calendar-xmark text-secondary fs-1 mb-3"></i>
            <h5 className="text-white fw-bold">No Scheduled Shows Found</h5>
            <p className="text-secondary small mb-3">
              {isFiltered
                ? "Try adjusting your search keywords or filter criteria."
                : "No screenings have been scheduled yet. Click 'Add Show' to get started."}
            </p>
            {isFiltered ? (
              <button onClick={handleResetFilters} className="btn btn-secondary-cinema btn-sm py-1 px-3">
                Reset Filters
              </button>
            ) : (
              <button onClick={handleOpenAddShow} className="btn btn-cinema btn-sm py-2 px-3 fw-bold">
                <i className="fa-solid fa-plus me-1"></i> Schedule First Show
              </button>
            )}
          </div>
        ) : (
          <div className="table-responsive" style={{ minHeight: "350px" }}>
            <table className="table table-dark table-hover align-middle mb-0" style={{ fontSize: "0.84rem" }}>
              <thead style={{ background: "#151828", color: "#94a3b8", fontSize: "0.78rem", textTransform: "uppercase" }}>
                <tr>
                  <th scope="col" style={{ width: "90px" }}>Show ID</th>
                  <th scope="col" style={{ width: "55px" }}>Poster</th>
                  <th scope="col">Movie Name</th>
                  <th scope="col">Theatre &amp; City</th>
                  <th scope="col">Screen</th>
                  <th scope="col">Date &amp; Time</th>
                  <th scope="col">Format / Lang</th>
                  <th scope="col">Base Price</th>
                  <th scope="col">Available</th>
                  <th scope="col">Booked</th>
                  <th scope="col">Status</th>
                  <th scope="col" className="text-end" style={{ minWidth: "130px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedShows.map((s) => {
                  const dateObj = new Date(s.showTime);
                  const formattedDate = dateObj.toLocaleDateString("en-IN", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  });
                  const formattedTime = dateObj.toLocaleTimeString("en-IN", {
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                  });

                  const booked = s.bookedCount ?? (s.bookedSeats?.length || 0);
                  const available = s.availableCount ?? Math.max(0, (s.totalSeats || 100) - booked);
                  const total = s.totalSeats || 100;
                  const percentAvailable = Math.round((available / total) * 100);

                  const shortId = (s._id || "").slice(-6);

                  return (
                    <tr key={s._id} style={{ borderColor: "rgba(255, 255, 255, 0.05)" }}>
                      {/* 1. Show ID */}
                      <td>
                        <button
                          onClick={() => handleCopyShowId(s._id)}
                          className="btn btn-link text-secondary p-0 text-decoration-none small d-flex align-items-center gap-1 font-monospace"
                          title={`Copy full ID: ${s._id}`}
                          style={{ fontSize: "0.78rem" }}
                        >
                          <span>#{shortId}</span>
                          <i className="fa-regular fa-copy" style={{ fontSize: "0.7rem" }}></i>
                        </button>
                      </td>

                      {/* 2. Movie Poster */}
                      <td>
                        <img
                          src={getPosterUrl(s.movie)}
                          alt={s.movie?.title || "Movie"}
                          className="rounded shadow-sm"
                          style={{ width: "36px", height: "50px", objectFit: "cover" }}
                          onError={(e) => handleImageError(e, s.movie?.title || s.movie?.movieName, s.movie?.tmdbId)}
                        />
                      </td>

                      {/* 3. Movie Name */}
                      <td>
                        <div className="fw-bold text-white text-truncate" style={{ maxWidth: "180px" }}>
                          {s.movie?.title || s.movie?.movieName || "Untitled Feature"}
                        </div>
                        <div className="d-flex align-items-center gap-1 mt-1 flex-wrap">
                          <span className="badge bg-secondary bg-opacity-50" style={{ fontSize: "0.65rem" }}>
                            {s.movie?.certification || "U/A"}
                          </span>
                          <span className="text-secondary" style={{ fontSize: "0.72rem" }}>
                            {s.durationMinutes || s.movie?.duration || 150}m
                          </span>
                        </div>
                      </td>

                      {/* 4. Theatre & City */}
                      <td>
                        <div className="fw-semibold text-light text-truncate" style={{ maxWidth: "160px" }}>
                          {s.theatre?.name || "Multiplex"}
                        </div>
                        <div className="d-flex align-items-center gap-1 mt-1">
                          <span className="badge bg-danger bg-opacity-25 text-danger" style={{ fontSize: "0.68rem" }}>
                            <i className="fa-solid fa-location-dot me-1"></i>
                            {s.theatre?.city || "India"}
                          </span>
                        </div>
                      </td>

                      {/* 5. Screen Name */}
                      <td>
                        <span className="badge bg-secondary bg-opacity-75 text-info fw-semibold font-monospace" style={{ fontSize: "0.74rem" }}>
                          {s.screen || "Screen 1"}
                        </span>
                      </td>

                      {/* 6. Show Date & Time */}
                      <td>
                        <div className="text-white fw-semibold">{formattedDate}</div>
                        <div className="text-warning small d-flex align-items-center gap-1 mt-1">
                          <i className="fa-solid fa-clock" style={{ fontSize: "0.7rem" }}></i>
                          <span>{formattedTime}</span>
                        </div>
                      </td>

                      {/* 7. Format & Language */}
                      <td>
                        <div className="d-flex flex-column gap-1">
                          <span className="badge bg-info bg-opacity-25 text-info" style={{ fontSize: "0.68rem", width: "fit-content" }}>
                            {s.format || "2D"}
                          </span>
                          <span className="text-secondary" style={{ fontSize: "0.72rem" }}>
                            {s.language || "Hindi"}
                          </span>
                        </div>
                      </td>

                      {/* 8. Base Ticket Price */}
                      <td>
                        <span className="fw-bold text-white">₹{s.price || s.prices?.lower || 150}</span>
                        <div className="text-secondary" style={{ fontSize: "0.68rem" }}>
                          B: ₹{s.prices?.balcony || 350} &bull; M: ₹{s.prices?.middle || 250}
                        </div>
                      </td>

                      {/* 9. Available Seats */}
                      <td>
                        <div className="fw-bold text-success">
                          {available} <span className="text-secondary fw-normal">/ {total}</span>
                        </div>
                        <div className="progress mt-1" style={{ height: "4px", background: "rgba(255,255,255,0.1)", width: "60px" }}>
                          <div
                            className="progress-bar bg-success"
                            role="progressbar"
                            style={{ width: `${percentAvailable}%` }}
                          ></div>
                        </div>
                      </td>

                      {/* 10. Booked Seats */}
                      <td>
                        <span className={`badge ${booked > 0 ? "bg-warning text-dark" : "bg-secondary bg-opacity-50"} fw-bold`}>
                          {booked} booked
                        </span>
                      </td>

                      {/* 11. Lifecycle Status */}
                      <td>
                        {s.status === "Completed" ? (
                          <span className="badge bg-secondary" style={{ fontSize: "0.72rem" }}>
                            Completed
                          </span>
                        ) : s.status === "Running" ? (
                          <span className="badge bg-warning text-dark fw-bold" style={{ fontSize: "0.72rem" }}>
                            <i className="fa-solid fa-circle-play me-1"></i> Running
                          </span>
                        ) : s.status === "Cancelled" ? (
                          <span className="badge bg-danger" style={{ fontSize: "0.72rem" }}>
                            Cancelled
                          </span>
                        ) : (
                          <span className="badge bg-info text-dark fw-bold" style={{ fontSize: "0.72rem" }}>
                            <i className="fa-solid fa-circle-check me-1"></i> Upcoming
                          </span>
                        )}
                      </td>

                      {/* 12. Actions */}
                      <td className="text-end">
                        <div className="btn-group btn-group-sm">
                          {/* View Seat Layout Matrix */}
                          <button
                            onClick={() => handleViewSeatMap(s)}
                            className="btn btn-outline-secondary py-1 px-2"
                            title="View Seating Matrix"
                          >
                            <i className="fa-solid fa-couch text-info"></i>
                          </button>

                          {/* Direct Public Seat Selection Link */}
                          <Link
                            to={`/seat-selection/${s._id}`}
                            target="_blank"
                            className="btn btn-outline-secondary py-1 px-2"
                            title="Open Customer Seat Selection Page"
                          >
                            <i className="fa-solid fa-arrow-up-right-from-square text-secondary"></i>
                          </Link>

                          {/* Edit Show Details */}
                          <button
                            onClick={() => handleOpenEditShow(s)}
                            className="btn btn-outline-warning py-1 px-2"
                            title="Edit Show Details"
                          >
                            <i className="fa-solid fa-pen-to-square"></i>
                          </button>

                          {/* Delete Show Screen */}
                          <button
                            onClick={() => handleOpenDelete(s)}
                            className="btn btn-outline-danger py-1 px-2"
                            title="Delete Screening"
                          >
                            <i className="fa-solid fa-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Toolbar */}
        {!loading && sortedShows.length > 0 && (
          <div className="mt-4 pt-3 border-top border-secondary border-opacity-25">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalItems={sortedShows.length}
            />
          </div>
        )}
      </div>

      {/* ================= MODAL: ADD / EDIT SHOW ================= */}
      {modalOpen && (
        <div
          className="modal show d-block fade-in"
          tabIndex="-1"
          style={{ background: "rgba(0,0,0,0.85)", zIndex: 1055 }}
        >
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content text-white" style={{ background: "#151828", border: "1px solid rgba(255,255,255,0.12)" }}>
              {/* Modal Header */}
              <div className="modal-header border-bottom border-secondary border-opacity-25 px-4">
                <div className="d-flex align-items-center gap-2">
                  <i className={`fa-solid ${editingShow ? "fa-pen-to-square text-warning" : "fa-clock text-danger"} fs-5`}></i>
                  <h5 className="modal-title fw-bold">
                    {editingShow ? "Edit Scheduled Screening" : "Schedule New Cinema Show"}
                  </h5>
                </div>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setModalOpen(false)}
                  disabled={submitting}
                ></button>
              </div>

              {/* Modal Form Body */}
              <form onSubmit={handleSubmitShow}>
                <div className="modal-body p-4">
                  {/* Real-time Conflict Alert */}
                  {detectedConflict && (
                    <div className="alert alert-warning py-2 px-3 small mb-3 d-flex align-items-center gap-2">
                      <i className="fa-solid fa-triangle-exclamation text-warning fs-5"></i>
                      <div>
                        <strong>Schedule Overlap Detected:</strong> &ldquo;
                        {detectedConflict.movie?.title || "Another show"}&rdquo; is already booked on &ldquo;
                        {formData.screen}&rdquo; at this multiplex during that time window.
                      </div>
                    </div>
                  )}

                  {/* Edit Mode Active Bookings Warning */}
                  {editingShow && (editingShow.bookedCount > 0 || (editingShow.bookedSeats?.length || 0) > 0) && (
                    <div className="alert alert-danger py-2 px-3 small mb-3">
                      <div className="d-flex align-items-center gap-2 mb-1">
                        <i className="fa-solid fa-triangle-exclamation text-danger fs-5"></i>
                        <strong>Notice: Active Bookings Exist</strong>
                      </div>
                      <p className="mb-2" style={{ fontSize: "0.78rem" }}>
                        This show has confirmed customer reservations. Shifting screen or showtimes will affect booked tickets.
                      </p>
                      <div className="form-check">
                        <input
                          type="checkbox"
                          className="form-check-input"
                          id="forceConfirmCheck"
                          checked={forceConfirmed}
                          onChange={(e) => setForceConfirmed(e.target.checked)}
                        />
                        <label className="form-check-label small fw-bold" htmlFor="forceConfirmCheck">
                          I confirm and authorize changing schedule with active bookings
                        </label>
                      </div>
                    </div>
                  )}

                  <div className="row g-3">
                    {/* 1. Movie Selector */}
                    <div className="col-12 col-md-6">
                      <label className="text-secondary small fw-bold mb-1 d-block">
                        Select Movie <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-select cinema-input"
                        value={formData.movie}
                        onChange={(e) => handleMovieChange(e.target.value)}
                        required
                      >
                        {movies.map((m) => (
                          <option key={m._id} value={m._id}>
                            {m.title || m.movieName} ({m.language || "Hindi"}) &mdash; {m.certification || "U/A"}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* 2. Multiplex Theatre Selector */}
                    <div className="col-12 col-md-6">
                      <label className="text-secondary small fw-bold mb-1 d-block">
                        Select Multiplex Venue <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-select cinema-input"
                        value={formData.theatre}
                        onChange={(e) => handleTheatreChange(e.target.value)}
                        required
                      >
                        {theatres.map((t) => (
                          <option key={t._id} value={t._id}>
                            {t.name} &mdash; {t.city}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* 3. Screen Selector (Dynamically populated from chosen theatre) */}
                    <div className="col-12 col-md-4">
                      <label className="text-secondary small fw-bold mb-1 d-block">
                        Auditorium / Screen <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-select cinema-input"
                        value={formData.screen}
                        onChange={(e) => setFormData({ ...formData, screen: e.target.value })}
                        required
                      >
                        {availableScreens.map((sc) => (
                          <option key={sc} value={sc}>
                            {sc}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* 4. City (Auto-populated badge/read-only) */}
                    <div className="col-12 col-md-4">
                      <label className="text-secondary small fw-bold mb-1 d-block">
                        City Location (Auto-populated)
                      </label>
                      <div className="form-control cinema-input d-flex align-items-center gap-2 text-secondary bg-opacity-50">
                        <i className="fa-solid fa-location-dot text-danger"></i>
                        <span className="text-white fw-semibold">{currentTheatreObj?.city || "Select Theatre"}</span>
                      </div>
                    </div>

                    {/* 5. Movie Format Selector */}
                    <div className="col-12 col-md-4">
                      <label className="text-secondary small fw-bold mb-1 d-block">
                        Movie Format <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-select cinema-input"
                        value={formData.format}
                        onChange={(e) => setFormData({ ...formData, format: e.target.value })}
                        required
                      >
                        {FORMAT_OPTIONS.map((f) => (
                          <option key={f} value={f}>
                            {f}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* 6. Language Selector */}
                    <div className="col-12 col-md-4">
                      <label className="text-secondary small fw-bold mb-1 d-block">
                        Language <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-select cinema-input"
                        value={formData.language}
                        onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                        required
                      >
                        {LANGUAGE_OPTIONS.map((lang) => (
                          <option key={lang} value={lang}>
                            {lang}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* 7. Show Date Picker (Forbids past dates) */}
                    <div className="col-12 col-md-4">
                      <label className="text-secondary small fw-bold mb-1 d-block">
                        Screening Date <span className="text-danger">*</span>
                      </label>
                      <input
                        type="date"
                        className="form-control cinema-input"
                        min={todayIso}
                        value={formData.showDate}
                        onChange={(e) => setFormData({ ...formData, showDate: e.target.value })}
                        required
                      />
                    </div>

                    {/* 8. Show Time Picker */}
                    <div className="col-12 col-md-4">
                      <label className="text-secondary small fw-bold mb-1 d-block">
                        Showtime Slot <span className="text-danger">*</span>
                      </label>
                      <input
                        type="time"
                        className="form-control cinema-input"
                        value={formData.showTimeSlot}
                        onChange={(e) => setFormData({ ...formData, showTimeSlot: e.target.value })}
                        required
                      />
                    </div>

                    {/* Quick Preset Buttons for Showtimes */}
                    <div className="col-12">
                      <label className="text-secondary small mb-1 d-block" style={{ fontSize: "0.75rem" }}>
                        Quick Time Slot Presets:
                      </label>
                      <div className="d-flex flex-wrap gap-2">
                        {TIME_PRESETS.map((preset) => {
                          const isSelected = formData.showTimeSlot === preset.slot;
                          return (
                            <button
                              key={preset.slot}
                              type="button"
                              onClick={() => setFormData({ ...formData, showTimeSlot: preset.slot })}
                              className={`btn btn-sm py-1 px-3 rounded-pill ${
                                isSelected ? "btn-cinema" : "btn-secondary-cinema"
                              }`}
                              style={{ fontSize: "0.78rem" }}
                            >
                              <i className="fa-solid fa-clock me-1" style={{ fontSize: "0.68rem" }}></i>
                              {preset.label} &bull; {preset.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Tiered Pricing Configuration Section */}
                    <div className="col-12">
                      <div className="p-3 rounded-3" style={{ background: "#10121d", border: "1px solid rgba(255,255,255,0.08)" }}>
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <h6 className="text-white fw-bold mb-0" style={{ fontSize: "0.85rem" }}>
                            <i className="fa-solid fa-tags text-warning me-2"></i> Tiered Seat Pricing (INR)
                          </h6>
                          <span className="text-secondary small" style={{ fontSize: "0.72rem" }}>
                            Inherited from theatre defaults or customize
                          </span>
                        </div>

                        <div className="row g-2">
                          <div className="col-6 col-md">
                            <label className="text-secondary small d-block" style={{ fontSize: "0.72rem" }}>
                              Lower / Silver
                            </label>
                            <div className="input-group input-group-sm">
                              <span className="input-group-text cinema-input border-0">₹</span>
                              <input
                                type="number"
                                min={50}
                                max={5000}
                                className="form-control cinema-input"
                                value={formData.prices.lower}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    prices: { ...formData.prices, lower: Number(e.target.value) },
                                    basePrice: Number(e.target.value),
                                  })
                                }
                                required
                              />
                            </div>
                          </div>

                          <div className="col-6 col-md">
                            <label className="text-secondary small d-block" style={{ fontSize: "0.72rem" }}>
                              Middle / Gold
                            </label>
                            <div className="input-group input-group-sm">
                              <span className="input-group-text cinema-input border-0">₹</span>
                              <input
                                type="number"
                                min={50}
                                max={5000}
                                className="form-control cinema-input"
                                value={formData.prices.middle}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    prices: { ...formData.prices, middle: Number(e.target.value) },
                                  })
                                }
                                required
                              />
                            </div>
                          </div>

                          <div className="col-6 col-md">
                            <label className="text-secondary small d-block" style={{ fontSize: "0.72rem" }}>
                              Balcony / Platinum
                            </label>
                            <div className="input-group input-group-sm">
                              <span className="input-group-text cinema-input border-0">₹</span>
                              <input
                                type="number"
                                min={50}
                                max={5000}
                                className="form-control cinema-input"
                                value={formData.prices.balcony}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    prices: { ...formData.prices, balcony: Number(e.target.value) },
                                  })
                                }
                                required
                              />
                            </div>
                          </div>

                          <div className="col-6 col-md">
                            <label className="text-secondary small d-block" style={{ fontSize: "0.72rem" }}>
                              Recliner
                            </label>
                            <div className="input-group input-group-sm">
                              <span className="input-group-text cinema-input border-0">₹</span>
                              <input
                                type="number"
                                min={50}
                                max={5000}
                                className="form-control cinema-input"
                                value={formData.prices.recliner}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    prices: { ...formData.prices, recliner: Number(e.target.value) },
                                  })
                                }
                              />
                            </div>
                          </div>

                          <div className="col-6 col-md">
                            <label className="text-secondary small d-block" style={{ fontSize: "0.72rem" }}>
                              VIP Club
                            </label>
                            <div className="input-group input-group-sm">
                              <span className="input-group-text cinema-input border-0">₹</span>
                              <input
                                type="number"
                                min={50}
                                max={5000}
                                className="form-control cinema-input"
                                value={formData.prices.vip}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    prices: { ...formData.prices, vip: Number(e.target.value) },
                                  })
                                }
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Seat Layout Live Preview Box */}
                    <div className="col-12">
                      <div className="p-3 rounded-3" style={{ background: "#10121d", border: "1px solid rgba(255,255,255,0.08)" }}>
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <span className="text-white small fw-bold">
                            <i className="fa-solid fa-chair text-info me-1"></i> Seating Allocation &amp; Layout Preview
                          </span>
                          <span className="badge bg-secondary bg-opacity-50 small">
                            Total: {(currentTheatreObj?.seats?.balcony || 20) + (currentTheatreObj?.seats?.middle || 40) + (currentTheatreObj?.seats?.lower || 40)} Seats
                          </span>
                        </div>

                        {/* Visual mini representation of tiers */}
                        <div className="d-flex flex-column gap-2 text-center py-2" style={{ background: "rgba(0,0,0,0.3)", borderRadius: "8px" }}>
                          {/* Screen Representation */}
                          <div className="mx-auto my-1 py-1 px-4 text-secondary small border-top border-info border-2" style={{ width: "60%", fontSize: "0.7rem", letterSpacing: "2px" }}>
                            CINEMA PROJECTION SCREEN
                          </div>

                          {/* Balcony Row Preview */}
                          <div className="d-flex justify-content-center align-items-center gap-1">
                            <span className="text-secondary small" style={{ width: "65px", fontSize: "0.68rem" }}>Balcony:</span>
                            <div className="d-flex gap-1">
                              {Array.from({ length: 12 }, (_, i) => (
                                <div key={i} style={{ width: "12px", height: "10px", background: "#f59e0b", borderRadius: "2px" }} title="Balcony Seat"></div>
                              ))}
                            </div>
                            <span className="text-warning small ms-2" style={{ fontSize: "0.7rem" }}>
                              {currentTheatreObj?.seats?.balcony || 20} seats @ ₹{formData.prices.balcony}
                            </span>
                          </div>

                          {/* Middle Row Preview */}
                          <div className="d-flex justify-content-center align-items-center gap-1">
                            <span className="text-secondary small" style={{ width: "65px", fontSize: "0.68rem" }}>Middle:</span>
                            <div className="d-flex gap-1">
                              {Array.from({ length: 16 }, (_, i) => (
                                <div key={i} style={{ width: "12px", height: "10px", background: "#06b6d4", borderRadius: "2px" }} title="Middle Seat"></div>
                              ))}
                            </div>
                            <span className="text-info small ms-2" style={{ fontSize: "0.7rem" }}>
                              {currentTheatreObj?.seats?.middle || 40} seats @ ₹{formData.prices.middle}
                            </span>
                          </div>

                          {/* Lower Row Preview */}
                          <div className="d-flex justify-content-center align-items-center gap-1">
                            <span className="text-secondary small" style={{ width: "65px", fontSize: "0.68rem" }}>Lower:</span>
                            <div className="d-flex gap-1">
                              {Array.from({ length: 16 }, (_, i) => (
                                <div key={i} style={{ width: "12px", height: "10px", background: "#10b981", borderRadius: "2px" }} title="Lower Seat"></div>
                              ))}
                            </div>
                            <span className="text-success small ms-2" style={{ fontSize: "0.7rem" }}>
                              {currentTheatreObj?.seats?.lower || 40} seats @ ₹{formData.prices.lower}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Status selector (for Edit mode) */}
                    {editingShow && (
                      <div className="col-12 col-md-6">
                        <label className="text-secondary small fw-bold mb-1 d-block">
                          Screening Status Override
                        </label>
                        <select
                          className="form-select cinema-input"
                          value={formData.status}
                          onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        >
                          <option value="Upcoming">Upcoming (Booking Open)</option>
                          <option value="Running">Running (In Theatres)</option>
                          <option value="Completed">Completed (Past)</option>
                          <option value="Cancelled">Cancelled</option>
                        </select>
                      </div>
                    )}
                  </div>
                </div>

                {/* Modal Footer Actions */}
                <div className="modal-footer border-top border-secondary border-opacity-25 px-4 py-3">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="btn btn-secondary-cinema px-4"
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn btn-cinema px-5 fw-bold"
                  >
                    {submitting ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Saving Schedule...
                      </>
                    ) : editingShow ? (
                      "Update Show Schedule"
                    ) : (
                      "Schedule Show"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: VIEW SEATING MATRIX ================= */}
      {viewingShow && (
        <div
          className="modal show d-block fade-in"
          tabIndex="-1"
          style={{ background: "rgba(0,0,0,0.85)", zIndex: 1055 }}
        >
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content text-white" style={{ background: "#151828", border: "1px solid rgba(255,255,255,0.12)" }}>
              <div className="modal-header border-bottom border-secondary border-opacity-25 px-4">
                <div className="d-flex align-items-center gap-2">
                  <i className="fa-solid fa-couch text-info fs-5"></i>
                  <div>
                    <h5 className="modal-title fw-bold mb-0">
                      Seating Matrix: {viewingShow.movie?.title || "Movie"}
                    </h5>
                    <span className="text-secondary small">
                      {viewingShow.theatre?.name} &bull; {viewingShow.screen} &bull; {viewingShow.theatre?.city}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setViewingShow(null)}
                ></button>
              </div>

              <div className="modal-body p-4 text-center">
                {loadingSeats ? (
                  <LoadingSpinner message="Retrieving real-time seat inventory..." />
                ) : viewingSeats ? (
                  <div>
                    {/* Capacity Overview Pills */}
                    <div className="d-flex justify-content-center gap-3 mb-4 flex-wrap">
                      <div className="glass-card px-3 py-2 text-center" style={{ minWidth: "100px" }}>
                        <div className="text-secondary small" style={{ fontSize: "0.7rem" }}>AVAILABLE</div>
                        <div className="text-success fw-bold fs-5">{viewingSeats.availableCount}</div>
                      </div>
                      <div className="glass-card px-3 py-2 text-center" style={{ minWidth: "100px" }}>
                        <div className="text-secondary small" style={{ fontSize: "0.7rem" }}>BOOKED</div>
                        <div className="text-danger fw-bold fs-5">{viewingSeats.bookedCount}</div>
                      </div>
                      <div className="glass-card px-3 py-2 text-center" style={{ minWidth: "100px" }}>
                        <div className="text-secondary small" style={{ fontSize: "0.7rem" }}>HELD (RESERVED)</div>
                        <div className="text-warning fw-bold fs-5">{viewingSeats.reservedCount}</div>
                      </div>
                      <div className="glass-card px-3 py-2 text-center" style={{ minWidth: "100px" }}>
                        <div className="text-secondary small" style={{ fontSize: "0.7rem" }}>TOTAL CAPACITY</div>
                        <div className="text-white fw-bold fs-5">{viewingSeats.totalSeats}</div>
                      </div>
                    </div>

                    {/* Legend */}
                    <div className="d-flex justify-content-center gap-3 mb-4 small">
                      <div className="d-flex align-items-center gap-1">
                        <span style={{ width: "12px", height: "12px", background: "#10b981", borderRadius: "2px" }}></span>
                        <span className="text-secondary">Available</span>
                      </div>
                      <div className="d-flex align-items-center gap-1">
                        <span style={{ width: "12px", height: "12px", background: "#f59e0b", borderRadius: "2px" }}></span>
                        <span className="text-secondary">Reserved (Hold)</span>
                      </div>
                      <div className="d-flex align-items-center gap-1">
                        <span style={{ width: "12px", height: "12px", background: "#ef4444", borderRadius: "2px" }}></span>
                        <span className="text-secondary">Booked (Sold)</span>
                      </div>
                    </div>

                    {/* Projection Screen Indicator */}
                    <div className="mx-auto mb-4 py-1 text-secondary small border-top border-info border-2" style={{ maxWidth: "450px", letterSpacing: "3px" }}>
                      AUDITORIUM SCREEN
                    </div>

                    {/* Balcony Row */}
                    <div className="mb-3">
                      <div className="text-warning small fw-bold mb-1">
                        Balcony Section (₹{viewingShow.prices?.balcony || 350})
                      </div>
                      <div className="d-flex flex-wrap justify-content-center gap-1" style={{ maxWidth: "550px", margin: "0 auto" }}>
                        {viewingSeats.seats?.balcony?.map((seat) => {
                          const bg = seat.status === "booked" ? "#ef4444" : seat.status === "reserved" ? "#f59e0b" : "#10b981";
                          return (
                            <div
                              key={seat.id}
                              className="text-dark fw-bold d-flex align-items-center justify-content-center"
                              style={{
                                width: "26px",
                                height: "24px",
                                background: bg,
                                borderRadius: "4px",
                                fontSize: "0.68rem",
                              }}
                              title={`${seat.id} - ${seat.status} (₹${seat.price})`}
                            >
                              {seat.id}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Middle Row */}
                    <div className="mb-3">
                      <div className="text-info small fw-bold mb-1">
                        Middle Section (₹{viewingShow.prices?.middle || 250})
                      </div>
                      <div className="d-flex flex-wrap justify-content-center gap-1" style={{ maxWidth: "550px", margin: "0 auto" }}>
                        {viewingSeats.seats?.middle?.map((seat) => {
                          const bg = seat.status === "booked" ? "#ef4444" : seat.status === "reserved" ? "#f59e0b" : "#10b981";
                          return (
                            <div
                              key={seat.id}
                              className="text-dark fw-bold d-flex align-items-center justify-content-center"
                              style={{
                                width: "26px",
                                height: "24px",
                                background: bg,
                                borderRadius: "4px",
                                fontSize: "0.68rem",
                              }}
                              title={`${seat.id} - ${seat.status} (₹${seat.price})`}
                            >
                              {seat.id}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Lower Row */}
                    <div className="mb-3">
                      <div className="text-success small fw-bold mb-1">
                        Lower Section (₹{viewingShow.prices?.lower || 150})
                      </div>
                      <div className="d-flex flex-wrap justify-content-center gap-1" style={{ maxWidth: "550px", margin: "0 auto" }}>
                        {viewingSeats.seats?.lower?.map((seat) => {
                          const bg = seat.status === "booked" ? "#ef4444" : seat.status === "reserved" ? "#f59e0b" : "#10b981";
                          return (
                            <div
                              key={seat.id}
                              className="text-dark fw-bold d-flex align-items-center justify-content-center"
                              style={{
                                width: "26px",
                                height: "24px",
                                background: bg,
                                borderRadius: "4px",
                                fontSize: "0.68rem",
                              }}
                              title={`${seat.id} - ${seat.status} (₹${seat.price})`}
                            >
                              {seat.id}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-secondary py-4">Unable to display seating arrangement.</div>
                )}
              </div>

              <div className="modal-footer border-top border-secondary border-opacity-25 px-4">
                <Link
                  to={`/seat-selection/${viewingShow._id}`}
                  target="_blank"
                  className="btn btn-secondary-cinema btn-sm py-1 px-3 d-flex align-items-center gap-1"
                >
                  <i className="fa-solid fa-arrow-up-right-from-square"></i> Open Public Seat Selection
                </Link>
                <button
                  type="button"
                  onClick={() => setViewingShow(null)}
                  className="btn btn-cinema btn-sm py-1 px-4"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: DELETE CONFIRMATION WITH BOOKING SAFEGUARD ================= */}
      {deleteTarget && (
        <ConfirmModal
          isOpen={Boolean(deleteTarget)}
          title="Confirm Show Screening Deletion"
          message={
            deleteTarget.bookedCount > 0
              ? `CAUTION: Screening "${deleteTarget.title}" currently has ${deleteTarget.bookedCount} active ticket booking(s). Deleting this show will cancel those reservations and issue refunds. To proceed, please confirm.`
              : `Are you sure you want to remove screening "${deleteTarget.title}"? Unused showtime slots will be immediately released.`
          }
          confirmLabel={deleteTarget.bookedCount > 0 ? "Cancel Bookings & Delete Show" : "Yes, Delete Show"}
          confirmVariant="danger"
          loading={deleting}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteTarget(null)}
        >
          {deleteTarget.bookedCount > 0 && (
            <div className="mt-3 p-3 rounded-2" style={{ background: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.3)" }}>
              <div className="form-check">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id="confirmDeleteBookingsCheck"
                  checked={deleteConfirmedWithBookings}
                  onChange={(e) => setDeleteConfirmedWithBookings(e.target.checked)}
                />
                <label className="form-check-label small fw-bold text-white" htmlFor="confirmDeleteBookingsCheck">
                  I understand that deleting this show will cancel {deleteTarget.bookedCount} customer reservation(s)
                </label>
              </div>
            </div>
          )}
        </ConfirmModal>
      )}
    </div>
  );
}
