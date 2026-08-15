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
        
        # Fetch current RFQ state to get the actual L1 bid
        response = self.client.get("/api/rfqs/52", name="/api/rfqs/[id]")
        if response.status_code == 200:
            data = response.json()
            bids = data.get("bids", [])
            if bids:
                current_l1 = bids[0]["total_value"]
                # We want total_value to be lower than current_l1.
                # total_value = freight + 200. So freight = target - 200
                target_total = current_l1 - random.uniform(0.01, 1.0)
                freight = max(0.01, target_total - 200.0)
            else:
                freight = 4000.0
        else:
            freight = 4000.0
        
        payload = {
            "rfq_id": 52,
            "supplier_id": supplier_id,
            "carrier_name": f"Carrier {supplier_id}",
            "transit_time": "2 days",
            "quote_validity": (now + timedelta(days=30)).isoformat(),
            "freight_charge": round(freight, 2),
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
