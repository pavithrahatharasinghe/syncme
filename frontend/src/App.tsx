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
  
  // Enhanced playlist management state
  const [playlistFilter, setPlaylistFilter] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'trackCount' | 'owner'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedPlaylists, setSelectedPlaylists] = useState<Set<string>>(new Set());
  const [exportLoading, setExportLoading] = useState(false);
  const itemsPerPage = 10;

  const backendUrl = 'http://localhost:3001';

  // Filter and sort playlists
  const filteredPlaylists = userPlaylists
    .filter(playlist => 
      playlist.name.toLowerCase().includes(playlistFilter.toLowerCase()) ||
      playlist.owner.toLowerCase().includes(playlistFilter.toLowerCase())
    )
    .sort((a, b) => {
      const getValue = (playlist: SpotifyPlaylist) => {
        switch (sortBy) {
          case 'name': return playlist.name.toLowerCase();
          case 'trackCount': return playlist.trackCount;
          case 'owner': return playlist.owner.toLowerCase();
          default: return playlist.name.toLowerCase();
        }
      };
      
      const aVal = getValue(a);
      const bVal = getValue(b);
      
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      }
      
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      
      return 0;
    });

  // Pagination
  const totalPages = Math.ceil(filteredPlaylists.length / itemsPerPage);
  const paginatedPlaylists = filteredPlaylists.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Bulk actions
  const togglePlaylistSelection = (playlistId: string) => {
    const newSelected = new Set(selectedPlaylists);
    if (newSelected.has(playlistId)) {
      newSelected.delete(playlistId);
    } else {
      newSelected.add(playlistId);
    }
    setSelectedPlaylists(newSelected);
  };

  const selectAllPlaylists = () => {
    if (selectedPlaylists.size === paginatedPlaylists.length) {
      setSelectedPlaylists(new Set());
    } else {
      setSelectedPlaylists(new Set(paginatedPlaylists.map(p => p.id)));
    }
  };

  const handleExportPlaylist = async (playlistId: string) => {
    setExportLoading(true);
    try {
      const response = await fetch(`${backendUrl}/api/export-playlist/${playlistId}`);
      if (!response.ok) {
        throw new Error('Failed to export playlist');
      }
      const data = await response.json();
      
      // Create and download the JSON file
      const blob = new Blob([JSON.stringify(data.playlist, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${data.playlist.name.replace(/[^a-zA-Z0-9]/g, '_')}_export.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setMessage(`Successfully exported "${data.playlist.name}" as JSON`);
    } catch (error) {
      setMessage(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setExportLoading(false);
    }
  };

  const handleBulkExport = async () => {
    if (selectedPlaylists.size === 0) {
      setMessage('Please select playlists to export');
      return;
    }

    setExportLoading(true);
    try {
      const response = await fetch(`${backendUrl}/api/export-playlists`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playlistIds: Array.from(selectedPlaylists)
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to export playlists');
      }

      const data = await response.json();
      
      // Create and download the JSON file
      const blob = new Blob([JSON.stringify(data.playlists, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `spotify_playlists_export_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setMessage(`Successfully exported ${selectedPlaylists.size} playlists as JSON`);
      setSelectedPlaylists(new Set()); // Clear selection
    } catch (error) {
      setMessage(`Bulk export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setExportLoading(false);
    }
  };

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
                    {selectedPlaylist && (
                      <div className="currently-selected-info">
                        <h4>Currently Selected Playlist:</h4>
                        <div className="current-selection-card">
                          {selectedPlaylist.image && (
                            <img src={selectedPlaylist.image} alt={selectedPlaylist.name} className="current-selection-image" />
                          )}
                          <div className="current-selection-details">
                            <strong>{selectedPlaylist.name}</strong>
                            <p>{selectedPlaylist.trackCount} tracks • by {selectedPlaylist.owner}</p>
                            <p className="selection-description">{selectedPlaylist.description || 'No description'}</p>
                          </div>
                          <button 
                            onClick={() => setSelectedPlaylist(null)} 
                            className="change-selection-btn"
                          >
                            Change Selection
                          </button>
                        </div>
                      </div>
                    )}
                    
                    <div className="playlist-selector">
                      <select 
                        value={selectedPlaylist?.id || ''} 
                        onChange={(e) => {
                          const playlist = userPlaylists.find(p => p.id === e.target.value);
                          setSelectedPlaylist(playlist || null);
                          setPlaylistComparison(null); // Clear previous comparison
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
                        disabled={loading || !selectedPlaylist || musicFiles.length === 0}
                        className="compare-button"
                      >
                        {loading ? 'Comparing...' : 'Compare'}
                      </button>
                    </div>

                    {!selectedPlaylist && musicFiles.length === 0 && (
                      <div className="compare-requirements">
                        <p>To compare playlists, you need to:</p>
                        <ol>
                          <li>Scan a music folder first</li>
                          <li>Select a playlist to compare with</li>
                        </ol>
                      </div>
                    )}

                    {!selectedPlaylist && musicFiles.length > 0 && (
                      <div className="compare-requirements">
                        <p>✓ Music files scanned ({musicFiles.length} files)</p>
                        <p>Now select a playlist to compare with your local music.</p>
                      </div>
                    )}

                    {selectedPlaylist && musicFiles.length === 0 && (
                      <div className="compare-requirements">
                        <p>✓ Playlist selected: {selectedPlaylist.name}</p>
                        <p>Please scan a music folder first to compare.</p>
                      </div>
                    )}

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

                        {playlistComparison.onlyLocal.length > 0 && (
                          <div className="track-list">
                            <h5>Tracks Not Found on Spotify:</h5>
                            {playlistComparison.onlyLocal.slice(0, 3).map((track, index) => (
                              <div key={index} className="track-item not-found">
                                <strong>{track.title}</strong> by {track.artist}
                                <br />
                                <small>Album: {track.album}</small>
                              </div>
                            ))}
                            {playlistComparison.onlyLocal.length > 3 && (
                              <div className="track-item">
                                <small>... and {playlistComparison.onlyLocal.length - 3} more tracks not found</small>
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
                  <div className="playlist-management">
                    {/* Search and Filter Controls */}
                    <div className="playlist-controls">
                      <div className="search-controls">
                        <input
                          type="text"
                          value={playlistFilter}
                          onChange={(e) => {
                            setPlaylistFilter(e.target.value);
                            setCurrentPage(1); // Reset to first page when filtering
                          }}
                          placeholder="Search playlists by name or owner..."
                          className="playlist-search"
                        />
                      </div>
                      
                      <div className="sort-controls">
                        <select
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value as 'name' | 'trackCount' | 'owner')}
                          className="sort-select"
                        >
                          <option value="name">Sort by Name</option>
                          <option value="trackCount">Sort by Track Count</option>
                          <option value="owner">Sort by Owner</option>
                        </select>
                        
                        <button
                          onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                          className="sort-order-btn"
                          title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
                        >
                          {sortOrder === 'asc' ? '↑' : '↓'}
                        </button>
                      </div>
                      
                      <div className="bulk-actions">
                        {selectedPlaylists.size > 0 && (
                          <>
                            <span className="selection-count">
                              {selectedPlaylists.size} selected
                            </span>
                            <button 
                              onClick={handleBulkExport}
                              className="export-button"
                              disabled={exportLoading}
                              title="Export selected playlists as JSON"
                            >
                              {exportLoading ? 'Exporting...' : 'Export Selected'}
                            </button>
                          </>
                        )}
                        <button 
                          onClick={fetchUserPlaylists} 
                          className="refresh-button"
                          disabled={loading}
                        >
                          {loading ? 'Refreshing...' : 'Refresh'}
                        </button>
                      </div>
                    </div>

                    {/* Results Info */}
                    <div className="results-info">
                      Showing {paginatedPlaylists.length} of {filteredPlaylists.length} playlists
                      {playlistFilter && ` (filtered from ${userPlaylists.length} total)`}
                    </div>

                    {/* Playlist Table */}
                    <div className="playlist-table-container">
                      <table className="playlist-table">
                        <thead>
                          <tr>
                            <th>
                              <input
                                type="checkbox"
                                checked={selectedPlaylists.size === paginatedPlaylists.length && paginatedPlaylists.length > 0}
                                onChange={selectAllPlaylists}
                                className="select-all-checkbox"
                              />
                            </th>
                            <th>Image</th>
                            <th>Name</th>
                            <th>Tracks</th>
                            <th>Owner</th>
                            <th>Public</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedPlaylists.map(playlist => (
                            <tr key={playlist.id} className={selectedPlaylists.has(playlist.id) ? 'selected' : ''}>
                              <td>
                                <input
                                  type="checkbox"
                                  checked={selectedPlaylists.has(playlist.id)}
                                  onChange={() => togglePlaylistSelection(playlist.id)}
                                  className="select-checkbox"
                                />
                              </td>
                              <td>
                                <div className="playlist-image-cell">
                                  {playlist.image ? (
                                    <img src={playlist.image} alt={playlist.name} className="playlist-thumbnail" />
                                  ) : (
                                    <div className="playlist-thumbnail-placeholder">♪</div>
                                  )}
                                </div>
                              </td>
                              <td>
                                <div className="playlist-name-cell">
                                  <strong>{playlist.name}</strong>
                                  {playlist.description && (
                                    <div className="playlist-description">{playlist.description}</div>
                                  )}
                                </div>
                              </td>
                              <td className="track-count">{playlist.trackCount}</td>
                              <td className="owner">{playlist.owner}</td>
                              <td>
                                <span className={`public-status ${playlist.public ? 'public' : 'private'}`}>
                                  {playlist.public ? 'Public' : 'Private'}
                                </span>
                              </td>
                              <td>
                                <div className="playlist-actions">
                                  <button
                                    onClick={() => setSelectedPlaylist(playlist)}
                                    className="select-for-compare-btn"
                                    title="Select for comparison"
                                  >
                                    Compare
                                  </button>
                                  <button
                                    onClick={() => handleExportPlaylist(playlist.id)}
                                    className="export-single-btn"
                                    disabled={exportLoading}
                                    title="Export playlist as JSON"
                                  >
                                    Export
                                  </button>
                                  <a 
                                    href={playlist.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="open-spotify-btn"
                                    title="Open in Spotify"
                                  >
                                    Open
                                  </a>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="pagination">
                        <button
                          onClick={() => setCurrentPage(currentPage - 1)}
                          disabled={currentPage === 1}
                          className="pagination-btn"
                        >
                          Previous
                        </button>
                        
                        <div className="pagination-info">
                          Page {currentPage} of {totalPages}
                        </div>
                        
                        <button
                          onClick={() => setCurrentPage(currentPage + 1)}
                          disabled={currentPage === totalPages}
                          className="pagination-btn"
                        >
                          Next
                        </button>
                      </div>
                    )}

                    {/* Selected Playlist Info */}
                    {selectedPlaylist && (
                      <div className="selected-playlist-info">
                        <h4>Selected for Comparison:</h4>
                        <div className="selected-playlist-card">
                          {selectedPlaylist.image && (
                            <img src={selectedPlaylist.image} alt={selectedPlaylist.name} className="selected-playlist-image" />
                          )}
                          <div className="selected-playlist-details">
                            <strong>{selectedPlaylist.name}</strong>
                            <p>{selectedPlaylist.trackCount} tracks • by {selectedPlaylist.owner}</p>
                            <div className="selected-playlist-actions">
                              <button 
                                onClick={() => setActiveTab('compare')} 
                                className="go-to-compare-btn"
                              >
                                Go to Compare Tab
                              </button>
                              <button 
                                onClick={() => setSelectedPlaylist(null)} 
                                className="clear-selection-btn"
                              >
                                Clear Selection
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="no-playlists">
                    <p>No playlists found. Make sure you're authenticated.</p>
                    <button onClick={fetchUserPlaylists} className="refresh-button">
                      Refresh Playlists
                    </button>
                  </div>
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
