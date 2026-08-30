import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { fetchThermalPoints, fetchStats, fetchIndustrialZones, fetchPowerPlants } from './api';
import {
  CLASS_INDUSTRIAL_FIRE,
  CLASS_INDUSTRIAL_FLARE,
  CLASS_WILDFIRE,
  classConfig,
  deriveSeverity,
} from './fireConfig';

// Central data + filter store for the whole AGENI app.
// Loads reference layers once, refetches thermal points when the time window
// changes, and exposes derived metrics computed only from real API values.
export function useAgeniData() {
  const [points, setPoints] = useState([]);
  const [stats, setStats] = useState(null);
  const [zones, setZones] = useState(null);
  const [plants, setPlants] = useState([]);

  const [loading, setLoading] = useState(true);
  const [pointsLoading, setPointsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  const [hours, setHours] = useState(120); // 5-day default window
  const [selected, setSelected] = useState(null); // selected detection props
  const isFirst = useRef(true);

  const loadPoints = useCallback(async (h) => {
    setPointsLoading(true);
    try {
      const feats = await fetchThermalPoints(h, 5000);
      setPoints(feats);
      setLastRefreshed(new Date());
      setError(null);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          'Unable to reach the AGENI intelligence backend. Retrying may resolve transient errors.'
      );
    } finally {
      setPointsLoading(false);
    }
  }, []);

  // Initial full load
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      const results = await Promise.allSettled([
        fetchThermalPoints(120, 5000),
        fetchStats(),
        fetchIndustrialZones(),
        fetchPowerPlants(),
      ]);
      if (!mounted) return;
      const [p, s, z, pl] = results;
      if (p.status === 'fulfilled') setPoints(p.value);
      else setError('Unable to reach the AGENI intelligence backend.');
      if (s.status === 'fulfilled') setStats(s.value);
      if (z.status === 'fulfilled') setZones(z.value);
      if (pl.status === 'fulfilled') setPlants(pl.value);
      setLastRefreshed(new Date());
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Refetch points when the time window changes (after first mount)
  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    loadPoints(hours);
  }, [hours, loadPoints]);

  const refresh = useCallback(async () => {
    const [s] = await Promise.allSettled([fetchStats()]);
    if (s.status === 'fulfilled') setStats(s.value);
    await loadPoints(hours);
  }, [hours, loadPoints]);

  // Total counts from /api/stats (authoritative, full dataset)
  const totals = useMemo(() => {
    const cpc = stats?.count_per_classification || {};
    return {
      total: stats?.total_thermal_points ?? null,
      industrialFire: cpc[CLASS_INDUSTRIAL_FIRE] ?? 0,
      industrialFlare: cpc[CLASS_INDUSTRIAL_FLARE] ?? 0,
      wildfire: cpc[CLASS_WILDFIRE] ?? 0,
      ingestion: stats?.most_recent_ingestion || null,
    };
  }, [stats]);

  // Window-scoped metrics from the loaded points (labeled as windowed in UI)
  const windowMetrics = useMemo(() => {
    let fire = 0;
    let flare = 0;
    let wild = 0;
    let review = 0;
    let highRisk = 0;
    let frpSum = 0;
    for (const f of points) {
      const props = f.properties || {};
      const cfg = classConfig(props.classification);
      if (cfg?.key === CLASS_INDUSTRIAL_FIRE) fire += 1;
      else if (cfg?.key === CLASS_INDUSTRIAL_FLARE) flare += 1;
      else if (cfg?.key === CLASS_WILDFIRE) wild += 1;
      if (props.needs_review) review += 1;
      const sev = deriveSeverity(props);
      if (sev.rank >= 3) highRisk += 1;
      frpSum += Number(props.frp) || 0;
    }
    return {
      count: points.length,
      fire,
      flare,
      wild,
      review,
      highRisk,
      frpSum,
      frpAvg: points.length ? frpSum / points.length : 0,
    };
  }, [points]);

  return {
    points,
    stats,
    zones,
    plants,
    loading,
    pointsLoading,
    error,
    lastRefreshed,
    hours,
    setHours,
    selected,
    setSelected,
    refresh,
    totals,
    windowMetrics,
  };
}
