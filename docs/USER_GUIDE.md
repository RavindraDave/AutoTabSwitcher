# AutoTabSwitcher - Comprehensive User Guide

**Version**: 2.0 (Phase 3 Complete)
**Last Updated**: 2026-01-31

Welcome to AutoTabSwitcher! This guide will help you get the most out of your automatic tab switching experience.

---

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [Basic Features](#2-basic-features)
3. [Operating Modes](#3-operating-modes)
4. [Advanced Features](#4-advanced-features)
5. [Premium Features](#5-premium-features)
6. [Keyboard Shortcuts](#6-keyboard-shortcuts)
7. [Troubleshooting](#7-troubleshooting)
8. [FAQ](#8-faq)

---

## 1. Getting Started

### Installation

1. **Install from Chrome Web Store**
   - Search for "AutoTabSwitcher" in the Chrome Web Store
   - Click "Add to Chrome"
   - Confirm the required permissions

2. **First Launch**
   - After installation, you'll see a welcome screen
   - Follow the onboarding tutorial to configure basic settings
   - Click the extension icon to access the popup

### Initial Setup

**Step 1: Set Your Switch Interval**
- Default: 5 seconds
- Recommended: 10-30 seconds for comfortable browsing
- Minimum: 1 second
- Maximum: 3600 seconds (1 hour)

**Step 2: Choose Operating Mode**
- **Global Mode** (Default): Switches tabs across all windows
- **Window Mode**: Switches tabs only in specific windows

**Step 3: Configure Pause Behavior**
- Enable "Pause on activity" to stop switching when you're actively using a tab
- Set activity timeout (default: 30 seconds)

---

## 2. Basic Features

### 2.1 Enable/Disable Tab Switching

**From Popup**:
1. Click the extension icon
2. Toggle the "Enable Auto-Switching" button
3. Status indicator shows current state (🟢 Active / ⭕ Paused)

**From Settings**:
1. Right-click extension icon → Settings
2. Use the main toggle in Basic Settings

**Keyboard Shortcut**: `Alt+Shift+T` (customizable)

---

### 2.2 Adjust Switch Interval

**Quick Adjustment** (Popup):
- Use the slider to adjust interval
- Changes apply immediately
- Current interval displayed above slider

**Precise Configuration** (Settings):
1. Go to Settings → Basic Settings
2. Enter exact value in "Delay Time" field
3. Click "Save" (or changes auto-save)

---

### 2.3 Manual Tab Switching

**Next Tab**: Click "Switch Now" in popup or use keyboard shortcut

**Pause Switching**:
- Toggle the main switch to pause
- Extension remembers your position
- Re-enable to continue from where you left off

---

## 3. Operating Modes

### 3.1 Global Mode (Default)

**How it works**:
- Switches tabs across ALL open windows
- Treats all tabs as a single rotation pool
- Best for users with one window

**Use cases**:
- Single window workflow
- Monitoring multiple dashboards across windows
- Simple tab rotation

**Configuration**:
1. Settings → Mode Settings
2. Select "Global Mode"
3. Set global interval

---

### 3.2 Window Mode (Per-Window Control)

**How it works**:
- Each window has independent switching
- Can enable/disable switching per window
- Each window can have its own interval

**Use cases**:
- Separate work/personal windows
- Monitor one window, browse in another
- Different rotation speeds per project

**Configuration**:
1. Settings → Mode Settings
2. Select "Window Mode"
3. Per-window settings appear
4. Toggle switching for each window
5. Set custom intervals (optional)

**Example Workflow**:
```
Window 1 (Work): 10-second rotation, ENABLED
Window 2 (News): 30-second rotation, ENABLED
Window 3 (Personal): DISABLED (manual browsing)
```

---

## 4. Advanced Features

### 4.1 Activity-Based Pausing

**Automatic Pause**:
- Extension pauses when you interact with a tab
- Resumes after inactivity period
- Prevents interrupting your work

**Configuration**:
1. Settings → Activity Settings
2. Enable "Pause on activity"
3. Set timeout (10-300 seconds)
4. Choose activity detection sensitivity

**What counts as activity**:
- Mouse clicks
- Keyboard input
- Scrolling
- Drag and drop

---

### 4.2 Manual Pause Tracker

**Persistent Pause**:
- Right-click extension icon → "Pause Auto-Switching"
- Extension stays paused even after restart
- Manually resume when ready

**Use cases**:
- Long meetings or presentations
- Deep work sessions
- Video calls

**Status indicator**: 🔵 Manually Paused

---

### 4.3 Badge Indicators

Extension icon badge shows current status:

| Badge | Meaning |
|-------|---------|
| ⏸️ | Paused (manual or activity) |
| ⏯️ | Will resume soon |
| 🟢 | Active (global mode) |
| #2 | Active in Window #2 (window mode) |

---

### 4.4 Keyboard Shortcuts

**Default Shortcuts**:
- `Alt+Shift+T`: Toggle auto-switching
- `Alt+Shift+N`: Switch to next tab immediately
- `Alt+Shift+P`: Pause/Resume

**Customize Shortcuts**:
1. Settings → Shortcut Settings
2. Click "Configure shortcuts"
3. Opens Chrome's shortcuts page
4. Assign your preferred key combinations

**Tips**:
- Use shortcuts you won't accidentally trigger
- Avoid conflicts with browser shortcuts
- Test shortcuts before relying on them

---

## 5. Premium Features

### 5.1 Smart Refresh

**Auto-reload tabs on interval**:
- Keeps dashboards and monitoring tools updated
- Configurable per-tab refresh intervals
- Honors `<meta refresh>` tags

**Configuration**:
1. Settings → Premium → Refresh Settings
2. Enable "Smart Refresh"
3. Add URL patterns for tabs to refresh
4. Set refresh interval per pattern

**Example**:
```
Pattern: *.dashboard.company.com
Interval: 60 seconds
Honor meta refresh: Yes
```

---

### 5.2 Rotation Patterns

**Control rotation order**:
- **Sequential**: Left to right, right to left
- **Random**: Random tab selection
- **Priority-based**: Weight certain tabs higher
- **Custom**: Define your own rotation logic

**Configuration**:
1. Settings → Premium → Rotation Patterns
2. Create new pattern
3. Choose pattern type
4. Configure pattern-specific settings
5. Activate pattern

**Custom Pattern Example**:
```
Pattern: Priority Weighted
Tabs with "URGENT" in title: 50% chance
Other tabs: Equal distribution
```

---

### 5.3 Session Management

**Save and restore tab sessions**:
- Save current window as a session
- Restore sessions with one click
- Schedule session launches

**Configuration**:
1. Settings → Premium → Session Management
2. Click "Save Current Session"
3. Name your session
4. Choose save options:
   - Save window layout
   - Save tab URLs only
   - Include pinned tabs
   - Sanitize sensitive data

**Use cases**:
- Project-specific tab sets
- Daily workflow restoration
- A/B testing different workflows

**Restore Session**:
1. Settings → Premium → Session Management
2. Select saved session
3. Click "Restore"
4. Choose restore options:
   - New window or current window
   - Merge with existing tabs
   - Activate immediately

---

### 5.4 Skip Rules

**Exclude tabs from rotation**:
- Define URL patterns to skip
- Use regex for complex patterns
- Title-based or domain-based rules

**Configuration**:
1. Settings → Premium → Skip Rules
2. Add new rule
3. Choose rule type:
   - **URL Pattern**: Match tab URL
   - **Domain**: Match exact domain
   - **Title**: Match tab title
   - **Regex**: Advanced pattern matching
4. Enter pattern
5. Enable rule

**Examples**:
```
Rule 1: Skip video calls
Type: URL Pattern
Pattern: meet.google.com/*

Rule 2: Skip email
Type: Domain
Pattern: mail.google.com

Rule 3: Skip any "KEEP" tabs
Type: Title (regex)
Pattern: .*\[KEEP\].*
```

---

### 5.5 Tab Groups & Categories

**Organize tabs for targeted rotation**:
- Create groups with custom matching rules
- Rotate only within a group
- Different intervals per group

**Creating a Tab Group**:
1. Settings → Premium → Tab Groups
2. Click "Add Group"
3. Name your group
4. Add matchers:
   - URL patterns
   - Domain names
   - Title keywords
   - Manual tab selection
5. Configure group settings:
   - Custom delay time
   - Rotation mode (within group / across groups)

**Rotation Modes**:
- **Within Group**: Only rotate tabs in this group
- **Across Groups**: Rotate all tabs but respect group boundaries
- **Sequential Groups**: Rotate entire groups in order

**Example Setup**:
```
Group 1: "Work Dashboards"
Matchers:
  - dashboard.company.com/*
  - metrics.company.com/*
Custom delay: 10 seconds
Mode: Within group

Group 2: "News Sites"
Matchers:
  - news.google.com
  - *.cnn.com
  - bbc.com/news/*
Custom delay: 30 seconds
Mode: Within group
```

**Activate Group**:
1. Click "Activate" next to group name
2. Only tabs matching group will rotate
3. Deactivate to return to normal rotation

---

### 5.6 Advanced Scheduling

**Time-based automation**:
- Schedule actions at specific times
- Different intervals for different times of day
- Weekend vs. weekday schedules

**Creating a Schedule**:
1. Settings → Premium → Scheduling
2. Click "Add Schedule"
3. Configure schedule:
   - **Name**: Descriptive name
   - **Type**: One-time or Recurring
   - **Time Range**: When to activate (09:00 - 17:00)
   - **Days of Week**: Which days to run
   - **Date Range**: Start and end dates (optional)
   - **Priority**: For conflicting schedules

**Available Actions**:
- Enable/Disable switching
- Change interval
- Activate tab group
- Change rotation pattern
- Enable/disable window
- Launch saved session

**Example Schedules**:
```
Schedule 1: "Work Hours"
Type: Recurring
Time: 09:00 - 17:00
Days: Monday - Friday
Actions:
  - Enable switching
  - Set interval to 10 seconds
  - Activate "Work Dashboards" group

Schedule 2: "Lunch Break"
Type: Recurring
Time: 12:00 - 13:00
Days: Monday - Friday
Priority: 10 (higher than Schedule 1)
Actions:
  - Disable switching

Schedule 3: "Weekend Reading"
Type: Recurring
Time: 00:00 - 23:59
Days: Saturday, Sunday
Actions:
  - Set interval to 60 seconds
  - Activate "News Sites" group
```

**Priority System**:
- Higher priority (larger number) wins
- Use to handle conflicting schedules
- Default priority: 0

---

### 5.7 Window Intervals (Window Mode Only)

**Per-window custom intervals**:
- Override global interval for specific windows
- Combine with window mode for maximum control

**Configuration**:
1. Enable Window Mode
2. Settings → Premium → Window Intervals
3. Select window
4. Set custom interval
5. Window uses this interval instead of global

**Example**:
```
Global interval: 30 seconds

Window 1: 10 seconds (monitoring dashboards)
Window 2: 60 seconds (news articles)
Window 3: (uses global 30 seconds)
```

---

### 5.8 Backup & Configuration Export

**Save your entire configuration**:
- Export all settings, groups, schedules, and rules
- Import on another device
- Backup before major changes

**Export Configuration**:
1. Settings → Premium → Backup Settings
2. Click "Export Configuration"
3. Choose export options:
   - Sanitize sensitive data (URLs, titles)
   - Include sessions
   - Include all settings
4. Save JSON file

**Import Configuration**:
1. Settings → Premium → Backup Settings
2. Click "Import Configuration"
3. Select JSON file
4. Review changes preview
5. Confirm import

**Sync Across Devices** (Future):
- Cloud sync using Chrome Sync Storage
- Automatic backup to cloud
- Restore from any device

---

## 6. Keyboard Shortcuts

### Default Shortcuts

| Action | Shortcut | Description |
|--------|----------|-------------|
| Toggle Switching | `Alt+Shift+T` | Enable/disable auto-switching |
| Next Tab | `Alt+Shift+N` | Switch to next tab immediately |
| Pause/Resume | `Alt+Shift+P` | Pause or resume switching |

### Customizing Shortcuts

1. **Open Chrome's Shortcuts Page**:
   - Settings → Shortcut Settings → "Configure shortcuts"
   - Or navigate to: `chrome://extensions/shortcuts`

2. **Find AutoTabSwitcher**:
   - Scroll to AutoTabSwitcher section

3. **Click in Shortcut Field**:
   - Press your desired key combination
   - Chrome validates if it's available

4. **Save**:
   - Changes apply immediately
   - Test your new shortcuts

### Best Practices

✅ **Do**:
- Use modifier keys (Alt, Shift, Ctrl) + letter
- Choose memorable combinations
- Document your custom shortcuts

❌ **Don't**:
- Override browser shortcuts (Ctrl+T, Ctrl+W)
- Use single keys without modifiers
- Create conflicting shortcuts across extensions

---

## 7. Troubleshooting

### Issue 1: Tabs Not Switching

**Symptoms**: Timer shows active but tabs don't change

**Possible Causes**:
1. **Manual pause active**
   - Check badge: 🔵 = manually paused
   - Solution: Right-click icon → Resume

2. **Activity-based pause triggered**
   - Check badge: ⏸️ = paused due to activity
   - Solution: Wait for inactivity timeout or disable activity pause

3. **Window mode with wrong window**
   - Window mode enabled but current window disabled
   - Solution: Enable switching for current window

4. **Active group has no matching tabs**
   - Group filtering excludes all tabs
   - Solution: Deactivate group or adjust matchers

5. **Skip rules blocking all tabs**
   - All tabs match skip rules
   - Solution: Review and adjust skip rules

**Debug Steps**:
1. Open Settings → Diagnostics
2. Check "Current Status" section
3. Review active groups, schedules, and rules
4. Check Chrome console for errors (`F12` → Console)

---

### Issue 2: Settings Not Saving

**Symptoms**: Changes revert after reload

**Possible Causes**:
1. **Chrome storage quota exceeded**
   - Solution: Delete old sessions or reduce data

2. **Extension permissions issue**
   - Solution: Remove and reinstall extension

3. **Browser sync conflict**
   - Solution: Disable Chrome sync temporarily

**Debug Steps**:
1. Settings → Diagnostics
2. Click "Test Storage"
3. Check for error messages
4. Clear extension data and reconfigure

---

### Issue 3: Performance Issues

**Symptoms**: Browser slows down with extension enabled

**Possible Causes**:
1. **Too many tabs (100+)**
   - Solution: Use groups to limit rotation pool

2. **Very short interval (<3 seconds)**
   - Solution: Increase interval to 5+ seconds

3. **Complex regex patterns in skip rules**
   - Solution: Simplify patterns or use simpler match types

4. **Multiple schedules/groups active**
   - Solution: Disable unused features

**Optimizations**:
1. Use domain matches instead of regex when possible
2. Disable smart refresh if not needed
3. Close unused tabs
4. Use groups to reduce active tab pool

---

### Issue 4: Premium Features Not Working

**Symptoms**: Premium features grayed out or not functioning

**Possible Causes**:
1. **Premium not activated**
   - Solution: Enter license key in Settings → Premium

2. **License key expired**
   - Solution: Renew license

3. **Free tier limitations**
   - Solution: Upgrade to premium

**Check Premium Status**:
1. Settings → Premium → Activation
2. View current tier and expiration
3. Check feature availability

---

### Issue 5: Schedule Not Executing

**Symptoms**: Schedule active but actions don't run

**Possible Causes**:
1. **Time range mismatch**
   - Schedule only runs during specified hours
   - Solution: Check current time vs. schedule time range

2. **Day of week mismatch**
   - Schedule set for weekdays but today is Saturday
   - Solution: Review schedule days configuration

3. **Priority conflict**
   - Lower priority schedule overridden by higher priority
   - Solution: Check other active schedules

4. **One-time schedule already executed**
   - One-time schedules run once per day
   - Solution: Create new schedule or change to recurring

**Debug Steps**:
1. Settings → Premium → Scheduling
2. Check "Active Schedules" indicator
3. Review schedule configuration
4. Check Diagnostics → Recent Activity

---

## 8. FAQ

### General Questions

**Q: Is AutoTabSwitcher free?**
A: Yes! Basic tab switching features are completely free. Premium features (smart refresh, groups, scheduling, etc.) require a license.

**Q: Does this work on other browsers?**
A: Currently Chrome and Edge (Chromium-based browsers). Firefox support coming soon.

**Q: Can I use this on mobile?**
A: No, this extension is for desktop browsers only.

**Q: Does this collect my data?**
A: No! All features run locally. We don't track, collect, or send any data to external servers.

---

### Feature Questions

**Q: Can I exclude certain tabs from switching?**
A: Yes! Use Skip Rules (Premium) to exclude tabs by URL, domain, or title pattern.

**Q: Can I have different rotation speeds for different windows?**
A: Yes! Enable Window Mode and set custom intervals per window (Premium: Window Intervals).

**Q: Can I schedule the extension to turn on/off automatically?**
A: Yes! Use Advanced Scheduling (Premium) to automate enable/disable and other actions.

**Q: How many tabs can the extension handle?**
A: Tested with 500+ tabs. Performance is best with <100 tabs per window.

---

### Technical Questions

**Q: What permissions does this extension need?**
A:
- `tabs`: To access and switch tabs
- `storage`: To save your settings
- `windows`: For window mode functionality
- `alarms`: For scheduling (MV3 requirement)
- `downloads`: For configuration export (optional)

**Q: Why does the extension need "Read browsing history" permission?**
A: This is how Chrome describes the `tabs` permission. We only use it to switch tabs, not to track your browsing history.

**Q: Is my data encrypted?**
A: Settings are stored using Chrome's built-in storage, which is encrypted at rest on your device.

**Q: Can I sync settings across devices?**
A: Currently, you can export/import configurations manually. Automatic cloud sync coming soon.

**Q: Does this work with Chrome's native tab groups?**
A: AutoTabSwitcher has its own grouping system independent of Chrome's tab groups. We may integrate in the future.

---

### Premium Questions

**Q: How do I get premium features?**
A: Purchase a license key from our website and enter it in Settings → Premium → Activation.

**Q: Is there a free trial?**
A: Yes! All premium features have a 14-day trial period. No credit card required.

**Q: What's included in premium?**
A:
- Smart Refresh
- Rotation Patterns
- Session Management
- Skip Rules
- Tab Groups & Categories
- Advanced Scheduling
- Window Intervals
- Priority Support

**Q: Can I use premium on multiple devices?**
A: Yes! One license works on up to 3 devices.

**Q: What if I'm not satisfied?**
A: 30-day money-back guarantee, no questions asked.

---

### Support Questions

**Q: Where can I report bugs?**
A:
- GitHub: [github.com/yourusername/autotabswitcher/issues](https://github.com)
- Email: support@autotabswitcher.com
- Chrome Web Store reviews (for public feedback)

**Q: How do I request a feature?**
A: Same channels as bug reports. We love feature requests!

**Q: Is there a community forum?**
A: Coming soon! Join our Discord server: [discord.gg/autotabswitcher](https://discord.gg)

**Q: How often is the extension updated?**
A: Major updates quarterly, bug fixes as needed.

---

## Additional Resources

### Links

- **Website**: https://autotabswitcher.com
- **Documentation**: https://docs.autotabswitcher.com
- **GitHub**: https://github.com/yourusername/autotabswitcher
- **Support**: support@autotabswitcher.com
- **Privacy Policy**: https://autotabswitcher.com/privacy
- **Terms of Service**: https://autotabswitcher.com/terms

### Video Tutorials

- Getting Started (5 min)
- Window Mode Deep Dive (8 min)
- Premium Features Overview (15 min)
- Advanced Scheduling Tutorial (12 min)
- Power User Tips (10 min)

*Available on our YouTube channel: [youtube.com/@autotabswitcher](https://youtube.com)*

---

## Changelog

**Version 2.0 (Phase 3)** - 2026-01
- ✅ Added Tab Groups & Categories
- ✅ Added Advanced Scheduling
- ✅ Added Window Intervals
- ✅ Improved delay precedence system
- ✅ Enhanced conflict detection
- ✅ UI improvements

**Version 1.5 (Phase 2)** - 2025-12
- Added Smart Refresh
- Added Rotation Patterns
- Added Session Management
- Added Skip Rules

**Version 1.0 (Phase 1)** - 2025-10
- Initial release
- Basic tab switching
- Window mode
- Activity-based pausing

---

**Need Help?** Contact us at support@autotabswitcher.com or visit our [Help Center](https://help.autotabswitcher.com).

**Enjoying AutoTabSwitcher?** Please [rate us](https://chrome.google.com/webstore) on the Chrome Web Store! ⭐⭐⭐⭐⭐
