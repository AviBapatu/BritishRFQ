from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from datetime import datetime, timezone
import json

from ..core.database import get_session
from ..models.domain import RFQ, Bid, BidCreate, BidRead, ActivityLog, RFQStatus
from ..engine.auction_rules import evaluate_extension

router = APIRouter()

@router.post("/bids", response_model=BidRead, status_code=status.HTTP_201_CREATED)
def submit_bid(bid_in: BidCreate, session: Session = Depends(get_session)):
    current_time = datetime.now(timezone.utc)

    # will select the row we want to update then queues every request one by one so we can update everything inorder
    rfq = session.exec(
        select(RFQ).where(RFQ.id == bid_in.rfq_id).with_for_update()
    ).one_or_none()
    if not rfq:
        raise HTTPException(status_code=404, detail="RFQ not found")
    
    if rfq.status != RFQStatus.OPEN or current_time >= rfq.bid_close_at:
        raise HTTPException(status_code=400, detail="Auction is closed for bidding")

    prev_bids = session.exec(select(Bid).where(Bid.rfq_id == rfq.id).order_by(Bid.total_value.asc())).all()

    prev_l1_supplier = prev_bids[0].supplier_id if prev_bids else None

    prev_supplier_rank = next(
        (index for index, b in enumerate(prev_bids) if b.supplier_id == bid_in.supplier_id),
        None
    )

    new_bid = Bid(
        **bid_in.model_dump(),
        total_value=bid_in.freight_charge + bid_in.origin_charge + bid_in.destination_charge,
        created_at=current_time
    )

    session.add(new_bid)
    session.flush()

    new_bids = session.exec(
        select(Bid).where(Bid.rfq_id == rfq.id).order_by(Bid.total_value.asc())
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

    bid_log = ActivityLog(
        rfq_id=rfq.id,
        event_type="BID_SUBMITTED",
        metadata_snapshot=json.dumps({"bid_value": new_bid.total_value, "new_rank": new_supplier_rank + 1})
    )
    session.add(bid_log)
    session.commit()
    session.refresh(new_bid)

    return new_bid



