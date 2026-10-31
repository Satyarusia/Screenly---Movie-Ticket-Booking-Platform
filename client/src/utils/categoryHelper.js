// client/src/utils/categoryHelper.js

export const CATEGORY_DEFINITIONS = [
  { id: "trending", label: "Trending Now", icon: "fa-solid fa-fire text-danger" },
  { id: "now_showing", label: "Now Showing", icon: "fa-solid fa-film text-danger" },
  { id: "advance_booking", label: "Advance Booking", icon: "fa-solid fa-bolt text-warning" },
  { id: "coming_soon", label: "Coming Soon", icon: "fa-solid fa-clock text-info" },
  { id: "bollywood", label: "Top Bollywood", icon: "fa-solid fa-clapperboard text-warning" },
  { id: "hollywood", label: "Top Hollywood", icon: "fa-solid fa-earth-americas text-primary" },
  { id: "south_indian", label: "Top South Indian", icon: "fa-solid fa-star text-warning" },
  { id: "family", label: "Family Movies", icon: "fa-solid fa-people-roof text-success" },
  { id: "action", label: "Action Movies", icon: "fa-solid fa-burst text-danger" },
  { id: "comedy", label: "Comedy Movies", icon: "fa-solid fa-face-laugh-beam text-warning" },
  { id: "romance", label: "Romance Movies", icon: "fa-solid fa-heart text-danger" },
  { id: "thriller_mystery", label: "Thriller & Mystery", icon: "fa-solid fa-magnifying-glass text-info" },
  { id: "horror", label: "Horror Movies", icon: "fa-solid fa-ghost text-light" },
  { id: "animation", label: "Animation", icon: "fa-solid fa-wand-magic-sparkles text-info" },
  { id: "highest_rated", label: "Highest Rated", icon: "fa-solid fa-star text-warning" },
  { id: "most_popular", label: "Most Popular", icon: "fa-solid fa-chart-line text-success" },
  { id: "recently_released", label: "Recently Released", icon: "fa-solid fa-sparkles text-warning" },
  { id: "award_winners", label: "Award Winners", icon: "fa-solid fa-trophy text-warning" },
];

/**
 * Computes discovery categories dynamically from real-world movie list.
 * Never hardcodes movie IDs. Automatically reacts to changes in selectedCity,
 * release dates, ratings, and theatrical statuses.
 */
