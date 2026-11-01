# Screenly - MERN Movie Ticket Booking System

A full-stack movie ticket booking web application built using the MERN stack (MongoDB, Express.js, React, Node.js).

---

## About the Project

Screenly is a web application created as a college learning project to explore how online movie ticket booking systems work behind the scenes.

The application guides users through the typical booking journey: browsing currently playing movies, checking theatre showtimes, choosing seats from different seating sections, completing a simulated payment, and receiving a digital admission pass with a scannable QR code.

The primary goal of this project was to practice full-stack web development by building both the frontend user interface and the backend REST API from scratch.

---

## Project Objectives

The main learning goals for this project were:

- Learning full-stack development with the MERN stack (MongoDB, Express.js, React, Node.js).
- Designing database schemas and relationships using Mongoose.
- Developing REST API endpoints for movies, theatres, shows, bookings, users, and reviews.
- Implementing secure user authentication using JSON Web Tokens (JWT) and password hashing with Bcrypt.
- Building a responsive user interface with React Hooks and the Context API.
- Creating a seat reservation timer that temporarily holds selected seats during checkout to prevent double-booking.
- Practicing clean project organization, Git version control, and building reusable React components.

---

## Features

### Guest (Unregistered Visitors)
- **Landing Page**: Welcome page introducing the application with quick links to explore movies or log in.
- **Browse Movies**: View movies currently showing in theatres, advance booking titles, and upcoming releases.
- **Search Movies**: Search movies in real time with suggestions matching title, actor, or genre.
- **Filter and Sort Movies**: Filter movies by genre, language, format (2D, 3D, IMAX), and rating, or sort by release date and popularity.
- **View Movie Details**: Read the synopsis, check duration and certification, view the cast and crew list, see ratings, and watch trailers.
- **Community Reviews**: Read reviews and star ratings submitted by other users.
- **Explore Theatres**: Browse local theatres along with details on available amenities, screen formats, and Google Maps directions.
- **Register and Login**: Create a new account or log in with existing credentials.

### Registered User
- **Choose Location**: Select your city while booking to find nearby theatres and available shows.
- **Seat Selection**: Select seats from Balcony, Middle, or Lower seating sections.
- **Seat Reservation Timer**: Hold selected seats for 10 minutes so other users cannot pick them while payment is being completed.
- **Payment**: Select a payment method (UPI, Card, Net Banking) and complete checkout through a simulated banking authorization screen.
- **Digital Admission Ticket**: Receive an instant booking confirmation displaying booking ID, movie poster, show timing, screen, seat numbers, and a scannable QR code.
- **Print and Download Ticket**: Print or save tickets directly using the browser print function.
- **My Bookings**: View active and past booking history.
- **Self-Service Cancellation**: Cancel an entire booking or cancel specific seats with automatic refund calculation and seat release back to the theatre.
- **User Profile**: Update profile details, change account password, and manage refund payment accounts.
- **Wishlist / Favorites**: Save favorite movies to your personal wishlist with one click.
- **Submit Reviews**: Rate watched movies on a 1 to 5 star scale and write review feedback.
- **Logout**: Securely clear the user session.

### Administrator
- **Admin Dashboard**: View key statistics including total revenue, confirmed bookings, active shows, registered users, and total movies.
- **Movie Management**: Add and edit movies using TMDB movie data, update details (cast, director, status, trailer ID), or delete movies from the catalog.
- **Show Scheduling**: Schedule movie screenings with automated time-slot checks to prevent overlapping shows on the same screen.
- **Interactive Seat Preview**: View real-time booked and available seats for any scheduled show directly from the admin panel.
- **Theatre Management**: Add new theatres, configure screen names, seat counts per category, and base pricing.
- **Booking Management**: View customer reservations across all theatres and verify turnstile check-ins.
- **User Management**: View registered user accounts and manage access permissions.
- **Operational Reports**: View revenue breakdowns by movie and theatre, and export show schedule data as CSV files.

---

## Technologies Used

### Frontend
- **React**: UI library using functional components and hooks.
- **Vite**: Frontend build tool and local development server.
- **React Router DOM**: Client-side routing with navigation and protected route guards.
- **Bootstrap & Tailwind CSS**: Responsive grid layouts, form styles, and utility classes.
- **FontAwesome**: Icons for theatre amenities, seats, star ratings, and controls.
- **Axios**: HTTP client for communicating with backend REST API endpoints.
- **React Hot Toast**: Toast notifications for user feedback (success, errors, warnings).

