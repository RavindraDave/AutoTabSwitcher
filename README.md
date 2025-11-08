# Auto Tab Switcher

A powerful Chrome extension that automatically cycles through open tabs at configurable intervals. Built with TypeScript following Manifest V3 best practices with a modern modular architecture.

## ✨ Features

### Core Functionality
- 🔄 **Automatic tab cycling** - Cycles through tabs in sequential order
- 🪟 **Per-window mode** - Switch tabs globally or in specific window
- ⏱️ **Configurable delays** - 5 seconds to 1 hour (environment-aware)
- ⏸️ **Pause on activity** - Automatically pause when user is active
- 🎚️ **Easy toggle** - Enable/disable with a single click
- 💾 **Persistent settings** - All settings saved across browser sessions

### Visual Indicators
- 📊 **Smart badge** - Shows status with color coding:
  - 🟢 **ON** (green) - Auto-switching active
  - 🟠 **⏸** (orange) - Paused due to user activity
  - ⚫ **OFF** (gray) - Disabled
- 🏷️ **Environment labels** - Shows "Production" or "Development" mode

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
   - **Delay Time**: 60-3600 seconds (5-3600 for production)
   - **Enabled**: Toggle auto-switching on/off
   - **Window Mode**: Choose global or current-window switching
   - **Pause on Activity**: Automatically pause when you're active
3. **Click Save** to apply changes

### Window Modes

#### Global Mode (Default)
- Switches through all tabs across all windows
- Best for monitoring multiple displays
- Works regardless of which window is focused

#### Current Window Mode
- Only switches tabs in the selected window
- Choose which window to monitor
- Window selection dropdown appears when enabled
- Automatically disables if window is closed

### Pause on Activity

When enabled, auto-switching pauses temporarily when:
- You navigate to a new URL
- You switch tabs manually
- You activate or focus a window
- You update a tab

Configure the pause duration (5-300 seconds) to control how long to wait before resuming.

### Environment-Aware Delays

The extension adapts minimum delays based on environment:

| Environment | Minimum Delay | How to Identify |
|-------------|---------------|-----------------|
| **Development** (unpacked) | 60 seconds | "Development Mode" in popup |
| **Production** (Chrome Web Store) | 5 seconds | "Production Mode" in popup |

## 🏗️ Architecture

### Modular Design

The extension uses a clean, modular architecture with shared core modules:

```plaintext
AutoTabSwitcher/
├── src/
│   ├── background.ts              # Service worker coordinator
│   ├── background-hybrid.ts       # Hybrid timing version
│   ├── core/                      # Shared business logic
│   │   ├── constants.ts           # Configuration constants
│   │   ├── types.ts               # TypeScript interfaces
│   │   ├── storage.ts             # Storage helpers
│   │   ├── badge-manager.ts       # Badge state management
│   │   ├── tab-switcher.ts        # Tab switching logic
│   │   ├── activity-tracker.ts    # Activity detection
│   │   └── timing-hybrid.ts       # Hybrid timing (alarms + intervals)
│   ├── popup/
│   │   ├── popup.ts               # Popup controller
│   │   ├── popup-hybrid.ts        # Hybrid popup version
│   │   ├── popup.html             # Popup UI
│   │   └── shared/                # Shared UI modules
│   │       ├── validation.ts      # Input validation
│   │       ├── ui-helpers.ts      # UI helper functions
│   │       ├── settings-manager.ts # Settings CRUD
│   │       └── environment-info.ts # Environment display
│   ├── utils/
│   │   └── environment.ts         # Environment detection
│   ├── css/
│   │   └── bootstrap.min.css
│   ├── icons/                     # Extension icons
│   └── manifest.json
├── dist/                          # Compiled output
├── scripts/
│   └── copy-assets.js             # Build automation
├── docs/                          # Documentation
│   ├── claude.md                  # Development timeline
│   ├── REFACTORING.md             # Refactoring documentation
│   ├── SECURITY_REVIEW.md         # Security analysis
│   └── TYPESCRIPT_CONFIG.md       # TypeScript setup guide
├── package.json
├── tsconfig.json                  # Main TypeScript config
├── tsconfig.build.json            # Build configuration
└── tsconfig.hybrid.json           # Hybrid file type checking
```

### Manifest V3 Service Worker

Following Chrome Extension best practices:

- ✅ **Event-driven architecture** - No persistent state
- ✅ **chrome.alarms API** - Reliable periodic execution
- ✅ **chrome.storage.local** - State persistence
- ✅ **Async/await** - Modern promise-based code
- ✅ **Strict TypeScript** - Full type safety

### Hybrid Timing Implementation

For production deployments supporting sub-30-second delays:

