# Screenly - Movie Ticket Booking Platform

A full-stack movie ticket booking web application built using the MERN stack (MongoDB, Express.js, React, Node.js).

---

## About the Project

Screenly is a web application created as a college learning project to understand how real-world movie ticket booking websites (like BookMyShow) work behind the scenes. 

When booking movie tickets online, users go through a complete sequence: selecting their city, browsing currently playing films, checking theatre showtimes, choosing seats from different seating tiers, paying for tickets, and getting a digital admission ticket with a scannable QR code.

The main purpose of this project was to learn and practice full-stack web development by building both the frontend user interface and the backend REST API from scratch.

---

## Project Objectives

The key learning goals for this project were:

- Learning full-stack MERN stack development (MongoDB, Express, React, Node.js).
- Designing a normalized database structure using Mongoose schemas and relationships.
- Building RESTful API endpoints for movies, theatres, shows, bookings, users, and reviews.
- Implementing secure user authentication using JSON Web Tokens (JWT) and password hashing with Bcrypt.
- Building a responsive, interactive user interface in React using modern hooks and Context API.
- Creating an atomic seat reservation system with a countdown timer to prevent seat booking conflicts.
- Practicing clean code organization, Git version control, and component-based architecture.

---

## Features

### Guest (Unregistered Visitors)
- **Landing Page**: Welcome page introducing the application with quick links to explore or log in.
- **Browse Movies**: View movies currently showing in theatres, advance booking titles, and upcoming releases.
- **Multi-City Selector**: Select from supported Indian cities (such as Mumbai, Delhi-NCR, Bengaluru, Hyderabad, Pune, Indore, Bhopal) to filter shows and theatres.
- **Search Movies**: Real-time search bar with suggestions to quickly find movies by title, actor, or genre.
- **Movie Filters & Sorting**: Filter movies by genre, language, format (2D, 3D, IMAX), and rating, or sort by release date and popularity.
- **Movie Details**: View synopsis, duration, certification, cast and crew list, audience ratings, and YouTube trailers.
- **Community Reviews**: Read reviews and star ratings submitted by other users.
- **Explore Theatres**: Browse local cinema halls and multiplexes with details on available amenities and formats.
- **User Registration & Login**: Create a new account or sign in with existing credentials.

### Registered User
- **Seat Selection**: Interactive seat grid divided into three price categories:
  - Balcony (Gold Class)
  - Middle (Executive Class)
  - Lower (Classic Class)
- **10-Minute Seat Hold Timer**: When seats are selected, they are temporarily locked for 10 minutes so other users cannot pick them while payment is being completed.
- **Payment Flow**: Select payment method (UPI, Credit/Debit Card, Net Banking) and complete the booking through a multi-step banking authorization screen.
- **Digital Admission Ticket**: Immediate booking confirmation showing booking ID, movie poster, show timing, auditorium screen, seat numbers, and a scannable QR code.
- **Print & Download Pass**: Print or save tickets directly using the browser print function.
- **My Bookings**: View current and past booking history.
- **Self-Service Cancellation**: Cancel an entire booking or cancel specific seats with automated refund calculations and immediate seat release back to the cinema.
- **User Profile**: Update name and phone number, change account password, and manage refund payment details.
- **Wishlist / Favorites**: Save favorite movies to personal wishlist with one click.
- **Submit Reviews**: Rate watched movies on a 1 to 5 star scale and write review feedback.

### Administrator
- **Admin Dashboard**: Overview of key statistics including total revenue, confirmed bookings, active shows, registered users, and total movies.
- **Movie Management**: Add new movies with TMDB ID autofill, edit movie metadata (cast, director, status, trailer ID), or delete movies from the catalog.
- **Show Scheduling**: Schedule new movie screenings with automated time-slot conflict detection to prevent overlapping shows on the same screen.
- **Interactive Seat Preview**: View real-time booked and available seats for any scheduled show directly from the admin panel.
- **Theatre Management**: Add new multiplexes, configure screen names, seat counts per category, and base pricing.
- **Booking Oversight**: View all customer reservations across all theatres and toggle turnstile check-in verification.
- **User Management**: View registered user accounts and manage access permissions.
- **Operational Reports**: View revenue breakdowns by movie and cinema chain, and export booking reports as CSV files.

---

## Technologies Used

### Frontend
- **React 19**: Frontend UI library using functional components and hooks.
- **Vite**: Fast frontend build tool and local development server.
- **React Router DOM v7**: Client-side routing with lazy loading (`React.lazy`) and protected route guards.
- **Bootstrap 5 & Tailwind CSS**: Responsive grid layouts, form styles, and UI utility classes.
- **FontAwesome 6**: Icons for cinema amenities, seats, stars, and navigation controls.
- **Axios**: HTTP client for communicating with the backend REST API with Bearer token interceptors.
- **React Hot Toast**: Toast notifications for user feedback (success, errors, warnings).

