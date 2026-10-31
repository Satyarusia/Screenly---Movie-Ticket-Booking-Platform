// client/src/utils/tmdbHelper.js
import axios from "axios";

// Reads dynamically from client/.env
const TMDB_IMAGE_BASE =
  import.meta.env.VITE_TMDB_IMAGE_BASE || "https://image.tmdb.org/t/p";
const TMDB_API_KEY =
  import.meta.env.VITE_TMDB_API_KEY || "4320c6bb6bced39b12edc2b10de42798";

// In-memory cache so we never re-fetch the same movie twice
const tmdbCache = new Map();

/**
 * Canonical TMDB Mapping for accurate posters, TMDB IDs, and zero mismatches
 */
export const MOVIE_TMDB_MAP = {
  "nayi naveli": { tmdbId: 1654581, poster: "/posters/1654581.jpg" },
  "nayyi navelli": { tmdbId: 1654581, poster: "/posters/1654581.jpg" },
  "drishyam: the conclusion": { tmdbId: 1269325, poster: "https://image.tmdb.org/t/p/w780/67FsF2kpgEZ1T5Qos4adgqm9dLf.jpg" },
  "clayface": { tmdbId: 1400940, poster: "https://image.tmdb.org/t/p/w780/9l1NuFjel2j89hiuiJbsxfblqjy.jpg" },
  "udta teer": { tmdbId: 1375156, poster: "https://image.tmdb.org/t/p/w780/tvICKypVlW7Iio4KVs7NousbSKi.jpg" },
  "the paradise": { tmdbId: 1376856, poster: "https://image.tmdb.org/t/p/w780/smghVMoMWSIFi5dgIz4w1UIcEcY.jpg" },
  "street fighter": { tmdbId: 1153576, poster: "https://image.tmdb.org/t/p/w780/ccxdepKqORLwccbzvO4eAGkN0IC.jpg" },
  "baththa": { tmdbId: 1515692, poster: "https://image.tmdb.org/t/p/w780/7wHBYs8HHmTGe4nXLpMEAoDSK2o.jpg" },
  "runner": { tmdbId: 1377237, poster: "https://image.tmdb.org/t/p/w780/vJk2TW1QZAmBiD7oj9ZF9EPTYY1.jpg" },
  "ramayana: rise of a legend": { tmdbId: 656908, poster: "https://image.tmdb.org/t/p/w780/hz2Hv8tPToHvQ7HaxzqeLvahmcJ.jpg" },
  "mission: impossible - the final reckoning": { tmdbId: 575265, poster: "https://image.tmdb.org/t/p/w780/iKPsC9EFUafRP9SrUznI61getVP.jpg" },
  "moon walk": { tmdbId: 1306500, poster: "https://image.tmdb.org/t/p/w780/r6tHsCtTnLJ7aK6B8yl25jY49Jq.jpg" },
  "avatar: fire and ash": { tmdbId: 83533, poster: "https://image.tmdb.org/t/p/w780/bRBeSHfGHwkEpImlhxPmOcUsaeg.jpg" },
  "singham again": { tmdbId: 1014214, poster: "https://image.tmdb.org/t/p/w780/2JbNkHg8m7LaBy61LyrnnlenaxY.jpg" },
  "avengers: secret wars": { tmdbId: 1003598, poster: "https://image.tmdb.org/t/p/w780/f0YBuh4hyiAheXhh4JnJWoKi9g5.jpg" },
  "12th fail": { tmdbId: 1163258, poster: "https://image.tmdb.org/t/p/w780/eebUPRI4Z5e1Z7Hev4JZAwMIFkX.jpg" },
  "stree 2": { tmdbId: 1112426, poster: "https://image.tmdb.org/t/p/w780/nfnhwfUEFuSOxxf4jDdBlY6Lccw.jpg" },
  "jawan": { tmdbId: 872906, poster: "https://image.tmdb.org/t/p/w780/jFt1g94utjj2YK4aeJnAcvOxYCW.jpg" },
  "animal": { tmdbId: 781732, poster: "https://image.tmdb.org/t/p/w780/hr95oo8GcxPt0MBPvg93JACPIaW.jpg" },
  "fighter": { tmdbId: 784651, poster: "https://image.tmdb.org/t/p/w780/zqFuriKJ6pYDvf72kXNLONnuE8k.jpg" },
  "rocky aur rani kii prem kahaani": { tmdbId: 848116, poster: "https://image.tmdb.org/t/p/w780/vTQIqlxUkOuyf2UKhlM2OUaFGKz.jpg" },
  "dangal": { tmdbId: 360814, poster: "https://image.tmdb.org/t/p/w780/cJRPOLEexI7qp2DKtFfCh7YaaUG.jpg" },
  "3 idiots": { tmdbId: 20453, poster: "https://image.tmdb.org/t/p/w780/66A9MqXOyVFCssoloscw79z8Tew.jpg" },
  "oppenheimer": { tmdbId: 872585, poster: "https://image.tmdb.org/t/p/w780/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg" },
  "dune: part two": { tmdbId: 693134, poster: "https://image.tmdb.org/t/p/w780/8b8R8l88Qje9dn9OE8PY05Nxl1X.jpg" },
  "interstellar": { tmdbId: 157336, poster: "https://image.tmdb.org/t/p/w780/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg" },
  "the dark knight": { tmdbId: 155, poster: "https://image.tmdb.org/t/p/w780/qJ2tW6WMUDux911r6m7haRef0WH.jpg" },
  "inception": { tmdbId: 27205, poster: "https://image.tmdb.org/t/p/w780/qmDpIHrmpJINaRKAfWQfftjCdyi.jpg" },
  "inside out 2": { tmdbId: 1022789, poster: "https://image.tmdb.org/t/p/w780/vpnVM9B6NMmQpWeZvzLvDESb2QY.jpg" },
  "spider-man: across the spider-verse": { tmdbId: 569094, poster: "https://image.tmdb.org/t/p/w780/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg" },
  "kalki 2898 ad": { tmdbId: 792307, poster: "https://image.tmdb.org/t/p/w780/rstcAnBeCkxNQjNp3YXrF6IP1tW.jpg" },
  "rrr": { tmdbId: 579974, poster: "https://image.tmdb.org/t/p/w780/nEufeZlyAOLqO2brrs0yeMu1QXO.jpg" },
  "sita ramam": { tmdbId: 894803, poster: "https://image.tmdb.org/t/p/w780/t1O94ZBzsQXJihtVkrsStRLyUDR.jpg" },
  "manjummel boys": { tmdbId: 1069945, poster: "https://image.tmdb.org/t/p/w780/bswrtewwthpsh6nABiqKevU4UBI.jpg" },
  "k.g.f: chapter 2": { tmdbId: 587412, poster: "https://image.tmdb.org/t/p/w780/khNVygolU0TxLIDWff5tQlAhZ23.jpg" },
  "pushpa: the rise": { tmdbId: 690957, poster: "https://image.tmdb.org/t/p/w780/h6Pd89ngvl9quPVsx3KoJlQsvk9.jpg" },
};

