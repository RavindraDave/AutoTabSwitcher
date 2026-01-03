# Product Requirements Document: Global vs Window Mode Enhancement

## Document Information
- **Version**: 1.0
- **Date**: 2025-11-11
- **Status**: Draft
- **Author**: AI Assistant
- **Project**: AutoTabSwitcher Chrome Extension

---

## 1. Executive Summary

### 1.1 Overview
This PRD outlines the enhancement of AutoTabSwitcher to support two distinct operational modes: **Global Mode** and **Window Mode**. This feature will provide users with granular control over tab switching behavior across multiple browser windows.

### 1.2 Objectives
- Enable users to choose between window-independent and window-specific tab switching
- Provide per-window enable/disable control in Window Mode
- Maintain independent timers per window in Window Mode
- Enhance diagnostic logging for better debugging
- Ensure full Chrome extension compliance
- Implement comprehensive testing

### 1.3 **BACKWARD COMPATIBILITY GUARANTEE**

**⚠️ CRITICAL: These are NON-BREAKING enhancements only**

- ✅ **All existing functionality preserved** - No changes to core tab switching logic
- ✅ **Default behavior unchanged** - New users and existing users default to Global Mode (current behavior)
- ✅ **Zero impact on basic features** - Enable/disable, timer, activity pause, badge management all work as before
- ✅ **Additive only** - New features are additions, not replacements
- ✅ **Existing users protected** - Automatic migration preserves all current settings
- ✅ **Optional enhancement** - Window Mode is opt-in, not forced
- ✅ **No UI disruption** - Existing popup and options continue to work identically in Global Mode

---

## 2. Current State Analysis

### 2.1 Existing Architecture
```
AutoTabSwitcher (Current)
├── Global enable/disable toggle
├── "Selected Window" mode (single window monitoring)
├── Unified timer mechanism
├── Badge management per window
├── Activity-based pausing
└── Diagnostic logging (basic)
```

### 2.2 Current Limitations
1. **Binary window selection**: Either all windows or one specific window
2. **Single enable/disable state**: No per-window control
3. **Unified timer**: Cannot have different timings per window
4. **Limited logging**: Window titles not captured in diagnostics
5. **Mode selection**: Window mode buried in options, not prominent

---

## 2.3 Non-Breaking Enhancement Strategy

### 2.3.1 What Will NOT Change
**Core tab switching functionality:**
- ✅ Sequential tab switching algorithm (unchanged)
- ✅ Hybrid timer mechanism (chrome.alarms + setInterval) (unchanged)
- ✅ Activity-based pausing (unchanged)
- ✅ Badge management system (enhanced, not replaced)
- ✅ Storage mechanism (extended, not replaced)
- ✅ Options page existing settings (preserved)
- ✅ Popup existing controls (preserved)

**User experience:**
- ✅ Default behavior identical to current version
- ✅ Existing keyboard shortcuts (if any) work
- ✅ Extension icon and branding unchanged
- ✅ Settings location and format preserved

### 2.3.2 What Will Change (Additive Only)
**New features added:**
- ➕ Mode selector in Options (new UI element)
- ➕ Window Mode as optional alternative (opt-in)
- ➕ Per-window state tracking (new data structure)
- ➕ Enhanced logging with window titles (additional data)
- ➕ Window-specific timer management (new code path)

**Improved features:**
- 🔧 Popup shows current mode (additional info display)
- 🔧 Diagnostics include more context (enhanced logging)
- 🔧 Badge reflects per-window state in Window Mode (conditional behavior)

### 2.3.3 Migration Strategy
**For existing users:**
1. On first load after update, check for `operatingMode` setting
2. If missing, set to `'global'` (preserves current behavior exactly)
3. Copy existing `enabled` state to global mode
4. No user action required
5. User can opt-in to Window Mode later from Options

**For new users:**
1. Default to Global Mode
2. Can discover Window Mode in Options
3. Clear help text explains both modes

---

## 3. Feature Requirements

### 3.1 Feature #1: Global vs Window Mode Selection

#### 3.1.1 Functional Requirements
- **FR-1.1**: Add a prominent mode selector in the Options page
  - Radio buttons or toggle switch for "Global Mode" vs "Window Mode"
  - Clear descriptions for each mode
  - Visual indication of current mode

