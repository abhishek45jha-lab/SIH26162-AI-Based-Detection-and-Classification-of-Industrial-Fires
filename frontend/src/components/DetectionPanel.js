import React from 'react';
import { IconClose, IconSatellite } from './Icons';
import {
  classConfig,
  classLabel,
  classColor,
  deriveSeverity,
  fmtDistanceKm,
  fmtConfidence,
  fmtSourceConfidence,
  fmtDateTime,
  detectionId,
  CLASSIFICATION_CONFIG,
} from '../lib/fireConfig';

function Probabilities({ props }) {
  const cfg = classConfig(props.classification);
  const conf = Number(props.confidence_score);
  const confPct = isNaN(conf) ? 0 : Math.round(conf * 100);
  const residual = Math.max(0, 100 - confPct);

  return (
    <div>
      <div className="prob-row">
        <div className="pr-top">
          <span style={{ color: cfg ? cfg.color : 'var(--text-1)' }}>
            {cfg ? cfg.label : 'Predicted class'}
          </span>
          <span className="pv">{confPct}%</span>
        </div>
        <div className="track"><i style={{ width: `${confPct}%`, background: cfg ? cfg.color : 'var(--info)' }} /></div>
      </div>
      <div className="prob-row">
        <div className="pr-top">
          <span style={{ color: 'var(--text-2)' }}>Residual probability (other classes)</span>
          <span className="pv">{residual}%</span>
        </div>
        <div className="track"><i style={{ width: `${residual}%`, background: 'var(--text-3)' }} /></div>
      </div>
    </div>
  );
}

export default function DetectionPanel({ props, onClose, floating = true }) {
  if (!props) return null;
  const cfg = classConfig(props.classification);
  const sev = deriveSeverity(props);
  const color = classColor(props.classification, props.needs_review);

  const Wrapper = ({ children }) =>
    floating ? <div className="detpanel">{children}</div> : <>{children}</>;

  return (
    <Wrapper>
      <div className="detpanel-head">
        <div>
          <span className="eyebrow">Detection Intelligence</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
            <span className="swatch" style={{ background: color }} />
            <strong style={{ fontFamily: 'var(--mono)', fontSize: '0.92rem' }}>{detectionId(props)}</strong>
          </div>
        </div>
        {onClose && (
          <button className="x" onClick={onClose} aria-label="Close panel">
            <IconClose size={18} />
          </button>
        )}
      </div>

      <div className="detpanel-body">
        {props.needs_review && (
          <div className="review-flag">
            <span className="dot" style={{ background: 'var(--review)' }} />
            <div>
              <div className="rf-t">NEEDS HUMAN REVIEW</div>
              <div className="rf-s">Low-confidence detection routed to a safety operator.</div>
            </div>
          </div>
        )}

        <div className="det-block">
          <span className="lbl">Overview</span>
          <div className="dl">
            <div className="dl-row"><span className="k">Classification</span><span className="v" style={{ color }}>{classLabel(props.classification)}</span></div>
            <div className="dl-row"><span className="k">Risk Level</span><span className="v"><span className="badge" style={{ '--c': sev.color, '--b': sev.color, '--bg': 'transparent' }}>{sev.label}</span></span></div>
            <div className="dl-row"><span className="k">AI Confidence</span><span className="v mono">{fmtConfidence(props.confidence_score)}</span></div>
            <div className="dl-row"><span className="k">Timestamp</span><span className="v mono">{fmtDateTime(props.acq_date, props.acq_time)}</span></div>
            <div className="dl-row"><span className="k">Coordinates</span><span className="v mono">{Number(props.latitude)?.toFixed(4)}, {Number(props.longitude)?.toFixed(4)}</span></div>
          </div>
        </div>

        <div className="det-block">
          <span className="lbl">Thermal Intelligence</span>
          <div className="dl">
            <div className="dl-row"><span className="k">Brightness Temp</span><span className="v mono">{props.brightness ? `${props.brightness} K` : 'N/A'}</span></div>
            <div className="dl-row"><span className="k">Fire Radiative Power</span><span className="v mono">{props.frp != null ? `${props.frp} MW` : 'N/A'}</span></div>
            <div className="dl-row"><span className="k">Satellite</span><span className="v">Suomi NPP</span></div>
            <div className="dl-row"><span className="k">Sensor</span><span className="v">VIIRS 375m</span></div>
            <div className="dl-row"><span className="k">Source Confidence</span><span className="v">{fmtSourceConfidence(props.confidence)}</span></div>
          </div>
        </div>

        <div className="det-block">
          <span className="lbl">Spatial Intelligence</span>
          <div className="dl">
            <div className="dl-row"><span className="k">Industrial Zone Distance</span><span className="v mono">{fmtDistanceKm(props.dist_to_industrial_m)}</span></div>
            <div className="dl-row"><span className="k">Power Plant Distance</span><span className="v mono">{fmtDistanceKm(props.dist_to_powerplant_m)}</span></div>
            <div className="dl-row"><span className="k">Spatial Cluster</span><span className="v">{(props.recurrence_count || 0) > 0 ? 'Clustered' : 'Isolated'}</span></div>
            <div className="dl-row"><span className="k">Recurrence (500m)</span><span className="v mono">{props.recurrence_count ?? 0}</span></div>
          </div>
        </div>

        <div className="det-block">
          <span className="lbl">AI Classification</span>
          <Probabilities props={props} />
          <div className="dl" style={{ marginTop: 4 }}>
            {Object.values(CLASSIFICATION_CONFIG).map((c) => (
              <div className="dl-row" key={c.key}>
                <span className="k" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="swatch" style={{ background: c.color }} /> {c.label}
                </span>
                <span className="v" style={{ color: cfg && cfg.key === c.key ? c.color : 'var(--text-2)' }}>
                  {cfg && cfg.key === c.key ? 'PREDICTED' : '—'}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="det-block">
          <div className="note" style={{ borderColor: 'var(--border)', background: 'var(--bg-2)', color: 'var(--text-2)' }}>
            <IconSatellite size={16} />
            <span>Source: NASA FIRMS VIIRS 375m near-real-time feed, enriched with PostGIS spatial features and classified by the AGENI Random Forest engine.</span>
          </div>
        </div>
      </div>
    </Wrapper>
  );
}
