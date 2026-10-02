from datetime import datetime

import pandas as pd
import psycopg2


DB_CONFIG = {
    "host": "localhost",
    "database": "crowdflow_db",
    "user": "crowdflow",
    "password": "crowdflow123",  # Keep your PostgreSQL password here
    "port": 5432,
}


def load_all_history():
    connection = psycopg2.connect(**DB_CONFIG)

    query = """
        SELECT
            ps.id AS sensor_id,
            ps.sensor_code,
            ch.timestamp AT TIME ZONE 'Australia/Melbourne' AS timestamp,
            ch.people_count
        FROM crowd_history ch
        JOIN prediction_sensors ps
            ON ps.id = ch.sensor_id
        ORDER BY ps.id, ch.timestamp
    """

    df = pd.read_sql_query(query, connection)

    connection.close()

    return df


def create_features(df):
    df = df.copy()

    df["timestamp"] = pd.to_datetime(df["timestamp"])

    # Create time-based features.
    df["hour"] = df["timestamp"].dt.hour
    df["day_of_week"] = df["timestamp"].dt.dayofweek
    df["day_of_month"] = df["timestamp"].dt.day
    df["month"] = df["timestamp"].dt.month

    # Calculate lag and rolling features separately
    # for every sensor.
    grouped = df.groupby("sensor_id", group_keys=False)

    df["lag_1"] = grouped["people_count"].shift(1)
    df["lag_2"] = grouped["people_count"].shift(2)
    df["lag_3"] = grouped["people_count"].shift(3)
    df["lag_24"] = grouped["people_count"].shift(24)
    df["lag_168"] = grouped["people_count"].shift(168)

    df["rolling_3"] = (
        grouped["people_count"]
        .transform(lambda x: x.shift(1).rolling(3).mean())
    )

    df["rolling_24"] = (
        grouped["people_count"]
        .transform(lambda x: x.shift(1).rolling(24).mean())
    )

    df["rolling_168"] = (
        grouped["people_count"]
        .transform(lambda x: x.shift(1).rolling(168).mean())
    )

    # Remove rows that don't have enough historical data.
    df = df.dropna().reset_index(drop=True)

    return df


if __name__ == "__main__":

    print("Loading all sensor history...")

    df = load_all_history()

    print(f"Original rows: {len(df):,}")
    print(f"Sensors found: {df['sensor_id'].nunique()}")

    feature_df = create_features(df)

    print(f"Rows after feature engineering: {len(feature_df):,}")

    print("\nRows per sensor:")

    print(
        feature_df
        .groupby("sensor_code")
        .size()
        .to_string()
    )

    print("\nFeature columns:")
    print(feature_df.columns.tolist())

    print("\nFirst 5 feature rows:")
    print(feature_df.head().to_string())

    print("\nLast 5 feature rows:")
    print(feature_df.tail().to_string())