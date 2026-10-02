import psycopg2
from psycopg2.extras import execute_values

from predict import generate_forecast


DB_CONFIG = {
    "host": "localhost",
    "database": "crowdflow_db",
    "user": "crowdflow",
    "password": "crowdflow123",
    "port": 5432,
}


def save_predictions(forecast_df):

    connection = psycopg2.connect(**DB_CONFIG)

    try:
        cursor = connection.cursor()

        rows = []

        for row in forecast_df.itertuples(index=False):

            rows.append(
                (
                    int(row.sensor_id),
                    row.timestamp,
                    float(row.predicted_people),
                    "XGBoost",
                    "v1",
                )
            )

        execute_values(
            cursor,
            """
            INSERT INTO crowd_predictions
            (
                sensor_id,
                forecast_time,
                predicted_people,
                model_name,
                model_version
            )
            VALUES %s
            ON CONFLICT (sensor_id, forecast_time)
            DO UPDATE SET
                predicted_people = EXCLUDED.predicted_people,
                model_name = EXCLUDED.model_name,
                model_version = EXCLUDED.model_version,
                created_at = NOW()
            """,
            rows,
            page_size=1000,
        )

        connection.commit()

        print("\n========================================")
        print("PREDICTIONS SAVED")
        print("========================================")

        print(f"Rows processed: {len(rows):,}")

    except Exception:
        connection.rollback()
        raise

    finally:
        cursor.close()
        connection.close()


def main():

    print("Generating forecast...")

    forecast_df = generate_forecast()

    print("\nSaving predictions to PostgreSQL...")

    save_predictions(forecast_df)


if __name__ == "__main__":
    main()