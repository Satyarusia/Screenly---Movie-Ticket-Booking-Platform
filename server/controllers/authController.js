const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const Admin = require("../models/adminModel");
const { sendPasswordResetOtpEmail } = require("../services/emailService");

// Generate JWT token
const createToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET || "default_jwt_secret_key_12345",
    { expiresIn: "7d" }
  );
};

// Sanitized user object response
const cleanUser = (user) => ({
  _id: user._id,
  id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone || "",
  role: user.role,
});

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email and password are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ message: "An account with this email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      phone: (phone || "").trim(),
      role: "user",
    });

    const token = createToken(user);

    res.cookie("token", token, {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: "lax",
    });

    res.status(201).json({
      success: true,
      token,
      user: cleanUser(user),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Login user / admin
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (user.role === "admin") {
      await Admin.findOneAndUpdate(
        { user: user._id },
        { lastLogin: new Date() },
        { upsert: true }
      );
    }

    const token = createToken(user);

    res.cookie("token", token, {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: "lax",
    });

    res.json({
      success: true,
      token,
      user: cleanUser(user),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Logout user / clear cookie
// @route   POST /api/auth/logout
// @access  Public
const logoutUser = (req, res) => {
  res.clearCookie("token");
  res.json({ success: true, message: "Logged out successfully" });
};

// @desc    Get current logged in user details
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({ success: true, user: cleanUser(user) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Forgot password - generate secure OTP and dispatch real email
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Registered email address is required" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(404).json({
        message: `No Screenly account is registered with the email "${email}". Please verify your email or register.`,
      });
    }

    // Generate secure random 6-digit OTP code using crypto
    const otp = crypto.randomInt(100000, 999999).toString();
    const expiryMinutes = 15;
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    user.resetPasswordOtp = otp;
    user.resetPasswordExpires = expiresAt;
    user.resetPasswordAttempts = 0;
    await user.save();

    // Send real email via configured Nodemailer transport
    let emailResult = null;
    try {
      emailResult = await sendPasswordResetOtpEmail({
        to: user.email,
        name: user.name || "Customer",
        otp,
        expiresInMinutes: expiryMinutes,
      });

      console.log(`\n============================================================`);
      console.log(`[SCREENLY PASSWORD RECOVERY - OTP DISPATCH]`);
      console.log(`Recipient: ${user.email}`);
      console.log(`Verification OTP: ${otp} (Expires in ${expiryMinutes} minutes)`);
      if (emailResult && emailResult.previewUrl) {
        console.log(`Sandbox Inbox URL: ${emailResult.previewUrl}`);
        console.log(`NOTE: Real inbox delivery requires GMAIL_USER & GMAIL_APP_PASSWORD in server/.env`);
      } else {
        console.log(`Delivery: Sent via authenticated mail provider.`);
      }
      console.log(`============================================================\n`);
    } catch (mailError) {
      console.error(`[Screenly Mailer Error] Failed to send email to ${user.email}:`, mailError.message);
      return res.status(500).json({
        message: "Failed to dispatch verification email. Please check your mail service configuration.",
      });
    }

    // IMPORTANT: Never return the OTP in the API response
    res.json({
      success: true,
      message: "A verification code has been sent to your registered email address.",
      email: user.email,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Reset password with OTP verification and attempt limitation
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
      return res.status(400).json({
        message: "Email, recovery code, and new password are required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        message: "New password must be at least 6 characters long",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail }).select(
      "+password +resetPasswordOtp +resetPasswordExpires +resetPasswordAttempts"
    );

    if (!user) {
      return res.status(404).json({ message: "No account found with this email." });
    }

    if (!user.resetPasswordOtp || !user.resetPasswordExpires) {
      return res.status(400).json({
        message: "No active password reset request found. Please request a new verification code.",
      });
    }

    // Check expiration
    if (new Date() > new Date(user.resetPasswordExpires)) {
      user.resetPasswordOtp = undefined;
      user.resetPasswordExpires = undefined;
      user.resetPasswordAttempts = 0;
      await user.save();
      return res.status(400).json({
        message: "The verification code has expired. Please request a new verification code.",
      });
    }

    // Check OTP match
    if (user.resetPasswordOtp !== String(code).trim()) {
      user.resetPasswordAttempts = (user.resetPasswordAttempts || 0) + 1;

      // Enforce limit of 5 incorrect attempts
      if (user.resetPasswordAttempts >= 5) {
        user.resetPasswordOtp = undefined;
        user.resetPasswordExpires = undefined;
        user.resetPasswordAttempts = 0;
        await user.save();

        return res.status(400).json({
          message: "Too many incorrect attempts (5). For your security, this verification code has been invalidated. Please request a new code.",
        });
      }

      await user.save();
      const remaining = 5 - user.resetPasswordAttempts;
      return res.status(400).json({
        message: `Invalid verification code. You have ${remaining} attempt(s) remaining.`,
      });
    }

    // Hash the new password and invalidate the OTP
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.resetPasswordOtp = undefined;
    user.resetPasswordExpires = undefined;
    user.resetPasswordAttempts = 0;
    await user.save();

    res.json({
      success: true,
      message: "Password reset successfully! You can now sign in with your new password.",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  registerUser,
  loginUser,
  logoutUser,
  getMe,
  forgotPassword,
  resetPassword,
};
