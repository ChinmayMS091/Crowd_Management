import time

import pandas as pd
import xgboost as xgb
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

from features import load_all_history, create_features
from split_data import create_time_split
from pathlib import Path


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
TARGET_COLUMN = "people_count"


class ProgressCallback(xgb.callback.TrainingCallback):

    def __init__(self, total_rounds):
        self.total_rounds = total_rounds
        self.start_time = None

    def before_training(self, model):
        self.start_time = time.time()
        return model

    def after_iteration(self, model, epoch, evals_log):

        current = epoch + 1

        elapsed = time.time() - self.start_time

        percent = (current / self.total_rounds) * 100

        if current > 0:
            estimated_total = elapsed / current * self.total_rounds
            remaining = max(0, estimated_total - elapsed)
        else:
            remaining = 0

        bar_length = 30
        filled = int(bar_length * current / self.total_rounds)

        bar = "█" * filled + "░" * (bar_length - filled)

        elapsed_min = int(elapsed // 60)
        elapsed_sec = int(elapsed % 60)

        remaining_min = int(remaining // 60)
        remaining_sec = int(remaining % 60)

        print(
            f"\rTraining: |{bar}| "
            f"{percent:6.2f}% "
            f"Round {current}/{self.total_rounds} "
            f"Elapsed: {elapsed_min:02d}:{elapsed_sec:02d} "
            f"ETA: {remaining_min:02d}:{remaining_sec:02d}",
            end="",
            flush=True
        )

        if current == self.total_rounds:
            print()

        return False


def main():

    print("Loading history...")

    raw_df = load_all_history()

    print(f"Raw rows: {len(raw_df):,}")

    print("\nCreating features...")

    feature_df = create_features(raw_df)

    print(f"Feature rows: {len(feature_df):,}")

    print("\nCreating time-based split...")

    train_df, validation_df, test_df = create_time_split(
        feature_df
    )

    X_train = train_df[FEATURE_COLUMNS]
    X_validation = validation_df[FEATURE_COLUMNS]
    X_test = test_df[FEATURE_COLUMNS]

    y_train = train_df[TARGET_COLUMN]
    y_validation = validation_df[TARGET_COLUMN]
    y_test = test_df[TARGET_COLUMN]

    print("\nDataset sizes:")
    print(f"Train:      {len(X_train):,}")
    print(f"Validation: {len(X_validation):,}")
    print(f"Test:       {len(X_test):,}")

    TOTAL_ROUNDS = 300

    print("\n========================================")
    print("TRAINING GLOBAL XGBOOST MODEL")
    print("========================================")

    model = xgb.XGBRegressor(
        n_estimators=TOTAL_ROUNDS,
        learning_rate=0.08,
        max_depth=8,
        min_child_weight=5,
        subsample=0.8,
        colsample_bytree=0.8,
        objective="reg:squarederror",
        eval_metric="rmse",
        tree_method="hist",
        random_state=42,
        n_jobs=-1
    )

    progress_callback = ProgressCallback(TOTAL_ROUNDS)

    start_time = time.time()

    model.set_params(
        callbacks=[progress_callback]
    )

    model.fit(
        X_train,
        y_train,
        eval_set=[(X_validation, y_validation)],
        verbose=False
    )

    training_time = time.time() - start_time

    # Save trained model
    model_dir = Path(__file__).resolve().parent / "models"
    model_dir.mkdir(parents=True, exist_ok=True)

    model_path = model_dir / "crowd_prediction_model.json"

    model.save_model(model_path)

    print(f"Model saved to: {model_path}")

    # Validation
    print("\n========================================")
    print("VALIDATION RESULTS")
    print("========================================")

    validation_predictions = model.predict(X_validation)

    validation_mae = mean_absolute_error(
        y_validation,
        validation_predictions
    )

    validation_rmse = mean_squared_error(
        y_validation,
        validation_predictions
    ) ** 0.5

    validation_r2 = r2_score(
        y_validation,
        validation_predictions
    )

    print(f"MAE:  {validation_mae:.2f}")
    print(f"RMSE: {validation_rmse:.2f}")
    print(f"R²:   {validation_r2:.4f}")

    # Test
    print("\n========================================")
    print("TEST RESULTS")
    print("========================================")

    test_predictions = model.predict(X_test)

    test_mae = mean_absolute_error(
        y_test,
        test_predictions
    )

    test_rmse = mean_squared_error(
        y_test,
        test_predictions
    ) ** 0.5

    test_r2 = r2_score(
        y_test,
        test_predictions
    )

    print(f"MAE:  {test_mae:.2f}")
    print(f"RMSE: {test_rmse:.2f}")
    print(f"R²:   {test_r2:.4f}")

    # Sample predictions
    results = test_df[
        ["sensor_code", "timestamp", "people_count"]
    ].copy()

    results["predicted_people"] = test_predictions

    print("\n========================================")
    print("SAMPLE PREDICTIONS")
    print("========================================")

    print(
        results.head(20).to_string(index=False)
    )


if __name__ == "__main__":
    main()