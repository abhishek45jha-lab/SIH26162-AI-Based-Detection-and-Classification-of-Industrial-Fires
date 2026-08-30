import React, { useMemo, useState } from 'react';

/* ---------- Donut / ring chart ---------- */
export function DonutChart({ data = [], size = 180, thickness = 26, centerLabel, centerValue }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const radius = (size - thickness) / 2;
  const circ = 2 * Math.PI * radius;
  let offset = 0;
  const [hover, setHover] = useState(null);

  return (
    <div className="donut-wrap">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="donut">
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          {data.map((d, i) => {
            const frac = d.value / total;
            const dash = frac * circ;
            const seg = (
              <circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={d.color}
                strokeWidth={hover === i ? thickness + 4 : thickness}
                strokeDasharray={`${dash} ${circ - dash}`}
                strokeDashoffset={-offset}
                className="donut-seg"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              />
            );
            offset += dash;
            return seg;
          })}
        </g>
      </svg>
      <div className="donut-center">
        <span className="donut-value">{hover != null ? data[hover].value.toLocaleString() : centerValue}</span>
        <span className="donut-label">{hover != null ? data[hover].label : centerLabel}</span>
      </div>
    </div>
  );
}

/* ---------- Horizontal bar list ---------- */
export function BarList({ data = [], formatter = (v) => v.toLocaleString() }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="barlist">
      {data.map((d, i) => (
        <div className="barlist-row" key={i}>
          <div className="barlist-head">
            <span className="barlist-label">{d.label}</span>
            <span className="barlist-value">{formatter(d.value)}</span>
          </div>
          <div className="barlist-track">
            <div
              className="barlist-fill"
              style={{ width: `${(d.value / max) * 100}%`, background: d.color || 'var(--accent)' }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------- Vertical bar chart ---------- */
export function BarChart({ data = [], height = 200, color = 'var(--accent)', formatter = (v) => v }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const [hover, setHover] = useState(null);
  return (
    <div className="vbar-chart" style={{ height }}>
      {data.map((d, i) => (
        <div
          className="vbar-col"
          key={i}
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(null)}
        >
          {hover === i && <div className="vbar-tip">{formatter(d.value)}</div>}
          <div className="vbar-bar-wrap">
            <div
              className="vbar-bar"
              style={{ height: `${(d.value / max) * 100}%`, background: d.color || color }}
            />
          </div>
          <span className="vbar-x">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

/* ---------- Line / area sparkline over time ---------- */
export function AreaChart({ series = [], height = 220, color = 'var(--accent)', formatter = (v) => v, xFormatter = (x) => x }) {
  const [hover, setHover] = useState(null);
  const { path, area, points } = useMemo(() => {
    const w = 1000;
    const h = 300;
    const pad = 10;
    const max = Math.max(...series.map((s) => s.value), 1);
    const n = series.length;
    const step = n > 1 ? (w - pad * 2) / (n - 1) : 0;
    const pts = series.map((s, i) => {
      const x = pad + i * step;
      const y = h - pad - (s.value / max) * (h - pad * 2);
      return { x, y, ...s };
    });
    const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
    const area = `${path} L${pts[pts.length - 1]?.x || 0},${h} L${pts[0]?.x || 0},${h} Z`;
    return { path, area, points: pts };
  }, [series]);

  return (
    <div className="area-chart" style={{ height }}>
      <svg viewBox="0 0 1000 300" preserveAspectRatio="none" className="area-svg">
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#areaGrad)" />
        <path d={path} fill="none" stroke={color} strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
        {points.map((p, i) => (
          <g key={i}>
            <rect
              x={p.x - 500 / points.length}
              y={0}
              width={1000 / points.length}
              height={300}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            />
            {hover === i && (
              <circle cx={p.x} cy={p.y} r="4" fill={color} stroke="var(--bg-0)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
            )}
          </g>
        ))}
      </svg>
      {hover != null && points[hover] && (
        <div className="area-tip" style={{ left: `${(points[hover].x / 1000) * 100}%` }}>
          <strong>{formatter(points[hover].value)}</strong>
          <span>{xFormatter(points[hover].label)}</span>
        </div>
      )}
      <div className="area-x-axis">
        {points.filter((_, i) => i % Math.ceil(points.length / 6) === 0).map((p, i) => (
          <span key={i}>{xFormatter(p.label)}</span>
        ))}
      </div>
    </div>
  );
}
