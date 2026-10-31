// client/src/pages/ForgotPassword.jsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import toast from "react-hot-toast";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [step, setStep] = useState(1); // 1: Email, 2: Code & New Pass, 3: Success
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const navigate = useNavigate();

  // Step 1: Send Recovery Code via Real Email
  const handleSendCode = async (e) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      toast.error("Please enter your registered email address.");
      return;
    }

    try {
      setLoading(true);
      const res = await api.post("/api/auth/forgot-password", { email: cleanEmail });

      // User requirement: Show only the confirmation notice; never display OTP in the UI
      toast.success(
        res.data?.message || "A verification code has been sent to your registered email address.",
        { duration: 5000 }
      );

      // Start a 45-second resend cooldown timer
      setResendCooldown(45);
      const timer = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      setCode("");
      setStep(2);
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        "Unable to send recovery code. Please check your email or internet connection.";
      toast.error(msg, { duration: 6000 });
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify Code from Email & Set New Password
  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (!code.trim() || code.trim().length !== 6) {
      toast.error("Please enter the complete 6-digit verification code from your email.");
      return;
    }

    if (!newPassword) {
      toast.error("Please enter your new password.");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match. Please re-enter.");
      return;
    }

    try {
      setLoading(true);
      const res = await api.post("/api/auth/reset-password", {
        email: email.trim().toLowerCase(),
        code: code.trim(),
        newPassword,
      });

      toast.success(res.data?.message || "Password reset successfully!");
      setStep(3);
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        "Failed to reset password. Please check the code and try again.";
      toast.error(msg, { duration: 5000 });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-5 fade-in" style={{ minHeight: "75vh" }}>
      <div className="row justify-content-center">
        <div className="col-12 col-sm-10 col-md-8 col-lg-6 col-xl-5">
          <div className="glass-panel p-4 p-md-5" style={{ background: "#151828", border: "1px solid rgba(255,255,255,0.1)" }}>
            {/* Header Icon & Title */}
            <div className="text-center mb-4">
              <div
                className="d-inline-flex align-items-center justify-content-center rounded-3 mb-3 shadow"
                style={{
                  width: "52px",
                  height: "52px",
                  background: "linear-gradient(135deg, #e50914 0%, #8b0000 100%)",
                }}
              >
                <i className="fa-solid fa-key text-white fs-4"></i>
              </div>
              <h3 className="text-white fw-bold mb-1">
                {step === 3 ? "Password Reset Complete" : "Recover Screenly Account"}
              </h3>
              <p className="text-secondary small mb-0">
                {step === 1 && "Enter your registered email address to receive a secure recovery code"}
                {step === 2 && "A verification code has been sent to your registered email address"}
                {step === 3 && "Your password has been securely updated in your Screenly account"}
              </p>
            </div>

            {/* ================= STEP 1: ENTER REGISTERED EMAIL ================= */}
            {step === 1 && (
              <form onSubmit={handleSendCode}>
                <div className="mb-4">
                  <label className="text-secondary small fw-bold mb-1 d-block">
                    Registered Email Address <span className="text-danger">*</span>
                  </label>
                  <div className="input-group">
                    <span className="input-group-text border-0" style={{ background: "#1a1d2d", color: "#94a3b8" }}>
                      <i className="fa-solid fa-envelope"></i>
                    </span>
                    <input
                      type="email"
                      className="form-control cinema-input"
                      placeholder="e.g. name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>
                  <span className="text-secondary mt-1 d-block" style={{ fontSize: "0.75rem" }}>
                    We will send a 6-digit verification code to your email inbox
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-cinema w-100 py-2 fw-bold mb-3 shadow"
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      Sending Verification Code...
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-paper-plane me-2"></i>
                      Send Verification Code
                    </>
                  )}
                </button>
              </form>
            )}

            {/* ================= STEP 2: VERIFY CODE FROM EMAIL & SET NEW PASSWORD ================= */}
            {step === 2 && (
              <form onSubmit={handleResetPassword}>
                {/* Official Email Sent Notice Banner */}
                <div
                  className="p-3 rounded-3 mb-4 border border-info border-opacity-30 d-flex align-items-start gap-3"
                  style={{ background: "rgba(6, 182, 212, 0.08)" }}
                >
                  <i className="fa-solid fa-envelope-circle-check text-info fs-4 mt-1"></i>
                  <div>
                    <div className="text-white small fw-bold mb-1">
                      A verification code has been sent to your registered email address.
                    </div>
                    <p className="text-secondary small mb-0" style={{ fontSize: "0.76rem", lineHeight: "1.5" }}>
                      Please check your inbox at <strong className="text-white">{email}</strong> (including your spam or junk folder) for your 6-digit recovery code. The code will expire in 15 minutes.
                    </p>
                  </div>
                </div>

                {/* 6-Digit Code Input */}
                <div className="mb-3">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <label className="text-secondary small fw-bold mb-0">
                      Enter 6-Digit Verification Code <span className="text-danger">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="btn btn-link text-secondary p-0 text-decoration-none"
                      style={{ fontSize: "0.75rem" }}
                    >
                      Change Email
                    </button>
                  </div>
                  <input
                    type="text"
                    maxLength={6}
                    className="form-control cinema-input font-monospace text-center fs-4 fw-bold text-info"
                    placeholder="Enter 6-digit code"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                    required
                    autoFocus
                    style={{ letterSpacing: "6px" }}
                  />
                  <span className="text-secondary mt-1 d-block" style={{ fontSize: "0.72rem" }}>
                    Enter the exact code received in your email (Max 5 attempts allowed)
                  </span>
                </div>

                {/* New Password Input */}
                <div className="mb-3">
                  <label className="text-secondary small fw-bold mb-1 d-block">
                    New Password <span className="text-danger">*</span>
                  </label>
                  <div className="input-group">
                    <input
                      type={showPassword ? "text" : "password"}
                      className="form-control cinema-input"
                      placeholder="At least 6 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      className="btn btn-secondary-cinema border-0"
                      onClick={() => setShowPassword(!showPassword)}
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      <i className={`fa-solid ${showPassword ? "fa-eye-slash" : "fa-eye"}`}></i>
                    </button>
                  </div>
                </div>

                {/* Confirm New Password Input */}
                <div className="mb-4">
                  <label className="text-secondary small fw-bold mb-1 d-block">
                    Confirm New Password <span className="text-danger">*</span>
                  </label>
                  <input
                    type={showPassword ? "text" : "password"}
                    className="form-control cinema-input"
                    placeholder="Re-enter new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-cinema w-100 py-2 fw-bold mb-3 shadow"
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      Updating Password...
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-lock me-2"></i>
                      Reset Password
                    </>
                  )}
                </button>

                {/* Resend Code Link with Cooldown */}
                <div className="text-center mb-2">
                  {resendCooldown > 0 ? (
                    <span className="text-secondary small" style={{ fontSize: "0.78rem" }}>
                      Didn't get the email? Resend code in <strong className="text-white">{resendCooldown}s</strong>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSendCode}
                      className="btn btn-link text-info p-0 text-decoration-none small fw-semibold"
                      style={{ fontSize: "0.8rem" }}
                    >
                      <i className="fa-solid fa-arrows-rotate me-1"></i> Resend Verification Code
                    </button>
                  )}
                </div>
              </form>
            )}

            {/* ================= STEP 3: SUCCESS STATE ================= */}
            {step === 3 && (
              <div className="text-center py-3">
                <div
                  className="d-inline-flex align-items-center justify-content-center rounded-circle mb-3 shadow"
                  style={{ width: "64px", height: "64px", background: "rgba(16, 185, 129, 0.15)" }}
                >
                  <i className="fa-solid fa-circle-check text-success fs-1"></i>
                </div>
                <h4 className="text-white fw-bold mb-2">Password Updated Successfully</h4>
                <p className="text-secondary small mb-4">
                  Your Screenly account password has been updated in the database. Your previous password has been invalidated and you can now sign in with your new password.
                </p>
                <button
                  onClick={() => navigate("/login", { state: { email } })}
                  className="btn btn-cinema w-100 py-2 fw-bold shadow"
                >
                  <i className="fa-solid fa-arrow-right-to-bracket me-2"></i>
                  Proceed to Sign In
                </button>
              </div>
            )}

            {/* Back to Login Footer */}
            {step !== 3 && (
              <div className="text-center pt-3 border-top border-secondary border-opacity-25 mt-3">
                <Link to="/login" className="text-secondary small text-decoration-none">
                  &larr; Remember your password? <span className="text-danger fw-semibold">Sign In</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
