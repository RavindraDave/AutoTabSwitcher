# Auto Tab Switcher

A Chrome extension that automatically cycles through open tabs at configurable intervals. Built with TypeScript following Manifest V3 best practices.

## Features

- 🔄 Automatically cycles through open tabs in the current window
- ⏱️ Configurable delay time (1 minute to 1 hour)
- 🎚️ Easy enable/disable toggle
- 📊 Visual badge indicator (ON/OFF with color coding)
- 💾 Persistent settings across browser sessions
- 🔧 Built with TypeScript for type safety and reliability
- ⚡ Manifest V3 compliant using chrome.alarms API

## Architecture

### Manifest V3 Service Worker

This extension follows Chrome Extension Manifest V3 best practices:

- **Service Worker Architecture**: Uses event-driven architecture without relying on persistent state
- **chrome.alarms API**: Replaces setInterval for reliable periodic execution
- **chrome.storage.local**: All state is persisted to storage (service workers can be terminated)
- **Async/Await**: Modern promise-based APIs throughout
- **Type Safety**: Full TypeScript coverage with strict type checking

### Project Structure

```plaintext
AutoTabSwitcher/
├── src/                          # Source files
│   ├── background.ts             # Service worker (TypeScript)
│   ├── popup/
│   │   ├── popup.ts              # Popup UI controller (TypeScript)
│   │   └── popup.html            # Popup HTML
│   ├── css/
│   │   └── bootstrap.min.css     # Styles
│   ├── icon.png                  # Extension icon
│   ├── icon-off.png              # Disabled state icon
│   └── manifest.json             # Extension manifest
├── dist/                         # Compiled output (git-ignored)
│   ├── background.js             # Compiled service worker
│   ├── popup/
│   │   ├── popup.js              # Compiled popup controller
│   │   └── popup.html            # Copied HTML
│   ├── css/                      # Copied styles
│   ├── *.png                     # Copied icons
│   └── manifest.json             # Copied manifest
├── scripts/
│   └── copy-assets.js            # Build script for copying assets
├── package.json                  # Dependencies and scripts
├── tsconfig.json                 # TypeScript configuration
└── README.md                     # This file
```

## Development

### Prerequisites

- Node.js v14 or higher
- npm or yarn
- Chrome/Chromium browser

### Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd AutoTabSwitcher
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the extension**
   ```bash
   npm run build
   ```

### Build Scripts

- **`npm run build`** - Clean, compile TypeScript, and copy assets to dist/
- **`npm run watch`** - Watch mode for development (auto-recompile on changes)
- **`npm run clean`** - Remove the dist/ directory (cross-platform using rimraf)
- **`npm run build:ts`** - Compile TypeScript only
- **`npm run build:assets`** - Copy static assets only

**Note**: All build scripts are cross-platform compatible (Windows, macOS, Linux). We use `rimraf` for cross-platform file deletion instead of platform-specific commands.

### Development Workflow

1. **Make changes** to TypeScript files in `src/`
2. **Run build** with `npm run build`
3. **Reload extension** in Chrome (or use watch mode)

For active development, use watch mode:
```bash
npm run watch
```

This will automatically recompile TypeScript files when you save changes.

## Installation

### From Source

1. **Build the project**
   ```bash
   npm install
   npm run build
   ```

2. **Load in Chrome**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the `dist/` directory from this project

3. **Verify installation**
   - You should see the Auto Tab Switcher icon in your toolbar
   - The badge should show "OFF" by default

## Usage

### Basic Usage

1. **Open the popup**
   - Click the extension icon in your toolbar

2. **Configure settings**
   - Set your desired delay time in seconds (60-3600)
   - Toggle the "Enabled" checkbox to start/stop
   - Click "Save" to apply changes

3. **Monitor status**
   - Badge shows "ON" (green) when active
   - Badge shows "OFF" (gray) when inactive

### Settings

- **Delay Time**: Time between tab switches (1 minute to 1 hour)
- **Enabled**: Master toggle for the auto-switcher

**Note**: The minimum delay of 1 minute (60 seconds) is enforced by Chrome's alarms API for unpacked extensions. This ensures reliable periodic execution in Manifest V3 service workers.

Settings are automatically persisted and will be restored when you restart Chrome.

## Technical Details

### Bugs Fixed from JavaScript Version

This TypeScript rewrite fixed the following issues:

1. **Service Worker State Management** (Critical)
   - **Issue**: Used module-level variables that would be lost when service worker terminates
   - **Fix**: Migrated to chrome.storage.local for all state persistence

2. **Unreliable Timing** (Critical)
   - **Issue**: Used setInterval which is unreliable in Manifest V3 service workers
   - **Fix**: Migrated to chrome.alarms API for guaranteed periodic execution

3. **Scope Issues**
   - **Issue**: Variables and functions trapped in storage.get callback
   - **Fix**: Proper async/await architecture with module-level organization

4. **Empty Catch Block**
   - **Issue**: Incorrect catch syntax with no error handling
   - **Fix**: Proper try/catch with error logging

5. **Type Safety**
   - **Issue**: No type checking, potential runtime errors
   - **Fix**: Comprehensive TypeScript types throughout

### TypeScript Configuration

The project uses strict TypeScript configuration for maximum type safety:

- Strict null checks
- No implicit any
- No unused locals or parameters
- No implicit returns
- Unchecked indexed access protection
- Source maps for debugging

### Chrome Extension Permissions

- **`tabs`**: Query and update tabs
- **`activeTab`**: Access currently active tab
- **`storage`**: Persist settings
- **`alarms`**: Periodic tab switching (Manifest V3)

## Browser Compatibility

- Chrome 93+ (Manifest V3 support)
- Chromium-based browsers (Edge, Brave, etc.)

## Performance Considerations

- Service worker wakes only when needed (alarms, storage changes)
- Minimal memory footprint (no persistent background page)
- All operations are asynchronous and non-blocking
- Efficient tab queries scoped to current window only

## Troubleshooting

### Extension not switching tabs

1. Check that the extension is enabled (badge shows "ON")
2. Verify you have multiple tabs open
3. Check the service worker console for errors:
   - Go to `chrome://extensions/`
   - Click "Service worker" under Auto Tab Switcher
   - Look for errors in the console

### Settings not saving

1. Check chrome.storage permissions in manifest
2. Verify the service worker is running
3. Check for errors in the popup console (F12 on popup)

### Build errors

1. Ensure you have the correct Node.js version (14+)
2. Delete `node_modules/` and reinstall: `npm install`
3. Clear TypeScript cache: `npm run clean && npm run build`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Build and test thoroughly
5. Submit a pull request

### Code Style

- Use TypeScript strict mode
- Follow async/await patterns
- Add JSDoc comments for public functions
- Use meaningful variable names
- Handle all error cases

## License

MIT License - see LICENSE file for details

## Changelog

### Version 1.0.0

- Initial TypeScript release
- Manifest V3 compliance
- chrome.alarms API integration
- Proper service worker architecture
- Comprehensive error handling
- Full type safety
- Badge color indicators
- Input validation
- Build pipeline with asset copying

## Credits

Developed with ❤️ using TypeScript and Chrome Extension APIs