- **FR-1.2**: Mode persistence
  - Store mode selection in `chrome.storage.local` as `operatingMode: 'global' | 'window'`
  - Default to 'global' for new installations
  - Survive browser restarts

- **FR-1.3**: Mode migration
  - Convert existing "Selected Window" users to Window Mode
  - Preserve existing settings during migration

#### 3.1.2 Technical Specifications
```typescript
interface Settings {
  // Existing fields...
  operatingMode: 'global' | 'window';

  // Modified fields
  enabled: boolean; // Used for Global Mode

  // New fields
  windowStates: {
    [windowId: number]: {
      enabled: boolean;
      enabledTimestamp?: number; // When this window was enabled
      lastSwitchTime?: number;
    }
  };
}
```

#### 3.1.3 UI Changes
**Options Page** (`src/options/options.html` and `options.ts`):
- Add mode selector section at the top of Basic Settings
- Show/hide relevant options based on mode
- Display mode-specific help text

**Popup** (`src/popup/index.html` and `index.ts`):
- Display current mode prominently
- Adapt button labels based on mode
- Show window-specific status in Window Mode

---

### 3.2 Feature #2: Global Mode Enable/Disable

**⚠️ NOTE: This is the CURRENT behavior - no changes to existing functionality**

#### 3.2.1 Functional Requirements
- **FR-2.1**: Single toggle affects all windows
  - Popup toggle button enables/disables switching on ALL windows
  - All windows start/stop switching simultaneously
  - **IDENTICAL to current implementation - NO CHANGES**

- **FR-2.2**: Unified status
  - All window badges show the same state (ON/OFF/PAUSED)
  - No per-window state tracking needed
  - **IDENTICAL to current implementation - NO CHANGES**

- **FR-2.3**: Behavior consistency
  - **100% maintains current behavior (backward compatible)**
  - Activity tracking pauses all windows
  - **Existing code paths used - NO MODIFICATIONS to core logic**

#### 3.2.2 Technical Specifications
```typescript
// In background.ts
// NOTE: This wraps EXISTING logic - no changes to core implementation
async function handleGlobalModeToggle(enabled: boolean): Promise<void> {
  // Uses EXISTING badge management code
  const windows = await chrome.windows.getAll();
  for (const window of windows) {
    await updateBadgeForWindow(window.id, enabled ? 'ON' : 'OFF');
  }

  // Uses EXISTING hybrid timer mechanism - no changes
  await toggleHybridTimer(enabled, delayMs, minDelayMs);
}
```

**Implementation Approach:**
- ✅ Reuse all existing functions (toggleHybridTimer, updateBadgeForWindow, etc.)
- ✅ No modifications to core tab-switcher.ts logic
- ✅ Simple conditional routing: if global mode → use existing code
- ✅ Existing tests remain valid

#### 3.2.3 Storage Changes
- `enabled`: boolean (global state) - **EXISTING field, unchanged**
- `windowStates`: optional, empty/undefined in Global Mode - **NEW field, ignored in Global Mode**

---

### 3.3 Feature #3: Window Mode Per-Window Control

#### 3.3.1 Functional Requirements
- **FR-3.1**: Per-window enable/disable state
  - Each window maintains independent enabled state
  - Popup toggle affects only the current window

- **FR-3.2**: Window state persistence
  - Window states survive browser restarts
  - Handle window closure gracefully (cleanup)

- **FR-3.3**: Window identification
  - Track windows by `windowId`
  - Popup shows current window's state
  - Badge reflects per-window state

- **FR-3.4**: Popup button behavior
  - Button label: "Enable/Disable for This Window"
  - Shows current window's status (enabled/disabled)
  - Quick action in popup

