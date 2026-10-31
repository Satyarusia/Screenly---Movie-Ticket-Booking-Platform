// server/services/tmdbSyncService.js
const fs = require("fs");
const path = require("path");
const Movie = require("../models/movieModel");
const Theatre = require("../models/theatreModel");
const Show = require("../models/showModel");

const TMDB_API_KEY = process.env.TMDB_API_KEY || "4320c6bb6bced39b12edc2b10de42798";
const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const POSTER_DIR = path.join(__dirname, "..", "..", "client", "public", "posters");

const ALL_CITIES_THEATRES = [
  // Mumbai
  {
    name: "PVR: Director's Cut",
    city: "Mumbai",
    chain: "PVR Cinemas",
    location: "Palladium Mall, Lower Parel",
    address: "Level 3, Palladium Mall, High Street Phoenix, Senapati Bapat Marg, Lower Parel, Mumbai - 400013",
    facilities: ["IMAX Laser", "Dolby Atmos 7.1", "VIP Recliner Seating", "Gourmet Food Court", "Valet Parking", "Wheelchair Accessible"],
    formats: ["2D", "3D", "IMAX 3D", "Dolby Cinema"],
    languages: ["Hindi", "English", "Marathi"],
    googleMapsUrl: "https://maps.google.com/?q=PVR+Directors+Cut+Palladium+Mumbai",
    screens: ["Screen 1 (Dolby Atmos 4K)", "Screen 2 (IMAX Laser)", "Audi 1 (VIP Recliner)"],
    seats: { lower: 30, middle: 40, balcony: 20 },
    prices: { lower: 200, middle: 320, balcony: 450 },
  },
  {
    name: "INOX Megaplex",
    city: "Mumbai",
    chain: "INOX",
    location: "Inorbit Mall, Malad West",
    address: "3rd Floor, Inorbit Mall, New Link Road, Malad West, Mumbai - 400064",
    facilities: ["MX4D Dynamic Motion", "ScreenX 270°", "Dolby Atmos", "Insignia Lounge", "Covered Parking"],
    formats: ["2D", "3D", "4DX", "ScreenX"],
    languages: ["Hindi", "English"],
    googleMapsUrl: "https://maps.google.com/?q=INOX+Megaplex+Inorbit+Mall+Malad+Mumbai",
    screens: ["Screen 1 (MX4D)", "Screen 2 (ScreenX)", "Screen 3 (Dolby Atmos)"],
    seats: { lower: 30, middle: 40, balcony: 20 },
    prices: { lower: 190, middle: 290, balcony: 420 },
  },
  {
    name: "Miraj Cinemas",
    city: "Mumbai",
    chain: "Miraj Cinemas",
    location: "Fun Republic, Andheri West",
    address: "4th Floor, Fun Republic Mall, New Link Road, Andheri West, Mumbai - 400053",
    facilities: ["Dolby Surround 7.1", "Push-back Plush Seats", "Cafeteria", "Parking"],
    formats: ["2D", "3D"],
    languages: ["Hindi", "English", "Marathi"],
    googleMapsUrl: "https://maps.google.com/?q=Miraj+Cinemas+Fun+Republic+Andheri+Mumbai",
    screens: ["Audi 1", "Audi 2"],
    seats: { lower: 30, middle: 40, balcony: 20 },
    prices: { lower: 160, middle: 250, balcony: 350 },
  },

  // Delhi-NCR
  {
    name: "PVR Superplex",
    city: "Delhi-NCR",
    chain: "PVR Cinemas",
    location: "Logix City Centre, Noida",
    address: "Level 3, Logix City Centre, Sector 32, Noida, Delhi-NCR - 201301",
    facilities: ["IMAX with Laser", "4DX Motion", "PlayHouse for Kids", "Gold Class Recliner", "Valet Parking"],
    formats: ["2D", "3D", "IMAX", "4DX"],
    languages: ["Hindi", "English", "Punjabi"],
    googleMapsUrl: "https://maps.google.com/?q=PVR+Superplex+Logix+City+Centre+Noida",
    screens: ["Audi 1 (IMAX)", "Audi 2 (4DX)", "Audi 3 (Gold Class)"],
    seats: { lower: 30, middle: 40, balcony: 20 },
    prices: { lower: 190, middle: 300, balcony: 420 },
  },
  {
    name: "Cinépolis VIP",
    city: "Delhi-NCR",
    chain: "Cinépolis",
    location: "DLF Avenue, Saket",
    address: "1st Floor, DLF Avenue, Press Enclave Marg, Saket District Centre, New Delhi - 110017",
    facilities: ["VIP Lounges", "Macro XE Screen", "Dolby Atmos 4K", "Gourmet Dine-in"],
    formats: ["2D", "3D", "Dolby Cinema"],
    languages: ["Hindi", "English"],
    googleMapsUrl: "https://maps.google.com/?q=Cinepolis+Saket+DLF+Avenue+Delhi",
    screens: ["Audi 1 (VIP)", "Audi 2 (Macro XE)"],
    seats: { lower: 30, middle: 40, balcony: 20 },
    prices: { lower: 210, middle: 340, balcony: 480 },
  },

  // Bengaluru
  {
    name: "PVR INOX",
    city: "Bengaluru",
    chain: "PVR Cinemas",
    location: "Forum South Mall, Kanakapura Road",
    address: "Level 4, Forum South Bangalore, Konanakunte Cross, Kanakapura Main Road, Bengaluru - 560062",
    facilities: ["IMAX 3D Laser", "LUXE Recliner Seats", "Dolby Atmos", "Valet Parking", "Wheelchair Ramp"],
    formats: ["2D", "3D", "IMAX 3D", "Dolby Cinema"],
    languages: ["Kannada", "Hindi", "English", "Telugu", "Tamil"],
    googleMapsUrl: "https://maps.google.com/?q=PVR+Forum+South+Bengaluru",
    screens: ["Audi 1 (IMAX Laser)", "Audi 2 (LUXE)", "Audi 3 (Dolby Atmos)"],
    seats: { lower: 30, middle: 40, balcony: 20 },
    prices: { lower: 180, middle: 280, balcony: 400 },
  },
  {
    name: "Cinépolis",
    city: "Bengaluru",
    chain: "Cinépolis",
    location: "Nexus Shantiniketan, Whitefield",
    address: "Level 3, Nexus Shantiniketan, Whitefield Main Road, Bengaluru - 560067",
    facilities: ["Dolby 7.1", "VIP Recliners", "Coffee & Snack Bar", "Ample Parking"],
    formats: ["2D", "3D", "4DX"],
    languages: ["Kannada", "English", "Hindi", "Telugu"],
    googleMapsUrl: "https://maps.google.com/?q=Cinepolis+Nexus+Shantiniketan+Bangalore",
    screens: ["Audi 1 (4DX)", "Audi 2 (Standard)"],
    seats: { lower: 30, middle: 40, balcony: 20 },
    prices: { lower: 170, middle: 260, balcony: 380 },
  },

  // Indore
  {
    name: "PVR Cinemas",
    city: "Indore",
    chain: "PVR Cinemas",
    location: "Treasure Island Mall, MG Road",
    address: "4th Floor, Treasure Island Mall, 11 MG Road, South Tukoganj, Indore - 452001",
    facilities: ["Dolby 7.1 Sound", "Premium Recliner", "Food Court", "Covered Parking", "Wheelchair Ramp"],
    formats: ["2D", "3D"],
    languages: ["Hindi", "English"],
    googleMapsUrl: "https://maps.google.com/?q=PVR+Treasure+Island+Mall+Indore",
    screens: ["Audi 1", "Audi 2", "Audi 3"],
    seats: { lower: 30, middle: 40, balcony: 20 },
    prices: { lower: 150, middle: 240, balcony: 350 },
  },
  {
    name: "INOX Megaplex",
    city: "Indore",
    chain: "INOX",
    location: "C21 Mall, AB Road",
    address: "3rd Floor, C21 Mall, Scheme No 54, AB Road, Indore - 452010",
    facilities: ["IMAX Screen", "Insignia VIP Lounge", "Dolby Atmos", "Valet Parking"],
    formats: ["2D", "3D", "IMAX 3D"],
    languages: ["Hindi", "English"],
    googleMapsUrl: "https://maps.google.com/?q=INOX+C21+Mall+Indore",
    screens: ["Audi 1 (IMAX)", "Audi 2 (Insignia VIP)", "Audi 3 (Dolby Atmos)"],
    seats: { lower: 30, middle: 40, balcony: 20 },
    prices: { lower: 160, middle: 250, balcony: 360 },
  },

  // Bhopal
  {
    name: "Cinépolis",
    city: "Bhopal",
    chain: "Cinépolis",
    location: "DB City Mall, Arera Hills",
    address: "Level 3, DB City Mall, Arera Hills, Hoshangabad Road, Bhopal - 462011",
    facilities: ["VIP Screens", "RealD 3D", "Dolby Atmos 4K", "Multi-cuisine Food Court", "Covered Parking"],
    formats: ["2D", "3D", "Dolby Cinema"],
    languages: ["Hindi", "English"],
    googleMapsUrl: "https://maps.google.com/?q=Cinepolis+DB+City+Mall+Bhopal",
    screens: ["Audi 1 (VIP Laser)", "Audi 2 (RealD 3D)", "Audi 3 (Dolby Atmos)"],
    seats: { lower: 30, middle: 40, balcony: 20 },
    prices: { lower: 150, middle: 240, balcony: 340 },
  },
  {
    name: "Mukta A2 Cinemas",
    city: "Bhopal",
    chain: "Mukta A2",
    location: "Top N Town Mall, Malviya Nagar",
    address: "Top N Town Mall, Malviya Nagar, New Market, Bhopal - 462003",
    facilities: ["3D Digital Projection", "Comfort Rocker Seats", "Cafeteria", "Parking"],
    formats: ["2D", "3D"],
    languages: ["Hindi", "English"],
    googleMapsUrl: "https://maps.google.com/?q=Mukta+A2+Cinemas+Bhopal",
    screens: ["Audi 1", "Audi 2"],
    seats: { lower: 30, middle: 40, balcony: 20 },
    prices: { lower: 140, middle: 220, balcony: 300 },
  },

  // Hyderabad
  {
    name: "PVR INOX",
    city: "Hyderabad",
    chain: "PVR Cinemas",
    location: "Nexus Mall, Kukatpally",
    address: "Level 4, Nexus Hyderabad Mall, Phase 6, KPHB Colony, Kukatpally, Hyderabad - 500072",
    facilities: ["IMAX with Laser", "4DX Dynamic Motion", "Dolby Atmos", "Wheelchair Accessible", "Valet Parking"],
    formats: ["2D", "3D", "IMAX 3D", "4DX"],
    languages: ["Telugu", "Hindi", "English"],
    googleMapsUrl: "https://maps.google.com/?q=PVR+Nexus+Mall+Kukatpally+Hyderabad",
    screens: ["Audi 1 (IMAX)", "Audi 2 (4DX)", "Audi 3 (Dolby Atmos)"],
    seats: { lower: 30, middle: 40, balcony: 20 },
    prices: { lower: 180, middle: 290, balcony: 420 },
  },
  {
    name: "Miraj Cinemas",
    city: "Hyderabad",
    chain: "Miraj Cinemas",
    location: "Shalini Shivani Theatre, Dilsukhnagar",
    address: "Dilsukhnagar Main Road, Kamala Nagar, Hyderabad - 500060",
    facilities: ["4K RGB Laser", "Dolby Atmos 64 Channel", "Recliners", "Snack Bar"],
    formats: ["2D", "3D"],
    languages: ["Telugu", "Hindi"],
    googleMapsUrl: "https://maps.google.com/?q=Miraj+Cinemas+Shalini+Shivani+Hyderabad",
    screens: ["Audi 1 (4K Laser)", "Audi 2 (Dolby)"],
    seats: { lower: 30, middle: 40, balcony: 20 },
    prices: { lower: 150, middle: 230, balcony: 320 },
  },

  // Pune
  {
    name: "PVR Cinemas",
    city: "Pune",
    chain: "PVR Cinemas",
    location: "The Pavilion Mall, Shivajinagar",
    address: "Level 4, The Pavilion Mall, Senapati Bapat Road, Shivajinagar, Pune - 411016",
    facilities: ["IMAX 3D", "Dolby Atmos", "PVR P[XL]", "Gold Lounge", "Valet Parking"],
    formats: ["2D", "3D", "IMAX", "Dolby Cinema"],
    languages: ["Marathi", "Hindi", "English"],
    googleMapsUrl: "https://maps.google.com/?q=PVR+Pavilion+Mall+Pune",
    screens: ["Audi 1 (IMAX)", "Audi 2 (P[XL])", "Audi 3 (Gold Lounge)"],
    seats: { lower: 30, middle: 40, balcony: 20 },
    prices: { lower: 180, middle: 280, balcony: 400 },
  },
  {
    name: "Cinépolis",
    city: "Pune",
    chain: "Cinépolis",
    location: "Seasons Mall, Magarpatta City",
    address: "Level 3, Seasons Mall, Magarpatta City, Hadapsar, Pune - 411028",
    facilities: ["VIP Screens", "4DX Auditorium", "Dolby 7.1", "Multi-cuisine Food Court"],
    formats: ["2D", "3D", "4DX"],
    languages: ["Marathi", "Hindi", "English"],
    googleMapsUrl: "https://maps.google.com/?q=Cinepolis+Seasons+Mall+Pune",
    screens: ["Audi 1 (VIP)", "Audi 2 (4DX)"],
    seats: { lower: 30, middle: 40, balcony: 20 },
    prices: { lower: 170, middle: 270, balcony: 390 },
  },
];

