import React, { useMemo, useState } from 'react';
import FireMap from '../FireMap';
import { IconSearch, IconLayers, IconBolt } from '../Icons';
import {
  CLASSIFICATION_CONFIG,
  classConfig,
  deriveSeverity,
  detectionId,
  fmtNumber,
  TIME_WINDOWS,
} from '../../lib/fireConfig';

const CONF_LEVELS = [
  { label: 'ANY', value: 0 },
  { label: '≥50%', value: 0.5 },
  { label: '≥70%', value: 0.7 },
  { label: '≥90%', value: 0.9 },
];

export default function LiveMapView({ data }) {
  const { points, zones, plants, setSelected, selected, hours, setHours } = data;
  const [showZones, setShowZones] = useState(false);
  const [showPlants, setShowPlants] = useState(false);
  const [q, setQ] = useState('');
  const [cats, setCats] = useState(() => new Set(Object.keys(CLASSIFICATION_CONFIG)));
  const [reviewOnly, setReviewOnly] = useState(false);
  const [minConf, setMinConf] = useState(0);

  const toggleCat = (k) =>
    setCats((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return points.filter((f) => {
      const p = f.properties || {};
      const cfg = classConfig(p.classification);
      if (cfg && !cats.has(cfg.key)) return false;
      if (reviewOnly && !p.needs_review) return false;
      if ((Number(p.confidence_score) || 0) < minConf) return false;
      if (t) {
        const hit =
          detectionId(p).toLowerCase().includes(t) ||
          String(p.classification || '').toLowerCase().includes(t) ||
          `${p.latitude},${p.longitude}`.includes(t);
        if (!hit) return false;
      }
      return true;
    });
  }, [points, cats, reviewOnly, minConf, q]);

  return (
    <div style={{ position: 'relative', height: '100%' }}>
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

      {/* Top toolbar */}
      <div className="map-overlay map-toolbar">
        <div className="map-search">
          <IconSearch size={15} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search detections" aria-label="Search" />
        </div>
        <div className="seg">
          {TIME_WINDOWS.map((w) => (
            <button key={String(w.value)} className={hours === w.value ? 'on' : ''} onClick={() => setHours(w.value)}>{w.label}</button>
          ))}
        </div>
        <button className={`toggle-pill ${showZones ? 'on' : ''}`} onClick={() => setShowZones((v) => !v)}><IconLayers size={14} /> Zones</button>
        <button className={`toggle-pill ${showPlants ? 'on' : ''}`} onClick={() => setShowPlants((v) => !v)}><IconBolt size={14} /> Plants</button>
      </div>

      {/* Filter panel */}
      <div className="map-overlay" style={{ top: 70, left: 14, width: 230, padding: 14 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <div className="eyebrow" style={{ marginBottom: 8 }}>Classification</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {Object.values(CLASSIFICATION_CONFIG).map((c) => (
                <button
                  key={c.key}
                  onClick={() => toggleCat(c.key)}
                  className={`toggle-pill ${cats.has(c.key) ? 'on' : ''}`}
                  style={{ justifyContent: 'flex-start', width: '100%', opacity: cats.has(c.key) ? 1 : 0.5 }}
                >
                  <span className="swatch" style={{ background: c.color }} /> {c.short}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="eyebrow" style={{ marginBottom: 8 }}>Confidence Filter</div>
            <div className="seg" style={{ width: '100%', justifyContent: 'space-between' }}>
              {CONF_LEVELS.map((l) => (
                <button key={l.value} className={minConf === l.value ? 'on' : ''} onClick={() => setMinConf(l.value)}>{l.label}</button>
              ))}
            </div>
          </div>

          <button className={`toggle-pill ${reviewOnly ? 'on' : ''}`} onClick={() => setReviewOnly((v) => !v)} style={{ justifyContent: 'flex-start' }}>
            <span className="swatch" style={{ background: 'var(--review)' }} /> Needs Review only
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="map-overlay map-legend">
        <div className="lh">
          <b>Visible Detections</b>
          <span className="legend-count">{fmtNumber(filtered.length)}</span>
        </div>
        {Object.values(CLASSIFICATION_CONFIG).map((c) => (
          <div className="legend-row" key={c.key}><span className="swatch" style={{ background: c.color }} /> {c.label}</div>
        ))}
        <div className="legend-row"><span className="swatch" style={{ background: 'var(--review)' }} /> Needs Review</div>
      </div>
    </div>
  );
}
