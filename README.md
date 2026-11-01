# Screenly - Movie Ticket Booking Platform

[![React](https://img.shields.io/badge/React-19.3.1-61DAFB?style=flat&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.3.5-646CFF?style=flat&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-24.x-339933?style=flat&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-5.3.0-000000?style=flat&logo=express&logoColor=white)](https://expressjs.com/)
[![MongoDB Atlas](https://img.shields.io/badge/MongoDB-Atlas_Cluster-47A248?style=flat&logo=mongodb&logoColor=white)](https://www.mongodb.com/atlas)
[![Nodemailer](https://img.shields.io/badge/Nodemailer-10.3.1-007ACC?style=flat)](https://nodemailer.com/)
[![Bootstrap](https://img.shields.io/badge/Bootstrap-5.3.8-7952B3?style=flat&logo=bootstrap&logoColor=white)](https://getbootstrap.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat)](LICENSE)

Screenly is a production-grade, full-stack MERN (MongoDB, Express, React, Node.js) movie ticket booking platform. It features an interactive tiered seat selection grid, automated atomic seat hold locks, a 256-bit SSL secured payment gateway, automated transactional ticket dispatch via Nodemailer with scannable QR passes, real 6-digit OTP password recovery, and comprehensive administrator operations including conflict-free show scheduling.

---

## Table of Contents

- [Architectural Overview](#architectural-overview)
- [Key Features](#key-features)
  - [Customer Experience](#customer-experience)
  - [Administrator Operations](#administrator-operations)
- [Technology Stack](#technology-stack)
- [Project Directory Structure](#project-directory-structure)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
  - [1. Clone Repository](#1-clone-repository)
  - [2. Backend Setup](#2-backend-setup)
  - [3. Frontend Setup](#3-frontend-setup)
- [Environment Configuration](#environment-configuration)
- [REST API Reference](#rest-api-reference)
- [Test & Demo Credentials](#test--demo-credentials)
- [Quality Assurance & Manual Testing](#quality-assurance--manual-testing)
- [License](#license)

---

## Architectural Overview

Screenly is built with a decoupled Single Page Application (SPA) frontend and a RESTful backend adhering to the Model-View-Controller (MVC) pattern.

```mermaid
flowchart TD
    Client["React 19 SPA (Vite)"] -->|Axios REST Calls| API["Express 5 REST API Engine"]
    API -->|Mongoose ODM| DB[("MongoDB Atlas Cluster")]
    API -->|Email Dispatch| Mailer["Nodemailer Engine (SMTP / Gmail)"]
    Mailer -->|Delivery| Inbox["Customer Email Inbox"]
    API -->|Poster Metadata| TMDB["TMDB / Local Image CDN"]
    Client -->|Atomic Seat Hold| API
    API -->|Conflict Detection| DB
```

---

## Key Features

### Customer Experience

- **Landing Entry Point**: Modern brand introduction featuring tagline, quick sign-in, account creation, and guest preview modes.
- **Cinematic Discovery**: Real-time autocomplete search, genre pill filters, city selector, and release status badges (Now Showing, Advance Booking, Coming Soon, Last Day, No Longer Playing).
- **Interactive Tiered Seating Layout**:
  - Balcony Gold Class (`B1` - `Bn`)
  - Middle Executive (`M1` - `Mn`)
  - Lower Classic (`L1` - `Ln`)
  - Maximum 8 tickets per transaction guard.
  - Live 10-minute atomic seat hold countdown with automatic cleanup of expired reservations.
- **Secure Payment Gateway**:
  - Unified checkout supporting UPI (PhonePe, Google Pay, Paytm, CRED), Credit/Debit Cards (Visa, MasterCard, RuPay), and Net Banking.
  - Realistic multi-stage banking authorization overlay.
  - Automatic payment status resolution: Confirmed bookings generate verified transaction references (`PAY...`) and permanently lock seats in MongoDB.
  - Instant seat release: If payment is cancelled or declined, reserved seats are immediately returned to the auditorium.
- **Automated Booking Confirmation Email**:
  - Automatically dispatches responsive HTML admission passes to the customer's registered email address without requiring manual action.
  - Includes official branding, verified booking reference, scannable QR pass (`api.qrserver.com`), movie poster, auditorium details, seat tier breakdown, and itemized financial summary.
- **Real OTP Password Recovery**:
  - 6-digit cryptographically random OTP generation with 15-minute validity windows.
  - Transmitted securely via Nodemailer without exposing the code in the UI or API response payload.
  - 5-attempt brute-force protection and automatic token invalidation upon successful password update.
- **Printable E-Ticket**: High-resolution admission pass with cinema turnstile barcode, print trigger (`window.print()`), and PDF download capability.
- **Profile & Booking History**: Active booking records, self-service cancellation with immediate seat release, and favorites management.

### Administrator Operations

- **Show Management Module**:
  - Dedicated administrative dashboard to schedule, view, edit, and remove cinema screenings.
  - Intelligent conflict detection preventing auditorium time-slot overlaps.
  - Data table with multi-column filtering (City, Theatre, Movie, Format, Status), sorting, pagination, and real-time seat map preview.
- **Movie Catalog Management**: Full CRUD operations with TMDB integration, poster preview, genre tags, certificates (U, U/A, A), duration, and active show schedule alignment.
- **Theatre & Screen Management**: Configuration of multi-city multiplexes, auditorium tier capacities (lower, middle, balcony), and tiered pricing matrix.
- **Booking & Revenue Oversight**: Complete customer reservation log, transaction audit records, and seat release controls.
- **User Management**: Inspection of registered user accounts and role-based access control (RBAC).

---

## Technology Stack

| Layer | Technologies & Libraries |
| :--- | :--- |
| **Frontend Framework** | React 19.3, Vite 8.3, React Router 7.18 |
| **Styling & UI** | Bootstrap 5.3, Tailwind CSS 4.3, FontAwesome 6, Custom Glassmorphism CSS |
| **State & HTTP** | React Context API (`AuthContext`, `CityContext`), Axios (JWT Bearer Interceptors) |
| **Backend Runtime** | Node.js 24.x, Express.js 5.3 |
| **Database & ODM** | MongoDB Atlas, Mongoose 9.11 |
| **Authentication** | JSON Web Tokens (JWT), HTTP-Only Cookies, Bcryptjs Password Hashing |
| **Email Delivery** | Nodemailer 10.3 (Gmail App Password, Custom SMTP, Ethereal Sandbox fallback) |
| **Security** | Helmet.js, Express-Rate-Limit, CORS, Input Sanitization |

---

## Project Directory Structure

```text
screenly-cinema/
├── .gitignore                          # GitHub standard exclusion file
├── README.md                           # Project documentation
├── SCREENLY_FINAL_END_TO_END_MANUAL_TESTING_GUIDE.md
├── client/                             # React 19 + Vite Frontend SPA
│   ├── .gitignore
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── public/
│   │   └── posters/                    # High-resolution local poster repository
│   └── src/
│       ├── App.jsx
│       ├── main.jsx
│       ├── components/                 # Reusable UI components
│       │   ├── AdminNav.jsx
│       │   ├── MovieCard.jsx
│       │   ├── Navbar.jsx
│       │   ├── SeatHoldTimer.jsx
│       │   └── ...
│       ├── context/                    # Context state providers (Auth, City)
│       ├── pages/                      # Application route views
│       │   ├── Home.jsx
│       │   ├── Landing.jsx
│       │   ├── Movies.jsx
│       │   ├── MovieDetails.jsx
│       │   ├── SeatSelection.jsx
│       │   ├── Payment.jsx
│       │   ├── BookingSuccess.jsx
│       │   ├── ForgotPassword.jsx
│       │   ├── Profile.jsx
│       │   └── admin/                  # Protected administrator views
│       │       ├── AdminDashboard.jsx
│       │       ├── ManageShows.jsx
│       │       ├── ManageMovies.jsx
│       │       ├── ManageTheatres.jsx
│       │       └── ManageBookings.jsx
│       ├── services/                   # Axios API and client email helpers
│       └── utils/                      # TMDB helpers, formatters, and image fallbacks
└── server/                             # Node.js + Express MVC REST Backend
    ├── .env.example                    # Environment variable template
    ├── index.js                        # Server entry point
    ├── package.json
    ├── controllers/                    # Request controllers
    │   ├── authController.js
    │   ├── bookingController.js
    │   ├── movieController.js
    │   ├── showController.js
    │   └── theatreController.js
    ├── models/                         # Mongoose data schemas
    │   ├── adminModel.js
    │   ├── bookingModel.js
    │   ├── favouriteModel.js
    │   ├── movieModel.js
    │   ├── showModel.js
    │   ├── theatreModel.js
    │   └── userModel.js
    ├── routes/                         # Express REST route endpoints
    ├── services/                       # Nodemailer email dispatch service
    │   └── emailService.js
    └── seed/                           # Initial database seeder
        └── seedData.js
```

---

## Prerequisites

Ensure the following runtimes and tools are installed on your workstation:

- **Node.js**: v18.0.0 or higher (v20+ recommended)
- **npm**: v9.0.0 or higher
- **MongoDB**: Access to a MongoDB Atlas cluster or local MongoDB instance (v6.0+)
- **Git**: v2.30+

---

## Getting Started

### 1. Clone Repository

```bash
git clone https://github.com/your-username/screenly-cinema.git
cd screenly-cinema
```

### 2. Backend Setup

```bash
# Navigate to server directory
cd server

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit server/.env with your MongoDB Atlas URI and mail credentials

# (Optional) Seed the database with master cinema data
npm run seed

# Start development server
npm start
```

*The backend server will launch at `http://localhost:5000`.*

### 3. Frontend Setup

In a separate terminal window:

```bash
# Navigate to client directory
cd client

# Install dependencies
npm install

# Start Vite development server
npm run dev
```

*The frontend application will launch at `http://localhost:5173`.*

---

## Environment Configuration

Configure `server/.env` based on [`server/.env.example`](file:///C:/Users/satya/OneDrive/Documents/IMovies%20-%20Movie%20ticket%20booking%20made%20simple/server/.env.example):

| Variable | Description | Required | Example |
| :--- | :--- | :--- | :--- |
| `PORT` | Backend HTTP listening port | Yes | `5000` |
| `MONGO_URI` | MongoDB Atlas cluster connection string | Yes | `mongodb+srv://user:pass@cluster.mongodb.net/screenly` |
| `TMDB_API_KEY` | The Movie Database API Key for posters | Yes | `4320c6bb6bced39b12edc2b10de42798` |
| `JWT_SECRET` | Secret key for signing JSON Web Tokens | Yes | `your_secret_signing_key` |
| `GMAIL_USER` | Gmail address for transactional email | Optional | `your_email@gmail.com` |
| `GMAIL_APP_PASSWORD` | Google 16-character 2-Step App Password | Optional | `abcd efgh ijkl mnop` |
| `EMAIL_FROM` | Outgoing display name and email address | Optional | `"Screenly Cinema" <tickets@screenly.in>` |
| `SMTP_HOST` | Custom SMTP host address | Optional | `smtp.sendgrid.net` |
| `SMTP_PORT` | Custom SMTP listening port | Optional | `587` |
| `SMTP_USER` | Custom SMTP account username | Optional | `apikey` |
| `SMTP_PASS` | Custom SMTP account password | Optional | `your_smtp_key` |

*Note: If no mail credentials are provided, Nodemailer automatically routes emails to the built-in Ethereal test inbox and outputs inspection URLs directly to the terminal.*

---

## REST API Reference

### Authentication Endpoints (`/api/auth`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Public | Register customer account and return JWT |
| `POST` | `/api/auth/login` | Public | Authenticate user or admin and return JWT |
| `POST` | `/api/auth/logout` | Public | Clear session authentication cookie |
| `GET` | `/api/auth/me` | Private | Retrieve authenticated user profile |
| `POST` | `/api/auth/forgot-password` | Public | Dispatch 6-digit recovery OTP to email |
| `POST` | `/api/auth/reset-password` | Public | Validate OTP and update account password |

### Movies Endpoints (`/api/movies`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/movies` | Public | List movies with genre, city, and status filters |
| `GET` | `/api/movies/:id` | Public | Get detailed movie metadata and star cast |
| `POST` | `/api/movies` | Admin | Create movie entry in catalog |
| `PUT` | `/api/movies/:id` | Admin | Update existing movie details |
| `DELETE` | `/api/movies/:id` | Admin | Remove movie from catalog |

### Shows Endpoints (`/api/shows`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/shows` | Public | Query upcoming shows by movie, theatre, and city |
| `GET` | `/api/shows/:id` | Public | Get specific screening, seat prices, and booked seats |
| `POST` | `/api/shows` | Admin | Schedule new show with conflict prevention |
| `PUT` | `/api/shows/:id` | Admin | Modify screening schedule |
| `DELETE` | `/api/shows/:id` | Admin | Cancel and delete scheduled show |

### Bookings Endpoints (`/api/bookings`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/bookings` | Private | Create 10-minute atomic seat hold reservation |
| `POST` | `/api/bookings/:id/pay` | Private | Authorize payment and dispatch email pass |
| `PUT` | `/api/bookings/:id/release-hold` | Private | Release seat hold immediately |
| `GET` | `/api/bookings/mine` | Private | Retrieve authenticated customer's bookings |
| `GET` | `/api/bookings` | Admin | Retrieve all customer reservations |
| `DELETE` | `/api/bookings/:id` | Admin | Cancel reservation and restore auditorium seats |

---

## Test & Demo Credentials

Pre-configured accounts for project review and evaluation:

| Account Type | Email Address | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Customer User** | `user@imovies.com` | `user123` | Movie browsing, seat selection, checkout, email passes, profile |
| **Administrator** | `admin@imovies.com` | `admin123` | Full admin dashboard, show management, catalog CRUD, audit logs |

---

## Quality Assurance & Manual Testing

For comprehensive test cases, boundary validation, and end-to-end execution steps across all modules, refer to:

- [`SCREENLY_FINAL_END_TO_END_MANUAL_TESTING_GUIDE.md`](file:///C:/Users/satya/OneDrive/Documents/IMovies%20-%20Movie%20ticket%20booking%20made%20simple/SCREENLY_FINAL_END_TO_END_MANUAL_TESTING_GUIDE.md)

---

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
