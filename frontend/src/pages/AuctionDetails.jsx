import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Countdown from '@/components/Countdown';
import BidForm from '@/components/BidForm';
import RankingTable from '@/components/RankingTable';
import ActivityLog from '@/components/ActivityLog';
import useAuctionSocket from '@/hooks/useAuctionSocket';
import { getRFQDetails, submitBidAPI } from '@/api/auctionApi';

export default function AuctionDetails() {
  const { id } = useParams();
  const rfqId = parseInt(id, 10);
  const [bids, setBids] = useState([]);
  const [logs, setLogs] = useState([]);
  const [rfq, setRfq] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAuctionData = useCallback(async () => {
    try {
      const data = await getRFQDetails(rfqId);
      setRfq({
        ...data.rfq,
        bid_start_at: data.rfq.bid_start_at + "Z",
        bid_close_at: data.rfq.bid_close_at + "Z",
        forced_close_at: data.rfq.forced_close_at + "Z",
        pickup_date: data.rfq.pickup_date + "Z",
        created_at: data.rfq.created_at + "Z",
      });
      setBids(data.bids.map(b => ({
        ...b,
        totalValue: b.total_value,
        carrierName: b.carrier_name,
        time: new Date(b.created_at + "Z").toLocaleTimeString()
      })));
      setLogs(data.activity_logs.map(log => ({
        id: log.id,
        eventType: log.event_type,
        message: JSON.parse(log.metadata_snapshot)?.bid_value 
            ? `New Bid: £${JSON.parse(log.metadata_snapshot).bid_value}` 
            : log.reason || "Event occurred",
        time: new Date(log.created_at + "Z").toLocaleTimeString()
      })));
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [rfqId]);

  useEffect(() => {
    fetchAuctionData();
  }, [fetchAuctionData]);

  const handleRankUpdate = useCallback(() => { fetchAuctionData(); }, [fetchAuctionData]);
  const handleAuctionExtended = useCallback((data) => {
    setRfq(prev => ({ ...prev, bidCloseAt: data.new_close }));
    fetchAuctionData();
  }, [fetchAuctionData]);
  const handleAuctionClosed = useCallback(() => { fetchAuctionData(); }, [fetchAuctionData]);

  useAuctionSocket(rfqId, {
    onRankUpdate: handleRankUpdate,
    onAuctionExtended: handleAuctionExtended,
    onAuctionClosed: handleAuctionClosed,
  });

  const currentL1 = bids.length > 0 ? bids[0].totalValue : null;

  const handleBidSubmit = async (data) => {
    try {
      await submitBidAPI({
        rfq_id: rfqId,
        supplier_id: "demo_supplier", // In reality, this comes from auth context
        carrier_name: "You (Demo Carrier)",
        transit_time: "2 days", // Hardcoded for demo
        quote_validity: new Date(new Date().getTime() + 86400000).toISOString(), // +1 day
        freight_charge: data.freight,
        origin_charge: data.origin,
        destination_charge: data.dest
      }, crypto.randomUUID());
      // We don't update local state here! We wait for the RANK_UPDATE WebSocket event
      // to trigger a re-fetch, guaranteeing consistency with the server.
    } catch (err) {
      alert(`Bid rejected: ${err.message}`);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading auction details...</div>;
  if (error) return (
    <div className="p-8 text-center">
      <p className="text-destructive mb-4">Error: {error}</p>
      <Link to="/auctions" className="text-primary underline">← Back to all auctions</Link>
    </div>
  );
  if (!rfq) return <div className="p-8 text-center">Auction not found. <Link to="/auctions" className="text-primary underline">← Back</Link></div>;

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-7xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{rfq.name || `RFQ #${rfq.id}`}</h1>
          <p className="text-muted-foreground mt-1">RFQ ID: {rfq.id} • Pickup: {new Date(rfq.pickup_date).toLocaleDateString()}</p>
        </div>
        <Badge variant={rfq.status === 'OPEN' ? 'default' : 'secondary'} className="text-sm px-3 py-1">
          {rfq.status}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: RFQ Info & Ranking */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Auction Information</CardTitle>
              <CardDescription>Details and rules for this specific RFQ</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground font-medium">Start Time</p>
                  <p>{new Date(rfq.bid_start_at).toLocaleTimeString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground font-medium">Close Time</p>
                  <p>{new Date(rfq.bid_close_at).toLocaleTimeString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground font-medium">Extension</p>
                  <p>{rfq.extension_minutes} minutes</p>
                </div>
                <div>
                  <p className="text-muted-foreground font-medium">Trigger Window</p>
                  <p>Last {rfq.trigger_window_minutes} minutes</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <RankingTable bids={bids.map(b => ({ ...b, time: new Date(b.created_at).toLocaleTimeString(), carrierName: b.carrier_name }))} />
        </div>

        {/* Right Column: Countdown, Form & Logs */}
        <div className="space-y-6">
          <Countdown bidCloseAt={rfq.bid_close_at} />

          {rfq.status === 'OPEN' && (
            <BidForm 
              currentL1={currentL1} 
              onSubmit={handleBidSubmit} 
            />
          )}

          <ActivityLog logs={logs} />
        </div>
      </div>
    </div>
  );
}
