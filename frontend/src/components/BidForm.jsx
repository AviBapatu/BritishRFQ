import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

export default function BidForm({ currentL1, onSubmit }) {
  const [freight, setFreight] = useState('');
  const [origin, setOrigin] = useState('');
  const [dest, setDest] = useState('');

  // Calculate total value derived from state
  const totalValue = (parseFloat(freight) || 0) + (parseFloat(origin) || 0) + (parseFloat(dest) || 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSubmit) {
      onSubmit({
        freight: parseFloat(freight) || 0,
        origin: parseFloat(origin) || 0,
        dest: parseFloat(dest) || 0,
        totalValue
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Submit Quote</CardTitle>
        <CardDescription>
          {currentL1 
            ? `Your bid must be lower than £${currentL1}`
            : "Be the first to submit a quote"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="freight">Freight Charge (£)</Label>
            <Input 
              id="freight" 
              placeholder="0.00" 
              type="number" 
              step="0.01" 
              min="0"
              value={freight}
              onChange={(e) => setFreight(e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="origin">Origin (£)</Label>
              <Input 
                id="origin" 
                placeholder="0.00" 
                type="number" 
                step="0.01" 
                min="0"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dest">Dest (£)</Label>
              <Input 
                id="dest" 
                placeholder="0.00" 
                type="number" 
                step="0.01" 
                min="0"
                value={dest}
                onChange={(e) => setDest(e.target.value)}
              />
            </div>
          </div>
          <div className="pt-2">
            <div className="flex justify-between items-center mb-4 text-sm">
              <span className="font-medium">Total Value:</span>
              <span className="font-bold text-lg text-primary">£{totalValue.toFixed(2)}</span>
            </div>
            <Button type="submit" className="w-full" size="lg">Submit Bid</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
