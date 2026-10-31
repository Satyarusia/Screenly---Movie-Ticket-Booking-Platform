const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const Movie = require("../models/movieModel");
const Show = require("../models/showModel");
const Theatre = require("../models/theatreModel");

const POSTER_DIR = path.join(__dirname, "../../client/public/posters");

// Canonical TMDB mapping and high-resolution verified local posters
const MOVIE_TMDB_MAP = {
  "nayi naveli": { tmdbId: 1654581, poster: "/posters/1654581.jpg" },
  "nayyi navelli": { tmdbId: 1654581, poster: "/posters/1654581.jpg" },
  "prahaar: the untold story of ujjwal nikam": { tmdbId: 1081010, poster: "/posters/1081010.jpg" },
  "prahar: the untold story of ujjwal": { tmdbId: 1081010, poster: "/posters/1081010.jpg" },
  "prahaar": { tmdbId: 1081010, poster: "/posters/1081010.jpg" },
  "drishyam: the conclusion": { tmdbId: 1269325, poster: "/posters/1269325.jpg" },
  "clayface": { tmdbId: 1400940, poster: "/posters/1400940.jpg" },
  "udta teer": { tmdbId: 1375156, poster: "/posters/1375156.jpg" },
  "the paradise": { tmdbId: 1376856, poster: "/posters/1376856.jpg" },
  "street fighter": { tmdbId: 1153576, poster: "/posters/1153576.jpg" },
  "baththa": { tmdbId: 1515692, poster: "/posters/1515692.jpg" },
  "runner": { tmdbId: 1377237, poster: "/posters/1377237.jpg" },
  "ramayana: rise of a legend": { tmdbId: 656908, poster: "/posters/656908.jpg" },
  "mission: impossible - the final reckoning": { tmdbId: 575265, poster: "/posters/575265.jpg" },
  "moon walk": { tmdbId: 1306500, poster: "/posters/1306500.jpg" },
  "avatar: fire and ash": { tmdbId: 83533, poster: "/posters/83533.jpg" },
  "singham again": { tmdbId: 1014214, poster: "/posters/1014214.jpg" },
  "avengers: secret wars": { tmdbId: 1003598, poster: "/posters/1003598.jpg" },
  "avengers: doomsday": { tmdbId: 1003596, poster: "/posters/1003596.jpg" },
  "dune: part three": { tmdbId: 1170608, poster: "/posters/1170608.jpg" },
  "mookuthi amman 2": { tmdbId: 1327835, poster: "/posters/1327835.jpg" },
  "narnia: the magician's nephew": { tmdbId: 1147572, poster: "/posters/1147572.jpg" },
  "12th fail": { tmdbId: 1163258, poster: "/posters/1163258.jpg" },
  "stree 2": { tmdbId: 1112426, poster: "/posters/1112426.jpg" },
  "jawan": { tmdbId: 872906, poster: "/posters/872906.jpg" },
  "animal": { tmdbId: 781732, poster: "/posters/781732.jpg" },
  "fighter": { tmdbId: 784651, poster: "/posters/784651.jpg" },
  "rocky aur rani kii prem kahaani": { tmdbId: 848116, poster: "/posters/848116.jpg" },
  "dangal": { tmdbId: 360814, poster: "/posters/360814.jpg" },
  "3 idiots": { tmdbId: 20453, poster: "/posters/20453.jpg" },
  "oppenheimer": { tmdbId: 872585, poster: "/posters/872585.jpg" },
  "dune: part two": { tmdbId: 693134, poster: "/posters/693134.jpg" },
  "interstellar": { tmdbId: 157336, poster: "/posters/157336.jpg" },
  "the dark knight": { tmdbId: 155, poster: "/posters/155.jpg" },
  "inception": { tmdbId: 27205, poster: "/posters/27205.jpg" },
  "inside out 2": { tmdbId: 1022789, poster: "/posters/1022789.jpg" },
  "spider-man: across the spider-verse": { tmdbId: 569094, poster: "/posters/569094.jpg" },
  "kalki 2898 ad": { tmdbId: 792307, poster: "/posters/792307.jpg" },
  "rrr": { tmdbId: 579974, poster: "/posters/579974.jpg" },
  "sita ramam": { tmdbId: 894803, poster: "/posters/894803.jpg" },
  "manjummel boys": { tmdbId: 1069945, poster: "/posters/1069945.jpg" },
  "k.g.f: chapter 2": { tmdbId: 587412, poster: "/posters/587412.jpg" },
  "pushpa: the rise": { tmdbId: 690957, poster: "/posters/690957.jpg" },
};

