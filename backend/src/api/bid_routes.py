from fastapi import APIRouter, Depends, HTTPException, Header, status, BackgroundTasks
from sqlmodel import Session, select
from sqlalchemy.exc import IntegrityError
from datetime import datetime, timezone
from uuid import UUID
import hashlib
import json

from core.database import get_session
from models.domain import RFQ, Bid, BidCreate, BidRead, ActivityLog, RFQStatus
from engine.auction_rules import evaluate_extension
from engine.worker import schedule_auction_closure
from ws.manager import manager

router = APIRouter()

def compute_payload_hash(bid_in: BidCreate) -> str:
    canonical = json.dumps({
        "rfq_id": bid_in.rfq_id,
        "supplier_id": bid_in.supplier_id,
        "carrier_name": bid_in.carrier_name,
        "transit_time": bid_in.transit_time,
        "freight_charge": str(bid_in.freight_charge),
        "origin_charge": str(bid_in.origin_charge),
        "destination_charge": str(bid_in.destination_charge),
    }, sort_keys=True)
    return hashlib.sha256(canonical.encode()).hexdigest()

@router.post("/bids", response_model=BidRead, status_code=status.HTTP_201_CREATED)
def submit_bid(
    bid_in: BidCreate,
    background_tasks: BackgroundTasks,
    idempotency_key: UUID = Header(alias="Idempotency-Key"),
    session: Session = Depends(get_session)
):
    current_time = datetime.now(timezone.utc)
    incoming_hash = compute_payload_hash(bid_in)

    existing_bid = session.exec(
        select(Bid).where(
            Bid.supplier_id == bid_in.supplier_id,
            Bid.idempotency_key == idempotency_key
        )
    ).one_or_none()

    if existing_bid:
        if existing_bid.payload_hash != incoming_hash:
            raise HTTPException(
                status_code=422,
                detail="Idempotency key already used with a different payload"
            )
        return existing_bid

    # will select the row we want to update then queues every request one by one so we can update everything inorder
    rfq = session.exec(
        select(RFQ).where(RFQ.id == bid_in.rfq_id).with_for_update()
    ).one_or_none()
    if not rfq:
        raise HTTPException(status_code=404, detail="RFQ not found")
    
    bid_close_at = rfq.bid_close_at.replace(tzinfo=timezone.utc) if rfq.bid_close_at.tzinfo is None else rfq.bid_close_at
    bid_start_at = rfq.bid_start_at.replace(tzinfo=timezone.utc) if rfq.bid_start_at.tzinfo is None else rfq.bid_start_at

    if rfq.status != RFQStatus.OPEN or current_time >= bid_close_at:
        raise HTTPException(status_code=400, detail="Auction is closed for bidding")

    if current_time < bid_start_at:
        raise HTTPException(status_code=400, detail="Auction has not started yet")

    new_bid_total = bid_in.freight_charge + bid_in.origin_charge + bid_in.destination_charge

    prev_bids = session.exec(select(Bid).where(Bid.rfq_id == rfq.id).order_by(Bid.total_value.asc(), Bid.created_at.asc())).all()

    if prev_bids:
        prev_l1_supplier = prev_bids[0].supplier_id
        if new_bid_total >= prev_bids[0].total_value:
            raise HTTPException(status_code=400, detail="Bid must be strictly lower than the current L1 bid")
    else:
        prev_l1_supplier = None

    prev_supplier_rank = next(
        (index for index, b in enumerate(prev_bids) if b.supplier_id == bid_in.supplier_id),
        None
    )

    new_bid = Bid(
        **bid_in.model_dump(),
        idempotency_key=idempotency_key,
        payload_hash=incoming_hash,
        total_value=new_bid_total,
        created_at=current_time
    )

    session.add(new_bid)
    session.flush()

    new_bids = session.exec(
        select(Bid).where(Bid.rfq_id == rfq.id).order_by(Bid.total_value.asc(), Bid.created_at.asc())
    ).all()

    new_l1_supplier = new_bids[0].supplier_id
    new_supplier_rank = next(index for index, b in enumerate(new_bids) if b.supplier_id == bid_in.supplier_id)

    l1_changed = prev_l1_supplier != new_l1_supplier
    rank_changed = prev_supplier_rank != new_supplier_rank

    extended, new_close, reason = evaluate_extension(
        rfq=rfq,
        bid_time=current_time,
        rank_changed=rank_changed,
        l1_changed=l1_changed
    )

    if extended:
        old_close_str = rfq.bid_close_at.isoformat()
        rfq.bid_close_at = new_close
        session.add(rfq)
        
        extension_log = ActivityLog(
            rfq_id=rfq.id,
            event_type="AUCTION_EXTENDED",
            reason=reason,
            metadata_snapshot=json.dumps({"old_close": old_close_str, "new_close": new_close.isoformat()})
        )
        session.add(extension_log)
        
        schedule_auction_closure(rfq)

    bid_log = ActivityLog(
        rfq_id=rfq.id,
        event_type="BID_SUBMITTED",
        metadata_snapshot=json.dumps({"bid_value": new_bid.total_value, "new_rank": new_supplier_rank + 1})
    )
    session.add(bid_log)

    try:
        session.commit()
    except IntegrityError:
        session.rollback()
        existing_bid = session.exec(
            select(Bid).where(
                Bid.supplier_id == bid_in.supplier_id,
                Bid.idempotency_key == idempotency_key
            )
        ).one_or_none()
        if existing_bid:
            return existing_bid
        raise HTTPException(status_code=409, detail="Conflict during bid submission, please retry")

    session.refresh(new_bid)
    
    background_tasks.add_task(
        manager.broadcast_to_rfq,
        rfq.id,
        {"type": "RANK_UPDATE", "message": "New bid received"}
    )
    if extended:
        background_tasks.add_task(
            manager.broadcast_to_rfq,
            rfq.id,
            {"type": "AUCTION_EXTENDED", "message": reason, "new_close": rfq.bid_close_at.isoformat()}
        )
        
    return new_bid
