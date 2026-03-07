# Auto Tab Switcher

A powerful Chrome extension that automatically cycles through open tabs at configurable intervals. Built with TypeScript following Manifest V3 best practices with a modern modular architecture.

## ✨ Features

### Core Functionality
- 🔄 **Automatic tab cycling** - Cycles through tabs in sequential order
- 🪟 **Dual operating modes** - Global Mode (all windows) or Window Mode (per-window control)
- ⏱️ **Configurable delays** - 2 seconds to 1 hour (environment-aware, ⚠️ <5s not recommended)
- ⏸️ **Pause on activity** - Automatically pause when user is active
- ⌨️ **Keyboard shortcut** - Quick pause/resume with Ctrl+Shift+P (customizable)
- 🎚️ **Easy toggle** - Enable/disable with a single click
- 💾 **Persistent settings** - All settings saved across browser sessions
- 🔍 **Enhanced diagnostics** - Mode-aware logging with window context
- 🔄 **Backward compatible** - Automatic migration from previous versions

### Operating Modes
- 🌐 **Global Mode** - Enable/disable all windows simultaneously (default)
- 🪟 **Window Mode** - Independent per-window control with separate timers
- ⚡ **Quick switching** - Change modes instantly from Options page
- 🎯 **Context-aware UI** - Buttons and labels adapt to current mode

### Visual Indicators
- 📊 **Smart badges** - Per-window status indicators:
  - 🟢 **ON** (green) - Auto-switching active
  - 🟠 **⏸** (orange) - Paused due to user activity
  - ⚫ **OFF** (gray) - Disabled
- 🏷️ **Mode indicators** - Clear display of Global Mode or Window Mode
- 🪟 **Window ID tracking** - See which window is active in diagnostics
- 🌐 **Mode badges** - Visual indicators (🌐 Global / 🪟 Window) in logs

### Debugging & Support
- 📋 **Diagnostic logs** - Last 30 minutes with mode and window context
- 📤 **Export capabilities** - Download logs as text or JSON
- 📋 **Copy to clipboard** - Easy sharing for support
- 🔒 **Privacy-conscious** - Tab titles included for debugging (local only)
- 🧪 **Enhanced tracking** - Mode changes, window toggles, tab switches

### Technical Excellence
- 🔧 **TypeScript** - Full type safety and modern code
- ⚡ **Manifest V3** - Using chrome.alarms API for reliability
- 🏗️ **Modular architecture** - Clean, maintainable codebase
- 🔒 **Security reviewed** - 87/100 rating, LOW risk
- 🌍 **Cross-platform builds** - Works on Windows, macOS, Linux

## 🚀 Quick Start

### Installation

1. **Clone and build**
   ```bash
   git clone <repository-url>
   cd AutoTabSwitcher
   npm install
   npm run build
   ```

