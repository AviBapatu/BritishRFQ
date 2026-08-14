from apscheduler.schedulers.background import BackgroundScheduler
from sqlmodel import Session, select
from datetime import datetime, timezone

from core.database import engine
from models.domain import RFQ, RFQStatus

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

        if current_time >= rfq.forced_close_at:
            rfq.status = RFQStatus.FORCE_CLOSED
            session.add(rfq)
            session.commit()
            return

        if current_time >= rfq.bid_close_at:
            rfq.status = RFQStatus.CLOSED
            session.add(rfq)
            session.commit()
            return
        session.commit()

def start_scheduler():
    if not scheduler.running:
        scheduler.start()

def schedule_auction_closure(rfq: RFQ):
    scheduler.add_job(
        check_and_close_auction,
        'date',
        run_date=rfq.bid_close_at,
        args=[rfq.id],
        id=f"rfq_close_{rfq.id}",
        replace_existing=True
    )