"""
Criminal Network & Entity Resolution API Endpoints
Module 2: Criminal Network & Relationship Analysis
"""
from typing import Any, List
from fastapi import APIRouter, Depends, Query
from sqlmodel import Session

from app.api import deps
from app.models.user import UserRole
from app.services.network import network_service, entity_resolution_service

router = APIRouter()


@router.get("/graph")
def get_full_network(
    db: Session = Depends(deps.get_db),
    current_user=Depends(deps.RoleChecker([
        UserRole.ADMIN, UserRole.SUPERVISOR,
        UserRole.INVESTIGATOR, UserRole.ANALYST
    ]))
) -> Any:
    """Get the full criminal network graph for visualization."""
    return network_service.get_network_data(db)


@router.get("/criminal/{criminal_id}")
def get_criminal_network(
    criminal_id: int,
    depth: int = Query(default=2, ge=1, le=4),
    db: Session = Depends(deps.get_db),
    current_user=Depends(deps.RoleChecker([
        UserRole.ADMIN, UserRole.SUPERVISOR,
        UserRole.INVESTIGATOR
    ]))
) -> Any:
    """Get network around a specific criminal."""
    return network_service.get_criminal_network(db, criminal_id, depth)


@router.get("/shortest-path")
def find_shortest_path(
    source_id: int = Query(...),
    target_id: int = Query(...),
    db: Session = Depends(deps.get_db),
    current_user=Depends(deps.RoleChecker([
        UserRole.ADMIN, UserRole.SUPERVISOR,
        UserRole.INVESTIGATOR
    ]))
) -> Any:
    """Find shortest connection between two criminals."""
    return network_service.find_shortest_path(db, source_id, target_id)



@router.get("/key-players")
def get_key_players(
    top_n: int = Query(default=10, ge=1, le=50),
    db: Session = Depends(deps.get_db),
    current_user=Depends(deps.RoleChecker([
        UserRole.ADMIN, UserRole.SUPERVISOR,
        UserRole.INVESTIGATOR, UserRole.ANALYST
    ]))
) -> Any:
    """Get top key players by network centrality metrics."""
    return network_service.get_key_players(db, top_n)


@router.get("/communities")
def get_communities(
    db: Session = Depends(deps.get_db),
    current_user=Depends(deps.RoleChecker([
        UserRole.ADMIN, UserRole.SUPERVISOR,
        UserRole.INVESTIGATOR, UserRole.ANALYST
    ]))
) -> Any:
    """Detect criminal communities/gangs using Louvain algorithm."""
    return network_service.get_communities(db)


@router.get("/entity-resolution/duplicates")
def find_duplicates(
    min_confidence: float = Query(default=0.6, ge=0.0, le=1.0),
    db: Session = Depends(deps.get_db),
    current_user=Depends(deps.RoleChecker([
        UserRole.ADMIN, UserRole.SUPERVISOR,
        UserRole.INVESTIGATOR
    ]))
) -> Any:
    """Find potential duplicate criminal records using fuzzy matching."""
    return entity_resolution_service.find_duplicates(db, min_confidence)


@router.get("/entity-resolution/search")
def resolve_entity(
    name: str = Query(..., min_length=2),
    db: Session = Depends(deps.get_db),
    current_user=Depends(deps.RoleChecker([
        UserRole.ADMIN, UserRole.SUPERVISOR,
        UserRole.INVESTIGATOR
    ]))
) -> Any:
    """Search for a criminal by name using fuzzy entity resolution."""
    return entity_resolution_service.resolve_entity(db, name)