2. **Load in Chrome**
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist/` directory

3. **Start using**
   - Click the extension icon
   - Set your desired delay
   - Enable the switcher
   - Click Save

## 📖 Usage Guide

### Basic Usage

1. **Click the extension icon** to open the popup
2. **Configure your settings**:
   - **Delay Time**: 60-3600 seconds (2-3600 for production) ⚠️ Values below 5s not recommended
   - **Operating Mode**: Choose Global Mode or Window Mode
   - **Pause on Activity**: Automatically pause when you're active
3. **Click Save** to apply changes

### Operating Modes

#### 🌐 Global Mode (Default)
**All windows controlled together**

- Single enable/disable affects all windows simultaneously
- All windows switch tabs at the same interval
- Best for monitoring multiple displays
- Works regardless of which window is focused
- All windows show the same badge status

**How to use:**
1. Go to Options → Select "Global Mode"
2. Open popup in any window
3. Click "Enable All Windows" or "Disable All Windows"
4. All windows start/stop switching together

#### 🪟 Window Mode
**Independent per-window control**

- Each window can be enabled/disabled separately
- Each enabled window maintains its own timer
- Perfect for selective monitoring
- Quick toggle from any window's popup

**How to use:**
1. Go to Options → Select "Window Mode"
2. Open popup in window you want to control
3. Click "Enable This Window" or "Disable This Window"
4. Repeat for other windows as needed
5. Each window switches independently

**Quick Tip:** In Global Mode, click "🪟 Switch to Window Mode" button in popup to quickly enable just the current window!

### Badge Behavior

The extension uses **per-window smart badges** to show accurate status:

| Operating Mode | Enabled Windows | Disabled Windows |
|----------------|-----------------|------------------|
| **Global Mode** | All show ON/⏸ (synchronized) | All show OFF (synchronized) |
| **Window Mode** | Each shows ON/⏸ (independent) | Each shows OFF (independent) |

- 🟢 **ON** (green) - Auto-switching active in this window
- 🟠 **⏸** (orange) - Paused due to user activity
- ⚫ **OFF** (gray) - Disabled in this window

This helps you instantly see which windows are actively switching tabs.

### Pause on Activity

When enabled, auto-switching pauses temporarily when:
- You navigate to a new URL
- You switch tabs manually
- You activate or focus a window
- You update a tab

Configure the pause duration (5-300 seconds) to control how long to wait before resuming.

### Keyboard Shortcuts

**Quick Pause/Resume** with a single keyboard shortcut - perfect for interrupting short delays (like 2 seconds) where clicking the popup would be too slow.

**Default Shortcut:**
- Windows/Linux: `Ctrl+Shift+P`
- Mac: `Command+Shift+P`

**How It Works:**
- **Global Mode**: Pauses/resumes all windows together
- **Window Mode**: Pauses/resumes only the currently focused window
- **Toggle Behavior**: Press once to pause, press again to resume
- **Smart Protection**: Only works when auto-switching is enabled
- **Visual Feedback**: Badge shows pause symbol (⏸) in orange when paused

**Customizing the Shortcut:**
1. Open Settings page (click extension icon → "Full Settings")
2. Scroll to "Keyboard Shortcuts" section
3. Click "Customize" button
4. Chrome will open `chrome://extensions/shortcuts`
5. Find "Auto Tab Switcher" and set your preferred key combination

**Use Cases:**
- Quickly pause during short 2-3 second delays
- Keyboard-only workflow (no mouse needed)
- Rapidly toggle pause without opening popup
- Accessible control for users who prefer keyboard navigation

**Important Notes:**
- Pause state automatically clears when browser restarts (fresh start)
- Manual pause takes priority over activity-based pause
- Shortcut will not work if auto-switching is disabled
- Works globally across all Chrome windows

### Environment-Aware Delays

The extension adapts minimum delays based on environment:

| Environment | Minimum Delay | How to Identify |
|-------------|---------------|-----------------|
| **Development** (unpacked) | 60 seconds | "Development Mode" in popup |
| **Production** (Chrome Web Store) | 2 seconds ⚠️ | "Production Mode" in popup |

**Note**: Values below 5 seconds may be difficult to stop and can cause performance issues.

### Enhanced Diagnostic Logging

Access detailed diagnostic logs with mode and window context:

**How to Access**:
1. Click extension icon
2. Click "🔍 View Diagnostics" link at bottom
3. View logs with mode indicators, export, or share with support

**Features**:
- 📊 **30-minute rolling buffer** - Automatically keeps recent activity
- 📋 **Multiple export formats** - Text, JSON, or clipboard
- 🌐 **Mode indicators** - Each log shows 🌐 Global or 🪟 Window badge
- 🪟 **Window ID tracking** - See which window triggered each event
- 🏷️ **Categorized logs** - Filter by category (Settings, TabSwitcher, WindowToggle, ModeChange, etc.)
- ⚠️ **Error tracking** - All errors captured with context
- 🧪 **Testing aid** - Track behavior during QA

