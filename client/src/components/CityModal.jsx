import { useState } from "react";
import { useCity } from "../hooks/useCity";

export default function CityModal() {
  const {
    isCityModalOpen,
    closeCityModal,
    selectedCity,
    selectCityAndClose,
    clearCity,
    popularCities,
    allCities,
    recentCities,
  } = useCity();

  const [searchTerm, setSearchTerm] = useState("");

  if (!isCityModalOpen) return null;

  const term = searchTerm.toLowerCase().trim();

  const filteredPopular = (popularCities || []).filter(
    (c) =>
      c.name.toLowerCase().includes(term) ||
      c.state.toLowerCase().includes(term) ||
      (c.tag && c.tag.toLowerCase().includes(term))
  );

  const filteredAll = (allCities || []).filter(
    (c) =>
      c.name.toLowerCase().includes(term) ||
      c.state.toLowerCase().includes(term) ||
      (c.region && c.region.toLowerCase().includes(term))
  );

  return (
    <div
      className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
      style={{
        backgroundColor: "rgba(5, 7, 15, 0.85)",
        backdropFilter: "blur(8px)",
        zIndex: 2050,
        padding: "1rem",
      }}
      onClick={closeCityModal}
    >
      <div
        className="glass-panel rounded-4 shadow-lg w-100 d-flex flex-column"
        style={{
          maxWidth: "640px",
          maxHeight: "90vh",
          backgroundColor: "#121422",
          border: "1px solid rgba(255, 255, 255, 0.15)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 pb-3 border-bottom border-secondary border-opacity-25 d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center gap-3">
            <div
              className="d-flex align-items-center justify-content-center rounded-circle"
              style={{
                width: "42px",
                height: "42px",
                background: "rgba(229, 9, 20, 0.15)",
                color: "#e50914",
              }}
            >
              <i className="fa-solid fa-location-dot fs-5"></i>
            </div>
            <div>
              <h4 className="text-white fw-bold mb-1">Choose Your City</h4>
              <p className="text-secondary small mb-0" style={{ fontSize: "0.78rem" }}>
                Select your cinema city to view local multiplexes, real showtimes &amp; ticket pricing
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeCityModal}
            className="btn btn-sm btn-link text-secondary p-0 text-decoration-none"
            style={{ fontSize: "1.3rem" }}
            aria-label="Close"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {/* Modal Body (Scrollable) */}
        <div className="p-4 pt-3 overflow-y-auto" style={{ flex: "1 1 auto" }}>
          {/* Search Bar */}
          <div className="mb-3 position-relative">
            <i
              className="fa-solid fa-magnifying-glass position-absolute start-0 top-50 translate-middle-y ms-3 text-secondary"
              style={{ fontSize: "0.9rem" }}
            ></i>
            <input
              type="text"
              className="form-control ps-5 pe-5 py-2 text-white"
              placeholder="Search for your city (e.g. Mumbai, Delhi, Bengaluru)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.06)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                borderRadius: "12px",
                fontSize: "0.9rem",
              }}
            />
            {searchTerm && (
              <button
                type="button"
                className="btn btn-sm position-absolute end-0 top-50 translate-middle-y me-2 text-secondary p-0"
                onClick={() => setSearchTerm("")}
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            )}
          </div>

          {/* Current Selected City Banner */}
          {selectedCity && (
            <div
              className="p-3 rounded-3 mb-3 d-flex align-items-center justify-content-between flex-wrap gap-2"
              style={{
                backgroundColor: "rgba(229, 9, 20, 0.12)",
                border: "1px solid rgba(229, 9, 20, 0.4)",
              }}
            >
              <div className="d-flex align-items-center gap-2">
                <i className="fa-solid fa-circle-check text-danger"></i>
                <span className="text-secondary small">
                  Currently Selected: <strong className="text-white">{selectedCity}</strong>
                </span>
              </div>
              <button
                type="button"
                onClick={clearCity}
                className="btn btn-sm btn-outline-danger py-1 px-2 fw-semibold"
                style={{ fontSize: "0.75rem" }}
              >
                <i className="fa-solid fa-earth-asia me-1"></i>
                Browse All India
              </button>
            </div>
          )}

          {/* Recently Selected Cities */}
          {!term && recentCities && recentCities.length > 0 && (
            <div className="mb-3">
              <div className="text-secondary small fw-bold text-uppercase mb-2" style={{ fontSize: "0.7rem", letterSpacing: "0.5px" }}>
                Recently Selected
              </div>
              <div className="d-flex flex-wrap gap-2">
                {recentCities.map((city) => {
                  const isCurrent = (selectedCity || "").toLowerCase() === city.toLowerCase();
                  return (
                    <button
                      key={city}
                      type="button"
                      onClick={() => selectCityAndClose(city)}
                      className={`btn btn-sm py-1 px-3 rounded-pill d-flex align-items-center gap-1 ${
                        isCurrent
                          ? "btn-cinema"
                          : "btn-secondary-cinema text-light"
                      }`}
                      style={{ fontSize: "0.78rem" }}
                    >
                      <i className="fa-solid fa-clock-rotate-left small me-1"></i>
                      <span>{city}</span>
                      {isCurrent && <i className="fa-solid fa-check small ms-1"></i>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Popular Cities Section */}
          <div className="mb-4">
            <div className="text-secondary small fw-bold text-uppercase mb-2" style={{ fontSize: "0.7rem", letterSpacing: "0.5px" }}>
              Popular Cities
            </div>
            <div className="row g-2">
              {filteredPopular.length > 0 ? (
                filteredPopular.map((c) => {
                  const isSelected = (selectedCity || "").toLowerCase() === c.name.toLowerCase();
                  return (
                    <div key={c.name} className="col-6 col-sm-4">
                      <button
                        type="button"
                        onClick={() => selectCityAndClose(c.name)}
                        className="w-100 p-2 rounded-3 text-start d-flex align-items-center gap-2 transition-all border-0 position-relative"
                        style={{
                          backgroundColor: isSelected
                            ? "rgba(229, 9, 20, 0.22)"
                            : "rgba(255, 255, 255, 0.05)",
                          border: isSelected
                            ? "1px solid rgba(229, 9, 20, 0.65)"
                            : "1px solid rgba(255, 255, 255, 0.08)",
                          cursor: "pointer",
                          minHeight: "56px",
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
                            e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.25)";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.05)";
                            e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)";
                          }
                        }}
                      >
                        <div
                          className="d-flex align-items-center justify-content-center rounded-2 flex-shrink-0"
                          style={{
                            width: "32px",
                            height: "32px",
                            backgroundColor: isSelected
                              ? "rgba(229, 9, 20, 0.4)"
                              : "rgba(255, 255, 255, 0.08)",
                            color: isSelected ? "#ffffff" : "#e50914",
                          }}
                        >
                          <i className={`fa-solid ${c.icon || "fa-city"} small`}></i>
                        </div>
                        <div className="overflow-hidden flex-grow-1">
                          <div className={`fw-bold small text-truncate ${isSelected ? "text-danger" : "text-white"}`} style={{ fontSize: "0.82rem" }}>
                            {c.name}
                          </div>
                          <div className="text-secondary small text-truncate" style={{ fontSize: "0.68rem" }}>
                            {c.state}
                          </div>
                        </div>
                        {isSelected && (
                          <i className="fa-solid fa-circle-check text-danger small me-1"></i>
                        )}
                      </button>
                    </div>
                  );
                })
              ) : (
                <div className="col-12 py-2 text-secondary small">
                  No popular cities match "{searchTerm}".
                </div>
              )}
            </div>
          </div>

          {/* All Supported Cities Section */}
          <div>
            <div className="text-secondary small fw-bold text-uppercase mb-2" style={{ fontSize: "0.7rem", letterSpacing: "0.5px" }}>
              All Supported Cities ({filteredAll.length})
            </div>
            <div className="row g-2">
              {filteredAll.length > 0 ? (
                filteredAll.map((item) => {
                  const isSelected = (selectedCity || "").toLowerCase() === item.name.toLowerCase();
                  return (
                    <div key={item.name} className="col-6 col-sm-4">
                      <button
                        type="button"
                        onClick={() => selectCityAndClose(item.name)}
                        className="w-100 p-2 rounded-2 text-start border-0 d-flex align-items-center justify-content-between"
                        style={{
                          backgroundColor: isSelected
                            ? "rgba(229, 9, 20, 0.16)"
                            : "rgba(255, 255, 255, 0.03)",
                          border: isSelected
                            ? "1px solid rgba(229, 9, 20, 0.5)"
                            : "1px solid rgba(255, 255, 255, 0.05)",
                          cursor: "pointer",
                          fontSize: "0.8rem",
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.08)";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.03)";
                          }
                        }}
                      >
                        <div>
                          <div className={`fw-semibold ${isSelected ? "text-danger" : "text-light"}`}>
                            {item.name}
                          </div>
                          <div className="text-secondary" style={{ fontSize: "0.66rem" }}>
                            {item.state}
                          </div>
                        </div>
                        {isSelected && (
                          <i className="fa-solid fa-circle-check text-danger small"></i>
                        )}
                      </button>
                    </div>
                  );
                })
              ) : (
                <div className="col-12 py-3 text-center text-secondary small">
                  <i className="fa-solid fa-magnifying-glass mb-2 fs-5 d-block text-secondary opacity-50"></i>
                  No supported cities match "{searchTerm}".
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 border-top border-secondary border-opacity-25 d-flex align-items-center justify-content-between flex-wrap gap-2">
          <button
            type="button"
            onClick={clearCity}
            className="btn btn-sm btn-link text-secondary text-decoration-none p-0 d-flex align-items-center gap-1"
            style={{ fontSize: "0.78rem" }}
          >
            <i className="fa-solid fa-earth-asia text-danger"></i>
            <span>Browse All India (No City Selected)</span>
          </button>

          <button
            type="button"
            onClick={closeCityModal}
            className="btn btn-sm btn-secondary-cinema py-1 px-3"
            style={{ fontSize: "0.8rem" }}
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
