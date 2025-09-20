require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const { parseFile } = require('music-metadata');
const querystring = require('querystring');

const app = express();
const PORT = process.env.PORT || 3001;

// Spotify OAuth configuration
const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI || 'http://localhost:3001/callback';

// Store access tokens (in production, use a proper database)
let accessToken = null;
let refreshToken = null;

// Middleware
app.use(cors());
app.use(express.json());

// Spotify OAuth login endpoint
app.get('/login', (req, res) => {
  const scope = 'playlist-modify-public playlist-modify-private';
  const authUrl = 'https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: CLIENT_ID,
      scope: scope,
      redirect_uri: REDIRECT_URI,
    });
  
  res.redirect(authUrl);
});

// Spotify OAuth callback endpoint
app.get('/callback', async (req, res) => {
  const code = req.query.code || null;
  
  if (!code) {
    return res.status(400).json({ error: 'Authorization code not provided' });
  }

  try {
    const response = await axios.post('https://accounts.spotify.com/api/token', 
      querystring.stringify({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: REDIRECT_URI,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
      }), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    accessToken = response.data.access_token;
    refreshToken = response.data.refresh_token;
    
    res.json({ message: 'Successfully authenticated with Spotify!' });
  } catch (error) {
    console.error('Error during token exchange:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to authenticate with Spotify' });
  }
});

// API endpoint to scan local folder for music files
app.post('/api/scan-folder', async (req, res) => {
  const { folderPath } = req.body;
  
  if (!folderPath) {
    return res.status(400).json({ error: 'Folder path is required' });
  }

  try {
    const files = await scanMusicFolder(folderPath);
    res.json({ files });
  } catch (error) {
    console.error('Error scanning folder:', error.message);
    res.status(500).json({ error: 'Failed to scan folder: ' + error.message });
  }
});

// API endpoint to get user's existing Spotify playlists
app.get('/api/playlists', async (req, res) => {
  if (!accessToken) {
    // Return mock data for demo purposes
    const mockPlaylists = [
      {
        id: 'playlist1',
        name: 'My Favorites',
        description: 'All my favorite songs',
        trackCount: 45,
        url: 'https://open.spotify.com/playlist/playlist1',
        image: 'https://via.placeholder.com/150/1db954/ffffff?text=Favorites',
        owner: 'john_doe',
        public: true
      },
      {
        id: 'playlist2',
        name: 'Rock Classics',
        description: 'Best rock songs from the 80s and 90s',
        trackCount: 87,
        url: 'https://open.spotify.com/playlist/playlist2',
        image: 'https://via.placeholder.com/150/ff6b6b/ffffff?text=Rock',
        owner: 'john_doe',
        public: false
      },
      {
        id: 'playlist3',
        name: 'Chill Vibes',
        description: 'Relaxing music for work and study',
        trackCount: 32,
        url: 'https://open.spotify.com/playlist/playlist3',
        image: 'https://via.placeholder.com/150/4ecdc4/ffffff?text=Chill',
        owner: 'john_doe',
        public: true
      },
      {
        id: 'playlist4',
        name: 'Workout Mix',
        description: 'High energy songs for gym sessions',
        trackCount: 67,
        url: 'https://open.spotify.com/playlist/playlist4',
        image: 'https://via.placeholder.com/150/ff8c00/ffffff?text=Workout',
        owner: 'john_doe',
        public: false
      },
      {
        id: 'playlist5',
        name: 'Jazz Collection',
        description: 'Classic and modern jazz tracks',
        trackCount: 123,
        url: 'https://open.spotify.com/playlist/playlist5',
        image: 'https://via.placeholder.com/150/9b59b6/ffffff?text=Jazz',
        owner: 'music_lover',
        public: true
      },
      {
        id: 'playlist6',
        name: 'Summer Hits 2023',
        description: 'Top summer songs of 2023',
        trackCount: 54,
        url: 'https://open.spotify.com/playlist/playlist6',
        image: 'https://via.placeholder.com/150/f39c12/ffffff?text=Summer',
        owner: 'music_lover',
        public: true
      },
      {
        id: 'playlist7',
        name: 'Indie Folk',
        description: 'Beautiful indie folk songs',
        trackCount: 78,
        url: 'https://open.spotify.com/playlist/playlist7',
        image: 'https://via.placeholder.com/150/27ae60/ffffff?text=Folk',
        owner: 'indie_fan',
        public: false
      },
      {
        id: 'playlist8',
        name: 'Electronic Dreams',
        description: 'Electronic music for late nights',
        trackCount: 99,
        url: 'https://open.spotify.com/playlist/playlist8',
        image: 'https://via.placeholder.com/150/3498db/ffffff?text=Electronic',
        owner: 'techno_head',
        public: true
      },
      {
        id: 'playlist9',
        name: 'Classical Masterpieces',
        description: 'Greatest classical compositions',
        trackCount: 156,
        url: 'https://open.spotify.com/playlist/playlist9',
        image: 'https://via.placeholder.com/150/8e44ad/ffffff?text=Classical',
        owner: 'classic_music',
        public: true
      },
      {
        id: 'playlist10',
        name: 'Country Roads',
        description: 'Best country music collection',
        trackCount: 89,
        url: 'https://open.spotify.com/playlist/playlist10',
        image: 'https://via.placeholder.com/150/d35400/ffffff?text=Country',
        owner: 'country_fan',
        public: false
      },
      {
        id: 'playlist11',
        name: 'Hip Hop Essentials',
        description: 'Must-have hip hop tracks',
        trackCount: 76,
        url: 'https://open.spotify.com/playlist/playlist11',
        image: 'https://via.placeholder.com/150/2c3e50/ffffff?text=HipHop',
        owner: 'rap_master',
        public: true
      },
      {
        id: 'playlist12',
        name: 'Acoustic Sessions',
        description: 'Unplugged and acoustic versions',
        trackCount: 43,
        url: 'https://open.spotify.com/playlist/playlist12',
        image: 'https://via.placeholder.com/150/95a5a6/ffffff?text=Acoustic',
        owner: 'acoustic_lover',
        public: false
      }
    ];
    return res.json({ playlists: mockPlaylists });
  }

  try {
    const playlists = await getUserPlaylists();
    res.json({ playlists });
  } catch (error) {
    console.error('Error fetching playlists:', error.message);
    res.status(500).json({ error: 'Failed to fetch playlists: ' + error.message });
  }
});

