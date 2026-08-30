import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import { useAgeniData } from './lib/useAgeniData';
import { NAV_ITEMS } from './lib/fireConfig';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import DetectionPanel from './components/DetectionPanel';
import CommandCenter from './components/views/CommandCenter';
import LiveMapView from './components/views/LiveMapView';
import DetectionIntelligenceView from './components/views/DetectionIntelligenceView';
import AIAnalysisView from './components/views/AIAnalysisView';
import AnalyticsView from './components/views/AnalyticsView';
import AlertsView from './components/views/AlertsView';
import InfrastructureView from './components/views/InfrastructureView';
import SystemStatusView from './components/views/SystemStatusView';

const VIEWS = {
  command: CommandCenter,
  map: LiveMapView,
  detections: DetectionIntelligenceView,
  ai: AIAnalysisView,
  analytics: AnalyticsView,
  alerts: AlertsView,
  infrastructure: InfrastructureView,
  system: SystemStatusView,
};

export default function App() {
  const data = useAgeniData();
  const [active, setActive] = useState('command');
  const [railOpen, setRailOpen] = useState(false);
  const [present, setPresent] = useState(false);

  const { selected, setSelected, windowMetrics, totals, lastRefreshed, refresh, pointsLoading, loading } = data;

  const meta = NAV_ITEMS.find((n) => n.id === active) || NAV_ITEMS[0];
  const ActiveView = VIEWS[active] || CommandCenter;

  const navigate = useCallback((id) => {
    setActive(id);
    setRailOpen(false);
    setSelected(null);
  }, [setSelected]);

  // Presentation mode: auto-cycle through the primary operational views.
  useEffect(() => {
    if (!present) return undefined;
    const order = ['command', 'map', 'detections', 'ai', 'analytics', 'alerts'];
    const id = setInterval(() => {
      setActive((cur) => {
        const idx = order.indexOf(cur);
        return order[(idx + 1) % order.length];
      });
    }, 9000);
    return () => clearInterval(id);
  }, [present]);

  // Escape closes overlays / exits presentation mode.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        if (selected) setSelected(null);
        else if (present) setPresent(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected, present, setSelected]);

  const reviewCount = windowMetrics?.review || 0;

  return (
    <div className={`ageni-app ${present ? 'present-mode' : ''}`}>
      {loading && (
        <div className="boot-overlay">
          <div className="boot-card">
            <div className="boot-logo">
              <span className="boot-mark" />
              AGENI
            </div>
            <div className="boot-bar"><span /></div>
            <p>Establishing uplink to NASA FIRMS intelligence backend&hellip;</p>
          </div>
        </div>
      )}

      {!present && (
        <Sidebar
          active={active}
          onNavigate={navigate}
          onPresent={() => setPresent(true)}
          reviewCount={reviewCount}
          open={railOpen}
        />
      )}

      {railOpen && !present && <div className="rail-scrim" onClick={() => setRailOpen(false)} />}

      <div className="ageni-main">
        {!present && (
          <TopBar
            title={meta.label}
            crumb="AGENI · Industrial Fire Intelligence"
            ingestion={totals.ingestion}
            lastRefreshed={lastRefreshed}
            onRefresh={refresh}
            refreshing={pointsLoading}
            onToggleRail={() => setRailOpen((v) => !v)}
          />
        )}

        {present && (
          <div className="present-bar">
            <div className="present-brand">
              <span className="boot-mark" />
              AGENI COMMAND · {meta.label.toUpperCase()}
            </div>
            <div className="present-live">
              <span className="live-dot" /> LIVE SATELLITE FEED
              <button className="present-exit" onClick={() => setPresent(false)}>Exit Presentation</button>
            </div>
          </div>
        )}

        <main className="ageni-content">
          <ActiveView data={data} onNavigate={navigate} />
        </main>
      </div>

      {selected && <DetectionPanel props={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
