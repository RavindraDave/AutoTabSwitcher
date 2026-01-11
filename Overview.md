# Auto Tab Switcher - Chrome Web Store Overview

> **Official Chrome Web Store Listing**: https://chromewebstore.google.com/detail/auto-tab-switcher/mophipfldpoeeimgjfmcnidafjggmiko?hl=en

---

## Short Description (132 characters max)

Automatically switches to the next tab every few seconds

---

## Full Description

Transform your browser into a powerful automated display system with Auto Tab Switcher—trusted by professionals worldwide for monitoring dashboards, running presentations, and managing multi-screen information displays.

═══════════════════════════════════════════

### 🎯 PERFECT FOR

✓ Monitoring multiple dashboards (analytics, server status, sales metrics)
✓ Digital signage and information displays in offices or public spaces
✓ Presentations and demos that cycle through content automatically
✓ Security monitoring across multiple camera feeds or systems
✓ Trading floors displaying rotating market data and charts
✓ Reception areas showing company information, news, or announcements
✓ Multi-display setups requiring synchronized or independent control

═══════════════════════════════════════════

### 🎉 WHAT'S NEW IN VERSION 1.2.0

This update adds the most requested feature: keyboard shortcuts for instant pause/resume!

#### ✨ KEYBOARD SHORTCUT CONTROL
**⌨️ Instant Pause/Resume with a Keystroke**
- NEW keyboard shortcut: `Ctrl+Shift+P` (Windows/Linux) or `Command+Shift+P` (Mac)
- Perfect for interrupting short delays (2-3 seconds) where clicking would be too slow
- Context-aware: Global Mode pauses all windows, Window Mode pauses current window only
- Fully customizable via Chrome's keyboard shortcuts settings
- Smart protection: only works when auto-switching is enabled
- Toggle behavior: press once to pause, press again to resume
- Manual pause takes priority over activity-based pause

### PREVIOUS UPDATE - VERSION 1.1.0

Major feature release with powerful new capabilities and critical bug fixes!

#### ✨ NEW FEATURES

**🪟 Per-Window Control Mode**
- NEW Window Mode allows independent control of each browser window
- Enable auto-switching on specific windows while others stay manual
- Each window maintains its own separate timer and settings
- Perfect for multi-monitor setups with different rotation needs

**⏸️ Pause on Activity Detection**
- NEW intelligent activity detection automatically pauses tab switching
- Detects when you manually switch tabs, navigate URLs, or focus windows
- Configurable pause duration (5-300 seconds) to match your workflow
- Resumes automatically when you stop interacting—no manual restart needed

**🔍 Professional Diagnostics System**
- NEW dedicated diagnostics page with detailed activity logging
- 30-minute rolling buffer captures all extension events with timestamps
- Export logs as text, JSON, or copy to clipboard for support requests
- See exactly what the extension is doing with mode and window context
- Privacy-focused: all diagnostic data stays local, never transmitted

**🎓 Interactive Onboarding Tour**
- NEW 5-step guided tour for first-time users
- Visual demonstrations of Global Mode vs Window Mode
- Feature highlights and best practices
- Skip option for experienced users

#### 🐛 CRITICAL BUG FIXES

✅ **Timer Synchronization Issues - FIXED**
- Fixed timer animation not updating in real-time
- Resolved race conditions where tabs continued switching after disable
- Eliminated scenarios where countdown showed incorrect values
- Service worker suspension and recovery now handled correctly

✅ **Badge Display Problems - FIXED**
- Badges now correctly display per-window status instead of globally
- Status indicators properly refresh when creating new tabs
- Badge updates correctly when tabs move between windows
- Each window shows accurate state (ON/PAUSED/OFF)

✅ **Environment Detection - FIXED**
- Corrected critical inverted isPacked() logic bug
- Production builds now correctly allow 5-second minimum (was 60s)
- Development builds properly enforce 60-second minimum (was 5s)
- Environment-aware delays working as designed

✅ **Service Worker Reliability - FIXED**
- Improved state persistence across service worker suspensions
- Better handling of window closures in Window Mode
- Enhanced error handling and recovery throughout codebase
- Eliminated module-level state issues causing unreliable behavior

#### 💎 USER EXPERIENCE IMPROVEMENTS

