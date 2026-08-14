from apscheduler.schedulers.background import BackgroundScheduler
from sqlmodel import Session, select
from datetime import datetime, timezone

from core.database import engine
from models.domain import RFQ, RFQStatus, ActivityLog

scheduler = BackgroundScheduler()

def check_and_close_auction(rfq_id: int):
    with Session(engine) as session:
        rfq = session.exec(
            select(RFQ).where(RFQ.id == rfq_id).with_for_update()
        ).one_or_none()

        if not rfq or rfq.status != RFQStatus.OPEN:
            session.commit()
            return

        current_time = datetime.now(timezone.utc)

        forced_close_at = rfq.forced_close_at
        if forced_close_at.tzinfo is None:
            forced_close_at = forced_close_at.replace(tzinfo=timezone.utc)

        if current_time >= forced_close_at:
            rfq.status = RFQStatus.FORCE_CLOSED
            session.add(rfq)
            session.add(ActivityLog(
                rfq_id=rfq.id,
                event_type="RFQ_FORCE_CLOSED",
                reason="Forced close time reached"
            ))
            session.commit()
            return

        bid_close_at = rfq.bid_close_at
        if bid_close_at.tzinfo is None:
            bid_close_at = bid_close_at.replace(tzinfo=timezone.utc)

        if current_time >= bid_close_at:
            rfq.status = RFQStatus.CLOSED
            session.add(rfq)
            session.add(ActivityLog(
                rfq_id=rfq.id,
                event_type="RFQ_CLOSED",
                reason="Bid close time reached with no further extensions"
            ))
            session.commit()
            return
        session.commit()

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