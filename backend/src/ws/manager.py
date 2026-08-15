from fastapi import WebSocket
from typing import Dict, List
import asyncio
import json
import os
import redis.asyncio as redis

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
CHANNEL_NAME = "rfq_updates"

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[int, List[WebSocket]] = {}
        self.redis: redis.Redis = None
        self.pubsub: redis.client.PubSub = None
        self._listener_task: asyncio.Task = None

    async def startup(self):
        self.redis = redis.from_url(REDIS_URL, decode_responses=True)
        self.pubsub = self.redis.pubsub()
        await self.pubsub.subscribe(CHANNEL_NAME)
        self._listener_task = asyncio.create_task(self._listen_to_redis())

    async def shutdown(self):
        if self._listener_task:
            self._listener_task.cancel()
        if self.pubsub:
            await self.pubsub.unsubscribe(CHANNEL_NAME)
            await self.pubsub.close()
        if self.redis:
            await self.redis.close()

    async def _listen_to_redis(self):
        try:
            async for message in self.pubsub.listen():
                if message["type"] == "message":
                    data = json.loads(message["data"])
                    rfq_id = data.get("rfq_id")
                    payload = data.get("payload")
                    if rfq_id and payload:
                        await self._send_to_local(rfq_id, payload)
        except asyncio.CancelledError:
            pass
        except Exception as e:
            print(f"Redis PubSub listener error: {e}")

    async def connect(self, websocket: WebSocket, rfq_id: int):
        await websocket.accept()
        if rfq_id not in self.active_connections:
            self.active_connections[rfq_id] = []
        self.active_connections[rfq_id].append(websocket)

    def disconnect(self, websocket: WebSocket, rfq_id: int):
        if rfq_id in self.active_connections:
            if websocket in self.active_connections[rfq_id]:
                self.active_connections[rfq_id].remove(websocket)
            if not self.active_connections[rfq_id]:
                del self.active_connections[rfq_id]

    async def broadcast_to_rfq(self, rfq_id: int, payload: dict):
        if self.redis:
            message = json.dumps({"rfq_id": rfq_id, "payload": payload})
            await self.redis.publish(CHANNEL_NAME, message)
        else:
            # Fallback if Redis is not started
            await self._send_to_local(rfq_id, payload)

    async def _send_to_local(self, rfq_id: int, payload: dict):
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