import React, { useState, useEffect } from 'react';

export default function Countdown({ bidCloseAt }) {
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    const calc = () => Math.max(0, new Date(bidCloseAt) - new Date());
    setTimeLeft(calc());
    const timer = setInterval(() => setTimeLeft(calc()), 1000);
    return () => clearInterval(timer);
  }, [bidCloseAt]);

  const h = Math.floor(timeLeft / (1000 * 60 * 60));
  const m = Math.floor((timeLeft / (1000 * 60)) % 60);
  const s = Math.floor((timeLeft / 1000) % 60);
  const pad = (n) => String(n).padStart(2, '0');

  const isWarning = timeLeft > 0 && timeLeft <= 5 * 60 * 1000;
  const display = timeLeft === 0 ? "Closed" : h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;

  return (
    <div className="border rounded-md p-4 text-center">
      <p className="text-sm text-muted-foreground mb-1">Time Remaining</p>
      <p className={`text-4xl font-bold tracking-tighter font-mono ${isWarning ? "text-destructive" : ""}`}>
        {display}
      </p>
      <p className="text-xs text-muted-foreground mt-1">
        Closes {new Date(bidCloseAt).toLocaleTimeString()}
      </p>
    </div>
  );
}
