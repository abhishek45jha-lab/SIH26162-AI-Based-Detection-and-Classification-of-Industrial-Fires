"""Insurance Intelligence service built on Ageni's existing detection outputs.

This module deliberately does not change the NASA FIRMS ingestion or the Random
Forest classifier. It translates the existing thermal/context fields into a
separate, explainable insurance-risk indicator and exposes UIIC reference data.
The indicator is an Ageni analytical signal, not an underwriting, pricing, or
coverage decision.
"""

from __future__ import annotations

from typing import Any, Dict, Iterable, List, Optional


UIIC_REFERENCE = {
    "provider": {
        "name": "United India Insurance Company Limited",
        "short_name": "UIIC",
        "connection_mode": "REFERENCE DATA",
        "live_api_connected": False,
        "description": (
            "Official UIIC product and document references are available. "
            "No authorised live UIIC API is connected to Ageni."
        ),
    },
    "products": [
        {
            "id": "sfsp",
            "name": "Standard Fire & Special Perils",
            "uiic_label": "Standard Fire and Special perils Policy",
            "official_source": "https://uiic.co.in/en/node/1346",
            "source_label": "UIIC official product page",
            "reference_summary": (
                "UIIC publishes a Standard Fire and Special perils product page "
                "and related claim/document references. Confirm the applicable "
                "proposal, schedule and policy wording for the risk."
            ),
            "relevant_information": [
                "Product information and claim-form references are published by UIIC.",
                "Facility description, protection details and supporting records may be relevant during risk review.",
                "Actual insured perils, conditions, exclusions and deductibles must be read from the issued policy wording.",
            ],
            "required_information": [
                "Full risk location and business activity",
                "Property, plant, machinery and stock description",
                "Fire protection and inspection evidence",
                "Policy schedule, conditions and supporting documents",
            ],
        },
        {
            "id": "iar",
            "name": "Industrial All Risk",
            "uiic_label": "Industrial All Risk",
            "official_source": "https://uiic.co.in/en/node/1345",
            "source_label": "UIIC official product page",
            "reference_summary": (
                "UIIC publishes an Industrial All Risk product page and proposal "
                "form reference. Confirm eligibility, scope and conditions against "
                "the actual issued wording."
            ),
            "relevant_information": [
                "UIIC publishes an Industrial All Risk product and proposal-form reference.",
                "Industrial activity, site layout, protection systems and asset information are relevant inputs for review.",
                "Coverage, exclusions, limits, deductibles and conditions are policy-specific and are not inferred by Ageni.",
            ],
            "required_information": [
                "Industrial activity and complete location details",
                "Site layout, construction and process information",
                "Asset/stock values supplied by the insured",
                "Protection, maintenance and loss-history records",
            ],
        },
    ],
    "disclaimer": "UIIC reference information is informational only. Verify against the actual policy wording and obtain advice from an authorised insurance professional.",
}


def _number(value: Any) -> Optional[float]:
    try:
        if value is None or value == "":
            return None
        return float(value)
    except (TypeError, ValueError):
        return None


def _clamp(value: float, lower: float = 0, upper: float = 100) -> float:
    return max(lower, min(upper, value))


def _round_or_none(value: Optional[float]) -> Optional[int]:
    return round(value) if value is not None else None


def data_completeness(record: Dict[str, Any]) -> int:
    """Score availability of existing Ageni inputs; missing values stay missing."""
    checks = [
        record.get("latitude") is not None and record.get("longitude") is not None,
        bool(record.get("classification")),
        record.get("frp") is not None or record.get("brightness") is not None,
        record.get("recurrence_count") is not None,
        record.get("dist_to_industrial_m") is not None,
        record.get("dist_to_powerplant_m") is not None,
        bool(record.get("nearest_industrial_zone") or record.get("nearest_power_plant")),
    ]
    return round(sum(checks) / len(checks) * 100)


def operational_risk(record: Dict[str, Any]) -> int:
    """Use an existing score if one is supplied; otherwise use a transparent bridge.

    The current repository schema does not contain an operational-risk column, so
    this fallback uses only existing classification, FRP, brightness, recurrence
    and proximity fields. It is not added to the fire-classification model.
    """
    existing = _number(record.get("operational_risk_score") or record.get("operational_risk"))
    if existing is not None:
        return round(_clamp(existing))

    classification = str(record.get("classification") or "").lower()
    if "unplanned" in classification or "industrial fire" in classification:
        class_signal = 85
    elif "persistent" in classification or "flare" in classification or "source" in classification:
        class_signal = 62
    elif "wildfire" in classification or "biomass" in classification:
        class_signal = 34
    else:
        class_signal = 45

    frp = _number(record.get("frp"))
    brightness = _number(record.get("brightness"))
    recurrence = _number(record.get("recurrence_count"))
    industrial_distance = _number(record.get("dist_to_industrial_m"))
    power_distance = _number(record.get("dist_to_powerplant_m"))

    frp_signal = _clamp((frp or 0) / 25 * 100) if frp is not None else 35
    brightness_signal = _clamp(((brightness or 300) - 300) / 35 * 100) if brightness is not None else 35
    recurrence_signal = _clamp((recurrence or 0) / 8 * 100)
    industrial_signal = _clamp(100 - (industrial_distance or 5000) / 30)
    power_signal = _clamp(100 - (power_distance or 5000) / 40)

    score = (
        class_signal * 0.30
        + frp_signal * 0.22
        + brightness_signal * 0.13
        + recurrence_signal * 0.15
        + industrial_signal * 0.12
        + power_signal * 0.08
    )
    return round(_clamp(score))


