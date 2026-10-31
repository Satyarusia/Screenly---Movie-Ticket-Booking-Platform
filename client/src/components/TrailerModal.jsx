export default function TrailerModal({ trailerData, onClose }) {
  if (!trailerData || !trailerData.isOpen) return null;

  const { youtubeKey, movieTitle } = trailerData;
  const videoSrc = youtubeKey
    ? `https://www.youtube-nocookie.com/embed/${youtubeKey}?autoplay=1&enablejsapi=1&rel=0`
    : `https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(
        `${movieTitle} official trailer`
      )}&autoplay=1`;

  const externalUrl = youtubeKey
    ? `https://www.youtube.com/watch?v=${youtubeKey}`
    : `https://www.youtube.com/results?search_query=${encodeURIComponent(
        `${movieTitle} official trailer`
      )}`;

  return (
    <div
      className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-3"
      style={{
        backgroundColor: "rgba(0, 0, 0, 0.92)",
        backdropFilter: "blur(12px)",
        zIndex: 99999,
      }}
      onClick={onClose}
    >
      <div
        className="rounded-4 overflow-hidden shadow-2xl border"
        style={{
          width: "100%",
          maxWidth: "860px",
          background: "#0c0e17",
          borderColor: "rgba(229, 9, 20, 0.45)",
          boxShadow: "0 0 40px rgba(229, 9, 20, 0.4)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="d-flex justify-content-between align-items-center px-4 py-3 border-bottom border-dark">
          <div className="d-flex align-items-center gap-2">
            <i className="fa-solid fa-circle-play text-danger fs-5"></i>
            <h5 className="text-white fw-bold mb-0">{movieTitle} &mdash; Official Trailer</h5>
          </div>
          <div className="d-flex align-items-center gap-2">
            <a
              href={externalUrl}
              target="_blank"
              rel="noreferrer"
              className="btn btn-sm btn-outline-danger py-1 px-2"
              style={{ fontSize: "0.75rem" }}
              title="Open video in new tab if player is restricted"
            >
              <i className="fa-solid fa-arrow-up-right-from-square me-1"></i> Open on YouTube
            </a>
            <button
              onClick={onClose}
              className="btn btn-sm btn-secondary-cinema rounded-circle d-flex align-items-center justify-content-center p-0"
              style={{ width: "32px", height: "32px" }}
            >
              <i className="fa-solid fa-xmark text-white"></i>
            </button>
          </div>
        </div>

        <div className="ratio ratio-16x9">
          <iframe
            src={videoSrc}
            title={`${movieTitle} Official Trailer`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>
        </div>
      </div>
    </div>
  );
}