// Helper to determine normalized real-world theatrical status based on cinema programming reality
const resolveMovieStatus = (movie, hasActiveShows = false) => {
  const rawStatus = (movie.theatricalStatus || "").toLowerCase();
  const now = new Date();
  const release = movie.releaseDate ? new Date(movie.releaseDate) : null;

  // 1. Explicitly ended or marked concluded
  if (rawStatus === "ended" || rawStatus === "concluded" || rawStatus === "closed") {
    return "Ended";
  }

  // 2. Future release date (release > now)
  if (release && release > now) {
    // If ticket bookings/shows are actively scheduled and open before release
    if (hasActiveShows && (movie.isAdvanceBooking || rawStatus.includes("advance"))) {
      return "Advance Booking";
    }
    // Otherwise, officially announced upcoming release
    return "Coming Soon";
  }

  // 3. Released on or before today (release <= now)
  // A movie is strictly "Now Showing" if it has active showtimes in cinemas or was explicitly set to Now Showing
  if (hasActiveShows) {
    return "Now Showing";
  }

  // Respect admin-designated status if explicitly configured
  if (rawStatus === "now showing" || rawStatus === "now_playing") {
    return "Now Showing";
  }
  if (rawStatus === "advance booking" || movie.isAdvanceBooking) {
    return "Advance Booking";
  }
  if (rawStatus === "coming soon" || rawStatus === "upcoming") {
    return "Coming Soon";
  }

  // If released in the past with no explicit status and ZERO active showtimes: theatrical run has ended
  return "Ended";
};

