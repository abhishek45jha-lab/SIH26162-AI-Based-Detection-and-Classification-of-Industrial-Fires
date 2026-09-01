// Client-side insurance bridge used only when the Insurance API is unavailable.
// It reads existing Ageni thermal feature properties and keeps asset valuation
// blank rather than inventing a financial amount.

export const UIIC_REFERENCE_FALLBACK = {
  provider: {
    name: 'United India Insurance Company Limited',
    short_name: 'UIIC',
    connection_mode: 'REFERENCE DATA',
    live_api_connected: false,
    description: 'Official UIIC product and document references are available. No authorised live UIIC API is connected to Ageni.',
  },
  products: [
    {
      id: 'sfsp',
      name: 'Standard Fire & Special Perils',
      uiic_label: 'Standard Fire and Special perils Policy',
      official_source: 'https://uiic.co.in/en/node/1346',
      source_label: 'UIIC official product page',
      reference_summary: 'UIIC publishes a Standard Fire and Special perils product page and related claim/document references. Confirm the applicable proposal, schedule and policy wording for the risk.',
      relevant_information: [
        'Product information and claim-form references are published by UIIC.',
        'Facility description, protection details and supporting records may be relevant during risk review.',
        'Actual insured perils, conditions, exclusions and deductibles must be read from the issued policy wording.',
      ],
      required_information: ['Full risk location and business activity', 'Property, plant, machinery and stock description', 'Fire protection and inspection evidence', 'Policy schedule, conditions and supporting documents'],
    },
    {
      id: 'iar',
      name: 'Industrial All Risk',
      uiic_label: 'Industrial All Risk',
      official_source: 'https://uiic.co.in/en/node/1345',
      source_label: 'UIIC official product page',
      reference_summary: 'UIIC publishes an Industrial All Risk product page and proposal form reference. Confirm eligibility, scope and conditions against the actual issued wording.',
      relevant_information: [
        'UIIC publishes an Industrial All Risk product and proposal-form reference.',
        'Industrial activity, site layout, protection systems and asset information are relevant inputs for review.',
        'Coverage, exclusions, limits, deductibles and conditions are policy-specific and are not inferred by Ageni.',
      ],
      required_information: ['Industrial activity and complete location details', 'Site layout, construction and process information', 'Asset/stock values supplied by the insured', 'Protection, maintenance and loss-history records'],
    },
  ],
  disclaimer: 'UIIC reference information is informational only. Verify against the actual policy wording and obtain advice from an authorised insurance professional.',
};

