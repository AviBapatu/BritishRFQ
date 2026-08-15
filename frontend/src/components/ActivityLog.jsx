import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ActivityLog({ logs }) {
  return (
    <Card className="flex flex-col h-[400px]">
      <CardHeader className="shrink-0 pb-4">
        <CardTitle>Activity Log</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto pr-4">
        <div className="space-y-4">
          {logs.map((log) => (
            <div key={log.id} className="flex gap-3 text-sm">
              <div className="mt-0.5 text-muted-foreground whitespace-nowrap">
                {log.time}
              </div>
              <div>
                <p className={log.eventType === 'AUCTION_EXTENDED' ? "text-amber-600 font-medium dark:text-amber-500" : "font-medium"}>
                  {log.message}
                </p>
              </div>
            </div>
          ))}
          {logs.length === 0 && (
            <div className="text-center text-muted-foreground py-4 text-sm">
              No recent activity.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