#### 3.3.2 Technical Specifications
```typescript
// Per-window state management
interface WindowState {
  enabled: boolean;
  enabledTimestamp: number; // When this window was enabled
  lastSwitchTime: number;   // Last tab switch time
  timerHandle?: number;     // Window-specific timer reference
}

// In background.ts
async function handleWindowModeToggle(
  windowId: number,
  enabled: boolean
): Promise<void> {
  const settings = await getSettings();

  if (!settings.windowStates) {
    settings.windowStates = {};
  }

  settings.windowStates[windowId] = {
    enabled,
    enabledTimestamp: enabled ? Date.now() : undefined,
    lastSwitchTime: 0
  };

  await chrome.storage.local.set({ windowStates: settings.windowStates });

  // Update badge for this window only
  await updateBadgeForWindow(windowId, enabled ? 'ON' : 'OFF');

  // Start/stop timer for this window
  if (enabled) {
    await startWindowTimer(windowId);
  } else {
    await stopWindowTimer(windowId);
  }
}
```

#### 3.3.3 Window Lifecycle Management
```typescript
// Handle window closure
chrome.windows.onRemoved.addListener(async (windowId) => {
  const settings = await getSettings();
  if (settings.windowStates && settings.windowStates[windowId]) {
    delete settings.windowStates[windowId];
    await chrome.storage.local.set({ windowStates: settings.windowStates });
  }

  // Cleanup timers
  await stopWindowTimer(windowId);
});

// Handle browser startup
chrome.runtime.onStartup.addListener(async () => {
  const settings = await getSettings();

  if (settings.operatingMode === 'window') {
    // Restore per-window timers
    const windows = await chrome.windows.getAll();
    const validWindowIds = windows.map(w => w.id);

    // Cleanup stale window states
    for (const windowId in settings.windowStates) {
      if (!validWindowIds.includes(Number(windowId))) {
        delete settings.windowStates[windowId];
      }
    }

    // Restart active windows
    for (const [windowId, state] of Object.entries(settings.windowStates)) {
      if (state.enabled) {
        await startWindowTimer(Number(windowId));
      }
    }
  }
});
```

#### 3.3.4 UI Changes
**Popup**:
- Show "Window Mode" indicator
- Display current window ID or title
- Button: "Enable for This Window" / "Disable for This Window"
- Show countdown specific to current window

---

### 3.4 Feature #4: Enhanced Diagnostic Logging

#### 3.4.1 Functional Requirements
- **FR-4.1**: Capture window titles on switch
  - Log previous window title
  - Log new window title
  - Include window ID for correlation

- **FR-4.2**: Enhanced log entries
  - Timestamp
  - Event type (SWITCH, ENABLE, DISABLE, MODE_CHANGE)
  - Window ID
  - Previous window title
  - New window title
  - Current mode (Global/Window)

- **FR-4.3**: Log retention
  - Maintain existing 30-minute rolling buffer
  - Cap at reasonable size (1000 entries max)

#### 3.4.2 Technical Specifications
```typescript
// Enhanced log entry type
interface DiagnosticLogEntry {
  timestamp: number;
  event: 'SWITCH' | 'ENABLE' | 'DISABLE' | 'MODE_CHANGE' | 'PAUSE' | 'RESUME';
  mode: 'global' | 'window';
  windowId?: number;
  previousWindowTitle?: string;
  newWindowTitle?: string;
  previousTabTitle?: string;
  newTabTitle?: string;
  details?: string;
}

// In logger.ts
export async function logTabSwitch(
  windowId: number,
  previousTabId: number,
  newTabId: number,
  mode: 'global' | 'window'
): Promise<void> {
  try {
    const [previousTab, newTab, window] = await Promise.all([
      chrome.tabs.get(previousTabId).catch(() => null),
      chrome.tabs.get(newTabId).catch(() => null),
      chrome.windows.get(windowId).catch(() => null)
    ]);

    const entry: DiagnosticLogEntry = {
      timestamp: Date.now(),
      event: 'SWITCH',
      mode,
      windowId,
      previousTabTitle: previousTab?.title || 'Unknown',
      newTabTitle: newTab?.title || 'Unknown',
      details: `Switched in window ${windowId}`
    };

    await addLogEntry(entry);
  } catch (error) {
    console.error('Error logging tab switch:', error);
  }
}

// In tab-switcher.ts
export async function switchToNextTab(
  windowId: number,
  mode: 'global' | 'window'
): Promise<void> {
  // ... existing switching logic ...

  // Log the switch with window titles
  await logTabSwitch(windowId, previousTabId, newTabId, mode);
}
```