const MOVIE_TMDB_MAP = {
  "nayi naveli": { tmdbId: 1654581, poster: "/posters/1654581.jpg", backdrop: "/posters/1654581.jpg" },
  "nayyi navelli": { tmdbId: 1654581, poster: "/posters/1654581.jpg", backdrop: "/posters/1654581.jpg" },
  "prahaar: the untold story of ujjwal nikam": { tmdbId: 1081010, poster: "/posters/1081010.jpg", backdrop: "/posters/1081010.jpg" },
  "prahar: the untold story of ujjwal": { tmdbId: 1081010, poster: "/posters/1081010.jpg", backdrop: "/posters/1081010.jpg" },
  "prahaar": { tmdbId: 1081010, poster: "/posters/1081010.jpg", backdrop: "/posters/1081010.jpg" },
  "drishyam: the conclusion": { tmdbId: 1269325, poster: "/posters/1269325.jpg", backdrop: "/posters/1269325.jpg" },
  "clayface": { tmdbId: 1400940, poster: "/posters/1400940.jpg", backdrop: "/posters/1400940.jpg" },
  "udta teer": { tmdbId: 1375156, poster: "/posters/1375156.jpg", backdrop: "/posters/1375156.jpg" },
  "the paradise": { tmdbId: 1376856, poster: "/posters/1376856.jpg", backdrop: "/posters/1376856.jpg" },
  "street fighter": { tmdbId: 1153576, poster: "/posters/1153576.jpg", backdrop: "/posters/1153576.jpg" },
  "baththa": { tmdbId: 1515692, poster: "/posters/1515692.jpg", backdrop: "/posters/1515692.jpg" },
  "runner": { tmdbId: 1377237, poster: "/posters/1377237.jpg", backdrop: "/posters/1377237.jpg" },
  "ramayana: rise of a legend": { tmdbId: 656908, poster: "/posters/656908.jpg", backdrop: "/posters/656908.jpg" },
  "mission: impossible - the final reckoning": { tmdbId: 575265, poster: "/posters/575265.jpg", backdrop: "/posters/575265.jpg" },
  "moon walk": { tmdbId: 1306500, poster: "/posters/1306500.jpg", backdrop: "/posters/1306500.jpg" },
  "avatar: fire and ash": { tmdbId: 83533, poster: "/posters/83533.jpg", backdrop: "/posters/83533.jpg" },
  "mookuthi amman 2": { tmdbId: 1327835, poster: "/posters/1327835.jpg", backdrop: "/posters/1327835.jpg" },
  "ghost soldier": { tmdbId: 1562642, poster: "/posters/1562642.jpg", backdrop: "/posters/1562642.jpg" },
  "singham again": { tmdbId: 1014214, poster: "/posters/1014214.jpg", backdrop: "/posters/1014214.jpg" },
  "avengers: doomsday": { tmdbId: 1003596, poster: "/posters/1003596.jpg", backdrop: "/posters/1003596.jpg" },
  "dune: part three": { tmdbId: 1170608, poster: "/posters/1170608.jpg", backdrop: "/posters/1170608.jpg" },
  "avengers: secret wars": { tmdbId: 1003598, poster: "/posters/1003598.jpg", backdrop: "/posters/1003598.jpg" },
  "narnia: the magician's nephew": { tmdbId: 1147572, poster: "/posters/1147572.jpg", backdrop: "/posters/1147572.jpg" },
  "12th fail": { tmdbId: 1163258, poster: "/posters/1163258.jpg", backdrop: "/posters/1163258.jpg" },
  "stree 2": { tmdbId: 1112426, poster: "/posters/1112426.jpg", backdrop: "/posters/1112426.jpg" },
  "jawan": { tmdbId: 872906, poster: "/posters/872906.jpg", backdrop: "/posters/872906.jpg" },
  "animal": { tmdbId: 781732, poster: "/posters/781732.jpg", backdrop: "/posters/781732.jpg" },
  "fighter": { tmdbId: 784651, poster: "/posters/784651.jpg", backdrop: "/posters/784651.jpg" },
  "rocky aur rani kii prem kahaani": { tmdbId: 848116, poster: "/posters/848116.jpg", backdrop: "/posters/848116.jpg" },
  "dangal": { tmdbId: 360814, poster: "/posters/360814.jpg", backdrop: "/posters/360814.jpg" },
  "3 idiots": { tmdbId: 20453, poster: "/posters/20453.jpg", backdrop: "/posters/20453.jpg" },
  "oppenheimer": { tmdbId: 872585, poster: "/posters/872585.jpg", backdrop: "/posters/872585.jpg" },
  "dune: part two": { tmdbId: 693134, poster: "/posters/693134.jpg", backdrop: "/posters/693134.jpg" },
  "interstellar": { tmdbId: 157336, poster: "/posters/157336.jpg", backdrop: "/posters/157336.jpg" },
  "the dark knight": { tmdbId: 155, poster: "/posters/155.jpg", backdrop: "/posters/155.jpg" },
  "inception": { tmdbId: 27205, poster: "/posters/27205.jpg", backdrop: "/posters/27205.jpg" },
  "inside out 2": { tmdbId: 1022789, poster: "/posters/1022789.jpg", backdrop: "/posters/1022789.jpg" },
  "kalki 2898 ad": { tmdbId: 792307, poster: "/posters/792307.jpg", backdrop: "/posters/792307.jpg" },
  "rrr": { tmdbId: 579974, poster: "/posters/579974.jpg", backdrop: "/posters/579974.jpg" },
  "sita ramam": { tmdbId: 894803, poster: "/posters/894803.jpg", backdrop: "/posters/894803.jpg" },
  "manjummel boys": { tmdbId: 1069945, poster: "/posters/1069945.jpg", backdrop: "/posters/1069945.jpg" },
  "k.g.f: chapter 2": { tmdbId: 587412, poster: "/posters/587412.jpg", backdrop: "/posters/587412.jpg" },
  "pushpa: the rise": { tmdbId: 690957, poster: "/posters/690957.jpg", backdrop: "/posters/690957.jpg" },
};