function number(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function clamp(value) { return Math.max(0, Math.min(100, value)); }

export function recordFromFeature(feature) {
  return { ...(feature?.properties || feature || {}) };
}

export function dataCompleteness(record) {
  const available = [
    record.latitude !== undefined && record.longitude !== undefined,
    Boolean(record.classification),
    record.frp !== undefined || record.brightness !== undefined,
    record.recurrence_count !== undefined,
    record.dist_to_industrial_m !== undefined,
    record.dist_to_powerplant_m !== undefined,
    Boolean(record.nearest_industrial_zone || record.nearest_power_plant || record.primary_fuel || record.capacity_mw),
  ];
  return Math.round(available.filter(Boolean).length / available.length * 100);
}

export function operationalRisk(record) {
  const existing = number(record.operational_risk_score ?? record.operational_risk);
  if (existing !== null) return Math.round(clamp(existing));
  const classification = String(record.classification || '').toLowerCase();
  const classSignal = classification.includes('unplanned') || classification.includes('industrial fire') ? 85 : classification.includes('persistent') || classification.includes('flare') || classification.includes('source') ? 62 : classification.includes('wildfire') || classification.includes('biomass') ? 34 : 45;
  const frp = number(record.frp);
  const brightness = number(record.brightness);
  const recurrence = number(record.recurrence_count);
  const industrialDistance = number(record.dist_to_industrial_m);
  const powerDistance = number(record.dist_to_powerplant_m);
  const frpSignal = frp === null ? 35 : clamp(frp / 25 * 100);
  const brightnessSignal = brightness === null ? 35 : clamp((brightness - 300) / 35 * 100);
  const recurrenceSignal = recurrence === null ? 0 : clamp(recurrence / 8 * 100);
  const industrialSignal = industrialDistance === null ? 0 : clamp(100 - industrialDistance / 30);
  const powerSignal = powerDistance === null ? 0 : clamp(100 - powerDistance / 40);
  return Math.round(clamp(classSignal * .3 + frpSignal * .22 + brightnessSignal * .13 + recurrenceSignal * .15 + industrialSignal * .12 + powerSignal * .08));
}

export function insuranceRiskIndicator(record) {
  const operational = operationalRisk(record);
  const frp = number(record.frp);
  const recurrence = number(record.recurrence_count);
  const industrialDistance = number(record.dist_to_industrial_m);
  const powerDistance = number(record.dist_to_powerplant_m);
  const classification = String(record.classification || '').toLowerCase();
  const thermalSignal = frp === null ? 35 : clamp(frp / 25 * 100);
  const recurrenceSignal = recurrence === null ? 0 : clamp(recurrence / 8 * 100);
  const industrialSignal = industrialDistance === null ? 0 : clamp(100 - industrialDistance / 30);
  const powerSignal = powerDistance === null ? 0 : clamp(100 - powerDistance / 40);
  const contextSignal = classification.includes('industrial') || classification.includes('persistent') ? 86 : 45;
  return Math.round(clamp(operational * .48 + thermalSignal * .14 + recurrenceSignal * .13 + industrialSignal * .1 + powerSignal * .08 + contextSignal * .04 + dataCompleteness(record) * .03));
}

export function riskLabel(score) {
  if (score === null || score === undefined) return 'Unavailable';
  return score >= 85 ? 'Critical' : score >= 65 ? 'High' : score >= 40 ? 'Moderate' : 'Low';
}

export function modelConfidence(record) {
  const score = number(record.confidence_score);
  if (score === null) return null;
  return Math.round((score <= 1 ? score * 100 : score) * 10) / 10;
}

export function makeInsuranceProfile(input, selectedProduct = 'iar') {
  const record = recordFromFeature(input);
  const operational = operationalRisk(record);
  const indicator = insuranceRiskIndicator(record);
  const product = UIIC_REFERENCE_FALLBACK.products.find((item) => item.id === selectedProduct) || UIIC_REFERENCE_FALLBACK.products[1];
  const missing = [];
  [['Model classification', 'classification'], ['FRP', 'frp'], ['Recurrence', 'recurrence_count'], ['Industrial proximity', 'dist_to_industrial_m'], ['Power infrastructure proximity', 'dist_to_powerplant_m']].forEach(([label, key]) => {
    if (record[key] === undefined || record[key] === null || record[key] === '') missing.push(label);
  });
  const factors = [];
  if (number(record.frp) !== null && number(record.frp) >= 10) factors.push('Elevated FRP / thermal intensity');
  if (number(record.recurrence_count) > 0) factors.push('Repeated thermal activity');
  if (number(record.dist_to_industrial_m) !== null && number(record.dist_to_industrial_m) <= 1000) factors.push('Close proximity to an industrial zone');
  if (number(record.dist_to_powerplant_m) !== null && number(record.dist_to_powerplant_m) <= 1500) factors.push('Close proximity to power infrastructure');
  if (!factors.length) factors.push('Available operational and location context is limited');
  const recommendations = [];
  if (number(record.frp) !== null && number(record.frp) >= 10) recommendations.push('Investigate elevated thermal intensity with human review.');
  if (number(record.recurrence_count) > 0) recommendations.push('Review repeated thermal detections and document the site response.');
  if (number(record.dist_to_industrial_m) !== null && number(record.dist_to_industrial_m) <= 1000) recommendations.push('Verify fire-protection readiness for the nearby industrial exposure.');
  if (number(record.dist_to_powerplant_m) !== null && number(record.dist_to_powerplant_m) <= 1500) recommendations.push('Review electrical and power-infrastructure inspection evidence.');
  if (!recommendations.length) recommendations.push('Complete missing location and protection evidence before insurance review.');
  return {
    detection_id: record.id,
    facility: record.facility || record.nearest_industrial_zone || 'Selected Ageni detection',
    location: { latitude: record.latitude ?? null, longitude: record.longitude ?? null },
    industry: record.industry || null,
    fuel: record.primary_fuel || null,
    capacity_mw: record.capacity_mw ?? null,
    classification: record.classification || null,
    operational_risk: operational,
    operational_risk_label: riskLabel(operational),
    fire_exposure: riskLabel(operational),
    thermal_activity: indicator >= 65 ? 'High' : indicator >= 40 ? 'Moderate' : 'Low',
    frp: record.frp ?? null,
    brightness: record.brightness ?? null,
    viirs_confidence: record.confidence || null,
    model_confidence: modelConfidence(record),
    industrial_proximity_m: record.dist_to_industrial_m ?? null,
    power_infrastructure_proximity_m: record.dist_to_powerplant_m ?? null,
    recurrence_count: record.recurrence_count ?? null,
    date: record.acq_date || null,
    time: record.acq_time || null,
    nearest_industrial_zone: record.nearest_industrial_zone || null,
    nearest_power_plant: record.nearest_power_plant || null,
    primary_fuel: record.primary_fuel || null,
    insurance_risk_indicator: indicator,
    insurance_risk_label: riskLabel(indicator),
    data_completeness: dataCompleteness(record),
    missing_data: missing,
    why_this_is_high: factors,
    asset_context: { valuation: null, status: 'Asset valuation unavailable' },
    environmental_context: { frp: record.frp ?? null, brightness: record.brightness ?? null, classification: record.classification || null },
    risk_flags: factors,
    selected_uiic_product: product,
    insurance_relevance: indicator >= 65 ? 'These signals indicate elevated industrial fire exposure and may warrant additional risk review.' : 'Available signals indicate a lower insurance-relevance indicator; continue routine evidence review.',
    documentation_considerations: ['Verify the full risk location and facility description against source records.', 'Keep fire-protection, inspection and maintenance evidence current.', 'Provide asset values only from user-authorised records; Ageni does not infer asset valuation.', 'Verify product scope, conditions, exclusions and deductibles against the actual policy wording.'],
    recommendations,
    data_sources: ['NASA FIRMS / VIIRS_SNPP_NRT thermal detections', 'Existing Ageni thermal_points database', 'Existing industrial-zone spatial data', 'Existing power-plant spatial data', 'Existing Ageni classification and confidence outputs', 'UIIC official reference information'],
    disclaimer: UIIC_REFERENCE_FALLBACK.disclaimer,
  };
}

export function overviewFromPoints(features = []) {
  const profiles = features.map((feature) => makeInsuranceProfile(feature));
  profiles.sort((a, b) => b.insurance_risk_indicator - a.insurance_risk_indicator);
  const distribution = { Critical: 0, High: 0, Moderate: 0, Low: 0 };
  profiles.forEach((profile) => { distribution[profile.insurance_risk_label] = (distribution[profile.insurance_risk_label] || 0) + 1; });
  return {
    provider: UIIC_REFERENCE_FALLBACK.provider,
    summary: {
      locations_analysed: profiles.length,
      high_risk_locations: profiles.filter((profile) => profile.insurance_risk_indicator >= 65).length,
      locations_requiring_review: profiles.filter((profile) => profile.insurance_risk_indicator >= 75).length,
      data_completeness: profiles.length ? Math.round(profiles.reduce((total, profile) => total + profile.data_completeness, 0) / profiles.length) : 0,
    },
    risk_distribution: distribution,
    top_locations: profiles.slice(0, 10),
    recent_events: profiles.slice(0, 8),
    uiic_products: UIIC_REFERENCE_FALLBACK.products,
    data_sources: profiles[0]?.data_sources || [],
    disclaimer: UIIC_REFERENCE_FALLBACK.disclaimer,
  };
}
