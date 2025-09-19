# SyncMe - Music to Spotify Sync

A full-stack application that allows you to scan local music folders and create Spotify playlists from your music collection.

## Features

- 🎵 Scan local music folders for audio files (MP3, M4A, FLAC, WAV, AAC)
- 🔍 Extract metadata from music files (title, artist, album)
- 🎶 Authenticate with Spotify using OAuth
- 📝 Create Spotify playlists from local music collections
- 🔍 Automatically search and match songs on Spotify
- 🌐 Clean and responsive web interface

## Tech Stack

### Backend
- **Node.js** with Express.js
- **Spotify Web API** integration
- **music-metadata** for audio file parsing
- **axios** for HTTP requests
- **cors** for cross-origin requests

### Frontend
- **React** with TypeScript
- **CSS3** for styling
- Responsive design

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- Spotify Developer Account
- Local music files to sync

### Spotify App Setup
1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create a new app
3. Note down your `Client ID` and `Client Secret`
4. Add `http://localhost:3001/callback` to your app's Redirect URIs

### Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create environment file:
   ```bash
   cp .env.example .env
   ```

4. Edit `.env` file with your Spotify credentials:
   ```
   SPOTIFY_CLIENT_ID=your_spotify_client_id_here
   SPOTIFY_CLIENT_SECRET=your_spotify_client_secret_here
   SPOTIFY_REDIRECT_URI=http://localhost:3001/callback
   PORT=3001
   ```

5. Start the backend server:
   ```bash
   npm start
   ```

### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

## Usage

1. **Start both servers**: Backend on port 3001, Frontend on port 3000
2. **Open your browser** and go to `http://localhost:3000`
3. **Authenticate with Spotify** by clicking the "Login to Spotify" button
4. **Enter a folder path** containing your music files
5. **Scan the folder** to discover music files
6. **Create a playlist** by entering a name and clicking "Create Playlist"

## API Endpoints

### Backend Endpoints

- `GET /login` - Initiates Spotify OAuth flow
- `GET /callback` - Handles Spotify OAuth callback
- `POST /api/scan-folder` - Scans a local folder for music files
- `POST /api/create-playlist` - Creates a Spotify playlist from songs
- `GET /health` - Health check endpoint

### Request/Response Examples

#### Scan Folder
```bash
POST /api/scan-folder
Content-Type: application/json

{
  "folderPath": "/path/to/music"
}
```

#### Create Playlist
```bash
POST /api/create-playlist
Content-Type: application/json

{
  "playlistName": "My Local Music",
  "songs": [
    {
      "title": "Song Title",
      "artist": "Artist Name",
      "album": "Album Name"
    }
  ]
}
```

## Project Structure

```
syncme/
├── backend/
│   ├── package.json
│   ├── server.js
│   └── .env.example
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── App.css
│   │   └── ...
│   └── package.json
├── .gitignore
└── README.md
```

## Limitations

- Requires local file system access for scanning
- Spotify track matching depends on metadata quality
- Some tracks may not be available on Spotify
- Authentication tokens are stored in memory (not persistent)

## Development

### Running in Development Mode

1. Backend: `cd backend && npm run dev`
2. Frontend: `cd frontend && npm start`

### Building for Production

1. Frontend: `cd frontend && npm run build`
2. Backend: Use process manager like PM2 for production deployment

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the ISC License.