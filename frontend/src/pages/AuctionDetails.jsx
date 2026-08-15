import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
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

  const supplierId = (() => {
    const key = 'britishrfq_supplier_id';
    if (!localStorage.getItem(key)) {
      localStorage.setItem(key, 'supplier_' + Math.random().toString(36).slice(2, 8));
    }
    return localStorage.getItem(key);
  })();

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

  useEffect(() => { fetchAuctionData(); }, [fetchAuctionData]);

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
        supplier_id: supplierId,
        carrier_name: supplierId,
        transit_time: "2 days",
        quote_validity: new Date(new Date().getTime() + 86400000).toISOString(),
        freight_charge: data.freight,
        origin_charge: data.origin,
        destination_charge: data.dest
      }, crypto.randomUUID());
    } catch (err) {
      alert(`Bid rejected: ${err.message}`);
    }
  };

  if (loading) return <p>Loading...</p>;
  if (error) return (
    <div>
      <p className="text-destructive mb-2">Error: {error}</p>
      <Link to="/auctions" className="underline text-sm">← Back</Link>
    </div>
  );
  if (!rfq) return <p>Auction not found. <Link to="/auctions" className="underline">← Back</Link></p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">{rfq.title || `RFQ #${rfq.id}`}</h1>
          <p className="text-sm text-muted-foreground">
            RFQ #{rfq.id} · Pickup {new Date(rfq.pickup_date).toLocaleDateString()} · You: <span className="font-mono font-medium text-foreground">{supplierId}</span>
          </p>
        </div>
        <Badge variant={rfq.status === 'OPEN' ? 'default' : 'secondary'}>{rfq.status}</Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: info + ranking */}
        <div className="lg:col-span-2 space-y-4">
          <div className="border rounded-md p-4 text-sm">
            <p className="font-medium mb-2">Auction Information</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-muted-foreground">
              <div><span className="block text-foreground font-medium">{new Date(rfq.bid_start_at).toLocaleTimeString()}</span>Start</div>
              <div><span className="block text-foreground font-medium">{new Date(rfq.bid_close_at).toLocaleTimeString()}</span>Close</div>
              <div><span className="block text-foreground font-medium">{rfq.extension_minutes}m</span>Extension</div>
              <div><span className="block text-foreground font-medium">Last {rfq.trigger_window_minutes}m</span>Window</div>
            </div>
          </div>

          <RankingTable bids={bids} />
        </div>

        {/* Right: countdown, bid form, log */}
        <div className="space-y-4">
          <Countdown bidCloseAt={rfq.bid_close_at} />
          {rfq.status === 'OPEN' && (
            <BidForm currentL1={currentL1} onSubmit={handleBidSubmit} />
          )}
          <ActivityLog logs={logs} />
        </div>
      </div>
    </div>
  );
}