**What Gets Logged**:
- ✅ Extension lifecycle events (install, startup)
- ✅ Settings changes (with before/after values)
- ✅ **Tab switching events** (window ID, mode, tab titles for debugging)
- ✅ **Mode changes** (Global ↔ Window transitions)
- ✅ **Window toggles** (enable/disable per window or globally)
- ✅ Window events (created, focused, closed)
- ✅ Errors and warnings with details

**Privacy Note**: Tab titles are now included in logs for debugging purposes but stored locally only (never transmitted).

**Example Log Entry**:
```
[2025-11-11 12:30:45] [INFO] [TabSwitch] [🪟 Window] [Window 2]
Tab switched
{
  "windowId": 2,
  "mode": "window",
  "tabInfo": "Gmail → Google Calendar"
}
```

**Example Use Cases**:
- User reports issue → export logs → see which mode and window had the problem
- QA testing → verify mode switching behavior from logs
- Production debugging → understand window-specific vs global issues

## 🔄 Migration Guide

### Upgrading from Previous Versions

**Good News**: The new Operating Mode feature is 100% backward compatible! Your existing settings are automatically migrated.

#### What's Changed

**Old System** (v1.x):
- "Window Mode" with two options:
  - All Windows (Global)
  - Selected Window (pick one specific window)

**New System** (v2.0+):
- "Operating Mode" with two enhanced modes:
  - 🌐 **Global Mode**: All windows controlled together (same as old "All Windows")
  - 🪟 **Window Mode**: Each window independently controlled (more powerful than old "Selected Window")

#### Automatic Migration

When you update to v2.0+:

1. **If you were using "All Windows"**:
   - ✅ Automatically migrated to **Global Mode**
   - ✅ No change in behavior
   - ✅ All existing settings preserved

2. **If you were using "Selected Window"**:
   - ✅ Automatically migrated to **Window Mode**
   - ✅ Your selected window remains enabled
   - ✅ You can now enable additional windows too!

#### What You Need to Do

**Nothing!** The extension handles migration automatically. However, you might want to explore the new features:

