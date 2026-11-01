import axios from "axios";

// Centralized Axios Instance with base configuration and timeout
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000",
  timeout: 10000,
  withCredentials: true,
});

// Request Interceptor: Attach JWT Bearer Token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("screenly_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Centralized error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear invalid token if session expires
      localStorage.removeItem("screenly_token");
      localStorage.removeItem("screenly_user");
    }
    return Promise.reject(error);
  }
);

// Modular API Domain Helpers
export const authApi = {
  login: (credentials) => api.post("/api/auth/login", credentials),
  register: (userData) => api.post("/api/auth/register", userData),
  getMe: () => api.get("/api/auth/me"),
};

export const moviesApi = {
  getAll: (params) => api.get("/api/movies", { params }),
  getById: (id) => api.get(`/api/movies/${id}`),
};

export const showsApi = {
  getAll: (params) => api.get("/api/shows", { params }),
  getById: (id) => api.get(`/api/shows/${id}`),
};

export const theatresApi = {
  getAll: (params) => api.get("/api/theatres", { params }),
  getById: (id) => api.get(`/api/theatres/${id}`),
};

export const bookingsApi = {
  create: (bookingData) => api.post("/api/bookings", bookingData),
  getMine: () => api.get("/api/bookings/mine"),
  getById: (id) => api.get(`/api/bookings/${id}`),
  processPayment: (id, paymentData) => api.post(`/api/bookings/${id}/pay`, paymentData),
  cancel: (id) => api.put(`/api/bookings/${id}/cancel`),
  cancelSeats: (id, cancelData) => api.put(`/api/bookings/${id}/cancel-seats`, cancelData),
};

export const userApi = {
  getProfile: () => api.get("/api/users/profile"),
  updateProfile: (profileData) => api.put("/api/users/profile", profileData),
  changePassword: (passwordData) => api.put("/api/users/change-password", passwordData),
};

export default api;