- **Delays ≥ 30s**: Uses `chrome.alarms` (most efficient)
- **Delays < 30s**: Uses `setInterval` (may be interrupted)
- **Smart switching**: Automatically selects best mechanism
- **Service worker handling**: Restores interval timers after suspension

## 🛠️ Development

### Prerequisites

- Node.js v14 or higher
- npm or yarn
- Chrome/Chromium browser

### Build Commands

#### Development
```bash
npm run build          # Full build (clean + compile + copy assets)
npm run watch          # Watch mode for development
npm run clean          # Remove dist/ directory
npm run typecheck      # Type check all files (standard + hybrid)
npm run build:ts       # Compile TypeScript only
npm run build:assets   # Copy static assets only
```

#### Type Checking
```bash
npm run typecheck              # Check all files
npm run typecheck:standard     # Check standard files only
npm run typecheck:hybrid       # Check hybrid files only
```

#### Production (Chrome Web Store)
```bash
npm run build:prod     # Production build with hybrid timing
```

### TypeScript Configuration

The project uses multiple TypeScript configurations:

- **`tsconfig.json`**: Main IDE configuration (includes all files, no emit)
- **`tsconfig.build.json`**: Build configuration (excludes hybrid files)
- **`tsconfig.hybrid.json`**: Hybrid file type checking

This ensures:
- ✅ Full IDE support for all files
- ✅ Correct compilation output
- ✅ No type checking conflicts
- ✅ Separate validation of standard vs hybrid implementations

See `docs/TYPESCRIPT_CONFIG.md` for detailed explanation.

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

See `docs/SECURITY_REVIEW.md` for complete analysis.

### Permissions Explained

- **`tabs`**: Query and switch between tabs
- **`storage`**: Save user settings persistently
- **`alarms`**: Schedule periodic tab switching
- **`windows`**: Support per-window mode

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
| background.ts | 300 lines | 130 lines | 57% ↓ |
| background-hybrid.ts | 398 lines | 113 lines | 72% ↓ |
| popup.ts | 396 lines | 75 lines | 81% ↓ |
| popup-hybrid.ts | 442 lines | 92 lines | 79% ↓ |
| **Total** | **1,536 lines** | **410 lines** | **73% ↓** |

New shared modules: 12 files, ~800 lines of reusable code

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

### Recent Fixes

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
- Check window dropdown shows correct window
- Extension auto-disables if window closes

### Settings not saving

1. Check chrome.storage permissions in manifest
2. Verify service worker is running
3. Check popup console (F12 when popup is open)

### Build errors

1. Ensure Node.js 14+ installed: `node --version`
2. Delete and reinstall: `rm -rf node_modules && npm install`
3. Clear build: `npm run clean && npm run build`

## 📚 Documentation

Comprehensive documentation available in `docs/`:

- **`claude.md`**: Complete development timeline (6+ sessions)
- **`REFACTORING.md`**: Architecture and refactoring guide
- **`SECURITY_REVIEW.md`**: Security analysis and recommendations
- **`TYPESCRIPT_CONFIG.md`**: TypeScript configuration explained
- **`PRODUCTION-SETUP.md`**: Chrome Web Store deployment guide

## 🧪 Testing

### Manual Testing Checklist

- [ ] Extension loads without errors
- [ ] Settings save and persist
- [ ] Badge updates correctly (ON/OFF/Paused)
- [ ] Tab switching works in global mode
- [ ] Tab switching works in current-window mode
- [ ] Window selection dropdown populates
- [ ] Pause on activity feature works
- [ ] Pause duration configurable
- [ ] Environment label correct (Dev/Prod)
- [ ] Minimum delays enforced correctly
- [ ] Service worker survives suspension
- [ ] Extension works after browser restart

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

### Version 1.1.0 (Current)

#### New Features
- ✨ Per-window auto-switching mode
- ✨ Pause on activity with configurable duration
- ✨ Hybrid timing for sub-30-second delays
- ✨ Environment-aware minimum delays
- ✨ Smart badge with pause indicator
- ✨ Environment info display in popup

#### Architecture Improvements
- 🏗️ Modular architecture with 12 shared modules
- 🏗️ 73% code reduction through refactoring
- 🏗️ Multi-config TypeScript setup
- 🏗️ Separated core business logic from UI
- 🏗️ Eliminated 90% code duplication

#### Bug Fixes
- 🐛 Fixed inverted isPacked() logic (critical)
- 🐛 Environment-aware delays now work correctly
- 🐛 Short-circuit logic when disabled (performance)
- 🐛 Proper TypeScript type checking for all files
- 🐛 Service worker state management fixes

#### Documentation
- 📚 Complete development timeline (claude.md)
- 📚 Refactoring guide (REFACTORING.md)
- 📚 Security review (SECURITY_REVIEW.md)
- 📚 TypeScript configuration guide
- 📚 Comprehensive README update

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