### Backend
- **Node.js**: JavaScript runtime environment for the backend server.
- **Express.js 5**: Web application framework for building REST API endpoints and middleware.
- **Mongoose 9**: Object Data Modeling (ODM) library for MongoDB.
- **JSON Web Tokens (jsonwebtoken)**: Secure token generation for user sessions.
- **Bcryptjs**: Password hashing algorithm with salt rounds for credential security.
- **Helmet**: Middleware to secure Express apps by setting various HTTP headers.
- **Express Rate Limit**: Basic rate limiting to protect authentication endpoints from brute-force attempts.
- **Cookie Parser**: Middleware to parse cookies for session handling.

### Database
- **MongoDB Atlas**: Cloud-hosted NoSQL document database.

### External APIs & Media
- **The Movie Database (TMDB) API**: Used to fetch authentic movie descriptions, release dates, genres, and poster artwork.
- **QR Server API**: Generates dynamic QR code images for digital ticket verification.
- **Local Poster Repository**: 696 local high-resolution poster images stored in `client/public/posters/` for fast offline loading.

---

## Folder Structure

```text
screenly/
├── .gitignore                          # Git exclusion rules
├── README.md                           # Project documentation
├── SCREENLY_FINAL_END_TO_END_MANUAL_TESTING_GUIDE.md
├── client/                             # React Frontend (Vite)
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── public/
│   │   ├── favicon.svg
│   │   └── posters/                    # Local movie posters
│   └── src/
│       ├── App.jsx                     # Route definitions and app wrapper
│       ├── main.jsx                    # React root entry point
│       ├── App.css
│       ├── index.css
│       ├── components/                 # Reusable UI components
│       │   ├── AdminNav.jsx
│       │   ├── AdminRoute.jsx
│       │   ├── CityModal.jsx
│       │   ├── ConfirmModal.jsx
│       │   ├── EmptyState.jsx
│       │   ├── Footer.jsx
│       │   ├── LoadingSpinner.jsx
│       │   ├── MovieCard.jsx
│       │   ├── Navbar.jsx
│       │   ├── Pagination.jsx
│       │   ├── ProtectedRoute.jsx
│       │   ├── SeatHoldTimer.jsx
│       │   └── TrailerModal.jsx
│       ├── context/                    # React Context providers
│       │   ├── AuthContext.jsx
│       │   └── CityContext.jsx
│       ├── hooks/                      # Custom React hooks
│       │   ├── useAuth.js
│       │   └── useCity.js
│       ├── pages/                      # Application views
│       │   ├── About.jsx
│       │   ├── BookingSuccess.jsx
│       │   ├── FAQ.jsx
│       │   ├── Home.jsx
│       │   ├── Landing.jsx
│       │   ├── Login.jsx
│       │   ├── MovieBookingSimulator.jsx
│       │   ├── MovieDetails.jsx
│       │   ├── Movies.jsx
│       │   ├── MyBookings.jsx
│       │   ├── Payment.jsx
│       │   ├── Profile.jsx
│       │   ├── Register.jsx
│       │   ├── SearchPage.jsx
│       │   ├── SeatSelection.jsx
│       │   ├── Shows.jsx
│       │   ├── Theatres.jsx
│       │   └── admin/                  # Admin dashboard views
│       │       ├── AdminDashboard.jsx
│       │       ├── AdminReports.jsx
│       │       ├── AdminSettings.jsx
│       │       ├── ManageBookings.jsx
│       │       ├── ManageMovies.jsx
│       │       ├── ManageShows.jsx
│       │       ├── ManageTheatres.jsx
│       │       └── ManageUsers.jsx
│       ├── services/                   # Axios API service configuration
│       │   ├── api.js
│       │   └── recentlyViewed.js
│       ├── utils/                      # Helper utilities
│       │   ├── categoryHelper.js
│       │   ├── favoritesHelper.js
│       │   ├── payoutHelper.js
│       │   └── tmdbHelper.js
│       └── constants/
│           └── cities.js
└── server/                             # Node.js & Express Backend
    ├── .env.example                    # Template for environment variables
    ├── index.js                        # Express server entry point
    ├── package.json
    ├── config/
    │   └── db.js                       # MongoDB connection logic
    ├── controllers/                    # Business logic controllers
    │   ├── adminController.js
    │   ├── authController.js
    │   ├── bookingController.js
    │   ├── movieController.js
    │   ├── reviewController.js
    │   ├── showController.js
    │   ├── theatreController.js
    │   └── userController.js
    ├── middleware/                     # Express middlewares
    │   ├── authMiddleware.js
    │   ├── errorMiddleware.js
    │   ├── rateLimiters.js
    │   └── sanitizeInput.js
    ├── models/                         # Mongoose data models
    │   ├── adminModel.js
    │   ├── bookingModel.js
    │   ├── favoriteModel.js
    │   ├── movieModel.js
    │   ├── reviewModel.js
    │   ├── showModel.js
    │   ├── theatreModel.js
    │   └── userModel.js
    ├── routes/                         # Express route definitions
    │   ├── adminRoutes.js
    │   ├── authRoutes.js
    │   ├── bookingRoutes.js
    │   ├── movieRoutes.js
    │   ├── reviewRoutes.js
    │   ├── showRoutes.js
    │   ├── theatreRoutes.js
    │   └── userRoutes.js
    ├── services/
    │   └── tmdbSyncService.js          # TMDB movie sync service
    ├── utils/
    │   └── cleanupService.js           # 60-second expired seat hold cleanup
    └── seed/                           # Initial database seeder
        ├── makeAdmin.js
        └── seedData.js
```

