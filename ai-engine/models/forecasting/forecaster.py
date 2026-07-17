"""Lightweight trend forecasting over daily crime registrations."""

from datetime import timedelta

import pandas as pd
from sklearn.linear_model import LinearRegression


def forecast_crime_trend(registration_dates: list[str], horizon_days: int) -> dict:
    dates = pd.to_datetime(pd.Series(registration_dates), errors="coerce").dropna().dt.normalize()
    daily = dates.value_counts().sort_index()
    full_index = pd.date_range(daily.index.min(), daily.index.max(), freq="D")
    series = daily.reindex(full_index, fill_value=0)
    x = list(range(len(series)))
    model = LinearRegression().fit([[value] for value in x], series.values)
    future_x = list(range(len(series), len(series) + horizon_days))
    predictions = model.predict([[value] for value in future_x]).clip(min=0)
    slope = float(model.coef_[0])
    trend = "increasing" if slope > 0.02 else "decreasing" if slope < -0.02 else "stable"
    return {
        "model_version": "phase4-trend-regression-v1",
        "trend": trend,
        "points": [
            {"date": (series.index.max() + timedelta(days=index + 1)).date().isoformat(), "predicted_count": round(float(value), 2)}
            for index, value in enumerate(predictions)
        ],
    }
