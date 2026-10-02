from pathlib import Path

import pandas as pd
import xgboost as xgb
from sklearn.metrics import (
    mean_absolute_error,
    mean_squared_error,
    r2_score,
)

from features import create_features, load_all_history


FEATURE_COLUMNS = [
    "sensor_id",
    "hour",
    "day_of_week",
    "day_of_month",
    "month",
    "lag_1",
    "lag_2",
    "lag_3",
    "lag_24",
    "lag_168",
    "rolling_3",
    "rolling_24",
    "rolling_168",
]


def load_model():
    model_path = (
        Path(__file__).resolve().parent
        / "models"
        / "crowd_prediction_model.json"
    )

    model = xgb.XGBRegressor()
    model.load_model(model_path)

    print(f"Model loaded: {model_path}")

    return model


def main():

    print("========================================")
    print("CROWD PREDICTION MODEL EVALUATION")
    print("========================================")

    # =========================================================
    # LOAD HISTORICAL DATA
    # =========================================================

    print("\nLoading historical data...")

    history = load_all_history()

    print(f"Historical rows: {len(history):,}")
    print(f"Sensors: {history['sensor_id'].nunique()}")

    # =========================================================
    # CREATE FEATURES
    # =========================================================

    print("\nCreating prediction features...")

    data = create_features(history)

    print(f"Feature rows: {len(data):,}")

    # =========================================================
    # SORT BY TIME
    # =========================================================

    data = data.sort_values(
        "timestamp"
    ).reset_index(drop=True)

    # =========================================================
    # TIME-BASED TEST SPLIT
    # =========================================================

    total_rows = len(data)

    train_end = int(total_rows * 0.70)
    validation_end = int(total_rows * 0.85)

    test_data = data.iloc[validation_end:].copy()

    print("\nDataset split:")
    print(f"Total rows       : {total_rows:,}")
    print(f"Training boundary: {train_end:,}")
    print(f"Validation end   : {validation_end:,}")
    print(f"Test rows        : {len(test_data):,}")

    # =========================================================
    # LOAD TRAINED MODEL
    # =========================================================

    print("\nLoading trained model...")

    model = load_model()

    # =========================================================
    # PREPARE TEST DATA
    # =========================================================

    X_test = test_data[FEATURE_COLUMNS]
    y_test = test_data["people_count"]

    # =========================================================
    # GENERATE PREDICTIONS
    # =========================================================

    print("\nGenerating test predictions...")

    predictions = model.predict(X_test)

    # Predictions cannot be negative.
    predictions = predictions.clip(min=0)

    # =========================================================
    # CALCULATE METRICS
    # =========================================================

    mae = mean_absolute_error(
        y_test,
        predictions,
    )

    rmse = mean_squared_error(
        y_test,
        predictions,
    ) ** 0.5

    r2 = r2_score(
        y_test,
        predictions,
    )

    # =========================================================
    # DISPLAY RESULTS
    # =========================================================

    print("\n========================================")
    print("EVALUATION RESULTS")
    print("========================================")

    print(f"MAE  : {mae:.2f} people")
    print(f"RMSE : {rmse:.2f} people")
    print(f"R²   : {r2:.4f}")

    # =========================================================
    # ACTUAL VS PREDICTED
    # =========================================================

    results = test_data[
        [
            "sensor_id",
            "sensor_code",
            "timestamp",
            "people_count",
        ]
    ].copy()

    results["predicted_people"] = predictions

    results["error"] = (
        results["people_count"]
        - results["predicted_people"]
    )

    results["absolute_error"] = (
        results["error"].abs()
    )

    print("\n========================================")
    print("SAMPLE ACTUAL VS PREDICTED")
    print("========================================")

    print(
        results.head(20).to_string(
            index=False
        )
    )

    # =========================================================
    # SAVE RESULTS
    # =========================================================

    output_path = (
        Path(__file__).resolve().parent
        / "evaluation_results.csv"
    )

    results.to_csv(
        output_path,
        index=False,
    )

    print("\nEvaluation results saved to:")
    print(output_path)

    print("\nEvaluation completed successfully.")


if __name__ == "__main__":
    main()