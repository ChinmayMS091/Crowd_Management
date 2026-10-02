from pathlib import Path

import pandas as pd
import xgboost as xgb

from features import load_all_history


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


def create_future_features(history, sensor_id, future_time):
    sensor_history = (
        history[history["sensor_id"] == sensor_id]
        .sort_values("timestamp")
    )

    counts = sensor_history["people_count"].tolist()

    if len(counts) < 168:
        raise ValueError(
            f"Sensor {sensor_id} does not have enough history."
        )

    return {
        "sensor_id": sensor_id,
        "hour": future_time.hour,
        "day_of_week": future_time.dayofweek,
        "day_of_month": future_time.day,
        "month": future_time.month,

        "lag_1": counts[-1],
        "lag_2": counts[-2],
        "lag_3": counts[-3],
        "lag_24": counts[-24],
        "lag_168": counts[-168],

        "rolling_3": sum(counts[-3:]) / 3,
        "rolling_24": sum(counts[-24:]) / 24,
        "rolling_168": sum(counts[-168:]) / 168,
    }


def forecast_sensor(
    model,
    history,
    sensor_id,
    forecast_start,
    hours=24
):
    sensor_history = (
        history[history["sensor_id"] == sensor_id]
        .sort_values("timestamp")
        .copy()
    )

    working_history = sensor_history[
        ["sensor_id", "timestamp", "people_count"]
    ].copy()

    working_history["people_count"] = (
        working_history["people_count"].astype(float)
    )

    last_timestamp = working_history["timestamp"].iloc[-1]

    # If this sensor's history ends before the common forecast start,
    # use the latest available timestamp for its recursive history.
    if last_timestamp >= forecast_start:
        current_history = working_history
    else:
        current_history = working_history

    predictions = []

    for step in range(hours):

        future_time = forecast_start + pd.Timedelta(hours=step)

        features = create_future_features(
            current_history,
            sensor_id,
            future_time
        )

        X = pd.DataFrame(
            [features],
            columns=FEATURE_COLUMNS
        )

        prediction = model.predict(X)[0]

        prediction = max(0, float(prediction))

        predictions.append(
            {
                "sensor_id": sensor_id,
                "timestamp": future_time,
                "predicted_people": prediction,
            }
        )

        current_history.loc[len(current_history)] = [
            sensor_id,
            future_time,
            prediction,
        ]

    return predictions
def generate_forecast():

    print("Loading historical data...")

    history = load_all_history()

    print(f"Historical rows: {len(history):,}")
    print(f"Sensors: {history['sensor_id'].nunique()}")

    print("\nLoading trained model...")

    model = load_model()

    print("\n========================================")
    print("FORECAST GENERATION")
    print("========================================")

    all_predictions = []

    sensors = (
        history[["sensor_id", "sensor_code"]]
        .drop_duplicates()
        .sort_values("sensor_id")
    )

    for index, row in enumerate(
        sensors.itertuples(index=False),
        start=1
    ):

        sensor_id = row.sensor_id
        sensor_code = row.sensor_code

        # Get this sensor's historical data
        sensor_history = (
            history[
                history["sensor_id"] == sensor_id
            ]
            .sort_values("timestamp")
        )

        # Find the latest timestamp available
        # specifically for this sensor
        latest_timestamp = sensor_history[
            "timestamp"
        ].iloc[-1]

        # Forecast starts one hour after
        # this sensor's latest observation
        forecast_start = (
            latest_timestamp.floor("h")
            + pd.Timedelta(hours=1)
        )

        forecast_end = (
            forecast_start
            + pd.Timedelta(hours=23)
        )

        predictions = forecast_sensor(
            model=model,
            history=history,
            sensor_id=sensor_id,
            forecast_start=forecast_start,
            hours=24,
        )

        all_predictions.extend(predictions)

        print(
            f"[{index:02d}/{len(sensors)}] "
            f"{sensor_code}: "
            f"last={latest_timestamp} | "
            f"forecast={forecast_start} → {forecast_end} | "
            f"{len(predictions)} predictions"
        )

    forecast_df = pd.DataFrame(all_predictions)

    forecast_df = forecast_df.merge(
        sensors,
        on="sensor_id",
        how="left"
    )

    forecast_df = forecast_df[
        [
            "sensor_id",
            "sensor_code",
            "timestamp",
            "predicted_people",
        ]
    ]

    return forecast_df

def main():

    forecast_df = generate_forecast()

    print("\n========================================")
    print("FORECAST COMPLETE")
    print("========================================")

    print(f"Total predictions: {len(forecast_df):,}")
    print(f"Sensors: {forecast_df['sensor_id'].nunique()}")

    hours_per_sensor = (
        forecast_df.groupby("sensor_id").size().iloc[0]
    )

    print(f"Hours per sensor: {hours_per_sensor}")

    print("\nForecast time range:")

    print(
        forecast_df["timestamp"].min(),
        "to",
        forecast_df["timestamp"].max()
    )

    print("\nSample predictions:")

    print(
        forecast_df.head(24).to_string(index=False)
    )

    print("\nPrediction summary:")

    summary = (
        forecast_df
        .groupby("sensor_code")["predicted_people"]
        .agg(["min", "max", "mean"])
        .round(2)
    )

    print(summary.to_string())


if __name__ == "__main__":
    main()