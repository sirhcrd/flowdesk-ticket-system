from fastapi import WebSocket
from typing import Dict, List
import json
from datetime import datetime

class ConnectionManager:
    """Manages WebSocket connections for real-time updates"""
    
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
    
    async def connect(self, websocket: WebSocket, client_id: str):
        """Accept a WebSocket connection and store it"""
        await websocket.accept()
        self.active_connections[client_id] = websocket
    
    def disconnect(self, client_id: str):
        """Remove a WebSocket connection"""
        if client_id in self.active_connections:
            del self.active_connections[client_id]
    
    async def send_personal_message(self, message: str, client_id: str):
        """Send a message to a specific client"""
        if client_id in self.active_connections:
            try:
                await self.active_connections[client_id].send_text(message)
            except:
                # Connection is broken, remove it
                self.disconnect(client_id)
    
    async def broadcast(self, message: str):
        """Send a message to all connected clients"""
        disconnected_clients = []
        for client_id, connection in self.active_connections.items():
            try:
                await connection.send_text(message)
            except:
                disconnected_clients.append(client_id)
        
        # Clean up disconnected clients
        for client_id in disconnected_clients:
            self.disconnect(client_id)
    
    async def send_ticket_update(self, ticket_id: int, update_type: str, data: dict):
        """Send ticket update to relevant users"""
        message = {
            "type": update_type,
            "ticket_id": ticket_id,
            "data": data,
            "timestamp": str(datetime.utcnow())
        }
        await self.broadcast(json.dumps(message))

# Global connection manager instance
manager = ConnectionManager()