#### 3.4.3 Diagnostics UI Enhancement
**Diagnostics Page** (`src/diagnostics/diagnostics.html` and `diagnostics.ts`):
- Add columns for window titles
- Add mode indicator
- Add window ID filter
- Export functionality with enhanced data

---

### 3.5 Feature #5: Per-Window Timer Management

#### 3.5.1 Functional Requirements
- **FR-5.1**: Global Mode timer behavior
  - Single timer for all windows
  - All windows switch at the same interval
  - Existing hybrid timer mechanism

- **FR-5.2**: Window Mode timer behavior
  - Each window has its own timer
  - Timers start when window is enabled
  - Independent countdown per window
  - Timer survives service worker suspension

- **FR-5.3**: Timer synchronization
  - Each window timer starts from its enabledTimestamp
  - No cross-window interference
  - Efficient alarm management

#### 3.5.2 Technical Specifications
```typescript
// Per-window timer management
class WindowTimerManager {
  private windowTimers: Map<number, number> = new Map();

  async startTimer(windowId: number, delayMs: number): Promise<void> {
    // Use Chrome alarms for reliability
    const alarmName = `window-timer-${windowId}`;

    await chrome.alarms.create(alarmName, {
      delayInMinutes: delayMs / (1000 * 60),
      periodInMinutes: delayMs / (1000 * 60)
    });

    // Track active timers
    this.windowTimers.set(windowId, Date.now());
  }

  async stopTimer(windowId: number): Promise<void> {
    const alarmName = `window-timer-${windowId}`;
    await chrome.alarms.clear(alarmName);
    this.windowTimers.delete(windowId);
  }

  async stopAllTimers(): Promise<void> {
    for (const windowId of this.windowTimers.keys()) {
      await this.stopTimer(windowId);
    }
  }

  getTimeUntilNextSwitch(windowId: number, delayMs: number): number {
    const enabledTime = this.windowTimers.get(windowId);
    if (!enabledTime) return 0;

    const elapsed = Date.now() - enabledTime;
    const remaining = delayMs - (elapsed % delayMs);
    return remaining;
  }
}

// In background.ts
const windowTimerManager = new WindowTimerManager();

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name.startsWith('window-timer-')) {
    const windowId = parseInt(alarm.name.replace('window-timer-', ''));
    const settings = await getSettings();

    if (settings.operatingMode === 'window') {
      const windowState = settings.windowStates?.[windowId];
      if (windowState?.enabled) {
        await switchToNextTab(windowId, 'window');
      }
    }
  }
});
```

#### 3.5.3 Popup Timer Display
```typescript
// In popup/index.ts
async function updateCountdown(): Promise<void> {
  const settings = await getSettings();
  const currentWindow = await chrome.windows.getCurrent();

  if (settings.operatingMode === 'global' && settings.enabled) {
    // Show global countdown
    const timeRemaining = calculateGlobalTimeRemaining(settings);
    displayCountdown(timeRemaining);
  } else if (settings.operatingMode === 'window') {
    const windowState = settings.windowStates?.[currentWindow.id];
    if (windowState?.enabled) {
      // Show window-specific countdown
      const timeRemaining = windowTimerManager.getTimeUntilNextSwitch(
        currentWindow.id,
        settings.delayTime
      );
      displayCountdown(timeRemaining);
    }
  }
}
```

---

### 3.6 Feature #6: Comprehensive Use Case Coverage

#### 3.6.1 Module Impact Analysis

**Affected Files:**
1. ✅ **src/core/types.ts** - Add new type definitions
2. ✅ **src/core/storage.ts** - Update Settings interface and defaults
3. ✅ **src/core/constants.ts** - Add mode-related constants
4. ✅ **src/background.ts** - Core logic for mode handling
5. ✅ **src/core/tab-switcher.ts** - Mode-aware switching logic
6. ✅ **src/core/timing-hybrid.ts** - Per-window timer support
7. ✅ **src/core/badge-manager.ts** - Per-window badge updates
8. ✅ **src/core/logger.ts** - Enhanced diagnostic logging
9. ✅ **src/popup/index.ts** - Mode-aware UI
10. ✅ **src/popup/index.html** - UI layout updates
11. ✅ **src/options/options.ts** - Mode selector implementation
12. ✅ **src/options/options.html** - Options UI updates
13. ✅ **src/manifest.json** - Review permissions

