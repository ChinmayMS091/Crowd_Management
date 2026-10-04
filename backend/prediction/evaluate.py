from pathlib import Path

import pandas as pd
import xgboost as xgb

from sklearn.metrics import (
    mean_absolute_error,
    mean_squared_error,
    r2_score,
)

from features import create_features, load_all_history


# =========================================================
# FEATURE COLUMNS
# =========================================================

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
    "change_1h",
    "change_24h",
    "change_168h",
    "rolling_3",
    "rolling_24",
    "rolling_168"
]


# =========================================================
# LOAD MODEL
# =========================================================

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


# =========================================================
# MAIN
# =========================================================

def main():

    print("========================================")
    print("CROWD PREDICTION MODEL EVALUATION")
    print("========================================")

    # =====================================================
    # LOAD HISTORICAL DATA
    # =====================================================

    print("\nLoading historical data...")

    history = load_all_history()

    print(f"Historical rows: {len(history):,}")
    print(f"Sensors: {history['sensor_id'].nunique()}")

    # =====================================================
    # CREATE FEATURES
    # =====================================================

    print("\nCreating prediction features...")

    data = create_features(history)

    print(f"Feature rows: {len(data):,}")

    # =====================================================
    # CHRONOLOGICAL SPLIT PER SENSOR
    # =====================================================

    data = data.sort_values(
        ["sensor_id", "timestamp"]
    ).reset_index(drop=True)

    print("\nCreating chronological per-sensor split...")

    train_parts = []
    validation_parts = []
    test_parts = []

    for sensor_id, sensor_data in data.groupby("sensor_id"):

        sensor_data = sensor_data.sort_values(
            "timestamp"
        ).reset_index(drop=True)

        total_sensor_rows = len(sensor_data)

        train_end = int(total_sensor_rows * 0.70)
        validation_end = int(total_sensor_rows * 0.85)

        train_parts.append(
            sensor_data.iloc[:train_end]
        )

        validation_parts.append(
            sensor_data.iloc[train_end:validation_end]
        )

        test_parts.append(
            sensor_data.iloc[validation_end:]
        )

    train_data = pd.concat(
        train_parts,
        ignore_index=True,
    )

    validation_data = pd.concat(
        validation_parts,
        ignore_index=True,
    )

    test_data = pd.concat(
        test_parts,
        ignore_index=True,
    )

    print("\nDataset split:")

    print(f"Total rows      : {len(data):,}")
    print(f"Training rows   : {len(train_data):,}")
    print(f"Validation rows : {len(validation_data):,}")
    print(f"Test rows       : {len(test_data):,}")

    print(
        f"Training sensors   : "
        f"{train_data['sensor_id'].nunique()}"
    )

    print(
        f"Validation sensors : "
        f"{validation_data['sensor_id'].nunique()}"
    )

    print(
        f"Test sensors       : "
        f"{test_data['sensor_id'].nunique()}"
    )

    # =====================================================
    # LOAD TRAINED MODEL
    # =====================================================

    print("\nLoading trained model...")

    model = load_model()

    # =====================================================
    # PREPARE TEST DATA
    # =====================================================

    X_test = test_data[FEATURE_COLUMNS]

    y_test = test_data["people_count"]

    # =====================================================
    # GENERATE PREDICTIONS
    # =====================================================

    print("\nGenerating test predictions...")

    predictions = model.predict(X_test)

    predictions = predictions.clip(min=0)

    # =====================================================
    # CALCULATE METRICS
    # =====================================================

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

    # =====================================================
    # DISPLAY RESULTS
    # =====================================================

    print("\n========================================")
    print("EVALUATION RESULTS")
    print("========================================")

    print(f"MAE  : {mae:.2f} people")
    print(f"RMSE : {rmse:.2f} people")
    print(f"R²   : {r2:.4f}")

    # =====================================================
    # PER-SENSOR EVALUATION
    # =====================================================

    print("\n========================================")
    print("PER-SENSOR EVALUATION")
    print("========================================")

    per_sensor_results = []

    for sensor_id, sensor_data in test_data.groupby("sensor_id"):

        sensor_predictions = predictions[
            test_data["sensor_id"].values == sensor_id
        ]

        sensor_actual = sensor_data["people_count"].values

        sensor_mae = mean_absolute_error(
            sensor_actual,
            sensor_predictions,
        )

        sensor_rmse = mean_squared_error(
            sensor_actual,
            sensor_predictions,
        ) ** 0.5

        sensor_r2 = r2_score(
            sensor_actual,
            sensor_predictions,
        )

        sensor_code = sensor_data["sensor_code"].iloc[0]

        per_sensor_results.append(
            {
                "sensor_id": sensor_id,
                "sensor_code": sensor_code,
                "test_samples": len(sensor_data),
                "mae": sensor_mae,
                "rmse": sensor_rmse,
                "r2": sensor_r2,
            }
        )

    per_sensor_df = pd.DataFrame(
        per_sensor_results
    )

    per_sensor_df = per_sensor_df.sort_values(
        "sensor_id"
    ).reset_index(drop=True)

    print(
        per_sensor_df.to_string(
            index=False
        )
    )

    # =====================================================
    # BEST 5 AND WORST 5 SENSOR ANALYSIS
    # =====================================================

    print("\n========================================")
    print("BEST 5 SENSORS BY MAE")
    print("========================================")

    best_5_mae = (
        per_sensor_df
        .sort_values("mae")
        .head(5)
    )

    print(
        best_5_mae[
            [
                "sensor_code",
                "test_samples",
                "mae",
                "rmse",
                "r2",
            ]
        ].to_string(index=False)
    )

    print("\n========================================")
    print("WORST 5 SENSORS BY MAE")
    print("========================================")

    worst_5_mae = (
        per_sensor_df
        .sort_values("mae", ascending=False)
        .head(5)
    )

    print(
        worst_5_mae[
            [
                "sensor_code",
                "test_samples",
                "mae",
                "rmse",
                "r2",
            ]
        ].to_string(index=False)
    )

    print("\n========================================")
    print("BEST 5 SENSORS BY R²")
    print("========================================")

    best_5_r2 = (
        per_sensor_df
        .sort_values("r2", ascending=False)
        .head(5)
    )

    print(
        best_5_r2[
            [
                "sensor_code",
                "test_samples",
                "mae",
                "rmse",
                "r2",
            ]
        ].to_string(index=False)
    )

    print("\n========================================")
    print("WORST 5 SENSORS BY R²")
    print("========================================")

    worst_5_r2 = (
        per_sensor_df
        .sort_values("r2")
        .head(5)
    )

    print(
        worst_5_r2[
            [
                "sensor_code",
                "test_samples",
                "mae",
                "rmse",
                "r2",
            ]
        ].to_string(index=False)
    )

    # =====================================================
    # SAVE PER-SENSOR EVALUATION
    # =====================================================

    per_sensor_output_path = (
        Path(__file__).resolve().parent
        / "per_sensor_evaluation.csv"
    )

    per_sensor_df.to_csv(
        per_sensor_output_path,
        index=False,
    )

    print("\nPer-sensor evaluation saved to:")
    print(per_sensor_output_path)

    # =====================================================
    # ACTUAL VS PREDICTED
    # =====================================================

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

    # =====================================================
    # ERROR ANALYSIS BY HOUR
    # =====================================================

    results["hour"] = (
        results["timestamp"].dt.hour
    )

    hourly_error = (
        results
        .groupby("hour")
        .agg(
            samples=("people_count", "count"),
            actual_mean=("people_count", "mean"),
            predicted_mean=("predicted_people", "mean"),
            mae=("absolute_error", "mean"),
            rmse=(
                "error",
                lambda x: (x.pow(2).mean()) ** 0.5
            ),
        )
        .reset_index()
    )

    print("\n========================================")
    print("ERROR ANALYSIS BY HOUR")
    print("========================================")

    print(
        hourly_error.to_string(
            index=False
        )
    )

    # =====================================================
    # ERROR ANALYSIS BY DAY OF WEEK
    # =====================================================

    results["day_of_week"] = (
        results["timestamp"].dt.dayofweek
    )

    day_names = {
        0: "Monday",
        1: "Tuesday",
        2: "Wednesday",
        3: "Thursday",
        4: "Friday",
        5: "Saturday",
        6: "Sunday",
    }

    daily_error = (
        results
        .groupby("day_of_week")
        .agg(
            samples=("people_count", "count"),
            actual_mean=("people_count", "mean"),
            predicted_mean=("predicted_people", "mean"),
            mae=("absolute_error", "mean"),
            rmse=(
                "error",
                lambda x: (x.pow(2).mean()) ** 0.5
            ),
        )
        .reset_index()
    )

    daily_error["day_name"] = (
        daily_error["day_of_week"]
        .map(day_names)
    )

    daily_error = daily_error[
        [
            "day_of_week",
            "day_name",
            "samples",
            "actual_mean",
            "predicted_mean",
            "mae",
            "rmse",
        ]
    ]

    print("\n========================================")
    print("ERROR ANALYSIS BY DAY OF WEEK")
    print("========================================")

    print(
        daily_error.to_string(
            index=False
        )
    )

    # =====================================================
    # WORST HOURS
    # =====================================================

    print("\n========================================")
    print("TOP 5 WORST HOURS BY MAE")
    print("========================================")

    worst_hours = (
        hourly_error
        .sort_values("mae", ascending=False)
        .head(5)
    )

    print(
        worst_hours.to_string(
            index=False
        )
    )

    # =====================================================
    # BEST HOURS
    # =====================================================

    print("\n========================================")
    print("TOP 5 BEST HOURS BY MAE")
    print("========================================")

    best_hours = (
        hourly_error
        .sort_values("mae")
        .head(5)
    )

    print(
        best_hours.to_string(
            index=False
        )
    )

    # =====================================================
    # WORST DAYS
    # =====================================================

    print("\n========================================")
    print("WORST DAYS BY MAE")
    print("========================================")

    worst_days = (
        daily_error
        .sort_values("mae", ascending=False)
    )

    print(
        worst_days.to_string(
            index=False
        )
    )

    # =====================================================
    # CROWD SPIKE ERROR ANALYSIS
    # =====================================================

    print("\n========================================")
    print("CROWD SPIKE ERROR ANALYSIS")
    print("========================================")

    results["crowd_percentile"] = pd.qcut(
        results["people_count"],
        q=4,
        labels=[
            "Low Crowd",
            "Medium-Low Crowd",
            "Medium-High Crowd",
            "High Crowd",
        ],
        duplicates="drop",
    )

    spike_analysis = (
        results
        .groupby(
            "crowd_percentile",
            observed=True,
        )
        .agg(
            samples=("people_count", "count"),
            actual_mean=("people_count", "mean"),
            predicted_mean=("predicted_people", "mean"),
            mae=("absolute_error", "mean"),
            rmse=(
                "error",
                lambda x: (x.pow(2).mean()) ** 0.5
            ),
        )
        .reset_index()
    )

    print(
        spike_analysis.to_string(
            index=False
        )
    )

    # =====================================================
    # TOP 20 LARGEST PREDICTION ERRORS
    # =====================================================

    print("\n========================================")
    print("TOP 20 LARGEST PREDICTION ERRORS")
    print("========================================")

    largest_errors = (
        results
        .sort_values(
            "absolute_error",
            ascending=False,
        )
        .head(20)
    )

    print(
        largest_errors[
            [
                "sensor_code",
                "timestamp",
                "people_count",
                "predicted_people",
                "error",
                "absolute_error",
            ]
        ].to_string(index=False)
    )

    # =====================================================
    # HIGH CROWD PERFORMANCE
    # =====================================================

    high_crowd = results[
        results["people_count"]
        >= results["people_count"].quantile(0.90)
    ]

    print("\n========================================")
    print("TOP 10% HIGH-CROWD PERFORMANCE")
    print("========================================")

    if len(high_crowd) > 0:

        high_crowd_mae = mean_absolute_error(
            high_crowd["people_count"],
            high_crowd["predicted_people"],
        )

        high_crowd_rmse = mean_squared_error(
            high_crowd["people_count"],
            high_crowd["predicted_people"],
        ) ** 0.5

        underprediction_percentage = (
            (
                high_crowd["predicted_people"]
                < high_crowd["people_count"]
            ).mean()
            * 100
        )

        print(
            f"High-crowd samples : "
            f"{len(high_crowd):,}"
        )

        print(
            f"Actual mean       : "
            f"{high_crowd['people_count'].mean():.2f}"
        )

        print(
            f"Predicted mean    : "
            f"{high_crowd['predicted_people'].mean():.2f}"
        )

        print(
            f"MAE               : "
            f"{high_crowd_mae:.2f}"
        )

        print(
            f"RMSE              : "
            f"{high_crowd_rmse:.2f}"
        )

        print(
            f"Underprediction % : "
            f"{underprediction_percentage:.2f}%"
        )

    else:

        print("No high-crowd samples found.")


    # =========================================================
    # EXTREME CROWD SPIKE INSPECTION
    # =========================================================

    print("\n========================================")
    print("EXTREME CROWD SPIKE INSPECTION")
    print("========================================")

    # Top 20 actual crowd observations
    extreme_spikes = (
        results
        .sort_values(
            "people_count",
            ascending=False
        )
        .head(20)
    )

    print(
        extreme_spikes[
            [
                "sensor_code",
                "timestamp",
                "people_count",
                "predicted_people",
                "error",
                "absolute_error",
            ]
        ].to_string(index=False)
    )

    # =========================================================
    # SENSOR-LEVEL EXTREME SPIKES
    # =========================================================

    print("\n========================================")
    print("EXTREME SPIKES BY SENSOR")
    print("========================================")

    sensor_spikes = (
        results
        .groupby("sensor_code")
        .agg(
            maximum_actual=("people_count", "max"),
            average_actual=("people_count", "mean"),
            maximum_prediction_error=(
                "absolute_error",
                "max"
            ),
            average_error=(
                "absolute_error",
                "mean"
            ),
            samples=("people_count", "count"),
        )
        .reset_index()
    )

    sensor_spikes = (
        sensor_spikes
        .sort_values(
            "maximum_actual",
            ascending=False
        )
        .head(15)
    )

    print(
        sensor_spikes.to_string(
            index=False
        )
    )
    # =========================================================
    # EXTREME SPIKE LAG ANALYSIS
    # =========================================================

    print("\n========================================")
    print("EXTREME SPIKE LAG ANALYSIS")
    print("========================================")

    # Get the original feature rows corresponding to the test set
    test_analysis = test_data[
        [
            "sensor_id",
            "sensor_code",
            "timestamp",
            "people_count",
            "lag_1",
            "lag_24",
            "lag_168",
        ]
    ].copy()

    test_analysis["predicted_people"] = predictions

    test_analysis["error"] = (
        test_analysis["people_count"]
        - test_analysis["predicted_people"]
    )

    test_analysis["absolute_error"] = (
        test_analysis["error"].abs()
    )

    # Select the 20 largest actual crowd observations
    extreme_lag_rows = (
        test_analysis
        .sort_values(
            "people_count",
            ascending=False
        )
        .head(20)
    )

    print(
        extreme_lag_rows[
            [
                "sensor_code",
                "timestamp",
                "people_count",
                "lag_1",
                "lag_24",
                "lag_168",
                "predicted_people",
                "error",
                "absolute_error",
            ]
        ].to_string(index=False)
    )

    # =========================================================
    # SPIKE SIZE ANALYSIS
    # =========================================================

    print("\n========================================")
    print("SPIKE SIZE ANALYSIS")
    print("========================================")

    extreme_lag_rows = extreme_lag_rows.copy()

    extreme_lag_rows["increase_from_previous_hour"] = (
        extreme_lag_rows["people_count"]
        - extreme_lag_rows["lag_1"]
    )

    extreme_lag_rows["increase_from_previous_day"] = (
        extreme_lag_rows["people_count"]
        - extreme_lag_rows["lag_24"]
    )

    extreme_lag_rows["increase_from_previous_week"] = (
        extreme_lag_rows["people_count"]
        - extreme_lag_rows["lag_168"]
    )

    print(
        extreme_lag_rows[
            [
                "sensor_code",
                "timestamp",
                "people_count",
                "lag_1",
                "increase_from_previous_hour",
                "lag_24",
                "increase_from_previous_day",
                "lag_168",
                "increase_from_previous_week",
            ]
        ].to_string(index=False)
    )
    # =====================================================
    # SAVE EVALUATION RESULTS
    # =====================================================

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


# =========================================================
# RUN
# =========================================================

if __name__ == "__main__":
    main()