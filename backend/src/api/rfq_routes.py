from fastapi import APIRouter, Depends, HTTPException, status, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from core.database import get_session
from models.domain import RFQ, Bid, ActivityLog, RFQBase, RFQRead
from engine.worker import schedule_auction_closure
from ws.manager import manager

router = APIRouter()

@router.post("/rfqs", response_model=RFQRead, status_code=status.HTTP_201_CREATED)
async def create_rfq(rfq_in: RFQBase, session: AsyncSession = Depends(get_session)):
    rfq = RFQ(**rfq_in.model_dump())
    session.add(rfq)
    await session.commit()
    await session.refresh(rfq)
    
    schedule_auction_closure(rfq)
    
    return rfq

@router.get("/rfqs")
async def list_rfqs(session: AsyncSession = Depends(get_session)):
    rfqs_result = await session.execute(select(RFQ))
    rfqs = rfqs_result.scalars().all()
    result = []
    for rfq in rfqs:
        l1_bid_result = await session.execute(
            select(Bid).where(Bid.rfq_id == rfq.id).order_by(Bid.total_value.asc(), Bid.created_at.asc())
        )
        l1_bid = l1_bid_result.scalars().first()
        result.append({
            **rfq.model_dump(),
            "current_l1_bid": l1_bid.total_value if l1_bid else None,
            "current_l1_supplier": l1_bid.supplier_id if l1_bid else None
        })
    return result

@router.get("/rfqs/{rfq_id}")
async def get_rfq_details(rfq_id: int, session: AsyncSession = Depends(get_session)):
    rfq_result = await session.execute(select(RFQ).where(RFQ.id == rfq_id))
    rfq = rfq_result.scalar_one_or_none()
    if not rfq:
        raise HTTPException(status_code=404, detail="RFQ not found")
        
    bids_result = await session.execute(select(Bid).where(Bid.rfq_id == rfq_id).order_by(Bid.total_value.asc(), Bid.created_at.asc()).limit(100))
    bids = bids_result.scalars().all()
    
    logs_result = await session.execute(select(ActivityLog).where(ActivityLog.rfq_id == rfq_id).order_by(ActivityLog.created_at.desc()).limit(100))
    logs = list(reversed(logs_result.scalars().all()))
    
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
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, rfq_id)