/**
 * Resolves genuine TMDB ID from movie object or canonical title lookup
 */
export const getMovieTmdbId = (movie) => {
  if (!movie) return null;
  if (movie.tmdbId) return Number(movie.tmdbId);
  const title = String(movie.title || movie.movieName || "").toLowerCase().trim();
  const matched = MOVIE_TMDB_MAP[title];
  if (matched && matched.tmdbId) return matched.tmdbId;
  for (const [key, val] of Object.entries(MOVIE_TMDB_MAP)) {
    if (title.includes(key) || key.includes(title)) {
      return val.tmdbId;
    }
  }
  return null;
};

/**
 * Returns supported screening formats (2D, 3D, IMAX, 4DX, Dolby Atmos)
 */
export const getMovieFormats = (movie) => {
  if (!movie) return ["2D"];
  if (Array.isArray(movie.formats) && movie.formats.length > 0) return movie.formats;
  if (Array.isArray(movie.format) && movie.format.length > 0) return movie.format;
  if (typeof movie.format === "string" && movie.format) return [movie.format];
  const title = String(movie.title || movie.movieName || "").toLowerCase();
  const genres = (movie.genres || movie.genre || []).map((g) => String(g).toLowerCase());
  if (
    genres.includes("action") ||
    genres.includes("sci-fi") ||
    genres.includes("adventure") ||
    genres.includes("fantasy") ||
    title.includes("avatar") ||
    title.includes("avengers") ||
    title.includes("mission") ||
    title.includes("dune") ||
    title.includes("kalki") ||
    title.includes("singham") ||
    title.includes("interstellar") ||
    title.includes("dark knight")
  ) {
    return ["2D", "3D", "IMAX", "4DX", "Dolby Atmos"];
  }
  if (genres.includes("animation")) {
    return ["2D", "3D", "Dolby Atmos"];
  }
  return ["2D", "Dolby Atmos"];
};

