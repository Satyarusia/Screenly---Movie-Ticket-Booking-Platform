import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="glass-panel rounded-0 border-start-0 border-end-0 border-bottom-0 pt-5 pb-4 mt-5">
      <div className="container">
        <div className="row g-4 mb-4">
          {/* Brand Col */}
          <div className="col-12 col-md-4">
            <div className="d-flex align-items-center gap-2 mb-3">
              <div
                className="d-flex align-items-center justify-content-center rounded-2 shadow"
                style={{
                  width: "36px",
                  height: "36px",
                  background: "#e50914",
                }}
              >
                <i className="fa-solid fa-film text-white"></i>
              </div>
              <span className="fw-bold fs-4 text-white">
                Screen<span style={{ color: "#e50914" }}>ly</span>
              </span>
            </div>
            <p className="text-secondary small mb-3">
              The premier cinema ticketing destination. Enjoy effortless seat reservations, premium recliner views, and verified digital movie passes across top multiplexes.
            </p>
            <div className="d-flex gap-3 text-secondary">
              <span className="btn btn-sm btn-secondary-cinema px-2 py-1" title="Customer Support">
                <i className="fa-solid fa-headset text-danger"></i>
              </span>
              <span className="btn btn-sm btn-secondary-cinema px-2 py-1" title="Verified Cinema Network">
                <i className="fa-solid fa-shield-halved text-success"></i>
              </span>
              <span className="btn btn-sm btn-secondary-cinema px-2 py-1" title="Instant E-Tickets">
                <i className="fa-solid fa-bolt text-warning"></i>
              </span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="col-6 col-md-2">
            <h6 className="text-white fw-bold mb-3 text-uppercase small tracking-wider">Explore</h6>
            <ul className="list-unstyled small d-flex flex-column gap-2 text-secondary">
              <li><Link to="/landing" className="text-decoration-none">Landing Page</Link></li>
              <li><Link to="/explore" className="text-decoration-none">Explore Movies</Link></li>
              <li><Link to="/movies" className="text-decoration-none">Now Showing</Link></li>
              <li><Link to="/shows" className="text-decoration-none">Showtimes</Link></li>
              <li><Link to="/bookings" className="text-decoration-none">My Bookings</Link></li>
            </ul>
          </div>

          {/* Cinema Cities */}
          <div className="col-6 col-md-3">
            <h6 className="text-white fw-bold mb-3 text-uppercase small tracking-wider">Multiplex Venues</h6>
            <ul className="list-unstyled small d-flex flex-column gap-2 text-secondary">
              <li><i className="fa-solid fa-location-dot me-2 text-danger"></i> Indore (PVR & INOX)</li>
              <li><i className="fa-solid fa-location-dot me-2 text-danger"></i> Bhopal (Cinepolis DB Mall)</li>
              <li><i className="fa-solid fa-location-dot me-2 text-danger"></i> Mumbai (Miraj Fun Republic)</li>
              <li><i className="fa-solid fa-couch me-2 text-warning"></i> Balcony, Middle & Lower Tiers</li>
            </ul>
          </div>

          {/* Experience & Quality Standards */}
          <div className="col-12 col-md-3">
            <h6 className="text-white fw-bold mb-3 text-uppercase small tracking-wider">Cinema Experience</h6>
            <div className="p-3 rounded-3" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="small text-white fw-semibold mb-1">
                <i className="fa-solid fa-volume-high text-info me-2"></i> Dolby Atmos 7.1 Surround
              </div>
              <div className="small text-secondary mb-1">
                <i className="fa-solid fa-tv text-warning me-2"></i> 4K Laser Projection
              </div>
              <div className="small text-secondary">
                <i className="fa-solid fa-ticket text-danger me-2"></i> Instant Paperless Entry
              </div>
            </div>
          </div>
        </div>

        <hr className="border-secondary opacity-25 my-4" />

        <div className="d-flex flex-column flex-md-row justify-content-between align-items-center gap-3 small text-secondary">
          <div>
            &copy; {new Date().getFullYear()} Screenly Cinema Network. All rights reserved.
          </div>
          <div className="d-flex gap-4">
            <span className="text-secondary">Instant Confirmation</span>
            <span className="text-secondary">Official Box Office</span>
            <span className="text-secondary">Secure Ticketing</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
