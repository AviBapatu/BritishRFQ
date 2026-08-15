import pytest
import asyncio
import httpx
from datetime import datetime, timedelta, timezone
from uuid import uuid4
from sqlmodel import Session
from main import app
from models.domain import RFQ
from core.database import get_session
import json

@pytest.mark.asyncio
async def test_concurrent_bidding_race(session: Session, client):
    """
    Test that concurrent identical (and non-identical) requests don't cause duplicate L1 
    or violate database consistency under load.
    """
    # 1. Create RFQ
    now = datetime.now(timezone.utc)
    rfq_data = {
        "title": "Race Condition Test",
        "bid_start_at": (now - timedelta(minutes=5)).isoformat(),
        "bid_close_at": (now + timedelta(hours=1)).isoformat(),
        "forced_close_at": (now + timedelta(hours=2)).isoformat(),
        "pickup_date": (now + timedelta(days=7)).isoformat(),
        "trigger_window_minutes": 5,
        "extension_minutes": 5,
        "extension_trigger": "ANY_RANK_CHANGE"
    }
    
    resp = client.post("/api/rfqs", json=rfq_data)
    assert resp.status_code == 201
    rfq_id = resp.json()["id"]
    
    # 2. Fire 50 concurrent requests for different amounts and different suppliers
    # so we test the lock during ranking evaluation.
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as async_client:
        
        async def submit_bid(supplier_id: str, freight: float):
            return await async_client.post(
                "/api/bids",
                json={
                    "rfq_id": rfq_id,
                    "supplier_id": supplier_id,
                    "carrier_name": supplier_id,
                    "transit_time": "2 days",
                    "quote_validity": (now + timedelta(days=30)).isoformat(),
                    "freight_charge": freight,
                    "origin_charge": 100.0,
                    "destination_charge": 100.0
                },
                headers={"Idempotency-Key": str(uuid4())}
            )

        # Create tasks
        tasks = []
        for i in range(50):
            # Vary freight from 5000 down to 4000
            tasks.append(submit_bid(f"supplier_{i}", 5000.0 - (i * 10)))

        # Wait for all to fire concurrently
        results = await asyncio.gather(*tasks, return_exceptions=True)

    # Some might fail with 409 Conflict if they tried to bid concurrently and were rejected
    # or 400 if their bid ended up higher than the current L1 at the exact moment of execution.
    successes = [r for r in results if not isinstance(r, Exception) and r.status_code == 201]
    
    # Fetch final RFQ details
    rfq_resp = client.get(f"/api/rfqs/{rfq_id}")
    rfq_details = rfq_resp.json()
    
    # Assert at least one succeeded
    assert len(successes) > 0
    assert len(rfq_details["bids"]) == len(successes)
    
    # Verify the lowest total_value is exactly the L1 bid
    min_value = min([b["total_value"] for b in rfq_details["bids"]])
    assert rfq_details["rfq"]["current_l1_bid"] == min_value


@pytest.mark.asyncio
async def test_idempotency_race(session: Session, client):
    """
    Test that submitting the exact same idempotency key concurrently doesn't result in duplicate DB entries.
    """
    now = datetime.now(timezone.utc)
    rfq_data = {
        "title": "Idempotency Race Test",
        "bid_start_at": (now - timedelta(minutes=5)).isoformat(),
        "bid_close_at": (now + timedelta(hours=1)).isoformat(),
        "forced_close_at": (now + timedelta(hours=2)).isoformat(),
        "pickup_date": (now + timedelta(days=7)).isoformat()
    }
    resp = client.post("/api/rfqs", json=rfq_data)
    rfq_id = resp.json()["id"]

    idemp_key = str(uuid4())
    bid_payload = {
        "rfq_id": rfq_id,
        "supplier_id": "supplier_idem",
        "carrier_name": "Idem Carrier",
        "transit_time": "2 days",
        "quote_validity": (now + timedelta(days=30)).isoformat(),
        "freight_charge": 5000.0,
        "origin_charge": 100.0,
        "destination_charge": 100.0
    }

    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as async_client:
        async def submit_duplicate():
            return await async_client.post(
                "/api/bids",
                json=bid_payload,
                headers={"Idempotency-Key": idemp_key}
            )

        # Fire 20 exact same requests concurrently
        tasks = [submit_duplicate() for _ in range(20)]
        results = await asyncio.gather(*tasks)

    # Some will return 201 (the winner, and subsequent idempotency hits that read the result)
    # Some might hit the 409 conflict during concurrent flush.
    # What's important is that exactly 1 bid exists in the DB.
    
    rfq_resp = client.get(f"/api/rfqs/{rfq_id}")
    assert len(rfq_resp.json()["bids"]) == 1
