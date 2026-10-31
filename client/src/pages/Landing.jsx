// client/src/pages/Landing.jsx
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import LoadingSpinner from "../components/LoadingSpinner";

export default function Landing() {
  const { user, loading } = useAuth();

  // If session is still being verified on initial load, show clean loader
  if (loading) {
    return <LoadingSpinner message="Starting Screenly..." />;
  }

  // If user is already authenticated with a valid session, redirect directly to Home Page
  if (user) {
    return <Navigate to="/home" replace />;
  }

  return (
    <div
      className="d-flex align-items-center justify-content-center px-3 py-5"
      style={{
        minHeight: "calc(100vh - 120px)",
        background: "radial-gradient(circle at center, #181b30 0%, #0a0b12 85%)",
      }}
    >
      <div
        className="glass-panel text-center p-4 p-md-5 mx-auto shadow-2xl"
        style={{
          maxWidth: "680px",
          width: "100%",
          borderRadius: "20px",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          background: "rgba(19, 22, 38, 0.94)",
          backdropFilter: "blur(16px)",
        }}
      >
        {/* Cinema Icon Badge */}
        <div className="mb-4">
          <div
            className="d-inline-flex align-items-center justify-content-center rounded-4 mb-3 shadow"
            style={{
              width: "72px",
              height: "72px",
              background: "linear-gradient(135deg, rgba(229, 9, 20, 0.25) 0%, rgba(139, 0, 0, 0.4) 100%)",
              border: "1px solid rgba(229, 9, 20, 0.5)",
              boxShadow: "0 0 24px rgba(229, 9, 20, 0.35)",
            }}
          >
            <i className="fa-solid fa-film text-danger fs-2"></i>
          </div>

          <div className="d-flex align-items-center justify-content-center gap-2 mb-2">
            <span
              className="badge bg-danger bg-opacity-25 text-danger border border-danger border-opacity-25 px-2 py-1 text-uppercase"
              style={{ fontSize: "0.72rem", letterSpacing: "1px" }}
            >
              India&apos;s Cinema Ticketing Network
            </span>
          </div>

          <h1
            className="fw-bold text-white mb-3"
            style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: "clamp(2rem, 5vw, 2.75rem)",
              letterSpacing: "-0.5px",
            }}
          >
            Welcome to SCREEN<span style={{ color: "#e50914" }}>LY</span>
          </h1>

          <p
            className="text-secondary mx-auto mb-0"
            style={{
              fontSize: "1.05rem",
              lineHeight: "1.6",
              maxWidth: "540px",
            }}
          >
            Discover, explore, and book movie tickets with real-time cinema information across India.
          </p>
        </div>

        {/* Primary Action Buttons */}
        <div className="d-flex flex-column flex-sm-row justify-content-center gap-3 my-4">
          <Link
            to="/login"
            className="btn btn-cinema px-4 py-3 fw-bold rounded-pill shadow-lg d-flex align-items-center justify-content-center gap-2"
            style={{ minWidth: "150px", fontSize: "0.95rem" }}
          >
            <i className="fa-solid fa-arrow-right-to-bracket"></i>
            <span>Sign In</span>
          </Link>

          <Link
            to="/register"
            className="btn btn-secondary-cinema px-4 py-3 fw-bold rounded-pill d-flex align-items-center justify-content-center gap-2"
            style={{ minWidth: "150px", fontSize: "0.95rem" }}
          >
            <i className="fa-solid fa-user-plus"></i>
            <span>Sign Up</span>
          </Link>
        </div>

        {/* Guest Access Action */}
        <div className="pt-2">
          <Link
            to="/home"
            className="btn btn-sm btn-outline-secondary py-2 px-4 rounded-pill text-light text-decoration-none border-secondary border-opacity-50"
            style={{
              fontSize: "0.88rem",
              backgroundColor: "rgba(255, 255, 255, 0.04)",
              transition: "all 0.2s ease",
            }}
          >
            <span>Explore as Guest</span>
            <i className="fa-solid fa-arrow-right ms-2 text-danger"></i>
          </Link>
        </div>

        {/* Platform Highlights */}
        <div className="row g-3 mt-4 pt-4 border-top border-secondary border-opacity-25 text-start">
          <div className="col-12 col-md-4">
            <div className="d-flex align-items-center gap-2">
              <i className="fa-solid fa-bolt text-warning fs-5"></i>
              <div>
                <div className="text-white small fw-bold">Live Showtimes</div>
                <div className="text-secondary" style={{ fontSize: "0.74rem" }}>
                  Real-time seat status
                </div>
              </div>
            </div>
          </div>

          <div className="col-12 col-md-4">
            <div className="d-flex align-items-center gap-2">
              <i className="fa-solid fa-masks-theater text-danger fs-5"></i>
              <div>
                <div className="text-white small fw-bold">Multiplex Venues</div>
                <div className="text-secondary" style={{ fontSize: "0.74rem" }}>
                  Indore, Bhopal, Mumbai
                </div>
              </div>
            </div>
          </div>

          <div className="col-12 col-md-4">
            <div className="d-flex align-items-center gap-2">
              <i className="fa-solid fa-qrcode text-info fs-5"></i>
              <div>
                <div className="text-white small fw-bold">Digital Passes</div>
                <div className="text-secondary" style={{ fontSize: "0.74rem" }}>
                  Instant QR gate entry
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
