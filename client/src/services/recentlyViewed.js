// client/src/services/recentlyViewed.js

const KEY = "screenly_recently_viewed";

export const addRecentlyViewed = (movie) => {
  if (!movie) return;
  try {
    const existing = JSON.parse(localStorage.getItem(KEY) || "[]");
    const id = movie.id || movie.movieId || movie._id;
    const filtered = existing.filter((m) => (m.id || m.movieId || m._id) !== id);
    filtered.unshift(movie);
    localStorage.setItem(KEY, JSON.stringify(filtered.slice(0, 8)));
  } catch {
    // ignore
  }
};

export const getRecentlyViewed = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
};
