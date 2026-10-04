from pathlib import Path
import psycopg2
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
    "change_1h",
    "change_24h",
    "change_168h",
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

    if len(counts) < 169:
        raise ValueError(
            f"Sensor {sensor_id} does not have enough history. "
            f"Required: 169, available: {len(counts)}"
        )

    # ---------------------------------------------------------
    # Lag features
    # ---------------------------------------------------------

    lag_1 = counts[-1]
    lag_2 = counts[-2]
    lag_3 = counts[-3]

    lag_24 = counts[-24]
    lag_168 = counts[-168]

    # ---------------------------------------------------------
    # Change / momentum features
    # ---------------------------------------------------------

    change_1h = (
        lag_1 - lag_2
    )

    change_24h = (
        lag_24 - counts[-25]
    )

    change_168h = (
        lag_168 - counts[-169]
    )

    # ---------------------------------------------------------
    # Rolling features
    # ---------------------------------------------------------

    rolling_3 = (
        sum(counts[-3:]) / 3
    )

    rolling_24 = (
        sum(counts[-24:]) / 24
    )

    rolling_168 = (
        sum(counts[-168:]) / 168
    )

    return {
        "sensor_id": sensor_id,

        "hour": future_time.hour,
        "day_of_week": future_time.dayofweek,
        "day_of_month": future_time.day,
        "month": future_time.month,

        "lag_1": lag_1,
        "lag_2": lag_2,
        "lag_3": lag_3,
        "lag_24": lag_24,
        "lag_168": lag_168,

        "change_1h": change_1h,
        "change_24h": change_24h,
        "change_168h": change_168h,

        "rolling_3": rolling_3,
        "rolling_24": rolling_24,
        "rolling_168": rolling_168,
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

    predictions = []

    for step in range(hours):

        future_time = (
            forecast_start
            + pd.Timedelta(hours=step)
        )

        # -----------------------------------------------------
        # Create features using historical + previous
        # predicted values
        # -----------------------------------------------------

        features = create_future_features(
            working_history,
            sensor_id,
            future_time
        )

        # -----------------------------------------------------
        # Create model input
        # -----------------------------------------------------

        X = pd.DataFrame(
            [features],
            columns=FEATURE_COLUMNS
        )

        # -----------------------------------------------------
        # Predict
        # -----------------------------------------------------

        prediction = model.predict(X)[0]

        prediction = max(
            0,
            float(prediction)
        )

        predictions.append(
            {
                "sensor_id": sensor_id,
                "timestamp": future_time,
                "predicted_people": prediction,
            }
        )

        # -----------------------------------------------------
        # Add prediction to history.
        #
        # This is required for recursive forecasting.
        # The next hour will use this prediction as lag_1.
        # -----------------------------------------------------

        working_history.loc[
            len(working_history)
        ] = [
            sensor_id,
            future_time,
            prediction,
        ]

    return predictions


def generate_forecast():

    print("Loading historical data...")

    history = load_all_history()

    print(
        f"Historical rows: {len(history):,}"
    )

    print(
        f"Sensors: {history['sensor_id'].nunique()}"
    )

    print("\nLoading trained model...")

    model = load_model()

    print("\n========================================")
    print("FORECAST GENERATION")
    print("========================================")

    all_predictions = []

    sensors = (
        history[
            ["sensor_id", "sensor_code"]
        ]
        .drop_duplicates()
        .sort_values("sensor_id")
    )

    for index, row in enumerate(
        sensors.itertuples(index=False),
        start=1
    ):

        sensor_id = row.sensor_id
        sensor_code = row.sensor_code

        # -----------------------------------------------------
        # Get this sensor's historical data
        # -----------------------------------------------------

        sensor_history = (
            history[
                history["sensor_id"] == sensor_id
            ]
            .sort_values("timestamp")
        )

        # -----------------------------------------------------
        # Latest timestamp for this sensor
        # -----------------------------------------------------

        latest_timestamp = (
            sensor_history[
                "timestamp"
            ].iloc[-1]
        )

        # -----------------------------------------------------
        # Forecast starts one hour after the latest
        # available observation
        # -----------------------------------------------------

        forecast_start = (
            latest_timestamp.floor("h")
            + pd.Timedelta(hours=1)
        )

        forecast_end = (
            forecast_start
            + pd.Timedelta(hours=23)
        )

        # -----------------------------------------------------
        # Generate 24-hour recursive forecast
        # -----------------------------------------------------

        predictions = forecast_sensor(
            model=model,
            history=history,
            sensor_id=sensor_id,
            forecast_start=forecast_start,
            hours=24,
        )

        all_predictions.extend(
            predictions
        )

        print(
            f"[{index:02d}/{len(sensors)}] "
            f"{sensor_code}: "
            f"last={latest_timestamp} | "
            f"forecast={forecast_start} → "
            f"{forecast_end} | "
            f"{len(predictions)} predictions"
        )

    forecast_df = pd.DataFrame(
        all_predictions
    )

    # ---------------------------------------------------------
    # Add sensor codes
    # ---------------------------------------------------------

    forecast_df = forecast_df.merge(
        sensors,
        on="sensor_id",
        how="left"
    )

    # ---------------------------------------------------------
    # Final column order
    # ---------------------------------------------------------

    forecast_df = forecast_df[
        [
            "sensor_id",
            "sensor_code",
            "timestamp",
            "predicted_people",
        ]
    ]

    return forecast_df

def save_predictions(forecast_df):
    print("\n========================================")
    print("SAVING PREDICTIONS")
    print("========================================")

    connection = psycopg2.connect(
        host="localhost",
        database="crowdflow_db",
        user="crowdflow",
        password="crowdflow123",
        port=5432,
    )

    cursor = connection.cursor()

    try:
        # Remove previous forecast batch
        cursor.execute(
            "TRUNCATE TABLE crowd_predictions RESTART IDENTITY;"
        )

        insert_query = """
            INSERT INTO crowd_predictions (
                sensor_id,
                forecast_time,
                predicted_people,
                model_name,
                model_version
            )
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (sensor_id, forecast_time)
            DO UPDATE SET
                predicted_people = EXCLUDED.predicted_people,
                model_name = EXCLUDED.model_name,
                model_version = EXCLUDED.model_version
        """

        rows = [
            (
                int(row.sensor_id),
                row.timestamp,
                float(row.predicted_people),
                "XGBoost",
                "2.0",
            )
            for row in forecast_df.itertuples(index=False)
        ]

        cursor.executemany(
            insert_query,
            rows
        )

        connection.commit()

        print(
            f"Saved predictions: {len(rows):,}"
        )

    except Exception:
        connection.rollback()
        raise

    finally:
        cursor.close()
        connection.close()

    print("Predictions saved successfully.")

def main():
    forecast_df = generate_forecast()
    save_predictions(forecast_df)
    print("\n========================================")
    print("FORECAST COMPLETE")
    print("========================================")

    print(
        f"Total predictions: "
        f"{len(forecast_df):,}"
    )

    print(
        f"Sensors: "
        f"{forecast_df['sensor_id'].nunique()}"
    )

    hours_per_sensor = (
        forecast_df
        .groupby("sensor_id")
        .size()
        .iloc[0]
    )

    print(
        f"Hours per sensor: "
        f"{hours_per_sensor}"
    )

    print("\nForecast time range:")

    print(
        forecast_df["timestamp"].min(),
        "to",
        forecast_df["timestamp"].max()
    )

    print("\nSample predictions:")

    print(
        forecast_df
        .head(24)
        .to_string(index=False)
    )

    print("\nPrediction summary:")

    summary = (
        forecast_df
        .groupby("sensor_code")["predicted_people"]
        .agg(
            ["min", "max", "mean"]
        )
        .round(2)
    )

    print(
        summary.to_string()
    )


if __name__ == "__main__":
    main()