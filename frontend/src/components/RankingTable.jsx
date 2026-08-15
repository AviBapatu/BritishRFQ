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
            <TableHead>Freight</TableHead>
            <TableHead>Origin</TableHead>
            <TableHead>Dest</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Valid Until</TableHead>
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
              <TableCell>£{bid.freight_charge.toFixed(2)}</TableCell>
              <TableCell>£{bid.origin_charge.toFixed(2)}</TableCell>
              <TableCell>£{bid.destination_charge.toFixed(2)}</TableCell>
              <TableCell className="font-medium">£{bid.totalValue.toFixed(2)}</TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {new Date(bid.quote_validity).toLocaleDateString()}
              </TableCell>
              <TableCell className="text-right text-muted-foreground">{bid.time}</TableCell>
            </TableRow>
          ))}
          {bids.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-muted-foreground py-6">
                No bids yet.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
