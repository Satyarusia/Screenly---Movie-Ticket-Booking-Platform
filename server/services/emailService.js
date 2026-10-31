// server/services/emailService.js
const nodemailer = require("nodemailer");

let cachedTransporter = null;

/**
 * Checks whether an email or password is a placeholder template rather than real credentials.
 */
const isPlaceholder = (val) => {
  if (!val || typeof val !== "string") return true;
  const lower = val.trim().toLowerCase();
  return (
    lower.includes("your-email") ||
    lower.includes("your_email") ||
    lower.includes("your-app-password") ||
    lower.includes("your_app_password") ||
    lower.includes("your-smtp-password") ||
    lower.includes("xxxx") ||
    lower.includes("example.com")
  );
};

/**
 * Creates and initializes the Nodemailer transport based on environment configuration.
 * Priority:
 * 1. Dedicated SMTP configuration (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS)
 * 2. Gmail App Password service (GMAIL_USER, GMAIL_APP_PASSWORD)
 * 3. Ethereal Test Account (Development sandbox fallback when credentials are not yet configured)
 */
const getTransporter = async () => {
  if (cachedTransporter) {
    return cachedTransporter;
  }

  const smtpUser = process.env.SMTP_USER?.trim();
  const smtpPass = process.env.SMTP_PASS?.trim();
  const smtpHost = process.env.SMTP_HOST?.trim();

  // 1. Check custom SMTP configuration
  if (smtpHost && smtpUser && !isPlaceholder(smtpUser) && !isPlaceholder(smtpPass)) {
    const isSecure =
      process.env.SMTP_SECURE === "true" ||
      Number(process.env.SMTP_PORT) === 465;

    cachedTransporter = nodemailer.createTransport({
      host: smtpHost,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: isSecure,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
      tls: {
        rejectUnauthorized: process.env.NODE_ENV === "production",
      },
    });

    console.log(`[Screenly Mailer] Configured custom SMTP transport (${smtpHost}:${process.env.SMTP_PORT || 587})`);
    return cachedTransporter;
  }

  const gmailUser = process.env.GMAIL_USER?.trim();
  const rawGmailPass = (process.env.GMAIL_APP_PASSWORD || process.env.GMAIL_PASS || "").trim();
  // Strip spaces from Google App Password (e.g. "abcd efgh ijkl mnop" -> "abcdefghijklmnop")
  const gmailPass = rawGmailPass.replace(/\s+/g, "");

  // 2. Check Gmail App Password service
  if (gmailUser && gmailPass && !isPlaceholder(gmailUser) && !isPlaceholder(gmailPass)) {
    cachedTransporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: gmailUser,
        pass: gmailPass,
      },
    });

    console.log(`[Screenly Mailer] Configured Gmail service transport (${gmailUser})`);
    return cachedTransporter;
  }

  // 3. Fallback: Ethereal automated testing transport
  try {
    const testAccount = await nodemailer.createTestAccount();
    cachedTransporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });

    console.log(`[Screenly Mailer] No SMTP credentials in .env. Initialized Ethereal test inbox: ${testAccount.user}`);
    return cachedTransporter;
  } catch (err) {
    console.warn(`[Screenly Mailer] Unable to create test inbox: ${err.message}. Initializing fallback stream transport.`);
    cachedTransporter = nodemailer.createTransport({
      streamTransport: true,
      newline: "unix",
      buffer: true,
    });
    return cachedTransporter;
  }
};

/**
 * Resolves a reliable absolute URL for the movie poster in emails.
 */
const resolvePosterUrl = (movie) => {
  if (!movie) return "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500";
  const p = movie.poster || movie.media;
  if (!p) return "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500";
  if (p.startsWith("http://") || p.startsWith("https://")) return p;
  if (p.startsWith("/")) return `https://image.tmdb.org/t/p/w500${p}`;
  return p;
};

/**
 * Derives human-readable seat categories based on seat ID prefixes.
 */
const resolveSeatCategories = (seats = []) => {
  if (!Array.isArray(seats) || seats.length === 0) return "General Admission";
  const categories = new Set();
  seats.forEach((s) => {
    const prefix = String(s).charAt(0).toUpperCase();
    if (prefix === "B") categories.add("Balcony (Gold Class)");
    else if (prefix === "M") categories.add("Middle (Executive)");
    else if (prefix === "L") categories.add("Lower (Classic)");
    else categories.add("Premium");
  });
  return Array.from(categories).join(", ");
};

