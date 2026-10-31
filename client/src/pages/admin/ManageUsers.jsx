import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import api from "../../services/api";
import LoadingSpinner from "../../components/LoadingSpinner";
import EmptyState from "../../components/EmptyState";
import AdminNav from "../../components/AdminNav";

export default function ManageUsers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Customer Profile & History Modal State
  const [selectedCustomerData, setSelectedCustomerData] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/api/admin/users?search=${encodeURIComponent(search)}`);
      setCustomers(Array.isArray(res.data) ? res.data : []);
    } catch {
      // Offline fallback
      const cached = JSON.parse(localStorage.getItem("screenly_user_bookings") || "[]");
      setCustomers([
        {
          _id: "u_demo",
          name: "Rahul Sharma",
          email: "user@screenly.in",
          phone: "+91 98765 43210",
          bookingCount: cached.length,
          totalSpent: cached.reduce((sum, b) => sum + (b.totalAmount || 0), 0),
          createdAt: "2026-01-15T10:00:00.000Z",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const openCustomerHistory = async (customer) => {
    setHistoryLoading(true);
    setSelectedCustomerData({ customer, history: [] });

    try {
      const res = await api.get(`/api/admin/users/${customer._id}`);
      setSelectedCustomerData(res.data);
    } catch {
      // Local fallback
      const cached = JSON.parse(localStorage.getItem("screenly_user_bookings") || "[]");
      setSelectedCustomerData({ customer, history: cached });
    } finally {
      setHistoryLoading(false);
    }
  };

  return (
    <div className="container py-4 fade-in" style={{ maxWidth: "1150px" }}>
      {/* Top Admin Navigation */}
      <AdminNav />

      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <Link to="/admin" className="text-secondary small text-decoration-none">
            &larr; Admin Dashboard
          </Link>
          <h2 className="text-white fw-bold mb-0">Registered Customers</h2>
        </div>
        <Link to="/admin/bookings" className="btn btn-secondary-cinema btn-sm py-2 px-3">
          <i className="fa-solid fa-receipt me-1 text-danger"></i> All Reservations
        </Link>
      </div>

      {/* Search & Filter Bar */}
      <div className="glass-panel p-3 mb-4">
        <div className="row g-2 align-items-center">
          <div className="col-12 col-md-6">
            <div className="position-relative">
              <i className="fa-solid fa-magnifying-glass position-absolute start-0 top-50 translate-middle-y ms-3 text-secondary"></i>
              <input
                type="text"
                className="form-control cinema-input ps-5"
                placeholder="Search customers by name, email, or phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="col-12 col-md-6 text-md-end text-secondary small">
            Total Customers: <strong className="text-white">{customers.length}</strong>
          </div>
        </div>
      </div>

      {/* Customer Directory Table */}
      {loading ? (
        <LoadingSpinner message="Retrieving registered customer profiles..." />
      ) : customers.length === 0 ? (
        <EmptyState
          icon="fa-solid fa-users"
          title="No Customers Found"
          message="No customer accounts matched your search keyword."
          actionLabel="Clear Search"
          onAction={() => setSearch("")}
        />
      ) : (
        <div className="glass-panel p-4">
          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Customer Profile</th>
                  <th>Contact Details</th>
                  <th>Joined Date</th>
                  <th>Bookings Made</th>
                  <th>Total Spent</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c._id}>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <div
                          className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold"
                          style={{ width: "36px", height: "36px", background: "#e50914" }}
                        >
                          {c.name ? c.name.charAt(0).toUpperCase() : "U"}
                        </div>
                        <div className="text-white fw-bold small">{c.name}</div>
                      </div>
                    </td>
                    <td>
                      <div className="text-white small">{c.email}</div>
                      <div className="text-secondary" style={{ fontSize: "0.75rem" }}>
                        {c.phone || "No phone provided"}
                      </div>
                    </td>
                    <td className="text-secondary small">
                      {c.createdAt
                        ? new Date(c.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "Recent Member"}
                    </td>
                    <td>
                      <span className="badge bg-secondary text-light px-2 py-1">
                        {c.bookingCount || 0} Tickets
                      </span>
                    </td>
                    <td className="text-success fw-bold">₹{(c.totalSpent || 0).toLocaleString()}</td>
                    <td className="text-end">
                      <button
                        onClick={() => openCustomerHistory(c)}
                        className="btn btn-sm btn-cinema py-1 px-3"
                      >
                        <i className="fa-solid fa-clock-rotate-left me-1"></i> View History
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Customer Profile & Ticket History Modal */}
      {selectedCustomerData && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-3"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.88)", backdropFilter: "blur(10px)", zIndex: 99999 }}
          onClick={() => setSelectedCustomerData(null)}
        >
          <div
            className="glass-panel p-4 p-md-5 overflow-auto shadow-2xl border"
            style={{ maxWidth: "750px", width: "100%", maxHeight: "90vh", background: "#151828" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="d-flex justify-content-between align-items-center mb-3 border-bottom border-secondary border-opacity-25 pb-3">
              <div>
                <h4 className="text-white fw-bold mb-0">Customer Booking History</h4>
                <p className="text-secondary small mb-0">
                  User: <strong className="text-white">{selectedCustomerData.customer?.name}</strong> ({selectedCustomerData.customer?.email})
                </p>
              </div>
              <button
                onClick={() => setSelectedCustomerData(null)}
                className="btn btn-sm btn-secondary-cinema rounded-circle d-flex align-items-center justify-content-center p-0"
                style={{ width: "32px", height: "32px" }}
              >
                <i className="fa-solid fa-xmark text-white"></i>
              </button>
            </div>

            {historyLoading ? (
              <LoadingSpinner message="Retrieving user ticket records..." />
            ) : selectedCustomerData.history.length === 0 ? (
              <div className="text-center py-4 text-secondary small">
                This customer has not completed any ticket reservations yet.
              </div>
            ) : (
              <div className="d-flex flex-column gap-3">
                {selectedCustomerData.history.map((b) => (
                  <div key={b._id} className="p-3 rounded-3 border border-secondary border-opacity-25" style={{ background: "rgba(255,255,255,0.02)" }}>
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <h6 className="text-white fw-bold mb-0">{b.movie?.title || b.movieName || "Cinema Feature"}</h6>
                      <span className={`badge ${b.status === "confirmed" ? "bg-success" : "bg-danger"} small`}>
                        {b.status?.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-secondary small mb-2">
                      {b.theatre?.name} &bull; {b.showDate} at {b.showTime}
                    </div>
                    <div className="d-flex justify-content-between align-items-center">
                      <div className="d-flex gap-1">
                        {b.seats?.map((s) => (
                          <span key={s} className="badge bg-secondary text-light small">{s}</span>
                        ))}
                      </div>
                      <span className="text-success fw-bold">₹{b.totalAmount}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
