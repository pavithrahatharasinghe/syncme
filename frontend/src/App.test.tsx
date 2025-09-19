import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from './App';

test('renders SyncMe app title', () => {
  render(<App />);
  const titleElement = screen.getByText(/SyncMe - Music to Spotify Sync/i);
  expect(titleElement).toBeInTheDocument();
});

test('renders authentication section', () => {
  render(<App />);
  const authButton = screen.getByText(/Login to Spotify/i);
  expect(authButton).toBeInTheDocument();
});
