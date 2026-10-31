// client/src/context/AuthContext.jsx
import { createContext, useState, useEffect } from "react";
import api from "../services/api";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // 1. Initial State from localStorage
  const [user, setUser] = useState(() => {
    try {
      const savedUser =
        localStorage.getItem("screenly_user") ||
        localStorage.getItem("imovies_user");
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(
    () =>
      localStorage.getItem("screenly_token") ||
      localStorage.getItem("imovies_token") ||
      null
  );

  const [loading, setLoading] = useState(true);

  // 2. Safe Synchronous Session Clearing (No recursive network calls)
  const clearSessionStorage = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("screenly_token");
    localStorage.removeItem("screenly_user");
    localStorage.removeItem("imovies_token");
    localStorage.removeItem("imovies_user");
  };

  // 3. Safe Session Verification on App Startup
  useEffect(() => {
    let isMounted = true;

    const verifyUser = async () => {
      const storedToken =
        localStorage.getItem("screenly_token") ||
        localStorage.getItem("imovies_token");

      if (storedToken) {
        try {
          const res = await api.get("/api/auth/me");
          if (isMounted && res.data && res.data.user) {
            setUser(res.data.user);
            localStorage.setItem("screenly_user", JSON.stringify(res.data.user));
          }
        } catch (err) {
          // Only invalidate local session if server is REACHABLE and responds with 401 or 403
          if (err.response && (err.response.status === 401 || err.response.status === 403)) {
            clearSessionStorage();
          }
        }
      }

      if (isMounted) {
        setLoading(false);
      }
    };

    verifyUser();

    return () => {
      isMounted = false;
    };
  }, []);

  // 4. Login Action
  const login = async (email, password) => {
    const res = await api.post("/api/auth/login", { email, password });
    if (res.data && res.data.token) {
      setToken(res.data.token);
      setUser(res.data.user);
      localStorage.setItem("screenly_token", res.data.token);
      localStorage.setItem("screenly_user", JSON.stringify(res.data.user));
    }
    return res.data;
  };

  // 5. Register Action
  const register = async (userData) => {
    const res = await api.post("/api/auth/register", userData);
    if (res.data && res.data.token) {
      setToken(res.data.token);
      setUser(res.data.user);
      localStorage.setItem("screenly_token", res.data.token);
      localStorage.setItem("screenly_user", JSON.stringify(res.data.user));
    }
    return res.data;
  };

  // 6. Logout Action
  const logout = async () => {
    try {
      await api.post("/api/auth/logout");
    } catch {
      // Safe to ignore if server is unreachable
    }
    clearSessionStorage();
  };

  // 7. Update User Profile Data
  const updateUser = (updatedUserData) => {
    setUser((prev) => {
      const merged = { ...prev, ...updatedUserData };
      localStorage.setItem("screenly_user", JSON.stringify(merged));
      return merged;
    });
  };

  const isAdmin = Boolean(user && user.role === "admin");

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAdmin,
        login,
        register,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
