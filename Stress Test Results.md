<div align="center">
  <a href="./README.md">README</a> &nbsp;|&nbsp; 
  <a href="./System%20Architecture.md">System Architecture</a> &nbsp;|&nbsp; 
  <a href="./Sequence%20Diagram.md">Sequence Diagram</a> &nbsp;|&nbsp;
  <strong>Stress Test Results</strong>
</div>

<br/>

# Stress Test Results

Load testing was performed using **Locust** against a live local instance of the BritishRFQ backend (`http://localhost:8000`), simulating a high-concurrency swarm of suppliers simultaneously reading auction state and submitting bids.

---

## Test Configuration

| Parameter | Value |
|---|---|
| Tool | Locust |
| Target | `http://localhost:8000` |
| RFQ under test | RFQ ID `52` |
| Simulated suppliers | Up to 1,000 unique virtual suppliers |
| Supplier wait time | 0.1 – 1.0 s between requests |
| Task ratio | `view_auction` × 3 : `submit_bid` × 1 |
| Bid strategy | Each virtual supplier fetches current L1, then submits a bid `0.01–1.00` below it using a unique `Idempotency-Key` |

**Locust file:** [`backend/tests/locustfile.py`](./backend/tests/locustfile.py)

---

## Results Summary

### Aggregated (All Endpoints)

| Metric | Value |
|---|---|
| Total Requests | 4,542 |
| Total Failures | 753 |
| **Failure Rate** | **16.6%** |
| Total RPS | 106.3 req/s |
| Avg Response Time | 1,185 ms |
| Median Response Time | 1,200 ms |
| P95 Response Time | 3,600 ms |
| P99 Response Time | 5,500 ms |
| Min Response Time | 11 ms |
| Max Response Time | 9,107 ms |

---

### Per-Endpoint Breakdown

#### `POST /api/bids` — Bid Submission

| Metric | Value |
|---|---|
| Requests | 865 |
| Failures | 753 |
| **Failure Rate** | **87%** |
| Avg Response Time | 1,750 ms |
| Median Response Time | 1,500 ms |
| P95 | 3,700 ms |
| P99 | 5,500 ms |
| Min / Max | 18 ms / 7,003 ms |
| Total RPS | 20.25 req/s |

> **Note on the high failure rate:** All 753 failures are intentional, expected `400 Bad Request` responses — not crashes or data corruption. This test was run against the **pre-fix** validation logic which required every bid to beat the global L1. Because 1,000 virtual suppliers all race to undercut the same single L1 value simultaneously, only one bid per race window succeeds; the rest are correctly rejected. The race conditions were handled gracefully by the pessimistic `SELECT FOR UPDATE` lock — **zero data corruption or 500 errors were observed**. This has since been corrected per the spec: bids now only need to beat a supplier's own personal best.

---

#### `GET /api/rfqs/52` — Direct Auction Polling

| Metric | Value |
|---|---|
| Requests | 2,768 |
| Failures | **0** |
| Failure Rate | 0% |
| Avg Response Time | 1,057 ms |
| Median Response Time | 580 ms |
| P95 | 3,500 ms |
| P99 | 5,600 ms |
| Min / Max | 11 ms / 8,068 ms |
| Total RPS | 64.79 req/s |

---

#### `GET /api/rfqs/[id]` — Pre-bid State Fetch

| Metric | Value |
|---|---|
| Requests | 909 |
| Failures | **0** |
| Failure Rate | 0% |
| Avg Response Time | 1,037 ms |
| Median Response Time | 580 ms |
| P95 | 3,500 ms |
| P99 | 5,100 ms |
| Min / Max | 12 ms / 9,107 ms |
| Total RPS | 21.28 req/s |

---

## Key Observations

### Zero Race Condition Failures
Under a swarm of up to 1,000 concurrent virtual suppliers all targeting the same RFQ simultaneously, the system produced **zero 5xx errors** and **zero data integrity violations**. The PostgreSQL `SELECT FOR UPDATE` pessimistic lock on the RFQ row during bid evaluation ensured strictly monotonic, consistent rank calculation.

### Read Path is Fast & Resilient
The GET endpoints (`/api/rfqs/{id}`) sustained **~86 RPS combined** with a **0% failure rate** and a healthy **580 ms median**. The wide P99 (5.1–5.6 s) reflects contention from concurrent write locks during heavy bid storms — acceptable given a single-node, no-connection-pool test setup.

### Idempotency Holds Under Load
All bids were submitted with unique `Idempotency-Key` UUIDs. No duplicate bid insertions were observed across the entire run.

### POST Latency Under Contention
The bid submission path averages **1,750 ms** under sustained load due to:
1. A pre-bid `GET /api/rfqs/{id}` call per virtual user (to calculate the target bid)
2. PostgreSQL row-level lock wait time during concurrent transactions

This is expected behaviour for a pessimistic-lock design and would improve significantly with a connection pool (PgBouncer) and horizontal scaling (multiple Uvicorn workers behind a load balancer with Redis Pub/Sub).

---

## Running the Load Test

```bash
cd backend
source .venv/bin/activate
locust -f tests/locustfile.py
```

Open `http://localhost:8089`, configure the number of users and spawn rate, and point it at `http://localhost:8000`.
