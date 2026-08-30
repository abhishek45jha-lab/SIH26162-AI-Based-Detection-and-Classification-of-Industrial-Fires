import axios from 'axios';

// Default to the live Render backend so the app shows real satellite data.
// Override with REACT_APP_API_URL for local development against localhost:8000.
export const API_HOST =
  process.env.REACT_APP_API_URL || 'https://sih26162-ai-based-detection-and.onrender.com';
export const API_BASE_URL = `${API_HOST}/api`;

export function fetchThermalPoints(hours, limit = 5000) {
  const h = hours === null || hours === undefined ? 0 : hours;
  return axios
    .get(`${API_BASE_URL}/thermal-points?hours=${h}&limit=${limit}`)
    .then((r) => r.data?.features || []);
}

export function fetchStats() {
  return axios.get(`${API_BASE_URL}/stats`).then((r) => r.data || null);
}

export function fetchIndustrialZones() {
  return axios.get(`${API_BASE_URL}/industrial-zones`).then((r) => r.data || null);
}

export function fetchPowerPlants() {
  return axios.get(`${API_BASE_URL}/power-plants`).then((r) => r.data?.features || []);
}
