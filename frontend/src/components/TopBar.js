import React from 'react';
import { IconRefresh, IconMenu } from './Icons';

function fmtTime(d) {
  if (!d) return '—';
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function fmtIngestion(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

export default function TopBar({ title, crumb, ingestion, lastRefreshed, onRefresh, refreshing, onToggleRail }) {
  return (
    <header className="topbar">
      <button className="btn rail-toggle" onClick={onToggleRail} aria-label="Toggle navigation">
        <IconMenu size={16} />
      </button>
      <div className="topbar-title">
        <span className="crumb">{crumb || 'AGENI'}</span>
        <h2>{title}</h2>
      </div>

      <div className="topbar-spacer" />

      <div className="topbar-chip" title="Live satellite monitoring region">
        <span className="dot live" />
        INDIA · LIVE SATELLITE MONITORING
      </div>
      <div className="topbar-chip">
        NASA FIRMS · <b>{fmtIngestion(ingestion)}</b>
      </div>
      <button className="btn" onClick={onRefresh} disabled={refreshing}>
        {refreshing ? <span className="spinner" /> : <IconRefresh size={15} />}
        {refreshing ? 'Syncing' : 'Sync'}
      </button>
      <div className="topbar-chip" title="Last client refresh">
        {fmtTime(lastRefreshed)}
      </div>
    </header>
  );
}
