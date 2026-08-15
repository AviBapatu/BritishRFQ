import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export default function Countdown({ bidCloseAt }) {
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = new Date(bidCloseAt) - new Date();
      return Math.max(0, difference);
    };

    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [bidCloseAt]);

  const minutes = Math.floor((timeLeft / 1000 / 60) % 60);
  const seconds = Math.floor((timeLeft / 1000) % 60);
  const hours = Math.floor((timeLeft / (1000 * 60 * 60)) % 24);

  const formatTime = () => {
    if (timeLeft === 0) return "00:00";
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const isWarning = timeLeft > 0 && timeLeft <= 5 * 60 * 1000;
  const isExpired = timeLeft === 0;

  return (
    <Card className={cn("shadow-sm transition-colors", isWarning ? "border-destructive/50 bg-destructive/5 dark:bg-destructive/10" : "border-primary/50")}>
      <CardHeader className="pb-4">
        <CardTitle className={cn(
          "text-center text-sm font-medium uppercase tracking-wider",
          isWarning ? "text-destructive" : "text-muted-foreground"
        )}>
          {isExpired ? "Auction Closed" : "Time Remaining"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={cn(
          "text-center font-mono text-4xl font-bold tracking-tighter",
          isWarning ? "text-destructive animate-pulse" : "text-primary"
        )}>
          {formatTime()}
        </div>
        <p className="text-center text-xs text-muted-foreground mt-2">
          Closes at {new Date(bidCloseAt).toLocaleTimeString()}
        </p>
      </CardContent>
    </Card>
  );
}
