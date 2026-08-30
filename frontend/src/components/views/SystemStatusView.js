import React from 'react';
import { fmtNumber, fmtDateTime } from '../../lib/fireConfig';
import { API_HOST } from '../../lib/api';

function StatusPill({ ok, label }) {
  return (
    <span className={`status-pill ${ok ? 'ok' : 'warn'}`}>
      <span className="status-dot" />
      {label}
    </span>
  );
}

export default function SystemStatusView({ data }) {
  const { stats, totals, error, lastRefreshed, plants, zones, points } = data;
  const backendOk = !error && !!stats;

  const pipeline = [
    {
      stage: 'NASA FIRMS Ingestion',
      desc: 'VIIRS S-NPP / NOAA-20 active-fire thermal anomalies',
      metric: fmtNumber(totals.total),
      unit: 'detections archived',
      ok: !!totals.total,
    },
    {
      stage: 'Feature Engineering',
      desc: 'Distance-to-industry, recurrence, FRP & brightness features',
      metric: '6',
      unit: 'engineered features',
      ok: backendOk,
    },
    {
      stage: 'ML Classification',
      desc: 'Random-forest classifier + rule-based review gate',
      metric: '3',
      unit: 'output classes',
      ok: backendOk,
    },
    {
      stage: 'Intelligence API',
      desc: 'FastAPI serving GeoJSON detections & reference layers',
      metric: backendOk ? 'Online' : 'Degraded',
      unit: 'service state',
      ok: backendOk,
    },
  ];

  const services = [
    { label: 'Detection API', ok: backendOk },
    { label: 'Statistics Feed', ok: !!stats },
    { label: 'Industrial Zones Layer', ok: !!(zones?.features?.length) },
    { label: 'Power Plants Layer', ok: !!(plants?.length) },
  ];

  return (
    <div className="view system-view">
      <div className="view-head">
        <div>
          <h1>System Status</h1>
          <p className="view-sub">Live health of the AGENI detection and classification pipeline.</p>
        </div>
        <StatusPill ok={backendOk} label={backendOk ? 'All Systems Operational' : 'Service Degraded'} />
      </div>

      {error && <div className="banner-error">{error}</div>}

      <div className="pipeline">
        {pipeline.map((p, i) => (
          <React.Fragment key={p.stage}>
            <div className={`pipeline-stage ${p.ok ? '' : 'stage-warn'}`}>
              <div className="pipeline-top">
                <span className="pipeline-idx">{String(i + 1).padStart(2, '0')}</span>
                <StatusPill ok={p.ok} label={p.ok ? 'Active' : 'Check'} />
              </div>
              <h3>{p.stage}</h3>
              <p>{p.desc}</p>
              <div className="pipeline-metric">
                <span className="pipeline-num">{p.metric}</span>
                <span className="pipeline-unit">{p.unit}</span>
              </div>
            </div>
            {i < pipeline.length - 1 && <div className="pipeline-arrow">→</div>}
          </React.Fragment>
        ))}
      </div>

      <div className="system-grid">
        <section className="panel">
          <div className="panel-head"><h2>Service Health</h2></div>
          <div className="service-list">
            {services.map((s) => (
              <div className="service-row" key={s.label}>
                <span>{s.label}</span>
                <StatusPill ok={s.ok} label={s.ok ? 'Operational' : 'Unavailable'} />
              </div>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panel-head"><h2>Data Freshness</h2></div>
          <div className="kv-list">
            <div className="kv-row">
              <span className="kv-k">Most Recent Ingestion</span>
              <span className="kv-v">{totals.ingestion ? fmtDateTime(totals.ingestion) : '—'}</span>
            </div>
            <div className="kv-row">
              <span className="kv-k">Client Last Refreshed</span>
              <span className="kv-v">{lastRefreshed ? lastRefreshed.toLocaleTimeString() : '—'}</span>
            </div>
            <div className="kv-row">
              <span className="kv-k">Detections in Memory</span>
              <span className="kv-v">{fmtNumber(points.length)}</span>
            </div>
            <div className="kv-row">
              <span className="kv-k">API Endpoint</span>
              <span className="kv-v mono-sm">{API_HOST.replace('https://', '')}</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
