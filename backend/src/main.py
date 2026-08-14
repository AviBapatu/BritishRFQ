from fastapi import FastAPI
from api.routes import router as api_router
from core.database import engine
from sqlmodel import SQLModel

app = FastAPI(title="RFQ British Auction")

@app.on_event("startup")
def on_startup():
    SQLModel.metadata.create_all(engine)

app.include_router(api_router, prefix="/api")