---

## Installation & Setup

Follow these steps to run the project locally on your machine.

### Prerequisites
Make sure you have the following installed:
- **Node.js** (v18 or higher recommended)
- **npm** (comes with Node.js)
- **MongoDB Atlas** account (or local MongoDB running on your system)
- **Git**

---

### Step 1: Clone the Repository
```bash
git clone https://github.com/your-username/screenly.git
cd screenly
```

---

### Step 2: Backend Setup

1. Open a terminal and navigate to the `server` directory:
   ```bash
   cd server
   ```

2. Install backend dependencies:
   ```bash
   npm install
   ```

3. Create your `.env` configuration file:
   ```bash
   cp .env.example .env
   ```

4. Open `server/.env` in your text editor and fill in your values:
   ```env
   PORT=5000
   MONGO_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/screenly?retryWrites=true&w=majority
   TMDB_API_KEY=your_tmdb_api_key_here
   JWT_SECRET=your_secret_key_for_jwt_signing
   ```

5. (Optional but recommended) Seed the database with initial cinemas, movies, and showtimes:
   ```bash
   npm run seed
   ```

6. Start the backend development server:
   ```bash
   npm start
   ```

   The server will start at `http://localhost:5000`.

---

### Step 3: Frontend Setup

1. Open a new terminal window and navigate to the `client` directory:
   ```bash
   cd client
   ```

2. Install frontend dependencies:
   ```bash
   npm install
   ```

3. Start the Vite development server:
   ```bash
   npm run dev
   ```

4. Open your browser and go to:
   ```text
   http://localhost:5173
   ```

---

## Environment Variables

The backend requires the following 4 environment variables in `server/.env`:

| Variable | Description | Example |
| :--- | :--- | :--- |
| `PORT` | Port number on which Express runs | `5000` |
| `MONGO_URI` | MongoDB Atlas connection string | `mongodb+srv://user:pass@cluster.mongodb.net/screenly` |
| `TMDB_API_KEY` | Free API key from The Movie Database | `4320c6bb6bced39b12edc2b10de42798` |
| `JWT_SECRET` | Secret string used to sign authentication tokens | `my_jwt_super_secret_key` |

---

## Demo Credentials

If you ran `npm run seed` in the backend, the following demo accounts are available:

| Account Type | Email Address | Password | Access Level |
| :--- | :--- | :--- | :--- |
| **Customer User** | `user@imovies.com` | `user123` | Browsing, seat selection, booking, profile, reviews |
| **Administrator** | `admin@imovies.com` | `admin123` | Full admin dashboard, show scheduler, movie/theatre management |

You can also register a brand new customer account using the **Sign Up** page.

---

## Application Flow

### Customer Booking Journey
```text
Landing Page
     │
     ▼
Home Page (Select City)
     │
     ▼
Browse Movies / Search
     │
     ▼
Movie Details (Check Synopsis, Cast, Trailer)
     │
     ▼
Select Theatre & Show Time
     │
     ▼
Interactive Seat Selection (Hold seats with 10-minute countdown)
     │
     ▼
Payment Page (Select UPI / Card / Net Banking)
     │
     ▼
Booking Success (Instant ticket pass with QR Code)
     │
     ▼
My Bookings (View history, print ticket, or cancel seats)
```

