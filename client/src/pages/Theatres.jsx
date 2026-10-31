// client/src/pages/Theatres.jsx
import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import LoadingSpinner from "../components/LoadingSpinner";
import EmptyState from "../components/EmptyState";
import { useCity } from "../hooks/useCity";

const REAL_AUTHENTIC_THEATRES = [
  // Mumbai
  {
    _id: "t_mumbai_pvr",
    name: "PVR: Director's Cut",
    chain: "PVR Cinemas",
    city: "Mumbai",
    location: "Palladium Mall, Lower Parel",
    address: "Level 3, Palladium Mall, High Street Phoenix, Senapati Bapat Marg, Lower Parel, Mumbai - 400013",
    facilities: ["IMAX Laser", "Dolby Atmos 7.1", "VIP Recliner Seating", "Gourmet Food Court", "Valet Parking", "Wheelchair Accessible"],
    formats: ["2D", "3D", "IMAX 3D", "Dolby Cinema"],
    languages: ["Hindi", "English", "Marathi"],
    googleMapsUrl: "https://maps.google.com/?q=PVR+Directors+Cut+Palladium+Mumbai",
    screens: ["Screen 1 (Dolby Atmos 4K)", "Screen 2 (IMAX Laser)", "Audi 1 (VIP Recliner)"],
    seats: { lower: 30, middle: 40, balcony: 20 },
    prices: { lower: 200, middle: 320, balcony: 450 },
    image: "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=600&auto=format&fit=crop&q=80",
  },
  {
    _id: "t_mumbai_inox",
    name: "INOX Megaplex",
    chain: "INOX",
    city: "Mumbai",
    location: "Inorbit Mall, Malad West",
    address: "3rd Floor, Inorbit Mall, New Link Road, Malad West, Mumbai - 400064",
    facilities: ["MX4D Dynamic Motion", "ScreenX 270°", "Dolby Atmos", "Insignia Lounge", "Covered Parking"],
    formats: ["2D", "3D", "4DX", "ScreenX"],
    languages: ["Hindi", "English"],
    googleMapsUrl: "https://maps.google.com/?q=INOX+Megaplex+Inorbit+Mall+Malad+Mumbai",
    screens: ["Screen 1 (MX4D)", "Screen 2 (ScreenX)", "Screen 3 (Dolby Atmos)"],
    seats: { lower: 30, middle: 40, balcony: 20 },
    prices: { lower: 190, middle: 290, balcony: 420 },
    image: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600&auto=format&fit=crop&q=80",
  },
  {
    _id: "t_mumbai_miraj",
    name: "Miraj Cinemas",
    chain: "Miraj Cinemas",
    city: "Mumbai",
    location: "Fun Republic, Andheri West",
    address: "4th Floor, Fun Republic Mall, New Link Road, Andheri West, Mumbai - 400053",
    facilities: ["Dolby Surround 7.1", "Push-back Plush Seats", "Cafeteria", "Parking"],
    formats: ["2D", "3D"],
    languages: ["Hindi", "English", "Marathi"],
    googleMapsUrl: "https://maps.google.com/?q=Miraj+Cinemas+Fun+Republic+Andheri+Mumbai",
    screens: ["Audi 1", "Audi 2"],
    seats: { lower: 30, middle: 40, balcony: 20 },
    prices: { lower: 160, middle: 250, balcony: 350 },
    image: "https://images.unsplash.com/photo-1595769816263-9b910be24d5f?w=600&auto=format&fit=crop&q=80",
  },

  // Delhi-NCR
  {
    _id: "t_delhi_pvr",
    name: "PVR Superplex",
    chain: "PVR Cinemas",
    city: "Delhi-NCR",
    location: "Logix City Centre, Noida",
    address: "Level 3, Logix City Centre, Sector 32, Noida, Delhi-NCR - 201301",
    facilities: ["IMAX with Laser", "4DX Motion", "PlayHouse for Kids", "Gold Class Recliner", "Valet Parking"],
    formats: ["2D", "3D", "IMAX", "4DX"],
    languages: ["Hindi", "English", "Punjabi"],
    googleMapsUrl: "https://maps.google.com/?q=PVR+Superplex+Logix+City+Centre+Noida",
    screens: ["Audi 1 (IMAX)", "Audi 2 (4DX)", "Audi 3 (Gold Class)"],
    seats: { lower: 30, middle: 40, balcony: 20 },
    prices: { lower: 190, middle: 300, balcony: 420 },
    image: "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=600&auto=format&fit=crop&q=80",
  },
  {
    _id: "t_delhi_cinepolis",
    name: "Cinépolis VIP",
    chain: "Cinépolis",
    city: "Delhi-NCR",
    location: "DLF Avenue, Saket",
    address: "1st Floor, DLF Avenue, Press Enclave Marg, Saket District Centre, New Delhi - 110017",
    facilities: ["VIP Lounges", "Macro XE Screen", "Dolby Atmos 4K", "Gourmet Dine-in"],
    formats: ["2D", "3D", "Dolby Cinema"],
    languages: ["Hindi", "English"],
    googleMapsUrl: "https://maps.google.com/?q=Cinepolis+Saket+DLF+Avenue+Delhi",
    screens: ["Audi 1 (VIP)", "Audi 2 (Macro XE)"],
    seats: { lower: 30, middle: 40, balcony: 20 },
    prices: { lower: 210, middle: 340, balcony: 480 },
    image: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600&auto=format&fit=crop&q=80",
  },

  // Bengaluru
  {
    _id: "t_blr_pvr",
    name: "PVR INOX",
    chain: "PVR Cinemas",
    city: "Bengaluru",
    location: "Forum South Mall, Kanakapura Road",
    address: "Level 4, Forum South Bangalore, Konanakunte Cross, Kanakapura Main Road, Bengaluru - 560062",
    facilities: ["IMAX 3D Laser", "LUXE Recliner Seats", "Dolby Atmos", "Valet Parking", "Wheelchair Ramp"],
    formats: ["2D", "3D", "IMAX 3D", "Dolby Cinema"],
    languages: ["Kannada", "Hindi", "English", "Telugu", "Tamil"],
    googleMapsUrl: "https://maps.google.com/?q=PVR+Forum+South+Bengaluru",
    screens: ["Audi 1 (IMAX Laser)", "Audi 2 (LUXE)", "Audi 3 (Dolby Atmos)"],
    seats: { lower: 30, middle: 40, balcony: 20 },
    prices: { lower: 180, middle: 280, balcony: 400 },
    image: "https://images.unsplash.com/photo-1595769816263-9b910be24d5f?w=600&auto=format&fit=crop&q=80",
  },
  {
    _id: "t_blr_cinepolis",
    name: "Cinépolis",
    chain: "Cinépolis",
    city: "Bengaluru",
    location: "Nexus Shantiniketan, Whitefield",
    address: "Level 3, Nexus Shantiniketan, Whitefield Main Road, Bengaluru - 560067",
    facilities: ["Dolby 7.1", "VIP Recliners", "Coffee & Snack Bar", "Ample Parking"],
    formats: ["2D", "3D", "4DX"],
    languages: ["Kannada", "English", "Hindi", "Telugu"],
    googleMapsUrl: "https://maps.google.com/?q=Cinepolis+Nexus+Shantiniketan+Bangalore",
    screens: ["Audi 1 (4DX)", "Audi 2 (Standard)"],
    seats: { lower: 30, middle: 40, balcony: 20 },
    prices: { lower: 170, middle: 260, balcony: 380 },
    image: "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=600&auto=format&fit=crop&q=80",
  },

  // Indore
  {
    _id: "t_indore_pvr",
    name: "PVR Cinemas",
    chain: "PVR Cinemas",
    city: "Indore",
    location: "Treasure Island Mall, MG Road",
    address: "4th Floor, Treasure Island Mall, 11 MG Road, South Tukoganj, Indore - 452001",
    facilities: ["Dolby 7.1 Sound", "Premium Recliner", "Food Court", "Covered Parking", "Wheelchair Ramp"],
    formats: ["2D", "3D"],
    languages: ["Hindi", "English"],
    googleMapsUrl: "https://maps.google.com/?q=PVR+Treasure+Island+Mall+Indore",
    screens: ["Audi 1", "Audi 2", "Audi 3"],
    seats: { lower: 30, middle: 40, balcony: 20 },
    prices: { lower: 150, middle: 240, balcony: 350 },
    image: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600&auto=format&fit=crop&q=80",
  },
  {
    _id: "t_indore_inox",
    name: "INOX Megaplex",
    chain: "INOX",
    city: "Indore",
    location: "C21 Mall, AB Road",
    address: "3rd Floor, C21 Mall, Scheme No 54, AB Road, Indore - 452010",
    facilities: ["IMAX Screen", "Insignia VIP Lounge", "Dolby Atmos", "Valet Parking"],
    formats: ["2D", "3D", "IMAX 3D"],
    languages: ["Hindi", "English"],
    googleMapsUrl: "https://maps.google.com/?q=INOX+C21+Mall+Indore",
    screens: ["Audi 1 (IMAX)", "Audi 2 (Insignia VIP)", "Audi 3 (Dolby Atmos)"],
    seats: { lower: 30, middle: 40, balcony: 20 },
    prices: { lower: 160, middle: 250, balcony: 360 },
    image: "https://images.unsplash.com/photo-1595769816263-9b910be24d5f?w=600&auto=format&fit=crop&q=80",
  },

  // Bhopal
  {
    _id: "t_bhopal_cinepolis",
    name: "Cinépolis",
    chain: "Cinépolis",
    city: "Bhopal",
    location: "DB City Mall, Arera Hills",
    address: "Level 3, DB City Mall, Arera Hills, Hoshangabad Road, Bhopal - 462011",
    facilities: ["VIP Screens", "RealD 3D", "Dolby Atmos 4K", "Multi-cuisine Food Court", "Covered Parking"],
    formats: ["2D", "3D", "Dolby Cinema"],
    languages: ["Hindi", "English"],
    googleMapsUrl: "https://maps.google.com/?q=Cinepolis+DB+City+Mall+Bhopal",
    screens: ["Audi 1 (VIP Laser)", "Audi 2 (RealD 3D)", "Audi 3 (Dolby Atmos)"],
    seats: { lower: 30, middle: 40, balcony: 20 },
    prices: { lower: 150, middle: 240, balcony: 340 },
    image: "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=600&auto=format&fit=crop&q=80",
  },
  {
    _id: "t_bhopal_mukta",
    name: "Mukta A2 Cinemas",
    chain: "Mukta A2",
    city: "Bhopal",
    location: "Top N Town Mall, Malviya Nagar",
    address: "Top N Town Mall, Malviya Nagar, New Market, Bhopal - 462003",
    facilities: ["3D Digital Projection", "Comfort Rocker Seats", "Cafeteria", "Parking"],
    formats: ["2D", "3D"],
    languages: ["Hindi", "English"],
    googleMapsUrl: "https://maps.google.com/?q=Mukta+A2+Cinemas+Bhopal",
    screens: ["Audi 1", "Audi 2"],
    seats: { lower: 30, middle: 40, balcony: 20 },
    prices: { lower: 140, middle: 220, balcony: 300 },
    image: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600&auto=format&fit=crop&q=80",
  },

  // Hyderabad
  {
    _id: "t_hyd_pvr",
    name: "PVR INOX",
    chain: "PVR Cinemas",
    city: "Hyderabad",
    location: "Nexus Mall, Kukatpally",
    address: "Level 4, Nexus Hyderabad Mall, Phase 6, KPHB Colony, Kukatpally, Hyderabad - 500072",
    facilities: ["IMAX with Laser", "4DX Dynamic Motion", "Dolby Atmos", "Wheelchair Accessible", "Valet Parking"],
    formats: ["2D", "3D", "IMAX 3D", "4DX"],
    languages: ["Telugu", "Hindi", "English"],
    googleMapsUrl: "https://maps.google.com/?q=PVR+Nexus+Mall+Kukatpally+Hyderabad",
    screens: ["Audi 1 (IMAX)", "Audi 2 (4DX)", "Audi 3 (Dolby Atmos)"],
    seats: { lower: 30, middle: 40, balcony: 20 },
    prices: { lower: 180, middle: 290, balcony: 420 },
    image: "https://images.unsplash.com/photo-1595769816263-9b910be24d5f?w=600&auto=format&fit=crop&q=80",
  },
  {
    _id: "t_hyd_miraj",
    name: "Miraj Cinemas",
    chain: "Miraj Cinemas",
    city: "Hyderabad",
    location: "Shalini Shivani Theatre, Dilsukhnagar",
    address: "Dilsukhnagar Main Road, Kamala Nagar, Hyderabad - 500060",
    facilities: ["4K RGB Laser", "Dolby Atmos 64 Channel", "Recliners", "Snack Bar"],
    formats: ["2D", "3D"],
    languages: ["Telugu", "Hindi"],
    googleMapsUrl: "https://maps.google.com/?q=Miraj+Cinemas+Shalini+Shivani+Hyderabad",
    screens: ["Audi 1 (4K Laser)", "Audi 2 (Dolby)"],
    seats: { lower: 30, middle: 40, balcony: 20 },
    prices: { lower: 150, middle: 230, balcony: 320 },
    image: "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=600&auto=format&fit=crop&q=80",
  },

  // Pune
  {
    _id: "t_pune_pvr",
    name: "PVR Cinemas",
    chain: "PVR Cinemas",
    city: "Pune",
    location: "The Pavilion Mall, Shivajinagar",
    address: "Level 4, The Pavilion Mall, Senapati Bapat Road, Shivajinagar, Pune - 411016",
    facilities: ["IMAX 3D", "Dolby Atmos", "PVR P[XL]", "Gold Lounge", "Valet Parking"],
    formats: ["2D", "3D", "IMAX", "Dolby Cinema"],
    languages: ["Marathi", "Hindi", "English"],
    googleMapsUrl: "https://maps.google.com/?q=PVR+Pavilion+Mall+Pune",
    screens: ["Audi 1 (IMAX)", "Audi 2 (P[XL])", "Audi 3 (Gold Lounge)"],
    seats: { lower: 30, middle: 40, balcony: 20 },
    prices: { lower: 180, middle: 280, balcony: 400 },
    image: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600&auto=format&fit=crop&q=80",
  },
  {
    _id: "t_pune_cinepolis",
    name: "Cinépolis",
    chain: "Cinépolis",
    city: "Pune",
    location: "Seasons Mall, Magarpatta City",
    address: "Level 3, Seasons Mall, Magarpatta City, Hadapsar, Pune - 411028",
    facilities: ["VIP Screens", "4DX Auditorium", "Dolby 7.1", "Multi-cuisine Food Court"],
    formats: ["2D", "3D", "4DX"],
    languages: ["Marathi", "Hindi", "English"],
    googleMapsUrl: "https://maps.google.com/?q=Cinepolis+Seasons+Mall+Pune",
    screens: ["Audi 1 (VIP)", "Audi 2 (4DX)"],
    seats: { lower: 30, middle: 40, balcony: 20 },
    prices: { lower: 170, middle: 270, balcony: 390 },
    image: "https://images.unsplash.com/photo-1595769816263-9b910be24d5f?w=600&auto=format&fit=crop&q=80",
  },
];

