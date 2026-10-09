from datetime import date

from fastapi import APIRouter, Query

import psycopg2

from prediction.future_risk import calculate_future_risk
from fastapi import Depends
from auth_dependencies import require_roles


router = APIRouter(
    prefix="/api/predictions",
    tags=["Predictions"],
    dependencies=[Depends(require_roles("owner", "security_head"))],
)



DB_CONFIG = {
    "host": "localhost",
    "database": "crowdflow_db",
    "user": "crowdflow",
    "password": "crowdflow123",
    "port": 5432,
}


def get_crowd_level(predicted_people: float) -> str:

    if predicted_people <= 100:
        return "Low"

    elif predicted_people <= 300:
        return "Moderate"

    elif predicted_people <= 500:
        return "High"

    else:
        return "Very High"


@router.get("")
async def get_predictions(
    sensor_id: int = Query(
        ...,
        description="Prediction sensor ID"
    ),
    forecast_date: date = Query(
        ...,
        description="Forecast date"
    )
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
                cp.forecast_time,
                cp.predicted_people,
                cp.model_name,
                cp.model_version
            FROM crowd_predictions cp
            JOIN prediction_sensors ps
                ON ps.id = cp.sensor_id
            WHERE
                cp.sensor_id = %s
                AND cp.forecast_time::date = %s
            ORDER BY cp.forecast_time
            LIMIT 24;
            """,
            (
                sensor_id,
                forecast_date
            )
        )

        rows = cursor.fetchall()

        predictions = []

        for row in rows:

            predicted_people = float(row[4])

            future_risk = calculate_future_risk(predicted_people)

            predictions.append(
                {
                    "sensor_code": row[0],
                    "location_name": row[1],
                    "location_type": row[2],
                    "forecast_time": row[3],
                    "predicted_people": predicted_people,
                    "crowd_level": future_risk["crowd_level"],
                    "future_risk_score": future_risk["future_risk_score"],
                    "future_risk_level": future_risk["future_risk_level"],
                    "model_name": row[5],
                    "model_version": row[6],
                }
            )

        return {
            "sensor_id": sensor_id,
            "forecast_date": forecast_date.isoformat(),
            "total_predictions": len(predictions),
            "predictions": predictions,
        }

    finally:

        cursor.close()
        connection.close()


@router.get("/sensors")
async def get_prediction_sensors():

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


@router.get("/dates")
async def get_prediction_dates(
    sensor_id: int = Query(
        ...,
        description="Prediction sensor ID"
    )
):

    connection = psycopg2.connect(**DB_CONFIG)

    try:

        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT DISTINCT
                forecast_time::date AS forecast_date
            FROM crowd_predictions
            WHERE sensor_id = %s
            ORDER BY forecast_date;
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


@router.get("/forecast")
async def get_prediction_forecast(
    sensor_id: int = Query(
        ...,
        description="Prediction sensor ID"
    ),
    forecast_date: date = Query(
        ...,
        description="Forecast start date"
    )
):

    connection = psycopg2.connect(**DB_CONFIG)

    try:

        cursor = connection.cursor()

        cursor.execute(
            """
            WITH forecast_start AS (
                SELECT MIN(cp.forecast_time) AS start_time
                FROM crowd_predictions cp
                WHERE
                    cp.sensor_id = %s
                    AND cp.forecast_time::date = %s
            )

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

            CROSS JOIN forecast_start fs

            WHERE
                cp.sensor_id = %s
                AND fs.start_time IS NOT NULL
                AND cp.forecast_time >= fs.start_time

            ORDER BY cp.forecast_time

            LIMIT 24;
            """,
            (
                sensor_id,
                forecast_date,
                sensor_id
            )
        )

        rows = cursor.fetchall()

        predictions = []

        for row in rows:

            predicted_people = float(row[4])

            future_risk = calculate_future_risk(predicted_people)

            predictions.append(
                {
                    "sensor_code": row[0],
                    "location_name": row[1],
                    "location_type": row[2],
                    "forecast_time": row[3],
                    "predicted_people": predicted_people,
                    "crowd_level": future_risk["crowd_level"],
                    "future_risk_score": future_risk["future_risk_score"],
                    "future_risk_level": future_risk["future_risk_level"],
                    "model_name": row[5],
                    "model_version": row[6],
                }
            )

        return {
            "sensor_id": sensor_id,
            "forecast_date": forecast_date.isoformat(),
            "total_predictions": len(predictions),
            "predictions": predictions,
        }

    finally:

        cursor.close()
        connection.close()


@router.get("/evaluation")
async def get_evaluation_metrics():

    return {
        "model_name": "XGBoost",
        "model_version": "2.0",
        "metrics": {
            "mae": 67.97,
            "rmse": 148.52,
            "r2": 0.9691,
        },
        "test_samples": 468213,
        "sensors": 66,
    }