// API endpoint to get tracks from a specific playlist
app.get('/api/playlists/:playlistId/tracks', async (req, res) => {
  const { playlistId } = req.params;
  
  if (!accessToken) {
    return res.status(401).json({ error: 'Not authenticated with Spotify' });
  }

  try {
    const tracks = await getPlaylistTracks(playlistId);
    res.json({ tracks });
  } catch (error) {
    console.error('Error fetching playlist tracks:', error.message);
    res.status(500).json({ error: 'Failed to fetch playlist tracks: ' + error.message });
  }
});

// API endpoint to compare local songs with a Spotify playlist
app.post('/api/compare-playlist', async (req, res) => {
  const { playlistId, songs } = req.body;
  
  if (!accessToken) {
    return res.status(401).json({ error: 'Not authenticated with Spotify' });
  }
  
  if (!playlistId || !songs || !Array.isArray(songs)) {
    return res.status(400).json({ error: 'Playlist ID and songs array are required' });
  }

  try {
    const comparison = await compareWithPlaylist(playlistId, songs);
    res.json({ comparison });
  } catch (error) {
    console.error('Error comparing playlist:', error.message);
    res.status(500).json({ error: 'Failed to compare playlist: ' + error.message });
  }
});

// API endpoint to update an existing Spotify playlist
app.post('/api/update-playlist', async (req, res) => {
  const { playlistId, songsToAdd, songsToRemove } = req.body;
  
  if (!accessToken) {
    return res.status(401).json({ error: 'Not authenticated with Spotify' });
  }
  
  if (!playlistId) {
    return res.status(400).json({ error: 'Playlist ID is required' });
  }

  try {
    const result = await updateSpotifyPlaylist(playlistId, songsToAdd, songsToRemove);
    res.json({ result });
  } catch (error) {
    console.error('Error updating playlist:', error.message);
    res.status(500).json({ error: 'Failed to update playlist: ' + error.message });
  }
});

