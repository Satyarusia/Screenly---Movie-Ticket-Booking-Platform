/**
 * Reusable EmptyState component
 * Replaces repetitive inline empty state markup across catalog, shows, search, profile, and admin panels.
 */
export default function EmptyState({
  icon = "fa-solid fa-clapperboard",
  title = "No Items Found",
  message = "No records matched your criteria.",
  actionLabel,
  onAction,
}) {
  return (
    <div className="glass-panel text-center py-5 px-3 fade-in my-3">
      <div
        className="d-inline-flex align-items-center justify-content-center rounded-circle mb-3"
        style={{
          width: "64px",
          height: "64px",
          background: "rgba(229, 9, 20, 0.1)",
          border: "1px solid rgba(229, 9, 20, 0.2)",
        }}
      >
        <i className={`${icon} fs-2 text-danger`}></i>
      </div>
      <h4 className="text-white fw-bold mb-2">{title}</h4>
      <p className="text-secondary small mb-4 mx-auto" style={{ maxWidth: "420px" }}>
        {message}
      </p>
      {actionLabel && onAction && (
        <button onClick={onAction} className="btn btn-secondary-cinema btn-sm px-4">
          {actionLabel}
        </button>
      )}
    </div>
  );
}
