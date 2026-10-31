// client/src/components/SeatHoldTimer.jsx
import { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";

export default function SeatHoldTimer({ durationSeconds = 600, onExpire }) {
  const [timeLeft, setTimeLeft] = useState(durationSeconds);
  const warnedRef = useRef({ at60: false, at30: false });

  useEffect(() => {
    if (timeLeft <= 0) {
      toast.error("Seat hold timer expired! Your reserved seats have been released.");
      if (onExpire) onExpire();
      return;
    }

    // Expiration warnings
    if (timeLeft === 60 && !warnedRef.current.at60) {
      warnedRef.current.at60 = true;
      toast("Hurry! Only 1 minute left before your seat hold expires.", {
        duration: 4000,
        style: {
          background: "#2a1c0d",
          color: "#f59e0b",
          border: "1px solid #f59e0b",
        },
      });
    }

    if (timeLeft === 30 && !warnedRef.current.at30) {
      warnedRef.current.at30 = true;
      toast.error("Final 30 seconds! Complete payment now to avoid losing your seats.");
    }

    const interval = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [timeLeft, onExpire]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formatted = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  let timerClass = "hold-timer-green";
  let statusText = "Seats Held";
  let icon = "fa-clock";

  if (timeLeft <= 60) {
    timerClass = "hold-timer-red";
    statusText = "Expiring Soon";
    icon = "fa-triangle-exclamation";
  } else if (timeLeft <= 300) {
    timerClass = "hold-timer-orange";
    statusText = "Holding";
    icon = "fa-stopwatch";
  }

  return (
    <div
      className={`px-3 py-1 rounded-pill d-inline-flex align-items-center gap-2 small fw-bold ${timerClass}`}
      role="timer"
      aria-live="polite"
    >
      <i className={`fa-solid ${icon}`}></i>
      <span>
        {statusText}: {formatted}
      </span>
    </div>
  );
}