// @desc    Get all movies with search, filter, city-based screenings, and real-world statuses
// @route   GET /api/movies
// @access  Public
const getMovies = async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.json([]);
    }
    const { search, genre, language, status, sortBy, city, nowShowingInCity, format, minRating } = req.query;
    const filter = {};
    const andClauses = [];

    if (search && search.trim()) {
      const cleanSearch = search.trim();
      const escaped = cleanSearch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const vowelFlex = escaped.replace(/([aeiouy]+)/gi, "$1+");
      const tokens = cleanSearch
        .split(/[\s:,\-_]+/)
        .filter((t) => t.length >= 2)
        .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));

      const searchOr = [
        { title: { $regex: escaped, $options: "i" } },
        { title: { $regex: vowelFlex, $options: "i" } },
        { movieName: { $regex: escaped, $options: "i" } },
        { movieName: { $regex: vowelFlex, $options: "i" } },
        { cast: { $regex: escaped, $options: "i" } },
        { director: { $regex: escaped, $options: "i" } },
        { genre: { $regex: escaped, $options: "i" } },
        { genres: { $regex: escaped, $options: "i" } },
        { description: { $regex: escaped, $options: "i" } },
      ];

      // Multi-token and phonetic support: ensure queries like "Prahar", "Ujjwal" match "Prahaar"
      tokens.forEach((tok) => {
        const tokVowel = tok.replace(/([aeiouy]+)/gi, "$1+");
        searchOr.push(
          { title: { $regex: tok, $options: "i" } },
          { title: { $regex: tokVowel, $options: "i" } },
          { movieName: { $regex: tok, $options: "i" } },
          { cast: { $regex: tok, $options: "i" } }
        );
      });

      andClauses.push({ $or: searchOr });
    }

    if (genre && genre !== "All") {
      andClauses.push({
        $or: [
          { genre: { $regex: genre, $options: "i" } },
          { genres: { $regex: genre, $options: "i" } },
        ],
      });
    }

    if (language && language !== "All") {
      const l = language.toLowerCase();
      const langCodes = {
        hindi: "hi",
        english: "en",
        telugu: "te",
        tamil: "ta",
        malayalam: "ml",
        kannada: "kn",
      };
      const alt = langCodes[l] || l;
      andClauses.push({
        language: { $regex: new RegExp(`(${l}|${alt})`, "i") },
      });
    }

    if (minRating && Number(minRating) > 0) {
      andClauses.push({ rating: { $gte: Number(minRating) } });
    }

    if (andClauses.length > 0) {
      filter.$and = andClauses;
    }

    let sort = { rating: -1, createdAt: -1 };
    if (sortBy === "releaseDate") sort = { releaseDate: -1 };
    if (sortBy === "popularity") sort = { popularity: -1, rating: -1 };
    if (sortBy === "rating") sort = { rating: -1 };
    if (sortBy === "name") sort = { title: 1 };

    const movies = await Movie.find(filter).sort(sort);

    // Check which movies have active scheduled shows globally and in the selected city
    const allActiveDistinctIds = await Show.distinct("movie", {
      showTime: { $gte: new Date() },
    });
    const activeMovieIdSet = new Set(allActiveDistinctIds.map((id) => id.toString()));

    let movieIdsScreeningInCity = [];
    if (city && city !== "All") {
      const cityTheatres = await Theatre.find({
        city: new RegExp(`^${city.trim()}$`, "i"),
      }).select("_id");
      const theatreIds = cityTheatres.map((t) => t._id);
      const distinctIds = await Show.distinct("movie", {
        theatre: { $in: theatreIds },
        showTime: { $gte: new Date() },
      });
      movieIdsScreeningInCity = distinctIds.map((id) => id.toString());
    }

    // Enrich with computed status and city-availability
    let enriched = movies.map((m) => {
      const obj = m.toObject();
      const titleKey = String(obj.title || obj.movieName || "").toLowerCase().trim();
      const meta = MOVIE_TMDB_MAP[titleKey];
      if (meta) {
        if (!obj.tmdbId) obj.tmdbId = meta.tmdbId;
        if (!obj.poster || obj.poster.includes("w500")) obj.poster = meta.poster;
      }
      if (obj.tmdbId && fs.existsSync(path.join(POSTER_DIR, `${obj.tmdbId}.jpg`))) {
        obj.poster = `/posters/${obj.tmdbId}.jpg`;
      }
      const hasShowsAnywhere = activeMovieIdSet.has(m._id.toString());
      const hasShowsInCity =
        city && city !== "All"
          ? movieIdsScreeningInCity.includes(m._id.toString())
          : hasShowsAnywhere;
      obj.isScreeningInCity = hasShowsInCity;
      obj.hasActiveShows = hasShowsAnywhere;
      obj.selectedCity = city || "All";
      obj.computedStatus = resolveMovieStatus(m, hasShowsAnywhere);

      // Determine formats
      const genres = (obj.genres || obj.genre || []).map((g) => String(g).toLowerCase());
      if (
        genres.includes("action") ||
        genres.includes("sci-fi") ||
        genres.includes("adventure") ||
        titleKey.includes("avatar") ||
        titleKey.includes("avengers") ||
        titleKey.includes("mission") ||
        titleKey.includes("dune") ||
        titleKey.includes("kalki")
      ) {
        obj.formats = ["2D", "3D", "IMAX", "4DX", "Dolby Atmos"];
      } else if (genres.includes("animation")) {
        obj.formats = ["2D", "3D", "Dolby Atmos"];
      } else {
        obj.formats = ["2D", "Dolby Atmos"];
      }

      return obj;
    });

    if (nowShowingInCity === "true" && city && city !== "All") {
      enriched = enriched.filter((m) => m.isScreeningInCity && m.computedStatus === "Now Showing");
    }

    if (format && format !== "All") {
      enriched = enriched.filter(
        (m) =>
          Array.isArray(m.formats) &&
          m.formats.some((f) => f.toLowerCase() === format.toLowerCase())
      );
    }

    if (req.query.activeOnly === "true") {
      enriched = enriched.filter((m) => m.computedStatus !== "Ended");
    }

    // Rank search results if search query provided: exact title first, startsWith second, rating desc
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      enriched.sort((a, b) => {
        const titleA = String(a.title || a.movieName || "").toLowerCase();
        const titleB = String(b.title || b.movieName || "").toLowerCase();
        const exactA = titleA === q ? 1 : 0;
        const exactB = titleB === q ? 1 : 0;
        if (exactA !== exactB) return exactB - exactA;

        const startsA = titleA.startsWith(q) ? 1 : 0;
        const startsB = titleB.startsWith(q) ? 1 : 0;
        if (startsA !== startsB) return startsB - startsA;

        return (Number(b.rating) || 0) - (Number(a.rating) || 0);
      });
    }

    if (status && status !== "All") {
      let targetStatus = status.toLowerCase().trim();
      if (targetStatus === "now_playing" || targetStatus === "now_showing" || targetStatus === "now showing") {
        targetStatus = "now showing";
      } else if (targetStatus === "advance_booking" || targetStatus === "advance booking") {
        targetStatus = "advance booking";
      } else if (targetStatus === "upcoming" || targetStatus === "coming_soon" || targetStatus === "coming soon") {
        targetStatus = "coming soon";
      } else if (targetStatus === "ended" || targetStatus === "concluded" || targetStatus === "closed") {
        targetStatus = "ended";
      }

      let filteredByStatus = enriched.filter((m) => m.computedStatus.toLowerCase() === targetStatus);
      if (city && city !== "All" && targetStatus === "now showing") {
        filteredByStatus = filteredByStatus.filter((m) => m.isScreeningInCity);
      }
      return res.json(filteredByStatus);
    }

    res.json(enriched);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single movie by ID