### Backend
- **Node.js**: JavaScript runtime environment for running the server.
- **Express.js**: Web framework for building REST API routes and middleware.
- **Mongoose**: Library for managing MongoDB data using schemas and models.
- **JSON Web Tokens (jsonwebtoken)**: Token generation for user sessions.
- **Bcryptjs**: Password hashing algorithm for user credential security.
- **Helmet**: Middleware for setting security HTTP headers.
- **Express Rate Limit**: Basic rate limiting to protect authentication routes.
- **Cookie Parser**: Middleware to parse cookies for session handling.

### Database
- **MongoDB Atlas**: Cloud-hosted NoSQL document database.

### External APIs & Media
- **The Movie Database (TMDB) API**: Service used to fetch movie descriptions, release dates, genres, and poster artwork.
- **QR Server API**: External service that generates dynamic QR code images for digital ticket verification.
- **Local Movie Posters**: Local movie poster repository stored in `client/public/posters/` for faster loading and offline fallback.

---

## Folder Structure

```text
Screenly/
├── client/
│   ├── public/
│   ├── src/
│   ├── .env.example
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
├── LICENSE
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

5. (Optional but recommended) Seed the database with initial theatres, movies, and showtimes:
   ```bash
   npm run seed
   ```

6. Start the backend server:
   ```bash
   npm start
   ```

   *(Note: You can also run `npm run dev` in the server folder if you prefer nodemon for auto-reloading during development.)*

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
| `PORT` | Port number on which the Express server runs | `5000` |
| `MONGO_URI` | MongoDB Atlas database connection string | `your_mongodb_connection_string` |
| `TMDB_API_KEY` | Free API key from The Movie Database | `your_tmdb_api_key` |
| `JWT_SECRET` | Secret string used to sign authentication tokens | `your_jwt_secret` |

---

## Demo Credentials

If you ran `npm run seed` in the backend, the following demo accounts are available for testing:

### Administrator
- **Email**: `admin@imovies.com`
- **Password**: `admin123`

### Registered User
- **Email**: `user@imovies.com`
- **Password**: `user123`

*Note: These are demo accounts created for testing and academic evaluation. You can also create a new account using the Register page.*

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

- **Landing Page** (`/`): Introduces the platform to visitors with links to browse or log in.
- **Home** (`/home`): Movie carousel, trending movies, and category discovery.
- **Explore** (`/search`): Real-time movie search and multi-tag filtering interface.
- **Movie Details** (`/movies/:id`): Synopsis, cast, ratings, user reviews, and trailer player.
- **Seat Selection** (`/seat-selection/:showId`): Cinema seat layout with Balcony, Middle, and Lower sections.
- **Payment** (`/payment/:bookingId`): Order summary and simulated payment method selection.
- **Booking Confirmation** (`/booking-success/:bookingId`): Verified admission pass with a dynamic QR code.
- **My Bookings** (`/bookings`): Ticket history, digital pass view, and seat cancellation options.
- **Login** (`/login`): User login form with automatic role detection.
- **Register** (`/register`): User account registration form with input validation.
- **User Profile** (`/profile`): User account details, password update, and saved favorites.
- **Admin Dashboard** (`/admin`): Key operational statistics, revenue summary, and recent bookings.
- **Manage Movies** (`/admin/movies`): Movie catalog operations, poster previews, and updates.
- **Manage Shows** (`/admin/shows`): Screening scheduler with seat layout preview and CSV export.
- **Manage Theatres** (`/admin/theatres`): Theatre facility and screen capacity manager.
- **Manage Bookings** (`/admin/bookings`): Customer reservation list and turnstile check-in verifier.
- **Manage Users** (`/admin/users`): Registered customer accounts list.

---

## Learning Outcomes

Building this project helped me learn practical web development skills:

- **React**: Building dynamic, reusable user interface components.
- **React Hooks**: Using React Hooks to manage component state and lifecycle.
- **Context API**: Managing user authentication and city selection state across components without prop drilling.
- **REST APIs**: Designing and organizing clean HTTP routes for movies, theatres, shows, and bookings.
- **Express.js**: Setting up backend routing, custom middleware, and error handling.
- **MongoDB & Mongoose**: Managing database records, relationships, and queries using Mongoose.
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

---

## License

This project is open-source and available under the [MIT License](LICENSE).