### Administrator Management Journey
```text
Login with Admin Credentials
     │
     ▼
Admin Dashboard (Inspect Revenue & Active Bookings)
     │
     ├── Manage Shows (Add/edit showtimes with collision checks)
     ├── Manage Movies (Add new films with TMDB autofill)
     ├── Manage Theatres (Configure screens and seat tiers)
     ├── Manage Bookings (Inspect customer orders & verify check-ins)
     ├── Manage Users (View registered customer accounts)
     └── View Reports (Analyze revenue and export CSV records)
```

---

## Screens Included

- **Landing Page** (`/`): Introduces the platform to first-time visitors.
- **Home** (`/home`): Hero movie carousel, trending films, and city selection banner.
- **Explore / Search** (`/search`): Live autocomplete search and multi-tag filtering.
- **Movies Directory** (`/movies`): Full movie catalog with status, genre, and format filters.
- **Movie Details** (`/movies/:id`): Synopsis, cast, ratings, reviews, and trailer popup.
- **Shows** (`/shows`): Multi-day cinema schedules grouped by theatre and format.
- **Theatres** (`/theatres`): List of cinemas with facilities, formats, and Google Maps links.
- **Seat Selection** (`/seat-selection/:showId`): Tiered cinema layout (Balcony, Middle, Lower).
- **Payment** (`/payment/:bookingId`): Order breakdown and multi-method payment interface.
- **Booking Success** (`/booking-success/:bookingId`): Verified pass with dynamic QR code.
- **My Bookings** (`/bookings`): Ticket history and seat cancellation modal.
- **Profile** (`/profile`): User account details, password change, and saved favorites.
- **Login** (`/login`): Clean credential login with automatic role routing.
- **Register** (`/register`): User account registration form.
- **About** (`/about`): Project background and objectives.
- **FAQ** (`/faq`): Frequently asked questions on booking and cancellation.
- **Admin Dashboard** (`/admin`): High-level operational stats and recent transactions.
- **Manage Shows** (`/admin/shows`): Screening scheduler and real-time seat layout preview.
- **Manage Movies** (`/admin/movies`): Catalog CRUD operations and TMDB sync.
- **Manage Theatres** (`/admin/theatres`): Multiplex facility and screen capacity manager.
- **Manage Bookings** (`/admin/bookings`): Reservation audit log and check-in verifier.
- **Manage Users** (`/admin/users`): Customer account list.
- **Admin Reports** (`/admin/reports`): Financial breakdown and CSV export.
- **Admin Settings** (`/admin/settings`): Platform convenience fee and tax settings.

---

## Learning Outcomes

Building this project helped me learn practical full-stack development skills:

- **React & Modern Hooks**: Learned how to effectively use `useState`, `useEffect`, `useMemo`, `useCallback`, and custom hooks to build dynamic user interfaces.
- **State Management with Context API**: Managed global user authentication state and active city selection across components without prop drilling.
- **Client-Side Routing**: Configured route protection using higher-order wrapper components (`ProtectedRoute` and `AdminRoute`) in React Router v7.
- **Backend Architecture**: Structured an Express.js backend using the Model-View-Controller (MVC) pattern for maintainability.
- **Database Modeling with Mongoose**: Created relational-like schemas in MongoDB with references (`ObjectId`), compound indexes for uniqueness, and lifecycle middleware.
- **Authentication & Security**: Implemented stateless JWT token verification, password hashing with Bcrypt, and basic input sanitization against NoSQL injection.
- **Concurrency & Timing**: Built an atomic 10-minute seat reservation mechanism with background cleanup to release abandoned holds.
- **Git & Clean Code**: Maintained proper commit hygiene, branch workflow, and a clean `.gitignore`.

---

## Known Limitations

Because this is a student learning project:
- **Payment is Simulated**: The payment authorization is a simulation and does not process real financial transactions.
- **In-App Passes**: Tickets and QR codes are displayed and printable within the application; no third-party email delivery service is configured.
- **Internet Dependency**: The application requires an active internet connection to connect to MongoDB Atlas and TMDB API.
- **Single Admin Level**: All administrators share standard operational privileges without granular role tiers.

---

## Future Improvements

Features that could be added in future versions:
- Integration with an actual payment gateway such as Razorpay or Stripe (test mode).
- Mobile responsive web app or mobile app using React Native.
- Social login integration (Google OAuth).
- Personalized movie recommendation system based on user booking history.
- Push notifications or browser reminders before showtime.

---

## Author

**Satya Rusia**  
B.Tech Computer Science & Engineering  
Medi-Caps University  

---

## Academic Note

This project was developed as part of my learning in Full Stack Web Development and is intended for educational and academic evaluation purposes.
