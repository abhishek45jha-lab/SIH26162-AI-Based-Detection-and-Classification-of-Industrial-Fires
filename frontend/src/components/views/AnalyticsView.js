import React, { useMemo } from 'react';
import { DonutChart, BarList, AreaChart, BarChart } from '../Charts';
import {
  classConfig,
  CLASS_INDUSTRIAL_FIRE,
  CLASS_INDUSTRIAL_FLARE,
  CLASS_WILDFIRE,
  CLASSIFICATION_CONFIG,
  fmtCompact,
  fmtNumber,
  pointCoords,
} from '../../lib/fireConfig';

export default function AnalyticsView({ data }) {
  const { points, totals, windowMetrics, hours } = data;

  // Detections per day, derived from real acq_date values in the window
  const timeSeries = useMemo(() => {
    const byDay = new Map();
    for (const f of points) {
      const d = f.properties?.acq_date;
      if (!d) continue;
      byDay.set(d, (byDay.get(d) || 0) + 1);
    }
    return [...byDay.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([label, value]) => ({ label, value }));
  }, [points]);

  // FRP distribution buckets from real frp values
  const frpBuckets = useMemo(() => {
    const buckets = [
      { label: '0–5', min: 0, max: 5, value: 0 },
      { label: '5–10', min: 5, max: 10, value: 0 },
      { label: '10–20', min: 10, max: 20, value: 0 },
      { label: '20–50', min: 20, max: 50, value: 0 },
      { label: '50+', min: 50, max: Infinity, value: 0 },
    ];
    for (const f of points) {
      const frp = Number(f.properties?.frp);
      if (isNaN(frp)) continue;
      const b = buckets.find((x) => frp >= x.min && frp < x.max);
      if (b) b.value += 1;
    }
    return buckets.map((b) => ({ label: b.label, value: b.value }));
  }, [points]);

  // Proximity to industrial infrastructure (real dist_to_industrial_m)
  const proximity = useMemo(() => {
    const buckets = [
      { label: 'Inside / <1km', min: 0, max: 1000, value: 0, color: '#ef4444' },
      { label: '1–5 km', min: 1000, max: 5000, value: 0, color: '#f97316' },
      { label: '5–20 km', min: 5000, max: 20000, value: 0, color: '#eab308' },
      { label: '>20 km', min: 20000, max: Infinity, value: 0, color: '#22c55e' },
    ];
    for (const f of points) {
      const d = Number(f.properties?.dist_to_industrial_m);
      if (isNaN(d)) continue;
      const b = buckets.find((x) => d >= x.min && d < x.max);
      if (b) b.value += 1;
    }
    return buckets;
  }, [points]);

  const totalClassified =
    (totals.industrialFire || 0) + (totals.industrialFlare || 0) + (totals.wildfire || 0);

  const donutData = [
    { label: 'Wildfire', value: totals.wildfire || 0, color: CLASSIFICATION_CONFIG[CLASS_WILDFIRE].color },
    { label: 'Ind. Flare', value: totals.industrialFlare || 0, color: CLASSIFICATION_CONFIG[CLASS_INDUSTRIAL_FLARE].color },
    { label: 'Ind. Fire', value: totals.industrialFire || 0, color: CLASSIFICATION_CONFIG[CLASS_INDUSTRIAL_FIRE].color },
  ];

  const windowLabel = hours ? `last ${hours >= 48 ? `${hours / 24} days` : `${hours} hours`}` : 'full archive';

  return (
    <div className="view analytics-view">
      <div className="view-head">
        <div>
          <h1>Analytics</h1>
          <p className="view-sub">
            Statistical breakdown of {fmtNumber(totals.total)} lifetime detections and {fmtNumber(windowMetrics.count)} in the {windowLabel}.
          </p>
        </div>
      </div>

      <div className="analytics-grid">
        <section className="panel span-2">
          <div className="panel-head">
            <h2>Detections Over Time</h2>
            <span className="panel-tag">{windowLabel}</span>
          </div>
          {timeSeries.length > 1 ? (
            <AreaChart
              series={timeSeries}
              color="#f97316"
              formatter={(v) => `${v} detections`}
              xFormatter={(x) => (x ? x.slice(5) : x)}
            />
          ) : (
            <div className="empty-mini">Not enough temporal spread in this window to plot a trend.</div>
          )}
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>Lifetime Classification Split</h2>
          </div>
          <div className="donut-panel">
            <DonutChart
              data={donutData}
              centerValue={fmtCompact(totalClassified)}
              centerLabel="classified"
            />
            <div className="legend-col">
              {donutData.slice().reverse().map((d) => (
                <div className="legend-row" key={d.label}>
                  <span className="legend-dot" style={{ background: d.color }} />
                  <span className="legend-name">{d.label}</span>
                  <span className="legend-num">{fmtNumber(d.value)}</span>
                  <span className="legend-pct">
                    {totalClassified ? `${((d.value / totalClassified) * 100).toFixed(1)}%` : '—'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>Radiative Power (FRP)</h2>
            <span className="panel-tag">MW · windowed</span>
          </div>
          <BarChart data={frpBuckets} color="#ef4444" formatter={(v) => `${v} detections`} height={200} />
        </section>

        <section className="panel span-2">
          <div className="panel-head">
            <h2>Proximity to Industrial Infrastructure</h2>
            <span className="panel-tag">windowed</span>
          </div>
          <BarList data={proximity} />
        </section>
      </div>
    </div>
  );
}
