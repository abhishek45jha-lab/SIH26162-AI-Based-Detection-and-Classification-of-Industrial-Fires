// ---------------------------------------------------------------------------
// AGENI — shared configuration, classification schema, and formatters.
// All values map directly to the live backend response fields. No data is
// fabricated here; helpers only reshape values that the API already returns.
// ---------------------------------------------------------------------------

// Canonical classification keys returned by /api/stats and /api/thermal-points
export const CLASS_INDUSTRIAL_FIRE = 'Unplanned Industrial Fire';
export const CLASS_INDUSTRIAL_FLARE = 'Persistent Industrial Source';
export const CLASS_WILDFIRE = 'Wildfire / Other Biomass Burning';

// Classification schema — colors follow the AGENI map legend spec:
// RED = unplanned fire, ORANGE = persistent flare, YELLOW = wildfire/biomass.
export const CLASSIFICATION_CONFIG = {
  [CLASS_INDUSTRIAL_FIRE]: {
    key: CLASS_INDUSTRIAL_FIRE,
    color: '#ef4444',
    label: 'Unplanned Industrial Fire',
    short: 'INDUSTRIAL FIRE',
    desc: 'Anomalous high-risk fire inside or adjacent to an industrial zone.',
    risk: 'HIGH',
  },
  [CLASS_INDUSTRIAL_FLARE]: {
    key: CLASS_INDUSTRIAL_FLARE,
    color: '#f97316',
    label: 'Persistent Industrial Flare',
    short: 'INDUSTRIAL FLARE',
    desc: 'Known industrial flare or regulated thermal stack source.',
    risk: 'MEDIUM',
  },
  [CLASS_WILDFIRE]: {
    key: CLASS_WILDFIRE,
    color: '#eab308',
    label: 'Wildfire / Biomass Burning',
    short: 'WILDFIRE',
    desc: 'Vegetation or agricultural stubble burn distant from industry.',
    risk: 'LOW',
  },
};

export const REVIEW_COLOR = '#a855f7';
export const DEFAULT_COLOR = '#64748b';

// Reference-layer colors
export const ZONE_COLOR = '#22d3ee';
export const PLANT_COLOR = '#38bdf8';

export function classConfig(classification) {
  if (!classification) return null;
  const match = Object.keys(CLASSIFICATION_CONFIG).find(
    (k) => k.toLowerCase() === String(classification).trim().toLowerCase()
  );
  if (match) return CLASSIFICATION_CONFIG[match];
  const lower = String(classification).toLowerCase();
  if (lower.includes('unplanned') || lower.includes('industrial fire')) return CLASSIFICATION_CONFIG[CLASS_INDUSTRIAL_FIRE];
  if (lower.includes('persistent') || lower.includes('flare') || lower.includes('stack')) return CLASSIFICATION_CONFIG[CLASS_INDUSTRIAL_FLARE];
  if (lower.includes('wildfire') || lower.includes('biomass') || lower.includes('stubble')) return CLASSIFICATION_CONFIG[CLASS_WILDFIRE];
  return null;
}

export function classColor(classification, needsReview) {
  if (needsReview) return REVIEW_COLOR;
  const cfg = classConfig(classification);
  return cfg ? cfg.color : DEFAULT_COLOR;
}

export function classLabel(classification) {
  const cfg = classConfig(classification);
  return cfg ? cfg.label : 'Unclassified';
}

export function shortLabel(classification) {
  const cfg = classConfig(classification);
  return cfg ? cfg.short : 'UNCLASSIFIED';
}

// ---------------------------------------------------------------------------
// Risk / severity derivation — deterministic from real detection fields.
// ---------------------------------------------------------------------------
export const SEVERITY = {
  CRITICAL: { label: 'CRITICAL', color: '#ef4444', rank: 4 },
  HIGH: { label: 'HIGH', color: '#f97316', rank: 3 },
  MEDIUM: { label: 'MEDIUM', color: '#eab308', rank: 2 },
  REVIEW: { label: 'NEEDS REVIEW', color: REVIEW_COLOR, rank: 1 },
  LOW: { label: 'LOW', color: '#22c55e', rank: 0 },
};

// Derive a severity bucket for a detection's properties object.
export function deriveSeverity(props = {}) {
  const cfg = classConfig(props.classification);
  const frp = Number(props.frp) || 0;
  if (props.needs_review) return SEVERITY.REVIEW;
  if (cfg && cfg.key === CLASS_INDUSTRIAL_FIRE) {
    // Escalate unplanned industrial fires by radiative power / recurrence.
    if (frp >= 20 || (props.recurrence_count || 0) >= 3) return SEVERITY.CRITICAL;
    return SEVERITY.HIGH;
  }
  if (cfg && cfg.key === CLASS_INDUSTRIAL_FLARE) return SEVERITY.MEDIUM;
  if (frp >= 30) return SEVERITY.MEDIUM;
  return SEVERITY.LOW;
}

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------
export function fmtNumber(n) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return Number(n).toLocaleString();
}

export function fmtCompact(n) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  const num = Number(n);
  if (num >= 1000) return `${(num / 1000).toFixed(num >= 10000 ? 0 : 1)}k`;
  return num.toLocaleString();
}

export function fmtDistanceKm(meters) {
  if (meters === null || meters === undefined || isNaN(meters)) return 'N/A';
  return `${(meters / 1000).toFixed(2)} km`;
}

export function fmtConfidence(score) {
  if (score === null || score === undefined || isNaN(score)) return '—';
  return `${Math.round(Number(score) * 100)}%`;
}

export function fmtSourceConfidence(c) {
  if (!c) return 'Nominal';
  const map = { h: 'High', n: 'Nominal', l: 'Low' };
  return map[String(c).toLowerCase()] || c;
}

export function fmtDateTime(dateStr, timeStr) {
  if (!dateStr) return 'N/A';
  let t = '';
  if (timeStr !== undefined && timeStr !== null && String(timeStr) !== '') {
    const padded = String(timeStr).padStart(4, '0');
    t = ` · ${padded.slice(0, 2)}:${padded.slice(2, 4)} UTC`;
  }
  return `${dateStr}${t}`;
}

export function pointCoords(feature) {
  const props = feature.properties || {};
  const lat = props.latitude ?? feature.geometry?.coordinates?.[1];
  const lng = props.longitude ?? feature.geometry?.coordinates?.[0];
  return { lat, lng };
}

export function detectionId(props = {}) {
  return `AGN-${String(props.id ?? '0').padStart(6, '0')}`;
}

// Time window options shared across views
export const TIME_WINDOWS = [
  { label: '24H', value: 24 },
  { label: '48H', value: 48 },
  { label: '5D', value: 120 },
  { label: 'ALL', value: null },
];

// Primary navigation definition
export const NAV_ITEMS = [
  { id: 'command', label: 'Command Center' },
  { id: 'map', label: 'Live Map' },
  { id: 'detections', label: 'Detection Intelligence' },
  { id: 'ai', label: 'AI Analysis' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'alerts', label: 'Alerts' },
  { id: 'infrastructure', label: 'Infrastructure' },
  { id: 'system', label: 'System Status' },
];
