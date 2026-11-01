import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";

// Layout & Core Components
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import LoadingSpinner from "./components/LoadingSpinner";
import AdminRoute from "./components/AdminRoute";
import ProtectedRoute from "./components/ProtectedRoute";
import CityModal from "./components/CityModal";
import { AuthProvider } from "./context/AuthContext";
import { CityProvider } from "./context/CityContext";

// Lazy-loaded Customer Discovery Pages
const Home = lazy(() => import("./pages/Home"));
const Landing = lazy(() => import("./pages/Landing"));
const SearchPage = lazy(() => import("./pages/SearchPage"));
const Movies = lazy(() => import("./pages/Movies"));
const MovieDetails = lazy(() => import("./pages/MovieDetails"));
const Shows = lazy(() => import("./pages/Shows"));
const Theatres = lazy(() => import("./pages/Theatres"));

// Lazy-loaded Ticketing & Simulation Pages
const MovieBookingSimulator = lazy(() => import("./pages/MovieBookingSimulator"));
const SeatSelection = lazy(() => import("./pages/SeatSelection"));
const Payment = lazy(() => import("./pages/Payment"));
const BookingSuccess = lazy(() => import("./pages/BookingSuccess"));
const Profile = lazy(() => import("./pages/Profile"));
const MyBookings = lazy(() => import("./pages/MyBookings"));

// Lazy-loaded Auth & Informational Pages
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const About = lazy(() => import("./pages/About"));
const FAQ = lazy(() => import("./pages/FAQ"));

// Lazy-loaded Protected Admin Operations Pages
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const ManageMovies = lazy(() => import("./pages/admin/ManageMovies"));
const ManageTheatres = lazy(() => import("./pages/admin/ManageTheatres"));
const ManageShows = lazy(() => import("./pages/admin/ManageShows"));
const ManageBookings = lazy(() => import("./pages/admin/ManageBookings"));
const ManageUsers = lazy(() => import("./pages/admin/ManageUsers"));
const AdminReports = lazy(() => import("./pages/admin/AdminReports"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));

import "./App.css";

export default function App() {
  return (
    <AuthProvider>
      <CityProvider>
        <BrowserRouter>
          <div
            className="app-wrapper"
            style={{
              minHeight: "100vh",
              backgroundColor: "#0a0b12",
              color: "#ffffff",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 3500,
                style: {
                  background: "#151828",
                  color: "#ffffff",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  fontSize: "0.88rem",
                },
              }}
            />
            <CityModal />
            <Navbar />

            <main className="main-content" style={{ flex: "1 0 auto" }}>
              <Suspense fallback={<LoadingSpinner message="Loading Screenly..." />}>
                <Routes>
                  {/* Entry Point: Landing Page for guests & first-time visitors, Home for authenticated/browsing */}
                  <Route path="/" element={<Landing />} />
                  <Route path="/landing" element={<Landing />} />
                  <Route path="/home" element={<Home />} />
                  <Route path="/search" element={<SearchPage />} />
                  <Route path="/explore" element={<SearchPage />} />
                  <Route path="/movies" element={<Movies />} />
                  <Route path="/movies/:id" element={<MovieDetails />} />
                  <Route path="/user-products" element={<Movies />} />
                  <Route path="/products" element={<Movies />} />
                  <Route path="/shows" element={<Shows />} />
                  <Route path="/theatres" element={<Theatres />} />

                  {/* Ticketing Simulator & Seat Selection (Requires Auth) */}
                  <Route
                    path="/book-simulator/:movieId"
                    element={
                      <ProtectedRoute>
                        <MovieBookingSimulator />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/seat-selection/:showId"
                    element={
                      <ProtectedRoute>
                        <SeatSelection />
                      </ProtectedRoute>
                    }
                  />

                  {/* Payment & E-Pass (Requires Auth) */}
                  <Route
                    path="/payment/:bookingId"
                    element={
                      <ProtectedRoute>
                        <Payment />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/booking-success/:bookingId"
                    element={
                      <ProtectedRoute>
                        <BookingSuccess />
                      </ProtectedRoute>
                    }
                  />

                  {/* Customer Account, Dashboard, Orders & Bookings (Requires Auth) */}
                  <Route
                    path="/profile"
                    element={
                      <ProtectedRoute>
                        <Profile />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/bookings"
                    element={
                      <ProtectedRoute>
                        <MyBookings />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/user-orders"
                    element={
                      <ProtectedRoute>
                        <MyBookings />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/orders"
                    element={
                      <ProtectedRoute>
                        <MyBookings />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/user-dashboard"
                    element={
                      <ProtectedRoute>
                        <Profile />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard"
                    element={
                      <ProtectedRoute>
                        <Profile />
                      </ProtectedRoute>
                    }
                  />

                  {/* Auth & Info */}
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/faq" element={<FAQ />} />

                  {/* Protected Admin Routes */}
                  <Route
                    path="/admin"
                    element={
                      <AdminRoute>
                        <AdminDashboard />
                      </AdminRoute>
                    }
                  />
                  <Route
                    path="/admin/movies"
                    element={
                      <AdminRoute>
                        <ManageMovies />
                      </AdminRoute>
                    }
                  />
                  <Route
                    path="/admin/add-movie"
                    element={
                      <AdminRoute>
                        <ManageMovies />
                      </AdminRoute>
                    }
                  />
                  <Route
                    path="/admin/theatres"
                    element={
                      <AdminRoute>
                        <ManageTheatres />
                      </AdminRoute>
                    }
                  />
                  <Route
                    path="/admin/add-theatre"
                    element={
                      <AdminRoute>
                        <ManageTheatres />
                      </AdminRoute>
                    }
                  />
                  <Route
                    path="/admin/shows"
                    element={
                      <AdminRoute>
                        <ManageShows />
                      </AdminRoute>
                    }
                  />
                  <Route
                    path="/admin/add-show"
                    element={
                      <AdminRoute>
                        <ManageShows />
                      </AdminRoute>
                    }
                  />
                  <Route
                    path="/admin/bookings"
                    element={
                      <AdminRoute>
                        <ManageBookings />
                      </AdminRoute>
                    }
                  />
                  <Route
                    path="/admin/users"
                    element={
                      <AdminRoute>
                        <ManageUsers />
                      </AdminRoute>
                    }
                  />
                  <Route
                    path="/admin/reports"
                    element={
                      <AdminRoute>
                        <AdminReports />
                      </AdminRoute>
                    }
                  />
                  <Route
                    path="/admin/settings"
                    element={
                      <AdminRoute>
                        <AdminSettings />
                      </AdminRoute>
                    }
                  />

                  {/* Catch-all */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
            </main>

            <Footer />
          </div>
        </BrowserRouter>
      </CityProvider>
    </AuthProvider>
  );
}
