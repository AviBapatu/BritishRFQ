import asyncio
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlmodel import select
from datetime import datetime, timezone

from core.database import engine
from models.domain import RFQ, RFQStatus, ActivityLog
from ws.manager import manager

scheduler = AsyncIOScheduler()

async def check_and_close_auction(rfq_id: int):
    async_session = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )
    async with async_session() as session:
        # The Async equivalent of a hard pessimistic lock
        stmt = select(RFQ).where(RFQ.id == rfq_id).with_for_update()
        result = await session.execute(stmt)
        rfq = result.scalar_one_or_none()

        if not rfq or rfq.status != RFQStatus.OPEN:
            await session.commit()
            return

        current_time = datetime.now(timezone.utc).replace(tzinfo=None)

        forced_close_at = rfq.forced_close_at.replace(tzinfo=None)

        if current_time >= forced_close_at:
            rfq.status = RFQStatus.FORCE_CLOSED
            session.add(rfq)
            session.add(ActivityLog(
                rfq_id=rfq.id,
                event_type="RFQ_FORCE_CLOSED",
                reason="Forced close time reached"
            ))
            await session.commit()
            await manager.broadcast_to_rfq(rfq.id, {"type": "AUCTION_CLOSED", "message": "Auction was forcefully closed"})
            return

        bid_close_at = rfq.bid_close_at.replace(tzinfo=None)

        if current_time >= bid_close_at:
            rfq.status = RFQStatus.CLOSED
            session.add(rfq)
            session.add(ActivityLog(
                rfq_id=rfq.id,
                event_type="RFQ_CLOSED",
                reason="Bid close time reached with no further extensions"
            ))
            await session.commit()
            await manager.broadcast_to_rfq(rfq.id, {"type": "AUCTION_CLOSED", "message": "Auction has closed natively"})
            return
        await session.commit()

def start_scheduler():
    if not scheduler.running:
        scheduler.start()

def schedule_auction_closure(rfq: RFQ):
    # Job at bid_close_at (may get rescheduled on extensions)
    scheduler.add_job(
        check_and_close_auction,
        'date',
        run_date=rfq.bid_close_at,
        args=[rfq.id],
        id=f"rfq_close_{rfq.id}",
        replace_existing=True
    )
    scheduler.add_job(
        check_and_close_auction,
        'date',
        run_date=rfq.forced_close_at,
        args=[rfq.id],
        id=f"rfq_force_close_{rfq.id}",
        replace_existing=True
    )