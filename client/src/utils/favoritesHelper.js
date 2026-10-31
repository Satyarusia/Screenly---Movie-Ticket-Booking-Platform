// client/src/utils/favoritesHelper.js
import api from "../services/api";
import {
  getMovieId,
  getMovieTitle,
  getPosterUrl,
  getMovieRating,
  getMovieLanguage,
  getGenres,
} from "./tmdbHelper";

const STORAGE_KEY = "screenly_user_favorites";

/**
 * 1. Base functions
 */
export const getFavorites = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

// Aliases for compatibility
export const loadFavorites = getFavorites;
export const fetchFavorites = getFavorites;

export const isMovieFavorited = (movieId) => {
  const list = getFavorites();
  return list.some((m) => (m.movieId || m._id || m.id) === movieId);
};

export const checkIsFavorite = isMovieFavorited;

export const toggleFavoriteMovie = async (movie) => {
  const list = getFavorites();
  const id = getMovieId(movie);
  const exists = list.some((m) => (m.movieId || m._id || m.id) === id);

  let updated;
  if (exists) {
    updated = list.filter((m) => (m.movieId || m._id || m.id) !== id);
  } else {
    const favoriteItem = {
      movieId: id,
      _id: id,
      id: id,
      movieName: getMovieTitle(movie),
      title: getMovieTitle(movie),
      media: getPosterUrl(movie),
      poster: getPosterUrl(movie),
      rating: getMovieRating(movie),
      language: getMovieLanguage(movie),
      genres: getGenres(movie),
      runtime: movie.runtime || movie.duration || 150,
      addedAt: new Date().toISOString(),
    };
    updated = [favoriteItem, ...list];
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

  // Sync with backend API if user session is active
  try {
    if (exists) {
      await api.delete(`/api/users/favourites/${id}`);
    } else {
      await api.post(`/api/users/favourites/${id}`);
    }
  } catch {
    // Backend optional; local storage persists immediately
  }

  // Notify other components immediately
  window.dispatchEvent(new Event("favorites_updated"));
  return !exists;
};

// More aliases that other components might call
export const toggleFavorite = toggleFavoriteMovie;
export const addFavorite = toggleFavoriteMovie;
export const removeFavorite = toggleFavoriteMovie;

export default {
  getFavorites,
  loadFavorites,
  fetchFavorites,
  isMovieFavorited,
  checkIsFavorite,
  toggleFavoriteMovie,
  toggleFavorite,
  addFavorite,
  removeFavorite,
};
