"""Criminal Network Analysis service using NetworkX."""
import networkx as nx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from typing import List, Dict, Any
from rapidfuzz import fuzz

from app.models.crime import Accused, CriminalNetwork, FIR, FIRAccusedLink
from app.schemas.crime import NetworkGraphResponse, NetworkNode, NetworkEdge


async def build_network_graph(db: AsyncSession, accused_id: int, depth: int = 2) -> NetworkGraphResponse:
    """Build criminal network graph for an accused person."""
    G = nx.Graph()
    visited = set()
    nodes = []
    edges = []

    async def expand_node(current_id: int, current_depth: int):
        if current_depth > depth or current_id in visited:
            return
        visited.add(current_id)

        # Get accused info
        result = await db.execute(select(Accused).where(Accused.id == current_id))
        accused = result.scalar_one_or_none()
        if not accused:
            return

        # Add node
        node_id = f"accused_{accused.id}"
        G.add_node(node_id, label=accused.name, type="accused", risk=accused.risk_score)
        nodes.append(NetworkNode(
            id=node_id,
            label=accused.name,
            type="accused",
            properties={
                "risk_score": accused.risk_score,
                "total_cases": accused.total_cases,
                "is_repeat": accused.is_repeat_offender,
                "gang_id": accused.gang_id,
            },
        ))

        # Get network connections
        net_result = await db.execute(
            select(CriminalNetwork).where(
                or_(
                    CriminalNetwork.source_accused_id == current_id,
                    CriminalNetwork.target_accused_id == current_id,
                )
            )
        )
        connections = net_result.scalars().all()

        for conn in connections:
            other_id = (
                conn.target_accused_id
                if conn.source_accused_id == current_id
                else conn.source_accused_id
            )

            # Get other accused
            other_result = await db.execute(select(Accused).where(Accused.id == other_id))
            other = other_result.scalar_one_or_none()
            if not other:
                continue

            other_node_id = f"accused_{other.id}"

            # Add edge
            edge_key = tuple(sorted([node_id, other_node_id]))
            if edge_key not in [(tuple(sorted([e.source, e.target]))) for e in edges]:
                G.add_edge(node_id, other_node_id, weight=conn.strength)
                edges.append(NetworkEdge(
                    source=node_id,
                    target=other_node_id,
                    relationship=conn.relationship_type,
                    weight=conn.strength,
                ))

            # Recurse
            await expand_node(other_id, current_depth + 1)

        # Add linked FIRs as nodes
        link_result = await db.execute(
            select(FIRAccusedLink).where(FIRAccusedLink.accused_id == current_id)
        )
        fir_links = link_result.scalars().all()

        for link in fir_links[:5]:  # Limit FIR nodes
            fir_result = await db.execute(select(FIR).where(FIR.id == link.fir_id))
            fir = fir_result.scalar_one_or_none()
            if fir:
                fir_node_id = f"fir_{fir.id}"
                if fir_node_id not in [n.id for n in nodes]:
                    nodes.append(NetworkNode(
                        id=fir_node_id,
                        label=f"FIR #{fir.fir_number}",
                        type="fir",
                        properties={
                            "crime_type": fir.crime_type,
                            "status": fir.status,
                            "location": fir.location_name,
                        },
                    ))
                    G.add_node(fir_node_id, label=fir.fir_number, type="fir")

                edges.append(NetworkEdge(
                    source=node_id,
                    target=fir_node_id,
                    relationship="accused_in",
                    weight=1.0,
                ))
                G.add_edge(node_id, fir_node_id, weight=1.0)

                # Add location node
                if fir.location_name:
                    loc_node_id = f"loc_{fir.location_name.replace(' ', '_').lower()}"
                    if loc_node_id not in [n.id for n in nodes]:
                        nodes.append(NetworkNode(
                            id=loc_node_id,
                            label=fir.location_name,
                            type="location",
                            properties={"lat": fir.latitude, "lng": fir.longitude},
                        ))
                        G.add_node(loc_node_id, label=fir.location_name, type="location")

                    edges.append(NetworkEdge(
                        source=fir_node_id,
                        target=loc_node_id,
                        relationship="occurred_at",
                        weight=0.5,
                    ))

    # Start expansion
    await expand_node(accused_id, 0)

    # Detect communities
    communities = []
    if len(G.nodes()) > 2:
        try:
            from networkx.algorithms.community import greedy_modularity_communities
            comms = greedy_modularity_communities(G)
            for i, comm in enumerate(comms):
                communities.append({
                    "id": i,
                    "members": list(comm),
                    "size": len(comm),
                })
        except Exception:
            pass

    # Key players (by degree centrality)
    key_players = []
    if G.nodes():
        centrality = nx.degree_centrality(G)
        sorted_nodes = sorted(centrality.items(), key=lambda x: -x[1])[:5]
        for node_id_str, cent in sorted_nodes:
            node_data = G.nodes.get(node_id_str, {})
            if node_data.get("type") == "accused":
                key_players.append({
                    "node_id": node_id_str,
                    "name": node_data.get("label", "Unknown"),
                    "centrality": cent,
                    "risk": node_data.get("risk", 0),
                })

    return NetworkGraphResponse(
        nodes=nodes,
        edges=edges,
        communities=communities,
        key_players=key_players,
    )


async def get_entity_resolution(db: AsyncSession, name: str) -> Dict[str, Any]:
    """Find potential matches for a name using fuzzy matching."""
    result = await db.execute(select(Accused))
    all_accused = result.scalars().all()

    matches = []
    for accused in all_accused:
        # Check name similarity
        name_score = fuzz.token_sort_ratio(name.lower(), accused.name.lower())

        # Check alias similarity
        alias_score = 0
        if accused.alias:
            alias_score = fuzz.token_sort_ratio(name.lower(), accused.alias.lower())

        best_score = max(name_score, alias_score)

        if best_score >= 60:  # Threshold
            matches.append({
                "id": accused.id,
                "name": accused.name,
                "alias": accused.alias,
                "confidence": best_score / 100.0,
                "match_type": "name" if name_score >= alias_score else "alias",
                "total_cases": accused.total_cases,
                "risk_score": accused.risk_score,
            })

    # Sort by confidence
    matches.sort(key=lambda x: -x["confidence"])

    return {
        "query": name,
        "matches": matches[:10],
        "total_potential_matches": len(matches),
        "high_confidence_matches": len([m for m in matches if m["confidence"] >= 0.8]),
    }
