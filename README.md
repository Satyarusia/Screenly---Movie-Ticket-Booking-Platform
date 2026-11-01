# Screenly - MERN Movie Ticket Booking System

A full-stack movie ticket booking web application built using the MERN stack (MongoDB, Express.js, React, Node.js).

---

## About the Project

Screenly is a web application created as a college learning project to understand how movie ticket booking websites work behind the scenes.

When booking movie tickets online, users go through a complete sequence: browsing currently playing films, checking theatre showtimes, choosing seats from different price tiers, completing payment, and viewing a digital admission ticket with a scannable QR code.

The main purpose of this project was to learn and practice full-stack web development by building both the frontend user interface and the backend REST API from scratch.

---

## Project Objectives

The key learning goals for this project were:

- Learning full-stack MERN development (MongoDB, Express.js, React, Node.js).
- Designing database schemas and relationships using Mongoose.
- Building RESTful API endpoints for movies, theatres, shows, bookings, users, and reviews.
- Implementing user authentication using JSON Web Tokens (JWT) and password hashing with Bcrypt.
- Building a responsive, interactive user interface in React using hooks and Context API.
- Creating a seat reservation timer that temporarily holds selected seats during booking to prevent booking conflicts.
- Practicing clean code organization, Git version control, and component-based design.

---

## Features

### Guest (Unregistered Visitors)
- **Landing Page**: Welcome page introducing the application with quick links to explore or log in.
- **Browse Movies**: View movies currently showing in theatres, advance booking titles, and upcoming releases.
- **Search Movies**: Real-time search bar with suggestions to quickly find movies by title, actor, or genre.
- **Movie Filters & Sorting**: Filter movies by genre, language, format (2D, 3D, IMAX), and rating, or sort by release date and popularity.
- **Movie Details**: View synopsis, duration, certification, cast and crew list, audience ratings, and YouTube trailers.
- **Community Reviews**: Read reviews and star ratings submitted by other users.
- **Explore Theatres**: Browse local cinema halls and multiplexes with details on available amenities and formats.
- **User Registration & Login**: Create a new account or sign in with existing credentials.

### Registered User
- **Choose Location**: Select your city when booking to view nearby theatres and available shows.
- **Seat Selection**: Interactive seat grid divided into three categories:
  - Balcony (Gold Class)
  - Middle (Executive Class)
  - Lower (Classic Class)
- **Seat Reservation Timer**: When seats are selected, they are temporarily held for 10 minutes so other users cannot pick them while payment is being completed.
- **Payment**: Select a payment method (UPI, Credit/Debit Card, Net Banking) and complete the booking through a banking authorization screen.
- **Digital Admission Ticket**: Immediate booking confirmation showing booking ID, movie poster, show timing, auditorium screen, seat numbers, and a scannable QR code.
- **Print & Download Pass**: Print or save tickets directly using the browser print function.
- **My Bookings**: View current and past booking history.
- **Self-Service Cancellation**: Cancel an entire booking or cancel specific seats with refund calculation and automatic seat release back to the cinema.
- **User Profile**: Update name and phone number, change account password, and manage refund payment details.
- **Wishlist / Favorites**: Save favorite movies to personal wishlist with one click.
- **Submit Reviews**: Rate watched movies on a 1 to 5 star scale and write review feedback.
- **Logout**: Securely clear the user session.

### Administrator
- **Admin Dashboard**: Overview of key statistics including total revenue, confirmed bookings, active shows, registered users, and total movies.
- **Movie Management**: Add and edit movies using TMDB movie data, update details (cast, director, status, trailer ID), or delete movies from the catalog.
- **Show Scheduling**: Schedule new movie screenings with automated time-slot checks to prevent overlapping shows on the same screen.
- **Interactive Seat Preview**: View real-time booked and available seats for any scheduled show directly from the admin panel.
- **Theatre Management**: Add new multiplexes, configure screen names, seat counts per category, and base pricing.
- **Booking Management**: View all customer reservations across all theatres and verify turnstile check-ins.
- **User Management**: View registered user accounts and manage access permissions.
- **Operational Reports**: View revenue breakdowns by movie and cinema chain, and export show schedule data as CSV files.

