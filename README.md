# Screenly - Movie Ticket Booking System

A complete, production-ready MERN Stack (MongoDB, Express, React, Node.js) Movie Ticket Booking Web Application built with an MVC architecture, interactive tiered seat layout, secure checkout gateway, and full administrative management.

---

## Key Features

### User / Customer Experience
- **Cinematic Homepage**: Dynamic spotlight hero banner, real-time search, genre pill filters, and featured blockbusters.
- **Movies Catalog**: Multi-attribute filtering (genre, language, runtime) with rating badges and sort controls.
- **Detailed Movie & Showtimes**: High-resolution movie details, trailer synopsis, star cast, interactive date picker (+5 days), and grouped multiplex showtimes.
- **Interactive 3D Seating Layout**:
  - **Balcony Recliner** ($B_1 \dots B_n$) with premium pricing
  - **Middle Executive** ($M_1 \dots M_n$)
  - **Lower Class** ($L_1 \dots L_n$)
  - Screen projection glow indicator ("All Eyes This Way")
  - Maximum 8 seats per booking constraint
  - Automatic atomic hold reservation with background cleanup
- **Secure Payment Gateway**:
  - Payment channels: UPI (PhonePe, Google Pay, Paytm, CRED), Credit/Debit Cards (Visa, MasterCard, RuPay), and Net Banking.
  - Multi-stage realistic payment authorization animation.
  - Automatic payment status resolution: Confirmed with verified transaction ID (`PAY...`), permanent seat locking in MongoDB, and automated confirmation email dispatch.
  - Automatic seat release: If transaction is cancelled or declined, reserved seats are immediately restored to the auditorium.
- **Automated Booking Confirmation Email**:
  - Automatically sends responsive digital tickets with scannable QR code, movie poster, cinema venue, seat categories, and financial breakdown to the user's registered email address.
- **Real Email Password Recovery**:
  - Generates secure random 6-digit OTP codes with 15-minute expiration windows.
  - Transmits security codes via Nodemailer (Gmail App Password / custom SMTP).
  - Enforces attempt limitations and invalidates used codes.
- **Printable E-Ticket**: Instant confirmation pass with scannable QR pass, seat identifiers, venue breakdown, and print action (`window.print()`).
- **Profile & Booking History**: Active tickets, cancellation with instant seat release, saved favourites, and profile management.

### Admin Management Operations
- **Show Management**: Schedule screenings with time slot conflict detection, edit existing schedules, and delete shows.
- **Manage Movies**: Full CRUD with modal form, poster preview, rating, runtime, and star cast.
- **Manage Theatres**: Configure multiplexes, location, and tiered seat counts & prices.
- **Manage Bookings**: Inspect customer reservations, transaction references, and cancel/delete records.
- **Manage Users**: Review registered users and roles.

---

## Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | React 19, Vite, React Router 7, Bootstrap 5, FontAwesome, Custom Glassmorphism CSS |
| **State Management** | React Context API (`AuthContext`) |
| **HTTP Client** | Axios (with JWT interceptors & credentials) |
| **Backend Runtime** | Node.js & Express.js (MVC Pattern) |
| **Database** | MongoDB & Mongoose ODM |
| **Email Service** | Nodemailer (SMTP, Gmail App Password, Ethereal Sandbox fallback) |
| **Security & Auth** | JSON Web Tokens (JWT), Cookie-Parser, Bcryptjs Password Hashing |

---

## Database Schemas & Entities

1. **User (`userModel.js`)**: `name`, `email`, `password`, `phone`, `role` (`user` | `admin`), `resetPasswordOtp`, `resetPasswordExpires`, `resetPasswordAttempts`.
2. **Admin (`adminModel.js`)**: `user` (ref), `adminCode`, `department`, `permissions`, `lastLogin`.
3. **Movie (`movieModel.js`)**: `title`, `tmdbId`, `genre`, `language`, `duration`, `rating`, `certification`, `cast`, `releaseDate`, `description`, `poster`.
4. **Theatre (`theatreModel.js`)**: `name`, `city`, `location`, `seats` (`lower`, `middle`, `balcony`), `prices` (`lower`, `middle`, `balcony`).
5. **Show (`showModel.js`)**: `movie` (ref), `theatre` (ref), `showTime`, `bookedSeats` (`[String]`).
6. **Booking (`bookingModel.js`)**: `user` (ref), `show` (ref), `seats`, `totalAmount`, `status` (`pending`, `confirmed`, `cancelled`, `expired`), `paymentStatus` (`Pending`, `Success`, `Failed`), `paymentMethod`, `transactionId`, `expiresAt`, `emailSent`, `emailSentAt`.
7. **Favourite (`favouriteModel.js`)**: `user` (ref), `movie` (ref).

---

## Quick Start & Execution Steps

### 1. Backend Server Setup

```bash
cd server
npm install
# Start the development server
npm start
```
*Backend server starts at `http://localhost:5000`.*

### 2. Frontend Client Setup

```bash
cd ../client
npm install
npm run dev
```
*Frontend client starts at `http://localhost:5173`.*

---

## Email Service Configuration (`server/.env`)

Configure either a Gmail App Password or custom SMTP in `server/.env`:

```env
# Option 1: Gmail Direct with App Password
GMAIL_USER=your_email@gmail.com
GMAIL_APP_PASSWORD=your_16_char_app_password
EMAIL_FROM="Screenly Box Office" <tickets@screenly.in>

# Option 2: Custom SMTP (SendGrid, Brevo, AWS SES, Resend)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_smtp_password
```

---

## Demo Login Credentials

For convenience during evaluation, one-click demo fill buttons are provided on the Sign-In page:

| Role | Email | Password | Access Rights |
| :--- | :--- | :--- | :--- |
| **Customer (User)** | `user@imovies.com` | `user123` | Book tickets, seat selection, secure checkout, favourites, profile |
| **Administrator** | `admin@imovies.com` | `admin123` | Full admin dashboard, show management, manage movies, theatres, & all bookings |