const CANONICAL_MASTER_MOVIES = [
  // --- NOW SHOWING IN THEATRES ---
  {
    title: "Drishyam: The Conclusion",
    movieName: "Drishyam: The Conclusion",
    tmdbId: 1269325,
    genre: ["Thriller", "Drama", "Crime", "Mystery"],
    genres: ["Thriller", "Drama", "Crime", "Mystery"],
    language: "Hindi",
    duration: 154,
    runtime: 154,
    rating: 8.6,
    popularity: 96.8,
    certification: "U/A",
    cast: ["Ajay Devgn", "Tabu", "Akshaye Khanna", "Shriya Saran"],
    director: "Abhishek Pathak",
    releaseDate: new Date("2026-10-02"),
    theatricalStatus: "Now Showing",
    isAdvanceBooking: false,
    description: "Years after outsmarting the police, Vijay Salgaonkar's past resurfaces when new evidence threatens to expose his secret.",
    poster: "/posters/1269325.jpg",
    backdrop: "/posters/1269325.jpg",
  },
  {
    title: "Clayface",
    movieName: "Clayface",
    tmdbId: 1400940,
    genre: ["Action", "Sci-Fi", "Horror", "Thriller"],
    genres: ["Action", "Sci-Fi", "Horror", "Thriller"],
    language: "English",
    duration: 138,
    runtime: 138,
    rating: 7.5,
    popularity: 95.4,
    certification: "A",
    cast: ["Matt Hagen", "Bryan Cranston", "Rebecca Ferguson"],
    director: "Mike Flanagan",
    releaseDate: new Date("2026-10-23"),
    theatricalStatus: "Now Showing",
    isAdvanceBooking: false,
    description: "A Hollywood leading man seeking a cutting-edge facial reconstruction treatment finds himself spiraling down a destructive path of revenge in Gotham City.",
    poster: "/posters/1400940.jpg",
    backdrop: "/posters/1400940.jpg",
  },
  {
    title: "Udta Teer",
    movieName: "Udta Teer",
    tmdbId: 1375156,
    genre: ["Comedy", "Action", "Drama"],
    genres: ["Comedy", "Action", "Drama"],
    language: "Hindi",
    duration: 132,
    runtime: 132,
    rating: 7.4,
    popularity: 91.2,
    certification: "U/A",
    cast: ["Ayushmann Khurrana", "Jaideep Ahlawat", "Wamiqa Gabbi"],
    director: "Anirudh Iyer",
    releaseDate: new Date("2026-10-23"),
    theatricalStatus: "Now Showing",
    isAdvanceBooking: false,
    description: "An amnesiac undercover spy wakes up believing he is a high-ranking patriotic officer, setting off a hilarious chain of national security misadventures.",
    poster: "/posters/1375156.jpg",
    backdrop: "/posters/1375156.jpg",
  },
  {
    title: "The Paradise",
    movieName: "The Paradise",
    tmdbId: 1376856,
    genre: ["Action", "Drama", "History"],
    genres: ["Action", "Drama", "History"],
    language: "Telugu",
    duration: 156,
    runtime: 156,
    rating: 7.8,
    popularity: 89.5,
    certification: "U/A",
    cast: ["Nani", "Priyanka Mohan", "S.J. Suryah"],
    director: "Srikanth Odela",
    releaseDate: new Date("2026-09-23"),
    theatricalStatus: "Now Showing",
    isAdvanceBooking: false,
    description: "In 1980s Secunderabad, a marginalized community battles discrimination and fights for their rights under the guidance of a fierce young leader.",
    poster: "/posters/1376856.jpg",
    backdrop: "/posters/1376856.jpg",
  },
  {
    title: "Street Fighter",
    movieName: "Street Fighter",
    tmdbId: 1153576,
    genre: ["Action", "Fantasy", "Adventure"],
    genres: ["Action", "Fantasy", "Adventure"],
    language: "English",
    duration: 128,
    runtime: 128,
    rating: 7.2,
    popularity: 93.6,
    certification: "U/A",
    cast: ["Lewis Tan", "Joe Taslim", "Ludi Lin"],
    director: "Danny Philippou",
    releaseDate: new Date("2026-10-16"),
    theatricalStatus: "Now Showing",
    isAdvanceBooking: false,
    description: "Estranged martial artists Ryu and Ken Masters are thrown back into combat when the mysterious Chun-Li recruits them for the World Warrior Tournament.",
    poster: "/posters/1153576.jpg",
    backdrop: "/posters/1153576.jpg",
  },
  {
    title: "Nayi Naveli",
    movieName: "Nayi Naveli",
    tmdbId: 1654581,
    genre: ["Comedy", "Drama", "Fantasy", "Adventure"],
    genres: ["Comedy", "Drama", "Fantasy", "Adventure"],
    language: "Hindi",
    duration: 138,
    runtime: 138,
    rating: 7.8,
    popularity: 92.4,
    certification: "U/A",
    cast: ["Yami Gautam Dhar", "Anurag Thakur", "Adinath Kothare", "Sushmita Mukherjee", "Prateek Pachori"],
    director: "Aditya Sarpotdar",
    releaseDate: new Date("2026-10-16"),
    theatricalStatus: "Now Showing",
    isAdvanceBooking: false,
    description: "A new bride's arrival turns a turbulent household in Meerut into a picture of domestic harmony, until her brother-in-law grows convinced that his seemingly perfect sister-in-law is secretly a witch.",
    poster: "/posters/1654581.jpg",
    backdrop: "/posters/1654581.jpg",
  },
  {
    title: "Prahaar: The Untold Story of Ujjwal Nikam",
    movieName: "Prahaar: The Untold Story of Ujjwal Nikam",
    tmdbId: 1081010,
    genre: ["Crime", "Drama", "Biography"],
    genres: ["Crime", "Drama", "Biography"],
    language: "Hindi",
    duration: 141,
    runtime: 141,
    rating: 8.5,
    popularity: 92.0,
    certification: "U/A",
    cast: ["Rajkummar Rao", "Wamiqa Gabbi", "Jaideep Ahlawat", "Sikandar Kher", "Ashish Vidhyarthi"],
    director: "Umesh Shukla",
    releaseDate: new Date("2026-10-16"),
    theatricalStatus: "Now Showing",
    isAdvanceBooking: false,
    description: "Public prosecutor Ujjwal Nikam takes on one of the most high-profile criminal cases in India’s history, leading the prosecution in the trial of Ajmal Kasab following the 26/11 Mumbai terror attacks.",
    poster: "/posters/1081010.jpg",
    backdrop: "/posters/1081010.jpg",
  },
  {
    title: "Singham Again",
    movieName: "Singham Again",
    tmdbId: 1014214,
    genre: ["Action", "Crime", "Drama"],
    genres: ["Action", "Crime", "Drama"],
    language: "Hindi",
    duration: 155,
    runtime: 155,
    rating: 7.8,
    popularity: 94.5,
    certification: "U/A",
    cast: ["Ajay Devgn", "Kareena Kapoor Khan", "Ranveer Singh", "Akshay Kumar"],
    director: "Rohit Shetty",
    releaseDate: new Date("2026-10-18"),
    theatricalStatus: "Now Showing",
    isAdvanceBooking: false,
    description: "DCP Bajirao Singham returns in the biggest chapter of the Cop Universe.",
    poster: "/posters/1014214.jpg",
    backdrop: "/posters/1014214.jpg",
  },
  {
    title: "Baththa",
    movieName: "Baththa",
    tmdbId: 1515692,
    genre: ["Action", "Drama"],
    genres: ["Action", "Drama"],
    language: "Kannada",
    duration: 142,
    runtime: 142,
    rating: 7.9,
    popularity: 88.0,
    certification: "U/A",
    cast: ["Duniya Vijay", "Rachita Ram"],
    releaseDate: new Date("2026-10-01"),
    theatricalStatus: "Now Showing",
    isAdvanceBooking: false,
    description: "A fearless vigilante rises to protect his rural community against ruthless land grabbers.",
    poster: "/posters/1515692.jpg",
    backdrop: "/posters/1515692.jpg",
  },
  {
    title: "Runner",
    movieName: "Runner",
    tmdbId: 1377237,
    genre: ["Action", "Thriller"],
    genres: ["Action", "Thriller"],
    language: "Hindi",
    duration: 134,
    runtime: 134,
    rating: 7.6,
    popularity: 89.2,
    certification: "U/A",
    cast: ["Sunny Deol", "Ameesha Patel"],
    releaseDate: new Date("2026-09-07"),
    theatricalStatus: "Now Showing",
    isAdvanceBooking: false,
    description: "An elite courier gets entangled in an international syndicate chase across Mumbai.",
    poster: "/posters/1377237.jpg",
    backdrop: "/posters/1377237.jpg",
  },

  // --- ADVANCE BOOKING AVAILABLE ---
  {
    title: "Ghost Soldier",
    movieName: "Ghost Soldier",
    tmdbId: 1562642,
    genre: ["Action", "War", "Thriller"],
    genres: ["Action", "War", "Thriller"],
    language: "Hindi",
    duration: 145,
    runtime: 145,
    rating: 8.2,
    popularity: 91.5,
    certification: "U/A",
    cast: ["John Abraham", "Mrunal Thakur"],
    releaseDate: new Date("2026-11-04"),
    theatricalStatus: "Advance Booking",
    isAdvanceBooking: true,
    description: "Advance bookings are officially open! An elite commando unit embarks on a covert surgical strike deep behind enemy lines.",
    poster: "/posters/1562642.jpg",
    backdrop: "/posters/1562642.jpg",
  },
  {
    title: "Mookuthi Amman 2",
    movieName: "Mookuthi Amman 2",
    tmdbId: 1327835,
    genre: ["Comedy", "Fantasy", "Drama"],
    genres: ["Comedy", "Fantasy", "Drama"],
    language: "Tamil",
    duration: 140,
    runtime: 140,
    rating: 8.0,
    popularity: 91.0,
    certification: "U",
    cast: ["Nayanthara", "RJ Balaji"],
    director: "Sundar C.",
    releaseDate: new Date("2026-11-06"),
    theatricalStatus: "Advance Booking",
    isAdvanceBooking: true,
    description: "Advance bookings open! The goddess descends once again to guide an honest news anchor through modern social chaos.",
    poster: "/posters/1327835.jpg",
    backdrop: "/posters/1327835.jpg",
  },
  {
    title: "Mission: Impossible - The Final Reckoning",
    movieName: "Mission: Impossible - The Final Reckoning",
    tmdbId: 575265,
    genre: ["Action", "Thriller", "Adventure"],
    genres: ["Action", "Thriller", "Adventure"],
    language: "English",
    duration: 165,
    runtime: 165,
    rating: 8.8,
    popularity: 97.5,
    certification: "U/A",
    cast: ["Tom Cruise", "Hayley Atwell", "Ving Rhames", "Simon Pegg"],
    director: "Christopher McQuarrie",
    releaseDate: new Date("2026-11-10"),
    theatricalStatus: "Advance Booking",
    isAdvanceBooking: true,
    description: "Ethan Hunt and the IMF team face their most perilous mission yet. Reserve your premiere seats today.",
    poster: "/posters/575265.jpg",
    backdrop: "/posters/575265.jpg",
  },
  {
    title: "Moon Walk",
    movieName: "Moon Walk",
    tmdbId: 1306500,
    genre: ["Drama", "Music", "Comedy"],
    genres: ["Drama", "Music", "Comedy"],
    language: "Tamil",
    duration: 140,
    runtime: 140,
    rating: 8.1,
    popularity: 87.0,
    certification: "U/A",
    cast: ["Prabhu Deva", "AR Rahman"],
    releaseDate: new Date("2026-11-14"),
    theatricalStatus: "Advance Booking",
    isAdvanceBooking: true,
    description: "Advance tickets are now open for the musical dance sensation.",
    poster: "/posters/1306500.jpg",
    backdrop: "/posters/1306500.jpg",
  },
  {
    title: "Ramayana: Rise of a Legend",
    movieName: "Ramayana: Rise of a Legend",
    tmdbId: 656908,
    genre: ["Action", "Fantasy", "Adventure", "Drama"],
    genres: ["Action", "Fantasy", "Adventure", "Drama"],
    language: "Hindi",
    duration: 178,
    runtime: 178,
    rating: 9.3,
    popularity: 98.9,
    certification: "U/A",
    cast: ["Ranbir Kapoor", "Sai Pallavi", "Yash", "Sunny Deol"],
    director: "Nitesh Tiwari",
    releaseDate: new Date("2026-11-20"),
    theatricalStatus: "Advance Booking",
    isAdvanceBooking: true,
    description: "Advance bookings are officially open! An ancient epic unfolds across premier cinema screens.",
    poster: "/posters/656908.jpg",
    backdrop: "/posters/656908.jpg",
  },
  {
    title: "Avatar: Fire and Ash",
    movieName: "Avatar: Fire and Ash",
    tmdbId: 83533,
    genre: ["Sci-Fi", "Adventure", "Fantasy", "Action"],
    genres: ["Sci-Fi", "Adventure", "Fantasy", "Action"],
    language: "English",
    duration: 190,
    runtime: 190,
    rating: 8.9,
    popularity: 98.4,
    certification: "U/A",
    cast: ["Sam Worthington", "Zoe Saldana", "Sigourney Weaver"],
    director: "James Cameron",
    releaseDate: new Date("2026-12-19"),
    theatricalStatus: "Advance Booking",
    isAdvanceBooking: true,
    description: "Return to Pandora with James Cameron to discover the volcanic Ash People of the Na'vi. Advance bookings are officially open!",
    poster: "/posters/83533.jpg",
    backdrop: "/posters/83533.jpg",
  },

  // --- COMING SOON ---
  {
    title: "Avengers: Doomsday",
    movieName: "Avengers: Doomsday",
    tmdbId: 1003596,
    genre: ["Action", "Adventure", "Sci-Fi"],
    genres: ["Action", "Adventure", "Sci-Fi"],
    language: "English",
    duration: 170,
    runtime: 170,
    rating: 9.0,
    popularity: 98.0,
    certification: "U/A",
    cast: ["Robert Downey Jr.", "Pedro Pascal", "Vanessa Kirby"],
    director: "Anthony Russo, Joe Russo",
    releaseDate: new Date("2026-12-16"),
    theatricalStatus: "Coming Soon",
    isAdvanceBooking: false,
    description: "Doctor Doom unleashes chaos across realities as Earth's mightiest heroes regroup for the ultimate battle.",
    poster: "/posters/1003596.jpg",
    backdrop: "/posters/1003596.jpg",
  },
  {
    title: "Dune: Part Three",
    movieName: "Dune: Part Three",
    tmdbId: 1170608,
    genre: ["Sci-Fi", "Adventure", "Drama"],
    genres: ["Sci-Fi", "Adventure", "Drama"],
    language: "English",
    duration: 165,
    runtime: 165,
    rating: 8.8,
    popularity: 96.0,
    certification: "U/A",
    cast: ["Timothée Chalamet", "Zendaya", "Florence Pugh"],
    director: "Denis Villeneuve",
    releaseDate: new Date("2026-12-15"),
    theatricalStatus: "Coming Soon",
    isAdvanceBooking: false,
    description: "Paul Atreides faces the galactic consequences of his ascension to the imperial throne as the holy war consumes the cosmos.",
    poster: "/posters/1170608.jpg",
    backdrop: "/posters/1170608.jpg",
  },
  {
    title: "Avengers: Secret Wars",
    movieName: "Avengers: Secret Wars",
    tmdbId: 1003598,
    genre: ["Action", "Adventure", "Sci-Fi", "Fantasy"],
    genres: ["Action", "Adventure", "Sci-Fi", "Fantasy"],
    language: "English",
    duration: 185,
    runtime: 185,
    rating: 9.1,
    popularity: 99.0,
    certification: "U/A",
    cast: ["Robert Downey Jr.", "Chris Evans", "Tom Holland"],
    director: "Anthony Russo, Joe Russo",
    releaseDate: new Date("2027-05-07"),
    theatricalStatus: "Coming Soon",
    isAdvanceBooking: false,
    description: "The culmination of the Multiverse Saga. Premium IMAX recliner tickets will open closer to release.",
    poster: "/posters/1003598.jpg",
    backdrop: "/posters/1003598.jpg",
  },
  {
    title: "Narnia: The Magician's Nephew",
    movieName: "Narnia: The Magician's Nephew",
    tmdbId: 1147572,
    genre: ["Fantasy", "Adventure", "Family"],
    genres: ["Fantasy", "Adventure", "Family"],
    language: "English",
    duration: 145,
    runtime: 145,
    rating: 8.1,
    popularity: 90.0,
    certification: "U",
    cast: ["Louis Partridge", "Emma Mackey"],
    director: "Greta Gerwig",
    releaseDate: new Date("2027-02-10"),
    theatricalStatus: "Coming Soon",
    isAdvanceBooking: false,
    description: "Greta Gerwig brings the origins of Narnia and the creation of Aslan's realm to life in a grand fantasy epic.",
    poster: "/posters/1147572.jpg",
    backdrop: "/posters/1147572.jpg",
  },

  // --- ALL-TIME CLASSICS & LIBRARY (THEATRICAL STATUS: ENDED) ---
  {
    title: "Fighter",
    movieName: "Fighter",
    tmdbId: 784651,
    genre: ["Action", "Adventure", "Thriller"],
    genres: ["Action", "Adventure", "Thriller"],
    language: "Hindi",
    duration: 166,
    runtime: 166,
    rating: 7.9,
    popularity: 88.5,
    certification: "U/A",
    cast: ["Hrithik Roshan", "Deepika Padukone", "Anil Kapoor"],
    director: "Siddharth Anand",
    releaseDate: new Date("2024-01-25"),
    theatricalStatus: "Ended",
    isAdvanceBooking: false,
    description: "Top IAF aviators come together to form Air Dragons, facing mortal dangers while defending Indian airspace. Theatrical run concluded.",
    poster: "/posters/784651.jpg",
    backdrop: "https://image.tmdb.org/t/p/w1280/bQS43HSLZzMjZkcHJz49xUMt361.jpg",
  },
  {
    title: "Jawan",
    movieName: "Jawan",
    tmdbId: 872906,
    genre: ["Action", "Thriller"],
    genres: ["Action", "Thriller"],
    language: "Hindi",
    duration: 169,
    runtime: 169,
    rating: 8.4,
    popularity: 97.2,
    certification: "U/A",
    cast: ["Shah Rukh Khan", "Nayanthara", "Vijay Sethupathi", "Deepika Padukone"],
    director: "Atlee",
    releaseDate: new Date("2023-09-07"),
    theatricalStatus: "Ended",
    isAdvanceBooking: false,
    description: "A high-octane action thriller outlining the emotional journey of a man who is set out to rectify the wrongs in society. Theatrical run concluded.",
    poster: "/posters/872906.jpg",
    backdrop: "https://image.tmdb.org/t/p/w1280/4HodYYKEIsGOdinkGi2Ucz6X9i0.jpg",
  },
  {
    title: "Animal",
    movieName: "Animal",
    tmdbId: 781732,
    genre: ["Action", "Crime", "Drama"],
    genres: ["Action", "Crime", "Drama"],
    language: "Hindi",
    duration: 201,
    runtime: 201,
    rating: 8.1,
    popularity: 95.0,
    certification: "A",
    cast: ["Ranbir Kapoor", "Anil Kapoor", "Bobby Deol", "Rashmika Mandanna"],
    director: "Sandeep Reddy Vanga",
    releaseDate: new Date("2023-12-01"),
    theatricalStatus: "Ended",
    isAdvanceBooking: false,
    description: "A son undergoes an extraordinary transformation driven by an obsessive bond with his father. Theatrical run concluded.",
    poster: "/posters/781732.jpg",
    backdrop: "https://image.tmdb.org/t/p/w1280/ugS5xLBMqsp5Rfip8zY4Z3Y08.jpg",
  },
  {
    title: "Stree 2",
    movieName: "Stree 2",
    tmdbId: 1112426,
    genre: ["Comedy", "Horror"],
    genres: ["Comedy", "Horror"],
    language: "Hindi",
    duration: 147,
    runtime: 147,
    rating: 8.0,
    popularity: 96.0,
    certification: "U/A",
    cast: ["Rajkummar Rao", "Shraddha Kapoor", "Pankaj Tripathi"],
    director: "Amar Kaushik",
    releaseDate: new Date("2024-08-15"),
    theatricalStatus: "Ended",
    isAdvanceBooking: false,
    description: "The town of Chanderi is haunted once again, this time by a terrifying headless monster known as Sarkata. Theatrical run concluded.",
    poster: "https://image.tmdb.org/t/p/w780/nfnhwfUEFuSOxxf4jDdBlY6Lccw.jpg",
    backdrop: "https://image.tmdb.org/t/p/w1280/4fU0Hau4C0f1P6iFv1Xwz9y6p3G.jpg",
  },
  {
    title: "Inside Out 2",
    movieName: "Inside Out 2",
    tmdbId: 1022789,
    genre: ["Animation", "Family", "Comedy", "Adventure"],
    genres: ["Animation", "Family", "Comedy", "Adventure"],
    language: "English",
    duration: 96,
    runtime: 96,
    rating: 8.0,
    popularity: 97.0,
    certification: "U",
    cast: ["Amy Poehler", "Maya Hawke", "Kensington Tallman"],
    director: "Kelsey Mann",
    releaseDate: new Date("2024-06-14"),
    theatricalStatus: "Ended",
    isAdvanceBooking: false,
    description: "Teenager Riley's mind headquarters undergoes a sudden demolition to make room for unexpected new Emotions. Theatrical run concluded.",
    poster: "https://image.tmdb.org/t/p/w780/vpnVM9B6NMmQpWeZvzLvDESb2QY.jpg",
    backdrop: "https://image.tmdb.org/t/p/w1280/stKGOm8wqGGOFfv09wqEGvugVO8.jpg",
  },
  {
    title: "Kalki 2898 AD",
    movieName: "Kalki 2898 AD",
    tmdbId: 792307,
    genre: ["Action", "Sci-Fi", "Fantasy"],
    genres: ["Action", "Sci-Fi", "Fantasy"],
    language: "Telugu",
    duration: 181,
    runtime: 181,
    rating: 7.6,
    popularity: 95.8,
    certification: "U/A",
    cast: ["Prabhas", "Amitabh Bachchan", "Kamal Haasan", "Deepika Padukone"],
    director: "Nag Ashwin",
    releaseDate: new Date("2024-06-27"),
    theatricalStatus: "Ended",
    isAdvanceBooking: false,
    description: "A modern avatar of the Hindu god Vishnu descends to Earth in a dystopian future. Theatrical run concluded.",
    poster: "https://image.tmdb.org/t/p/w780/rstcAnBeCkxNQjNp3YXrF6IP1tW.jpg",
    backdrop: "https://image.tmdb.org/t/p/w1280/2RVcJbWFmICRDsEjRI8oqBTYI52.jpg",
  },
  {
    title: "Dune: Part Two",
    movieName: "Dune: Part Two",
    tmdbId: 693134,
    genre: ["Sci-Fi", "Adventure"],
    genres: ["Sci-Fi", "Adventure"],
    language: "English",
    duration: 166,
    runtime: 166,
    rating: 8.5,
    popularity: 96.5,
    certification: "U/A",
    cast: ["Timothée Chalamet", "Zendaya", "Rebecca Ferguson"],
    director: "Denis Villeneuve",
    releaseDate: new Date("2024-03-01"),
    theatricalStatus: "Ended",
    isAdvanceBooking: false,
    description: "Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family. Theatrical run concluded.",
    poster: "https://image.tmdb.org/t/p/w780/8b8R8l88Qje9dn9OE8PY05Nxl1X.jpg",
    backdrop: "https://image.tmdb.org/t/p/w1280/xOMo8BRK7PfcJv9JCnx7s5hj0xO.jpg",
  },
  {
    title: "12th Fail",
    movieName: "12th Fail",
    tmdbId: 1163258,
    genre: ["Drama", "Biography"],
    genres: ["Drama", "Biography"],
    language: "Hindi",
    duration: 147,
    runtime: 147,
    rating: 9.0,
    popularity: 94.0,
    certification: "U/A",
    cast: ["Vikrant Massey", "Medha Shankr", "Anant Joshi"],
    director: "Vidhu Vinod Chopra",
    releaseDate: new Date("2023-10-27"),
    theatricalStatus: "Ended",
    isAdvanceBooking: false,
    description: "Based on the true story of IPS officer Manoj Kumar Sharma who defied extreme poverty to crack the UPSC exam.",
    poster: "https://image.tmdb.org/t/p/w780/eebUPRI4Z5e1Z7Hev4JZAwMIFkX.jpg",
    backdrop: "https://image.tmdb.org/t/p/w1280/e31K6g7U3s4D4P9lP2q8r5T1w5o.jpg",
  },

  // --- ALL-TIME CLASSICS & LIBRARY (THEATRICAL STATUS: ENDED) ---
  {
    title: "The Dark Knight",
    movieName: "The Dark Knight",
    tmdbId: 155,
    genre: ["Action", "Crime", "Drama"],
    genres: ["Action", "Crime", "Drama"],
    language: "English",
    duration: 152,
    runtime: 152,
    rating: 9.0,
    popularity: 98.5,
    isAwardWinner: true,
    certification: "U/A",
    cast: ["Christian Bale", "Heath Ledger", "Aaron Eckhart", "Michael Caine"],
    director: "Christopher Nolan",
    releaseDate: new Date("2008-07-18"),
    theatricalStatus: "Ended",
    isAdvanceBooking: false,
    description: "Batman raises the stakes in his war on crime with the help of Lt. Jim Gordon and DA Harvey Dent.",
    poster: "https://image.tmdb.org/t/p/w780/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
    backdrop: "https://image.tmdb.org/t/p/w1280/nMKdUUepR0i5zn0y1T4CsSB5chy.jpg",
  },
  {
    title: "Inception",
    movieName: "Inception",
    tmdbId: 27205,
    genre: ["Action", "Sci-Fi", "Adventure"],
    genres: ["Action", "Sci-Fi", "Adventure"],
    language: "English",
    duration: 148,
    runtime: 148,
    rating: 8.8,
    popularity: 97.0,
    isAwardWinner: true,
    certification: "U/A",
    cast: ["Leonardo DiCaprio", "Joseph Gordon-Levitt", "Elliot Page", "Tom Hardy"],
    director: "Christopher Nolan",
    releaseDate: new Date("2010-07-16"),
    theatricalStatus: "Ended",
    isAdvanceBooking: false,
    description: "A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea.",
    poster: "https://image.tmdb.org/t/p/w780/qmDpIHrmpJINaRKAfWQfftjCdyi.jpg",
    backdrop: "https://image.tmdb.org/t/p/w1280/s3TBrRGB1iav7gFOCNx3H31MoES.jpg",
  },
  {
    title: "Interstellar",
    movieName: "Interstellar",
    tmdbId: 157336,
    genre: ["Sci-Fi", "Drama", "Adventure"],
    genres: ["Sci-Fi", "Drama", "Adventure"],
    language: "English",
    duration: 169,
    runtime: 169,
    rating: 8.7,
    popularity: 98.0,
    isAwardWinner: true,
    certification: "U/A",
    cast: ["Matthew McConaughey", "Anne Hathaway", "Jessica Chastain"],
    director: "Christopher Nolan",
    releaseDate: new Date("2014-11-07"),
    theatricalStatus: "Ended",
    isAdvanceBooking: false,
    description: "A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival.",
    poster: "https://image.tmdb.org/t/p/w780/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
    backdrop: "https://image.tmdb.org/t/p/w1280/xJHokMbljvjADYdit5fK5VQsXEG.jpg",
  },
  {
    title: "3 Idiots",
    movieName: "3 Idiots",
    tmdbId: 20453,
    genre: ["Comedy", "Drama"],
    genres: ["Comedy", "Drama"],
    language: "Hindi",
    duration: 170,
    runtime: 170,
    rating: 8.5,
    popularity: 96.0,
    isAwardWinner: true,
    certification: "U/A",
    cast: ["Aamir Khan", "R. Madhavan", "Sharman Joshi", "Kareena Kapoor"],
    director: "Rajkumar Hirani",
    releaseDate: new Date("2009-12-25"),
    theatricalStatus: "Ended",
    isAdvanceBooking: false,
    description: "Two friends search for their long-lost companion while recounting their college days and how he inspired them to think differently.",
    poster: "https://image.tmdb.org/t/p/w780/66A9MqXOyVFCssoloscw79z8Tew.jpg",
    backdrop: "https://image.tmdb.org/t/p/w1280/uLtVbjOi59lh97ikdUCl7XWWZwU.jpg",
  },
  {
    title: "Dangal",
    movieName: "Dangal",
    tmdbId: 360814,
    genre: ["Drama", "Biography", "Action"],
    genres: ["Drama", "Biography", "Action"],
    language: "Hindi",
    duration: 161,
    runtime: 161,
    rating: 8.4,
    popularity: 95.0,
    isAwardWinner: true,
    certification: "U",
    cast: ["Aamir Khan", "Fatima Sana Shaikh", "Sanya Malhotra"],
    director: "Nitesh Tiwari",
    releaseDate: new Date("2016-12-23"),
    theatricalStatus: "Ended",
    isAdvanceBooking: false,
    description: "Former wrestler Mahavir Singh Phogat and his two wrestler daughters struggle towards glory at the Commonwealth Games.",
    poster: "https://image.tmdb.org/t/p/w780/cJRPOLEexI7qp2DKtFfCh7YaaUG.jpg",
    backdrop: "https://image.tmdb.org/t/p/w1280/mDFVPWkF8j8bB3nC6oY2B9A5q4f.jpg",
  },
  {
    title: "Oppenheimer",
    movieName: "Oppenheimer",
    tmdbId: 872585,
    genre: ["Drama", "History", "Biography"],
    genres: ["Drama", "History", "Biography"],
    language: "English",
    duration: 180,
    runtime: 180,
    rating: 8.9,
    popularity: 98.2,
    isAwardWinner: true,
    certification: "A",
    cast: ["Cillian Murphy", "Emily Blunt", "Matt Damon", "Robert Downey Jr."],
    director: "Christopher Nolan",
    releaseDate: new Date("2023-07-21"),
    theatricalStatus: "Ended",
    isAdvanceBooking: false,
    description: "The story of American scientist J. Robert Oppenheimer and his role in the development of the atomic bomb.",
    poster: "https://image.tmdb.org/t/p/w780/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg",
    backdrop: "https://image.tmdb.org/t/p/w1280/fm6KqXpk3M2HVveHwCrBSSBaO0V.jpg",
  },
  {
    title: "RRR",
    movieName: "RRR",
    tmdbId: 579974,
    genre: ["Action", "Drama", "History"],
    genres: ["Action", "Drama", "History"],
    language: "Telugu",
    duration: 187,
    runtime: 187,
    rating: 8.2,
    popularity: 97.4,
    isAwardWinner: true,
    certification: "U/A",
    cast: ["N.T. Rama Rao Jr.", "Ram Charan", "Ajay Devgn", "Alia Bhatt"],
    director: "S.S. Rajamouli",
    releaseDate: new Date("2022-03-25"),
    theatricalStatus: "Ended",
    isAdvanceBooking: false,
    description: "A fictitious story about two legendary revolutionaries and their journey away from home before they started fighting for their country in 1920s.",
    poster: "https://image.tmdb.org/t/p/w780/nEufeZlyAOLqO2brrs0yeMu1QXO.jpg",
    backdrop: "https://image.tmdb.org/t/p/w1280/70A422gQ4F79F6gEw7Lz8p0B54r.jpg",
  },
];