/**
 * Sends a real transactional password reset email with the 6-digit OTP code.
 *
 * @param {Object} options
 * @param {string} options.to - Recipient email address
 * @param {string} options.name - Recipient user name
 * @param {string} options.otp - 6-digit one-time password code
 * @param {number} options.expiresInMinutes - Expiry window in minutes
 */
const sendPasswordResetOtpEmail = async ({ to, name = "Valued Customer", otp, expiresInMinutes = 15 }) => {
  const transporter = await getTransporter();

  const fromAddress =
    process.env.EMAIL_FROM ||
    process.env.SMTP_USER ||
    process.env.GMAIL_USER ||
    '"Screenly Security" <security@screenly.in>';

  const subject = `Your Screenly Password Recovery Code: ${otp}`;

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Screenly Password Reset</title>
    </head>
    <body style="margin: 0; padding: 20px 0; background-color: #0a0b12; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f8fafc;">
      <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; margin: 0 auto; background: #121422; border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.1); overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.6);">
        <!-- Header Strip -->
        <tr>
          <td style="background: linear-gradient(135deg, #e50914 0%, #8b0000 100%); padding: 26px 32px; text-align: center;">
            <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">SCREEN<span style="color: #ffffff;">LY</span></h1>
            <p style="margin: 4px 0 0 0; color: rgba(255,255,255,0.9); font-size: 13px; font-weight: 500;">Account Security Notification</p>
          </td>
        </tr>

        <!-- Content Body -->
        <tr>
          <td style="padding: 32px 36px;">
            <p style="margin-top: 0; font-size: 16px; color: #ffffff; line-height: 1.5;">
              Hi <strong>${name}</strong>,
            </p>
            <p style="font-size: 14px; color: #94a3b8; line-height: 1.6; margin-bottom: 24px;">
              We received a request to reset the password for your Screenly cinema account (<strong>${to}</strong>). Use the verification code below to complete your password reset:
            </p>

            <!-- OTP Card -->
            <div style="background: #171a2b; border: 2px dashed #e50914; border-radius: 10px; padding: 24px; text-align: center; margin: 24px 0;">
              <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #ef4444; font-weight: 700; margin-bottom: 8px;">
                Verification OTP Code
              </div>
              <div style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #ffffff; font-family: 'Courier New', Courier, monospace; margin: 8px 0;">
                ${otp}
              </div>
              <div style="font-size: 12px; color: #94a3b8; margin-top: 8px;">
                Valid for the next <strong>${expiresInMinutes} minutes</strong>
              </div>
            </div>

            <!-- Security Warnings -->
            <div style="background: rgba(245, 158, 11, 0.08); border-left: 4px solid #f59e0b; padding: 14px 16px; border-radius: 4px; margin-bottom: 24px;">
              <p style="margin: 0; font-size: 12px; color: #cbd5e1; line-height: 1.5;">
                <strong style="color: #f59e0b;">Security Notice:</strong> Never share this 6-digit code with anyone, including Screenly support representatives. Screenly staff will never ask you for your verification code.
              </p>
            </div>

            <p style="font-size: 13px; color: #64748b; line-height: 1.5; margin-bottom: 0;">
              If you did not request this password reset, you can safely ignore this email. Your existing password will remain active and unchanged.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background: #0d0f1a; padding: 18px 32px; text-align: center; border-top: 1px solid rgba(255,255,255,0.06);">
            <p style="margin: 0; font-size: 11px; color: #64748b; line-height: 1.4;">
              &copy; ${new Date().getFullYear()} Screenly Cinema Network &bull; India<br>
              This is an automated security transmission. Please do not reply to this email.
            </p>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  const textContent = `
Screenly Account Security Notification

Hi ${name},

We received a request to reset your password. Your 6-digit recovery code is:

${otp}

This code is valid for ${expiresInMinutes} minutes.

Security Notice: Never share this code with anyone. If you did not request this password reset, please ignore this email.

Screenly Cinema Network
  `.trim();

  const mailOptions = {
    from: fromAddress,
    to,
    subject,
    text: textContent,
    html: htmlContent,
  };

  const info = await transporter.sendMail(mailOptions);
  const previewUrl = nodemailer.getTestMessageUrl(info);

  console.log(`[Screenly Mailer] Password reset email sent to: ${to} (Message ID: ${info.messageId})`);
  if (previewUrl) {
    console.log(`[Screenly Mailer] Preview URL (Ethereal Sandbox): ${previewUrl}`);
  }

  return {
    success: true,
    messageId: info.messageId,
    previewUrl: previewUrl || null,
  };
};

