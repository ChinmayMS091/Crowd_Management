import pandas as pd
import psycopg2


DB_CONFIG = {
    "host": "localhost",
    "database": "crowdflow_db",
    "user": "crowdflow",
    "password": "crowdflow123",
    "port": 5432,
}


def load_history(sensor_id=1):
    connection = psycopg2.connect(**DB_CONFIG)

    query = """
        SELECT
            timestamp AT TIME ZONE 'Australia/Melbourne' AS timestamp,
            people_count
        FROM crowd_history
        WHERE sensor_id = %s
        ORDER BY timestamp
    """

    df = pd.read_sql_query(
        query,
        connection,
        params=(sensor_id,)
    )

    connection.close()

    return df


def create_features(df):
    df = df.copy()

    # Convert timestamp
    df["timestamp"] = pd.to_datetime(df["timestamp"])

    # --------------------------------------------------
    # Time features
    # --------------------------------------------------

    df["hour"] = df["timestamp"].dt.hour

    df["day_of_week"] = df["timestamp"].dt.dayofweek

    df["day_of_month"] = df["timestamp"].dt.day

    df["month"] = df["timestamp"].dt.month

    # --------------------------------------------------
    # Lag features
    # --------------------------------------------------

    df["lag_1"] = df["people_count"].shift(1)

    df["lag_2"] = df["people_count"].shift(2)

    df["lag_3"] = df["people_count"].shift(3)

    # Same hour previous day
    df["lag_24"] = df["people_count"].shift(24)

    # Same hour previous week
    df["lag_168"] = df["people_count"].shift(168)

    # --------------------------------------------------
    # Rolling averages
    # --------------------------------------------------

    df["rolling_3"] = (
        df["people_count"]
        .shift(1)
        .rolling(3)
        .mean()
    )

    df["rolling_24"] = (
        df["people_count"]
        .shift(1)
        .rolling(24)
        .mean()
    )

    df["rolling_168"] = (
        df["people_count"]
        .shift(1)
        .rolling(168)
        .mean()
    )

    # Remove rows that don't have enough history
    df = df.dropna().reset_index(drop=True)

    return df


if __name__ == "__main__":

    print("Loading T1 history...")

    df = load_history(sensor_id=1)

    print("Original rows:", len(df))

    feature_df = create_features(df)

    print("Rows after feature engineering:", len(feature_df))

    print("\nFeature columns:")
    print(feature_df.columns.tolist())

    print("\nFirst 5 feature rows:")
    print(feature_df.head().to_string())

    print("\nLast 5 feature rows:")
    print(feature_df.tail().to_string())