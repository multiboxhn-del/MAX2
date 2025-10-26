# maxradio Project

## Overview
This project is a React application created using Vite. It serves as a basic template for building a radio application with audio playback functionality.

## Project Structure
```
maxradio
├── index.html          # Main HTML file serving as the entry point
├── package.json        # Configuration file for npm
├── package-lock.json   # Locks the versions of dependencies
├── vite.config.js      # Configuration settings for Vite
├── .gitignore          # Specifies files to be ignored by Git
├── README.md           # Documentation for the project
└── src
    ├── main.jsx        # Entry point for the React application
    ├── App.jsx         # Main App component
    ├── index.css       # Global CSS styles
    ├── components
    │   ├── Header.jsx  # Header component
    │   └── Player.jsx  # Player component for audio playback
    └── hooks
        └── useAudio.js  # Custom hook for managing audio playback
```

## Setup Instructions
1. Clone the repository:
   ```
   git clone <repository-url>
   ```
2. Navigate to the project directory:
   ```
   cd maxradio
   ```
3. Install the dependencies:
   ```
   npm install
   ```
4. Start the development server:
   ```
   npm run dev
   ```

## Usage
- Open your browser and navigate to `http://localhost:3000` to view the application.
- The application includes a header and a player component for audio playback.

## Contributing
Feel free to submit issues or pull requests for improvements or bug fixes.