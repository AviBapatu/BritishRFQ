import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getRFQList } from '@/api/auctionApi';

export default function AuctionList() {
  const [rfqs, setRfqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getRFQList()
      .then(data => setRfqs(data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading auctions...</div>;
  if (error) return <div className="p-8 text-center text-destructive">Error: {error}</div>;

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Live Auctions</h1>
          <p className="text-muted-foreground mt-1">All active and recent British Auction RFQs</p>
        </div>
        <Button asChild>
          <Link to="/auctions/create">+ Create RFQ</Link>
        </Button>
      </div>

      {rfqs.length === 0 ? (
        <Card className="text-center py-16">
          <CardContent>
            <p className="text-muted-foreground mb-4">No auctions yet. Be the first to create one!</p>
            <Button asChild>
              <Link to="/auctions/create">Create RFQ</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {rfqs.map(rfq => (
            <Link key={rfq.id} to={`/auctions/${rfq.id}`} className="block">
              <Card className="hover:border-primary/50 hover:shadow-md transition-all duration-200 cursor-pointer">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{rfq.title}</CardTitle>
                    <Badge variant={rfq.status === 'OPEN' ? 'default' : 'secondary'}>
                      {rfq.status}
                    </Badge>
                  </div>
                  <CardDescription>RFQ #{rfq.id}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground font-medium">Pickup Date</p>
                      <p>{new Date(rfq.pickup_date + "Z").toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground font-medium">Closes At</p>
                      <p>{new Date(rfq.bid_close_at + "Z").toLocaleTimeString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground font-medium">Current L1</p>
                      <p className="font-semibold text-primary">
                        {rfq.current_l1_bid ? `£${rfq.current_l1_bid.toFixed(2)}` : 'No bids yet'}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground font-medium">L1 Supplier</p>
                      <p>{rfq.current_l1_supplier ?? '—'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
