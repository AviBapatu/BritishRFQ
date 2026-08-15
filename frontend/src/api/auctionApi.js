const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

export const createRFQAPI = async (rfqData) => {
  const response = await fetch(`${API_BASE}/rfqs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(rfqData)
  });
  if (!response.ok) {
    const error = await response.json();
    let errorMessage = 'Failed to create RFQ';
    if (error.detail) {
      errorMessage = Array.isArray(error.detail) 
        ? error.detail.map(e => e.msg).join(', ') 
        : error.detail;
    }
    throw new Error(errorMessage);
  }
  return response.json();
};

export const getRFQList = async () => {
  const response = await fetch(`${API_BASE}/rfqs`);
  if (!response.ok) throw new Error('Failed to fetch auctions');
  return response.json();
};

export const getRFQDetails = async (rfqId) => {
  const response = await fetch(`${API_BASE}/rfqs/${rfqId}`);
  if (!response.ok) throw new Error('Failed to fetch RFQ details');
  return response.json();
};

export const submitBidAPI = async (bidData, idempotencyKey) => {
  const response = await fetch(`${API_BASE}/bids`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey
    },
    body: JSON.stringify(bidData)
  });
  if (!response.ok) {
    const error = await response.json();
    let errorMessage = 'Failed to submit bid';
    if (error.detail) {
      errorMessage = Array.isArray(error.detail) 
        ? error.detail.map(e => e.msg).join(', ') 
        : error.detail;
    }
    throw new Error(errorMessage);
  }
  return response.json();
};
