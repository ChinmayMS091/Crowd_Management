from fastapi import APIRouter
import psycopg2

router = APIRouter(
    prefix="/api/predictions",
    tags=["Predictions"]
)


DB_CONFIG = {
    "host": "localhost",
    "database": "crowdflow_db",
    "user": "crowdflow",
    "password": "crowdflow123",
    "port": 5432,
}


@router.get("")
async def get_predictions():

    connection = psycopg2.connect(**DB_CONFIG)

    try:
        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT
                ps.sensor_code,
                ps.location_name,
                ps.location_type,
                cp.forecast_time,
                cp.predicted_people,
                cp.model_name,
                cp.model_version
            FROM crowd_predictions cp
            JOIN prediction_sensors ps
                ON ps.id = cp.sensor_id
            ORDER BY
                ps.sensor_code,
                cp.forecast_time;
            """
        )

        rows = cursor.fetchall()

        predictions = []

        for row in rows:
            predicted_people = float(row[4])

            if predicted_people <= 100:
                crowd_level = "Low"
            elif predicted_people <= 300:
                crowd_level = "Moderate"
            elif predicted_people <= 500:
                crowd_level = "High"
            else:
                crowd_level = "Very High"

            predictions.append(
                {
                    "sensor_code": row[0],
                    "location_name": row[1],
                    "location_type": row[2],
                    "forecast_time": row[3],
                    "predicted_people": predicted_people,
                    "crowd_level": crowd_level,
                    "model_name": row[5],
                    "model_version": row[6],
                }
            )

        return {
            "total_predictions": len(predictions),
            "predictions": predictions,
        }

    finally:
        cursor.close()
        connection.close()


@router.get("/sensors")
async def get_history_sensors():
    connection = psycopg2.connect(**DB_CONFIG)

    try:
        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT
                id,
                sensor_code,
                location_name,
                location_type
            FROM prediction_sensors
            ORDER BY id;
            """
        )

        rows = cursor.fetchall()

        sensors = []

        for row in rows:
            sensors.append(
                {
                    "id": row[0],
                    "sensor_code": row[1],
                    "location_name": row[2],
                    "location_type": row[3],
                }
            )

        return {
            "total_sensors": len(sensors),
            "sensors": sensors,
        }

    finally:
        cursor.close()
        connection.close()