- Modern UI with improved visual feedback and animations
- Real-time countdown with animated circular progress ring
- Clearer mode indicators (🌐 Global / 🪟 Window) throughout interface
- Better error messages and input validation with live feedback
- Enhanced settings page with mode preview visualization
- Custom confirmation modal for critical mode changes
- Quick mode switching from popup without opening settings

#### 🏗️ TECHNICAL IMPROVEMENTS

- Complete TypeScript rewrite with strict type checking
- 80% code reduction through modular architecture
- 90% reduction in code duplication via shared core modules
- Comprehensive test suite with 94 test cases
- Professional security review completed (87/100 rating)
- Improved performance and memory efficiency
- Separated core business logic from UI for maintainability

═══════════════════════════════════════════

### ⚡ KEY FEATURES

**🔄 FLEXIBLE OPERATING MODES**
- Global Mode - Control all windows simultaneously (perfect for synchronized displays)
- Window Mode - Independent per-window control with separate timers (ideal for multi-monitor setups)
- Switch between modes instantly based on your needs

**⏱️ PRECISION TIMING CONTROL**
- Configurable intervals from 5 seconds to 1 hour
- Reliable chrome.alarms API ensures consistent switching (even when browser is idle)
- Environment-aware delays for development vs. production use
- Hybrid timing system for both short (<30s) and long intervals

**⏸️ INTELLIGENT PAUSE SYSTEM**
- Automatically pause when you interact with tabs (prevents interruption during manual browsing)
- Configurable pause duration (5-300 seconds)
- Smart activity detection: tab switches, URL changes, window focus, tab updates
- Visual indicator (🟠 orange pause symbol) when paused

**⌨️ KEYBOARD SHORTCUT CONTROL**
- Instant pause/resume with `Ctrl+Shift+P` (Windows/Linux) or `Command+Shift+P` (Mac)
- Fully customizable via Chrome's keyboard shortcuts settings
- Perfect for quick interruptions without opening the popup
- Works keyboard-only for accessibility
- Context-aware (Global/Window mode behavior)
- Smart protection: only works when switching is enabled

**📊 VISUAL STATUS INDICATORS**
- Per-window badge system shows real-time status:
  - 🟢 Green "ON" = Active switching
  - 🟠 Orange "⏸" = Paused due to activity
  - ⚫ Gray "OFF" = Disabled
- Instant visibility into which windows are actively cycling
- Updates automatically on new tabs and page refreshes

**🔍 PROFESSIONAL DIAGNOSTICS**
- 30-minute rolling diagnostic logs for troubleshooting
- Export logs in text, JSON, or clipboard format
- Detailed event tracking with timestamps and window context
- Categories: Settings, TabSwitch, WindowToggle, ModeChange, Lifecycle
- Privacy-focused: all data stays local on your machine

**💾 PERSISTENT & RELIABLE**
- All settings saved automatically across browser sessions
- Survives browser restarts and updates
- Built on Manifest V3 best practices for long-term compatibility
- TypeScript-powered for reliability and performance
- Service worker resilience with automatic recovery

═══════════════════════════════════════════

### 🚀 QUICK START GUIDE

1. Install the extension (onboarding tour will guide you through features)
2. Click the extension icon in your toolbar
3. Choose your operating mode:
   - **Global Mode**: Enable/disable all windows together
   - **Window Mode**: Control each window independently
