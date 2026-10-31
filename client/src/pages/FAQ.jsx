// client/src/pages/FAQ.jsx

export default function FAQ() {
  const faqs = [
    { q: "How long are seats held during checkout?", a: "Seats are temporarily held for 10 minutes to allow you to complete your reservation without losing your preferred spots." },
    { q: "Can I cancel specific seats from a booking?", a: "Yes! Screenly allows partial cancellation. You can choose to cancel only selected seats while keeping the rest of your party confirmed." },
    { q: "How do I receive my movie ticket?", a: "Immediately upon confirmation, your digital E-Pass is generated on-screen and an electronic confirmation is delivered to your registered email." },
    { q: "What does 'Theatrical Run Ended' mean?", a: "When a movie concludes its cinema run, bookings close automatically. However, you can still view its cast details, synopsis, and official trailers." },
  ];

  return (
    <div className="container py-5 fade-in" style={{ maxWidth: "850px" }}>
      <div className="glass-panel p-4 p-md-5">
        <h2 className="text-white fw-black mb-4">Frequently Asked Questions</h2>
        <div className="d-flex flex-column gap-3">
          {faqs.map((f, i) => (
            <div key={i} className="p-3 rounded-3" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <h6 className="text-white fw-bold mb-1">{f.q}</h6>
              <p className="text-secondary small mb-0">{f.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