---

## Technologies Used

### Frontend
- **React**: Frontend UI library using functional components and hooks.
- **Vite**: Frontend build tool and local development server.
- **React Router DOM**: Client-side routing with page navigation and protected route guards.
- **Bootstrap & Tailwind CSS**: Responsive grid layouts, form styles, and UI utility classes.
- **FontAwesome**: Icons for cinema amenities, seats, stars, and navigation controls.
- **Axios**: HTTP client for communicating with the backend REST API.
- **React Hot Toast**: Toast notifications for user feedback (success, errors, warnings).

### Backend
- **Node.js**: JavaScript runtime environment for the backend server.
- **Express.js**: Web application framework for building REST API endpoints and middleware.
- **Mongoose**: Object Data Modeling (ODM) library for MongoDB.
- **JSON Web Tokens (jsonwebtoken)**: Token generation for user sessions.
- **Bcryptjs**: Password hashing for credential security.
- **Helmet**: Middleware to secure Express apps by setting HTTP headers.
- **Express Rate Limit**: Basic rate limiting to protect authentication endpoints.
- **Cookie Parser**: Middleware to parse cookies for session handling.

### Database
- **MongoDB Atlas**: Cloud-hosted NoSQL document database.

### External APIs & Media
- **The Movie Database (TMDB) API**: Used to fetch movie descriptions, release dates, genres, and poster artwork.
- **QR Server API**: Generates dynamic QR code images for digital ticket verification.
- **Local Movie Posters**: Local movie poster repository stored in `client/public/posters/` for faster loading and offline fallback.

---

## Folder Structure

```text
Screenly/
├── client/
│   ├── public/
│   ├── src/
│   └── package.json
├── server/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── seed/
│   ├── services/
│   ├── utils/
│   ├── .env.example
│   └── package.json
├── .gitignore
└── README.md
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
   MONGO_URI=your_mongodb_connection_string
   TMDB_API_KEY=your_tmdb_api_key
   JWT_SECRET=your_jwt_secret
   ```

5. (Optional but recommended) Seed the database with initial cinemas, movies, and showtimes:
   ```bash
   npm run seed
   ```

6. Start the backend server:
   ```bash
   npm start
   ```

   *(Note: You can also run `npm run dev` in the server folder if you prefer nodemon for auto-reloading.)*

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
| `MONGO_URI` | MongoDB connection string | `your_mongodb_connection_string` |
| `TMDB_API_KEY` | The Movie Database API key | `your_tmdb_api_key` |
| `JWT_SECRET` | Secret string used to sign authentication tokens | `your_jwt_secret` |

---

## Demo Credentials

If you ran `npm run seed` in the backend, the following demo accounts are available:

### Administrator
- **Email**: `admin@imovies.com`
- **Password**: `admin123`

### Registered User
- **Email**: `user@imovies.com`
- **Password**: `user123`

*Note: These are demo accounts created for testing and evaluation purposes. You can also create a new account using the Sign Up page.*

---

## Application Flow

### Guest / User Flow
```text
Landing Page
     │
     ▼
Home
     │
     ▼
Browse Movies
     │
     ▼
Movie Details
     │
     ▼
Book Tickets
     │
     ▼
Select Location
     │
     ▼
Choose Theatre
     │
     ▼
Choose Show
     │
     ▼
Choose Seats
     │
     ▼
Payment
     │
     ▼
Booking Confirmation
     │
     ▼
My Bookings
```

