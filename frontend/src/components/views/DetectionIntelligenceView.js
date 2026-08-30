import React, { useMemo, useState } from 'react';
import { IconSearch } from '../Icons';
import {
  CLASSIFICATION_CONFIG,
  classConfig,
  classColor,
  deriveSeverity,
  detectionId,
  shortLabel,
  fmtConfidence,
  fmtDateTime,
  fmtNumber,
  TIME_WINDOWS,
} from '../../lib/fireConfig';

const SORTS = {
  severity: (a, b) => deriveSeverity(b).rank - deriveSeverity(a).rank,
  confidence: (a, b) => (Number(b.confidence_score) || 0) - (Number(a.confidence_score) || 0),
  frp: (a, b) => (Number(b.frp) || 0) - (Number(a.frp) || 0),
  recent: (a, b) => String(b.acq_date).localeCompare(String(a.acq_date)),
};

export default function DetectionIntelligenceView({ data }) {
  const { points, setSelected, selected, hours, setHours, windowMetrics } = data;
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('ALL');
  const [sort, setSort] = useState('severity');

  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    let list = points.map((f) => f.properties || {});
    if (cat !== 'ALL') list = list.filter((p) => classConfig(p.classification)?.key === cat);
    if (cat === 'REVIEW') list = points.map((f) => f.properties || {}).filter((p) => p.needs_review);
    if (t) {
      list = list.filter(
        (p) =>
          detectionId(p).toLowerCase().includes(t) ||
          String(p.classification || '').toLowerCase().includes(t) ||
          `${p.latitude},${p.longitude}`.includes(t)
      );
    }
    return [...list].sort(SORTS[sort]).slice(0, 400);
  }, [points, q, cat, sort]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
        <div className="kpi" style={{ '--kpi-accent': 'var(--info)' }}>
          <div className="kpi-label">In Window</div><div className="kpi-value tiny">{fmtNumber(windowMetrics.count)}</div>
        </div>
        <div className="kpi" style={{ '--kpi-accent': 'var(--fire)' }}>
          <div className="kpi-label">High Risk</div><div className="kpi-value tiny">{fmtNumber(windowMetrics.highRisk)}</div>
        </div>
        <div className="kpi" style={{ '--kpi-accent': 'var(--review)' }}>
          <div className="kpi-label">Needs Review</div><div className="kpi-value tiny">{fmtNumber(windowMetrics.review)}</div>
        </div>
        <div className="kpi" style={{ '--kpi-accent': 'var(--flare)' }}>
          <div className="kpi-label">Avg FRP</div><div className="kpi-value tiny">{windowMetrics.frpAvg.toFixed(1)} MW</div>
        </div>
      </div>

      <div className="card">
        <div className="card-head" style={{ flexWrap: 'wrap', gap: 10 }}>
          <h3>Detection Registry</h3>
          <div className="right" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <div className="map-search" style={{ background: 'var(--bg-2)' }}>
              <IconSearch size={14} />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" aria-label="Search detections" />
            </div>
            <div className="seg">
              {TIME_WINDOWS.map((w) => (
                <button key={String(w.value)} className={hours === w.value ? 'on' : ''} onClick={() => setHours(w.value)}>{w.label}</button>
              ))}
            </div>
          </div>
        </div>

        <div className="card-pad" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', borderBottom: '1px solid var(--border)' }}>
          <button className={`toggle-pill ${cat === 'ALL' ? 'on' : ''}`} onClick={() => setCat('ALL')}>All</button>
          {Object.values(CLASSIFICATION_CONFIG).map((c) => (
            <button key={c.key} className={`toggle-pill ${cat === c.key ? 'on' : ''}`} onClick={() => setCat(c.key)}>
              <span className="swatch" style={{ background: c.color }} /> {c.short}
            </button>
          ))}
          <button className={`toggle-pill ${cat === 'REVIEW' ? 'on' : ''}`} onClick={() => setCat('REVIEW')}>
            <span className="swatch" style={{ background: 'var(--review)' }} /> Needs Review
          </button>
          <div className="seg" style={{ marginLeft: 'auto' }}>
            {[['severity', 'Risk'], ['confidence', 'Conf'], ['frp', 'FRP'], ['recent', 'Recent']].map(([k, l]) => (
              <button key={k} className={sort === k ? 'on' : ''} onClick={() => setSort(k)}>{l}</button>
            ))}
          </div>
        </div>

        <div className="tbl-wrap" style={{ maxHeight: '58vh', overflowY: 'auto' }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Detection ID</th><th>Classification</th><th>Risk</th><th>AI Conf.</th>
                <th>FRP</th><th>Coordinates</th><th>Timestamp</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => {
                const sev = deriveSeverity(p);
                const color = classColor(p.classification, p.needs_review);
                const isSel = selected?.id === p.id;
                return (
                  <tr key={p.id} onClick={() => setSelected(p)} style={isSel ? { background: 'var(--bg-3)' } : undefined}>
                    <td className="mono">{detectionId(p)}</td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                        <span className="swatch" style={{ background: color }} /> {shortLabel(p.classification)}
                      </span>
                    </td>
                    <td><span className="badge" style={{ '--c': sev.color, '--b': sev.color }}>{sev.label}</span></td>
                    <td className="mono">{fmtConfidence(p.confidence_score)}</td>
                    <td className="mono">{p.frp != null ? `${p.frp} MW` : '—'}</td>
                    <td className="mono">{Number(p.latitude)?.toFixed(3)}, {Number(p.longitude)?.toFixed(3)}</td>
                    <td className="mono">{fmtDateTime(p.acq_date, p.acq_time)}</td>
                    <td>{p.needs_review ? <span className="badge" style={{ '--c': 'var(--review)', '--b': 'var(--review)' }}>REVIEW</span> : <span className="badge" style={{ '--c': 'var(--ok)', '--b': 'var(--border)' }}>CLASSIFIED</span>}</td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr><td colSpan={8}><div className="empty">No detections match the current filters.</div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
