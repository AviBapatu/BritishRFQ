import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function RankingTable({ bids }) {
  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">Rank</TableHead>
            <TableHead>Carrier</TableHead>
            <TableHead>Total</TableHead>
            <TableHead className="text-right">Time</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {bids.map((bid) => (
            <TableRow key={bid.id} className={bid.rank === 1 ? "bg-muted/50" : ""}>
              <TableCell className="font-medium">
                {bid.rank === 1 ? "🏆 L1" : `L${bid.rank}`}
              </TableCell>
              <TableCell>{bid.carrierName}</TableCell>
              <TableCell className="font-medium">£{bid.totalValue.toFixed(2)}</TableCell>
              <TableCell className="text-right text-muted-foreground">{bid.time}</TableCell>
            </TableRow>
          ))}
          {bids.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                No bids yet.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
