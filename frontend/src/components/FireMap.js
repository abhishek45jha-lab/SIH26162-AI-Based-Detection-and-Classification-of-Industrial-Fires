import React, { useMemo, useCallback } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, CircleMarker, Popup, GeoJSON } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import {
  classColor,
  classLabel,
  shortLabel,
  fmtDistanceKm,
  fmtConfidence,
  fmtDateTime,
  pointCoords,
  detectionId,
  ZONE_COLOR,
  PLANT_COLOR,
} from '../lib/fireConfig';

const createClusterIcon = (cluster) => {
  const count = cluster.getChildCount();
  let size = 'small';
  if (count >= 100) size = 'large';
  else if (count >= 10) size = 'medium';

  const markers = cluster.getAllChildMarkers();
  let hasFire = false;
  for (let i = 0; i < markers.length; i++) {
    const c = markers[i].options?.pathOptions?.fillColor || markers[i].options?.fillColor;
    if (c === '#ef4444') { hasFire = true; break; }
  }
  const label = count > 9999 ? `${(count / 1000).toFixed(1)}k` : count.toLocaleString();
  return L.divIcon({
    html: `<div class="cluster-badge cluster-${size} ${hasFire ? 'cluster-has-fire' : ''}"><span>${label}</span></div>`,
    className: 'custom-cluster-wrapper',
    iconSize: L.point(40, 40, true),
  });
};

export default function FireMap({
  points = [],
  zones = null,
  plants = [],
  showZones = false,
  showPlants = false,
  onSelect,
  selectedId = null,
  center = [22.0, 79.0],
  zoom = 5,
}) {
  const markers = useMemo(() => {
    return points.map((feature, idx) => {
      const props = feature.properties || {};
      const { lat, lng } = pointCoords(feature);
      if (lat === undefined || lng === undefined || isNaN(lat) || isNaN(lng)) return null;

      const color = classColor(props.classification, props.needs_review);
      const isSel = selectedId != null && props.id === selectedId;

      return (
        <CircleMarker
          key={`t-${props.id || idx}`}
          center={[lat, lng]}
          radius={isSel ? 9 : 6}
          pathOptions={{
            fillColor: color,
            fillOpacity: 0.9,
            color: isSel ? '#ffffff' : 'rgba(255,255,255,0.85)',
            weight: isSel ? 2.5 : 1.3,
          }}
          eventHandlers={{ click: () => onSelect && onSelect(props) }}
        >
          <Popup className="thermal-popup" autoPan={false}>
            <div className="pop">
              <div className="pop-head" style={{ backgroundColor: color }}>
                {props.needs_review ? 'NEEDS REVIEW · ' : ''}{shortLabel(props.classification)}
              </div>
              <div className="pop-body">
                <div className="pop-grid">
                  <div className="pop-cell">
                    <span className="t">Detection</span>
                    <span className="d">{detectionId(props)}</span>
                  </div>
                  <div className="pop-cell">
                    <span className="t">AI Confidence</span>
                    <span className="d">{fmtConfidence(props.confidence_score)}</span>
                  </div>
                  <div className="pop-cell">
                    <span className="t">FRP</span>
                    <span className="d">{props.frp != null ? `${props.frp} MW` : 'N/A'}</span>
                  </div>
                  <div className="pop-cell">
                    <span className="t">Brightness</span>
                    <span className="d">{props.brightness ? `${props.brightness} K` : 'N/A'}</span>
                  </div>
                  <div className="pop-cell">
                    <span className="t">Ind. Zone</span>
                    <span className="d">{fmtDistanceKm(props.dist_to_industrial_m)}</span>
                  </div>
                  <div className="pop-cell">
                    <span className="t">Power Plant</span>
                    <span className="d">{fmtDistanceKm(props.dist_to_powerplant_m)}</span>
                  </div>
                </div>
                <div className="pop-foot">
                  <span>{fmtDateTime(props.acq_date, props.acq_time)}</span>
                  <span>{lat.toFixed(3)}, {lng.toFixed(3)}</span>
                </div>
                {onSelect && (
                  <button className="pop-btn" onClick={() => onSelect(props)}>
                    Open Intelligence Panel
                  </button>
                )}
              </div>
            </div>
          </Popup>
        </CircleMarker>
      );
    });
  }, [points, onSelect, selectedId]);

  const onEachZone = useCallback((feature, layer) => {
    const props = feature.properties || {};
    layer.bindPopup(
      `<div class="pop"><div class="pop-head" style="background:${ZONE_COLOR};color:#04121a">INDUSTRIAL ZONE</div>` +
      `<div class="pop-body"><div class="pop-cell"><span class="t">Name</span><span class="d">${props.name || 'Industrial Zone'}</span></div>` +
      `<div class="pop-foot"><span>Land use: ${props.landuse || 'industrial'}</span></div></div></div>`,
      { className: 'thermal-popup' }
    );
  }, []);

  return (
    <MapContainer center={center} zoom={zoom} scrollWheelZoom className="leaflet-canvas">
      <TileLayer
        attribution='&copy; OpenStreetMap · NASA FIRMS VIIRS'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />

      {showZones && zones && (
        <GeoJSON
          key={`zones-${zones.features?.length || 0}`}
          data={zones}
          style={() => ({ fillColor: ZONE_COLOR, fillOpacity: 0.12, color: ZONE_COLOR, weight: 1.2, opacity: 0.8 })}
          onEachFeature={onEachZone}
        />
      )}

      {showPlants &&
        plants.map((plant, idx) => {
          const { lat, lng } = pointCoords(plant);
          if (lat === undefined || lng === undefined || isNaN(lat) || isNaN(lng)) return null;
          const props = plant.properties || {};
          return (
            <CircleMarker
              key={`p-${idx}`}
              center={[lat, lng]}
              radius={4}
              pathOptions={{ fillColor: PLANT_COLOR, fillOpacity: 0.85, color: '#fff', weight: 1 }}
            >
              <Popup className="thermal-popup" autoPan={false}>
                <div className="pop">
                  <div className="pop-head" style={{ background: PLANT_COLOR, color: '#04121a' }}>POWER PLANT</div>
                  <div className="pop-body">
                    <div className="pop-cell" style={{ marginBottom: 8 }}>
                      <span className="t">Facility</span>
                      <span className="d">{props.name || 'Unnamed'}</span>
                    </div>
                    <div className="pop-grid">
                      <div className="pop-cell"><span className="t">Capacity</span><span className="d">{props.capacity_mw != null ? `${props.capacity_mw} MW` : 'N/A'}</span></div>
                      <div className="pop-cell"><span className="t">Fuel</span><span className="d">{props.primary_fuel || 'N/A'}</span></div>
                    </div>
                    <div className="pop-foot"><span>{lat.toFixed(3)}, {lng.toFixed(3)}</span></div>
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}

      <MarkerClusterGroup
        chunkedLoading
        iconCreateFunction={createClusterIcon}
        maxClusterRadius={50}
        spiderfyOnMaxZoom
        showCoverageOnHover={false}
        zoomToBoundsOnClick
      >
        {markers}
      </MarkerClusterGroup>
    </MapContainer>
  );
}

export { classLabel };
