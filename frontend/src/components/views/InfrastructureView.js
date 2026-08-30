import React, { useMemo, useState } from 'react';
import FireMap from '../FireMap';
import { fmtNumber, pointCoords } from '../../lib/fireConfig';

export default function InfrastructureView({ data }) {
  const { zones, plants, points } = data;
  const [showZones, setShowZones] = useState(true);
  const [showPlants, setShowPlants] = useState(true);

  const zoneCount = zones?.features?.length || 0;
  const plantCount = plants?.length || 0;

  // Fuel-type breakdown from real power-plant properties
  const fuelMix = useMemo(() => {
    const m = new Map();
    for (const p of plants) {
      const fuel = p.properties?.primary_fuel || 'Unknown';
      m.set(fuel, (m.get(fuel) || 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [plants]);

  const totalCapacity = useMemo(() => {
    let sum = 0;
    let known = 0;
    for (const p of plants) {
      const c = Number(p.properties?.capacity_mw);
      if (!isNaN(c)) { sum += c; known += 1; }
    }
    return { sum, known };
  }, [plants]);

  return (
    <div className="view infra-view">
      <div className="view-head">
        <div>
          <h1>Monitored Infrastructure</h1>
          <p className="view-sub">
            Industrial reference layers the classifier correlates against every thermal detection.
          </p>
        </div>
        <div className="layer-toggles">
          <button className={`chip ${showZones ? 'chip-active' : ''}`} onClick={() => setShowZones((v) => !v)}>
            Industrial Zones
          </button>
          <button className={`chip ${showPlants ? 'chip-active' : ''}`} onClick={() => setShowPlants((v) => !v)}>
            Power Plants
          </button>
        </div>
      </div>

      <div className="infra-metrics">
        <div className="mini-metric">
          <span className="mini-metric-num" style={{ color: '#22d3ee' }}>{fmtNumber(zoneCount)}</span>
          <span className="mini-metric-label">Industrial Zones</span>
        </div>
        <div className="mini-metric">
          <span className="mini-metric-num" style={{ color: '#38bdf8' }}>{fmtNumber(plantCount)}</span>
          <span className="mini-metric-label">Power Plants</span>
        </div>
        <div className="mini-metric">
          <span className="mini-metric-num">{fmtNumber(Math.round(totalCapacity.sum))}</span>
          <span className="mini-metric-label">Total MW ({totalCapacity.known} known)</span>
        </div>
        <div className="mini-metric">
          <span className="mini-metric-num">{fmtNumber(points.length)}</span>
          <span className="mini-metric-label">Detections Correlated</span>
        </div>
      </div>

      <div className="infra-body">
        <div className="infra-map panel">
          <FireMap
            points={[]}
            zones={zones}
            plants={plants}
            showZones={showZones}
            showPlants={showPlants}
          />
        </div>

        <div className="panel infra-side">
          <div className="panel-head">
            <h2>Power Generation Mix</h2>
            <span className="panel-tag">by facility count</span>
          </div>
          {fuelMix.length ? (
            <div className="fuel-list">
              {fuelMix.map(([fuel, count]) => (
                <div className="fuel-row" key={fuel}>
                  <span className="fuel-name">{fuel}</span>
                  <div className="fuel-track">
                    <div
                      className="fuel-fill"
                      style={{ width: `${(count / plantCount) * 100}%` }}
                    />
                  </div>
                  <span className="fuel-count">{count}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-mini">Power-plant reference layer loading…</div>
          )}
        </div>
      </div>
    </div>
  );
}
