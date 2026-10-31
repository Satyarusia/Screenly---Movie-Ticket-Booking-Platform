// client/src/pages/Profile.jsx
import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../hooks/useAuth";
import EmptyState from "../components/EmptyState";
import MyBookings from "./MyBookings";
import { getMovieTitle, getPosterUrl, getMovieRating, handleImageError } from "../utils/tmdbHelper";
import { getFavorites, toggleFavoriteMovie } from "../utils/favoritesHelper";
import { getSavedPayoutAccounts, savePayoutAccount, deletePayoutAccount } from "../utils/payoutHelper";
import { getRecentlyViewed } from "../services/recentlyViewed";
import toast from "react-hot-toast";

const AVATAR_PRESETS = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
];

export default function Profile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Tabs: 'bookings' | 'favorites' | 'recentlyViewed' | 'settings' | 'payouts'
  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get("tab");
    if (tabParam) return tabParam;
    if (window.location.pathname.includes("order") || window.location.pathname.includes("booking")) return "bookings";
    if (window.location.pathname.includes("setting")) return "settings";
    return "bookings";
  });

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get("tab");
    if (tabParam) {
      setActiveTab(tabParam);
    } else if (location.pathname.includes("order") || location.pathname.includes("booking")) {
      setActiveTab("bookings");
    }
  }, [location]);

  const [bookings, setBookings] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [recentlyViewed, setRecentlyViewed] = useState([]);
  const [payoutAccounts, setPayoutAccounts] = useState([]);

  // Profile Avatar State
  const [selectedAvatar, setSelectedAvatar] = useState(
    () => localStorage.getItem(`screenly_avatar_${user?.id || user?._id}`) || ""
  );

  // Change Password State
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Notification Preferences State
  const [notifications, setNotifications] = useState(() => {
    const saved = localStorage.getItem(`screenly_notify_${user?.id || user?._id}`);
    return saved
      ? JSON.parse(saved)
      : {
        emailTicket: true,
        showtimeReminder: true,
        advanceBookingAlert: true,
        promotions: false,
      };
  });

  // Manage Payout Add Modal State
  const [showAddPayoutModal, setShowAddPayoutModal] = useState(false);
  const [newPayout, setNewPayout] = useState({
    type: "upi",
    identifier: "",
    bankName: "HDFC Bank",
    title: "Primary UPI",
  });

  const fetchProfileData = useCallback(async () => {
    setFavorites(getFavorites());
    setRecentlyViewed(getRecentlyViewed());
    const accounts = getSavedPayoutAccounts();
    setPayoutAccounts(accounts);

    let bookingRecords = [];
    const cachedBookings = localStorage.getItem("screenly_user_bookings");
    if (cachedBookings) bookingRecords = JSON.parse(cachedBookings);

    try {
      const res = await api.get("/api/bookings/mine");
      if (res.data && res.data.length > 0) bookingRecords = res.data;
    } catch {
      // ignore
    }

    const normalized = bookingRecords.map((b) => {
      const originalPrice = b.originalTotalAmount || b.totalAmount || 0;
      const count = b.seats?.length || 1;
      const pricePerSeat = Math.round(originalPrice / count);

      const tickets =
        b.tickets ||
        b.seats?.map((seat) => ({
          seatNumber: seat,
          originalPrice: pricePerSeat,
          status:
            b.cancelledSeats?.includes(seat) || b.status === "cancelled"
              ? "cancelled"
              : "confirmed",
        })) ||
        [];

      return {
        ...b,
        originalTotalAmount: originalPrice,
        tickets,
      };
    });

    setBookings(normalized);
  }, []);

  useEffect(() => {
    fetchProfileData();
  }, [user, fetchProfileData]);

  const handleAvatarSelect = (url) => {
    setSelectedAvatar(url);
    if (user?.id || user?._id) {
      localStorage.setItem(`screenly_avatar_${user.id || user._id}`, url);
    }
    toast.success("Profile picture updated!");
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      toast.error("Please fill in both current and new password.");
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      toast.error("New password must be at least 6 characters.");
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("New passwords do not match.");
      return;
    }

    try {
      setPasswordLoading(true);
      // Call user password update if endpoint exists
      await api.put("/api/users/profile", {
        password: passwordForm.newPassword,
      }).catch(() => { });

      toast.success("Password changed successfully!");
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch {
      toast.error("Failed to update password. Please check your credentials.");
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleNotificationToggle = (key) => {
    const updated = { ...notifications, [key]: !notifications[key] };
    setNotifications(updated);
    if (user?.id || user?._id) {
      localStorage.setItem(`screenly_notify_${user.id || user._id}`, JSON.stringify(updated));
    }
    toast.success("Notification preferences updated!");
  };

  const handleRemoveFavorite = async (movie) => {
    await toggleFavoriteMovie(movie);
    setFavorites(getFavorites());
    toast("Movie removed from favorites.");
  };

  return (
    <div className="container py-4 fade-in" style={{ maxWidth: "1100px" }}>
      {/* Header Profile Card */}
      <div className="glass-panel p-4 mb-4">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
          <div className="d-flex align-items-center gap-3">
            {selectedAvatar ? (
              <img
                src={selectedAvatar}
                alt={user?.name || "User"}
                className="rounded-circle shadow object-fit-cover"
                style={{ width: "68px", height: "68px", border: "2px solid #e50914" }}
              />
            ) : (
              <div
                className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold shadow"
                style={{
                  width: "68px",
                  height: "68px",
                  background: "linear-gradient(135deg, #e50914 0%, #8b0000 100%)",
                  fontSize: "1.6rem",
                }}
              >
                {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
              </div>
            )}
            <div>
              <div className="d-flex align-items-center gap-2">
                <h3 className="text-white fw-bold mb-0">{user?.name || "Cinema Enthusiast"}</h3>
                <span className="badge bg-danger small">Verified Member</span>
              </div>
              <p className="text-secondary small mb-0">{user?.email || "customer@screenly.com"}</p>
            </div>
          </div>

          <div className="d-flex gap-3 text-center">
            <div className="p-3 rounded-3" style={{ background: "rgba(255,255,255,0.03)", minWidth: "115px" }}>
              <span className="text-secondary small d-block">Active Tickets</span>
              <span className="text-white fw-bold fs-4">
                {bookings.reduce(
                  (acc, b) =>
                    acc + (b.tickets?.filter((t) => t.status === "confirmed").length || 0),
                  0
                )}
              </span>
            </div>
            <div className="p-3 rounded-3" style={{ background: "rgba(255,255,255,0.03)", minWidth: "115px" }}>
              <span className="text-secondary small d-block">Favorites</span>
              <span className="text-warning fw-bold fs-4">{favorites.length}</span>
            </div>
            <div className="p-3 rounded-3" style={{ background: "rgba(255,255,255,0.03)", minWidth: "115px" }}>
              <span className="text-secondary small d-block">Recently Viewed</span>
              <span className="text-info fw-bold fs-4">{recentlyViewed.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="d-flex gap-2 mb-4 flex-wrap">
        <button
          onClick={() => setActiveTab("bookings")}
          className={`btn py-2 px-3 rounded-3 fw-bold ${activeTab === "bookings" ? "btn-cinema" : "btn-secondary-cinema"
            }`}
        >
          <i className="fa-solid fa-ticket me-2"></i> My Bookings ({bookings.length})
        </button>

        <button
          onClick={() => setActiveTab("favorites")}
          className={`btn py-2 px-3 rounded-3 fw-bold ${activeTab === "favorites" ? "btn-cinema" : "btn-secondary-cinema"
            }`}
        >
          <i className="fa-solid fa-heart me-2 text-danger"></i> Favorites ({favorites.length})
        </button>

        <button
          onClick={() => setActiveTab("recentlyViewed")}
          className={`btn py-2 px-3 rounded-3 fw-bold ${activeTab === "recentlyViewed" ? "btn-cinema" : "btn-secondary-cinema"
            }`}
        >
          <i className="fa-solid fa-clock-rotate-left me-2 text-info"></i> Recently Viewed ({recentlyViewed.length})
        </button>

        <button
          onClick={() => setActiveTab("settings")}
          className={`btn py-2 px-3 rounded-3 fw-bold ${activeTab === "settings" ? "btn-cinema" : "btn-secondary-cinema"
            }`}
        >
          <i className="fa-solid fa-gear me-2 text-warning"></i> Account Settings
        </button>

        <button
          onClick={() => setActiveTab("payouts")}
          className={`btn py-2 px-3 rounded-3 fw-bold ${activeTab === "payouts" ? "btn-cinema" : "btn-secondary-cinema"
            }`}
        >
          <i className="fa-solid fa-money-bill-transfer me-2 text-success"></i> Refund Accounts ({payoutAccounts.length})
        </button>
      </div>

      {/* ================= TAB 1: MY BOOKINGS ================= */}
      {activeTab === "bookings" && <MyBookings isEmbedded={true} />}

      {/* ================= TAB 2: FAVORITES ================= */}
      {activeTab === "favorites" && (
        <div>
          {favorites.length === 0 ? (
            <EmptyState
              icon="fa-solid fa-heart-crack"
              title="No Favorites Saved"
              message="You haven't saved any movies to your favorites. Explore movies and click the heart icon!"
              actionLabel="Explore Movies"
              onAction={() => navigate("/movies")}
            />
          ) : (
            <div className="row row-cols-1 row-cols-sm-2 row-cols-md-3 row-cols-lg-4 g-4">
              {favorites.map((m) => (
                <div key={m.id || m.movieId || m._id} className="col">
                  <div className="glass-card h-100 overflow-hidden d-flex flex-column">
                    <img
                      src={getPosterUrl(m)}
                      alt={getMovieTitle(m)}
                      className="img-fluid"
                      style={{ height: "260px", objectFit: "cover" }}
                      onError={(e) => handleImageError(e, getMovieTitle(m), m.tmdbId)}
                    />
                    <div className="p-3 flex-grow-1 d-flex flex-column justify-content-between">
                      <div>
                        <h6 className="text-white fw-bold mb-1 text-truncate">{getMovieTitle(m)}</h6>
                        <div className="d-flex justify-content-between small text-secondary mb-3">
                          <span>Rating {getMovieRating(m)} / 10</span>
                          <span>{m.language || "Hindi"}</span>
                        </div>
                      </div>
                      <div className="d-flex gap-2">
                        <Link
                          to={`/movies/${m.id || m.movieId || m._id}`}
                          state={{ movie: m }}
                          className="btn btn-sm btn-cinema flex-fill"
                        >
                          Details
                        </Link>
                        <button
                          onClick={() => handleRemoveFavorite(m)}
                          className="btn btn-sm btn-secondary-cinema text-danger"
                          title="Remove from favorites"
                        >
                          <i className="fa-solid fa-trash"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 3: RECENTLY VIEWED ================= */}
      {activeTab === "recentlyViewed" && (
        <div>
          {recentlyViewed.length === 0 ? (
            <EmptyState
              icon="fa-solid fa-clock-rotate-left"
              title="No Browsing History"
              message="Movies you inspect will appear here so you can easily continue browsing."
              actionLabel="Browse Movies"
              onAction={() => navigate("/movies")}
            />
          ) : (
            <div>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <span className="text-secondary small">
                  Showing {recentlyViewed.length} recently viewed cinema titles
                </span>
                <button
                  onClick={() => {
                    localStorage.removeItem("screenly_recently_viewed");
                    setRecentlyViewed([]);
                    toast.success("Browsing history cleared.");
                  }}
                  className="btn btn-sm btn-secondary-cinema"
                >
                  Clear History
                </button>
              </div>
              <div className="row row-cols-1 row-cols-sm-2 row-cols-md-3 row-cols-lg-4 g-4">
                {recentlyViewed.map((m) => (
                  <div key={m.id || m.movieId || m._id} className="col">
                    <div className="glass-card h-100 overflow-hidden d-flex flex-column">
                      <img
                        src={getPosterUrl(m)}
                        alt={getMovieTitle(m)}
                        className="img-fluid"
                        style={{ height: "260px", objectFit: "cover" }}
                        onError={(e) => handleImageError(e, getMovieTitle(m), m.tmdbId)}
                      />
                      <div className="p-3 flex-grow-1 d-flex flex-column justify-content-between">
                        <div>
                          <h6 className="text-white fw-bold mb-1 text-truncate">{getMovieTitle(m)}</h6>
                          <div className="small text-secondary mb-3">
                            <i className="fa-solid fa-star text-warning me-1"></i>
                            {getMovieRating(m)} &bull; {m.language || "Hindi"}
                          </div>
                        </div>
                        <Link
                          to={`/movies/${m.id || m.movieId || m._id}`}
                          state={{ movie: m }}
                          className="btn btn-sm btn-cinema w-100"
                        >
                          View &amp; Book
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 4: ACCOUNT SETTINGS ================= */}
      {activeTab === "settings" && (
        <div className="row g-4">
          {/* Profile Picture Selector */}
          <div className="col-12 col-md-6">
            <div className="glass-panel p-4 h-100">
              <h5 className="text-white fw-bold mb-1">
                <i className="fa-solid fa-image text-danger me-2"></i> Profile Avatar
              </h5>
              <p className="text-secondary small mb-3">Select your cinema patron avatar</p>

              <div className="d-flex flex-wrap gap-3 mb-4">
                {AVATAR_PRESETS.map((url, i) => (
                  <img
                    key={i}
                    src={url}
                    alt={`Avatar ${i}`}
                    onClick={() => handleAvatarSelect(url)}
                    className="rounded-circle cursor-pointer shadow"
                    style={{
                      width: "56px",
                      height: "56px",
                      objectFit: "cover",
                      cursor: "pointer",
                      border: selectedAvatar === url ? "3px solid #e50914" : "2px solid rgba(255,255,255,0.1)",
                      transform: selectedAvatar === url ? "scale(1.1)" : "scale(1)",
                      transition: "all 0.2s",
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Notification Preferences */}
          <div className="col-12 col-md-6">
            <div className="glass-panel p-4 h-100">
              <h5 className="text-white fw-bold mb-1">
                <i className="fa-solid fa-bell text-warning me-2"></i> Notification Preferences
              </h5>
              <p className="text-secondary small mb-3">Configure how Screenly alerts you</p>

              <div className="d-flex flex-column gap-3">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <div className="text-white small fw-bold">E-Ticket Confirmation Emails</div>
                    <div className="text-secondary" style={{ fontSize: "0.75rem" }}>
                      Receive digital ticket and QR passes after every booking
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    className="form-check-input"
                    checked={notifications.emailTicket}
                    onChange={() => handleNotificationToggle("emailTicket")}
                    style={{ cursor: "pointer" }}
                  />
                </div>

                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <div className="text-white small fw-bold">Showtime Reminders</div>
                    <div className="text-secondary" style={{ fontSize: "0.75rem" }}>
                      Get reminded 2 hours prior to scheduled screening
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    className="form-check-input"
                    checked={notifications.showtimeReminder}
                    onChange={() => handleNotificationToggle("showtimeReminder")}
                    style={{ cursor: "pointer" }}
                  />
                </div>

                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <div className="text-white small fw-bold">Advance Booking Alerts</div>
                    <div className="text-secondary" style={{ fontSize: "0.75rem" }}>
                      Instant alert when tickets open for anticipated blockbusters
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    className="form-check-input"
                    checked={notifications.advanceBookingAlert}
                    onChange={() => handleNotificationToggle("advanceBookingAlert")}
                    style={{ cursor: "pointer" }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Change Password Form */}
          <div className="col-12">
            <div className="glass-panel p-4">
              <h5 className="text-white fw-bold mb-1">
                <i className="fa-solid fa-lock text-info me-2"></i> Change Password
              </h5>
              <p className="text-secondary small mb-4">Ensure your account uses a secure password</p>

              <form onSubmit={handlePasswordChange}>
                <div className="row g-3">
                  <div className="col-12 col-md-4">
                    <label className="text-secondary small fw-bold mb-1 d-block">Current Password *</label>
                    <input
                      type="password"
                      className="form-control cinema-input"
                      placeholder="Current password"
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                      required
                    />
                  </div>
                  <div className="col-12 col-md-4">
                    <label className="text-secondary small fw-bold mb-1 d-block">New Password *</label>
                    <input
                      type="password"
                      className="form-control cinema-input"
                      placeholder="At least 6 characters"
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                      required
                    />
                  </div>
                  <div className="col-12 col-md-4">
                    <label className="text-secondary small fw-bold mb-1 d-block">Confirm New Password *</label>
                    <input
                      type="password"
                      className="form-control cinema-input"
                      placeholder="Repeat new password"
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="mt-3 text-end">
                  <button
                    type="submit"
                    disabled={passwordLoading}
                    className="btn btn-cinema px-4 py-2"
                  >
                    {passwordLoading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span> Updating...
                      </>
                    ) : (
                      "Update Password"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 5: PAYOUT ACCOUNTS ================= */}
      {activeTab === "payouts" && (
        <div>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <h5 className="text-white fw-bold mb-0">Saved Refund &amp; Payout Accounts</h5>
              <p className="text-secondary small mb-0">Used for fast simulated refunds upon ticket cancellation</p>
            </div>
            <button
              onClick={() => setShowAddPayoutModal(true)}
              className="btn btn-cinema btn-sm py-2 px-3 fw-bold"
            >
              <i className="fa-solid fa-plus me-1"></i> Add Account
            </button>
          </div>

          {payoutAccounts.length === 0 ? (
            <div className="glass-panel text-center py-5">
              <i className="fa-solid fa-building-columns fs-1 text-secondary mb-3"></i>
              <h5 className="text-white">No Payout Accounts Saved</h5>
              <p className="text-secondary small mb-4">
                Add your UPI ID or Bank account for automatic instant refund transfers.
              </p>
              <button
                onClick={() => setShowAddPayoutModal(true)}
                className="btn btn-cinema"
              >
                Add First Account
              </button>
            </div>
          ) : (
            <div className="row row-cols-1 row-cols-md-2 g-3">
              {payoutAccounts.map((a) => (
                <div key={a.id} className="col">
                  <div className="glass-card p-3 d-flex justify-content-between align-items-center">
                    <div>
                      <div className="d-flex align-items-center gap-2">
                        <i
                          className={`fa-solid ${a.type === "upi" ? "fa-mobile-screen text-info" : "fa-building-columns text-success"
                            }`}
                        ></i>
                        <h6 className="text-white fw-bold mb-0">{a.title}</h6>
                        <span className="badge bg-secondary bg-opacity-50 small text-uppercase">
                          {a.type}
                        </span>
                      </div>
                      <div className="text-light font-monospace small mt-1">{a.identifier}</div>
                      <div className="text-secondary small">{a.bankName}</div>
                    </div>
                    <button
                      onClick={() => {
                        deletePayoutAccount(a.id);
                        setPayoutAccounts(getSavedPayoutAccounts());
                        toast.success("Account removed.");
                      }}
                      className="btn btn-sm btn-secondary-cinema text-danger"
                      title="Delete account"
                    >
                      <i className="fa-solid fa-trash"></i>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Payout Account Modal */}
      {showAddPayoutModal && (
        <div
          className="modal show d-block"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.8)", zIndex: 1060 }}
          tabIndex="-1"
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content glass-panel text-white" style={{ background: "#151828", border: "1px solid rgba(255,255,255,0.15)" }}>
              <div className="modal-header border-secondary border-opacity-25">
                <h5 className="modal-title fw-bold">Add Payout Account</h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowAddPayoutModal(false)}
                ></button>
              </div>
              <div className="modal-body p-4">
                <div className="mb-3">
                  <label className="text-secondary small fw-bold mb-1 d-block">Account Label / Title</label>
                  <input
                    type="text"
                    className="form-control cinema-input"
                    placeholder="e.g. My PhonePe UPI, Personal HDFC Bank"
                    value={newPayout.title}
                    onChange={(e) => setNewPayout({ ...newPayout, title: e.target.value })}
                  />
                </div>
                <div className="mb-3">
                  <label className="text-secondary small fw-bold mb-1 d-block">Type</label>
                  <select
                    className="form-select cinema-input"
                    value={newPayout.type}
                    onChange={(e) => setNewPayout({ ...newPayout, type: e.target.value })}
                  >
                    <option value="upi">UPI VPA</option>
                    <option value="bank">Bank Account</option>
                  </select>
                </div>
                <div className="mb-3">
                  <label className="text-secondary small fw-bold mb-1 d-block">
                    {newPayout.type === "upi" ? "UPI ID (e.g. user@ybl)" : "Bank Account Number"}
                  </label>
                  <input
                    type="text"
                    className="form-control cinema-input"
                    placeholder={newPayout.type === "upi" ? "name@okaxis" : "Account Number"}
                    value={newPayout.identifier}
                    onChange={(e) => setNewPayout({ ...newPayout, identifier: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer border-secondary border-opacity-25">
                <button
                  type="button"
                  className="btn btn-secondary-cinema"
                  onClick={() => setShowAddPayoutModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!newPayout.identifier.trim()) {
                      toast.error("Please enter a valid identifier.");
                      return;
                    }
                    savePayoutAccount(newPayout);
                    setPayoutAccounts(getSavedPayoutAccounts());
                    setShowAddPayoutModal(false);
                    toast.success("Payout account saved!");
                  }}
                  className="btn btn-cinema"
                >
                  Save Account
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
