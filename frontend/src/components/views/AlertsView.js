import React, { useMemo, useState } from 'react';
import {
  deriveSeverity,
  classLabel,
  classColor,
  detectionId,
  fmtConfidence,
  fmtDistanceKm,
  fmtDateTime,
  fmtNumber,
  pointCoords,
  SEVERITY,
} from '../../lib/fireConfig';

const FILTERS = [
  { id: 'all', label: 'All Priority' },
  { id: 'CRITICAL', label: 'Critical' },
  { id: 'HIGH', label: 'High' },
  { id: 'REVIEW', label: 'Needs Review' },
];

export default function AlertsView({ data }) {
  const { points, setSelected, windowMetrics } = data;
  const [filter, setFilter] = useState('all');

  const alerts = useMemo(() => {
    const list = points
      .map((f) => ({ f, props: f.properties || {}, sev: deriveSeverity(f.properties || {}) }))
      .filter((x) => x.sev.rank >= 1) // Critical, High, Medium, Review
      .sort((a, b) => {
        if (b.sev.rank !== a.sev.rank) return b.sev.rank - a.sev.rank;
        return (Number(b.props.frp) || 0) - (Number(a.props.frp) || 0);
      });
    if (filter === 'all') return list;
    return list.filter((x) => x.sev.label === SEVERITY[filter]?.label);
  }, [points, filter]);

  const counts = useMemo(() => {
    const c = { CRITICAL: 0, HIGH: 0, REVIEW: 0 };
    for (const f of points) {
      const s = deriveSeverity(f.properties || {});
      if (s.label === SEVERITY.CRITICAL.label) c.CRITICAL += 1;
      else if (s.label === SEVERITY.HIGH.label) c.HIGH += 1;
      else if (s.label === SEVERITY.REVIEW.label) c.REVIEW += 1;
    }
    return c;
  }, [points]);

  return (
    <div className="view alerts-view">
      <div className="view-head">
        <div>
          <h1>Alert Triage</h1>
          <p className="view-sub">
            Prioritized response queue derived from radiative power, recurrence, and industrial proximity.
          </p>
        </div>
      </div>

      <div className="alert-summary">
        <div className="alert-stat critical">
          <span className="alert-stat-num">{fmtNumber(counts.CRITICAL)}</span>
          <span className="alert-stat-label">Critical</span>
        </div>
        <div className="alert-stat high">
          <span className="alert-stat-num">{fmtNumber(counts.HIGH)}</span>
          <span className="alert-stat-label">High Priority</span>
        </div>
        <div className="alert-stat review">
          <span className="alert-stat-num">{fmtNumber(counts.REVIEW)}</span>
          <span className="alert-stat-label">Needs Review</span>
        </div>
        <div className="alert-stat neutral">
          <span className="alert-stat-num">{fmtNumber(windowMetrics.count)}</span>
          <span className="alert-stat-label">Total in Window</span>
        </div>
      </div>

      <div className="alert-filters">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            className={`chip ${filter === f.id ? 'chip-active' : ''}`}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="alert-list">
        {alerts.length === 0 && (
          <div className="empty-mini">No alerts match this filter in the current time window.</div>
        )}
        {alerts.slice(0, 100).map(({ props, sev }, i) => {
          const { lat, lng } = pointCoords({ properties: props });
          return (
            <button className="alert-row" key={props.id || i} onClick={() => setSelected(props)}>
              <span className="alert-bar" style={{ background: sev.color }} />
              <span className="alert-sev" style={{ color: sev.color, borderColor: sev.color }}>
                {sev.label}
              </span>
              <span className="alert-main">
                <span className="alert-id">{detectionId(props)}</span>
                <span className="alert-class" style={{ color: classColor(props.classification, props.needs_review) }}>
                  {classLabel(props.classification)}
                </span>
              </span>
              <span className="alert-metrics">
                <span className="alert-metric">
                  <span className="m-t">FRP</span>
                  <span className="m-v">{props.frp != null ? `${props.frp} MW` : 'N/A'}</span>
                </span>
                <span className="alert-metric">
                  <span className="m-t">Confidence</span>
                  <span className="m-v">{fmtConfidence(props.confidence_score)}</span>
                </span>
                <span className="alert-metric">
                  <span className="m-t">Ind. Zone</span>
                  <span className="m-v">{fmtDistanceKm(props.dist_to_industrial_m)}</span>
                </span>
                <span className="alert-metric hide-sm">
                  <span className="m-t">Location</span>
                  <span className="m-v">{lat != null ? `${Number(lat).toFixed(2)}, ${Number(lng).toFixed(2)}` : 'N/A'}</span>
                </span>
              </span>
              <span className="alert-time">{fmtDateTime(props.acq_date, props.acq_time)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
