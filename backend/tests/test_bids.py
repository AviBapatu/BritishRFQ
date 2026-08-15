import pytest
@pytest.mark.asyncio
async def test_create_rfq_and_submit_bid(client):
    # 1. Create a dummy RFQ
    rfq_data = {
        "title": "Test RFQ",
        "status": "OPEN",
        "bid_start_at": "2023-01-01T00:00:00Z", # Ensure this is in the past
        "bid_close_at": "2099-01-01T00:00:00Z", # Ensure this is in the future
        "forced_close_at": "2099-01-01T01:00:00Z",
        "pickup_date": "2099-01-05T00:00:00Z",
        "trigger_window_minutes": 10,
        "extension_minutes": 5,
        "extension_trigger": "ANY_BID"
    }
    response = await client.post("/api/rfqs", json=rfq_data)
    assert response.status_code == 201
    rfq_id = response.json()["id"]

    # 2. Submit the first bid (should succeed)
    bid_1_payload = {
        "rfq_id": rfq_id,
        "supplier_id": "SUPP-01",
        "carrier_name": "Carrier A",
        "transit_time": "5 days",
        "quote_validity": "2099-01-05T00:00:00Z",
        "freight_charge": 8000,
        "origin_charge": 1000,
        "destination_charge": 1000
    }
    headers = {"Idempotency-Key": "00000000-0000-0000-0000-000000000123"}
    
    res1 = await client.post("/api/bids", json=bid_1_payload, headers=headers)
    assert res1.status_code == 201
    assert res1.json()["total_value"] == 10000

    # 3. Test Idempotency (Same key, should return 201 and not create a new bid)
    res2 = await client.post("/api/bids", json=bid_1_payload, headers=headers)
    assert res2.status_code == 201
    assert res2.json()["id"] == res1.json()["id"] # Must return the exact same bid

    # 4. Test Strict L1 Rule (Tie bid should fail)
    bid_tie_payload = {
        "rfq_id": rfq_id,
        "supplier_id": "SUPP-02",
        "carrier_name": "Carrier B",
        "transit_time": "5 days",
        "quote_validity": "2099-01-05T00:00:00Z",
        "freight_charge": 8000,
        "origin_charge": 1000,
        "destination_charge": 1000
    }
    res_tie = await client.post("/api/bids", json=bid_tie_payload, headers={"Idempotency-Key": "00000000-0000-0000-0000-000000000456"})
    assert res_tie.status_code == 400 # Strict lower rule
