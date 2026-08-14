from fastapi import FastAPI
from api.rfq_routes import router as rfq_router
from api.bid_routes import router as bid_router
from core.database import engine
from engine.worker import start_scheduler
from sqlmodel import SQLModel

app = FastAPI(title="RFQ British Auction")

@app.on_event("startup")
def on_startup():
    SQLModel.metadata.create_all(engine)
    start_scheduler()

app.include_router(rfq_router, prefix="/api")
app.include_router(bid_router, prefix="/api")