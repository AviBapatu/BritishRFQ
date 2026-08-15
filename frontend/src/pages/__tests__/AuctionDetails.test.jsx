import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import AuctionDetails from '../AuctionDetails';

// Mock the API and hook
vi.mock('@/api/auctionApi', () => ({
  getRFQDetails: vi.fn().mockResolvedValue({
    rfq: {
      id: 1001,
      name: 'Test RFQ-1001',
      status: 'OPEN',
      pickup_date: '2023-01-01T00:00:00Z',
      bid_start_at: '2023-01-01T00:00:00Z',
      bid_close_at: '2099-01-01T00:00:00Z',
      extension_minutes: 5,
      trigger_window_minutes: 10
    },
    bids: [],
    activity_logs: []
  }),
  submitBidAPI: vi.fn()
}));

vi.mock('@/hooks/useAuctionSocket', () => ({
  default: vi.fn()
}));

describe('Auction Details Page', () => {
  it('displays mock auction data', async () => {
    render(
      <BrowserRouter>
        <AuctionDetails rfqId={1001} />
      </BrowserRouter>
    );

    // Initial loading state
    expect(screen.getByText('Loading auction details...')).toBeInTheDocument();

    // Because the component sets state in useEffect, we await the mock data render
    const title = await screen.findByText('Test RFQ-1001');
    expect(title).toBeInTheDocument();
    
    // Check if the status badge rendered correctly ('OPEN')
    expect(screen.getByText('OPEN')).toBeInTheDocument();
  });
});
