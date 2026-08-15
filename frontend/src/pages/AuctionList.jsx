import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getRFQList } from '@/api/auctionApi';

export default function AuctionList() {
  const [rfqs, setRfqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getRFQList()
      .then(data => setRfqs([...data].reverse()))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-muted-foreground">Loading...</p>;
  if (error) return <p className="text-destructive">Error: {error}</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Auctions</h1>
        <Button asChild size="sm">
          <Link to="/auctions/create">+ New RFQ</Link>
        </Button>
      </div>

      {rfqs.length === 0 ? (
        <p className="text-muted-foreground">No auctions yet. <Link to="/auctions/create" className="underline">Create one</Link>.</p>
      ) : (
        <div className="space-y-3">
          {rfqs.map(rfq => (
            <Link key={rfq.id} to={`/auctions/${rfq.id}`} className="block border rounded-md p-4 hover:bg-accent">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">{rfq.title}</span>
                <Badge variant={rfq.status === 'OPEN' ? 'default' : 'secondary'}>{rfq.status}</Badge>
              </div>
              <div className="flex gap-6 text-sm text-muted-foreground">
                <span>Pickup: {new Date(rfq.pickup_date + "Z").toLocaleDateString()}</span>
                <span>Closes: {new Date(rfq.bid_close_at + "Z").toLocaleTimeString()}</span>
                <span>L1: {rfq.current_l1_bid ? `£${rfq.current_l1_bid.toFixed(2)}` : '—'}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