// @route   GET /api/movies/:id
// @access  Public
const getMovieById = async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ message: "Database temporarily unavailable" });
    }
    const movie = await Movie.findById(req.params.id);
    if (!movie) return res.status(404).json({ message: "Movie not found" });

    // Check if movie has active scheduled shows
    const activeShowsCount = await Show.countDocuments({
      movie: movie._id,
      showTime: { $gte: new Date() },
    });

    const obj = movie.toObject();
    const titleKey = String(obj.title || obj.movieName || "").toLowerCase().trim();
    const meta = MOVIE_TMDB_MAP[titleKey];
    if (meta) {
      if (!obj.tmdbId) obj.tmdbId = meta.tmdbId;
      if (!obj.poster || obj.poster.includes("w500")) obj.poster = meta.poster;
    }
    if (obj.tmdbId && fs.existsSync(path.join(POSTER_DIR, `${obj.tmdbId}.jpg`))) {
      obj.poster = `/posters/${obj.tmdbId}.jpg`;
    }
    obj.computedStatus = resolveMovieStatus(movie, activeShowsCount > 0);
    obj.activeShowsCount = activeShowsCount;

    res.json(obj);
  } catch (error) {
    res.status(400).json({ message: "Invalid movie ID" });
  }
};

// Sanitize image paths and strings on movie mutation
const sanitizeMovieData = (data) => {
  const sanitized = { ...data };
  if (sanitized.poster && typeof sanitized.poster === "string") {
    let p = sanitized.poster.trim();
    if (p.startsWith("http://")) p = "https://" + p.slice(7);
    sanitized.poster = p;
  }
  if (sanitized.backdrop && typeof sanitized.backdrop === "string") {
    let b = sanitized.backdrop.trim();
    if (b.startsWith("http://")) b = "https://" + b.slice(7);
    sanitized.backdrop = b;
  }
  return sanitized;
};

