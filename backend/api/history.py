from datetime import date
import psycopg2
from fastapi import APIRouter, Query, Depends
from auth_dependencies import require_roles


router = APIRouter(
    prefix="/api/history",
    tags=["Historical Data"],
    dependencies=[Depends(require_roles("owner", "security_head"))],
)


DB_CONFIG = {
    "host": "localhost",
    "database": "crowdflow_db",
    "user": "crowdflow",
    "password": "crowdflow123",  # keep your local password here
    "port": 5432,
}


@router.get("")
async def get_history(
    sensor_id: int = Query(...),
    selected_date: date = Query(...)
):
    connection = psycopg2.connect(**DB_CONFIG)

    try:
        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT
                ps.sensor_code,
                ps.location_name,
                ps.location_type,
                ch.timestamp,
                ch.people_count
            FROM crowd_history ch
            JOIN prediction_sensors ps
                ON ps.id = ch.sensor_id
            WHERE
                ch.sensor_id = %s
                AND ch.timestamp >= %s
                AND ch.timestamp < %s + INTERVAL '1 day'
            ORDER BY ch.timestamp;
            """,
            (
                sensor_id,
                selected_date,
                selected_date,
            )
        )

        rows = cursor.fetchall()

        records = [
            {
                "timestamp": row[3],
                "people_count": row[4],
            }
            for row in rows
        ]

        sensor = None

        if rows:
            sensor = {
                "sensor_id": sensor_id,
                "sensor_code": rows[0][0],
                "location_name": rows[0][1],
                "location_type": rows[0][2],
            }

        return {
            "sensor": sensor,
            "date": selected_date,
            "total_records": len(records),
            "records": records,
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

@router.get("/available-dates")
async def get_available_dates(sensor_id: int):
    connection = psycopg2.connect(**DB_CONFIG)

    try:
        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT DISTINCT
                (timestamp AT TIME ZONE 'Australia/Melbourne')::date
            FROM crowd_history
            WHERE sensor_id = %s
            ORDER BY 1;
            """,
            (sensor_id,)
        )

        rows = cursor.fetchall()

        dates = [
            row[0].isoformat()
            for row in rows
        ]

        return {
            "sensor_id": sensor_id,
            "total_dates": len(dates),
            "dates": dates,
        }

    finally:
        cursor.close()
        connection.close()