import React from 'react';
import { NAV_ITEMS } from '../lib/fireConfig';
import { NAV_ICONS, IconFlame, IconPresent } from './Icons';

export default function Sidebar({ active, onNavigate, onPresent, reviewCount, open }) {
  return (
    <aside className={`rail ${open ? 'open' : ''}`}>
      <div className="rail-brand">
        <div className="rail-logo">
          <span className="rail-mark">
            <IconFlame size={17} />
          </span>
          <span className="rail-wordmark">
            <h1>AGENI</h1>
            <span>INDUSTRIAL FIRE INTELLIGENCE</span>
          </span>
        </div>
      </div>

      <nav className="rail-nav" aria-label="Primary">
        <span className="nav-section-label eyebrow">Operations</span>
        {NAV_ITEMS.map((item) => {
          const Ico = NAV_ICONS[item.id];
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => onNavigate(item.id)}
              aria-current={isActive ? 'page' : undefined}
            >
              {Ico ? <Ico className="nav-ico" size={18} /> : null}
              <span>{item.label}</span>
              {item.id === 'alerts' && reviewCount > 0 ? (
                <span className="nav-badge">{reviewCount}</span>
              ) : null}
            </button>
          );
        })}
      </nav>

      <div className="rail-foot">
        <button className="present-btn" onClick={onPresent}>
          <IconPresent size={15} /> PRESENTATION MODE
        </button>
        <div className="rail-status">
          <span className="dot live" />
          <span>SYSTEM OPERATIONAL</span>
        </div>
      </div>
    </aside>
  );
}
