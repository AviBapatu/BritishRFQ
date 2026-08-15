from contextlib import asynccontextmanager
from fastapi import FastAPI
from api.rfq_routes import router as rfq_router
from api.bid_routes import router as bid_router
from core.database import engine
from engine.worker import start_scheduler
from sqlmodel import SQLModel

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup logic
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
    
    # Start background scheduler
    start_scheduler()
    
    # Start Redis WebSocket PubSub listener
    from ws.manager import manager
    await manager.startup()

    yield # App is running
    
    # Shutdown logic
    await manager.shutdown()

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="GoComet British Auction RFQ System", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"], # Vite frontend URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(rfq_router, prefix="/api")
app.include_router(bid_router, prefix="/api")