import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { createRFQAPI } from '@/api/auctionApi';

export default function CreateRFQ() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    pickup_date: '',
    bid_start_at: '',
    bid_close_at: '',
    forced_close_at: '',
    trigger_window_minutes: 5,
    extension_minutes: 5,
    extension_trigger: 'ANY_RANK_CHANGE'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const payload = {
        ...formData,
        bid_start_at: new Date(formData.bid_start_at).toISOString(),
        bid_close_at: new Date(formData.bid_close_at).toISOString(),
        forced_close_at: new Date(formData.forced_close_at).toISOString(),
        pickup_date: new Date(formData.pickup_date).toISOString(),
        trigger_window_minutes: parseInt(formData.trigger_window_minutes, 10),
        extension_minutes: parseInt(formData.extension_minutes, 10)
      };
      const newRfq = await createRFQAPI(payload);
      navigate(`/auctions/${newRfq.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold mb-6">Create RFQ</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <Label htmlFor="title">Title</Label>
          <Input id="title" name="title" value={formData.title} onChange={handleChange} required placeholder="e.g. London to Manchester - FTL" />
        </div>

        <div className="space-y-1">
          <Label htmlFor="pickup_date">Pickup Date</Label>
          <Input id="pickup_date" name="pickup_date" type="date" value={formData.pickup_date} onChange={handleChange} required />
        </div>

        <hr />

        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label htmlFor="bid_start_at">Bid Start</Label>
            <Input id="bid_start_at" name="bid_start_at" type="datetime-local" value={formData.bid_start_at} onChange={handleChange} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="bid_close_at">Bid Close</Label>
            <Input id="bid_close_at" name="bid_close_at" type="datetime-local" value={formData.bid_close_at} onChange={handleChange} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="forced_close_at">Forced Close</Label>
            <Input id="forced_close_at" name="forced_close_at" type="datetime-local" value={formData.forced_close_at} onChange={handleChange} required />
          </div>
        </div>

        <hr />

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="trigger_window_minutes">Trigger Window (min)</Label>
            <Input id="trigger_window_minutes" name="trigger_window_minutes" type="number" min="0" value={formData.trigger_window_minutes} onChange={handleChange} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="extension_minutes">Extension (min)</Label>
            <Input id="extension_minutes" name="extension_minutes" type="number" min="0" value={formData.extension_minutes} onChange={handleChange} required />
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="extension_trigger">Extension Trigger</Label>
          <select
            id="extension_trigger"
            name="extension_trigger"
            value={formData.extension_trigger}
            onChange={handleChange}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="ANY_BID">Any Bid</option>
            <option value="ANY_RANK_CHANGE">Any Rank Change</option>
            <option value="L1_RANK_CHANGE">L1 Change Only</option>
          </select>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Creating...' : 'Create RFQ'}
        </Button>
      </form>
    </div>
  );
}
