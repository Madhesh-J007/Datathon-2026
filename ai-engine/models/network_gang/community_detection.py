"""Community detection over verified criminal relationship links."""

import networkx as nx


def detect_communities(edges: list[dict]) -> list[dict]:
    graph = nx.Graph()
    for edge in edges:
        graph.add_edge(edge["source_person_id"], edge["target_person_id"], weight=edge.get("confidence", 1.0))
    if graph.number_of_edges() == 0:
        return []
    communities = nx.algorithms.community.greedy_modularity_communities(graph, weight="weight")
    return [
        {"member_person_ids": sorted(int(node) for node in community),
         "confidence": round(min(1.0, 0.5 + (len(community) / 10)), 4),
         "explanation": f"Detected connected community with {len(community)} members linked by verified relationships."}
        for community in communities if len(community) >= 2
    ]
