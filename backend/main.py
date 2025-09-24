from fastapi import FastAPI, HTTPException, Depends, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import uvicorn
import os
from pathlib import Path

from app.database import engine, get_db
from app.models import Base
from app.routers import auth, tickets, users, websocket
from app.websocket_manager import manager

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="FlowDesk API",
    description="A modern ticket management system with real-time updates",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure this properly for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["authentication"])
app.include_router(tickets.router, prefix="/api/tickets", tags=["tickets"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(websocket.router, prefix="/ws", tags=["websocket"])

# Mount static files
frontend_path = Path(__file__).parent.parent / "frontend"
app.mount("/static", StaticFiles(directory=frontend_path / "static"), name="static")

@app.get("/")
async def read_root():
    """Serve the main frontend application"""
    with open(frontend_path / "index.html", "r") as f:
        return HTMLResponse(content=f.read())

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "FlowDesk API"}

# WebSocket endpoint
@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await manager.connect(websocket, client_id)
    try:
        while True:
            data = await websocket.receive_text()
            # Process WebSocket messages here
            await manager.send_personal_message(f"Message received: {data}", client_id)
    except WebSocketDisconnect:
        manager.disconnect(client_id)

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)