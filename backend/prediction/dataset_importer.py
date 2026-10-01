from pathlib import Path
from datetime import datetime, timedelta

import pytz
import psycopg2
from psycopg2.extras import execute_values


DATASET_PATH = Path(
    r"D:\Crowd_Management\datasets\pedestrian_counts_dataset.tsf"
)


DB_CONFIG = {
    "host": "localhost",
    "database": "crowdflow_db",
    "user": "crowdflow",
    "password": "crowdflow123",  # Keep your actual PostgreSQL password here
    "port": 5432,
}


MELBOURNE_TZ = pytz.timezone("Australia/Melbourne")


def parse_dataset():
    sensors = []

    with open(DATASET_PATH, "r", encoding="cp1252") as file:
        in_data = False

        for raw_line in file:
            line = raw_line.strip()

            if line.lower() == "@data":
                in_data = True
                continue

            if not in_data or not line:
                continue

            first_comma = line.find(",")

            if first_comma == -1:
                continue

            header = line[:first_comma]
            values_text = line[first_comma + 1:]

            first_colon = header.find(":")

            if first_colon == -1:
                continue

            sensor_code = header[:first_colon]
            timestamp_text = header[first_colon + 1:]

            naive_start = datetime.strptime(
                timestamp_text,
                "%Y-%m-%d %H-%M-%S:%f"
            )

            # The TSF timestamp is Melbourne local time.
            start_time = MELBOURNE_TZ.localize(naive_start)

            values = [
                int(value.strip())
                for value in values_text.split(",")
                if value.strip()
            ]

            sensors.append(
                {
                    "sensor_code": sensor_code,
                    "start_time": start_time,
                    "values": values,
                }
            )

    return sensors


def import_dataset(sensor_filter=None):
    sensors = parse_dataset()

    # Optional sensor filter.
    # Example: sensor_filter="T1"
    if sensor_filter:
        sensors = [
            sensor
            for sensor in sensors
            if sensor["sensor_code"] == sensor_filter
        ]

    print(f"Dataset sensors selected: {len(sensors)}")

    if sensor_filter:
        print(f"Sensor filter: {sensor_filter}")

    connection = psycopg2.connect(**DB_CONFIG)

    total_observations = 0

    try:
        cursor = connection.cursor()

        for index, sensor in enumerate(sensors, start=1):

            sensor_code = sensor["sensor_code"]
            start_time = sensor["start_time"]
            values = sensor["values"]

            cursor.execute(
                """
                INSERT INTO prediction_sensors
                    (sensor_code, sensor_name, source, timezone)
                VALUES
                    (%s, %s, %s, %s)
                ON CONFLICT (sensor_code)
                DO UPDATE SET
                    sensor_name = EXCLUDED.sensor_name,
                    source = EXCLUDED.source,
                    timezone = EXCLUDED.timezone
                RETURNING id;
                """,
                (
                    sensor_code,
                    f"Melbourne Pedestrian Sensor {sensor_code}",
                    "Melbourne Pedestrian Counts Dataset",
                    "Australia/Melbourne",
                ),
            )

            sensor_id = cursor.fetchone()[0]

            rows = []

            for i, people_count in enumerate(values):

                # Add hours while correctly handling
                # Melbourne daylight-saving transitions.
                timestamp = MELBOURNE_TZ.normalize(
                    start_time + timedelta(hours=i)
                )

                # Normalize to the beginning of the hour.
                timestamp = timestamp.replace(
                    minute=0,
                    second=0,
                    microsecond=0,
                )

                rows.append(
                    (
                        sensor_id,
                        timestamp,
                        people_count,
                        "Melbourne Pedestrian Counts Dataset",
                    )
                )

            execute_values(
                cursor,
                """
                INSERT INTO crowd_history
                    (sensor_id, timestamp, people_count, source)
                VALUES %s
                ON CONFLICT (sensor_id, timestamp)
                DO NOTHING;
                """,
                rows,
                page_size=5000,
            )

            total_observations += len(values)

            print(
                f"[{index:02d}/{len(sensors)}] "
                f"{sensor_code}: "
                f"{len(values):,} observations"
            )

        connection.commit()

        print("\n========================================")
        print("Dataset import completed")
        print("========================================")
        print(f"Sensors processed: {len(sensors)}")
        print(f"Observations processed: {total_observations:,}")

    except Exception:
        connection.rollback()
        raise

    finally:
        cursor.close()
        connection.close()


if __name__ == "__main__":
    import_dataset()