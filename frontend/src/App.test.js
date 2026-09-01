import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

jest.mock('react-leaflet', () => ({
  MapContainer: ({ children }) => <div>{children}</div>,
  TileLayer: () => null,
  CircleMarker: ({ children }) => <div>{children}</div>,
  Popup: ({ children }) => <div>{children}</div>,
  GeoJSON: () => null,
}));
jest.mock('react-leaflet-cluster', () => ({ children }) => <div>{children}</div>);
jest.mock('leaflet', () => ({ divIcon: () => ({}), point: () => ({}) }));

test('renders the Ageni intelligence workspace', () => {
  render(<App />);
  expect(screen.getByText('Industrial Fire Intelligence')).toBeInTheDocument();
  expect(screen.getAllByRole('button', { name: /risk intelligence/i }).length).toBeGreaterThan(0);
});
