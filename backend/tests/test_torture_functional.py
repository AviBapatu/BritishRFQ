import pytest
from datetime import datetime, timedelta, timezone
from main import app
from sqlmodel import Session

def test_strict_forcing_rejection(client, session: Session):
    """
    Ensure that once forced_close_at is reached, no further extensions occur and bids are rejected.
    """
    now = datetime.now(timezone.utc)
    
    # Set forced_close_at very close to bid_close_at to easily test the limit
    rfq_data = {
        "title": "Forcing Rejection Test",
        "bid_start_at": (now - timedelta(minutes=10)).isoformat(),
        "bid_close_at": (now + timedelta(minutes=2)).isoformat(),
        "forced_close_at": (now + timedelta(minutes=4)).isoformat(),
        "pickup_date": (now + timedelta(days=7)).isoformat(),
        "trigger_window_minutes": 5,
        "extension_minutes": 5,
        "extension_trigger": "ANY_RANK_CHANGE"
    }
    resp = client.post("/api/rfqs", json=rfq_data)
    assert resp.status_code == 201
    rfq_id = resp.json()["id"]

    # First bid triggers extension (rank change because no bids exist)
    # The bid_close_at was now+2. Extension is 5 mins.
    # But forced_close_at is now+4! So the extension should be capped at now+4.
    bid_payload = {
        "rfq_id": rfq_id,
        "supplier_id": "supp_1",
        "carrier_name": "Supp 1",
        "transit_time": "2 days",
        "quote_validity": (now + timedelta(days=30)).isoformat(),
        "freight_charge": 5000.0,
        "origin_charge": 100.0,
        "destination_charge": 100.0
    }
    
    bid_resp = client.post("/api/bids", json=bid_payload, headers={"Idempotency-Key": "key1"})
    assert bid_resp.status_code == 201

    rfq_resp = client.get(f"/api/rfqs/{rfq_id}")
    rfq = rfq_resp.json()["rfq"]
    
    # We expect bid_close_at to exactly match forced_close_at since it tried to extend beyond it
    assert rfq["bid_close_at"] == rfq["forced_close_at"]


def test_complex_ranking_rejection(client):
    """
    Validate that bids equal to L1 (even by 0.01) are aggressively rejected.
    """
    now = datetime.now(timezone.utc)
    rfq_data = {
        "title": "Rank Rejection Test",
        "bid_start_at": (now - timedelta(minutes=5)).isoformat(),
        "bid_close_at": (now + timedelta(hours=1)).isoformat(),
        "forced_close_at": (now + timedelta(hours=2)).isoformat(),
        "pickup_date": (now + timedelta(days=7)).isoformat()
    }
    rfq_id = client.post("/api/rfqs", json=rfq_data).json()["id"]

    # L1 bid: Total = 5000
    b1 = client.post("/api/bids", json={
        "rfq_id": rfq_id, "supplier_id": "supp_1", "carrier_name": "1",
        "transit_time": "1", "quote_validity": (now + timedelta(days=1)).isoformat(),
        "freight_charge": 4800.0, "origin_charge": 100.0, "destination_charge": 100.0
    }, headers={"Idempotency-Key": "111"})
    assert b1.status_code == 201

    # Bid equal to L1 (Total = 5000)
    b2 = client.post("/api/bids", json={
        "rfq_id": rfq_id, "supplier_id": "supp_2", "carrier_name": "2",
        "transit_time": "1", "quote_validity": (now + timedelta(days=1)).isoformat(),
        "freight_charge": 4900.0, "origin_charge": 50.0, "destination_charge": 50.0
    }, headers={"Idempotency-Key": "222"})
    assert b2.status_code == 400
    assert "strictly lower" in b2.json()["detail"].lower()

    # Bid slightly lower (Total = 4999.99)
    b3 = client.post("/api/bids", json={
        "rfq_id": rfq_id, "supplier_id": "supp_3", "carrier_name": "3",
        "transit_time": "1", "quote_validity": (now + timedelta(days=1)).isoformat(),
        "freight_charge": 4799.99, "origin_charge": 100.0, "destination_charge": 100.0
    }, headers={"Idempotency-Key": "333"})
    assert b3.status_code == 201
