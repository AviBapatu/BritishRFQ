from fastapi import WebSocket
from typing import Dict, List
import asyncio

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, rfq_id: int):
        await websocket.accept()
        if rfq_id not in self.active_connections:
            self.active_connections[rfq_id] = []
        self.active_connections[rfq_id].append(websocket)

    def disconnect(self, websocket: WebSocket, rfq_id: int):
        if rfq_id in self.active_connections:
            self.active_connections[rfq_id].remove(websocket)

            if not self.active_connections[rfq_id]:
                del self.active_connections[rfq_id]

    async def broadcast_to_rfq(self, rfq_id: int, payload: dict):
        if rfq_id in self.active_connections:
            tasks = [connection.send_json(payload) for connection in self.active_connections[rfq_id]]
            await asyncio.gather(*tasks, return_exceptions=True)

manager = ConnectionManager()