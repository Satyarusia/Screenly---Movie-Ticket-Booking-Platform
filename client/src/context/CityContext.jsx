// client/src/context/CityContext.jsx
import { createContext, useState, useEffect } from "react";
import toast from "react-hot-toast";
import { CITIES, POPULAR_CITIES, ALL_SUPPORTED_CITIES } from "../constants/cities";

const CityContext = createContext();

export const CityProvider = ({ children }) => {
  const [selectedCity, setSelectedCityState] = useState(() => {
    const saved = localStorage.getItem("screenly_selected_city");
    if (saved && CITIES.includes(saved)) {
      return saved;
    }
    // Clean up any stale, unselected, or invalid values like "Any Location", "All", "All India"
    localStorage.removeItem("screenly_selected_city");
    return "";
  });

  const [recentCities, setRecentCities] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("screenly_recent_cities") || "[]");
      return Array.isArray(saved) ? saved : [];
    } catch {
      return [];
    }
  });

  const [isCityModalOpen, setIsCityModalOpen] = useState(false);
  const [cityCallback, setCityCallback] = useState(null);

  const setSelectedCity = (city) => {
    if (city && CITIES.includes(city)) {
      setSelectedCityState(city);
      localStorage.setItem("screenly_selected_city", city);
    } else {
      setSelectedCityState("");
      localStorage.removeItem("screenly_selected_city");
    }
  };

  const openCityModal = (onSelectCallback = null) => {
    if (typeof onSelectCallback === "function") {
      setCityCallback(() => onSelectCallback);
    } else {
      setCityCallback(null);
    }
    setIsCityModalOpen(true);
  };

  const closeCityModal = () => {
    setIsCityModalOpen(false);
    setCityCallback(null);
  };

  const selectCityAndClose = (city) => {
    if (city) {
      setSelectedCity(city);
      setRecentCities((prev) => {
        const next = [city, ...prev.filter((c) => c !== city)].slice(0, 5);
        localStorage.setItem("screenly_recent_cities", JSON.stringify(next));
        return next;
      });
      toast.success(`Location set to ${city}`);
    } else {
      clearCity();
      return;
    }
    setIsCityModalOpen(false);
    if (cityCallback) {
      const cb = cityCallback;
      setCityCallback(null);
      cb(city);
    }
  };

  const clearCity = () => {
    setSelectedCity("");
    toast.success("Switched to India-wide Discovery Mode");
    setIsCityModalOpen(false);
    if (cityCallback) {
      const cb = cityCallback;
      setCityCallback(null);
      cb("");
    }
  };

  useEffect(() => {
    if (selectedCity) {
      localStorage.setItem("screenly_selected_city", selectedCity);
    }
  }, [selectedCity]);

  return (
    <CityContext.Provider
      value={{
        selectedCity,
        setSelectedCity,
        cities: CITIES,
        popularCities: POPULAR_CITIES,
        allCities: ALL_SUPPORTED_CITIES,
        recentCities,
        isCityModalOpen,
        openCityModal,
        closeCityModal,
        selectCityAndClose,
        clearCity,
      }}
    >
      {children}
    </CityContext.Provider>
  );
};

export default CityContext;
