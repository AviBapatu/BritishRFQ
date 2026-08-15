from datetime import datetime, timedelta, timezone
from typing import Tuple, Optional
from models.domain import RFQ, ExtensionTrigger

def evaluate_extension(
    rfq: RFQ, 
    bid_time: datetime, 
    rank_changed: bool, 
    l1_changed: bool) -> Tuple[bool, Optional[datetime], Optional[str]]:
    # Will be returning should_extend, new_close_time, reason_string

    bid_close_at = rfq.bid_close_at.replace(tzinfo=timezone.utc) if rfq.bid_close_at.tzinfo is None else rfq.bid_close_at
    
    # checking if bidding is inside the trigger window
    trigger_start_time = bid_close_at - timedelta(minutes=rfq.trigger_window_minutes)

    if bid_time < trigger_start_time:
        return False, None, None # early to trigger an extension

    triggered = False
    reason = None

    if rfq.extension_trigger == ExtensionTrigger.ANY_BID:
        triggered = True
        reason = "Bid recieved within trigger window"
    elif rfq.extension_trigger == ExtensionTrigger.ANY_RANK_CHANGE and rank_changed:
        triggered = True
        reason = "Supplier rankings changed within trigger window"
    elif rfq.extension_trigger == ExtensionTrigger.L1_RANK_CHANGE and l1_changed:
        triggered = True
        reason = "L1 (Lowest Bidder) changed within trigger window"

    if not triggered:
        return False, None, None

    new_close_time = rfq.bid_close_at + timedelta(minutes=rfq.extension_minutes) # Current Close Time + Y minutes

    if new_close_time > rfq.forced_close_at:
        new_close_time = rfq.forced_close_at
        reason += " (Clamped to Forced Close Time)"
    
    if new_close_time <= rfq.bid_close_at:
        return False, None, None

    return True, new_close_time, reason
    
