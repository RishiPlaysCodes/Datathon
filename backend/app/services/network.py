"""
Criminal Network Analysis & Entity Resolution Service
Uses NetworkX for graph analysis and RapidFuzz for entity matching.
Implements: community detection (Louvain), PageRank, shortest path,
entity resolution, and temporal network analysis.
"""
import json
from typing import List, Dict, Any, Optional, Tuple
from collections import defaultdict

import networkx as nx
from rapidfuzz import fuzz, process
from sqlmodel import Session, select

from app.models.crime import (
    Criminal, FIR, FIRCriminalLink, CriminalAssociateLink,
    Victim, Witness, FIRVictimLink, FIRWitnessLink
)



class NetworkAnalysisService:
    """
    Builds and analyzes criminal relationship graphs.
    Nodes: Criminals, Victims, Locations, FIRs
    Edges: co-accused, shared-victim, same-location, same-phone, etc.
    """

    def build_graph(self, db: Session) -> nx.Graph:
        """Build the full criminal network graph from database."""
        G = nx.Graph()

        # Get all criminals
        criminals = db.exec(select(Criminal)).all()
        for crim in criminals:
            G.add_node(
                f"criminal_{crim.id}",
                node_type="criminal",
                label=crim.name,
                risk_score=crim.risk_score,
                gang=crim.gang_affiliation or "",
                is_repeat=crim.is_repeat_offender,
                area=crim.active_area or "",
                id=crim.id
            )

        # Get all FIR-Criminal links to find co-accused
        links = db.exec(select(FIRCriminalLink)).all()
        fir_criminals: Dict[int, List[int]] = defaultdict(list)
        for link in links:
            fir_criminals[link.fir_id].append(link.criminal_id)

        # Create edges between co-accused (shared FIR)
        for fir_id, crim_ids in fir_criminals.items():
            for i in range(len(crim_ids)):
                for j in range(i + 1, len(crim_ids)):
                    src = f"criminal_{crim_ids[i]}"
                    tgt = f"criminal_{crim_ids[j]}"
                    if G.has_edge(src, tgt):
                        G[src][tgt]["weight"] += 1
                        G[src][tgt]["shared_firs"].append(fir_id)
                    else:
                        G.add_edge(
                            src, tgt,
                            relationship="co_accused",
                            weight=1,
                            shared_firs=[fir_id]
                        )

        # Add location-based connections (same active area)
        area_criminals: Dict[str, List[str]] = defaultdict(list)
        for crim in criminals:
            if crim.active_area:
                area_criminals[crim.active_area].append(f"criminal_{crim.id}")

        for area, nodes in area_criminals.items():
            for i in range(len(nodes)):
                for j in range(i + 1, len(nodes)):
                    if not G.has_edge(nodes[i], nodes[j]):
                        G.add_edge(
                            nodes[i], nodes[j],
                            relationship="same_area",
                            weight=0.5,
                            area=area
                        )

        return G


    def get_network_data(self, db: Session) -> Dict[str, Any]:
        """Get full network graph data for visualization."""
        G = self.build_graph(db)

        # Compute metrics
        pagerank = nx.pagerank(G, weight="weight") if len(G) > 0 else {}
        try:
            communities = nx.community.louvain_communities(G, weight="weight", seed=42)
        except Exception:
            communities = []

        # Assign community IDs
        node_community = {}
        for idx, comm in enumerate(communities):
            for node in comm:
                node_community[node] = idx

        # Build response
        nodes = []
        for node_id, data in G.nodes(data=True):
            nodes.append({
                "id": node_id,
                "label": data.get("label", node_id),
                "type": data.get("node_type", "unknown"),
                "risk_score": data.get("risk_score", 0),
                "gang": data.get("gang", ""),
                "is_repeat": data.get("is_repeat", False),
                "area": data.get("area", ""),
                "pagerank": round(pagerank.get(node_id, 0), 6),
                "community": node_community.get(node_id, -1),
                "entity_id": data.get("id", 0),
            })

        edges = []
        for src, tgt, data in G.edges(data=True):
            edges.append({
                "source": src,
                "target": tgt,
                "relationship": data.get("relationship", "unknown"),
                "weight": data.get("weight", 1),
                "shared_firs": data.get("shared_firs", []),
            })

        return {
            "nodes": nodes,
            "edges": edges,
            "stats": {
                "total_nodes": G.number_of_nodes(),
                "total_edges": G.number_of_edges(),
                "communities": len(communities),
                "density": round(nx.density(G), 4) if len(G) > 1 else 0,
            }
        }


    def get_criminal_network(self, db: Session, criminal_id: int, depth: int = 2) -> Dict[str, Any]:
        """Get the network around a specific criminal up to N hops."""
        G = self.build_graph(db)
        node_id = f"criminal_{criminal_id}"

        if node_id not in G:
            return {"nodes": [], "edges": [], "stats": {}}

        # BFS to get subgraph within depth
        visited = {node_id}
        frontier = {node_id}
        for _ in range(depth):
            next_frontier = set()
            for n in frontier:
                for neighbor in G.neighbors(n):
                    if neighbor not in visited:
                        visited.add(neighbor)
                        next_frontier.add(neighbor)
            frontier = next_frontier

        subgraph = G.subgraph(visited)
        pagerank = nx.pagerank(subgraph, weight="weight") if len(subgraph) > 1 else {}

        nodes = []
        for nid, data in subgraph.nodes(data=True):
            nodes.append({
                "id": nid,
                "label": data.get("label", nid),
                "type": data.get("node_type", "unknown"),
                "risk_score": data.get("risk_score", 0),
                "gang": data.get("gang", ""),
                "is_repeat": data.get("is_repeat", False),
                "area": data.get("area", ""),
                "pagerank": round(pagerank.get(nid, 0), 6),
                "is_center": nid == node_id,
                "entity_id": data.get("id", 0),
            })

        edges = []
        for src, tgt, data in subgraph.edges(data=True):
            edges.append({
                "source": src,
                "target": tgt,
                "relationship": data.get("relationship", "unknown"),
                "weight": data.get("weight", 1),
            })

        return {
            "nodes": nodes,
            "edges": edges,
            "center_node": node_id,
            "stats": {
                "total_nodes": subgraph.number_of_nodes(),
                "total_edges": subgraph.number_of_edges(),
                "degree": G.degree(node_id),
            }
        }


    def find_shortest_path(self, db: Session, source_id: int, target_id: int) -> Dict[str, Any]:
        """Find shortest connection between two criminals."""
        G = self.build_graph(db)
        src = f"criminal_{source_id}"
        tgt = f"criminal_{target_id}"

        if src not in G or tgt not in G:
            return {"path": [], "length": -1, "exists": False}

        try:
            path = nx.shortest_path(G, src, tgt)
            path_details = []
            for node_id in path:
                data = G.nodes[node_id]
                path_details.append({
                    "id": node_id,
                    "label": data.get("label", node_id),
                    "type": data.get("node_type", "unknown"),
                    "entity_id": data.get("id", 0),
                })
            return {
                "path": path_details,
                "length": len(path) - 1,
                "exists": True
            }
        except nx.NetworkXNoPath:
            return {"path": [], "length": -1, "exists": False}

    def get_key_players(self, db: Session, top_n: int = 10) -> List[Dict[str, Any]]:
        """Get top criminals by PageRank (key brokers in network)."""
        G = self.build_graph(db)
        if len(G) == 0:
            return []

        pagerank = nx.pagerank(G, weight="weight")
        degree_centrality = nx.degree_centrality(G)
        betweenness = nx.betweenness_centrality(G, weight="weight")

        # Combine metrics
        combined = {}
        for node_id in G.nodes():
            data = G.nodes[node_id]
            if data.get("node_type") == "criminal":
                combined[node_id] = {
                    "id": node_id,
                    "label": data.get("label", ""),
                    "entity_id": data.get("id", 0),
                    "risk_score": data.get("risk_score", 0),
                    "gang": data.get("gang", ""),
                    "pagerank": round(pagerank.get(node_id, 0), 6),
                    "degree_centrality": round(degree_centrality.get(node_id, 0), 4),
                    "betweenness": round(betweenness.get(node_id, 0), 6),
                    "connections": G.degree(node_id),
                }

        # Sort by combined score
        sorted_players = sorted(
            combined.values(),
            key=lambda x: x["pagerank"] + x["betweenness"],
            reverse=True
        )
        return sorted_players[:top_n]

    def get_communities(self, db: Session) -> List[Dict[str, Any]]:
        """Detect criminal communities/gangs using Louvain."""
        G = self.build_graph(db)
        if len(G) == 0:
            return []

        try:
            communities = nx.community.louvain_communities(G, weight="weight", seed=42)
        except Exception:
            return []

        result = []
        for idx, comm in enumerate(communities):
            members = []
            for node_id in comm:
                data = G.nodes[node_id]
                if data.get("node_type") == "criminal":
                    members.append({
                        "id": node_id,
                        "label": data.get("label", ""),
                        "entity_id": data.get("id", 0),
                        "risk_score": data.get("risk_score", 0),
                        "gang": data.get("gang", ""),
                    })
            if members:
                # Determine primary gang affiliation
                gangs = [m["gang"] for m in members if m["gang"]]
                primary_gang = max(set(gangs), key=gangs.count) if gangs else "Unknown"
                result.append({
                    "community_id": idx,
                    "size": len(members),
                    "members": members,
                    "primary_gang": primary_gang,
                })

        return sorted(result, key=lambda x: x["size"], reverse=True)



