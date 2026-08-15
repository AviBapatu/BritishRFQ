import asyncio
from datetime import datetime, timedelta, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from core.database import engine
from models.domain import RFQ, RFQStatus, ExtensionTrigger

async def seed():
    async with AsyncSession(engine) as session:
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        rfq = RFQ(
            id=52,
            title="Locust Load Test RFQ",
            status=RFQStatus.OPEN,
            bid_start_at=now - timedelta(days=1),
            bid_close_at=now + timedelta(days=1),
            forced_close_at=now + timedelta(days=2),
            pickup_date=now + timedelta(days=10),
            trigger_window_minutes=10,
            extension_minutes=5,
            extension_trigger=ExtensionTrigger.ANY_RANK_CHANGE
        )
        session.add(rfq)
        await session.commit()
        print("Successfully seeded RFQ #52 for Locust testing!")

asyncio.run(seed())