/**
 * Sends a production-grade, responsive Booking Confirmation Email to the user.
 * Automatically triggered upon successful payment completion.
 *
 * @param {Object} options
 * @param {Object} options.booking - Populated MongoDB booking object
 * @param {string} options.recipientEmail - Customer's registered email
 * @param {string} options.recipientName - Customer's name
 */
const sendBookingConfirmationEmail = async ({ booking, recipientEmail, recipientName }) => {
  if (!booking) {
    throw new Error("Cannot send confirmation email: booking object is required");
  }

  const to = recipientEmail || booking.user?.email;
  if (!to) {
    console.warn("[Screenly Mailer] Cannot send booking confirmation: No recipient email found.");
    return { success: false, reason: "No recipient email" };
  }

  const name = recipientName || booking.user?.name || "Valued Cinema Guest";
  const transporter = await getTransporter();

  const fromAddress =
    process.env.EMAIL_FROM ||
    process.env.SMTP_USER ||
    process.env.GMAIL_USER ||
    '"Screenly Box Office" <tickets@screenly.in>';

  const bookingId = booking._id?.toString() || booking.bookingId || "BK" + Date.now();
  const paymentId = booking.transactionId || "PAY" + Date.now();

  const movie = booking.movie || booking.show?.movie || {};
  const theatre = booking.theatre || booking.show?.theatre || {};
  const movieTitle = movie.title || movie.movieName || "Cinema Screening";
  const moviePoster = resolvePosterUrl(movie);
  const movieLang = movie.language || "Hindi / English";
  const movieFormat = movie.formats?.join(", ") || booking.show?.format || "2D";
  const certification = movie.certification || "U/A";
  const duration = movie.duration ? `${movie.duration} min` : "150 min";

  const theatreName = theatre.name || "Screenly Multiplex";
  const theatreCity = theatre.city || "Cinema City";
  const screenName = booking.screen || booking.show?.screen || "Screen 1 (Dolby Atmos)";

  // Format Show Date & Time
  let showDate = booking.showDate;
  let showTime = booking.showTime;
  if (!showDate && booking.show?.showTime) {
    const d = new Date(booking.show.showTime);
    showDate = d.toLocaleDateString("en-IN", {
      weekday: "long",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    showTime = d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  }
  showDate = showDate || "Today";
  showTime = showTime || "07:30 PM";

  // Seats & Pricing
  const seats = Array.isArray(booking.seats) ? booking.seats : [booking.seats || "A1"];
  const ticketCount = seats.length;
  const seatCategory = resolveSeatCategories(seats);
  const totalAmount = Number(booking.totalAmount || 0);
  const convenienceFeePerTicket = 30;
  const convenienceFeeTotal = convenienceFeePerTicket * ticketCount;
  const baseTicketAmount = Math.max(0, totalAmount - convenienceFeeTotal);
  const gstAmount = Math.round(convenienceFeeTotal * 0.18);

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=SCREENLY_${bookingId}`;
  const bookingDateStr = booking.createdAt
    ? new Date(booking.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
    : new Date().toLocaleString("en-IN");

  const subject = `Confirmed: Your Screenly Tickets for "${movieTitle}" [Booking ID: #${bookingId}]`;

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Screenly Booking Confirmation</title>
    </head>
    <body style="margin: 0; padding: 24px 0; background-color: #08090f; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f8fafc;">
      <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 620px; margin: 0 auto; background: #121424; border-radius: 14px; border: 1px solid rgba(255, 255, 255, 0.12); overflow: hidden; box-shadow: 0 16px 40px rgba(0,0,0,0.7);">
        <!-- Official Brand Header -->
        <tr>
          <td style="background: linear-gradient(135deg, #e50914 0%, #8b0000 100%); padding: 26px 36px; text-align: center;">
            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 900; letter-spacing: -0.5px;">SCREEN<span style="color: #ffffff;">LY</span></h1>
            <p style="margin: 6px 0 0 0; color: rgba(255,255,255,0.95); font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Official Admission Pass &bull; Verified Entry</p>
          </td>
        </tr>

        <!-- Confirmation Banner -->
        <tr>
          <td style="background: #0f121e; padding: 18px 36px; border-bottom: 1px solid rgba(255,255,255,0.08); text-align: center;">
            <div style="display: inline-block; background: rgba(16, 185, 129, 0.15); border: 1px solid #10b981; border-radius: 20px; padding: 6px 16px;">
              <span style="color: #10b981; font-weight: 700; font-size: 13px;">Booking Status: CONFIRMED</span>
            </div>
            <div style="margin-top: 8px; font-size: 12px; color: #94a3b8;">
              Payment ID: <strong style="color: #f8fafc; font-family: monospace;">${paymentId}</strong> &bull; Booking ID: <strong style="color: #f8fafc; font-family: monospace;">#${bookingId}</strong>
            </div>
          </td>
        </tr>

        <!-- Main Body -->
        <tr>
          <td style="padding: 32px 36px;">
            <p style="margin-top: 0; font-size: 16px; color: #ffffff; line-height: 1.5;">
              Hi <strong>${name}</strong>,
            </p>
            <p style="font-size: 14px; color: #94a3b8; line-height: 1.6; margin-bottom: 24px;">
              Your cinema booking is successfully authorized and confirmed! Present the digital QR pass below at the auditorium entrance or ticket turnstile.
            </p>

            <!-- Movie & Theatre Details Card -->
            <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background: #181b2d; border-radius: 12px; border: 1px solid rgba(255,255,255,0.08); overflow: hidden; margin-bottom: 24px;">
              <tr>
                <td width="130" valign="top" style="padding: 16px; text-align: center;">
                  <img src="${moviePoster}" alt="${movieTitle}" width="110" height="155" style="display: block; border-radius: 8px; object-fit: cover; border: 1px solid rgba(255,255,255,0.1);" />
                </td>
                <td valign="top" style="padding: 16px 20px 16px 0;">
                  <div style="font-size: 11px; text-transform: uppercase; color: #ef4444; font-weight: 700; letter-spacing: 1px; margin-bottom: 4px;">
                    ${movieFormat} &bull; ${movieLang} &bull; ${certification}
                  </div>
                  <h2 style="margin: 0 0 10px 0; font-size: 20px; font-weight: 800; color: #ffffff; line-height: 1.3;">
                    ${movieTitle}
                  </h2>
                  <div style="font-size: 13px; color: #cbd5e1; margin-bottom: 6px;">
                    <strong>${theatreName}</strong> &bull; ${screenName}
                  </div>
                  <div style="font-size: 12px; color: #94a3b8; margin-bottom: 8px;">
                    City: <strong>${theatreCity}</strong> &bull; Runtime: <strong>${duration}</strong>
                  </div>
                  <div style="display: inline-block; background: rgba(239, 68, 68, 0.12); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 6px; padding: 4px 10px; font-size: 13px; color: #fca5a5; font-weight: 600;">
                    ${showDate} at ${showTime}
                  </div>
                </td>
              </tr>
            </table>

            <!-- Seat Reservation Details -->
            <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background: #181b2d; border-radius: 12px; border: 1px solid rgba(255,255,255,0.08); padding: 18px 22px; margin-bottom: 24px;">
              <tr>
                <td width="50%" valign="top">
                  <div style="font-size: 11px; text-transform: uppercase; color: #94a3b8; font-weight: 700; letter-spacing: 0.5px;">Confirmed Seats</div>
                  <div style="font-size: 22px; font-weight: 900; color: #ef4444; margin-top: 4px; font-family: monospace;">
                    ${seats.join(", ")}
                  </div>
                  <div style="font-size: 12px; color: #cbd5e1; margin-top: 4px;">
                    ${ticketCount} Ticket(s) &bull; ${seatCategory}
                  </div>
                </td>
                <td width="50%" valign="top" style="text-align: right;">
                  <div style="font-size: 11px; text-transform: uppercase; color: #94a3b8; font-weight: 700; letter-spacing: 0.5px;">Total Paid</div>
                  <div style="font-size: 24px; font-weight: 900; color: #10b981; margin-top: 4px;">
                    ₹${totalAmount.toLocaleString("en-IN")}
                  </div>
                  <div style="font-size: 12px; color: #cbd5e1; margin-top: 4px;">
                    ${booking.paymentMethod || "UPI / Card Online"}
                  </div>
                </td>
              </tr>
            </table>

            <!-- QR Code Section -->
            <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background: #131627; border: 2px dashed rgba(229, 9, 20, 0.4); border-radius: 12px; padding: 22px; text-align: center; margin-bottom: 24px;">
              <tr>
                <td align="center">
                  <div style="background: #ffffff; display: inline-block; padding: 10px; border-radius: 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.4);">
                    <img src="${qrUrl}" alt="Digital Entry Pass QR Code" width="140" height="140" style="display: block;" />
                  </div>
                  <div style="font-size: 13px; font-weight: 700; color: #ffffff; margin-top: 10px;">
                    SCAN FOR AUDITORIUM ENTRY
                  </div>
                  <div style="font-size: 12px; color: #94a3b8; margin-top: 4px;">
                    Show this QR pass at the entrance scanner or to the cinema usher
                  </div>
                </td>
              </tr>
            </table>

            <!-- Financial Breakdown Table -->
            <table width="100%" border="0" cellpadding="0" cellspacing="0" style="border-collapse: collapse; font-size: 13px; margin-bottom: 24px; color: #cbd5e1;">
              <tr style="border-bottom: 1px solid rgba(255,255,255,0.08);">
                <td style="padding: 8px 0; color: #94a3b8;">Base Ticket Fare (${ticketCount} seats)</td>
                <td style="padding: 8px 0; text-align: right; color: #ffffff;">₹${baseTicketAmount.toLocaleString("en-IN")}</td>
              </tr>
              <tr style="border-bottom: 1px solid rgba(255,255,255,0.08);">
                <td style="padding: 8px 0; color: #94a3b8;">Convenience Fee</td>
                <td style="padding: 8px 0; text-align: right; color: #ffffff;">₹${convenienceFeeTotal.toLocaleString("en-IN")}</td>
              </tr>
              <tr style="border-bottom: 1px solid rgba(255,255,255,0.08);">
                <td style="padding: 8px 0; color: #94a3b8;">Integrated GST (18%)</td>
                <td style="padding: 8px 0; text-align: right; color: #ffffff;">₹${gstAmount.toLocaleString("en-IN")}</td>
              </tr>
              <tr>
                <td style="padding: 12px 0 4px 0; font-weight: 800; font-size: 15px; color: #ffffff;">Total Amount Paid</td>
                <td style="padding: 12px 0 4px 0; text-align: right; font-weight: 800; font-size: 16px; color: #10b981;">₹${totalAmount.toLocaleString("en-IN")}</td>
              </tr>
            </table>

            <!-- Customer Support & Notice -->
            <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 14px 18px; font-size: 12px; color: #94a3b8; line-height: 1.5;">
              <strong style="color: #ffffff;">Need help with your booking?</strong> Contact our 24/7 Cinema Support desk at <a href="mailto:support@screenly.in" style="color: #ef4444; text-decoration: none;">support@screenly.in</a> or visit our online help center. Booking completed on: ${bookingDateStr}.
            </div>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background: #090b14; padding: 20px 36px; text-align: center; border-top: 1px solid rgba(255,255,255,0.08);">
            <p style="margin: 0; font-size: 11px; color: #64748b; line-height: 1.5;">
              &copy; ${new Date().getFullYear()} Screenly Cinema Network India Private Limited.<br>
              This is a verified computer-generated admission voucher. Please arrive 15 minutes before showtime.
            </p>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  const textContent = `
SCREENLY BOOKING CONFIRMATION & DIGITAL PASS
==========================================
Status: CONFIRMED
Booking ID: #${bookingId}
Payment ID: ${paymentId}
Date of Booking: ${bookingDateStr}

MOVIE & THEATRE DETAILS:
Movie: ${movieTitle} (${movieFormat}, ${movieLang}, ${certification})
Theatre: ${theatreName}, ${theatreCity}
Auditorium: ${screenName}
Date & Time: ${showDate} at ${showTime}

SEAT RESERVATION:
Seats: ${seats.join(", ")} (${ticketCount} Tickets)
Category: ${seatCategory}

PAYMENT SUMMARY:
Base Ticket Price: ₹${baseTicketAmount}
Convenience Fee: ₹${convenienceFeeTotal}
GST (18%): ₹${gstAmount}
Total Paid: ₹${totalAmount} via ${booking.paymentMethod || "UPI / Card Online"}

DIGITAL QR PASS:
View / Scan QR: ${qrUrl}

Customer Support: support@screenly.in
Thank you for booking with Screenly Cinema Network!
  `.trim();

  const mailOptions = {
    from: fromAddress,
    to,
    subject,
    text: textContent,
    html: htmlContent,
  };

  const info = await transporter.sendMail(mailOptions);
  const previewUrl = nodemailer.getTestMessageUrl(info);

  console.log(`[Screenly Mailer] Booking confirmation email dispatched to: ${to} (Message ID: ${info.messageId})`);
  if (previewUrl) {
    console.log(`[Screenly Mailer] Preview URL (Ethereal Sandbox): ${previewUrl}`);
  }

  return {
    success: true,
    messageId: info.messageId,
    previewUrl: previewUrl || null,
  };
};

module.exports = {
  getTransporter,
  sendPasswordResetOtpEmail,
  sendBookingConfirmationEmail,
};
