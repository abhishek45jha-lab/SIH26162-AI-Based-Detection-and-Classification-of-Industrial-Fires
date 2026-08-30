import React, { useMemo } from 'react';
import { IconSatellite, IconFlame, IconLayers, IconAI, IconAnalytics, IconDetections, IconAlerts } from '../Icons';
import { fmtNumber, fmtConfidence } from '../../lib/fireConfig';

const MODEL_FEATURES = [
  'frp', 'brightness', 'confidence',
  'dist_to_industrial_m', 'dist_to_powerplant_m', 'recurrence_count',
  'hour_of_day', 'month', 'satellite_encoded', 'is_night',
];

const STEPS = [
  { n: '01', title: 'NASA FIRMS Ingestion', Icon: IconSatellite, body: 'Near-real-time VIIRS 375m thermal anomalies for India are ingested from the NASA FIRMS feed (Suomi NPP), refreshed on a recurring 6-hour sync.' },
  { n: '02', title: 'Thermal Detection', Icon: IconFlame, body: 'Each hotspot is stored with its radiative power (FRP), brightness temperature, source confidence, and acquisition timestamp in PostgreSQL / PostGIS.' },
  { n: '03', title: 'Feature Engineering', Icon: IconLayers, body: 'PostGIS computes KNN distances to industrial zones and power plants, plus ST_ClusterDBSCAN spatial recurrence (eps=0.0045, minpoints=2). Temporal and satellite features are derived per detection.' },
  { n: '04', title: 'Random Forest', Icon: IconAI, body: 'A scikit-learn RandomForestClassifier (200 trees) evaluates the engineered feature vector for every detection.' },
  { n: '05', title: 'Classification', Icon: IconDetections, body: 'Each detection is assigned one of three classes: Unplanned Industrial Fire, Persistent Industrial Flare, or Wildfire / Biomass Burning.' },
  { n: '06', title: 'Confidence Assessment', Icon: IconAnalytics, body: 'The model emits a calibrated probability for the predicted class, quantifying how certain the classifier is across the multi-dimensional feature space.' },
  { n: '07', title: 'Human Review', Icon: IconAlerts, body: 'Detections with confidence below 0.70 are flagged needs_review and routed to a safety operator for human-in-the-loop verification.' },
];

export default function AIAnalysisView({ data }) {
  const { points, windowMetrics } = data;

  const confDist = useMemo(() => {
    const buckets = [
      { label: '<50%', min: 0, max: 0.5, n: 0, color: 'var(--fire)' },
      { label: '50–70%', min: 0.5, max: 0.7, n: 0, color: 'var(--flare)' },
      { label: '70–90%', min: 0.7, max: 0.9, n: 0, color: 'var(--wild)' },
      { label: '≥90%', min: 0.9, max: 1.01, n: 0, color: 'var(--ok)' },
    ];
    for (const f of points) {
      const c = Number(f.properties?.confidence_score);
      if (isNaN(c)) continue;
      const b = buckets.find((x) => c >= x.min && c < x.max);
      if (b) b.n += 1;
    }
    const max = Math.max(1, ...buckets.map((b) => b.n));
    return { buckets, max };
  }, [points]);

  const reviewRate = windowMetrics.count ? (windowMetrics.review / windowMetrics.count) * 100 : 0;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 16, alignItems: 'start' }}>
      <div className="card">
        <div className="card-head"><h3>AI Classification Pipeline</h3><span className="sub right">FIRMS → REVIEW</span></div>
        <div className="card-pad">
          <div className="pipeline">
            {STEPS.map((s, i) => (
              <div className="pipe-step" key={s.n}>
                <div className="pipe-rail">
                  <div className="pipe-node"><s.Icon size={18} /></div>
                  {i < STEPS.length - 1 && <div className="pipe-line" />}
                </div>
                <div className="pipe-body">
                  <span className="pnum">STEP {s.n}</span>
                  <h4>{s.title}</h4>
                  <p>{s.body}</p>
                  {s.title === 'Feature Engineering' && (
                    <div className="chips">
                      {MODEL_FEATURES.map((f) => (
                        <span className="feature-chip" key={f}>{f}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <div className="kpi" style={{ '--kpi-accent': 'var(--info)' }}>
            <div className="kpi-label">Model</div><div className="kpi-value tiny">Random Forest</div>
            <div className="kpi-meta">200 estimators · 10 features</div>
          </div>
          <div className="kpi" style={{ '--kpi-accent': 'var(--review)' }}>
            <div className="kpi-label">Review Threshold</div><div className="kpi-value tiny">0.70</div>
            <div className="kpi-meta">{reviewRate.toFixed(1)}% flagged in window</div>
          </div>
        </div>

        <div className="card">
          <div className="card-head"><h3>Confidence Distribution</h3><span className="sub right">{fmtNumber(windowMetrics.count)} PTS</span></div>
          <div className="card-pad bars">
            {confDist.buckets.map((b) => {
              const pct = windowMetrics.count ? Math.round((b.n / windowMetrics.count) * 100) : 0;
              return (
                <div className="bar-item" key={b.label}>
                  <div className="bl"><span>{b.label} confidence</span><span className="bv">{fmtNumber(b.n)} · {pct}%</span></div>
                  <div className="track"><i style={{ width: `${Math.round((b.n / confDist.max) * 100)}%`, background: b.color }} /></div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card">
          <div className="card-head"><h3>Model Outputs</h3></div>
          <div className="card-pad dl">
            <div className="dl-row"><span className="k">classification</span><span className="v">3-class label</span></div>
            <div className="dl-row"><span className="k">confidence_score</span><span className="v">Calibrated probability</span></div>
            <div className="dl-row"><span className="k">needs_review</span><span className="v">Boolean (&lt; 0.70)</span></div>
          </div>
        </div>

        <div className="note">
          <IconFlame size={16} />
          <span>
            <b>Methodology note.</b> Training labels are bootstrapped from spatial domain rules, so raw accuracy reflects rule recovery rather than novel prediction. The genuine ML contribution is <b>probabilistic confidence scoring</b> and <b>boundary-case triage</b> via the needs_review flag.
          </span>
        </div>
      </div>
    </div>
  );
}
