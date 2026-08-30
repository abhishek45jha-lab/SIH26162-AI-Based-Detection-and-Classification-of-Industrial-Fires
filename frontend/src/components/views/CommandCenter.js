import React, { useMemo, useState } from 'react';
import FireMap from '../FireMap';
import { IconSearch, IconLayers, IconBolt } from '../Icons';
import {
  CLASSIFICATION_CONFIG,
  classConfig,
  deriveSeverity,
  detectionId,
  shortLabel,
  fmtNumber,
  fmtDateTime,
  TIME_WINDOWS,
} from '../../lib/fireConfig';

function Kpi({ label, value, meta, accent }) {
  return (
    <div className="kpi" style={{ '--kpi-accent': accent }}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      {meta ? <div className="kpi-meta">{meta}</div> : null}
    </div>
  );
}

export default function CommandCenter({ data }) {
  const { points, totals, windowMetrics, zones, plants, setSelected, selected, hours, setHours } = data;
  const [showZones, setShowZones] = useState(false);
  const [showPlants, setShowPlants] = useState(false);
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    if (!q.trim()) return points;
    const t = q.trim().toLowerCase();
    return points.filter((f) => {
      const p = f.properties || {};
      return (
        detectionId(p).toLowerCase().includes(t) ||
        String(p.classification || '').toLowerCase().includes(t) ||
        `${p.latitude},${p.longitude}`.includes(t)
      );
    });
  }, [points, q]);

  const priority = useMemo(() => {
    return [...points]
      .map((f) => ({ p: f.properties || {}, sev: deriveSeverity(f.properties || {}) }))
      .sort((a, b) => b.sev.rank - a.sev.rank || (Number(b.p.frp) || 0) - (Number(a.p.frp) || 0))
      .slice(0, 6);
  }, [points]);

  return (
    <div className="cmd">
      <div className="cmd-kpis">
        <Kpi label="Active Detections" value={fmtNumber(totals.total)} meta="Full archive" accent="var(--info)" />
        <Kpi label="Industrial Fires" value={fmtNumber(totals.industrialFire)} meta="Unplanned" accent="var(--fire)" />
        <Kpi label="Industrial Flares" value={fmtNumber(totals.industrialFlare)} meta="Persistent" accent="var(--flare)" />
        <Kpi label="Wildfires" value={fmtNumber(totals.wildfire)} meta="Biomass burning" accent="var(--wild)" />
        <Kpi label="Needs Review" value={fmtNumber(windowMetrics.review)} meta="In window" accent="var(--review)" />
        <Kpi label="High Risk" value={fmtNumber(windowMetrics.highRisk)} meta="In window" accent="var(--fire)" />
      </div>

      <div className="cmd-map">
        <div className="map-wrap">
          <FireMap
            points={filtered}
            zones={zones}
            plants={plants}
            showZones={showZones}
            showPlants={showPlants}
            onSelect={setSelected}
            selectedId={selected?.id}
          />
        </div>

        <div className="map-overlay map-toolbar">
          <div className="map-search">
            <IconSearch size={15} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search detection ID, class, coordinates"
              aria-label="Search detections"
            />
          </div>
          <div className="seg">
            {TIME_WINDOWS.map((w) => (
              <button key={String(w.value)} className={hours === w.value ? 'on' : ''} onClick={() => setHours(w.value)}>
                {w.label}
              </button>
            ))}
          </div>
          <button className={`toggle-pill ${showZones ? 'on' : ''}`} onClick={() => setShowZones((v) => !v)}>
            <IconLayers size={14} /> Zones
          </button>
          <button className={`toggle-pill ${showPlants ? 'on' : ''}`} onClick={() => setShowPlants((v) => !v)}>
            <IconBolt size={14} /> Plants
          </button>
        </div>

        <div className="map-overlay map-legend">
          <div className="lh">
            <b>Classification Legend</b>
            <span className="legend-count">{fmtNumber(filtered.length)}</span>
          </div>
          {Object.values(CLASSIFICATION_CONFIG).map((c) => (
            <div className="legend-row" key={c.key}>
              <span className="swatch" style={{ background: c.color }} /> {c.label}
            </div>
          ))}
          <div className="legend-row"><span className="swatch" style={{ background: 'var(--review)' }} /> Needs Review</div>
        </div>
      </div>

      <div className="cmd-side">
        <div className="card">
          <div className="card-head"><h3>Classification Breakdown</h3><span className="sub right">FULL ARCHIVE</span></div>
          <div className="card-pad bars">
            {Object.values(CLASSIFICATION_CONFIG).map((c) => {
              const key = c.key === 'Unplanned Industrial Fire' ? 'industrialFire' : c.key === 'Persistent Industrial Source' ? 'industrialFlare' : 'wildfire';
              const val = totals[key] || 0;
              const pct = totals.total ? Math.round((val / totals.total) * 100) : 0;
              return (
                <div className="bar-item" key={c.key}>
                  <div className="bl">
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="swatch" style={{ background: c.color }} /> {c.label}
                    </span>
                    <span className="bv">{fmtNumber(val)} · {pct}%</span>
                  </div>
                  <div className="track"><i style={{ width: `${pct}%`, background: c.color }} /></div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card">
          <div className="card-head"><h3>Priority Detections</h3><span className="sub right">CURRENT WINDOW</span></div>
          <div className="card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {priority.length === 0 && <div className="empty">No detections in this window.</div>}
            {priority.map(({ p, sev }) => (
              <button
                key={p.id}
                onClick={() => setSelected(p)}
                className="alert-row"
                style={{ gridTemplateColumns: '6px 1fr auto', textAlign: 'left' }}
              >
                <span className="alert-bar" style={{ background: sev.color }} />
                <span className="alert-main">
                  <span className="alert-title">
                    <span className="at" style={{ fontSize: '0.8rem', fontFamily: 'var(--mono)' }}>{detectionId(p)}</span>
                  </span>
                  <span className="alert-sub">
                    <span>{shortLabel(p.classification)}</span>
                    <span className="mono">{fmtDateTime(p.acq_date, p.acq_time)}</span>
                  </span>
                </span>
                <span className="badge" style={{ '--c': sev.color, '--b': sev.color }}>{sev.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