class EntityResolutionService:
    """
    Resolves duplicate entities using fuzzy matching.
    "Ravi Kumar", "R Kumar", "Ravi K" -> same person
    Uses: name similarity + phone matching + address overlap + area proximity
    """

    def __init__(self):
        self.name_threshold = 70  # RapidFuzz score threshold
        self.phone_weight = 30
        self.name_weight = 40
        self.area_weight = 15
        self.alias_weight = 15

    def find_duplicates(self, db: Session, min_confidence: float = 0.6) -> List[Dict[str, Any]]:
        """Find potential duplicate criminal records."""
        criminals = db.exec(select(Criminal)).all()
        duplicates = []
        processed_pairs = set()

        for i, crim_a in enumerate(criminals):
            for j, crim_b in enumerate(criminals):
                if i >= j:
                    continue
                pair_key = (min(crim_a.id, crim_b.id), max(crim_a.id, crim_b.id))
                if pair_key in processed_pairs:
                    continue

                confidence = self._compute_similarity(crim_a, crim_b)
                if confidence >= min_confidence:
                    processed_pairs.add(pair_key)
                    duplicates.append({
                        "entity_a": {
                            "id": crim_a.id,
                            "name": crim_a.name,
                            "alias": crim_a.alias,
                            "phone": crim_a.phone_number,
                            "area": crim_a.active_area,
                            "address": crim_a.address,
                        },
                        "entity_b": {
                            "id": crim_b.id,
                            "name": crim_b.name,
                            "alias": crim_b.alias,
                            "phone": crim_b.phone_number,
                            "area": crim_b.active_area,
                            "address": crim_b.address,
                        },
                        "confidence": round(confidence, 2),
                        "match_reasons": self._get_match_reasons(crim_a, crim_b),
                    })

        return sorted(duplicates, key=lambda x: x["confidence"], reverse=True)

    def _compute_similarity(self, a: Criminal, b: Criminal) -> float:
        """Compute overall similarity between two criminal records."""
        score = 0.0

        # Name similarity (using multiple fuzzy methods)
        name_score = self._name_similarity(a.name, b.name)
        # Also check against aliases
        if a.alias:
            name_score = max(name_score, self._name_similarity(a.alias, b.name))
        if b.alias:
            name_score = max(name_score, self._name_similarity(a.name, b.alias))
        score += (name_score / 100) * self.name_weight

        # Phone number match
        if a.phone_number and b.phone_number:
            if a.phone_number == b.phone_number:
                score += self.phone_weight
            elif a.phone_number[-6:] == b.phone_number[-6:]:
                score += self.phone_weight * 0.5

        # Area match
        if a.active_area and b.active_area:
            if a.active_area == b.active_area:
                score += self.area_weight

        # Alias cross-match
        if a.alias and b.alias:
            alias_score = fuzz.ratio(a.alias.lower(), b.alias.lower())
            score += (alias_score / 100) * self.alias_weight

        return score / 100  # Normalize to 0-1

    def _name_similarity(self, name_a: str, name_b: str) -> float:
        """Multi-method name comparison."""
        if not name_a or not name_b:
            return 0.0
        a = name_a.lower().strip()
        b = name_b.lower().strip()

        # Exact match
        if a == b:
            return 100.0

        # Standard ratio
        ratio = fuzz.ratio(a, b)
        # Partial ratio (for substrings like "Ravi" in "Ravi Kumar")
        partial = fuzz.partial_ratio(a, b)
        # Token sort (handles word reordering)
        token_sort = fuzz.token_sort_ratio(a, b)
        # Token set (handles extra tokens)
        token_set = fuzz.token_set_ratio(a, b)

        return max(ratio, partial, token_sort, token_set)

    def _get_match_reasons(self, a: Criminal, b: Criminal) -> List[str]:
        """Get human-readable reasons for the match."""
        reasons = []
        name_score = self._name_similarity(a.name, b.name)
        if name_score >= self.name_threshold:
            reasons.append(f"Name similarity: {name_score:.0f}%")
        if a.phone_number and b.phone_number and a.phone_number == b.phone_number:
            reasons.append("Same phone number")
        if a.active_area and b.active_area and a.active_area == b.active_area:
            reasons.append(f"Same operating area: {a.active_area}")
        if a.alias:
            alias_score = self._name_similarity(a.alias, b.name)
            if alias_score >= self.name_threshold:
                reasons.append(f"Alias '{a.alias}' matches name '{b.name}'")
        if b.alias:
            alias_score = self._name_similarity(b.alias, a.name)
            if alias_score >= self.name_threshold:
                reasons.append(f"Alias '{b.alias}' matches name '{a.name}'")
        return reasons

    def resolve_entity(self, db: Session, name: str) -> List[Dict[str, Any]]:
        """Search for a criminal by name using fuzzy matching."""
        criminals = db.exec(select(Criminal)).all()
        matches = []

        for crim in criminals:
            # Check name
            name_score = self._name_similarity(name, crim.name)
            # Check alias
            alias_score = 0
            if crim.alias:
                alias_score = self._name_similarity(name, crim.alias)

            best_score = max(name_score, alias_score)
            if best_score >= 55:  # Lower threshold for search
                matches.append({
                    "id": crim.id,
                    "name": crim.name,
                    "alias": crim.alias,
                    "confidence": round(best_score, 1),
                    "match_type": "alias" if alias_score > name_score else "name",
                    "risk_score": crim.risk_score,
                    "gang": crim.gang_affiliation,
                    "total_cases": crim.total_cases,
                    "area": crim.active_area,
                })

        return sorted(matches, key=lambda x: x["confidence"], reverse=True)[:10]


# Singleton instances
network_service = NetworkAnalysisService()
entity_resolution_service = EntityResolutionService()
