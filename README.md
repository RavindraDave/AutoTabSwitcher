# AutoTabSwitcher

A Chrome extension that automatically switches to the next tab every few seconds. Built with TypeScript.

## Features

- Automatically cycles through open tabs in the current window
- Configurable delay time (in seconds)
- Enable/disable toggle
- Visual badge indicator (ON/OFF)
- Persistent settings across browser sessions

## Development

### Prerequisites

- Node.js (v14 or higher)
- npm

### Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the TypeScript files:
   ```bash
   npm run build
   ```

### Build Scripts

- `npm run build` - Compile TypeScript files to JavaScript
- `npm run watch` - Watch mode for development (auto-recompile on changes)
- `npm run clean` - Remove the dist directory

### Project Structure

```
AutoTabSwitcher/
├── src/
│   ├── background.ts       # Background service worker (TypeScript)
│   ├── popup/
│   │   ├── popup.ts        # Popup UI logic (TypeScript)
│   │   └── popup.html      # Popup HTML
│   └── manifest.json       # Extension manifest
├── dist/                   # Compiled JavaScript output
│   ├── background.js
│   └── popup/
│       └── popup.js
├── package.json
├── tsconfig.json
└── README.md
```

## Installation

1. Build the project (see Development section)
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked"
5. Select the `src` directory from this project

## Usage

1. Click the extension icon to open the popup
2. Set your desired delay time (in seconds)
3. Toggle the "Enabled" checkbox to start/stop automatic tab switching
4. Click "Save" to apply changes
5. The badge will show "ON" when enabled, "OFF" when disabled

## Bug Fixes

This TypeScript conversion includes fixes for the following bugs from the JavaScript version:

1. **Scope Issues**: Fixed variables and functions being inaccessible across different event listeners
2. **Empty Catch Block**: Added proper error handling with error logging
3. **Initialization Logic**: Corrected the default enabled state to be `false` on installation
4. **Type Safety**: Added TypeScript type annotations throughout for better code reliability

## License

MIT