#### 3.6.2 Use Case Matrix

| Use Case | Global Mode | Window Mode | Expected Behavior |
|----------|-------------|-------------|-------------------|
| UC-1: Enable extension | Toggle ON | Enable current window | All windows switch / Current window switches |
| UC-2: Disable extension | Toggle OFF | Disable current window | All windows stop / Current window stops |
| UC-3: Multiple windows open | All switch together | Each has own state | Synchronized / Independent |
| UC-4: Close window | No impact | State cleaned up | Continue / Remove window state |
| UC-5: Browser restart | Restore global state | Restore per-window states | Resume / Resume enabled windows |
| UC-6: Activity pause | Pauses all windows | Pauses per window | Global pause / Per-window pause |
| UC-7: Change mode | Switch to Global | Switch to Window | Convert states / Initialize window states |
| UC-8: Open new window | Auto-included | Starts disabled | Immediately active / Manual enable needed |
| UC-9: Timer countdown | Single timer | Per-window timers | All windows sync / Independent countdowns |
| UC-10: Diagnostics | Global events | Per-window events | Single log stream / Window-tagged logs |

#### 3.6.3 Edge Cases

**EC-1: Mode switching with active windows**
- Save current state
- Cleanup old mode data
- Initialize new mode with sensible defaults
- Show user notification

**EC-2: Window ID reuse after closure**
- Chrome may reuse window IDs
- Cleanup state on window.onRemoved
- Verify window exists before operations

**EC-3: Service worker suspension**
- Store all state in chrome.storage
- Recreate timers on wake
- Verify window states on resume

**EC-4: Rapid enable/disable**
- Debounce toggle actions
- Cancel pending timers properly
- Prevent race conditions

**EC-5: No tabs or single tab in window**
- Detect and skip switching
- Show appropriate message
- Don't error or crash

---

### 3.7 Feature #7: Chrome Extension Compliance

#### 3.7.1 Manifest V3 Compliance
- ✅ Use `manifest_version: 3`
- ✅ Service worker instead of background page
- ✅ chrome.alarms for timers (not setInterval for long delays)
- ✅ Minimal permissions requested
- ✅ CSP-compliant (no inline scripts)

#### 3.7.2 Manifest Audit
**Current Permissions:**
```json
{
  "permissions": ["tabs", "storage", "alarms", "windows"]
}
```

**Validation:**
- ✅ `tabs` - Required for tab switching and title access
- ✅ `storage` - Required for settings persistence
- ✅ `alarms` - Required for reliable timers
- ✅ `windows` - Required for multi-window support

**No obsolete properties** - Current manifest is clean

#### 3.7.3 Best Practices Checklist
- ✅ Use declarative APIs where possible
- ✅ No persistent background page
- ✅ All state in storage, not in-memory
- ✅ Handle service worker suspension gracefully
- ✅ Use chrome.alarms for long timers
- ✅ Efficient listener registration
- ✅ Proper error handling
- ✅ No excessive permissions
- ✅ Clear privacy policy (no data collection)
- ✅ TypeScript for type safety

#### 3.7.4 Chrome Web Store Requirements
- ✅ Accurate description
- ✅ Clear permission justifications
- ✅ Privacy policy statement
- ✅ Quality screenshots
- ✅ Proper icon sizes (16x16, 48x48, 128x128)
- ✅ Single purpose extension
- ✅ No obfuscated code (using TypeScript)
- ✅ Proper versioning (semver)

---

### 3.8 Feature #8: Testing Strategy

#### 3.8.1 Unit Tests

**Test Coverage Goals:**
- **Code coverage**: Minimum 85%
- **Branch coverage**: Minimum 80%
- **Critical paths**: 100%

**Test Files to Create/Update:**

1. **`src/__tests__/mode-switcher.test.ts`** - New
   ```typescript
   describe('Mode Switching', () => {
     test('should switch from global to window mode');
     test('should preserve settings during mode switch');
     test('should cleanup timers when switching modes');
     test('should initialize window states on first switch to window mode');
   });
   ```

