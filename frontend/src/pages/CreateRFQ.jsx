import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Convert local datetime-local strings to ISO strings for the backend
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
    <div className="container mx-auto p-4 md:p-8 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Create New RFQ</CardTitle>
          <CardDescription>Configure the details and rules for a new British Auction.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* General Info */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium border-b pb-2">General Information</h3>
              <div className="space-y-2">
                <Label htmlFor="title">RFQ Title (e.g. London to Manchester - Full Truckload)</Label>
                <Input id="title" name="title" value={formData.title} onChange={handleChange} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pickup_date">Pickup Date</Label>
                <Input id="pickup_date" name="pickup_date" type="date" value={formData.pickup_date} onChange={handleChange} required />
              </div>
            </div>

            {/* Crucial Time Configurations */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium border-b pb-2">Crucial Time Configurations</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bid_start_at">Bid Start Time</Label>
                  <Input id="bid_start_at" name="bid_start_at" type="datetime-local" value={formData.bid_start_at} onChange={handleChange} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bid_close_at">Bid Close Time</Label>
                  <Input id="bid_close_at" name="bid_close_at" type="datetime-local" value={formData.bid_close_at} onChange={handleChange} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="forced_close_at">Forced Close Time</Label>
                  <Input id="forced_close_at" name="forced_close_at" type="datetime-local" value={formData.forced_close_at} onChange={handleChange} required />
                </div>
              </div>
            </div>

            {/* British Auction Rules */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium border-b pb-2">British Auction Rules</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="trigger_window_minutes">Trigger Window (Minutes before close)</Label>
                  <Input id="trigger_window_minutes" name="trigger_window_minutes" type="number" min="0" value={formData.trigger_window_minutes} onChange={handleChange} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="extension_minutes">Extension Duration (Minutes)</Label>
                  <Input id="extension_minutes" name="extension_minutes" type="number" min="0" value={formData.extension_minutes} onChange={handleChange} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="extension_trigger">Extension Trigger</Label>
                <select 
                  id="extension_trigger" 
                  name="extension_trigger" 
                  value={formData.extension_trigger} 
                  onChange={handleChange}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="ANY_BID">Any Bid</option>
                  <option value="ANY_RANK_CHANGE">Any Rank Change</option>
                  <option value="L1_RANK_CHANGE">L1 Rank Change Only</option>
                </select>
              </div>
            </div>

            {error && <div className="text-destructive text-sm font-medium p-3 bg-destructive/10 rounded-md">{error}</div>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating..." : "Create RFQ"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
