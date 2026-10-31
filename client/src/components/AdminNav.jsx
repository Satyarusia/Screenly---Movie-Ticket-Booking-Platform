// client/src/components/AdminNav.jsx
import { Link, useLocation } from "react-router-dom";

export default function AdminNav() {
  const location = useLocation();
  const currentPath = location.pathname;

  const navItems = [
    {
      to: "/admin",
      label: "Dashboard",
      icon: "fa-gauge-high",
      badge: null,
      exact: true,
    },
    {
      to: "/admin/shows",
      label: "Show Management",
      icon: "fa-clock",
      badge: "Live",
      badgeVariant: "bg-info text-dark",
    },
    {
      to: "/admin/movies",
      label: "Movie Catalog",
      icon: "fa-film",
      badge: null,
    },
    {
      to: "/admin/theatres",
      label: "Theatres",
      icon: "fa-masks-theater",
      badge: null,
    },
    {
      to: "/admin/bookings",
      label: "Bookings",
      icon: "fa-receipt",
      badge: null,
    },
    {
      to: "/admin/users",
      label: "Users",
      icon: "fa-users",
      badge: null,
    },
    {
      to: "/admin/reports",
      label: "Reports",
      icon: "fa-chart-pie",
      badge: null,
    },
    {
      to: "/admin/settings",
      label: "Settings",
      icon: "fa-gear",
      badge: null,
    },
  ];

  const isActive = (item) => {
    if (item.exact) {
      return currentPath === item.to;
    }
    return currentPath.startsWith(item.to);
  };

  return (
    <div className="mb-4">
      {/* Top Breadcrumb & Return to App Link */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3 pb-2 border-bottom border-secondary border-opacity-25">
        <div className="d-flex align-items-center gap-2">
          <Link
            to="/admin"
            className="text-secondary small text-decoration-none d-flex align-items-center gap-1"
          >
            <i className="fa-solid fa-shield-halved text-danger"></i>
            <span className="fw-semibold">Admin Dashboard</span>
          </Link>
          <span className="text-secondary opacity-50">/</span>
          <span className="text-white small fw-bold">
            {navItems.find((n) => isActive(n))?.label || "Control Center"}
          </span>
        </div>

        <div className="d-flex align-items-center gap-2">
          <Link
            to="/home"
            className="btn btn-secondary-cinema btn-sm py-1 px-3 d-flex align-items-center gap-1"
            style={{ fontSize: "0.8rem" }}
          >
            <i className="fa-solid fa-house text-danger"></i>
            <span>Customer View</span>
          </Link>
        </div>
      </div>

      {/* Admin Horizontal Sidebar Navigation Bar */}
      <div
        className="glass-panel p-2 d-flex align-items-center gap-1 overflow-auto rounded-3 shadow-sm"
        style={{
          background: "#121422",
          borderColor: "rgba(255, 255, 255, 0.08)",
          scrollbarWidth: "none",
        }}
      >
        {navItems.map((item) => {
          const active = isActive(item);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`btn btn-sm py-2 px-3 rounded-2 text-nowrap d-flex align-items-center gap-2 fw-semibold text-decoration-none transition-all ${
                active
                  ? "btn-cinema shadow"
                  : "text-secondary hover-text-white bg-transparent border-0"
              }`}
              style={{
                fontSize: "0.84rem",
                color: active ? "#ffffff" : "#a1a1aa",
              }}
            >
              <i
                className={`fa-solid ${item.icon} ${
                  active ? "text-white" : "text-danger"
                }`}
              ></i>
              <span>{item.label}</span>
              {item.badge && (
                <span
                  className={`badge ${item.badgeVariant || "bg-danger"} ms-1`}
                  style={{ fontSize: "0.62rem", padding: "2px 5px" }}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
