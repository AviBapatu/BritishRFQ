from locust import HttpUser, task, between
from datetime import datetime, timedelta, timezone
from uuid import uuid4
import random
import itertools

bid_counter = itertools.count(start=400000, step=-1)

class SupplierUser(HttpUser):
    wait_time = between(0.1, 1.0)
    rfq_id = None

    def on_start(self):
        pass

    @task
    def submit_bid(self):
        supplier_id = f"locust_supplier_{random.randint(1, 1000)}"
        now = datetime.now(timezone.utc)
        
        # Freight strictly decreases by 0.01 on every single generated bid
        freight = next(bid_counter) / 100.0
        
        payload = {
            "rfq_id": 52,
            "supplier_id": supplier_id,
            "carrier_name": f"Carrier {supplier_id}",
            "transit_time": "2 days",
            "quote_validity": (now + timedelta(days=30)).isoformat(),
            "freight_charge": freight,
            "origin_charge": 100.0,
            "destination_charge": 100.0
        }
        
        self.client.post(
            "/api/bids", 
            json=payload, 
            headers={"Idempotency-Key": str(uuid4())}
        )

    @task(3)
    def view_auction(self):
        self.client.get("/api/rfqs/52")
