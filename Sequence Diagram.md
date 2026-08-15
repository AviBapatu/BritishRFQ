<div align="center">
  <a href="./README.md">README</a> &nbsp;|&nbsp; 
  <a href="./System%20Architecture.md">System Architecture</a> &nbsp;|&nbsp; 
  <strong>Sequence Diagram</strong> &nbsp;|&nbsp;
  <a href="./Schema%20Design.md">Schema Design</a> &nbsp;|&nbsp;
  <a href="./Stress%20Test%20Results.md">Stress Test Results</a>
</div>

<br/>

# Sequence Diagram

```mermaid
sequenceDiagram
    autonumber
    actor Supplier as React Client
    participant API as FastAPI Router
    participant Engine as Auction Engine
    participant DB as PostgreSQL (via DAL)
    participant Worker as Background Worker (APScheduler)
    participant Redis as Redis Pub/Sub
    participant WS as WebSocket Manager

    Supplier->>API: POST /bids (freight, origin, dest, Idempotency-Key)
    API->>API: Idempotency Check
    API->>Engine: Validate Payload & Initiate Process
    
    Note over Engine, DB: --- BEGIN ATOMIC TRANSACTION ---
    Engine->>DB: BEGIN
    Engine->>DB: SELECT * FROM rfqs WHERE id = X FOR UPDATE
    Note over DB: RFQ row is LOCKED. Other bids and Workers wait here.
    
    Engine->>Engine: Validate Auction Status & Bid Value
    Engine->>DB: INSERT INTO bids (charges, total_value)
    Engine->>DB: Calculate new Ranks
    
    Engine->>Engine: Evaluate Extension Rules (Time window, Trigger type)
    
    alt If extension triggered
        Engine->>Engine: Calc new close time (Clamped to forced_close_at)
        Engine->>DB: UPDATE rfqs SET bid_close_at = new_close_time
        Engine->>DB: INSERT INTO activity_logs (AUCTION_EXTENDED)
    end
    
    Engine->>DB: INSERT INTO activity_logs (BID_SUBMITTED)
    Engine->>DB: COMMIT
    Note over DB: RFQ row UNLOCKED. Truth is officially updated.
    Note over Engine, DB: --- END ATOMIC TRANSACTION ---

    par External Side Effects
        Engine->>Worker: Schedule close attempt for bid_close_at (replaces old job)
        Engine->>API: Add WS broadcast to FastAPI BackgroundTasks
        API->>WS: Broadcast Delta (Rank Change / Time Ext)
        WS->>Redis: Publish Message to 'rfq_updates' Channel
        Redis-->>WS: Deliver Message to Subscribed Instances
        WS-->>Supplier: Emit JSON {"type": "RANK_UPDATE", ...}
    end
    
    Engine-->>API: Process Complete
    API-->>Supplier: 201 Created (Success)
```