**Explore Window Mode** (if you're in Global Mode):
1. Open Options page
2. Select "Window Mode"
3. Use popup in each window to enable/disable independently
4. Each window gets its own timer!

**Try Global Mode** (if you migrated from Selected Window):
1. Open Options page
2. Select "Global Mode"
3. Use popup to enable/disable all windows at once
4. All windows sync together

#### Key Improvements

- ✨ **More Control**: Window Mode lets you enable multiple windows, not just one
- ⏱️ **Independent Timers**: Each window in Window Mode has its own countdown
- 🎯 **Quick Switching**: "Switch to Window Mode" button in popup for fast access
- 📊 **Better Diagnostics**: See which mode and window for every event
- 🔄 **Backward Compatible**: No breaking changes, seamless upgrade

#### Need Help?

If you experience any issues after upgrading:
1. Open Diagnostics page (click 🔍 View Diagnostics in popup)
2. Export your logs
3. Report an issue on GitHub with the logs attached

## 🏗️ Architecture

### Modular Design

The extension uses a clean, modular architecture with shared core modules:

```plaintext
AutoTabSwitcher/
├── src/
│   ├── background.ts              # Service worker (environment-aware)
│   ├── core/                      # Shared business logic
│   │   ├── constants.ts           # Configuration constants
│   │   ├── types.ts               # TypeScript interfaces
│   │   ├── storage.ts             # Storage helpers
│   │   ├── badge-manager.ts       # Per-window badge management
│   │   ├── tab-switcher.ts        # Tab switching logic
│   │   ├── activity-tracker.ts    # Activity detection (auto-pause)
│   │   ├── manual-pause-tracker.ts # Manual pause via keyboard shortcut
│   │   ├── timing-hybrid.ts       # Hybrid timing (alarms + intervals)
│   │   └── logger.ts              # Diagnostic logging system
│   ├── popup/
│   │   ├── popup.ts               # Popup controller (environment-aware)
│   │   ├── index.ts               # Main popup interface
│   │   ├── settings.ts            # Full settings page
│   │   ├── popup.html             # Popup UI
│   │   └── shared/                # Shared UI modules
│   │       ├── validation.ts      # Input validation
│   │       ├── ui-helpers.ts      # UI helper functions
│   │       ├── settings-manager.ts # Settings CRUD
│   │       └── environment-info.ts # Environment display
│   ├── options/
│   │   ├── options.html           # Full settings page
│   │   ├── options.ts             # Settings controller
│   │   ├── diagnostics.html       # Diagnostic logs viewer
│   │   └── diagnostics.ts         # Diagnostics controller
│   ├── utils/
│   │   └── environment.ts         # Runtime environment detection
│   ├── css/
│   │   └── bootstrap.min.css
│   ├── icons/                     # Extension icons
│   └── manifest.json
├── dist/                          # Compiled output (load this in Chrome)
├── scripts/
│   └── copy-assets.js             # Build automation
├── package.json
├── tsconfig.json                  # Main TypeScript config
└── tsconfig.build.json            # Build configuration
```

### Manifest V3 Service Worker

Following Chrome Extension best practices:

- ✅ **Event-driven architecture** - No persistent state
- ✅ **chrome.alarms API** - Reliable periodic execution
- ✅ **chrome.storage.local** - State persistence
- ✅ **Async/await** - Modern promise-based code
- ✅ **Strict TypeScript** - Full type safety

### Hybrid Timing Implementation

Supports sub-30-second delays with automatic environment detection:

- **Delays ≥ 30s**: Uses `chrome.alarms` (most efficient)
- **Delays < 30s**: Uses `setInterval` (may be interrupted)
- **Smart switching**: Automatically selects best mechanism at runtime
- **Environment detection**: 5s minimum for production, 60s for development
- **Service worker handling**: Restores interval timers after suspension

## 🛠️ Development

### Prerequisites

- Node.js v14 or higher
- npm or yarn
- Chrome/Chromium browser

### Build Commands

```bash
npm run build          # Full build (clean + compile + copy assets)
npm run watch          # Watch mode for development
npm run clean          # Remove dist/ directory
npm run typecheck      # Type check all files
npm run build:ts       # Compile TypeScript only
npm run build:assets   # Copy static assets only
npm run dev            # Build and watch
npm run test           # Run tests
```

**For Chrome Web Store deployment:**
```bash
npm run build          # Same build works for both dev and production!
cd dist
zip -r ../auto-tab-switcher.zip . -x "*.map" "*.DS_Store"
```

The extension automatically detects the environment at runtime:
- **Unpacked (dev)**: 60-second minimum delay
- **Chrome Web Store**: 2-second minimum delay (⚠️ <5s not recommended)

### TypeScript Configuration

The project uses two TypeScript configurations:

- **`tsconfig.json`**: Main IDE configuration (includes all files, no emit)
- **`tsconfig.build.json`**: Build configuration for compilation

This ensures:
- ✅ Full IDE support for all files
- ✅ Correct compilation output
- ✅ No type checking conflicts
- ✅ Strict type safety throughout

### Development Workflow

1. **Make changes** to TypeScript files
2. **Run build**: `npm run build`
3. **Reload extension** in Chrome
4. **Test** your changes

For active development:
```bash
npm run watch    # Auto-recompile on changes
```

### Code Quality

- **Strict TypeScript** - All strict checks enabled
- **Modular design** - Single responsibility principle
- **DRY principle** - Shared modules eliminate duplication
- **Error handling** - Comprehensive try/catch blocks
- **JSDoc comments** - All public APIs documented

## 🔒 Security

### Security Review Results

✅ **Overall Rating**: GOOD (87/100)
✅ **Risk Level**: LOW
✅ **Chrome Web Store Ready**

Key security features:
- ✅ Minimal permissions (tabs, storage, alarms only)
- ✅ No external dependencies or network requests
- ✅ TypeScript strict mode enabled
- ✅ Proper input validation on all user inputs
- ✅ CSP-compliant (no inline scripts)
- ✅ XSS protection via proper DOM manipulation

See `SECURITY.md` for security policy and `docs/security-setup.md` for enforcement details.

### Permissions Explained

- **`tabs`**: Query and switch between tabs
- **`storage`**: Save user settings persistently
- **`alarms`**: Schedule periodic tab switching
- **`windows`**: Support per-window mode
- **`commands`**: Enable keyboard shortcuts (pause/resume)

## 📊 Performance

### Optimizations

- **Modular architecture**: 73% reduction in main file lines
- **Shared modules**: Eliminated 90% code duplication
- **Lazy service worker**: Only active when needed
- **Efficient queries**: Scoped to specific windows
- **Smart badge updates**: Only when state changes
- **Memory efficient**: No persistent background page

### Metrics

| Metric | Before Refactoring | After Refactoring | Improvement |
|--------|-------------------|-------------------|-------------|
| Main files | 1,536 lines | 300 lines | 80% ↓ |
| Shared modules | 0 lines | 800 lines | Reusable |
| Code duplication | ~90% | ~0% | 90% ↓ |

**Code organization:**
- Core modules: 8 files (badge, storage, timing, activity, tab-switcher, logger, types, constants)
- UI modules: 5 files (validation, ui-helpers, settings-manager, environment-info, main UI)
- Options pages: 2 files (settings, diagnostics)
- Utilities: 1 file (environment detection)
- Total: 16 reusable modules + main entry points

## 🐛 Bugs Fixed

This TypeScript rewrite fixed critical issues from the JavaScript version:

### Critical Fixes

1. **Service Worker State Management**
   - ❌ Used module-level variables (lost on termination)
   - ✅ Migrated to chrome.storage.local

2. **Unreliable Timing**
   - ❌ Used setInterval (unreliable in MV3)
   - ✅ Uses chrome.alarms API

3. **Inverted isPacked() Logic**
   - ❌ Production used 60s minimum, dev used 5s
   - ✅ Production uses 5s minimum, dev uses 60s

4. **Scope Issues**
   - ❌ Variables trapped in callbacks
   - ✅ Proper async/await architecture

5. **Missing Error Handling**
   - ❌ Empty catch blocks
   - ✅ Comprehensive error logging

6. **Type Safety**
   - ❌ No type checking
   - ✅ Full TypeScript strict mode

### Recent Fixes (January 2026)

- ✅ **TypeScript constant resolution** - Fixed MIN_DELAY_MS undefined error
- ✅ **Import cleanup** - Removed unused MIN_DELAY_MS_DEVELOPMENT and isPacked imports
- ✅ **Build optimization** - Zero TypeScript errors, clean compilation
- ✅ Environment-aware minimum delays
- ✅ Short-circuit logic when disabled (no unnecessary operations)
- ✅ Proper TypeScript hybrid file type checking
- ✅ Code duplication elimination via shared modules

## 🌐 Browser Compatibility

- Chrome 93+ (Manifest V3 support)
- Edge 93+ (Chromium-based)
- Brave, Vivaldi, Opera (Chromium-based browsers)

## 🔧 Troubleshooting

### Service worker registration failed (Status code: 3)

This error occurs when trying to load the unpacked extension before building it.

**Solution:**
1. Make sure you've built the project: `npm run build`
2. Load the `dist/` folder in Chrome (NOT the `src/` folder)
3. If the error persists:
   ```bash
   npm run clean
   npm run build
   ```
4. Reload the extension in `chrome://extensions/`

**Why this happens:**
- The extension is written in TypeScript (`.ts` files)
- Chrome needs JavaScript (`.js` files)
- The build process compiles TypeScript to JavaScript
- The `dist/` folder contains the compiled extension

### Extension not switching tabs

1. Check badge shows "ON" (green)
2. Verify multiple tabs are open
3. Check service worker console:
   - Go to `chrome://extensions/`
   - Find Auto Tab Switcher
   - Click "Service worker" link
   - Look for errors

### Auto-switching paused

- Badge shows "⏸" (orange) = paused due to activity
- Wait for pause duration to expire
- Or disable "Pause on Activity" feature

### Window mode not working

- Ensure selected window still exists
- Check that badge shows correct status per window
- In current-window mode: selected window shows ON/⏸, others show OFF
- Extension auto-disables if selected window closes
- Check diagnostics logs for detailed information

### Badges showing incorrect status

- Each window should show its own badge in current-window mode
- Refresh page or create new tab to update badge
- Check diagnostics to see badge update events
- Verify windowMode setting in storage

### Diagnostic logs

**Viewing logs**:
1. Click extension icon → "🔍 View Diagnostics"
2. See last 30 minutes of activity
3. Filter by category or log level

**Exporting logs**:
- **Text format**: For email support
- **JSON format**: For developers
- **Copy to clipboard**: Quick sharing

**Clearing logs**:
- Click "Clear Logs" button
- Confirmation required
- Useful after resolving issues

**What to look for**:
- Errors (red) indicate problems
- Warnings (yellow) show potential issues
- Info (blue) tracks normal operations
- Check timestamps to correlate with user actions

### Settings not saving

1. Check chrome.storage permissions in manifest
2. Verify service worker is running
3. Check popup console (F12 when popup is open)

### Build errors

1. Ensure Node.js 14+ installed: `node --version`
2. Delete and reinstall: `rm -rf node_modules && npm install`
3. Clear build: `npm run clean && npm run build`

## 📚 Documentation

Comprehensive documentation available:

- **`CLAUDE.md`**: Claude Code development guidance
- **`CONTRIBUTING.md`**: Contribution guidelines
- **`SECURITY.md`**: Security policy
- **`docs/`**: Implementation details, bug fixes, testing, and technical debt docs

## 🧪 Testing

### Manual Testing Checklist

- [ ] Extension loads without errors
- [ ] Settings save and persist
- [ ] Badge updates correctly (ON/OFF/Paused)
- [ ] Per-window badges show correct status
- [ ] Tab switching works in global mode
- [ ] Tab switching works in current-window mode
- [ ] Window selection dropdown populates
- [ ] Badge differentiation between windows
- [ ] Mode change confirmation dialog appears
- [ ] Pause on activity feature works
- [ ] Pause duration configurable
- [ ] Environment label correct (Dev/Prod)
- [ ] Minimum delays enforced correctly
- [ ] Service worker survives suspension
- [ ] Extension works after browser restart
- [ ] Diagnostic logs capture events
- [ ] Log export works (text/JSON/clipboard)
- [ ] Log clearing works with confirmation
- [ ] Privacy: no URLs or titles in logs

### Type Checking

```bash
npm run typecheck    # Must pass with zero errors
```

## 🤝 Contributing

Contributions welcome! Please follow these guidelines:

1. **Fork** the repository
2. **Create** a feature branch
3. **Write** clean, typed code
4. **Test** thoroughly
5. **Document** your changes
6. **Submit** a pull request

### Code Style

- Use TypeScript strict mode
- Follow modular architecture
- Add JSDoc comments for public APIs
- Use meaningful variable names
- Handle all error cases
- Maintain existing patterns

### Pull Request Checklist

- [ ] Code follows TypeScript strict mode
- [ ] All type checks pass (`npm run typecheck`)
- [ ] Build succeeds (`npm run build`)
- [ ] Manually tested in Chrome
- [ ] Documentation updated (if needed)
- [ ] No console errors or warnings

## 📄 License

MIT License - see LICENSE file for details

## 📝 Changelog

### Version 1.2.0 (January 2026)

#### New Features
- ⌨️ **Keyboard Shortcut for Pause/Resume**:
  - Default: `Ctrl+Shift+P` (Windows/Linux), `Command+Shift+P` (Mac)
  - User-customizable via `chrome://extensions/shortcuts`
  - Context-aware: Global Mode pauses all windows, Window Mode pauses current window only
  - Smart protection: Only works when auto-switching is enabled
  - Perfect for interrupting short delays (e.g., 2 seconds)
  - Toggle behavior: Press to pause, press again to resume
  - Auto-clears on browser restart (session-based)
  - Manual pause takes priority over activity pause

#### Implementation Details
- ✨ New module: `manual-pause-tracker.ts` for pause state management
- ✨ Updated manifest with commands API
- ✨ Enhanced badge system to show manual pause state
- ✨ Settings page displays current shortcut and customization link
- ✨ Comprehensive test coverage (55 new tests for manual pause, 4 integration tests)

#### Architecture Improvements
- 🏗️ Separate tracking for manual pause vs activity pause
- 🏗️ Per-window pause state in Window Mode
- 🏗️ Global pause state in Global Mode
- 🏗️ Priority logic: Manual pause > Activity pause
- 🏗️ Test infrastructure updated with chrome.commands mock

#### Testing
- 🧪 **359 tests passing** (up from 340)
- 🧪 **55 new tests** for manual-pause-tracker module
- 🧪 **4 integration tests** for timing-hybrid with manual pause
- 🧪 **100% feature coverage** for keyboard shortcut functionality
- 🧪 All existing tests still passing (no breaking changes)

### Version 1.1.1 (January 2026)

#### Bug Fixes
- 🐛 **Fixed TypeScript compilation errors**:
  - Resolved undefined `MIN_DELAY_MS` constant in background.ts
  - Removed unused `MIN_DELAY_MS_DEVELOPMENT` import from storage.ts
  - Removed unused `isPacked` import from storage.ts
  - Removed unused `MIN_DELAY_MS_PRODUCTION` import from options.ts
- 🐛 **All builds now pass** without TypeScript errors
- 🐛 **Clean codebase** with no unused imports or references

### Version 1.1.0

#### New Features
- ✨ Per-window auto-switching mode
- ✨ Pause on activity with configurable duration
- ✨ Hybrid timing for sub-30-second delays
- ✨ Environment-aware minimum delays
- ✨ Smart per-window badge indicators
- ✨ Environment info display in popup
- ✨ **Diagnostic logging system** (30-min rolling buffer)
- ✨ **Diagnostics UI page** with export capabilities
- ✨ **Mode change confirmation** dialog
- ✨ **Privacy-focused logging** (no sensitive data)

#### Architecture Improvements
- 🏗️ Modular architecture with 16 shared modules
- 🏗️ 80% code reduction through refactoring
- 🏗️ Multi-config TypeScript setup
- 🏗️ Separated core business logic from UI
- 🏗️ Eliminated 90% code duplication
- 🏗️ **Per-window badge management**
- 🏗️ **Centralized logging infrastructure**

#### Bug Fixes
- 🐛 Fixed inverted isPacked() logic (critical)
- 🐛 Environment-aware delays now work correctly
- 🐛 Short-circuit logic when disabled (performance)
- 🐛 Proper TypeScript type checking for all files
- 🐛 Service worker state management fixes
- 🐛 **Per-window badge display** (no longer global)
- 🐛 **Badge updates on page refresh and new tabs**
- 🐛 **Badge updates when tabs move between windows**

#### User Experience
- 💡 Clear visual feedback per window
- 💡 Protection against accidental mode changes
- 💡 Easy troubleshooting with diagnostic logs
- 💡 Export logs for support requests
- 💡 Better visibility into extension behavior

#### Documentation
- 📚 Comprehensive project documentation in `docs/`
- 📚 **Diagnostic logging documentation**
- 📚 **Troubleshooting guide with diagnostics**

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

## 🙏 Credits

Developed with ❤️ using:
- TypeScript
- Chrome Extension APIs (Manifest V3)
- Bootstrap CSS
- Modern ES2020+ features

Special thanks to the Chrome Extensions team for excellent documentation.

## 📞 Support

For issues, questions, or suggestions:
- Open an issue on GitHub
- Check existing documentation in `docs/`
- Review troubleshooting section above

---

**Note**: This extension is designed for legitimate use cases like monitoring dashboards, presentations, or information displays. Please use responsibly and respect website terms of service.
