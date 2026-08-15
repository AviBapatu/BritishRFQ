from fastapi import APIRouter, Depends, HTTPException, status, WebSocket, WebSocketDisconnect
from sqlmodel import Session, select

from core.database import get_session
from models.domain import RFQ, Bid, ActivityLog, RFQBase, RFQRead
from engine.worker import schedule_auction_closure
from ws.manager import manager

router = APIRouter()

@router.post("/rfqs", response_model=RFQRead, status_code=status.HTTP_201_CREATED)
def create_rfq(rfq_in: RFQBase, session: Session = Depends(get_session)):
    rfq = RFQ(**rfq_in.model_dump())
    session.add(rfq)
    session.commit()
    session.refresh(rfq)
    
    schedule_auction_closure(rfq)
    
    return rfq

@router.get("/rfqs")
def list_rfqs(session: Session = Depends(get_session)):
    rfqs = session.exec(select(RFQ)).all()
    result = []
    for rfq in rfqs:
        l1_bid = session.exec(
            select(Bid).where(Bid.rfq_id == rfq.id).order_by(Bid.total_value.asc(), Bid.created_at.asc())
        ).first()
        result.append({
            **rfq.model_dump(),
            "current_l1_bid": l1_bid.total_value if l1_bid else None,
            "current_l1_supplier": l1_bid.supplier_id if l1_bid else None
        })
    return result

@router.get("/rfqs/{rfq_id}")
def get_rfq_details(rfq_id: int, session: Session = Depends(get_session)):
    rfq = session.exec(select(RFQ).where(RFQ.id == rfq_id)).one_or_none()
    if not rfq:
        raise HTTPException(status_code=404, detail="RFQ not found")
        
    bids = session.exec(select(Bid).where(Bid.rfq_id == rfq_id).order_by(Bid.total_value.asc(), Bid.created_at.asc())).all()
    logs = session.exec(select(ActivityLog).where(ActivityLog.rfq_id == rfq_id).order_by(ActivityLog.created_at.asc())).all()
    
    ranked_bids = []
    for index, bid in enumerate(bids):
        ranked_bids.append({
            **bid.model_dump(),
            "rank": index + 1,
            "rank_label": f"L{index + 1}"
        })
    
    return {
        "rfq": rfq,
        "bids": ranked_bids,
        "activity_logs": logs
    }

@router.websocket("/ws/rfqs/{rfq_id}")
async def websocket_rfq(websocket: WebSocket, rfq_id: int):
    await manager.connect(websocket, rfq_id)
    try:
        while True:
            # We don't expect messages from the client in this one-way broadcast,
            # but we need to receive to keep the connection alive and detect disconnects
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, rfq_id)

