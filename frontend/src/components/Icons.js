import React from 'react';

// Minimal, consistent line-icon system for AGENI navigation and UI controls.
const S = ({ children, size = 18, className = '' }) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {children}
  </svg>
);

export const IconCommand = (p) => (
  <S {...p}><path d="M3 12h4l2 5 4-13 2 8h6" /></S>
);
export const IconMap = (p) => (
  <S {...p}><path d="M9 3 3 6v15l6-3 6 3 6-3V3l-6 3-6-3Z" /><path d="M9 3v15" /><path d="M15 6v15" /></S>
);
export const IconDetections = (p) => (
  <S {...p}><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /><path d="M11 8v6" /><path d="M8 11h6" /></S>
);
export const IconAI = (p) => (
  <S {...p}><rect x="4" y="4" width="16" height="16" rx="3" /><path d="M9 9h6v6H9z" /><path d="M9 2v2M15 2v2M9 20v2M15 20v2M2 9h2M2 15h2M20 9h2M20 15h2" /></S>
);
export const IconAnalytics = (p) => (
  <S {...p}><path d="M3 3v18h18" /><rect x="7" y="11" width="3" height="6" /><rect x="12" y="7" width="3" height="10" /><rect x="17" y="13" width="3" height="4" /></S>
);
export const IconAlerts = (p) => (
  <S {...p}><path d="M12 3a6 6 0 0 0-6 6c0 5-2 6-2 6h16s-2-1-2-6a6 6 0 0 0-6-6Z" /><path d="M10.5 20a2 2 0 0 0 3 0" /></S>
);
export const IconInfra = (p) => (
  <S {...p}><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /><path d="M17.5 14V9h-11v5M12 9V4" /></S>
);
export const IconSystem = (p) => (
  <S {...p}><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M8 20h8M12 16v4" /><path d="M7 8h4M7 11h7" /></S>
);
export const IconPresent = (p) => (
  <S {...p}><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M12 16v4M8 20h8" /><path d="m10 8 4 2-4 2V8Z" /></S>
);
export const IconSearch = (p) => (
  <S {...p}><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></S>
);
export const IconRefresh = (p) => (
  <S {...p}><path d="M21 12a9 9 0 1 1-2.6-6.4" /><path d="M21 3v5h-5" /></S>
);
export const IconClose = (p) => (
  <S {...p}><path d="M18 6 6 18M6 6l12 12" /></S>
);
export const IconLayers = (p) => (
  <S {...p}><path d="m12 2 9 5-9 5-9-5 9-5Z" /><path d="m3 12 9 5 9-5" /><path d="m3 17 9 5 9-5" /></S>
);
export const IconSatellite = (p) => (
  <S {...p}><path d="m7 7 3-3 4 4-3 3-4-4Z" /><path d="m10 10 4 4" /><path d="m14 6 4 4" /><path d="M17 13a4 4 0 0 1-4 4" /><path d="M20 16a7 7 0 0 1-7 7" /></S>
);
export const IconMenu = (p) => (
  <S {...p}><path d="M3 6h18M3 12h18M3 18h18" /></S>
);
export const IconPin = (p) => (
  <S {...p}><path d="M12 21s-7-6-7-11a7 7 0 0 1 14 0c0 5-7 11-7 11Z" /><circle cx="12" cy="10" r="2.5" /></S>
);
export const IconBolt = (p) => (
  <S {...p}><path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" /></S>
);
export const IconFlame = (p) => (
  <S {...p}><path d="M12 2s5 4 5 9a5 5 0 0 1-10 0c0-1 .3-2 .8-2.7C8 10 9 11 9 12c0-3 3-4 3-10Z" /></S>
);

export const NAV_ICONS = {
  command: IconCommand,
  map: IconMap,
  detections: IconDetections,
  ai: IconAI,
  analytics: IconAnalytics,
  alerts: IconAlerts,
  infrastructure: IconInfra,
  system: IconSystem,
};
