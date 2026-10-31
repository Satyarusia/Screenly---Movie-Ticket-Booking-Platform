// client/src/pages/admin/ManageTheatres.jsx
import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import api from "../../services/api";
import LoadingSpinner from "../../components/LoadingSpinner";
import ConfirmModal from "../../components/ConfirmModal";
import Pagination from "../../components/Pagination";
import AdminNav from "../../components/AdminNav";
import toast from "react-hot-toast";

export default function ManageTheatres() {
  const [theatres, setTheatres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Search & Pagination
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Delete Target Modal
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const initialForm = {
    name: "",
    city: "Mumbai",
    location: "",
    seats: { lower: 30, middle: 40, balcony: 20 },
    prices: { lower: 150, middle: 250, balcony: 350 },
  };

  const [formData, setFormData] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);

  const fetchTheatres = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/theatres");
      setTheatres(Array.isArray(res.data) ? res.data : []);
    } catch {
      setError("Could not load theatres from server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTheatres();
  }, [fetchTheatres]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!formData.name.trim() || !formData.city.trim()) {
      toast.error("Theatre name and city are required.");
      return;
    }

    try {
      setSubmitting(true);
      if (editingId) {
        await api.put(`/api/theatres/${editingId}`, formData);
        toast.success(`Theatre "${formData.name}" updated successfully!`);
        setSuccess("Theatre updated successfully!");
        setEditingId(null);
      } else {
        await api.post("/api/theatres", formData);
        toast.success(`Theatre "${formData.name}" added successfully!`);
        setSuccess("Theatre created successfully!");
      }
      setFormData(initialForm);
      fetchTheatres();
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to save theatre.";
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (t) => {
    setEditingId(t._id || t.id);
    setFormData({
      name: t.name || "",
      city: t.city || "Mumbai",
      location: t.location || "",
      seats: {
        lower: t.seats?.lower || 30,
        middle: t.seats?.middle || 40,
        balcony: t.seats?.balcony || 20,
      },
      prices: {
        lower: t.prices?.lower || 150,
        middle: t.prices?.middle || 250,
        balcony: t.prices?.balcony || 350,
      },
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const confirmDeleteTheatre = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await api.delete(`/api/theatres/${deleteTarget.id}`);
      toast.success(`Theatre "${deleteTarget.name}" deleted.`);
      setDeleteTarget(null);
      fetchTheatres();
    } catch {
      toast.error("Failed to delete theatre.");
    } finally {
      setDeleting(false);
    }
  };

  const filteredTheatres = theatres.filter((t) => {
    const q = search.toLowerCase();
    return (
      (t.name || "").toLowerCase().includes(q) ||
      (t.city || "").toLowerCase().includes(q) ||
      (t.location || "").toLowerCase().includes(q)
    );
  });

  const totalPages = Math.ceil(filteredTheatres.length / itemsPerPage) || 1;
  const paginatedTheatres = filteredTheatres.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="container py-4 fade-in" style={{ maxWidth: "1000px" }}>
      {/* Top Admin Navigation */}
      <AdminNav />

      <div className="mb-3 d-flex justify-content-between align-items-center">
        <Link to="/admin" className="text-secondary small text-decoration-none">
          &larr; Admin Dashboard
        </Link>
        <Link to="/admin/shows" className="btn btn-secondary-cinema btn-sm py-1 px-3">
          <i className="fa-solid fa-clock me-1 text-danger"></i> Schedule Shows
        </Link>
      </div>

      {/* Add Theatre Form Card */}
      <div className="glass-panel p-4 p-md-5 mb-5" style={{ background: "#151828" }}>
        <h3 className="text-white fw-bold text-center mb-4">
          {editingId ? "Edit Theatre Details" : "Add Theatre Venue"}
        </h3>

        {error && <div className="alert alert-danger py-2 small">{error}</div>}
        {success && <div className="alert alert-success py-2 small">{success}</div>}

        <form onSubmit={handleSubmit}>
          <div className="row g-3">
            <div className="col-12 col-md-7">
              <label className="text-secondary small fw-bold mb-1 d-block">Theatre Name *</label>
              <input
                type="text"
                className="form-control cinema-input"
                placeholder="e.g. PVR Cinemas, INOX Megaplex, Cinepolis VIP"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="col-12 col-md-5">
              <label className="text-secondary small fw-bold mb-1 d-block">City *</label>
              <input
                type="text"
                className="form-control cinema-input"
                placeholder="e.g. Mumbai, Indore, Bhopal"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                required
              />
            </div>

            <div className="col-12">
              <label className="text-secondary small fw-bold mb-1 d-block">Location / Address</label>
              <input
                type="text"
                className="form-control cinema-input"
                placeholder="e.g. Phoenix Palladium Mall, Lower Parel"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            </div>

            {/* Tiered Seats Breakdown */}
            <div className="col-12 mt-4">
              <h6 className="text-white fw-bold mb-2 border-bottom border-secondary border-opacity-25 pb-2">
                Auditorium Capacity &amp; Tier Pricing
              </h6>
              <div className="row g-3">
                <div className="col-12 col-md-4">
                  <div className="p-3 rounded-2 border border-secondary border-opacity-25" style={{ background: "rgba(255,255,255,0.02)" }}>
                    <span className="badge bg-warning text-dark fw-bold mb-2">Balcony Recliner</span>
                    <div className="mb-2">
                      <label className="text-secondary small mb-1 d-block">Seat Count</label>
                      <input
                        type="number"
                        className="form-control cinema-input"
                        value={formData.seats.balcony}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            seats: { ...formData.seats, balcony: Number(e.target.value) },
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="text-secondary small mb-1 d-block">Price (₹)</label>
                      <input
                        type="number"
                        className="form-control cinema-input"
                        value={formData.prices.balcony}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            prices: { ...formData.prices, balcony: Number(e.target.value) },
                          })
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="col-12 col-md-4">
                  <div className="p-3 rounded-2 border border-secondary border-opacity-25" style={{ background: "rgba(255,255,255,0.02)" }}>
                    <span className="badge bg-primary fw-bold mb-2">Middle Executive</span>
                    <div className="mb-2">
                      <label className="text-secondary small mb-1 d-block">Seat Count</label>
                      <input
                        type="number"
                        className="form-control cinema-input"
                        value={formData.seats.middle}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            seats: { ...formData.seats, middle: Number(e.target.value) },
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="text-secondary small mb-1 d-block">Price (₹)</label>
                      <input
                        type="number"
                        className="form-control cinema-input"
                        value={formData.prices.middle}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            prices: { ...formData.prices, middle: Number(e.target.value) },
                          })
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="col-12 col-md-4">
                  <div className="p-3 rounded-2 border border-secondary border-opacity-25" style={{ background: "rgba(255,255,255,0.02)" }}>
                    <span className="badge bg-secondary fw-bold mb-2">Lower Class</span>
                    <div className="mb-2">
                      <label className="text-secondary small mb-1 d-block">Seat Count</label>
                      <input
                        type="number"
                        className="form-control cinema-input"
                        value={formData.seats.lower}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            seats: { ...formData.seats, lower: Number(e.target.value) },
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="text-secondary small mb-1 d-block">Price (₹)</label>
                      <input
                        type="number"
                        className="form-control cinema-input"
                        value={formData.prices.lower}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            prices: { ...formData.prices, lower: Number(e.target.value) },
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="text-end mt-4 pt-3 border-top border-secondary border-opacity-25">
            {editingId && (
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setFormData(initialForm);
                }}
                className="btn btn-secondary-cinema me-2 px-4 py-2"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="btn btn-cinema px-5 py-2 fw-bold"
            >
              {submitting ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2"></span> Saving...
                </>
              ) : editingId ? (
                "Update Theatre"
              ) : (
                "Add Theatre"
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Theatres Directory */}
      <div className="glass-panel p-4 mb-4">
        <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-2 mb-4">
          <div>
            <h4 className="text-white fw-bold mb-0">Active Multiplexes ({filteredTheatres.length})</h4>
            <span className="text-secondary small">Registered cinema partner venues</span>
          </div>
          <input
            type="text"
            className="form-control cinema-input py-1 px-3"
            placeholder="Search venue or city..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            style={{ width: "220px", fontSize: "0.85rem" }}
          />
        </div>

        {loading ? (
          <LoadingSpinner message="Retrieving multiplex partners..." />
        ) : paginatedTheatres.length === 0 ? (
          <div className="text-center py-4 text-secondary">No theatres found.</div>
        ) : (
          <div className="row row-cols-1 row-cols-md-2 g-3">
            {paginatedTheatres.map((t) => {
              const totalSeats =
                (t.seats?.lower || 30) + (t.seats?.middle || 40) + (t.seats?.balcony || 20);
              return (
                <div key={t._id} className="col">
                  <div className="glass-card p-3 h-100 d-flex flex-column justify-content-between">
                    <div>
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <h5 className="text-white fw-bold mb-0">{t.name}</h5>
                        <span className="badge bg-danger small">{t.city}</span>
                      </div>
                      <div className="text-secondary small mb-2">
                        <i className="fa-solid fa-location-dot me-1 text-danger"></i>
                        {t.location || "City Centre"}
                      </div>
                      <div className="small text-secondary">
                        Capacity: <strong className="text-white">{totalSeats} Seats</strong> &bull; Balcony: ₹{t.prices?.balcony || 350} &bull; Middle: ₹{t.prices?.middle || 250} &bull; Lower: ₹{t.prices?.lower || 150}
                      </div>
                    </div>

                    <div className="text-end pt-3 mt-3 border-top border-secondary border-opacity-25">
                      <button
                        onClick={() => handleEdit(t)}
                        className="btn btn-sm btn-outline-warning py-1 px-3 me-2"
                        title="Edit theatre details"
                      >
                        <i className="fa-solid fa-pen-to-square me-1"></i> Edit
                      </button>
                      <button
                        onClick={() => setDeleteTarget({ id: t._id, name: t.name })}
                        className="btn btn-sm btn-danger py-1 px-3"
                        title="Delete theatre"
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
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          totalItems={filteredTheatres.length}
        />
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Confirm Theatre Deletion"
        message={
          deleteTarget
            ? `Are you sure you want to permanently delete theatre "${deleteTarget.name}"? Warning: All scheduled screenings associated with this theatre will also be removed.`
            : ""
        }
        confirmLabel="Yes, Delete Theatre"
        confirmVariant="danger"
        loading={deleting}
        onConfirm={confirmDeleteTheatre}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