def insurance_risk_indicator(record: Dict[str, Any]) -> int:
    """Derive Ageni's separate insurance-relevance indicator from existing inputs."""
    operational = operational_risk(record)
    frp = _number(record.get("frp"))
    recurrence = _number(record.get("recurrence_count"))
    industrial_distance = _number(record.get("dist_to_industrial_m"))
    power_distance = _number(record.get("dist_to_powerplant_m"))
    classification = str(record.get("classification") or "").lower()

    thermal_signal = _clamp((frp or 0) / 25 * 100) if frp is not None else 35
    recurrence_signal = _clamp((recurrence or 0) / 8 * 100)
    industrial_signal = _clamp(100 - (industrial_distance or 5000) / 30)
    power_signal = _clamp(100 - (power_distance or 5000) / 40)
    context_signal = 86 if ("industrial" in classification or "persistent" in classification) else 45
    completeness = data_completeness(record)

    score = (
        operational * 0.48
        + thermal_signal * 0.14
        + recurrence_signal * 0.13
        + industrial_signal * 0.10
        + power_signal * 0.08
        + context_signal * 0.04
        + completeness * 0.03
    )
    return round(_clamp(score))


def risk_label(score: Optional[int]) -> str:
    if score is None:
        return "Unavailable"
    if score >= 85:
        return "Critical"
    if score >= 65:
        return "High"
    if score >= 40:
        return "Moderate"
    return "Low"


def confidence_value(record: Dict[str, Any]) -> Optional[float]:
    """Return classifier confidence as a percentage without changing its meaning."""
    value = _number(record.get("confidence_score"))
    if value is None:
        return None
    return round(value * 100 if value <= 1 else value, 1)


def explain_record(record: Dict[str, Any]) -> List[str]:
    factors: List[str] = []
    frp = _number(record.get("frp"))
    recurrence = _number(record.get("recurrence_count"))
    industrial_distance = _number(record.get("dist_to_industrial_m"))
    power_distance = _number(record.get("dist_to_powerplant_m"))
    if frp is not None and frp >= 10:
        factors.append("Elevated FRP / thermal intensity")
    if recurrence is not None and recurrence > 0:
        factors.append("Repeated thermal activity")
    if industrial_distance is not None and industrial_distance <= 1000:
        factors.append("Close proximity to an industrial zone")
    if power_distance is not None and power_distance <= 1500:
        factors.append("Close proximity to power infrastructure")
    if not factors:
        factors.append("Available operational and location context is limited")
    return factors


