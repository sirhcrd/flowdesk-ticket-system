from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from ..database import get_db
from ..models import Ticket, User, Comment, Tag, TicketTag
from ..schemas import TicketCreate, TicketUpdate, TicketResponse, TicketListResponse, CommentCreate, CommentResponse
from .auth import get_current_user

router = APIRouter()

@router.post("/", response_model=TicketResponse)
def create_ticket(
    ticket: TicketCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new ticket"""
    db_ticket = Ticket(
        title=ticket.title,
        description=ticket.description,
        status=ticket.status,
        priority=ticket.priority,
        creator_id=current_user.id,
        assignee_id=ticket.assignee_id
    )
    
    db.add(db_ticket)
    db.commit()
    db.refresh(db_ticket)
    
    # Add tags if provided
    if ticket.tag_ids:
        for tag_id in ticket.tag_ids:
            ticket_tag = TicketTag(ticket_id=db_ticket.id, tag_id=tag_id)
            db.add(ticket_tag)
        db.commit()
        db.refresh(db_ticket)
    
    return db_ticket

@router.get("/", response_model=List[TicketListResponse])
def list_tickets(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, le=1000),
    status: Optional[str] = None,
    priority: Optional[str] = None,
    assignee_id: Optional[int] = None,
    creator_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List tickets with optional filtering"""
    query = db.query(Ticket)
    
    # Apply filters
    if status:
        query = query.filter(Ticket.status == status)
    if priority:
        query = query.filter(Ticket.priority == priority)
    if assignee_id:
        query = query.filter(Ticket.assignee_id == assignee_id)
    if creator_id:
        query = query.filter(Ticket.creator_id == creator_id)
    
    tickets = query.offset(skip).limit(limit).all()
    return tickets

@router.get("/{ticket_id}", response_model=TicketResponse)
def get_ticket(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific ticket by ID"""
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return ticket

@router.put("/{ticket_id}", response_model=TicketResponse)
def update_ticket(
    ticket_id: int,
    ticket_update: TicketUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a ticket"""
    db_ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not db_ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    # Update fields
    update_data = ticket_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        if field != "tag_ids":
            setattr(db_ticket, field, value)
    
    # Handle tags
    if "tag_ids" in update_data:
        # Remove existing tags
        db.query(TicketTag).filter(TicketTag.ticket_id == ticket_id).delete()
        # Add new tags
        for tag_id in update_data["tag_ids"]:
            ticket_tag = TicketTag(ticket_id=ticket_id, tag_id=tag_id)
            db.add(ticket_tag)
    
    db.commit()
    db.refresh(db_ticket)
    return db_ticket

@router.delete("/{ticket_id}")
def delete_ticket(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a ticket"""
    db_ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not db_ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    db.delete(db_ticket)
    db.commit()
    return {"message": "Ticket deleted successfully"}

@router.post("/{ticket_id}/comments", response_model=CommentResponse)
def add_comment(
    ticket_id: int,
    comment: CommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add a comment to a ticket"""
    # Verify ticket exists
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    db_comment = Comment(
        content=comment.content,
        ticket_id=ticket_id,
        author_id=current_user.id,
        is_internal=comment.is_internal
    )
    
    db.add(db_comment)
    db.commit()
    db.refresh(db_comment)
    return db_comment