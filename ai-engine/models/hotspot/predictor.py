"""KDE-based predicted hotspot generation with adaptive bandwidth & spatial grid merging."""

import numpy as np
from sklearn.neighbors import KernelDensity


def predict_hotspots(cases: list[dict], max_hotspots: int = 25) -> list[dict]:
    """Return representative high-density hotspot points and calibrated scores."""
    points = []
    for case in cases:
        lat = case.get("latitude")
        lon = case.get("longitude")
        if lat is not None and lon is not None:
            try:
                points.append([float(lat), float(lon)])
            except (ValueError, TypeError):
                continue

    coordinates = np.asarray(points, dtype=float)
    if len(coordinates) < 3:
        return [
            {
                "latitude": float(point[0]),
                "longitude": float(point[1]),
                "confidence": 0.5,
                "top_factors": ["Insufficient history; displaying observed incident location."]
            }
            for point in coordinates
        ]

    # Silverman's Rule of Thumb for Kernel Density Bandwidth Selection
    std_lat = np.std(coordinates[:, 0])
    std_lon = np.std(coordinates[:, 1])
    std_avg = float(std_lat + std_lon) / 2.0
    if std_avg <= 0.0:
        std_avg = 0.035

    n = len(coordinates)
    bandwidth = 1.06 * std_avg * (n ** -0.2)
    # Constrain to reasonable bounds
    bandwidth = max(0.005, min(0.1, bandwidth))

    model = KernelDensity(kernel="gaussian", bandwidth=bandwidth).fit(coordinates)
    log_densities = model.score_samples(coordinates)
    densities = np.exp(log_densities)

    # Ranked spatial grid merging (cluster aggregation)
    ranking = np.argsort(densities)[::-1]
    selected: list[int] = []
    grid_threshold = 0.02  # Approximately 2.2km grid boundaries

    for index in ranking:
        pt = coordinates[index]
        if all(np.linalg.norm(pt - coordinates[kept]) > grid_threshold for kept in selected):
            selected.append(int(index))
        if len(selected) >= max_hotspots:
            break

    max_density = float(densities[ranking[0]])
    if max_density == 0.0:
        max_density = 1.0

    return [
        {
            "latitude": float(coordinates[index][0]),
            "longitude": float(coordinates[index][1]),
            "confidence": round(float(densities[index] / max_density), 4),
            "top_factors": [
                "High local incident density",
                f"Spatially recurring crime locations (bandwidth: {round(bandwidth, 4)})"
            ],
        }
        for index in selected
    ]