def make_profile(record: Dict[str, Any], selected_product: str = "iar") -> Dict[str, Any]:
    operational = operational_risk(record)
    indicator = insurance_risk_indicator(record)
    completeness = data_completeness(record)
    product = next((p for p in UIIC_REFERENCE["products"] if p["id"] == selected_product), UIIC_REFERENCE["products"][1])
    missing = []
    for label, key in [
        ("Model classification", "classification"),
        ("FRP", "frp"),
        ("Recurrence", "recurrence_count"),
        ("Industrial proximity", "dist_to_industrial_m"),
        ("Power infrastructure proximity", "dist_to_powerplant_m"),
    ]:
        if record.get(key) is None or record.get(key) == "":
            missing.append(label)

    recommendations: List[str] = []
    frp = _number(record.get("frp"))
    recurrence = _number(record.get("recurrence_count"))
    industrial_distance = _number(record.get("dist_to_industrial_m"))
    power_distance = _number(record.get("dist_to_powerplant_m"))
    if frp is not None and frp >= 10:
        recommendations.append("Investigate elevated thermal intensity with human review.")
    if recurrence is not None and recurrence > 0:
        recommendations.append("Review repeated thermal detections and document the site response.")
    if industrial_distance is not None and industrial_distance <= 1000:
        recommendations.append("Verify fire-protection readiness for the nearby industrial exposure.")
    if power_distance is not None and power_distance <= 1500:
        recommendations.append("Review electrical and power-infrastructure inspection evidence.")
    if not recommendations:
        recommendations.append("Complete missing location and protection evidence before insurance review.")

    return {
        "facility": record.get("facility") or record.get("nearest_industrial_zone") or "Selected Ageni detection",
        "location": {
            "latitude": record.get("latitude"),
            "longitude": record.get("longitude"),
        },
        "industry": record.get("industry") or "Not available from existing Ageni data",
        "fuel": record.get("primary_fuel") or "Not available from existing Ageni data",
        "capacity_mw": record.get("capacity_mw"),
        "operational_risk": operational,
        "operational_risk_label": risk_label(operational),
        "fire_exposure": risk_label(operational),
        "thermal_activity": risk_label(insurance_risk_indicator({**record, "frp": record.get("frp")})),
        "frp": record.get("frp"),
        "brightness": record.get("brightness"),
        "viirs_confidence": record.get("confidence"),
        "model_confidence": confidence_value(record),
        "industrial_proximity_m": record.get("dist_to_industrial_m"),
        "power_infrastructure_proximity_m": record.get("dist_to_powerplant_m"),
        "recurrence_count": record.get("recurrence_count"),
        "classification": record.get("classification"),
        "date": record.get("acq_date"),
        "time": record.get("acq_time"),
        "nearest_industrial_zone": record.get("nearest_industrial_zone"),
        "nearest_power_plant": record.get("nearest_power_plant"),
        "primary_fuel": record.get("primary_fuel"),
        "insurance_risk_indicator": indicator,
        "insurance_risk_label": risk_label(indicator),
        "data_completeness": completeness,
        "missing_data": missing,
        "why_this_is_high": explain_record(record),
        "asset_context": {"valuation": None, "status": "Asset valuation unavailable"},
        "environmental_context": {
            "frp": record.get("frp"),
            "brightness": record.get("brightness"),
            "classification": record.get("classification"),
        },
        "risk_flags": explain_record(record),
        "insurance_relevance": (
            "These signals indicate elevated industrial fire exposure and may warrant additional risk review."
            if indicator >= 65
            else "Available signals indicate a lower insurance-relevance indicator; continue routine evidence review."
        ),
        "selected_uiic_product": product,
        "documentation_considerations": [
            "Verify the full risk location and facility description against source records.",
            "Keep fire-protection, inspection and maintenance evidence current.",
            "Provide asset values only from user-authorised records; Ageni does not infer asset valuation.",
            "Verify product scope, conditions, exclusions and deductibles against the actual policy wording.",
        ],
        "recommendations": recommendations,
        "data_sources": [
            "NASA FIRMS / VIIRS_SNPP_NRT thermal detections",
            "Existing Ageni thermal_points database",
            "Existing industrial-zone spatial data",
            "Existing power-plant spatial data",
            "Existing Ageni classification and confidence outputs",
            "UIIC official reference information",
        ],
        "disclaimer": UIIC_REFERENCE["disclaimer"],
    }


def overview_from_records(records: Iterable[Dict[str, Any]]) -> Dict[str, Any]:
    rows = list(records)
    profiles = [make_profile(row) for row in rows]
    profiles.sort(key=lambda item: item["insurance_risk_indicator"], reverse=True)
    distribution = {"Critical": 0, "High": 0, "Moderate": 0, "Low": 0}
    for item in profiles:
        distribution[item["insurance_risk_label"]] = distribution.get(item["insurance_risk_label"], 0) + 1
    return {
        "provider": UIIC_REFERENCE["provider"],
        "summary": {
            "locations_analysed": len(profiles),
            "high_risk_locations": sum(item["insurance_risk_indicator"] >= 65 for item in profiles),
            "locations_requiring_review": sum(item["insurance_risk_indicator"] >= 75 for item in profiles),
            "data_completeness": round(sum(item["data_completeness"] for item in profiles) / len(profiles)) if profiles else 0,
        },
        "risk_distribution": distribution,
        "top_locations": profiles[:10],
        "recent_events": profiles[:8],
        "uiic_products": UIIC_REFERENCE["products"],
        "data_sources": profiles[0]["data_sources"] if profiles else [],
        "disclaimer": UIIC_REFERENCE["disclaimer"],
    }


def empty_policy_analysis(filename: str, content_type: Optional[str], size_bytes: int) -> Dict[str, Any]:
    return {
        "status": "received",
        "extraction_status": "reference_only",
        "filename": filename,
        "content_type": content_type,
        "size_bytes": size_bytes,
        "extracted": {
            "policy_type": None,
            "policy_period": None,
            "insured_entity": None,
            "risk_location": None,
            "sum_insured": None,
            "insured_property": None,
            "coverage_sections": [],
            "deductibles_or_excess": None,
            "extensions": [],
            "conditions": [],
            "exclusions": [],
        },
        "review_items": [
            "Policy text extraction is not enabled in this deployment.",
            "Upload is acknowledged without persisting the document in the database.",
            "Verify all extracted or manually entered information against the actual policy wording.",
        ],
        "disclaimer": UIIC_REFERENCE["disclaimer"],
    }
