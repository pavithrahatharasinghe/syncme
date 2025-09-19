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

test('renders scan music folder section', () => {
  render(<App />);
  const scanSection = screen.getByText(/2\. Scan Music Folder/i);
  expect(scanSection).toBeInTheDocument();
  
  const folderInput = screen.getByPlaceholderText(/Enter folder path/i);
  expect(folderInput).toBeInTheDocument();
  
  const scanButton = screen.getByText(/Scan Folder/i);
  expect(scanButton).toBeInTheDocument();
});

test('tabs are not visible when not authenticated or no music files', () => {
  render(<App />);
  const createTab = screen.queryByText(/Create New Playlist/i);
  const compareTab = screen.queryByText(/Compare & Update/i);
  const manageTab = screen.queryByText(/Manage Playlists/i);
  
  expect(createTab).not.toBeInTheDocument();
  expect(compareTab).not.toBeInTheDocument();
  expect(manageTab).not.toBeInTheDocument();
});
