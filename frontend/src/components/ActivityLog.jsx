import React from 'react';

export default function ActivityLog({ logs }) {
  return (
    <div className="border rounded-md p-4">
      <p className="font-medium mb-3">Activity</p>
      <div className="space-y-3 max-h-64 overflow-y-auto text-sm">
        {logs.map((log) => (
          <div key={log.id} className="flex gap-3">
            <span className="text-muted-foreground shrink-0">{log.time}</span>
            <span className={log.eventType === 'AUCTION_EXTENDED' ? "text-amber-600 dark:text-amber-400" : ""}>
              {log.message}
            </span>
          </div>
        ))}
        {logs.length === 0 && <p className="text-muted-foreground">No activity yet.</p>}
      </div>
    </div>
  );
}
