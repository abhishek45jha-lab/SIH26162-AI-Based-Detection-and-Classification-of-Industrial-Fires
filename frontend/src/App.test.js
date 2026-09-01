import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
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

test('opens the insurance intelligence layer from navigation', () => {
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: /^insurance intelligence$/i }));
  expect(screen.getByRole('heading', { name: 'Insurance Intelligence' })).toBeInTheDocument();
  expect(screen.getByText('REFERENCE DATA')).toBeInTheDocument();
  expect(screen.getByText('NOT CONNECTED')).toBeInTheDocument();
});

test('keeps a working facility map view without external tiles', () => {
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: /^risk map$/i }));
  expect(screen.getByRole('heading', { name: 'Risk Map' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /production 68 high/i })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /production 68 high/i }));
  expect(screen.getByText('Main hazards')).toBeInTheDocument();
  expect(screen.getByText('Schedule thermal inspection')).toBeInTheDocument();
});