/**
 * High-Quality Cinema SVG Fallback Poster
 * Generates an elegant, modern cinema poster with dark glass gradient, film icon & typography
 */
export const createTitlePosterSvg = (title = "Movie", subtitle = "SCREENLY CINEMA") => {
  const safeTitle = String(title || "Movie")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Elegant multi-line text wrapping for long movie titles
  const words = safeTitle.split(/\s+/);
  let line1 = "";
  let line2 = "";
  if (safeTitle.length <= 22) {
    line1 = safeTitle;
  } else {
    for (const w of words) {
      if ((line1 + " " + w).trim().length <= 22 && !line2) {
        line1 = (line1 + " " + w).trim();
      } else {
        line2 = (line2 + " " + w).trim();
      }
    }
    if (line2.length > 24) line2 = line2.slice(0, 22) + "...";
    if (!line1) line1 = safeTitle.slice(0, 22);
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="500" height="750" viewBox="0 0 500 750">
    <defs>
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#141729" />
        <stop offset="50%" stop-color="#0d0f1a" />
        <stop offset="100%" stop-color="#1b0811" />
      </linearGradient>
      <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#e50914" />
        <stop offset="100%" stop-color="#ff3b30" />
      </linearGradient>
      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="10" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>
    <!-- Background -->
    <rect width="500" height="750" fill="url(#bgGrad)" />
    <!-- Subtle Inner Border -->
    <rect x="20" y="20" width="460" height="710" rx="18" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="2"/>
    <!-- Cinema Clapperboard / Film Icon Graphic -->
    <g transform="translate(180, 210)" filter="url(#glow)">
      <circle cx="70" cy="70" r="64" fill="rgba(229, 9, 20, 0.15)" stroke="#e50914" stroke-width="2.5" />
      <path d="M50 48 L96 70 L50 92 Z" fill="#ffffff" />
    </g>
    <!-- Title -->
    <text x="250" y="${line2 ? 420 : 435}" fill="#ffffff" font-size="${line2 ? 24 : 28}" font-weight="800" font-family="'Outfit', 'Plus Jakarta Sans', sans-serif" text-anchor="middle" letter-spacing="-0.5">
      ${line1}
    </text>
    ${line2 ? `<text x="250" y="455" fill="#ffffff" font-size="22" font-weight="800" font-family="'Outfit', 'Plus Jakarta Sans', sans-serif" text-anchor="middle" letter-spacing="-0.5">${line2}</text>` : ""}
    <!-- Accent Line -->
    <rect x="200" y="${line2 ? 485 : 465}" width="100" height="3" rx="1.5" fill="url(#accentGrad)" />
    <!-- Subtitle / Brand Badge -->
    <text x="250" y="${line2 ? 525 : 505}" fill="#94a3b8" font-size="13" font-weight="700" font-family="'Plus Jakarta Sans', sans-serif" text-anchor="middle" letter-spacing="3">
      ${String(subtitle || "SCREENLY CINEMA").toUpperCase()}
    </text>
    <!-- Watermark Logo -->
    <text x="250" y="680" fill="rgba(255,255,255,0.3)" font-size="11" font-weight="600" font-family="'Plus Jakarta Sans', sans-serif" text-anchor="middle" letter-spacing="1">
      PREMIER THEATRICAL EXPERIENCE
    </text>
  </svg>`;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

/**
 * Universal Image Error Handler
 * Cascades gracefully:
 * 1. Resolves genuine tmdbId and checks local pre-bundled poster (/posters/{tmdbId}.jpg)
 * 2. If missing or fails, generates dynamic offline cinema SVG poster in memory
 */
export const handleImageError = (e, title = "Screenly Feature", tmdbId = null) => {
  if (e && (e.currentTarget || e.target)) {
    const el = e.currentTarget || e.target;
    const currentSrc = el.src || "";
    const resolvedId = tmdbId || getMovieTmdbId({ title });
    if (resolvedId && !currentSrc.includes(`/posters/${resolvedId}.jpg`) && !currentSrc.startsWith("data:")) {
      el.src = `/posters/${resolvedId}.jpg`;
      return;
    }
    el.onerror = null;
    el.src = createTitlePosterSvg(title);
  }
};

export const FALLBACK_POSTER = createTitlePosterSvg("Screenly");

/**
 * Universal dynamic poster extractor
 * Validates TMDB image formats, handles local static posters, upgrades protocols & guarantees clean valid URLs
 */
export const getPosterUrl = (movie, size = "w780") => {
  if (!movie) return FALLBACK_POSTER;

  const title = getMovieTitle(movie);
  const resolvedTmdbId = getMovieTmdbId(movie);

  const raw =
    movie.poster ||
    movie.poster_path ||
    movie.media ||
    movie.posterUrl ||
    movie.image ||
    movie.backdrop ||
    movie.backdrop_path;

  // Check canonical map for exact high-resolution poster
  const titleKey = String(title).toLowerCase().trim();
  const canonical = MOVIE_TMDB_MAP[titleKey];

  if (!raw || typeof raw !== "string" || raw.trim() === "" || raw === "undefined" || raw === "null") {
    if (canonical && canonical.poster) {
      return canonical.poster;
    }
    if (resolvedTmdbId) {
      return `/posters/${resolvedTmdbId}.jpg`;
    }
    return createTitlePosterSvg(title);
  }

  let clean = raw.trim();

  // Upgrade http to https to prevent browser mixed-content blocks
  if (clean.startsWith("http://")) {
    clean = "https://" + clean.slice(7);
  }

  // If TMDB image URL contains /w500/, upgrade to higher resolution (w780)
  if (clean.includes("image.tmdb.org/t/p/w500/")) {
    clean = clean.replace("/w500/", `/${size}/`);
  }

  // Fully qualified URL or data URI
  if (clean.startsWith("https://") || clean.startsWith("data:")) {
    return clean;
  }

  // Local static poster downloaded in client/public/posters/
  if (clean.startsWith("/posters/")) {
    return clean;
  }

  // Relative TMDB CDN path (e.g. /67FsF2kpgEZ1T5Qos4adgqm9dLf.jpg)
  if (clean.startsWith("/")) {
    return `${TMDB_IMAGE_BASE}/${size}${clean}`;
  }

  // TMDB image hash ending in image format without leading slash
  if (clean.endsWith(".jpg") || clean.endsWith(".jpeg") || clean.endsWith(".png") || clean.endsWith(".webp")) {
    return `${TMDB_IMAGE_BASE}/${size}/${clean}`;
  }

  // If movie has a resolved tmdbId, try local poster
  if (resolvedTmdbId) {
    return `/posters/${resolvedTmdbId}.jpg`;
  }

  if (canonical && canonical.poster) {
    return canonical.poster;
  }

  return createTitlePosterSvg(title);
};

export const getBackdropUrl = (movie) => {
  if (!movie) return FALLBACK_POSTER;
  const raw = movie.backdrop || movie.backdrop_path;
  if (raw && typeof raw === "string" && raw.trim() !== "" && raw !== "undefined" && raw !== "null") {
    let clean = raw.trim();
    if (clean.startsWith("http://")) clean = "https://" + clean.slice(7);
    if (clean.startsWith("https://") || clean.startsWith("data:")) return clean;
    if (clean.startsWith("/posters/")) return clean;
    if (clean.startsWith("/")) return `${TMDB_IMAGE_BASE}/w1280${clean}`;
    if (clean.endsWith(".jpg") || clean.endsWith(".jpeg") || clean.endsWith(".png") || clean.endsWith(".webp")) {
      return `${TMDB_IMAGE_BASE}/w1280/${clean}`;
    }
  }
  return getPosterUrl(movie, "w1280");
};

export const getProxyImageUrl = (urlOrPath) => {
  if (!urlOrPath) return "";
  const apiBase = import.meta.env.VITE_API_URL || "http://localhost:5000";
  return `${apiBase}/api/movies/image-proxy?url=${encodeURIComponent(urlOrPath)}`;
};

export const getMovieTitle = (movie) => {
  if (!movie) return "Cinema Feature";
  return movie.title || movie.movieName || movie.name || "Cinema Feature";
};

export const getMovieRating = (movie) => {
  if (!movie) return "8.0";
  const val = movie.rating || movie.vote_average;
  if (val !== undefined && val !== null && !isNaN(val)) {
    return Number(val).toFixed(1);
  }
  return "8.0";
};

export const getMovieLanguage = (movie) => {
  if (!movie) return "Hindi";
  const raw = (movie.language || movie.original_language || "Hindi").toLowerCase();
  const map = {
    hi: "Hindi",
    en: "English",
    te: "Telugu",
    ta: "Tamil",
    ml: "Malayalam",
    kn: "Kannada",
    es: "Spanish",
    ja: "Japanese",
    fr: "French",
  };
  return map[raw] || (raw.charAt(0).toUpperCase() + raw.slice(1));
};

export const getMovieId = (movie) => {
  if (!movie) return "movie_" + Date.now();
  return movie._id || movie.id || movie.movieId || encodeURIComponent(getMovieTitle(movie));
};

export const getGenres = (movie) => {
  if (!movie) return ["Action", "Drama"];
  if (Array.isArray(movie.genres)) {
    return movie.genres.map((g) => (typeof g === "string" ? g : g.name || "Cinema")).filter(Boolean);
  }
  if (Array.isArray(movie.genre)) {
    return movie.genre.map((g) => (typeof g === "string" ? g : g.name || "Cinema")).filter(Boolean);
  }
  if (typeof movie.genre === "string") {
    return movie.genre.split(",").map((s) => s.trim()).filter(Boolean);
  }
  if (typeof movie.genres === "string") {
    return movie.genres.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return ["Action", "Drama"];
};

export const getCast = (movie) => {
  if (!movie) return [];
  if (Array.isArray(movie.cast)) {
    return movie.cast.map((c) => (typeof c === "string" ? c : c.name || "Actor")).filter(Boolean);
  }
  if (typeof movie.cast === "string") {
    return movie.cast.split(",").map((c) => c.trim()).filter(Boolean);
  }
  return [];
};

export const getRuntime = (movie) => {
  if (!movie) return "2h 15m";
  const raw = movie.duration || movie.runtime;
  if (!raw) return "2h 15m";
  if (typeof raw === "string" && (raw.includes("h") || raw.includes("m"))) {
    return raw;
  }
  const mins = Number(raw);
  if (!isNaN(mins) && mins > 0) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  }
  return "2h 15m";
};

export const getDescription = (movie) => {
  if (!movie) return "An acclaimed cinema feature screened across premier multiplexes.";
  return (
    movie.description ||
    movie.overview ||
    "An acclaimed cinema feature screened across premier multiplexes."
  );
};

export const getCertification = (movie) => {
  if (!movie) return "U/A";
  return movie.certification || movie.rated || (movie.adult ? "A" : "U/A") || "U/A";
};

export const getReleaseYear = (movie) => {
  if (!movie) return "";
  const dateStr = movie.releaseDate || movie.release_date || movie.year || "";
  const str = String(dateStr);
  const match = str.match(/\d{4}/);
  return match ? match[0] : "";
};

export const getReleaseDate = (movie) => {
  if (!movie) return "";
  return movie.releaseDate || movie.release_date || "";
};

export const getTrailerKey = (movie) => {
  if (!movie) return null;
  return (
    movie.trailerYoutubeId ||
    movie.trailer_key ||
    (movie.videos?.results && movie.videos.results[0]?.key) ||
    null
  );
};

/**
 * Validate and enrich every movie before rendering anywhere in the application
 * Guarantees zero missing fields, zero broken UI elements, and standardized structure
 */
export const validateAndEnrichMovie = (movie) => {
  if (!movie) return null;
  const title = getMovieTitle(movie);
  const poster = getPosterUrl(movie);
  const backdrop = getBackdropUrl(movie);
  const rating = getMovieRating(movie);
  const language = getMovieLanguage(movie);
  const genres = getGenres(movie);
  const releaseDate = getReleaseDate(movie);
  const releaseYear = getReleaseYear(movie);
  const duration = getRuntime(movie);
  const certification = getCertification(movie);
  const description = getDescription(movie);
  const trailerKey = getTrailerKey(movie);

  return {
    ...movie,
    id: getMovieId(movie),
    title,
    movieName: title,
    poster,
    poster_path: poster,
    backdrop,
    backdrop_path: backdrop,
    rating,
    language,
    genres,
    genre: genres,
    releaseDate,
    releaseYear,
    duration,
    runtime: movie.runtime || movie.duration || 135,
    certification,
    description,
    trailerYoutubeId: trailerKey,
  };
};

export const fetchLiveTmdbMovie = async (movie) => {
  const title = getMovieTitle(movie);
  if (!title || title === "Cinema Feature") return null;

  const cacheKey = title.toLowerCase().trim();
  if (tmdbCache.has(cacheKey)) {
    return tmdbCache.get(cacheKey);
  }

  try {
    const res = await axios.get("https://api.themoviedb.org/3/search/movie", {
      params: {
        api_key: TMDB_API_KEY,
        query: title,
        include_adult: false,
      },
      timeout: 3000,
    });

    if (res.data?.results && res.data.results.length > 0) {
      const match = res.data.results.find((m) => m.poster_path) || res.data.results[0];
      if (match) {
        const fullPosterUrl = match.poster_path
          ? `${TMDB_IMAGE_BASE}/w500${match.poster_path}`
          : createTitlePosterSvg(title);

        const fullBackdropUrl = match.backdrop_path
          ? `${TMDB_IMAGE_BASE}/w1280${match.backdrop_path}`
          : fullPosterUrl;

        const liveData = {
          id: match.id,
          title: match.title,
          poster_path: fullPosterUrl,
          backdrop_path: fullBackdropUrl,
          overview: match.overview,
          vote_average: match.vote_average,
          release_date: match.release_date,
        };

        tmdbCache.set(cacheKey, liveData);
        return liveData;
      }
    }
  } catch {
    // Graceful offline fallback
  }

  return null;
};

export default {
  FALLBACK_POSTER,
  createTitlePosterSvg,
  handleImageError,
  getPosterUrl,
  getMovieTmdbId,
  getMovieFormats,
  getProxyImageUrl,
  fetchLiveTmdbMovie,
  getBackdropUrl,
  getMovieTitle,
  getMovieRating,
  getMovieLanguage,
  getMovieId,
  getGenres,
  getCast,
  getRuntime,
  getDescription,
  getCertification,
  getReleaseYear,
  getReleaseDate,
  getTrailerKey,
  validateAndEnrichMovie,
};