// API endpoint to create Spotify playlist
app.post('/api/create-playlist', async (req, res) => {
  const { playlistName, songs } = req.body;
  
  if (!accessToken) {
    return res.status(401).json({ error: 'Not authenticated with Spotify' });
  }
  
  if (!playlistName || !songs || !Array.isArray(songs)) {
    return res.status(400).json({ error: 'Playlist name and songs array are required' });
  }

  try {
    const playlist = await createSpotifyPlaylist(playlistName, songs);
    res.json({ playlist });
  } catch (error) {
    console.error('Error creating playlist:', error.message);
    res.status(500).json({ error: 'Failed to create playlist: ' + error.message });
  }
});

// Helper function to get user's Spotify playlists
async function getUserPlaylists() {
  try {
    const allPlaylists = [];
    let offset = 0;
    const limit = 50; // Maximum allowed by Spotify API
    let hasMore = true;
    
    while (hasMore) {
      const response = await axios.get('https://api.spotify.com/v1/me/playlists', {
        params: {
          limit,
          offset
        },
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      const playlists = response.data.items.map(playlist => ({
        id: playlist.id,
        name: playlist.name,
        description: playlist.description,
        trackCount: playlist.tracks.total,
        url: playlist.external_urls.spotify,
        image: playlist.images.length > 0 ? playlist.images[0].url : null,
        owner: playlist.owner.display_name,
        public: playlist.public
      }));
      
      allPlaylists.push(...playlists);
      
      // Check if there are more playlists to fetch
      hasMore = response.data.next !== null;
      offset += limit;
    }
    
    return allPlaylists;
  } catch (error) {
    throw new Error(`Spotify API error: ${error.response?.data?.error?.message || error.message}`);
  }
}

// Helper function to get tracks from a specific playlist
async function getPlaylistTracks(playlistId) {
  try {
    const tracks = [];
    let offset = 0;
    const limit = 100;
    
    while (true) {
      const response = await axios.get(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
        params: {
          offset: offset,
          limit: limit,
          fields: 'items(track(id,name,artists,album,uri)),next'
        },
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      const items = response.data.items;
      tracks.push(...items.map(item => ({
        id: item.track?.id,
        name: item.track?.name,
        artist: item.track?.artists?.[0]?.name,
        album: item.track?.album?.name,
        uri: item.track?.uri
      })).filter(track => track.id)); // Filter out null tracks
      
      if (!response.data.next) break;
      offset += limit;
    }
    
    return tracks;
  } catch (error) {
    throw new Error(`Spotify API error: ${error.response?.data?.error?.message || error.message}`);
  }
}

// Helper function to search for a track on Spotify with enhanced matching
async function searchSpotifyTrack(song) {
  try {
    // Try different search strategies
    const searchQueries = [
      `track:"${song.title}" artist:"${song.artist}"`,
      `"${song.title}" "${song.artist}"`,
      `${song.title} ${song.artist}`,
      `track:"${song.title}"`
    ];
    
    for (const query of searchQueries) {
      const response = await axios.get('https://api.spotify.com/v1/search', {
        params: {
          q: query,
          type: 'track',
          limit: 5
        },
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      if (response.data.tracks.items.length > 0) {
        const tracks = response.data.tracks.items;
        
        // Find best match based on similarity
        for (const track of tracks) {
          const titleMatch = song.title.toLowerCase() === track.name.toLowerCase();
          const artistMatch = song.artist.toLowerCase() === track.artists[0]?.name.toLowerCase();
          const partialTitleMatch = song.title.toLowerCase().includes(track.name.toLowerCase()) || 
                                  track.name.toLowerCase().includes(song.title.toLowerCase());
          const partialArtistMatch = song.artist.toLowerCase().includes(track.artists[0]?.name.toLowerCase()) || 
                                   track.artists[0]?.name.toLowerCase().includes(song.artist.toLowerCase());
          
          if ((titleMatch && artistMatch) || 
              (titleMatch && partialArtistMatch) || 
              (partialTitleMatch && artistMatch)) {
            return {
              id: track.id,
              name: track.name,
              artist: track.artists[0]?.name,
              album: track.album?.name,
              uri: track.uri,
              confidence: titleMatch && artistMatch ? 'high' : 'medium'
            };
          }
        }
        
        // Return first result if no perfect match but found results
        const track = tracks[0];
        return {
          id: track.id,
          name: track.name,
          artist: track.artists[0]?.name,
          album: track.album?.name,
          uri: track.uri,
          confidence: 'low'
        };
      }
    }
    
    return null;
  } catch (error) {
    console.warn(`Could not search for track: ${song.title} by ${song.artist}`, error.message);
    return null;
  }
}

// Helper function to compare local songs with Spotify playlist
async function compareWithPlaylist(playlistId, localSongs) {
  try {
    const playlistTracks = await getPlaylistTracks(playlistId);
    const comparison = {
      inBoth: [],
      onlyLocal: [],
      onlySpotify: playlistTracks.slice(), // Start with all Spotify tracks
      newMatches: []
    };
    
    for (const localSong of localSongs) {
      const spotifyMatch = await searchSpotifyTrack(localSong);
      
      if (spotifyMatch) {
        // Check if this track is already in the playlist
        const existingTrack = playlistTracks.find(track => 
          track.id === spotifyMatch.id ||
          (track.name.toLowerCase() === spotifyMatch.name.toLowerCase() && 
           track.artist.toLowerCase() === spotifyMatch.artist.toLowerCase())
        );
        
        if (existingTrack) {
          comparison.inBoth.push({
            local: localSong,
            spotify: existingTrack,
            confidence: spotifyMatch.confidence
          });
          
          // Remove from onlySpotify list
          comparison.onlySpotify = comparison.onlySpotify.filter(track => track.id !== existingTrack.id);
        } else {
          comparison.newMatches.push({
            local: localSong,
            spotify: spotifyMatch,
            confidence: spotifyMatch.confidence
          });
        }
      } else {
        comparison.onlyLocal.push(localSong);
      }
    }
    
    return comparison;
  } catch (error) {
    throw new Error(`Comparison error: ${error.message}`);
  }
}

// Helper function to update an existing Spotify playlist
async function updateSpotifyPlaylist(playlistId, songsToAdd = [], songsToRemove = []) {
  try {
    let addedCount = 0;
    let removedCount = 0;
    
    // Add new tracks
    if (songsToAdd && songsToAdd.length > 0) {
      const trackUris = [];
      
      for (const song of songsToAdd) {
        const spotifyTrack = await searchSpotifyTrack(song);
        if (spotifyTrack) {
          trackUris.push(spotifyTrack.uri);
        }
      }
      
      if (trackUris.length > 0) {
        // Add tracks in batches of 100 (Spotify limit)
        for (let i = 0; i < trackUris.length; i += 100) {
          const batch = trackUris.slice(i, i + 100);
          await axios.post(
            `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
            {
              uris: batch
            },
            {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
              }
            }
          );
          addedCount += batch.length;
        }
      }
    }
    
    // Remove tracks
    if (songsToRemove && songsToRemove.length > 0) {
      const tracksToDelete = songsToRemove.map(song => ({
        uri: song.uri || song.spotify?.uri
      })).filter(track => track.uri);
      
      if (tracksToDelete.length > 0) {
        // Remove tracks in batches of 100 (Spotify limit)
        for (let i = 0; i < tracksToDelete.length; i += 100) {
          const batch = tracksToDelete.slice(i, i + 100);
          await axios.delete(
            `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
            {
              data: {
                tracks: batch
              },
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
              }
            }
          );
          removedCount += batch.length;
        }
      }
    }
    
    return {
      playlistId,
      addedCount,
      removedCount,
      message: `Updated playlist: added ${addedCount} tracks, removed ${removedCount} tracks`
    };
    
  } catch (error) {
    throw new Error(`Update playlist error: ${error.response?.data?.error?.message || error.message}`);
  }
}

// Helper function to scan music folder
async function scanMusicFolder(folderPath) {
  const musicFiles = [];
  const supportedExtensions = ['.mp3', '.m4a', '.flac', '.wav', '.aac'];
  
  try {
    const files = await fs.readdir(folderPath);
    
    for (const file of files) {
      const filePath = path.join(folderPath, file);
      const stat = await fs.stat(filePath);
      
      if (stat.isFile() && supportedExtensions.includes(path.extname(file).toLowerCase())) {
        try {
          const metadata = await parseFile(filePath);
          musicFiles.push({
            file: file,
            title: metadata.common.title || path.basename(file, path.extname(file)),
            artist: metadata.common.artist || 'Unknown Artist',
            album: metadata.common.album || 'Unknown Album',
            duration: metadata.format.duration || 0,
            path: filePath
          });
        } catch (metadataError) {
          console.warn(`Could not parse metadata for ${file}:`, metadataError.message);
          // Add file with basic info if metadata parsing fails
          musicFiles.push({
            file: file,
            title: path.basename(file, path.extname(file)),
            artist: 'Unknown Artist',
            album: 'Unknown Album',
            duration: 0,
            path: filePath
          });
        }
      }
    }
  } catch (error) {
    throw new Error(`Cannot access folder: ${error.message}`);
  }
  
  return musicFiles;
}

// Helper function to create Spotify playlist
async function createSpotifyPlaylist(playlistName, songs) {
  try {
    // Get user profile
    const userResponse = await axios.get('https://api.spotify.com/v1/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    const userId = userResponse.data.id;
    
    // Create playlist
    const playlistResponse = await axios.post(
      `https://api.spotify.com/v1/users/${userId}/playlists`,
      {
        name: playlistName,
        description: 'Created by SyncMe',
        public: false
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const playlistId = playlistResponse.data.id;
    
    // Search for tracks and add them to playlist using enhanced search
    const trackUris = [];
    const matchResults = [];
    
    for (const song of songs) {
      const spotifyTrack = await searchSpotifyTrack(song);
      if (spotifyTrack) {
        trackUris.push(spotifyTrack.uri);
        matchResults.push({
          local: song,
          spotify: spotifyTrack,
          confidence: spotifyTrack.confidence
        });
      } else {
        console.warn(`Could not find track: ${song.title} by ${song.artist}`);
        matchResults.push({
          local: song,
          spotify: null,
          confidence: 'none'
        });
      }
    }
    
    // Add tracks to playlist
    if (trackUris.length > 0) {
      // Add tracks in batches of 100 (Spotify limit)
      for (let i = 0; i < trackUris.length; i += 100) {
        const batch = trackUris.slice(i, i + 100);
        await axios.post(
          `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
          {
            uris: batch
          },
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            }
          }
        );
      }
    }
    
    return {
      id: playlistId,
      name: playlistName,
      url: playlistResponse.data.external_urls.spotify,
      tracksAdded: trackUris.length,
      totalSongs: songs.length,
      matchResults: matchResults
    };
    
  } catch (error) {
    throw new Error(`Spotify API error: ${error.response?.data?.error?.message || error.message}`);
  }
}

// API endpoint to export a single playlist as JSON with ISRC codes
app.get('/api/export-playlist/:playlistId', async (req, res) => {
  const { playlistId } = req.params;
  
  if (!accessToken) {
    // Return mock export data for demo purposes
    const mockPlaylistsMap = {
      'playlist1': {
        id: 'playlist1',
        name: 'My Favorites',
        description: 'All my favorite songs',
        public: true,
        collaborative: false,
        owner: {
          id: 'john_doe',
          display_name: 'john_doe'
        },
        followers: 1250,
        images: [
          {
            url: 'https://via.placeholder.com/150/1db954/ffffff?text=Favorites',
            height: 640,
            width: 640
          }
        ],
        snapshot_id: 'mock_snapshot_123',
        spotify_url: 'https://open.spotify.com/playlist/playlist1',
        total_tracks: 45,
        tracks: [
          {
            id: 'track1',
            name: 'Sample Song 1',
            artists: ['Artist 1', 'Artist 2'],
            album: 'Sample Album',
            releaseDate: '2023-01-15',
            durationMs: 234567,
            popularity: 75,
            previewUrl: 'https://p.scdn.co/mp3-preview/sample1',
            isrc: 'USUM71234567',
            spotify_url: 'https://open.spotify.com/track/track1'
          },
          {
            id: 'track2',
            name: 'Sample Song 2',
            artists: ['Artist 3'],
            album: 'Another Album',
            releaseDate: '2023-02-20',
            durationMs: 187345,
            popularity: 68,
            previewUrl: 'https://p.scdn.co/mp3-preview/sample2',
            isrc: 'GBUM71234568',
            spotify_url: 'https://open.spotify.com/track/track2'
          }
        ],
        exported_at: new Date().toISOString()
      }
    };
    
    const mockPlaylist = mockPlaylistsMap[playlistId];
    if (!mockPlaylist) {
      // Generate a generic mock for any playlist ID
      const genericMock = {
        id: playlistId,
        name: `Mock Playlist ${playlistId}`,
        description: 'This is a mock playlist for demo purposes',
        public: true,
        collaborative: false,
        owner: {
          id: 'mock_user',
          display_name: 'Mock User'
        },
        followers: Math.floor(Math.random() * 1000),
        images: [
          {
            url: 'https://via.placeholder.com/150/666666/ffffff?text=Mock',
            height: 640,
            width: 640
          }
        ],
        snapshot_id: `mock_snapshot_${playlistId}`,
        spotify_url: `https://open.spotify.com/playlist/${playlistId}`,
        total_tracks: Math.floor(Math.random() * 100) + 10,
        tracks: [
          {
            id: `${playlistId}_track1`,
            name: 'Mock Song 1',
            artists: ['Mock Artist 1'],
            album: 'Mock Album',
            releaseDate: '2023-01-01',
            durationMs: 210000,
            popularity: 50,
            previewUrl: null,
            isrc: 'MOCK12345678',
            spotify_url: `https://open.spotify.com/track/${playlistId}_track1`
          }
        ],
        exported_at: new Date().toISOString()
      };
      return res.json({ playlist: genericMock });
    }
    
    return res.json({ playlist: mockPlaylist });
  }

  try {
    const playlistDetails = await getPlaylistDetails(playlistId);
    res.json({ playlist: playlistDetails });
  } catch (error) {
    console.error('Error exporting playlist:', error.message);
    res.status(500).json({ error: 'Failed to export playlist: ' + error.message });
  }
});

// API endpoint to export multiple playlists as JSON
app.post('/api/export-playlists', async (req, res) => {
  const { playlistIds } = req.body;
  
  if (!playlistIds || !Array.isArray(playlistIds)) {
    return res.status(400).json({ error: 'Playlist IDs array is required' });
  }
  
  if (!accessToken) {
    // Return mock export data for demo purposes
    const mockPlaylists = playlistIds.map(playlistId => ({
      id: playlistId,
      name: `Mock Playlist ${playlistId}`,
      description: 'This is a mock playlist for demo purposes',
      public: true,
      collaborative: false,
      owner: {
        id: 'mock_user',
        display_name: 'Mock User'
      },
      followers: Math.floor(Math.random() * 1000),
      images: [
        {
          url: 'https://via.placeholder.com/150/666666/ffffff?text=Mock',
          height: 640,
          width: 640
        }
      ],
      snapshot_id: `mock_snapshot_${playlistId}`,
      spotify_url: `https://open.spotify.com/playlist/${playlistId}`,
      total_tracks: Math.floor(Math.random() * 100) + 10,
      tracks: [
        {
          id: `${playlistId}_track1`,
          name: 'Mock Song 1',
          artists: ['Mock Artist 1'],
          album: 'Mock Album',
          releaseDate: '2023-01-01',
          durationMs: 210000,
          popularity: 50,
          previewUrl: null,
          isrc: 'MOCK12345678',
          spotify_url: `https://open.spotify.com/track/${playlistId}_track1`
        },
        {
          id: `${playlistId}_track2`,
          name: 'Mock Song 2',
          artists: ['Mock Artist 2'],
          album: 'Another Mock Album',
          releaseDate: '2023-02-15',
          durationMs: 180000,
          popularity: 45,
          previewUrl: null,
          isrc: 'MOCK12345679',
          spotify_url: `https://open.spotify.com/track/${playlistId}_track2`
        }
      ],
      exported_at: new Date().toISOString()
    }));
    
    return res.json({ playlists: mockPlaylists });
  }

  try {
    const playlists = [];
    for (const playlistId of playlistIds) {
      const playlistDetails = await getPlaylistDetails(playlistId);
      playlists.push(playlistDetails);
    }
    res.json({ playlists });
  } catch (error) {
    console.error('Error exporting playlists:', error.message);
    res.status(500).json({ error: 'Failed to export playlists: ' + error.message });
  }
});

// Helper function to get detailed playlist information including ISRC codes
async function getPlaylistDetails(playlistId) {
  try {
    // Get playlist basic info
    const playlistResponse = await axios.get(`https://api.spotify.com/v1/playlists/${playlistId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    const playlist = playlistResponse.data;
    const tracks = [];

    // Get all tracks with detailed information including ISRC
    let offset = 0;
    const limit = 50;
    let hasMore = true;

    while (hasMore) {
      const tracksResponse = await axios.get(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
        params: {
          offset,
          limit,
          fields: 'items(track(id,name,artists(name),album(name,release_date),external_ids,duration_ms,popularity,preview_url)),next'
        },
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      const trackData = tracksResponse.data;
      
      for (const item of trackData.items) {
        if (item.track) {
          const track = item.track;
          tracks.push({
            id: track.id,
            name: track.name,
            artists: track.artists.map(artist => artist.name),
            album: track.album.name,
            releaseDate: track.album.release_date,
            durationMs: track.duration_ms,
            popularity: track.popularity,
            previewUrl: track.preview_url,
            isrc: track.external_ids?.isrc || null,
            spotify_url: `https://open.spotify.com/track/${track.id}`
          });
        }
      }

      hasMore = trackData.next !== null;
      offset += limit;
    }

    return {
      id: playlist.id,
      name: playlist.name,
      description: playlist.description,
      public: playlist.public,
      collaborative: playlist.collaborative,
      owner: {
        id: playlist.owner.id,
        display_name: playlist.owner.display_name
      },
      followers: playlist.followers.total,
      images: playlist.images,
      snapshot_id: playlist.snapshot_id,
      spotify_url: playlist.external_urls.spotify,
      total_tracks: playlist.tracks.total,
      tracks: tracks,
      exported_at: new Date().toISOString()
    };
  } catch (error) {
    throw new Error(`Failed to get playlist details: ${error.response?.data?.error?.message || error.message}`);
  }
}

// API endpoint for manual track search
app.post('/api/search-track', async (req, res) => {
  const { title, artist, album } = req.body;
  
  if (!accessToken) {
    return res.status(401).json({ error: 'Not authenticated with Spotify' });
  }
  
  if (!title || !artist) {
    return res.status(400).json({ error: 'Track title and artist are required' });
  }

  try {
    // Try multiple search strategies
    const searchQueries = [
      `track:"${title}" artist:"${artist}"`,
      `"${title}" "${artist}"`,
      `${title} ${artist}`,
      `track:"${title}"`
    ];
    
    const tracks = [];
    
    for (const query of searchQueries) {
      try {
        const response = await axios.get('https://api.spotify.com/v1/search', {
          params: {
            q: query,
            type: 'track',
            limit: 10
          },
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });
        
        if (response.data.tracks.items.length > 0) {
          for (const track of response.data.tracks.items) {
            tracks.push({
              id: track.id,
              name: track.name,
              artist: track.artists[0]?.name,
              album: track.album?.name,
              uri: track.uri,
              popularity: track.popularity,
              preview_url: track.preview_url
            });
          }
        }
      } catch (searchError) {
        console.warn(`Search query failed: ${query}`, searchError.message);
      }
    }
    
    // Remove duplicates and sort by popularity
    const uniqueTracks = tracks.filter((track, index, self) => 
      index === self.findIndex(t => t.id === track.id)
    ).sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
    
    res.json({ tracks: uniqueTracks.slice(0, 10) });
  } catch (error) {
    console.error('Error searching for track:', error.message);
    res.status(500).json({ error: 'Failed to search for track: ' + error.message });
  }
});

// API endpoint to add a single track to a playlist
app.post('/api/add-track-to-playlist', async (req, res) => {
  const { playlistId, trackUri } = req.body;
  
  if (!accessToken) {
    return res.status(401).json({ error: 'Not authenticated with Spotify' });
  }
  
  if (!playlistId || !trackUri) {
    return res.status(400).json({ error: 'Playlist ID and track URI are required' });
  }

  try {
    const response = await axios.post(
      `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
      {
        uris: [trackUri]
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    res.json({ 
      success: true, 
      message: 'Track added to playlist successfully',
      snapshot_id: response.data.snapshot_id 
    });
  } catch (error) {
    console.error('Error adding track to playlist:', error.message);
    res.status(500).json({ error: 'Failed to add track to playlist: ' + error.message });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('Make sure to set environment variables:');
  console.log('- SPOTIFY_CLIENT_ID');
  console.log('- SPOTIFY_CLIENT_SECRET');
  console.log('- SPOTIFY_REDIRECT_URI (optional, defaults to http://localhost:3001/callback)');
});