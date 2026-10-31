import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import toast from "react-hot-toast";

export default function Register() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const fromState = location.state?.from;
  const friendlyNotice = location.state?.message;

  // If user already has an active session, redirect directly to Home Page
  useEffect(() => {
    if (user) {
      navigate("/home", { replace: true });
    }
  }, [user, navigate]);

  const calculateStrength = (pass) => {
    let score = 0;
    if (pass.length >= 6) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;
    return score;
  };

  const strength = calculateStrength(formData.password);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.email || !formData.password) {
      toast.error("Please fill in all required fields.");
      return;
    }

    if (formData.password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);
      // Automatically creates a regular user account
      await register({
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        password: formData.password,
        role: "user",
      });

      toast.success("Account created successfully! Welcome to Screenly.");

      let destination = "/home";
      if (typeof fromState === "string") {
        destination = fromState;
      } else if (fromState && fromState.pathname) {
        destination = `${fromState.pathname}${fromState.search || ""}${fromState.hash || ""}`;
      }
      navigate(destination, { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || "Registration failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-5 fade-in">
      <div className="row justify-content-center">
        <div className="col-12 col-sm-10 col-md-8 col-lg-5 col-xl-4">
          <div className="glass-panel p-4 p-md-5" style={{ background: "#151828" }}>
            {/* Header */}
            <div className="text-center mb-4">
              <div
                className="d-inline-flex align-items-center justify-content-center rounded-3 mb-3"
                style={{
                  width: "48px",
                  height: "48px",
                  background: "linear-gradient(135deg, #e50914 0%, #8b0000 100%)",
                  boxShadow: "0 0 16px rgba(229, 9, 20, 0.4)",
                }}
              >
                <i className="fa-solid fa-user-plus text-white fs-4"></i>
              </div>
              <h3 className="text-white fw-bold mb-1">
                Join Screen<span style={{ color: "#e50914" }}>ly</span>
              </h3>
              <p className="text-secondary small mb-0">Create your cinema booking account</p>
            </div>

            {/* Friendly Notice Message for Guest Users attempting to book */}
            {friendlyNotice && (
              <div
                className="alert alert-info py-2 px-3 small d-flex align-items-center gap-2 mb-3 rounded-2"
                style={{
                  backgroundColor: "rgba(13, 202, 240, 0.12)",
                  borderColor: "rgba(13, 202, 240, 0.3)",
                  color: "#38bdf8",
                }}
                role="alert"
              >
                <i className="fa-solid fa-circle-info flex-shrink-0 text-info"></i>
                <div>{friendlyNotice}</div>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              {/* Full Name */}
              <div className="mb-3">
                <label className="text-secondary small fw-bold mb-1 d-block">Full Name *</label>
                <div className="input-group">
                  <span className="input-group-text bg-dark border-secondary text-secondary">
                    <i className="fa-solid fa-user"></i>
                  </span>
                  <input
                    type="text"
                    className="form-control cinema-input"
                    placeholder="John Doe"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
              </div>

              {/* Email */}
              <div className="mb-3">
                <label className="text-secondary small fw-bold mb-1 d-block">Email Address *</label>
                <div className="input-group">
                  <span className="input-group-text bg-dark border-secondary text-secondary">
                    <i className="fa-solid fa-envelope"></i>
                  </span>
                  <input
                    type="email"
                    className="form-control cinema-input"
                    placeholder="name@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
              </div>

              {/* Phone */}
              <div className="mb-3">
                <label className="text-secondary small fw-bold mb-1 d-block">Phone Number</label>
                <div className="input-group">
                  <span className="input-group-text bg-dark border-secondary text-secondary">
                    <i className="fa-solid fa-phone"></i>
                  </span>
                  <input
                    type="tel"
                    className="form-control cinema-input"
                    placeholder="+91 98765 43210"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>

              {/* Password */}
              <div className="mb-3">
                <label className="text-secondary small fw-bold mb-1 d-block">Password *</label>
                <div className="input-group">
                  <span className="input-group-text bg-dark border-secondary text-secondary">
                    <i className="fa-solid fa-lock"></i>
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    className="form-control cinema-input"
                    placeholder="Min 6 characters"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                  />
                  <button
                    type="button"
                    className="btn btn-outline-secondary border-secondary text-secondary"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    <i className={`fa-solid ${showPassword ? "fa-eye-slash" : "fa-eye"}`}></i>
                  </button>
                </div>

                {formData.password && (
                  <div className="mt-2">
                    <div className="progress" style={{ height: "4px", backgroundColor: "#334155" }}>
                      <div
                        className={`progress-bar ${strength <= 1
                            ? "bg-danger"
                            : strength <= 3
                              ? "bg-warning"
                              : "bg-success"
                          }`}
                        style={{ width: `${(strength / 4) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div className="mb-4">
                <label className="text-secondary small fw-bold mb-1 d-block">Confirm Password *</label>
                <div className="input-group">
                  <span className="input-group-text bg-dark border-secondary text-secondary">
                    <i className="fa-solid fa-lock"></i>
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    className="form-control cinema-input"
                    placeholder="Repeat password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-cinema w-100 py-2 fs-6 fw-bold shadow mb-3"
              >
                {loading ? "Creating Account..." : "Register"}
              </button>

              <div className="text-center text-secondary small">
                Already have an account?{" "}
                <Link
                  to="/login"
                  state={{ from: fromState, message: friendlyNotice }}
                  className="text-danger fw-bold text-decoration-none ms-1"
                >
                  Login
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
