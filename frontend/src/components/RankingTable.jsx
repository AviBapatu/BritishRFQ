import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function RankingTable({ bids }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Live Ranking</CardTitle>
        <CardDescription>Current bids ranked by total value</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Rank</TableHead>
              <TableHead>Carrier</TableHead>
              <TableHead>Total Value</TableHead>
              <TableHead className="text-right">Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bids.map((bid) => (
              <TableRow key={bid.id} className={bid.rank === 1 ? "bg-primary/5" : ""}>
                <TableCell className="font-semibold">
                  {bid.rank === 1 ? <span className="text-primary flex items-center gap-1">🏆 L1</span> : `L${bid.rank}`}
                </TableCell>
                <TableCell>{bid.carrierName}</TableCell>
                <TableCell className="font-medium">£{bid.totalValue.toFixed(2)}</TableCell>
                <TableCell className="text-right text-muted-foreground">{bid.time}</TableCell>
              </TableRow>
            ))}
            {bids.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  No bids have been placed yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