### Administrator Flow
```text
Login with Admin Credentials
     │
     ▼
Admin Dashboard
     │
     ├── Manage Shows (Add and edit showtimes with time-slot checks)
     ├── Manage Movies (Add and edit movies using TMDB movie data)
     ├── Manage Theatres (Configure screens and seating capacity)
     ├── Manage Bookings (View customer orders and verify admissions)
     ├── Manage Users (View registered customer accounts)
     └── View Reports (View revenue and export CSV records)
     │
     ▼
Logout
```

---

## Screens Included

- **Landing Page** (`/`): Introduces the platform to visitors.
- **Home** (`/home`): Movie carousel, trending films, and category discovery.
- **Explore** (`/search`): Movie search and filtering interface.
- **Movie Details** (`/movies/:id`): Synopsis, cast, ratings, reviews, and trailer popup.
- **Seat Selection** (`/seat-selection/:showId`): Tiered cinema layout (Balcony, Middle, Lower).
- **Payment** (`/payment/:bookingId`): Order breakdown and payment method selection.
- **Booking Confirmation** (`/booking-success/:bookingId`): Verified admission pass with dynamic QR code.
- **My Bookings** (`/bookings`): Ticket history and seat cancellation options.
- **Login** (`/login`): User login with automatic role detection.
- **Register** (`/register`): User account registration form.
- **User Profile** (`/profile`): User account details, password change, and saved favorites.
- **Admin Dashboard** (`/admin`): Key operational stats and recent transactions.
- **Manage Movies** (`/admin/movies`): Movie catalog operations and updates.
- **Manage Shows** (`/admin/shows`): Screening scheduler and real-time seat layout preview.
- **Manage Theatres** (`/admin/theatres`): Multiplex facility and screen capacity manager.
- **Manage Bookings** (`/admin/bookings`): Reservation list and check-in verifier.
- **Manage Users** (`/admin/users`): Customer account list.

---

## Learning Outcomes

Building this project helped me learn practical web development skills:

- **React**: Building dynamic, component-driven user interfaces.
- **React Hooks**: Using `useState`, `useEffect`, `useMemo`, and custom hooks for component lifecycle and state management.
- **Context API**: Managing user authentication and city selection state across components without prop drilling.
- **REST APIs**: Designing and organizing clean HTTP routes for movies, theatres, shows, and bookings.
- **Express.js**: Setting up backend routing, custom middleware, and error handling.
- **MongoDB**: Creating data schemas with Mongoose and connecting an Express backend to a cloud MongoDB Atlas database.
- **JWT Authentication**: Setting up secure user registration and login with token-based session checks.
- **CRUD Operations**: Building complete Create, Read, Update, and Delete operations for movies, theatres, shows, and reviews.
- **Git & GitHub**: Managing project version control, branching, committing changes, and organizing project files.
- **Responsive Design**: Using Bootstrap and Tailwind CSS to ensure layouts work cleanly across different screen sizes.
- **Debugging**: Inspecting network requests, troubleshooting frontend state issues, and handling backend errors.

---

## Known Limitations

Because this is a student learning project:
- **Payment is Simulated**: The payment authorization is a simulation and does not process real financial transactions.
- **In-App Passes**: Tickets and QR codes are displayed and printable within the application; no third-party email delivery service is configured.
- **Internet Dependency**: The application requires an active internet connection to connect to MongoDB Atlas and TMDB API.
- **Single Admin Level**: All administrators share standard operational privileges without separate role tiers.

---

## Future Improvements

Features that could be added in future versions:
- Integration with an actual payment gateway such as Razorpay or Stripe (test mode).
- Mobile responsive web app or mobile app using React Native.
- Social login integration (Google OAuth).
- Personalized movie recommendation system based on user booking history.
- Browser notifications or reminders before showtime.

---

## Author

**Satya Rusia**  
B.Tech Computer Science & Engineering  
Medi-Caps University  

---

## Academic Note

This project was developed as part of my learning in Full Stack Web Development and is intended for educational and academic evaluation purposes.