4. Set your preferred switching interval (5-3600 seconds)
5. Optional: Enable "Pause on Activity" to prevent interruptions during manual browsing
6. Click "Enable All Windows" (Global) or "Enable This Window" (Window Mode)
7. Watch the countdown timer—you're live!
8. **Bonus**: Use `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac) to quickly pause/resume without opening the popup

**Pro Tips**:
- Start with a 30-second interval and "Pause on Activity" enabled for the best experience
- Customize the keyboard shortcut in Settings → Keyboard Shortcuts section
- For very short delays (2-3 seconds), use the keyboard shortcut for instant pause control

═══════════════════════════════════════════

### 💡 USE CASE EXAMPLES

**📈 DASHBOARD MONITORING**
Rotate through analytics dashboards, server monitoring tools, and application health checks every 30 seconds for comprehensive visibility.
- **Mode**: Window Mode with different intervals per window
- **Interval**: 30-60 seconds
- **Pause on Activity**: Enabled

**🏢 OFFICE DIGITAL SIGNAGE**
Display rotating company announcements, metrics, and news on lobby screens with hour-long intervals for passive viewing.
- **Mode**: Global Mode for synchronized displays
- **Interval**: 30-60 minutes
- **Pause on Activity**: Disabled

**💼 TRADING & FINANCE**
Cycle through market data, portfolio dashboards, and news feeds with precision timing to stay informed without constant clicking.
- **Mode**: Window Mode (different intervals for different data types)
- **Interval**: 10-30 seconds
- **Pause on Activity**: Enabled

**🎓 PRESENTATIONS & DEMOS**
Automatically advance through slides, demo screens, or product showcases during presentations or trade shows.
- **Mode**: Global Mode for consistent presentation flow
- **Interval**: 15-45 seconds
- **Pause on Activity**: Disabled

**🔐 SECURITY OPERATIONS**
Monitor multiple security camera interfaces, system logs, or network dashboards across different tabs and windows.
- **Mode**: Window Mode (different monitoring intervals per security zone)
- **Interval**: 5-15 seconds
- **Pause on Activity**: Disabled

═══════════════════════════════════════════

### 🏆 WHY CHOOSE AUTO TAB SWITCHER?

✅ PROVEN RELIABILITY - Trusted by professionals across industries worldwide
✅ MODERN ARCHITECTURE - Built with TypeScript and Manifest V3 for future-proof performance
✅ ACTIVE DEVELOPMENT - Regular updates and feature improvements based on user feedback
✅ PRIVACY-FIRST - Zero data collection, no external servers, all processing local
✅ LIGHTWEIGHT - Minimal resource usage, won't slow down your browser
✅ SECURITY REVIEWED - 87/100 security rating, LOW risk assessment
✅ COMPREHENSIVE TESTING - 94 automated test cases ensure reliability
✅ PROFESSIONAL SUPPORT - Responsive support team and active maintenance
✅ COMMUNITY DRIVEN - Continuously improved based on real-world professional use cases

═══════════════════════════════════════════

### 🔒 PRIVACY & PERMISSIONS

We take your privacy seriously. Auto Tab Switcher:
- Never collects or transmits your browsing data
- Stores settings locally on your device only
- Requires minimal permissions (tabs, storage, alarms, windows)
- No analytics, tracking, or third-party services
- Open-source codebase available on GitHub for transparency
- Diagnostic logs never leave your device

**Required permissions explained:**
- **"tabs"** - To query and switch between your tabs
- **"storage"** - To save your preferences locally
- **"alarms"** - To schedule periodic tab switching reliably
- **"windows"** - To support per-window control mode

═══════════════════════════════════════════

### 🔧 TROUBLESHOOTING MADE EASY

Having issues? Use the new diagnostics system:

1. Click extension icon → "🔍 View Diagnostics"
2. Review the last 30 minutes of activity logs
3. Export logs as text or JSON for support requests
4. Copy to clipboard for easy sharing

Common issues and solutions are documented in the diagnostics page with helpful error messages and validation feedback.

═══════════════════════════════════════════

### 💎 PREMIUM FEATURES (COMING SOON)

Want advanced customization? Premium version will include:
- Custom tab sequences and rotation patterns
- Skip specific tabs or websites in rotation
- Different intervals for different window groups
- Audio/visual notifications on tab switches
- Advanced scheduling (business hours, weekday/weekend patterns)
- Tab grouping and categorization
- API integration for programmatic control
- Priority email support

Interested in early access or custom enterprise features?
Contact: ravindra@r2dsolutions.com

═══════════════════════════════════════════

### 📋 VERSION HISTORY

#### **Version 1.1.0** (Current - January 2026)
**Major Update - New Features & Critical Bug Fixes**

**New Features:**
- ✨ Per-window control mode with independent timers
- ✨ Pause on activity detection system
- ✨ Professional diagnostics and logging system
- ✨ Interactive onboarding tour for new users

**Bug Fixes:**
- 🐛 Critical timer synchronization fixes
- 🐛 Badge display issues resolved (per-window status)
- 🐛 Environment detection corrected (isPacked logic)
- 🐛 Service worker reliability improvements

**Improvements:**
- 💎 Complete UI/UX overhaul with modern design
- 🏗️ TypeScript rewrite with 80% code reduction
- 🔒 Security review completed (87/100 rating)
- ✅ 94 automated test cases added

---

#### **Version 1.0.0** (Initial Release)
**First Public Release**

**Core Features:**
- 🔄 Global mode auto-switching
- ⏱️ Configurable intervals (5-3600 seconds)
- 📊 Badge status indicators (ON/OFF)
- 💾 Persistent settings storage
- ⚡ Manifest V3 implementation

═══════════════════════════════════════════

### 🆘 SUPPORT & FEEDBACK

Need help or have suggestions?
- Use the diagnostic export feature to capture detailed logs
- Report issues or request features using review and bug report on chrome web store
- View comprehensive documentation on GitHub
- Contact us directly at ravindra@r2dsolutions.com

We actively monitor feedback and continuously improve based on user needs!

**Known Issues**: Please check the diagnostics page for troubleshooting common setup issues. The onboarding tour can be re-launched from settings if needed.

═══════════════════════════════════════════

### ⚖️ RESPONSIBLE USE

Auto Tab Switcher is designed for legitimate professional and personal use cases. Please:
- Respect website terms of service and rate limits
- Avoid using on sites that prohibit automated access
- Be mindful of server load when using very short intervals (<10 seconds)
- Ensure compliance with your organization's IT policies
- Test new configurations in Window Mode before deploying to all windows

**Performance Note**: Very low intervals (5-10 seconds) may be challenging to stop quickly and can impact browser performance. We recommend 15+ seconds for general use.

═══════════════════════════════════════════

**Built with ❤️ using modern web technologies | Manifest V3 Compliant | Open Source | Made for Professionals**

Join professionals worldwide who've automated their browsing workflow!

**Updated**: January 2026 | **Version**: 1.1.0 | **Security Rating**: 87/100

═══════════════════════════════════════════

---

## Changelog Template for Future Updates

### **Version X.X.X** (Release Date)
**Brief Description of Release**

**New Features:**
- ✨ Feature 1 description
- ✨ Feature 2 description

**Bug Fixes:**
- 🐛 Bug fix 1 description
- 🐛 Bug fix 2 description

**Improvements:**
- 💎 Improvement 1 description
- 💎 Improvement 2 description

**Breaking Changes:** (if any)
- ⚠️ Breaking change description

---

## Metadata

- **Extension ID**: mophipfldpoeeimgjfmcnidafjggmiko
- **Current Version**: 1.1.0
- **Last Updated**: January 2026
- **Category**: Productivity
- **Manifest Version**: 3
- **Minimum Chrome Version**: 93+
- **License**: MIT
- **Repository**: GitHub (Open Source)
- **Support Email**: ravindra@r2dsolutions.com

---

## Store Assets Needed

### Screenshots (5-8 recommended)
1. **Main popup interface** - Show countdown timer and mode selection
2. **Global Mode in action** - Multiple windows synchronized
3. **Window Mode demonstration** - Independent window control
4. **Diagnostics page** - Show logging and export features
5. **Settings/Options page** - Full configuration interface
6. **Onboarding tour** - First-time user experience
7. **Badge indicators** - Show ON/PAUSED/OFF states
8. **Use case example** - Dashboard monitoring scenario

### Promotional Images
- **Small tile**: 440x280 pixels
- **Large tile**: 920x680 pixels
- **Marquee**: 1400x560 pixels

### Icon Sizes
- 16x16, 48x48, 128x128 (already present in /src/icon.png)

---

## SEO Keywords

Primary: auto tab switcher, automatic tab rotation, tab cycling extension
Secondary: dashboard monitoring, digital signage, presentation automation, multi-monitor setup
Long-tail: automatic tab switching chrome extension, rotate browser tabs automatically, chrome tab rotator for dashboards

---

## Notes for Future Updates

- Always update the "WHAT'S NEW" section with latest version changes
- Keep version history chronological (newest first)
- Update "Updated" date in footer
- Maintain consistent formatting with ═══ dividers
- Keep character count under 16,000 (Chrome Web Store limit)
- Test all links before publishing
- Update screenshots to reflect new features
- Include migration notes for breaking changes
- Always highlight security/privacy improvements
