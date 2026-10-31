import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import toast from "react-hot-toast";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { login, user } = useAuth();
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Please fill in both email and password.");
      toast.error("Please fill in both email and password.");
      return;
    }

    try {
      setLoading(true);
      const res = await login(email.trim().toLowerCase(), password);

      toast.success("Welcome back to Screenly!");

      // Automatic role detection from authenticated MongoDB account
      const loggedUser = res?.user || {};
      const userRole = (loggedUser.role || "").toLowerCase();

      if (userRole === "admin") {
        navigate("/admin", { replace: true });
      } else {
        let destination = "/home";
        if (typeof fromState === "string") {
          destination = fromState;
        } else if (fromState && fromState.pathname) {
          destination = `${fromState.pathname}${fromState.search || ""}${fromState.hash || ""}`;
        }
        navigate(destination, { replace: true });
      }
    } catch (err) {
      const errMsg =
        err.response?.data?.message ||
        "Invalid email or password. Please verify your credentials.";
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-5 fade-in">
      <div className="row justify-content-center">
        <div className="col-12 col-sm-10 col-md-8 col-lg-5 col-xl-4">
          <div className="glass-panel p-4 p-md-5" style={{ background: "#151828" }}>
            {/* Header: Screenly Logo & Welcome Message */}
            <div className="text-center mb-4">
              <div
                className="d-inline-flex align-items-center justify-content-center rounded-3 mb-3 shadow"
                style={{
                  width: "48px",
                  height: "48px",
                  background: "linear-gradient(135deg, #e50914 0%, #8b0000 100%)",
                  boxShadow: "0 0 16px rgba(229, 9, 20, 0.5)",
                }}
              >
                <i className="fa-solid fa-film text-white fs-4"></i>
              </div>
              <h3 className="text-white fw-bold mb-1">
                Screen<span style={{ color: "#e50914" }}>ly</span>
              </h3>
              <p className="text-secondary small mb-0">Sign in to your cinema account</p>
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

            {/* Error Message */}
            {error && (
              <div
                className="alert alert-danger py-2 px-3 small d-flex align-items-center gap-2 mb-3 rounded-2"
                role="alert"
              >
                <i className="fa-solid fa-triangle-exclamation flex-shrink-0"></i>
                <div>{error}</div>
              </div>
            )}

            {/* Standard Authentication Form */}
            <form onSubmit={handleSubmit} noValidate>
              <div className="mb-3">
                <label className="text-secondary small fw-bold mb-1 d-block">
                  Email Address *
                </label>
                <div className="input-group">
                  <span className="input-group-text bg-dark border-secondary text-secondary">
                    <i className="fa-solid fa-envelope"></i>
                  </span>
                  <input
                    type="email"
                    className="form-control cinema-input"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              <div className="mb-3">
                <label className="text-secondary small fw-bold mb-1 d-block">
                  Password *
                </label>
                <div className="input-group">
                  <span className="input-group-text bg-dark border-secondary text-secondary">
                    <i className="fa-solid fa-lock"></i>
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    className="form-control cinema-input"
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
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
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="d-flex align-items-center justify-content-between mb-4">
                <div className="form-check">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id="rememberMeCheck"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <label
                    htmlFor="rememberMeCheck"
                    className="text-secondary small"
                    style={{ cursor: "pointer", userSelect: "none" }}
                  >
                    Remember me
                  </label>
                </div>
                <Link
                  to="/forgot-password"
                  className="text-secondary small text-decoration-none hover-white"
                >
                  Forgot password?
                </Link>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="btn btn-cinema w-100 py-2 fs-6 fw-bold shadow mb-3"
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                    Signing in...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-right-to-bracket me-2"></i> Sign In
                  </>
                )}
              </button>

              <div className="text-center text-secondary small">
                Don't have an account?{" "}
                <Link
                  to="/register"
                  state={{ from: fromState, message: friendlyNotice }}
                  className="text-danger fw-bold text-decoration-none ms-1"
                >
                  Register
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
