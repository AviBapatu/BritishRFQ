from datetime import datetime, timezone
from enum import Enum
from sqlmodel import SQLModel, Field, Relationship
from typing import List, Optional

class RFQStatus(str, Enum):
    OPEN = "OPEN"
    CLOSED = "CLOSED"
    FORCE_CLOSED = "FORCE_CLOSED"

class ExtensionTrigger(str, Enum):
    ANY_BID = "ANY_BID"
    ANY_RANK_CHANGE = "ANY_RANK_CHANGE"
    L1_RANK_CHANGE = "L1_RANK_CHANGE"

# classes named base are used for the request validation and response
# normal classes are for created table in the database

class RFQBase(SQLModel):
    title: str = Field(min_length=3, max_length=255)
    status: RFQStatus = Field(default=RFQStatus.OPEN, index=True)
    bid_close_at: datetime
    forced_close_at: datetime

    trigger_window_minutes: int = Field(ge=0)
    extension_minutes: int = Field(ge=0)
    extension_trigger: ExtensionTrigger

class RFQ(RFQBase, table=True):
    __tablename__ = "rfqs"
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    bids: List["Bid"] = Relationship(back_populates="rfq", cascade_delete=True)


class BidBase(SQLModel):
    rfq_id: int = Field(foreign_key="rfqs.id", index=True)
    supplier_id: str = Field(index=True)

    freight_charge: float = Field(gt=0, description="Must be greater than 0")
    origin_charge: float = Field(ge=0)
    destination_charge: float = Field(ge=0)

class Bid(BidBase, table=True):
    __tablename__ = 'bids'
    id: Optional[int] = Field(default=None, primary_key=True) 
    total_value: float = Field(index=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), index=True)
    rfq: Optional[RFQ] = Relationship(back_populates="bids")

class BidCreate(BidBase):
    pass

class ActivityLog(SQLModel, table=True):
    __tablename__ = "activity_logs"
    id: Optional[int] = Field(default=None, primary_key=True)
    rfq_id: int = Field(foreign_key="rfqs.id", index=True)

    event_type: str = Field(index=True)
    reason: Optional[str] = Field(default=None)
    metadata_snapshot: Optional[str] = Field(default=None, description="JSON string of state") # FIXED: spelling
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class RFQRead(RFQBase):
    id: int
    created_at: datetime

class BidRead(BidBase):
    id: int
    total_value: float
    created_at: datetime