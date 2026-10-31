// client/src/services/emailService.js
// Client-side confirmation email handler and local preview store for Screenly tickets

export const generateTicketEmailHtml = (booking, customerName = "Cinema Guest") => {
  const movieTitle = booking.movie?.title || booking.movieName || "Cinema Screening";
  const theatreName = booking.theatre?.name || "Screenly Multiplex";
  const theatreLocation = booking.theatre?.location ? `${booking.theatre.location}, ${booking.theatre.city || ""}` : (booking.theatre?.city || "Downtown");
  const screen = booking.theatre?.screen || "Audi 1 (Dolby Atmos 7.1)";
  const showDate = booking.showDate || (booking.show?.showTime ? new Date(booking.show.showTime).toLocaleDateString() : "Today");
  const showTime = booking.showTime || (booking.show?.showTime ? new Date(booking.show.showTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "7:30 PM");
  const seats = Array.isArray(booking.seats) ? booking.seats.join(", ") : (booking.seats || "L1");
  const bookingId = booking.bookingId || booking._id || `BK${Date.now()}`;
  const totalAmount = booking.totalAmount || 0;
  const paymentMethod = booking.paymentMethod || "UPI / Card Online";
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=SCREENLY_${bookingId}`;

  return `
    <div style="max-width: 600px; margin: 0 auto; font-family: 'Segoe UI', Arial, sans-serif; background: #0a0b12; color: #ffffff; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
      <div style="background: linear-gradient(135deg, #e50914 0%, #8b0000 100%); padding: 24px; text-align: center;">
        <h1 style="margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">SCREEN<span style="color: #ffffff;">LY</span></h1>
        <p style="margin: 6px 0 0 0; font-size: 13px; opacity: 0.9;">Official Cinema Booking Confirmation Pass</p>
      </div>

      <div style="padding: 24px 28px;">
        <p style="font-size: 15px; margin-top: 0;">Hi <strong>${customerName}</strong>,</p>
        <p style="font-size: 14px; color: #94a3b8; line-height: 1.5;">
          Your seats are officially confirmed! Below is your verified digital cinema ticket and box office QR pass.
        </p>

        <div style="background: #151828; border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 20px; margin: 20px 0;">
          <div style="border-bottom: 1px dashed rgba(255,255,255,0.15); padding-bottom: 14px; margin-bottom: 14px;">
            <div style="font-size: 11px; text-transform: uppercase; color: #e50914; font-weight: 700; letter-spacing: 1px;">Booking Reference</div>
            <div style="font-size: 18px; font-weight: 700; font-family: monospace; color: #f8fafc;">#${bookingId}</div>
          </div>

          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <tr>
              <td style="padding: 6px 0; color: #94a3b8; width: 35%;">Movie:</td>
              <td style="padding: 6px 0; color: #ffffff; font-weight: 700;">${movieTitle}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #94a3b8;">Theatre:</td>
              <td style="padding: 6px 0; color: #ffffff;">${theatreName} (${theatreLocation})</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #94a3b8;">Auditorium / Screen:</td>
              <td style="padding: 6px 0; color: #ffffff;">${screen}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #94a3b8;">Date & Time:</td>
              <td style="padding: 6px 0; color: #ffffff;">${showDate} at ${showTime}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #94a3b8;">Confirmed Seats:</td>
              <td style="padding: 6px 0; color: #ef4444; font-weight: 700; font-size: 15px;">${seats}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #94a3b8;">Payment Status:</td>
              <td style="padding: 6px 0; color: #10b981; font-weight: 700;">Successful (Verified)</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #94a3b8;">Booking Status:</td>
              <td style="padding: 6px 0; color: #10b981; font-weight: 700;">Confirmed</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #94a3b8;">Amount Paid:</td>
              <td style="padding: 6px 0; color: #ffffff; font-weight: 700;">₹${totalAmount} via ${paymentMethod}</td>
            </tr>
          </table>

          <div style="text-align: center; margin-top: 20px; padding-top: 16px; border-top: 1px dashed rgba(255,255,255,0.15);">
            <div style="background: #ffffff; display: inline-block; padding: 8px; border-radius: 8px;">
              <img src="${qrUrl}" alt="Ticket QR Code" width="120" height="120" style="display: block;" />
            </div>
            <div style="font-size: 11px; color: #94a3b8; margin-top: 6px;">Scan this QR code at cinema turnstile or usher checkpoint</div>
          </div>
        </div>

        <p style="font-size: 12px; color: #64748b; text-align: center; margin-bottom: 0;">
          Please arrive 15 minutes before showtime. This is an official computer-generated confirmation e-pass from Screenly Cinema System.
        </p>
      </div>

      <div style="background: #0f111c; padding: 14px; text-align: center; border-top: 1px solid rgba(255,255,255,0.06); font-size: 11px; color: #64748b;">
        &copy; ${new Date().getFullYear()} Screenly Cinema Network &bull; Official Admission Pass
      </div>
    </div>
  `;
};

export const sendBookingConfirmationEmail = async ({ toEmail, customerName, booking }) => {
  // Simulate 1 second network transmission
  await new Promise((r) => setTimeout(r, 1000));

  const bookingId = booking.bookingId || booking._id || `BK${Date.now()}`;
  const movieTitle = booking.movie?.title || booking.movieName || "Movie";

  const emailHtml = generateTicketEmailHtml(booking, customerName || "Valued Customer");

  const emailRecord = {
    id: "EML_" + Date.now(),
    to: toEmail || "customer@example.com",
    subject: `Screenly Booking Confirmed: ${movieTitle} [ID: #${bookingId}]`,
    sentAt: new Date().toISOString(),
    bookingId,
    movieTitle,
    html: emailHtml,
  };

  try {
    const existing = JSON.parse(localStorage.getItem("screenly_sent_emails") || "[]");
    existing.unshift(emailRecord);
    localStorage.setItem("screenly_sent_emails", JSON.stringify(existing.slice(0, 20)));
  } catch {
    // ignore
  }

  return { success: true, email: emailRecord };
};

export const getSentEmails = () => {
  try {
    return JSON.parse(localStorage.getItem("screenly_sent_emails") || "[]");
  } catch {
    return [];
  }
};