2. **`src/__tests__/window-state-manager.test.ts`** - New
   ```typescript
   describe('Window State Management', () => {
     test('should enable window independently');
     test('should disable window independently');
     test('should cleanup closed window state');
     test('should handle window ID reuse');
     test('should persist states across restarts');
   });
   ```

3. **`src/__tests__/timer-manager.test.ts`** - New
   ```typescript
   describe('Per-Window Timer Management', () => {
     test('should start timer for specific window');
     test('should stop timer for specific window');
     test('should maintain independent timers');
     test('should calculate correct countdown per window');
     test('should handle service worker suspension');
   });
   ```

4. **`src/__tests__/tab-switcher.test.ts`** - Update
   ```typescript
   describe('Tab Switching with Modes', () => {
     test('should switch in global mode across all windows');
     test('should switch in window mode for specific window');
     test('should respect per-window enabled state');
     test('should log window titles on switch');
   });
   ```

5. **`src/__tests__/logger.test.ts`** - Update
   ```typescript
   describe('Enhanced Diagnostic Logging', () => {
     test('should log window titles on switch');
     test('should log mode in each entry');
     test('should include window ID');
     test('should maintain rolling buffer');
   });
   ```

6. **`src/__tests__/background.test.ts`** - Update
   ```typescript
   describe('Background Service Worker', () => {
     test('should handle global mode enable/disable');
     test('should handle window mode enable/disable');
     test('should migrate from old settings');
     test('should cleanup on window close');
     test('should restore on browser restart');
   });
   ```

7. **`src/__tests__/popup.test.ts`** - Update
   ```typescript
   describe('Popup UI', () => {
     test('should display correct mode');
     test('should show global toggle in global mode');
     test('should show window toggle in window mode');
     test('should update countdown per mode');
     test('should reflect current window state');
   });
   ```

8. **`src/__tests__/options.test.ts`** - New
   ```typescript
   describe('Options Page', () => {
     test('should save mode selection');
     test('should show mode-specific options');
     test('should validate mode-specific settings');
     test('should handle mode migration');
   });
   ```

#### 3.8.2 Integration Tests

**Test Scenarios:**
1. **End-to-End Mode Switching**
   - Enable Global Mode → Verify all windows switch
   - Switch to Window Mode → Enable specific windows → Verify independent switching

2. **Multi-Window Lifecycle**
   - Open 3 windows → Enable window 1 and 3 → Close window 2 → Verify no errors
   - Restart browser → Verify window states restored

3. **Timer Accuracy**
   - Set 10-second delay → Enable Global Mode → Verify switches every 10s
   - Enable 3 windows at different times → Verify independent countdowns

4. **Activity Pause Integration**
   - Enable Global Mode → User clicks tab → Verify all windows pause
   - Enable 2 windows → User clicks tab in window 1 → Verify only window 1 pauses

#### 3.8.3 Manual Testing Checklist

**Pre-Release Testing:**
- [ ] Install extension from dist/ (unpacked)
- [ ] Test Global Mode with 3+ windows
- [ ] Test Window Mode with 3+ windows
- [ ] Switch between modes while active
- [ ] Close windows while enabled
- [ ] Restart browser and verify state restoration
- [ ] Check diagnostics logs for window titles
- [ ] Verify badge colors per window
- [ ] Test activity pause in both modes
- [ ] Verify timer accuracy with stopwatch
- [ ] Test on Chrome, Edge, Brave (Chromium-based)
- [ ] Check console for errors
- [ ] Verify no memory leaks (open Dev Tools → Memory)
- [ ] Test with very short (5s) and long (300s) delays

#### 3.8.4 Test Automation

**npm Scripts:**
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:ci": "jest --ci --coverage --maxWorkers=2",
    "test:unit": "jest --testPathPattern='__tests__/.*\\.test\\.ts$'",
    "test:integration": "jest --testPathPattern='__tests__/integration/.*\\.test\\.ts$'"
  }
}
```

**Pre-Build Test Hook:**
```bash
# In package.json
"scripts": {
  "prebuild": "npm run test",
  "build": "tsc && node scripts/copy-assets.js"
}
```

**GitHub Actions CI (Recommended):**
```yaml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm test
      - run: npm run build
