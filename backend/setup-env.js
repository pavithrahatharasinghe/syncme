const fs = require('fs');
const path = require('path');

const envFilePath = path.resolve(__dirname, '.env');
const envExamplePath = path.resolve(__dirname, '.env.example');

// Check if .env file already exists
if (!fs.existsSync(envFilePath)) {
  console.log('Creating .env file from .env.example...');
  fs.copyFileSync(envExamplePath, envFilePath);
  console.log('.env file created successfully. Please update it with your Spotify credentials.');
} else {
  console.log('.env file already exists. Skipping creation.');
}