"""
FastAPI Backend for SIH 2026 Fire & Flare Monitoring System.
"""

import json
import os
from contextlib import asynccontextmanager, contextmanager
from datetime import date, datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware

try:
    from insurance import (
        UIIC_REFERENCE,
        empty_policy_analysis,
        make_profile,
        overview_from_records,
    )
except ImportError:  # Supports `uvicorn backend.main:app` from the repository root.
    from backend.insurance import (
        UIIC_REFERENCE,
        empty_policy_analysis,
        make_profile,
        overview_from_records,
    )

# ---------------------------------------------------------------------------
# Environment & Database Configuration
# ---------------------------------------------------------------------------

ENV_PATH = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=ENV_PATH)
load_dotenv()  # Fallback to local .env if available

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = int(os.getenv("DB_PORT", "5432"))
DB_NAME = os.getenv("DB_NAME", "sih_fire_db")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")


@contextmanager
def get_db_connection():
    """Context manager for acquiring and closing database connections."""
    conn = psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD,
    )
    try:
        yield conn
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# FastAPI Application Initialization
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Ageni Industrial Fire & Insurance Intelligence API",
    description="Backend API serving existing Ageni thermal/map outputs and a separate, explainable insurance intelligence bridge.",
    version="1.1.0",
)

# Enable CORS for local dev / all origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Helper Functions
# ---------------------------------------------------------------------------

def serialize_value(val: Any) -> Any:
    """Convert non-serializable database types to JSON-serializable formats."""
    if isinstance(val, (date, datetime)):
        return val.isoformat()
    return val


def build_geojson_feature(geom_json_str: Optional[str], properties: Dict[str, Any]) -> Dict[str, Any]:
    """Construct a single GeoJSON Feature object."""
    geometry = json.loads(geom_json_str) if geom_json_str else None
    clean_props = {k: serialize_value(v) for k, v in properties.items()}
    return {
        "type": "Feature",
        "geometry": geometry,
        "properties": clean_props,
    }


# ---------------------------------------------------------------------------
# API Endpoints
# ---------------------------------------------------------------------------

@app.get("/")
def root():
    return {
        "service": "Ageni Industrial Fire & Insurance Intelligence API",
        "status": "online",
        "endpoints": [
            "/api/thermal-points",
            "/api/thermal-points?hours=24",
            "/api/industrial-zones",
            "/api/power-plants",
            "/api/stats",
            "/api/insurance/overview",
            "/api/insurance/uiic/products",
            "/api/insurance/uiic/reference",
            "/api/insurance/risk/{detection_id}",
            "/api/insurance/policy/analyze",
        ],
    }


# ---------------------------------------------------------------------------
# Insurance Intelligence bridge
# ---------------------------------------------------------------------------

def _insurance_record_query(where_clause: str = "", params: Optional[List[Any]] = None) -> tuple[str, List[Any]]:
    """Build a query over existing thermal/context data without duplicating tables."""
    query = """
        SELECT
            tp.id,
            tp.latitude,
            tp.longitude,
            tp.frp,
            tp.brightness,
            tp.confidence,
            tp.acq_date,
            tp.acq_time,
            tp.classification,
            tp.confidence_score,
            tp.needs_review,
            tp.dist_to_industrial_m,
            tp.dist_to_powerplant_m,
            tp.recurrence_count,
            iz.name AS nearest_industrial_zone,
            pp.name AS nearest_power_plant,
            pp.primary_fuel,
            pp.capacity_mw
        FROM thermal_points AS tp
        LEFT JOIN LATERAL (
            SELECT name
            FROM industrial_zones
            WHERE tp.geom IS NOT NULL AND wkb_geometry IS NOT NULL
            ORDER BY tp.geom <-> wkb_geometry
            LIMIT 1
        ) AS iz ON TRUE
        LEFT JOIN LATERAL (
            SELECT name, primary_fuel, capacity_mw
            FROM power_plants
            WHERE tp.geom IS NOT NULL AND geom IS NOT NULL
            ORDER BY tp.geom <-> geom
            LIMIT 1
        ) AS pp ON TRUE
    """
    query += where_clause
    return query, list(params or [])


def _load_insurance_records(limit: int = 250) -> List[Dict[str, Any]]:
    query, params = _insurance_record_query(" ORDER BY tp.id DESC LIMIT %s", [limit])
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(query, params)
            return [dict(row) for row in cur.fetchall()]


@app.get("/api/insurance/uiic/products")
def get_uiic_products():
    """Return official UIIC reference products; no live insurer API is implied."""
    return {
        "provider": UIIC_REFERENCE["provider"],
        "products": UIIC_REFERENCE["products"],
        "disclaimer": UIIC_REFERENCE["disclaimer"],
    }


@app.get("/api/insurance/uiic/reference")
def get_uiic_reference():
    """Return the UIIC reference-data layer used by Insurance Intelligence."""
    return UIIC_REFERENCE


@app.get("/api/insurance/overview")
def get_insurance_overview(
    limit: int = Query(250, description="Number of existing thermal detections to analyse", ge=1, le=1000),
):
    """Bridge existing Ageni records into an insurance-relevance overview."""
    try:
        return overview_from_records(_load_insurance_records(limit))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Insurance overview database error: {str(exc)}")