export default function Theatres() {
  const { selectedCity, setSelectedCity, cities, openCityModal } = useCity();
  const [theatres, setTheatres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedChain, setSelectedChain] = useState("All");
  const [search, setSearch] = useState("");

  const fetchTheatres = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/theatres");
      const list = Array.isArray(res.data) && res.data.length > 0 ? res.data : REAL_AUTHENTIC_THEATRES;
      setTheatres(list);
    } catch {
      setTheatres(REAL_AUTHENTIC_THEATRES);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTheatres();
  }, [fetchTheatres]);

  const chains = ["All", "PVR Cinemas", "INOX", "Cinépolis", "Miraj Cinemas", "Mukta A2"];

  const filteredTheatres = theatres.filter((t) => {
    if (!selectedCity) return false;
    const matchesCity = (t.city || "").toLowerCase() === selectedCity.toLowerCase();
    const matchesChain = selectedChain === "All" || (t.chain || "").toLowerCase() === selectedChain.toLowerCase();
    const q = search.toLowerCase();
    const matchesSearch =
      (t.name || "").toLowerCase().includes(q) ||
      (t.location || "").toLowerCase().includes(q) ||
      (t.address || "").toLowerCase().includes(q) ||
      (t.city || "").toLowerCase().includes(q) ||
      (t.chain || "").toLowerCase().includes(q);
    return matchesCity && matchesChain && matchesSearch;
  });

  if (loading) return <LoadingSpinner message="Locating verified partner multiplexes..." />;

  return (
    <div className="container py-4 fade-in" style={{ maxWidth: "1280px" }}>
      {/* Header */}
      <div className="text-center mb-4">
        <h1 className="text-white fw-bold mb-2">
          Real Cinema <span style={{ color: "#e50914" }}>Multiplexes</span>
        </h1>
        <p className="text-secondary small">
          Official partner cinemas across India with IMAX Laser, Dolby Atmos 4K, 4DX motion & VIP recliner auditoriums
        </p>
      </div>

      {!selectedCity ? (
        /* Dedicated City Selection Prompt When No City Chosen */
        <div
          className="glass-panel p-5 text-center my-4 rounded-4"
          style={{
            backgroundColor: "#151828",
            border: "1px solid rgba(229, 9, 20, 0.35)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
          }}
        >
          <div
            className="d-inline-flex align-items-center justify-content-center rounded-circle p-3 mb-3"
            style={{ width: "64px", height: "64px", background: "rgba(229, 9, 20, 0.15)", color: "#e50914" }}
          >
            <i className="fa-solid fa-location-dot fs-3"></i>
          </div>
          <h3 className="text-white fw-bold mb-2">Select Your City to View Verified Theatres</h3>
          <p className="text-secondary small mb-4" style={{ maxWidth: "560px", margin: "0 auto" }}>
            Multiplex listings, auditoriums, VIP recliner amenities, and live seat pricing are location-specific.
            Please choose your metropolitan area to view genuine partner cinemas.
          </p>
          <button
            type="button"
            onClick={() => openCityModal()}
            className="btn btn-cinema px-4 py-2 fs-6 fw-bold shadow-lg mb-4"
          >
            <i className="fa-solid fa-location-dot me-2"></i> Select Your Location
          </button>
          <div className="d-flex align-items-center justify-content-center gap-2 flex-wrap">
            <span className="text-secondary small me-2">Or select a metropolitan market:</span>
            {cities.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setSelectedCity(c)}
                className="btn btn-sm btn-secondary-cinema py-1 px-3 text-secondary hover-white"
                style={{ fontSize: "0.8rem" }}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Filter and Control Bar */}
          <div className="glass-panel p-3 mb-4 d-flex flex-column gap-3">
            {/* City Filter Pills */}
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <span className="text-secondary small fw-bold text-uppercase me-1">
                <i className="fa-solid fa-location-dot text-danger me-1"></i> City:
              </span>
              <span className="badge bg-danger bg-opacity-25 text-danger border border-danger border-opacity-25 px-3 py-2 small fw-bold d-flex align-items-center gap-2">
                <i className="fa-solid fa-location-dot"></i> {selectedCity}
              </span>
              <button
                type="button"
                onClick={() => openCityModal()}
                className="btn btn-sm btn-outline-danger py-1 px-3 ms-1"
                style={{ fontSize: "0.78rem" }}
              >
                <i className="fa-solid fa-arrows-rotate me-1"></i> Change City
              </button>
              {cities
                .filter((c) => c.toLowerCase() !== selectedCity.toLowerCase())
                .map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setSelectedCity(c)}
                    className="btn btn-sm py-1 px-2 text-secondary hover-white rounded-pill"
                    style={{ fontSize: "0.78rem", border: "1px solid rgba(255, 255, 255, 0.08)" }}
                  >
                    {c}
                  </button>
                ))}
            </div>

            {/* Chain and Search Bar */}
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 pt-2 border-top border-secondary border-opacity-25">
              {/* Chain Filter */}
              <div className="d-flex align-items-center gap-2 flex-wrap">
                <span className="text-secondary small fw-bold text-uppercase">Chain:</span>
                {chains.map((chain) => (
                  <button
                    key={chain}
                    onClick={() => setSelectedChain(chain)}
                    className={`btn btn-sm py-1 px-2 fw-semibold rounded-2 ${
                      selectedChain === chain ? "bg-secondary text-white" : "text-secondary hover-white"
                    }`}
                    style={{ fontSize: "0.8rem", border: "1px solid rgba(255, 255, 255, 0.1)" }}
                  >
                    {chain}
                  </button>
                ))}
              </div>

              {/* Search Box */}
              <div style={{ width: "260px" }}>
                <div className="position-relative">
                  <i className="fa-solid fa-magnifying-glass position-absolute start-0 top-50 translate-middle-y ms-3 text-secondary small"></i>
                  <input
                    type="text"
                    className="form-control cinema-input py-1 ps-5 pe-3"
                    placeholder="Search multiplex, chain or area..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{ fontSize: "0.82rem" }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Theatres Grid */}
          {filteredTheatres.length === 0 ? (
            <EmptyState
              icon="fa-solid fa-masks-theater"
              title={`No Multiplexes Found in ${selectedCity}`}
              message="No partner theatres match your selected chain or search criteria. Try choosing another city or clearing your search."
              actionLabel="Change City"
              onAction={() => openCityModal()}
            />
          ) : (
            <>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <span className="text-secondary small">
                  Showing <strong>{filteredTheatres.length}</strong> cinemas in <strong>{selectedCity}</strong>
                </span>
              </div>

              <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4">
            {filteredTheatres.map((t) => {
              const totalSeats =
                (t.seats?.balcony || 20) + (t.seats?.middle || 40) + (t.seats?.lower || 40);
              const minPrice = t.prices?.lower || 150;
              const maxPrice = t.prices?.balcony || 350;
              const facilitiesList = Array.isArray(t.facilities) && t.facilities.length > 0
                ? t.facilities
                : ["Dolby Atmos", "4K Projection", "Recliner Seats", "Food Court"];
              const formatsList = Array.isArray(t.formats) && t.formats.length > 0
                ? t.formats
                : ["2D", "3D", "IMAX"];

              return (
                <div key={t._id} className="col">
                  <div className="glass-card h-100 d-flex flex-column overflow-hidden">
                    {/* Photo Banner */}
                    <div className="position-relative" style={{ height: "180px" }}>
                      <img
                        src={
                          t.image ||
                          "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=600&auto=format&fit=crop&q=80"
                        }
                        alt={t.name}
                        className="w-100 h-100 object-fit-cover"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src =
                            "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=600&auto=format&fit=crop&q=80";
                        }}
                      />
                      <div
                        className="position-absolute top-0 start-0 w-100 h-100"
                        style={{
                          background:
                            "linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(21, 24, 40, 0.95) 100%)",
                        }}
                      ></div>
                      <span className="badge bg-danger position-absolute top-0 end-0 m-3 shadow">
                        <i className="fa-solid fa-location-dot me-1"></i> {t.city}
                      </span>
                      {t.chain && (
                        <span className="badge bg-dark bg-opacity-75 text-light position-absolute top-0 start-0 m-3 shadow border border-secondary border-opacity-25">
                          {t.chain}
                        </span>
                      )}
                    </div>

                    {/* Body Content */}
                    <div className="p-4 d-flex flex-column flex-grow-1 justify-content-between">
                      <div>
                        <h4 className="text-white fw-bold mb-1">{t.name}</h4>
                        <div className="text-secondary small mb-2 d-flex align-items-center gap-1">
                          <i className="fa-solid fa-map-pin text-danger"></i>
                          <span className="fw-semibold text-light text-opacity-75">{t.location || t.city}</span>
                        </div>

                        {/* Full Complete Address */}
                        {t.address && (
                          <p className="text-secondary small mb-3 lh-sm" style={{ fontSize: "0.76rem" }}>
                            {t.address}
                          </p>
                        )}

                        {/* Screen Formats */}
                        <div className="mb-2">
                          <span className="text-secondary text-uppercase fw-bold d-block mb-1" style={{ fontSize: "0.68rem" }}>
                            Formats:
                          </span>
                          <div className="d-flex flex-wrap gap-1">
                            {formatsList.map((fmt) => (
                              <span
                                key={fmt}
                                className="badge bg-danger bg-opacity-25 text-danger border border-danger border-opacity-25 py-1 px-2"
                                style={{ fontSize: "0.72rem" }}
                              >
                                {fmt}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Facilities Badges */}
                        <div className="mb-3">
                          <span className="text-secondary text-uppercase fw-bold d-block mb-1" style={{ fontSize: "0.68rem" }}>
                            Amenities &amp; Tech:
                          </span>
                          <div className="d-flex flex-wrap gap-1">
                            {facilitiesList.slice(0, 4).map((f) => (
                              <span
                                key={f}
                                className="badge bg-dark text-light border border-secondary border-opacity-25 py-1 px-2"
                                style={{ fontSize: "0.7rem" }}
                              >
                                <i className="fa-solid fa-check text-success me-1"></i>
                                {f}
                              </span>
                            ))}
                            {facilitiesList.length > 4 && (
                              <span className="badge bg-dark text-secondary border border-secondary border-opacity-25 py-1 px-2" style={{ fontSize: "0.7rem" }}>
                                +{facilitiesList.length - 4} more
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Pricing and Capacity Specs */}
                        <div className="p-3 rounded-3 mb-3" style={{ background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                          <div className="d-flex justify-content-between text-secondary small mb-1">
                            <span>Capacity:</span>
                            <span className="text-white fw-semibold">{totalSeats} Seats</span>
                          </div>
                          <div className="d-flex justify-content-between text-secondary small">
                            <span>Ticket Tiers:</span>
                            <span className="text-success fw-bold">₹{minPrice} &ndash; ₹{maxPrice}</span>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons: Showtimes & Google Maps */}
                      <div className="d-flex flex-column gap-2">
                        <Link
                          to={`/shows?theatre=${t._id}`}
                          className="btn btn-cinema w-100 py-2 fw-bold text-center text-decoration-none"
                        >
                          <i className="fa-solid fa-calendar-days me-2"></i> View Showtimes
                        </Link>

                        {t.googleMapsUrl && (
                          <a
                            href={t.googleMapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-sm btn-secondary-cinema text-center text-decoration-none py-1 text-secondary hover-white"
                            style={{ fontSize: "0.78rem" }}
                          >
                            <i className="fa-solid fa-arrow-up-right-from-square me-1 text-danger"></i> View on Google Maps
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </>
  )}
</div>
);
}
