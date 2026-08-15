import { useEffect, useRef } from 'react';

export default function useAuctionSocket(rfqId, { onRankUpdate, onAuctionExtended, onAuctionClosed }) {
  const socketRef = useRef(null);

  useEffect(() => {
    if (!rfqId) return;

    // Use environment variable for WebSocket URL in production, hardcoded localhost for dev
    const wsUrl = `ws://localhost:8000/api/ws/rfqs/${rfqId}`;
    socketRef.current = new WebSocket(wsUrl);

    socketRef.current.onopen = () => {
      console.log(`Connected to WebSocket for RFQ: ${rfqId}`);
    };

    socketRef.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("WebSocket message received:", data);
        
        switch (data.type) {
          case 'RANK_UPDATE':
            if (onRankUpdate) onRankUpdate(data);
            break;
          case 'AUCTION_EXTENDED':
            if (onAuctionExtended) onAuctionExtended(data);
            break;
          case 'AUCTION_CLOSED':
            if (onAuctionClosed) onAuctionClosed(data);
            break;
          default:
            console.log("Unknown WebSocket event:", data);
        }
      } catch (err) {
        console.error("Failed to parse WebSocket message:", err);
      }
    };

    socketRef.current.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    socketRef.current.onclose = () => {
      console.log(`Disconnected from WebSocket for RFQ: ${rfqId}`);
    };

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [rfqId, onRankUpdate, onAuctionExtended, onAuctionClosed]);

  return socketRef.current;
}
