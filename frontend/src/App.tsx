import React, { useState } from 'react';
import './App.css';

interface MusicFile {
  file: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  path: string;
}

interface PlaylistResult {
  id: string;
  name: string;
  url: string;
  tracksAdded: number;
  totalSongs: number;
}

function App() {
  const [folderPath, setFolderPath] = useState('');
  const [musicFiles, setMusicFiles] = useState<MusicFile[]>([]);
  const [playlistName, setPlaylistName] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const backendUrl = 'http://localhost:3001';

  const handleSpotifyLogin = () => {
    window.open(`${backendUrl}/login`, '_blank');
    // Note: In a real app, you'd handle the callback properly
    setMessage('Please complete Spotify authentication in the new window');
    setTimeout(() => {
      setIsAuthenticated(true);
      setMessage('Authentication completed! You can now create playlists.');
    }, 10000); // Simulate auth completion
  };

  const handleScanFolder = async () => {
    if (!folderPath.trim()) {
      setMessage('Please enter a folder path');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const response = await fetch(`${backendUrl}/api/scan-folder`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ folderPath: folderPath.trim() }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to scan folder');
      }

      const data = await response.json();
      setMusicFiles(data.files);
      setMessage(`Found ${data.files.length} music files in the folder`);
    } catch (error) {
      setMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setMusicFiles([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlaylist = async () => {
    if (!playlistName.trim()) {
      setMessage('Please enter a playlist name');
      return;
    }

    if (musicFiles.length === 0) {
      setMessage('Please scan a folder first to get music files');
      return;
    }

    if (!isAuthenticated) {
      setMessage('Please authenticate with Spotify first');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const response = await fetch(`${backendUrl}/api/create-playlist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playlistName: playlistName.trim(),
          songs: musicFiles,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create playlist');
      }

      const data: { playlist: PlaylistResult } = await response.json();
      setMessage(
        `Playlist "${data.playlist.name}" created successfully! ` +
        `Added ${data.playlist.tracksAdded} out of ${data.playlist.totalSongs} songs. ` +
        `View on Spotify: ${data.playlist.url}`
      );
    } catch (error) {
      setMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>SyncMe - Music to Spotify Sync</h1>
        <p>Sync your local music collection to Spotify playlists</p>
      </header>

      <main className="App-main">
        <div className="section">
          <h2>1. Authenticate with Spotify</h2>
          <button 
            onClick={handleSpotifyLogin}
            disabled={loading}
            className={`auth-button ${isAuthenticated ? 'authenticated' : ''}`}
          >
            {isAuthenticated ? '✓ Authenticated' : 'Login to Spotify'}
          </button>
        </div>

        <div className="section">
          <h2>2. Scan Music Folder</h2>
          <div className="input-group">
            <input
              type="text"
              value={folderPath}
              onChange={(e) => setFolderPath(e.target.value)}
              placeholder="Enter folder path (e.g., /path/to/music)"
              className="folder-input"
              disabled={loading}
            />
            <button 
              onClick={handleScanFolder}
              disabled={loading || !folderPath.trim()}
              className="scan-button"
            >
              {loading ? 'Scanning...' : 'Scan Folder'}
            </button>
          </div>
        </div>

        {musicFiles.length > 0 && (
          <div className="section">
            <h2>3. Create Spotify Playlist</h2>
            <div className="input-group">
              <input
                type="text"
                value={playlistName}
                onChange={(e) => setPlaylistName(e.target.value)}
                placeholder="Enter playlist name"
                className="playlist-input"
                disabled={loading}
              />
              <button 
                onClick={handleCreatePlaylist}
                disabled={loading || !playlistName.trim() || !isAuthenticated}
                className="create-button"
              >
                {loading ? 'Creating...' : 'Create Playlist'}
              </button>
            </div>
          </div>
        )}

        {message && (
          <div className={`message ${message.includes('Error') ? 'error' : 'success'}`}>
            {message}
          </div>
        )}

        {musicFiles.length > 0 && (
          <div className="section">
            <h3>Found Music Files ({musicFiles.length})</h3>
            <div className="music-list">
              {musicFiles.slice(0, 10).map((file, index) => (
                <div key={index} className="music-item">
                  <strong>{file.title}</strong> by {file.artist}
                  <br />
                  <small>{file.album}</small>
                </div>
              ))}
              {musicFiles.length > 10 && (
                <div className="music-item">
                  <small>... and {musicFiles.length - 10} more files</small>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