@app.get("/api/insurance/risk/{detection_id}")
def get_insurance_risk(detection_id: int):
    """Return an explainable profile for one existing thermal detection."""
    query, params = _insurance_record_query(" WHERE tp.id = %s", [detection_id])
    try:
        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(query, params)
                row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Ageni detection not found")
        profile = make_profile(dict(row))
        profile["detection_id"] = detection_id
        return profile
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Insurance risk database error: {str(exc)}")


@app.post("/api/insurance/policy/analyze")
async def analyze_insurance_policy(file: UploadFile = File(...)):
    """Acknowledge a user policy document without persisting or inventing extraction.

    Text/OCR extraction is intentionally not claimed when no parser is configured.
    The response gives the frontend a safe hand-off for a future authorised
    document-processing service.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="A policy document filename is required")
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Policy document exceeds the 10 MB limit")
    return empty_policy_analysis(file.filename, file.content_type, len(content))


@app.get("/api/insurance/report/{report_id}")
def get_insurance_report(report_id: str):
    """Return a report-ready analysis payload from existing Ageni data."""
    try:
        report = overview_from_records(_load_insurance_records(250))
        report["report_id"] = report_id
        report["report_type"] = "Insurance Intelligence report"
        return report
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Insurance report database error: {str(exc)}")


@app.get("/api/thermal-points")
def get_thermal_points(
    hours: Optional[float] = Query(None, description="Filter to points within the last N hours (defaults to 24 if not provided)"),
    limit: int = Query(5000, description="Maximum number of rows to return", ge=1, le=100000),
):
    """
    Returns thermal detections from thermal_points table as a GeoJSON FeatureCollection.
    Optionally filter by hours based on acq_date and acq_time. Defaults to 24 hours if not specified.
    Limits maximum number of points returned (default 5000).
    """
    query = """
        SELECT
            id,
            latitude,
            longitude,
            frp,
            brightness,
            confidence,
            acq_date,
            acq_time,
            classification,
            confidence_score,
            needs_review,
            dist_to_industrial_m,
            dist_to_powerplant_m,
            recurrence_count,
            ST_AsGeoJSON(geom) AS geom_json
        FROM thermal_points
    """
    params: List[Any] = []

    # Default to 24 hours when hours parameter is not provided
    effective_hours = hours if hours is not None else 24.0

    if effective_hours > 0:
        query += """
            WHERE to_timestamp(
                acq_date::text || ' ' || LPAD(COALESCE(NULLIF(TRIM(acq_time), ''), '0000'), 4, '0'),
                'YYYY-MM-DD HH24MI'
            ) >= (NOW() AT TIME ZONE 'UTC' - (%s || ' hours')::interval)
        """
        params.append(str(effective_hours))

    query += " ORDER BY id DESC LIMIT %s"
    params.append(limit)

    try:
        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(query, params)
                rows = cur.fetchall()

        features = []
        for row in rows:
            geom_json = row.pop("geom_json")
            features.append(build_geojson_feature(geom_json, dict(row)))

        return {
            "type": "FeatureCollection",
            "features": features,
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Database error: {str(exc)}")


@app.get("/api/industrial-zones")
def get_industrial_zones():
    """
    Returns all industrial zones as a GeoJSON FeatureCollection with name, landuse, and man_made properties.
    """
    # industrial_zones table uses wkb_geometry
    query = """
        SELECT
            name,
            landuse,
            man_made,
            ST_AsGeoJSON(wkb_geometry) AS geom_json
        FROM industrial_zones
    """
    try:
        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(query)
                rows = cur.fetchall()

        features = []
        for row in rows:
            geom_json = row.pop("geom_json")
            features.append(build_geojson_feature(geom_json, dict(row)))

        return {
            "type": "FeatureCollection",
            "features": features,
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Database error: {str(exc)}")


@app.get("/api/power-plants")
def get_power_plants():
    """
    Returns all power plants as a GeoJSON FeatureCollection with name, capacity_mw, and primary_fuel properties.
    """
    query = """
        SELECT
            name,
            capacity_mw,
            primary_fuel,
            ST_AsGeoJSON(geom) AS geom_json
        FROM power_plants
    """
    try:
        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(query)
                rows = cur.fetchall()

        features = []
        for row in rows:
            geom_json = row.pop("geom_json")
            features.append(build_geojson_feature(geom_json, dict(row)))

        return {
            "type": "FeatureCollection",
            "features": features,
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Database error: {str(exc)}")


@app.get("/api/stats")
def get_stats():
    """
    Returns summary statistics: total thermal points, count per classification category, and most recent ingestion timestamp.
    """
    count_query = "SELECT COUNT(*) AS total FROM thermal_points;"
    class_query = """
        SELECT
            COALESCE(classification, 'unclassified') AS category,
            COUNT(*) AS count
        FROM thermal_points
        GROUP BY classification;
    """
    recent_query = "SELECT MAX(inserted_at) AS most_recent_ingestion FROM thermal_points;"

    try:
        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(count_query)
                total_points = cur.fetchone()["total"]

                cur.execute(class_query)
                class_rows = cur.fetchall()
                count_per_classification = {
                    row["category"]: row["count"] for row in class_rows
                }

                cur.execute(recent_query)
                recent_row = cur.fetchone()
                most_recent_ingestion = (
                    serialize_value(recent_row["most_recent_ingestion"])
                    if recent_row and recent_row["most_recent_ingestion"]
                    else None
                )

        return {
            "total_thermal_points": total_points,
            "count_per_classification": count_per_classification,
            "most_recent_ingestion": most_recent_ingestion,
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Database error: {str(exc)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