const sanitizeImagePath = (img, tmdbId) => {
  if (tmdbId && fs.existsSync(path.join(POSTER_DIR, `${tmdbId}.jpg`))) {
    return `/posters/${tmdbId}.jpg`;
  }
  if (!img || typeof img !== "string" || img.trim() === "" || img === "null" || img === "undefined") {
    return null;
  }
  let clean = img.trim();
  if (clean.startsWith("http://")) {
    clean = "https://" + clean.slice(7);
  }
  return clean;
};

/**
 * Deterministic, Robust Synchronization Engine for Screenly:
 * 1. Upserts 15 premier multiplexes across all 7 metropolitan cities (Mumbai, Delhi-NCR, Bengaluru, Hyderabad, Pune, Indore, Bhopal)
 * 2. Upserts canonical master movie records into MongoDB, guaranteeing 100% stable TMDB IDs, w780 posters, and statuses
 * 3. Sanitizes any existing MongoDB movie records using MOVIE_TMDB_MAP and local posters
 * 4. Schedules verified showtimes across every theatre and city for the next 5 days
 * 5. Safely purges only past expired showtimes (never deletes future shows for valid movies)
 * 6. Preserves all registered users, bookings, favorites, and preferences across restarts
 */
async function syncRealWorldMovieAvailability() {
  try {
    // 0. Purge synthetic phantom records and invalid mock titles
    await Movie.deleteMany({
      $or: [
        { tmdbId: { $in: [1400942, 1400943, 1400944, 1410290, 1410291, 1398712, 1163259] } },
        { title: { $in: ["War 2", "The Odyssey", "Dhurandhar", "Falak"] } },
      ],
    });

    // Deduplicate any repeated movies by title
    const distinctTitles = await Movie.distinct("title");
    for (const dTitle of distinctTitles) {
      const dups = await Movie.find({ title: dTitle }).sort({ updatedAt: -1, createdAt: -1 });
      if (dups.length > 1) {
        const keepId = dups[0]._id;
        const removeIds = dups.slice(1).map((d) => d._id);
        await Show.updateMany({ movie: { $in: removeIds } }, { $set: { movie: keepId } });
        await Movie.deleteMany({ _id: { $in: removeIds } });
      }
    }

    // 1. Ensure Theatres across all 7 cities exist in MongoDB
    const seededTheatres = [];
    for (const t of ALL_CITIES_THEATRES) {
      const existing = await Theatre.findOneAndUpdate(
        { name: t.name, city: t.city },
        { $set: t },
        { upsert: true, returnDocument: "after" }
      );
      seededTheatres.push(existing);
    }

    // 2. Upsert Canonical Master Movies into MongoDB (guarantees zero missing movies, correct posters, and statuses)
    const masterMovieDocs = [];
    for (const master of CANONICAL_MASTER_MOVIES) {
      // Check if local poster exists
      let officialPoster = master.poster;
      if (master.tmdbId && fs.existsSync(path.join(POSTER_DIR, `${master.tmdbId}.jpg`))) {
        officialPoster = `/posters/${master.tmdbId}.jpg`;
      }

      const updatePayload = {
        ...master,
        poster: officialPoster,
      };

      const orConditions = [
        { tmdbId: master.tmdbId },
        { title: new RegExp(`^${master.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
      ];
      if (master.tmdbId === 1654581) {
        orConditions.push({ title: /nayyi navelli/i }, { title: /nayi naveli/i });
      }

      const doc = await Movie.findOneAndUpdate(
        { $or: orConditions },
        { $set: updatePayload },
        { upsert: true, returnDocument: "after" }
      );
      masterMovieDocs.push(doc);
    }

    // 3. Sanitize and stabilize any remaining movies in MongoDB using canonical mapping
    const allDbMovies = await Movie.find();
    for (const m of allDbMovies) {
      const titleKey = String(m.title || m.movieName || "").toLowerCase().trim();
      const meta = MOVIE_TMDB_MAP[titleKey];
      let needsSave = false;

      if (meta) {
        if (!m.tmdbId || m.tmdbId !== meta.tmdbId) {
          m.tmdbId = meta.tmdbId;
          needsSave = true;
        }
        if (!m.poster || m.poster.includes("w500")) {
          m.poster = meta.poster;
          needsSave = true;
        }
        if (!m.backdrop && meta.backdrop) {
          m.backdrop = meta.backdrop;
          needsSave = true;
        }
      }

      // Check if offline verified poster file exists
      if (m.tmdbId && fs.existsSync(path.join(POSTER_DIR, `${m.tmdbId}.jpg`))) {
        const localPath = `/posters/${m.tmdbId}.jpg`;
        if (m.poster !== localPath) {
          m.poster = localPath;
          needsSave = true;
        }
      }

      if (needsSave) {
        await m.save();
      }
    }

    // 4. Safely purge shows for ended movies and mark expired movies as Ended
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
    await Movie.updateMany(
      {
        releaseDate: { $lt: sixtyDaysAgo },
        theatricalStatus: { $ne: "Ended" },
      },
      { $set: { theatricalStatus: "Ended", isAdvanceBooking: false } }
    );

    const endedDocs = await Movie.find({
      $or: [
        { theatricalStatus: { $in: ["Ended", "ended", "concluded", "closed"] } },
        { releaseDate: { $lt: sixtyDaysAgo } },
      ],
    }).select("_id");
    const endedIds = endedDocs.map((d) => d._id);
    if (endedIds.length > 0) {
      await Show.deleteMany({ movie: { $in: endedIds } });
    }
    await Show.deleteMany({ showTime: { $lt: new Date() } });

    // Drop legacy non-screen theatre_1_showTime_1 unique index if present so multi-screen shows don't collide
    try {
      await Show.collection.dropIndex("theatre_1_showTime_1");
    } catch (e) {
      // index does not exist or already dropped
    }

    // 5. Build candidate running and advance booking movie lists
    // Include canonical master movies AND any genuine recent Indian releases in DB (released <= 45 days ago with verified local posters)
    const recentDbRunning = await Movie.find({
      releaseDate: {
        $gte: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
        $lte: new Date(),
      },
      poster: { $regex: /^\/posters\// },
      rating: { $gte: 7.2 },
    });

    const activeRunningCandidateMap = new Map();
    masterMovieDocs
      .filter(
        (m) =>
          (m.theatricalStatus === "Now Showing" || m.theatricalStatus === "Advance Booking" || m.isAdvanceBooking) &&
          m.theatricalStatus !== "Ended"
      )
      .forEach((m) => activeRunningCandidateMap.set(String(m._id), m));

    recentDbRunning.forEach((m) => {
      if (!activeRunningCandidateMap.has(String(m._id))) {
        activeRunningCandidateMap.set(String(m._id), m);
      }
    });

    const activeRunningMovies = Array.from(activeRunningCandidateMap.values());

    // 6. Schedule verified shows across every theatre and screen in every city using bulk operations
    if (activeRunningMovies.length > 0 && seededTheatres.length > 0) {
      const showTimesConfig = [
        { h: 10, m: 15, fmt: "2D" },
        { h: 13, m: 45, fmt: "3D" },
        { h: 17, m: 15, fmt: "IMAX 3D" },
        { h: 20, m: 45, fmt: "Dolby Cinema" },
      ];

      const bulkOps = [];
      let movieAssignmentCounter = 0;

      for (const theatre of seededTheatres) {
        const screens =
          Array.isArray(theatre.screens) && theatre.screens.length > 0
            ? theatre.screens
            : ["Audi 1", "Audi 2"];

        for (let sIndex = 0; sIndex < screens.length; sIndex++) {
          const screenName = screens[sIndex];
          for (let day = 0; day < 5; day++) {
            for (let tIndex = 0; tIndex < showTimesConfig.length; tIndex++) {
              const timeConfig = showTimesConfig[tIndex];
              const showDate = new Date();
              showDate.setDate(showDate.getDate() + day);
              showDate.setHours(timeConfig.h, timeConfig.m + sIndex * 15, 0, 0);

              const movie = activeRunningMovies[movieAssignmentCounter % activeRunningMovies.length];
              movieAssignmentCounter++;

              bulkOps.push({
                updateOne: {
                  filter: { theatre: theatre._id, screen: screenName, showTime: showDate },
                  update: {
                    $set: {
                      movie: movie._id,
                      theatre: theatre._id,
                      screen: screenName,
                      format: timeConfig.fmt,
                      language: movie.language || "Hindi",
                      price: theatre.prices?.middle || 250,
                      durationMinutes: movie.duration || movie.runtime || 140,
                      status: "Booking Open",
                    },
                  },
                  upsert: true,
                },
              });
            }
          }
        }
      }

      if (bulkOps.length > 0) {
        await Show.bulkWrite(bulkOps, { ordered: false });
      }

      console.log(
        `[Screenly Persistence Engine] Synchronization complete: ${seededTheatres.length} theatres across 7 cities, ${masterMovieDocs.length} master movies upserted, ${bulkOps.length} active shows scheduled across ${activeRunningMovies.length} active titles.`
      );
    }

    // 7. Ground truth alignment: Align ALL movies in MongoDB with live multiplex schedule reality
    const now = new Date();
    const activeShowsMovieIds = await Show.distinct("movie", {
      showTime: { $gte: now },
    });
    const activeMovieIdSet = new Set(activeShowsMovieIds.map(String));

    const allDbMoviesAfter = await Movie.find({});
    const bulkMovieUpdates = [];

    for (const m of allDbMoviesAfter) {
      const hasShows = activeMovieIdSet.has(String(m._id));
      const rDate = m.releaseDate ? new Date(m.releaseDate) : null;
      const isFuture = rDate && rDate > now;

      let computedTheatricalStatus;
      let computedStatus;
      let isAdvance = false;

      if (hasShows) {
        if (isFuture) {
          computedTheatricalStatus = "Advance Booking";
          computedStatus = "advance_booking";
          isAdvance = true;
        } else {
          computedTheatricalStatus = "Now Showing";
          computedStatus = "now_playing";
          isAdvance = false;
        }
      } else {
        if (isFuture) {
          computedTheatricalStatus = "Coming Soon";
          computedStatus = "upcoming";
          isAdvance = false;
        } else {
          computedTheatricalStatus = "Ended";
          computedStatus = "ended";
          isAdvance = false;
        }
      }

      // Check if verified local offline poster exists
      let localPoster = m.poster;
      if (m.tmdbId && fs.existsSync(path.join(POSTER_DIR, `${m.tmdbId}.jpg`))) {
        localPoster = `/posters/${m.tmdbId}.jpg`;
      }

      bulkMovieUpdates.push({
        updateOne: {
          filter: { _id: m._id },
          update: {
            $set: {
              hasActiveShows: hasShows,
              theatricalStatus: computedTheatricalStatus,
              status: computedStatus,
              isAdvanceBooking: isAdvance,
              poster: localPoster,
            },
          },
        },
      });
    }

    if (bulkMovieUpdates.length > 0) {
      await Movie.bulkWrite(bulkMovieUpdates, { ordered: false });
      console.log(`[Screenly Persistence Engine] Ground-truth aligned ${bulkMovieUpdates.length} movies in MongoDB with active multiplex schedules.`);
    }
  } catch (err) {
    console.error("Error during continuous theatrical sync:", err.message);
  }
}

module.exports = { syncRealWorldMovieAvailability };