export const buildDiscoveryCategories = (allMovies = [], selectedCity = "All") => {
  if (!Array.isArray(allMovies)) return [];

  const now = new Date();

  // Helper to extract lowercased genre strings
  const getGenresList = (m) => {
    const list = m.genres || m.genre || [];
    return (Array.isArray(list) ? list : [list]).map((g) => String(g).toLowerCase());
  };

  const getLang = (m) => (m.language || "").toLowerCase();

  const getStatus = (m) => {
    if (m.computedStatus) return m.computedStatus;
    const raw = String(m.theatricalStatus || m.status || "").toLowerCase();
    if (raw === "ended" || raw === "closed" || raw === "concluded") return "Ended";

    const release = m.releaseDate ? new Date(m.releaseDate) : null;

    // Future releases
    if (release && release > now) {
      if (m.isAdvanceBooking || raw === "advance_booking" || raw === "advance booking") {
        return "Advance Booking";
      }
      return "Coming Soon";
    }

    if (raw === "upcoming" || raw === "coming soon" || raw === "coming_soon") {
      return m.isAdvanceBooking ? "Advance Booking" : "Coming Soon";
    }

    if (m.isAdvanceBooking || raw === "advance_booking" || raw === "advance booking") {
      return "Advance Booking";
    }

    if (m.hasActiveShows) {
      return "Now Showing";
    }

    if (raw === "now showing" || raw === "now_playing" || raw === "now_showing") {
      return m.hasActiveShows ? "Now Showing" : "Ended";
    }

    return "Ended";
  };

  // Active-only pool (theatrical releases, advance bookings, upcoming)
  // Ensures ended movies never leak into main discovery/genre rows
  const activeMovies = allMovies.filter((m) => getStatus(m) !== "Ended");

  // 1. Trending Now (Active Theatrical Hits & Popular Sensations only)
  const trending = [...activeMovies]
    .filter((m) => {
      const pop = Number(m.popularity) || 0;
      const rating = Number(m.rating) || 0;
      return pop >= 75 || rating >= 7.5;
    })
    .sort((a, b) => (Number(b.popularity) || 0) - (Number(a.popularity) || 0));

  // 2. Now Showing (City-specific when city selected, all Indian cinema runs when no city chosen)
  const nowShowing = allMovies.filter((m) => {
    const st = getStatus(m);
    if (st !== "Now Showing" && st !== "Last Day") return false;
    if (selectedCity && selectedCity !== "All") {
      if (m.isScreeningInCity !== undefined) {
        return Boolean(m.isScreeningInCity);
      }
    }
    return true;
  });

  // 3. Advance Booking
  const advanceBooking = allMovies.filter((m) => {
    const st = getStatus(m);
    return st === "Advance Booking" || Boolean(m.isAdvanceBooking);
  });

  // 4. Coming Soon
  const comingSoon = allMovies.filter((m) => {
    const st = getStatus(m);
    return st === "Coming Soon" && !m.isAdvanceBooking;
  });

  // 5. Top Bollywood (Active Hindi Theatrical Releases)
  const topBollywood = activeMovies
    .filter((m) => getLang(m) === "hindi" || getLang(m) === "hi")
    .sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0));

  // 6. Top Hollywood (Active English Theatrical Releases)
  const topHollywood = activeMovies
    .filter((m) => getLang(m) === "english" || getLang(m) === "en")
    .sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0));

  // 7. Top South Indian (Active South Indian Theatrical Releases)
  const topSouthIndian = activeMovies
    .filter((m) =>
      ["telugu", "tamil", "malayalam", "kannada", "te", "ta", "ml", "kn"].includes(getLang(m))
    )
    .sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0));

  // 8. Family Movies (Active Theatrical)
  const familyMovies = activeMovies
    .filter((m) => {
      const cert = (m.certification || "").toUpperCase();
      const genres = getGenresList(m);
      const isKidFriendly = cert === "U" || genres.includes("family") || genres.includes("animation");
      return isKidFriendly && cert !== "A";
    })
    .sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0));

  // 9. Action Movies (Active Theatrical)
  const actionMovies = activeMovies
    .filter((m) => getGenresList(m).includes("action"))
    .sort((a, b) => (Number(b.popularity) || Number(b.rating) || 0) - (Number(a.popularity) || Number(a.rating) || 0));

  // 10. Comedy Movies (Active Theatrical)
  const comedyMovies = activeMovies
    .filter((m) => getGenresList(m).includes("comedy"))
    .sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0));

  // 11. Romance Movies (Active Theatrical)
  const romanceMovies = activeMovies
    .filter((m) => getGenresList(m).includes("romance"))
    .sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0));

  // 12. Thriller & Mystery (Active Theatrical)
  const thrillerMystery = activeMovies
    .filter((m) => {
      const g = getGenresList(m);
      return g.includes("thriller") || g.includes("mystery") || g.includes("crime");
    })
    .sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0));

  // 13. Horror Movies (Active Theatrical)
  const horrorMovies = activeMovies
    .filter((m) => getGenresList(m).includes("horror"))
    .sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0));

  // 14. Animation (Active Theatrical)
  const animationMovies = activeMovies
    .filter((m) => getGenresList(m).includes("animation"))
    .sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0));

  // 15. Highest Rated (All-time Classics & High Rated)
  const highestRated = [...allMovies]
    .filter((m) => Number(m.rating) >= 7.8)
    .sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0));

  // 16. Most Popular
  const mostPopular = [...allMovies].sort((a, b) => {
    const popA = Number(a.popularity) || (Number(a.rating) || 0) * 10;
    const popB = Number(b.popularity) || (Number(b.rating) || 0) * 10;
    return popB - popA;
  });

  // 17. Recently Released (Active releases)
  const recentlyReleased = [...activeMovies]
    .filter((m) => m.releaseDate && new Date(m.releaseDate) <= now)
    .sort((a, b) => new Date(b.releaseDate) - new Date(a.releaseDate));

  // 18. Award Winners
  const awardWinners = allMovies
    .filter((m) => Boolean(m.isAwardWinner) || (Array.isArray(m.awards) && m.awards.length > 0))
    .sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0));

  return [
    {
      id: "trending",
      title: "Trending Now",
      subtitle: "Current audience sensations and trending theatrical releases",
      badge: "Trending",
      badgeColor: "bg-danger",
      movies: trending,
    },
    {
      id: "now_showing",
      title: selectedCity && selectedCity !== "All" ? `Now Showing in ${selectedCity}` : "Now Showing in Theatres",
      subtitle: selectedCity && selectedCity !== "All"
        ? `Verified screenings currently running across cinema auditoriums in ${selectedCity}`
        : "Verified screenings currently running across cinema auditoriums",
      badge: "In Theatres",
      badgeColor: "bg-success",
      movies: nowShowing,
    },
    {
      id: "advance_booking",
      title: "Advance Booking",
      subtitle: "Reserve premiere seats ahead of official release dates before shows sell out",
      badge: "Advance Open",
      badgeColor: "bg-warning text-dark",
      movies: advanceBooking,
    },
    {
      id: "coming_soon",
      title: "Coming Soon",
      subtitle: "Officially announced upcoming theatrical releases; bookings open 3–5 days prior",
      badge: "Upcoming",
      badgeColor: "bg-info text-dark",
      movies: comingSoon,
    },
    {
      id: "bollywood",
      title: "Top Bollywood",
      subtitle: "Critically acclaimed Hindi blockbusters, mass entertainers & biopics",
      badge: "Bollywood",
      badgeColor: "bg-warning text-dark",
      movies: topBollywood,
    },
    {
      id: "hollywood",
      title: "Top Hollywood",
      subtitle: "Acclaimed English features, franchise blockbusters & visual spectacles",
      badge: "Hollywood",
      badgeColor: "bg-primary",
      movies: topHollywood,
    },
    {
      id: "south_indian",
      title: "Top South Indian",
      subtitle: "High-octane Telugu, Tamil, Malayalam & Kannada cinematic sensations",
      badge: "South Cinema",
      badgeColor: "bg-danger",
      movies: topSouthIndian,
    },
    {
      id: "family",
      title: "Family Movies",
      subtitle: "Wholesome, feel-good cinema and animated adventures suitable for all ages",
      badge: "Family",
      badgeColor: "bg-success",
      movies: familyMovies,
    },
    {
      id: "action",
      title: "Action Movies",
      subtitle: "Explosive stunts, relentless chases & high-stakes adrenaline cinema",
      badge: "Action",
      badgeColor: "bg-danger",
      movies: actionMovies,
    },
    {
      id: "comedy",
      title: "Comedy Movies",
      subtitle: "Hilarious capers, satirical gems & hearty laughing moments",
      badge: "Comedy",
      badgeColor: "bg-warning text-dark",
      movies: comedyMovies,
    },
    {
      id: "romance",
      title: "Romance Movies",
      subtitle: "Soul-stirring love stories, emotional bonds & grand romantic journeys",
      badge: "Romance",
      badgeColor: "bg-danger",
      movies: romanceMovies,
    },
    {
      id: "thriller_mystery",
      title: "Thriller & Mystery",
      subtitle: "Edge-of-the-seat tension, suspenseful revelations & investigative crime",
      badge: "Thriller",
      badgeColor: "bg-info text-dark",
      movies: thrillerMystery,
    },
    {
      id: "horror",
      title: "Horror Movies",
      subtitle: "Supernatural terror, hair-raising thrills & atmospheric folklore",
      badge: "Horror",
      badgeColor: "bg-dark text-light border border-secondary",
      movies: horrorMovies,
    },
    {
      id: "animation",
      title: "Animation",
      subtitle: "Award-winning animated storytelling, vibrant visuals & imaginative worlds",
      badge: "Animation",
      badgeColor: "bg-info text-dark",
      movies: animationMovies,
    },
    {
      id: "highest_rated",
      title: "Highest Rated",
      subtitle: "Audience-adored and critically praised features with ratings above 8.0/10",
      badge: "Top Rated",
      badgeColor: "bg-warning text-dark",
      movies: highestRated,
    },
    {
      id: "most_popular",
      title: "Most Popular",
      subtitle: "The most viewed, reviewed & requested films across the ticket booking network",
      badge: "Popular",
      badgeColor: "bg-success",
      movies: mostPopular,
    },
    {
      id: "recently_released",
      title: "Recently Released",
      subtitle: "The latest theatrical releases currently commanding the silver screen",
      badge: "Recent",
      badgeColor: "bg-primary",
      movies: recentlyReleased,
    },
    {
      id: "award_winners",
      title: "Award Winners",
      subtitle: "Verified Academy Award (Oscar), Filmfare & National Film Award champions",
      badge: "Award Winner",
      badgeColor: "bg-warning text-dark",
      movies: awardWinners,
    },
  ];
};