// @desc    Create a new movie
// @route   POST /api/movies
// @access  Private/Admin
const createMovie = async (req, res) => {
  try {
    const payload = sanitizeMovieData(req.body);
    const movie = await Movie.create(payload);
    res.status(201).json(movie);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Update a movie
// @route   PUT /api/movies/:id
// @access  Private/Admin
const updateMovie = async (req, res) => {
  try {
    const payload = sanitizeMovieData(req.body);
    const movie = await Movie.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true,
    });
    if (!movie) return res.status(404).json({ message: "Movie not found" });
    res.json(movie);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Delete a movie
// @route   DELETE /api/movies/:id
// @access  Private/Admin
const deleteMovie = async (req, res) => {
  try {
    const movie = await Movie.findByIdAndDelete(req.params.id);
    if (!movie) return res.status(404).json({ message: "Movie not found" });

    // Also delete associated shows for this movie
    await Show.deleteMany({ movie: req.params.id });

    res.json({ message: "Movie and related shows deleted successfully" });
  } catch (error) {
    res.status(400).json({ message: "Invalid movie ID" });
  }
};

// In-memory cache for proxied images (LRU bounded)
const imageCache = new Map();
const MAX_CACHE_ITEMS = 250;

// @desc    Proxy movie images to bypass ISP blocks, mixed-content, and CORS issues
// @route   GET /api/movies/image-proxy
// @access  Public
const proxyImage = async (req, res) => {
  try {
    const { url, path: tmdbPath, id } = req.query;

    // 1. If TMDB id is provided, check local public posters directory first
    if (id) {
      const localFile = path.join(__dirname, "..", "..", "client", "public", "posters", `${id}.jpg`);
      if (fs.existsSync(localFile)) {
        res.set("Cache-Control", "public, max-age=604800, immutable");
        res.set("Content-Type", "image/jpeg");
        return fs.createReadStream(localFile).pipe(res);
      }
    }

    // 2. Resolve target URL
    let targetUrl = "";
    if (url) {
      targetUrl = decodeURIComponent(url);
    } else if (tmdbPath) {
      const cleanPath = tmdbPath.startsWith("/") ? tmdbPath : `/${tmdbPath}`;
      targetUrl = `https://image.tmdb.org/t/p/w500${cleanPath}`;
    }

    if (!targetUrl) {
      return res.status(400).json({ message: "Image url, path, or id is required" });
    }

    // Handle local /posters/ path directly
    if (targetUrl.startsWith("/posters/")) {
      const filename = path.basename(targetUrl);
      const localFile = path.join(__dirname, "..", "..", "client", "public", "posters", filename);
      if (fs.existsSync(localFile)) {
        res.set("Cache-Control", "public, max-age=604800, immutable");
        res.set("Content-Type", "image/jpeg");
        return fs.createReadStream(localFile).pipe(res);
      }
    }

    // Check in-memory cache
    if (imageCache.has(targetUrl)) {
      const { buffer, contentType } = imageCache.get(targetUrl);
      res.set("Cache-Control", "public, max-age=604800, immutable");
      res.set("Content-Type", contentType);
      return res.send(buffer);
    }

    // Verify host is TMDB or valid image host
    const parsed = new URL(targetUrl);
    const allowed = ["image.tmdb.org", "api.themoviedb.org", "themoviedb.org", "images.unsplash.com"];
    if (!allowed.some((h) => parsed.hostname.endsWith(h))) {
      return res.status(403).json({ message: "Host not allowed for proxying" });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Screenly/2.0",
        Accept: "image/webp,image/apng,image/*,*/*;q=0.8",
      },
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      return res.status(response.status).json({ message: `Remote image fetch returned ${response.status}` });
    }

    const contentType = response.headers.get("content-type") || "image/jpeg";
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Store in cache
    if (imageCache.size >= MAX_CACHE_ITEMS) {
      const firstKey = imageCache.keys().next().value;
      imageCache.delete(firstKey);
    }
    imageCache.set(targetUrl, { buffer, contentType });

    res.set("Cache-Control", "public, max-age=604800, immutable");
    res.set("Content-Type", contentType);
    res.send(buffer);
  } catch (err) {
    res.status(502).json({ message: "Failed to proxy image", error: err.message });
  }
};

module.exports = {
  getMovies,
  getMovieById,
  createMovie,
  updateMovie,
  deleteMovie,
  resolveMovieStatus,
  proxyImage,
};
