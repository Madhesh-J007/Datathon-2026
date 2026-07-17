"""KDE-based predicted hotspot generation for Karnataka crime coordinates."""

import numpy as np
from sklearn.neighbors import KernelDensity


def predict_hotspots(cases: list[dict], max_hotspots: int = 25) -> list[dict]:
    """Return representative high-density points and confidence scores."""
    coordinates = np.asarray([[item["latitude"], item["longitude"]] for item in cases], dtype=float)
    if len(coordinates) < 3:
        return [
            {"latitude": float(point[0]), "longitude": float(point[1]), "confidence": 0.5,
             "top_factors": ["Insufficient history; displaying observed incident location."]}
            for point in coordinates
        ]
    model = KernelDensity(kernel="gaussian", bandwidth=0.035).fit(coordinates)
    densities = np.exp(model.score_samples(coordinates))
    ranking = np.argsort(densities)[::-1]
    selected: list[int] = []
    for index in ranking:
        if all(np.linalg.norm(coordinates[index] - coordinates[kept]) > 0.02 for kept in selected):
            selected.append(int(index))
        if len(selected) >= max_hotspots:
            break
    max_density = float(densities[ranking[0]])
    return [
        {
            "latitude": float(coordinates[index][0]),
            "longitude": float(coordinates[index][1]),
            "confidence": round(float(densities[index] / max_density), 4),
            "top_factors": ["High local incident density", "Spatially recurring crime locations"],
        }
        for index in selected
    ]
