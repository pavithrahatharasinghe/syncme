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
    
    // Search for tracks and add them to playlist
    const trackUris = [];
    for (const song of songs) {
      try {
        const searchQuery = `track:"${song.title}" artist:"${song.artist}"`;
        const searchResponse = await axios.get('https://api.spotify.com/v1/search', {
          params: {
            q: searchQuery,
            type: 'track',
            limit: 1
          },
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });
        
        if (searchResponse.data.tracks.items.length > 0) {
          trackUris.push(searchResponse.data.tracks.items[0].uri);
        }
      } catch (searchError) {
        console.warn(`Could not find track: ${song.title} by ${song.artist}`);
      }
    }
    
    // Add tracks to playlist
    if (trackUris.length > 0) {
      await axios.post(
        `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
        {
          uris: trackUris
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
    }
    
    return {
      id: playlistId,
      name: playlistName,
      url: playlistResponse.data.external_urls.spotify,
      tracksAdded: trackUris.length,
      totalSongs: songs.length
    };
    
  } catch (error) {
    throw new Error(`Spotify API error: ${error.response?.data?.error?.message || error.message}`);
  }
}

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