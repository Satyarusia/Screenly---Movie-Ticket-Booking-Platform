const LoadingSpinner = ({ message = "Loading cinema experience..." }) => {
  return (
    <div className="d-flex flex-column justify-content-center align-items-center py-5" style={{ minHeight: "50vh" }}>
      <div className="position-relative mb-4">
        <div
          className="spinner-border"
          style={{ width: "3.5rem", height: "3.5rem", color: "#e50914" }}
          role="status"
        ></div>
        <span
          className="position-absolute top-50 start-50 translate-middle d-flex align-items-center justify-content-center"
        >
          <i className="fa-solid fa-film text-danger" style={{ fontSize: "1.1rem" }}></i>
        </span>
      </div>
      <p className="text-secondary fw-semibold fs-6 mb-0">{message}</p>
    </div>
  );
};

export default LoadingSpinner;
