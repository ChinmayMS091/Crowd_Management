import pandas as pd

from features import load_all_history, create_features


def create_time_split(df):
    train_parts = []
    validation_parts = []
    test_parts = []

    # Split each sensor independently.
    for sensor_id, sensor_df in df.groupby("sensor_id"):

        sensor_df = sensor_df.sort_values("timestamp").reset_index(drop=True)

        n = len(sensor_df)

        train_end = int(n * 0.70)
        validation_end = int(n * 0.85)

        train_parts.append(
            sensor_df.iloc[:train_end]
        )

        validation_parts.append(
            sensor_df.iloc[train_end:validation_end]
        )

        test_parts.append(
            sensor_df.iloc[validation_end:])

    train_df = pd.concat(train_parts, ignore_index=True)
    validation_df = pd.concat(validation_parts, ignore_index=True)
    test_df = pd.concat(test_parts, ignore_index=True)

    return train_df, validation_df, test_df


if __name__ == "__main__":

    print("Loading all sensor history...")

    raw_df = load_all_history()

    print(f"Raw rows: {len(raw_df):,}")

    print("\nCreating features...")

    feature_df = create_features(raw_df)

    print(f"Feature rows: {len(feature_df):,}")

    train_df, validation_df, test_df = create_time_split(
        feature_df
    )

    print("\n========================================")
    print("TIME-BASED SPLIT")
    print("========================================")

    print(f"Training rows:   {len(train_df):,}")
    print(f"Validation rows: {len(validation_df):,}")
    print(f"Test rows:       {len(test_df):,}")

    print("\nSensors:")
    print(f"Training:   {train_df['sensor_id'].nunique()}")
    print(f"Validation: {validation_df['sensor_id'].nunique()}")
    print(f"Test:       {test_df['sensor_id'].nunique()}")

    print("\nTraining time range:")
    print(train_df["timestamp"].min())
    print(train_df["timestamp"].max())

    print("\nValidation time range:")
    print(validation_df["timestamp"].min())
    print(validation_df["timestamp"].max())

    print("\nTest time range:")
    print(test_df["timestamp"].min())
    print(test_df["timestamp"].max())