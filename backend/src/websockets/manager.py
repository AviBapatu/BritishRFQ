from fastapi import WebSocket
from typing import Dict, List
import asyncio

class ConnectionManager:
    # Initializing the dictionary to map user to their particular rfqid. To send auction specific data
    def __init__(self):
        self.active_connections: Dict[int, List[WebSocket]] = {}
    
    # Checking if rfqid is in the active conection and if yes then creating a room and then appending the particular websocket_id into the room. 
    async def connect(self, websocket: WebSocket, rfq_id: int):
        await websocket.accept()
        if rfq_id not in self.active_connections:
            self.active_connections[rfq_id] = []
        self.active_connections[rfq_id].append(websocket)

    # If rfqid is in active_connections and then removing the particular websocket_id
    # If rfqid exists chekcing if there are any users if not deleting the room
    def disconnect(self, websocket: WebSocket, rfq_id: int):
        if rfq_id in self.active_connections:
            self.active_connections[rfq_id].remove(websocket)

            if not self.active_connections[rfq_id]:
                del self.active_connections[rfq_id]

    # Sending the request to all the users at once by using async gather
    # If a instance got an error then chekcing it and then disconnecting it
    async def broadcast_to_rfq(self, rfq_id: int, payload: dict):
        if rfq_id not in self.active_connections:
            return

        connections = self.active_connections[rfq_id]
        if not connections:
            return

        tasks = [connection.send_json(payload) for connection in connections]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        for websocket, result in zip(connections, results):
            if isinstance(result, Exception):
                self.disconnect(websocket, rfq_id)

manager = ConnectionManager()