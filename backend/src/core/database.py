from sqlmodel import Session, create_engine
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./dev.db")

engine_kwargs = {"echo": True}
if DATABASE_URL.startswith("postgresql"):
    engine_kwargs.update({
        "pool_size": 20,
        "max_overflow": 10,
        "pool_timeout": 30
    })

engine = create_engine(DATABASE_URL, **engine_kwargs)

def get_session():
    with Session(engine) as session:
        yield session