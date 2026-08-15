import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

export default function BidForm({ currentL1, onSubmit }) {
  const [freight, setFreight] = useState('');
  const [origin, setOrigin] = useState('');
  const [dest, setDest] = useState('');

  const totalValue = (parseFloat(freight) || 0) + (parseFloat(origin) || 0) + (parseFloat(dest) || 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSubmit) {
      onSubmit({ freight: parseFloat(freight) || 0, origin: parseFloat(origin) || 0, dest: parseFloat(dest) || 0, totalValue });
    }
  };

  return (
    <div className="border rounded-md p-4">
      <p className="font-medium mb-1">Submit Quote</p>
      <p className="text-sm text-muted-foreground mb-4">
        {currentL1 ? `Must be below ₹${currentL1}` : "First quote wins L1"}
      </p>
      <form className="space-y-3" onSubmit={handleSubmit}>
        <div className="space-y-1">
          <Label htmlFor="freight">Freight Charge (₹)</Label>
          <Input id="freight" placeholder="0.00" type="number" step="0.01" min="0" value={freight} onChange={(e) => setFreight(e.target.value)} required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="origin">Origin (₹)</Label>
            <Input id="origin" placeholder="0.00" type="number" step="0.01" min="0" value={origin} onChange={(e) => setOrigin(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="dest">Dest (₹)</Label>
            <Input id="dest" placeholder="0.00" type="number" step="0.01" min="0" value={dest} onChange={(e) => setDest(e.target.value)} />
          </div>
        </div>
        <div className="flex justify-between items-center text-sm pt-1">
          <span className="text-muted-foreground">Total</span>
          <span className="font-bold text-lg text-primary">₹{totalValue.toFixed(2)}</span>
        </div>
        <Button type="submit" className="w-full">Submit Bid</Button>
      </form>
    </div>
  );
}
