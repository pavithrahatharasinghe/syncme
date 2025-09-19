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

interface SpotifyPlaylist {
  id: string;
  name: string;
  description: string;
  trackCount: number;
  url: string;
  image: string | null;
  owner: string;
  public: boolean;
}

interface SpotifyTrack {
  id: string;
  name: string;
  artist: string;
  album: string;
  uri: string;
  confidence?: string;
}

interface PlaylistComparison {
  inBoth: Array<{
    local: MusicFile;
    spotify: SpotifyTrack;
    confidence: string;
  }>;
  onlyLocal: MusicFile[];
  onlySpotify: SpotifyTrack[];
  newMatches: Array<{
    local: MusicFile;
    spotify: SpotifyTrack;
    confidence: string;
  }>;
}

interface PlaylistResult {
  id: string;
  name: string;
  url: string;
  tracksAdded: number;
  totalSongs: number;
  matchResults?: Array<{
    local: MusicFile;
    spotify: SpotifyTrack | null;
    confidence: string;
  }>;
}

function App() {
  const [folderPath, setFolderPath] = useState('');
  const [musicFiles, setMusicFiles] = useState<MusicFile[]>([]);
  const [playlistName, setPlaylistName] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userPlaylists, setUserPlaylists] = useState<SpotifyPlaylist[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<SpotifyPlaylist | null>(null);
  const [playlistComparison, setPlaylistComparison] = useState<PlaylistComparison | null>(null);
  const [activeTab, setActiveTab] = useState<'create' | 'compare' | 'manage'>('create');

  const backendUrl = 'http://localhost:3001';

  const handleSpotifyLogin = () => {
    window.open(`${backendUrl}/login`, '_blank');
    // Note: In a real app, you'd handle the callback properly
    setMessage('Please complete Spotify authentication in the new window');
    setTimeout(() => {
      setIsAuthenticated(true);
      setMessage('Authentication completed! You can now create playlists.');
      fetchUserPlaylists();
    }, 10000); // Simulate auth completion
  };

  const fetchUserPlaylists = async () => {
    if (!isAuthenticated) return;

    try {
      const response = await fetch(`${backendUrl}/api/playlists`);
      if (!response.ok) {
        throw new Error('Failed to fetch playlists');
      }
      const data = await response.json();
      setUserPlaylists(data.playlists);
    } catch (error) {
      console.error('Error fetching playlists:', error);
      setMessage(`Error fetching playlists: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleComparePlaylist = async () => {
    if (!selectedPlaylist || musicFiles.length === 0) {
      setMessage('Please select a playlist and scan local music first');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const response = await fetch(`${backendUrl}/api/compare-playlist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playlistId: selectedPlaylist.id,
          songs: musicFiles,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to compare playlist');
      }

      const data = await response.json();
      setPlaylistComparison(data.comparison);
      setMessage(`Comparison completed! Found ${data.comparison.newMatches.length} new tracks to add.`);
    } catch (error) {
      setMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePlaylist = async () => {
    if (!selectedPlaylist || !playlistComparison) {
      setMessage('Please compare playlists first');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const songsToAdd = playlistComparison.newMatches.map(match => match.local);
      
      const response = await fetch(`${backendUrl}/api/update-playlist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playlistId: selectedPlaylist.id,
          songsToAdd: songsToAdd,
          songsToRemove: [], // For now, we only add tracks
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update playlist');
      }

      const data = await response.json();
      setMessage(`Playlist updated! ${data.result.message}`);
      
      // Re-fetch comparison to reflect changes
      handleComparePlaylist();
    } catch (error) {
      setMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
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

        {musicFiles.length > 0 && isAuthenticated && (
          <div className="section">
            <h2>3. Choose Action</h2>
            <div className="tabs">
              <button 
                className={`tab ${activeTab === 'create' ? 'active' : ''}`}
                onClick={() => setActiveTab('create')}
              >
                Create New Playlist
              </button>
              <button 
                className={`tab ${activeTab === 'compare' ? 'active' : ''}`}
                onClick={() => setActiveTab('compare')}
              >
                Compare & Update
              </button>
              <button 
                className={`tab ${activeTab === 'manage' ? 'active' : ''}`}
                onClick={() => setActiveTab('manage')}
              >
                Manage Playlists
              </button>
            </div>

            {activeTab === 'create' && (
              <div className="tab-content">
                <h3>Create New Spotify Playlist</h3>
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
                    disabled={loading || !playlistName.trim()}
                    className="create-button"
                  >
                    {loading ? 'Creating...' : 'Create Playlist'}
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'compare' && (
              <div className="tab-content">
                <h3>Compare with Existing Playlist</h3>
                {userPlaylists.length > 0 ? (
                  <div>
                    <div className="playlist-selector">
                      <select 
                        value={selectedPlaylist?.id || ''} 
                        onChange={(e) => {
                          const playlist = userPlaylists.find(p => p.id === e.target.value);
                          setSelectedPlaylist(playlist || null);
                        }}
                        className="playlist-select"
                      >
                        <option value="">Select a playlist to compare</option>
                        {userPlaylists.map(playlist => (
                          <option key={playlist.id} value={playlist.id}>
                            {playlist.name} ({playlist.trackCount} tracks)
                          </option>
                        ))}
                      </select>
                      <button 
                        onClick={handleComparePlaylist}
                        disabled={loading || !selectedPlaylist}
                        className="compare-button"
                      >
                        {loading ? 'Comparing...' : 'Compare'}
                      </button>
                    </div>

                    {playlistComparison && (
                      <div className="comparison-results">
                        <h4>Comparison Results</h4>
                        <div className="comparison-summary">
                          <div className="summary-item">
                            <span className="count">{playlistComparison.inBoth.length}</span>
                            <span className="label">Already in playlist</span>
                          </div>
                          <div className="summary-item">
                            <span className="count">{playlistComparison.newMatches.length}</span>
                            <span className="label">New tracks to add</span>
                          </div>
                          <div className="summary-item">
                            <span className="count">{playlistComparison.onlyLocal.length}</span>
                            <span className="label">Not found on Spotify</span>
                          </div>
                          <div className="summary-item">
                            <span className="count">{playlistComparison.onlySpotify.length}</span>
                            <span className="label">Only in Spotify</span>
                          </div>
                        </div>

                        {playlistComparison.newMatches.length > 0 && (
                          <div className="update-section">
                            <button 
                              onClick={handleUpdatePlaylist}
                              disabled={loading}
                              className="update-button"
                            >
                              {loading ? 'Updating...' : `Add ${playlistComparison.newMatches.length} New Tracks`}
                            </button>
                          </div>
                        )}

                        {playlistComparison.newMatches.length > 0 && (
                          <div className="track-list">
                            <h5>New Tracks to Add:</h5>
                            {playlistComparison.newMatches.slice(0, 5).map((match, index) => (
                              <div key={index} className="track-item">
                                <strong>{match.local.title}</strong> by {match.local.artist}
                                <br />
                                <small>
                                  → {match.spotify.name} by {match.spotify.artist} 
                                  <span className={`confidence ${match.confidence}`}>
                                    ({match.confidence} confidence)
                                  </span>
                                </small>
                              </div>
                            ))}
                            {playlistComparison.newMatches.length > 5 && (
                              <div className="track-item">
                                <small>... and {playlistComparison.newMatches.length - 5} more tracks</small>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <p>Loading playlists...</p>
                    <button onClick={fetchUserPlaylists} className="refresh-button">
                      Refresh Playlists
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'manage' && (
              <div className="tab-content">
                <h3>Your Spotify Playlists</h3>
                {userPlaylists.length > 0 ? (
                  <div className="playlist-grid">
                    {userPlaylists.map(playlist => (
                      <div key={playlist.id} className="playlist-card">
                        {playlist.image && (
                          <img src={playlist.image} alt={playlist.name} className="playlist-image" />
                        )}
                        <div className="playlist-info">
                          <h4>{playlist.name}</h4>
                          <p>{playlist.trackCount} tracks</p>
                          <p>by {playlist.owner}</p>
                          <a href={playlist.url} target="_blank" rel="noopener noreferrer" className="playlist-link">
                            Open in Spotify
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>No playlists found. Make sure you're authenticated.</p>
                )}
              </div>
            )}
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
