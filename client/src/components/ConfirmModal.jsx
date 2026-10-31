/**
 * Reusable Confirmation Dialog Modal
 * Standardizes modal confirmation dialogs for destructive actions across all management pages.
 */
export default function ConfirmModal({
  isOpen,
  title = "Confirm Action",
  message = "Are you sure you want to proceed with this action?",
  confirmLabel = "Confirm",
  confirmVariant = "danger",
  onConfirm,
  onCancel,
  loading = false,
}) {
  if (!isOpen) return null;

  return (
    <div
      className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-3"
      style={{
        backgroundColor: "rgba(0, 0, 0, 0.85)",
        backdropFilter: "blur(8px)",
        zIndex: 99999,
      }}
      onClick={onCancel}
    >
      <div
        className="glass-panel p-4 p-md-5 border shadow-2xl fade-in"
        style={{ maxWidth: "460px", width: "100%", background: "#151828" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="d-flex align-items-center gap-3 mb-3">
          <div
            className={`rounded-circle d-flex align-items-center justify-content-center ${
              confirmVariant === "danger" ? "bg-danger" : "bg-warning"
            } bg-opacity-25 text-${confirmVariant}`}
            style={{ width: "44px", height: "44px" }}
          >
            <i className="fa-solid fa-triangle-exclamation fs-5"></i>
          </div>
          <h5 className="text-white fw-bold mb-0">{title}</h5>
        </div>

        <p className="text-secondary small mb-4 leading-relaxed">{message}</p>

        <div className="d-flex justify-content-end gap-2">
          <button
            type="button"
            className="btn btn-secondary-cinema btn-sm px-3"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="button"
            className={`btn btn-${confirmVariant} btn-sm px-4 fw-bold`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? (
              <span className="spinner-border spinner-border-sm me-1" role="status"></span>
            ) : null}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
