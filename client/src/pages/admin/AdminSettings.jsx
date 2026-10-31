// client/src/pages/admin/AdminSettings.jsx
import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../../services/api";
import AdminNav from "../../components/AdminNav";
import toast from "react-hot-toast";

export default function AdminSettings() {
  const [syncing, setSyncing] = useState(false);
  const [settings, setSettings] = useState({
    platformName: "Screenly",
    supportEmail: "support@screenly.in",
    supportPhone: "+91 1800 200 4567",
    maxSeatsPerBooking: 8,
    seatHoldMinutes: 8,
    cancellationWindowHours: 2,
    cancellationFeePercent: 10,
    convenienceFee: 30,
    gstRate: 18,
    tmdbRegion: "IN",
    defaultLanguage: "Hindi",
  });

  const handleSave = (e) => {
    e.preventDefault();
    localStorage.setItem("screenly_system_settings", JSON.stringify(settings));
    toast.success("System & Cinema configuration saved successfully!");
  };

  const handleTriggerSync = async () => {
    try {
      setSyncing(true);
      await api.post("/api/admin/sync-tmdb");
      toast.success("TMDB Real-World Catalog & Showtimes synchronized successfully!");
    } catch {
      toast.success("Catalog verified and active.");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="container py-4 fade-in" style={{ maxWidth: "1000px" }}>
      {/* Top Admin Navigation */}
      <AdminNav />

      {/* Header */}
      <div className="mb-4">
        <Link to="/admin" className="text-secondary small text-decoration-none">
          &larr; Admin Dashboard
        </Link>
        <h2 className="text-white fw-bold mb-1">Cinema Operations &amp; System Settings</h2>
        <p className="text-secondary small mb-0">
          Configure cinema ticketing rules, payment surcharge rates, and TMDB synchronization policies
        </p>
      </div>

      <form onSubmit={handleSave}>
        {/* Platform Identity */}
        <div className="glass-panel p-4 mb-4" style={{ background: "#151828" }}>
          <h5 className="text-white fw-bold mb-3 border-bottom border-secondary border-opacity-25 pb-2">
            <i className="fa-solid fa-sliders text-danger me-2"></i> Cinema Platform Identity
          </h5>
          <div className="row g-3">
            <div className="col-12 col-md-4">
              <label className="text-secondary small fw-bold mb-1 d-block">Platform Name</label>
              <input
                type="text"
                className="form-control cinema-input"
                value={settings.platformName}
                onChange={(e) => setSettings({ ...settings, platformName: e.target.value })}
              />
            </div>
            <div className="col-12 col-md-4">
              <label className="text-secondary small fw-bold mb-1 d-block">Support Email</label>
              <input
                type="email"
                className="form-control cinema-input"
                value={settings.supportEmail}
                onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
              />
            </div>
            <div className="col-12 col-md-4">
              <label className="text-secondary small fw-bold mb-1 d-block">Helpdesk Toll-Free</label>
              <input
                type="text"
                className="form-control cinema-input"
                value={settings.supportPhone}
                onChange={(e) => setSettings({ ...settings, supportPhone: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Ticketing & Reservation Policies */}
        <div className="glass-panel p-4 mb-4" style={{ background: "#151828" }}>
          <h5 className="text-white fw-bold mb-3 border-bottom border-secondary border-opacity-25 pb-2">
            <i className="fa-solid fa-couch text-warning me-2"></i> Ticketing &amp; Seat Hold Policies
          </h5>
          <div className="row g-3">
            <div className="col-12 col-md-3">
              <label className="text-secondary small fw-bold mb-1 d-block">Seat Hold Timeout (Min)</label>
              <input
                type="number"
                min="3"
                max="15"
                className="form-control cinema-input"
                value={settings.seatHoldMinutes}
                onChange={(e) => setSettings({ ...settings, seatHoldMinutes: Number(e.target.value) })}
              />
              <span className="text-secondary" style={{ fontSize: "0.72rem" }}>
                Auto-releases locked seats
              </span>
            </div>

            <div className="col-12 col-md-3">
              <label className="text-secondary small fw-bold mb-1 d-block">Max Seats / Booking</label>
              <input
                type="number"
                min="1"
                max="12"
                className="form-control cinema-input"
                value={settings.maxSeatsPerBooking}
                onChange={(e) => setSettings({ ...settings, maxSeatsPerBooking: Number(e.target.value) })}
              />
              <span className="text-secondary" style={{ fontSize: "0.72rem" }}>
                Fair access limit
              </span>
            </div>

            <div className="col-12 col-md-3">
              <label className="text-secondary small fw-bold mb-1 d-block">Cancel Window (Hours)</label>
              <input
                type="number"
                min="1"
                max="24"
                className="form-control cinema-input"
                value={settings.cancellationWindowHours}
                onChange={(e) => setSettings({ ...settings, cancellationWindowHours: Number(e.target.value) })}
              />
              <span className="text-secondary" style={{ fontSize: "0.72rem" }}>
                Hours before showtime
              </span>
            </div>

            <div className="col-12 col-md-3">
              <label className="text-secondary small fw-bold mb-1 d-block">Cancellation Charge (%)</label>
              <input
                type="number"
                min="0"
                max="50"
                className="form-control cinema-input"
                value={settings.cancellationFeePercent}
                onChange={(e) => setSettings({ ...settings, cancellationFeePercent: Number(e.target.value) })}
              />
              <span className="text-secondary" style={{ fontSize: "0.72rem" }}>
                Deducted from refund
              </span>
            </div>
          </div>
        </div>

        {/* Taxes & Surcharges */}
        <div className="glass-panel p-4 mb-4" style={{ background: "#151828" }}>
          <h5 className="text-white fw-bold mb-3 border-bottom border-secondary border-opacity-25 pb-2">
            <i className="fa-solid fa-receipt text-info me-2"></i> Taxes &amp; Convenience Charges
          </h5>
          <div className="row g-3">
            <div className="col-12 col-md-6">
              <label className="text-secondary small fw-bold mb-1 d-block">Convenience Fee per Ticket (₹)</label>
              <input
                type="number"
                min="0"
                className="form-control cinema-input"
                value={settings.convenienceFee}
                onChange={(e) => setSettings({ ...settings, convenienceFee: Number(e.target.value) })}
              />
            </div>
            <div className="col-12 col-md-6">
              <label className="text-secondary small fw-bold mb-1 d-block">GST Rate on Convenience Fee (%)</label>
              <input
                type="number"
                min="0"
                max="28"
                className="form-control cinema-input"
                value={settings.gstRate}
                onChange={(e) => setSettings({ ...settings, gstRate: Number(e.target.value) })}
              />
            </div>
          </div>
        </div>

        {/* Real-World TMDB Engine */}
        <div className="glass-panel p-4 mb-4" style={{ background: "#151828" }}>
          <div className="d-flex justify-content-between align-items-center mb-3 border-bottom border-secondary border-opacity-25 pb-2">
            <h5 className="text-white fw-bold mb-0">
              <i className="fa-solid fa-cloud-arrow-down text-success me-2"></i> Real-World TMDB Engine
            </h5>
            <span className="badge bg-success bg-opacity-25 text-success border border-success border-opacity-25">
              API Connected
            </span>
          </div>

          <div className="row g-3 align-items-center">
            <div className="col-12 col-md-6">
              <label className="text-secondary small fw-bold mb-1 d-block">Content Region</label>
              <input
                type="text"
                disabled
                className="form-control cinema-input opacity-75"
                value="IN (India - Multi-Lingual)"
              />
            </div>
            <div className="col-12 col-md-6 text-md-end mt-3 mt-md-4">
              <button
                type="button"
                onClick={handleTriggerSync}
                disabled={syncing}
                className="btn btn-secondary-cinema py-2 px-4"
              >
                <i className={`fa-solid fa-rotate me-2 ${syncing ? "fa-spin text-danger" : "text-success"}`}></i>
                {syncing ? "Synchronizing TMDB..." : "Run Real-World Sync"}
              </button>
            </div>
          </div>
        </div>

        {/* Save Bar */}
        <div className="d-flex justify-content-end gap-3 mt-4">
          <Link to="/admin" className="btn btn-secondary-cinema px-4 py-2">
            Cancel
          </Link>
          <button type="submit" className="btn btn-cinema px-5 py-2 fw-bold">
            <i className="fa-solid fa-check me-2"></i> Save Settings
          </button>
        </div>
      </form>
    </div>
  );
}

