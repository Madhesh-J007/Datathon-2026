import os
import joblib
from pathlib import Path
from models.risk_scoring.train import train_risk_model
from models.hotspot.train import train_hotspot_model
from models.forecasting.train import train_forecasting_model
from models.repeat_offender.train import train_repeat_offender_model
from models.anomaly.train import train_anomaly_model
from config import settings

def main():
    saved_models_dir = Path(__file__).parent / "saved_models"
    saved_models_dir.mkdir(parents=True, exist_ok=True)
    
    print("[INIT] Pre-training and serializing all ML models for Catalyst AppSail deployment...")

    # 1. Risk Scoring Model
    risk_path = saved_models_dir / "risk_scoring_rf.joblib"
    print("  -> Training Risk Scoring RandomForest model...")
    joblib.dump(train_risk_model(settings.TRAINING_DATA_PATH), risk_path)
    print(f"  [OK] Saved Risk Model -> {risk_path.name}")

    # 2. Hotspot Model
    hotspot_path = saved_models_dir / "hotspot_model.joblib"
    print("  -> Training Spatial KDE Hotspot model...")
    joblib.dump(train_hotspot_model(), hotspot_path)
    print(f"  [OK] Saved Hotspot Model -> {hotspot_path.name}")

    # 3. Forecasting Model
    forecast_path = saved_models_dir / "forecasting_model.joblib"
    print("  -> Training Ridge Crime Forecasting model...")
    joblib.dump(train_forecasting_model(), forecast_path)
    print(f"  [OK] Saved Forecast Model -> {forecast_path.name}")

    # 4. Repeat Offender Model
    repeat_path = saved_models_dir / "repeat_offender.joblib"
    print("  -> Training Repeat Offender Linkage TF-IDF model...")
    joblib.dump(train_repeat_offender_model(), repeat_path)
    print(f"  [OK] Saved Repeat Offender Model -> {repeat_path.name}")

    # 5. Anomaly Detection Model
    anomaly_path = saved_models_dir / "anomaly_detector.joblib"
    print("  -> Training IsolationForest Anomaly model...")
    joblib.dump(train_anomaly_model(), anomaly_path)
    print(f"  [OK] Saved Anomaly Model -> {anomaly_path.name}")

    print("\n[SUCCESS] ALL ML MODELS PRE-COMPILED AND SERIALIZED SUCCESSFULLY!")

if __name__ == "__main__":
    main()
