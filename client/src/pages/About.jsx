// client/src/pages/About.jsx
import { Link } from "react-router-dom";

export default function About() {
  return (
    <div className="container py-5 fade-in" style={{ maxWidth: "850px" }}>
      <div className="glass-panel p-4 p-md-5">
        <h2 className="text-white fw-black mb-3">About Screenly</h2>
        <p className="text-light leading-relaxed">
          <strong>Screenly</strong> is a next-generation cinema ticket reservation platform designed to streamline the moviegoing experience. Our system connects cinema enthusiasts with verified theater admissions, advance booking releases, and seamless seat selection.
        </p>
        <p className="text-secondary">
          Featuring instant seat reservation locks, real-world theatrical schedule tracking, and automated digital admission delivery, Screenly brings the multiplex experience to your fingertips.
        </p>
        <Link to="/" className="btn btn-cinema mt-3">Explore Now Showing</Link>
      </div>
    </div>
  );
}