```

---

## 4. Implementation Plan

### 4.0 Implementation Principles (MANDATORY)

**Golden Rules for Implementation:**
1. 🚫 **DO NOT modify existing core functions** (switchToNextTab, toggleHybridTimer, updateBadgeForWindow, etc.)
2. ✅ **DO wrap/route to existing functions** based on mode
3. 🚫 **DO NOT change existing storage fields** (only add new ones)
4. ✅ **DO add conditional logic** at the top level (background.ts)
5. 🚫 **DO NOT refactor working code** as part of this PR
6. ✅ **DO reuse existing utilities** and helpers
7. 🚫 **DO NOT change default behavior** (global mode = current behavior)
8. ✅ **DO add new functions** for Window Mode features only

**Code Review Checklist:**
- [ ] No modifications to core/tab-switcher.ts core logic?
- [ ] No changes to existing timer implementation?
- [ ] No changes to badge color logic?
- [ ] No changes to activity tracking?
- [ ] All changes are additive (new functions/fields)?
- [ ] Global Mode uses exact same code paths as before?
- [ ] Existing tests pass without modification?

### 4.1 Phase 1: Core Infrastructure (Days 1-2)
1. Update type definitions (types.ts) - **ADD new types only**
2. Add operatingMode and windowStates to storage - **EXTEND Settings interface**
3. Create WindowTimerManager class - **NEW class, doesn't touch existing timer**
4. Update constants - **ADD new constants**

### 4.2 Phase 2: Background Logic (Days 3-4)
5. Implement mode switching logic - **NEW routing function, wraps existing**
6. Add per-window timer management - **NEW WindowTimerManager class**
7. Add mode parameter to tab-switcher calls - **MINIMAL change: add parameter, no logic changes**
8. Handle window lifecycle events - **NEW listeners for cleanup**
9. Implement state migration - **NEW function for first-run**

### 4.3 Phase 3: UI Updates (Days 5-6)
10. Update Options page with mode selector - **ADD new section to existing page**
11. Update Popup for mode-aware display - **ADD mode indicator, existing controls unchanged**
12. Add window-specific controls - **NEW button in popup (conditional display)**
13. Update badge manager to accept mode parameter - **EXTEND function signature only**

### 4.4 Phase 4: Logging & Diagnostics (Day 7)
14. Enhance logger for window titles - **EXTEND log entry interface**
15. Update diagnostics page display - **ADD new columns to existing page**
16. Add mode indicators throughout - **DISPLAY only, no logic changes**

### 4.5 Phase 5: Testing (Days 8-9)
17. Write unit tests for new features
18. Update existing tests
19. Manual testing across scenarios
20. Fix bugs and edge cases

### 4.6 Phase 6: Documentation & Release (Day 10)
21. Update README
22. Update Chrome Web Store description
23. Create migration guide
24. Final build and release

---

## 5. Success Criteria

### 5.1 Backward Compatibility (CRITICAL)
- ✅ **Existing users experience ZERO behavior changes** after update
- ✅ **All existing unit tests pass** without modification
- ✅ **Global Mode = current behavior** exactly (validated by comparison testing)
- ✅ **No settings lost** during migration
- ✅ **Existing popup/options work identically** in Global Mode
- ✅ **Core tab switching logic untouched** (no modifications to sequential algorithm)
- ✅ **No regressions** in existing features (enable/disable, timer, activity pause, badges)

### 5.2 Functional Success (New Features)
- ✅ Users can select Global or Window Mode from Options
- ✅ Global Mode enables/disables all windows simultaneously
- ✅ Window Mode allows per-window control (opt-in)
- ✅ Timers work independently per window in Window Mode
- ✅ Diagnostic logs include window titles (enhanced, not replaced)
- ✅ All existing features continue to work

### 5.3 Technical Success
- ✅ 85%+ code coverage (including new code)
- ✅ All existing tests passing (no modifications needed)
- ✅ New tests for Window Mode features passing
- ✅ No console errors
- ✅ No manifest violations
- ✅ Service worker handles suspension gracefully
- ✅ No memory leaks
- ✅ Performance unchanged in Global Mode

### 5.4 User Experience Success
- ✅ Clear mode distinction in UI
- ✅ Intuitive toggle behavior
- ✅ Accurate countdown display
- ✅ Helpful error messages
- ✅ Settings persist correctly
- ✅ No confusion for existing users (default mode is familiar)

---

## 6. Risk Assessment

### 6.1 Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Service worker suspension breaks per-window timers | Medium | High | Use chrome.alarms exclusively, store all state in storage |
| Window ID collisions after reuse | Low | Medium | Clean up on onRemoved, validate window existence |
| Race conditions on rapid toggle | Medium | Medium | Debounce toggle actions, use async/await properly |
| Storage quota exceeded with many windows | Low | Low | Limit windowStates size, cleanup stale entries |
| Accidental modification of core logic | Low | High | **MITIGATED**: Wrap existing code, don't modify. Code review process. Regression tests. |
| New code breaks existing features | Low | Medium | **MITIGATED**: Conditional routing. If global mode → existing code path exactly. Comprehensive regression testing. |

### 6.2 UX Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Users confused by mode distinction | Medium | Medium | Clear labels, help text, visual indicators |
| Per-window control too complex | Low | Medium | Keep UI simple, provide quick actions |
| Lost settings during mode switch | Low | High | Preserve common settings, warn user before switch |

---

## 7. Open Questions

1. **Q**: Should we allow different delay times per window in Window Mode?
   **A**: **Defer to Phase 2** - Start with unified delay, add per-window delay as future enhancement

2. **Q**: Should activity pause affect all windows or just the active window?
   **A**: **Defer to implementation** - Test both approaches, likely per-window in Window Mode

3. **Q**: Maximum number of windows to support?
   **A**: **No hard limit** - Test with 10+ windows, implement performance optimizations if needed

4. **Q**: Should we migrate users automatically or prompt them?
   **A**: **Automatic migration** - Default to Global Mode for existing users, preserve enabled state

5. **Q**: Export/import settings across modes?
   **A**: **Include in settings** - Export includes mode and windowStates

---

## 8. Appendix

### 8.1 Summary: Non-Breaking Enhancement Guarantee

**This PRD describes ENHANCEMENTS ONLY, not replacements:**

✅ **What stays exactly the same:**
- Core tab switching algorithm (sequential, wrap-around)
- Hybrid timer mechanism (alarms + interval)
- Activity-based pausing logic
- Badge color system (OFF/ON/PAUSED)
- Storage mechanism (chrome.storage.local)
- Manifest permissions (no new permissions needed)
- Default user experience (Global Mode = current behavior)
- All existing tests (no modifications required)

➕ **What gets added:**
- Mode selector in Options page (new UI)
- Window Mode as opt-in feature (new mode)
- Per-window state tracking (new data structure)
- Enhanced logging (additional fields)
- Window-specific controls (new popup button)

**Implementation guarantee:**
- Global Mode code path = existing code path exactly
- Window Mode code path = new code path, isolated
- No modifications to existing core functions
- All changes are additive or conditional routing
- Existing users see zero changes unless they opt-in to Window Mode

### 8.2 Terminology
- **Global Mode**: Extension operates on all browser windows simultaneously (CURRENT DEFAULT BEHAVIOR)
- **Window Mode**: Extension operates independently per browser window (NEW OPT-IN FEATURE)
- **Window State**: Per-window enable/disable state and metadata (NEW DATA STRUCTURE)
- **Operating Mode**: Current mode selection (global or window) (NEW SETTING)

### 8.3 References
- [Chrome Extension Manifest V3 Documentation](https://developer.chrome.com/docs/extensions/mv3/)
- [Chrome Alarms API](https://developer.chrome.com/docs/extensions/reference/alarms/)
- [Chrome Windows API](https://developer.chrome.com/docs/extensions/reference/windows/)
- [Chrome Storage API](https://developer.chrome.com/docs/extensions/reference/storage/)

### 8.4 Related Documents
- README.md - User documentation
- ARCHITECTURE.md - Technical architecture (to be created)
- CHANGELOG.md - Version history

---

## Document Approval

| Role | Name | Approval Date | Signature |
|------|------|---------------|-----------|
| Product Owner | Pending | - | - |
| Technical Lead | Pending | - | - |
| QA Lead | Pending | - | - |

---

**End of Document**
