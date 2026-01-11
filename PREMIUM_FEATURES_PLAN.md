# AutoTabSwitcher Premium Features - Implementation Plan

**Version:** 2.0.0
**Status:** Planning Phase
**Date:** 2026-01-11

---

## Table of Contents
1. [Overview](#overview)
2. [Feature Specifications](#feature-specifications)
3. [Architecture Design](#architecture-design)
4. [Data Structures & Type Definitions](#data-structures--type-definitions)
5. [UI/UX Design](#uiux-design)
6. [Implementation Roadmap](#implementation-roadmap)
7. [Technical Considerations](#technical-considerations)
8. [Testing Strategy](#testing-strategy)

---

## Overview

This document outlines the implementation plan for six premium features that will transform AutoTabSwitcher from a simple tab rotation tool into a sophisticated workflow automation extension.

### Premium Features Summary

| # | Feature | Priority | Complexity | Impact |
|---|---------|----------|------------|--------|
| 1 | Custom Tab Sequences & Rotation Patterns | High | Medium | High |
| 2 | Skip Specific Tabs/Websites | High | Low | High |
| 3 | Tab Grouping & Categorization | Medium | High | Very High |
| 4 | Different Intervals per Window | High | Low | Medium |
| 5 | Advanced Scheduling | Medium | Medium | High |
| 6 | Import/Export Configuration | High | Low | Medium |

### Architecture Philosophy

- **Backward Compatibility:** All premium features must work alongside existing functionality
- **Progressive Enhancement:** Free users get basic features; premium unlocks advanced capabilities
- **Performance First:** No negative impact on existing tab switching performance
- **User-Centric:** Complex features should have simple, intuitive defaults

---

## Feature Specifications

### Feature 1: Custom Tab Sequences & Rotation Patterns

**Description:** Allow users to define custom rotation orders instead of just sequential left-to-right.

#### User Stories
- As a user, I want to create a specific rotation order (e.g., Tab 1 → Tab 5 → Tab 3 → Tab 2)
- As a user, I want to use different rotation patterns (sequential, reverse, random, custom)
- As a user, I want to save multiple rotation sequences and switch between them

#### Capabilities
1. **Rotation Patterns:**
   - Sequential (default): Left to right
   - Reverse Sequential: Right to left
   - Random: Random tab each time
   - Pinned First: Always start with pinned tabs, then others
   - Custom Order: User-defined sequence by tab position or URL pattern

2. **Pattern Configuration:**
   - Visual drag-and-drop interface to reorder tabs
   - Tab preview with title and favicon
   - Save named patterns (e.g., "Morning Routine", "Development Workflow")
   - Per-window or global patterns

3. **Pattern Selection:**
   - Quick pattern switcher in popup
   - Default pattern per window
   - Scheduled pattern changes (integrate with Feature 5)

#### Technical Approach
- Store rotation pattern metadata in storage
- New `RotationEngine` class to handle pattern logic
- Pattern resolver that converts patterns to tab indices
- Cache current rotation state to avoid recalculation

---

### Feature 2: Skip Specific Tabs or Websites

**Description:** Exclude certain tabs or websites from the automatic rotation.

#### User Stories
- As a user, I want to skip my email tab so it doesn't auto-switch
- As a user, I want to exclude all tabs from a specific domain
- As a user, I want to temporarily skip tabs without closing them

#### Capabilities
1. **Skip Rules:**
   - Skip by exact URL
   - Skip by domain pattern (e.g., `*.google.com`)
   - Skip by URL regex pattern
   - Skip pinned tabs option
   - Skip tabs with specific titles

2. **Skip Management:**
   - Whitelist approach: Only rotate specified tabs
   - Blacklist approach: Rotate all except specified tabs
   - Right-click context menu: "Skip this tab in rotation"
   - Bulk skip operations

3. **UI Indicators:**
   - Visual indicator on skipped tabs (badge or icon)
   - Skip count in popup ("Rotating 5 of 12 tabs")
   - Quick view of all skip rules

#### Technical Approach
- `SkipRuleEngine` class for rule evaluation
- Store rules in `skipRules` array with type and pattern
- Filter tabs before rotation in `tab-switcher.ts`
- Tab context menu via `chrome.contextMenus` API
- Performance: Pre-compile regex patterns, cache results

---

### Feature 3: Tab Grouping & Categorization

**Description:** Create named groups of tabs with independent rotation settings.

#### User Stories
- As a user, I want to group related tabs (e.g., "Work", "Personal", "Research")
- As a user, I want each group to have different rotation intervals
- As a user, I want to rotate only within a specific group
- As a user, I want to switch between groups easily

#### Capabilities
1. **Tab Groups:**
   - Named groups with custom colors/icons
   - Multiple tabs per group
   - Tabs can belong to multiple groups (tags approach)
   - Chrome native tab groups integration option

2. **Group Settings:**
   - Per-group rotation interval
   - Per-group rotation pattern
   - Per-group skip rules
   - Enable/disable entire groups

3. **Group Management:**
   - Visual group builder with drag-and-drop
   - Quick group assignment via context menu
   - Group templates (e.g., "Social Media", "Development")
   - Automatic grouping by domain

4. **Group Rotation Modes:**
   - **Within Group:** Rotate only tabs in active group
   - **Between Groups:** Rotate through all groups, one tab at a time
   - **Sequential Groups:** Cycle through all tabs in Group A, then Group B, etc.
   - **Independent:** Each group rotates independently with own timer

#### Technical Approach
- `TabGroup` interface with metadata
- `GroupManager` class to manage group lifecycle
- Store groups in `tabGroups` array with tab matchers
- New `GroupRotationEngine` for group-aware rotation
- Integration with Chrome's native `chrome.tabGroups` API
- Multiple timer support for independent group rotation

---

### Feature 4: Different Intervals for Different Windows

**Description:** Each browser window can have its own rotation interval.

#### User Stories
- As a user, I want my main monitor to rotate every 5 seconds
- As a user, I want my secondary monitor to rotate every 30 seconds
- As a user, I want to set different intervals without switching modes

#### Capabilities
1. **Per-Window Intervals:**
   - Override global interval for specific windows
   - Quick interval adjustment in popup (when focused on that window)
   - Visual indicator showing current window's interval

2. **Interval Presets:**
   - Quick presets: "Very Fast (2s)", "Fast (5s)", "Normal (10s)", "Slow (30s)", "Very Slow (60s)"
   - Custom interval per window
   - Inherit global interval option

3. **Window Profiles:**
   - Save window configuration as profile
   - Auto-apply profiles based on window size/position
   - Profile templates (e.g., "Monitor 1", "Monitor 2", "Laptop Screen")

#### Technical Approach
- Extend `WindowState` interface with `customDelayTime?: number`
- Update `window-timer-manager.ts` to use per-window delays
- Fallback to global `delayTime` if not set
- UI shows "Global (10s)" vs "Custom (5s)" indicator
- **Note:** This partially exists in Window Mode, but needs UI exposure

---

### Feature 5: Advanced Scheduling

**Description:** Automatically enable/disable rotation or change settings based on time and day.

#### User Stories
- As a user, I want rotation active only during business hours (9 AM - 5 PM)
- As a user, I want different intervals on weekdays vs weekends
- As a user, I want rotation to pause during my lunch break
- As a user, I want rotation to auto-resume after scheduled downtime

#### Capabilities
1. **Time-Based Schedules:**
   - Daily schedules with start/end times
   - Weekday vs weekend schedules
   - Specific day-of-week schedules
   - Date range schedules (e.g., "During vacation")

2. **Scheduled Actions:**
   - Enable/disable rotation
   - Change rotation interval
   - Switch rotation pattern
   - Activate specific tab groups
   - Change switching mode (Global/Window)

3. **Schedule Types:**
   - **Business Hours:** Auto-enable during work hours
   - **Focus Time:** Disable during focus blocks
   - **Monitoring Mode:** Different settings for monitoring dashboards
   - **Off-Hours:** Lower rotation speed outside business hours

4. **Schedule Management:**
   - Visual weekly calendar editor
   - Multiple schedules (priority-based)
   - One-time vs recurring schedules
   - Holiday/exception handling

#### Technical Approach
- `Schedule` interface with time ranges and actions
- `ScheduleManager` class with cron-like evaluation
- Background worker checks schedule every minute via alarm
- Store schedules in `schedules` array
- Use timezone-aware `Date` calculations
- Priority system: Manual override > Schedule > Default
- Visual timeline UI component for schedule editor

---

### Feature 6: Import/Export Configuration

**Description:** Save and share complete extension configurations including all premium settings.

#### User Stories
- As a user, I want to backup my configuration before making changes
- As a user, I want to share my setup with team members
- As a user, I want to sync settings across multiple machines
- As a user, I want to export only specific parts of my config (e.g., just tab groups)

#### Capabilities
1. **Export Options:**
   - Full configuration export (all settings)
   - Partial export (select specific sections)
   - Export formats: JSON, YAML (for readability)
   - Export includes: Settings, groups, rules, schedules, patterns

2. **Import Options:**
   - Full import (replace all settings)
   - Merge import (combine with existing)
   - Selective import (choose sections to import)
   - Import preview before applying
   - Validation with error reporting

3. **Configuration Sections:**
   - Basic Settings (interval, mode, pause settings)
   - Tab Groups & Categories
   - Skip Rules
   - Rotation Patterns
   - Schedules
   - Window Configurations
   - Per-Window States (optional)

4. **Advanced Features:**
   - Configuration versioning
   - Automatic backup before import
   - Configuration templates (starter packs)
   - Cloud sync option (via user's storage)
   - Configuration URL sharing (base64 encoded)

#### Technical Approach
- `ConfigManager` class for import/export logic
- `ConfigSchema` versioning (v1, v2, etc.)
- JSON Schema validation for imports
- Migration functions for version upgrades
- Export sanitization (remove sensitive data like specific URLs if requested)
- Import preview diff viewer
- File download/upload via browser APIs
- Optional: Chrome sync storage for cloud sync

---

## Architecture Design

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Background Service Worker                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ Rotation     │  │ Schedule     │  │ Group            │  │
│  │ Engine       │  │ Manager      │  │ Manager          │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ Skip Rule    │  │ Pattern      │  │ Config           │  │
│  │ Engine       │  │ Resolver     │  │ Manager          │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                   ┌──────────────────────┐
                   │   Chrome Storage     │
                   │  (Local + Sync)      │
                   └──────────────────────┘
                              │
                              ▼
        ┌────────────────────────────────────────┐
        │              UI Layer                   │
        │  ┌────────┐  ┌────────┐  ┌──────────┐ │
        │  │ Popup  │  │Options │  │ Groups   │ │
        │  │        │  │ Page   │  │ Manager  │ │
        │  └────────┘  └────────┘  └──────────┘ │
        └────────────────────────────────────────┘
```

### New Core Modules

#### 1. Rotation Engine (`src/core/rotation-engine.ts`)
Handles all rotation pattern logic.

```typescript
class RotationEngine {
  // Get next tab based on current pattern
  getNextTab(tabs: Tab[], currentTab: Tab, pattern: RotationPattern): Tab;

  // Evaluate pattern and return tab sequence
  resolvePattern(tabs: Tab[], pattern: RotationPattern): number[];

  // Apply skip rules to tab list
  applySkipRules(tabs: Tab[], rules: SkipRule[]): Tab[];
}
```

#### 2. Skip Rule Engine (`src/core/skip-rule-engine.ts`)
Evaluates skip rules against tabs.

```typescript
class SkipRuleEngine {
  // Check if tab should be skipped
  shouldSkip(tab: Tab, rules: SkipRule[]): boolean;

  // Add skip rule
  addRule(rule: SkipRule): void;

  // Remove skip rule
  removeRule(ruleId: string): void;

  // Validate rule pattern
  validateRule(rule: SkipRule): boolean;
}
```

#### 3. Group Manager (`src/core/group-manager.ts`)
Manages tab groups and group-based rotation.

```typescript
class GroupManager {
  // Get all groups
  getGroups(): Promise<TabGroup[]>;

  // Create new group
  createGroup(group: TabGroup): Promise<string>;

  // Add tab to group
  addTabToGroup(tabId: number, groupId: string): Promise<void>;

  // Get tabs in group
  getGroupTabs(groupId: string): Promise<Tab[]>;

  // Get active group
  getActiveGroup(windowId: number): Promise<TabGroup | null>;
}
```

#### 4. Schedule Manager (`src/core/schedule-manager.ts`)
Handles time-based automation.

```typescript
class ScheduleManager {
  // Initialize schedule checker
  initialize(): void;

  // Evaluate current schedules
  evaluateSchedules(): Promise<ScheduledAction[]>;

  // Apply scheduled action
  applyAction(action: ScheduledAction): Promise<void>;

  // Add new schedule
  addSchedule(schedule: Schedule): Promise<string>;

  // Check if schedule is active now
  isScheduleActive(schedule: Schedule): boolean;
}
```

#### 5. Config Manager (`src/core/config-manager.ts`)
Import/export functionality.

```typescript
class ConfigManager {
  // Export configuration
  exportConfig(options: ExportOptions): Promise<ConfigExport>;

  // Import configuration
  importConfig(config: ConfigExport, mode: 'replace' | 'merge'): Promise<ImportResult>;

  // Validate configuration
  validateConfig(config: ConfigExport): ValidationResult;

  // Create configuration backup
  createBackup(): Promise<ConfigBackup>;
}
```

---

## Data Structures & Type Definitions

### Extended StorageData Interface

```typescript
// src/core/types.ts

export interface StorageData {
  // Existing fields...
  delayTime?: number;
  enabled?: boolean;
  switchingMode?: SwitchingMode;
  windowStates?: { [windowId: number]: WindowState };
  pauseOnActivity?: boolean;
  pauseDuration?: number;
  manuallyPaused?: boolean;
  manuallyPausedWindows?: { [windowId: number]: boolean };
  lastSwitchTimes?: { [windowId: number]: number };
  enableOnStartup?: boolean;
  hasSeenOnboarding?: boolean;

  // NEW: Premium Features

  // Feature 1: Rotation Patterns
  rotationPatterns?: { [patternId: string]: RotationPattern };
  activePattern?: string; // Pattern ID or 'sequential' (default)
  windowPatterns?: { [windowId: number]: string }; // Per-window pattern override

  // Feature 2: Skip Rules
  skipRules?: SkipRule[];
  skipPinnedTabs?: boolean;

  // Feature 3: Tab Groups
  tabGroups?: TabGroup[];
  activeGroupId?: string; // Currently active group
  groupRotationMode?: GroupRotationMode;
  windowActiveGroups?: { [windowId: number]: string }; // Per-window active group

  // Feature 4: Per-Window Intervals (extend existing WindowState)
  // Already supported in windowStates, needs UI exposure

  // Feature 5: Schedules
  schedules?: Schedule[];
  schedulesEnabled?: boolean;
  lastScheduleCheck?: number;

  // Feature 6: Config Management
  configVersion?: string; // e.g., "2.0.0"
  lastBackupTime?: number;
  autoBackupEnabled?: boolean;

  // Premium license (for future use)
  premiumEnabled?: boolean;
  licenseKey?: string;
}

/**
 * Extended window state with per-window interval
 */
export interface WindowState {
  enabled: boolean;
  enabledTimestamp?: number;
  lastSwitchTime?: number;
  customDelayTime?: number; // NEW: Per-window interval override
}

/**
 * Rotation pattern definition
 */
export interface RotationPattern {
  id: string;
  name: string;
  type: 'sequential' | 'reverse' | 'random' | 'pinned-first' | 'custom';
  description?: string;

  // For custom patterns: array of tab indices or URL patterns
  customOrder?: Array<number | string>;

  // Pattern options
  options?: {
    shuffleDaily?: boolean; // Re-randomize daily for random patterns
    respectPinned?: boolean; // Keep pinned tabs first
    loopMode?: 'circular' | 'bounce'; // Circular or ping-pong
  };

  // Metadata
  createdAt?: number;
  updatedAt?: number;
}

/**
 * Skip rule definition
 */
export interface SkipRule {
  id: string;
  type: 'url' | 'domain' | 'regex' | 'title' | 'pinned';
  pattern: string; // URL, domain, regex, or title pattern
  enabled: boolean;
  description?: string;

  // Advanced options
  matchOptions?: {
    caseSensitive?: boolean;
    exactMatch?: boolean;
  };

  createdAt?: number;
}

/**
 * Tab group definition
 */
export interface TabGroup {
  id: string;
  name: string;
  color?: string; // Hex color or preset name
  icon?: string; // Emoji or icon identifier

  // Group membership rules
  tabs: TabMatcher[]; // Rules to match tabs to this group

  // Group settings
  settings: {
    customDelayTime?: number; // Override rotation interval
    rotationPatternId?: string; // Override rotation pattern
    skipRules?: string[]; // Additional skip rule IDs
    enabled?: boolean; // Group can be temporarily disabled
  };

  // Group behavior
  rotationMode?: 'within' | 'independent'; // Rotate within group or independent timer

  // Metadata
  createdAt?: number;
  updatedAt?: number;
}

/**
 * Tab matcher for group membership
 */
export interface TabMatcher {
  type: 'url' | 'domain' | 'regex' | 'title' | 'manual';
  pattern?: string; // For pattern-based matching
  tabIds?: number[]; // For manual tab assignment
}

/**
 * Group rotation mode
 */
export type GroupRotationMode =
  | 'within-group'    // Rotate only within active group
  | 'between-groups'  // Rotate through all groups
  | 'sequential-groups' // Complete each group before moving to next
  | 'independent';    // Each group rotates independently

/**
 * Schedule definition
 */
export interface Schedule {
  id: string;
  name: string;
  enabled: boolean;

  // Time criteria
  timeRange?: {
    start: string; // HH:MM format
    end: string;   // HH:MM format
  };

  // Day criteria
  daysOfWeek?: number[]; // 0-6 (Sunday-Saturday)
  dateRange?: {
    start: string; // ISO date
    end: string;   // ISO date
  };

  // Schedule type
  type: 'recurring' | 'one-time';

  // Actions to perform when schedule is active
  actions: ScheduledAction[];

  // Priority (higher number = higher priority)
  priority?: number;

  // Metadata
  createdAt?: number;
  updatedAt?: number;
}

/**
 * Scheduled action
 */
export interface ScheduledAction {
  type: 'enable' | 'disable' | 'set-interval' | 'set-pattern' | 'set-group' | 'set-mode';

  // Action parameters
  params?: {
    enabled?: boolean;
    delayTime?: number;
    patternId?: string;
    groupId?: string;
    switchingMode?: SwitchingMode;
    windowId?: number; // Apply to specific window only
  };
}

/**
 * Configuration export format
 */
export interface ConfigExport {
  version: string; // Config schema version
  exportDate: number; // Timestamp

  // Sections
  settings?: {
    delayTime?: number;
    switchingMode?: SwitchingMode;
    pauseOnActivity?: boolean;
    pauseDuration?: number;
    enableOnStartup?: boolean;
  };

  rotationPatterns?: RotationPattern[];
  skipRules?: SkipRule[];
  tabGroups?: TabGroup[];
  schedules?: Schedule[];
  windowConfigurations?: { [windowId: number]: WindowState };

  // Metadata
  metadata?: {
    extensionVersion?: string;
    browser?: string;
    os?: string;
    exportedBy?: string; // User identifier (optional)
  };
}

/**
 * Import result
 */
export interface ImportResult {
  success: boolean;
  errors?: string[];
  warnings?: string[];
  imported: {
    settings?: boolean;
    patterns?: number; // Count
    skipRules?: number;
    tabGroups?: number;
    schedules?: number;
  };
}

/**
 * Export options
 */
export interface ExportOptions {
  includeSettings?: boolean;
  includePatterns?: boolean;
  includeSkipRules?: boolean;
  includeTabGroups?: boolean;
  includeSchedules?: boolean;
  includeWindowStates?: boolean;
  format?: 'json' | 'yaml';
}
```

---

## UI/UX Design

### Popup UI Enhancements

**Current Layout:** Simple enable/disable with countdown timer

**Enhanced Layout:**
```
┌─────────────────────────────────────┐
│  AutoTabSwitcher Premium      [⚙️]  │
├─────────────────────────────────────┤
│                                     │
│     ⏱️  Next switch in 7s           │
│     ╭──────────────╮                │
│     │  ●●●●●●○○○○  │  (SVG circle)  │
│     ╰──────────────╯                │
│                                     │
│  Pattern: [Custom Workflow ▼]      │
│  Group:   [Work Tabs ▼]            │
│  Interval: [5 seconds ▼]           │
│                                     │
│  ┌───────────┐  ┌──────────┐       │
│  │ ▶️ Enable │  │ ⏸️ Pause  │       │
│  └───────────┘  └──────────┘       │
│                                     │
│  📊 Active: 8 of 12 tabs            │
│  🔇 Skipped: 4 tabs                 │
│                                     │
│  [🎯 Manage Groups]  [📅 Schedule]  │
└─────────────────────────────────────┘
```

**Key Changes:**
- Pattern selector dropdown
- Active group selector
- Quick interval override
- Status indicators (active/skipped tab count)
- Quick access to groups and schedules

---

### Options Page - New Sections

**Navigation Tabs:**
1. **Basic** (existing)
2. **Patterns** (new)
3. **Skip Rules** (new)
4. **Groups** (new)
5. **Schedules** (new)
6. **Import/Export** (new)

#### Patterns Tab

```
┌─────────────────────────────────────────────────────────┐
│ Rotation Patterns                         [+ New Pattern]│
├─────────────────────────────────────────────────────────┤
│                                                           │
│ ● Sequential (Default)                          [Active] │
│   Rotate tabs from left to right                         │
│                                                           │
│ ● Custom Workflow                             [Edit][✓] │
│   Dashboard → Analytics → Logs → Monitoring              │
│   Created: 2025-12-01                                    │
│                                                           │
│ ● Random Rotation                             [Edit][ ] │
│   Random tab selection each switch                       │
│   Shuffle daily: Yes                                     │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

**Pattern Editor (Modal):**
- Visual tab list with drag-and-drop
- Tab preview (favicon + title)
- Pattern type selector
- Options: Loop mode, respect pinned, shuffle settings

---

#### Skip Rules Tab

```
┌─────────────────────────────────────────────────────────┐
│ Skip Rules                                  [+ Add Rule] │
├─────────────────────────────────────────────────────────┤
│                                                           │
│ ✓ Skip email tabs                          [Edit][Delete]│
│   Type: Domain | Pattern: mail.google.com                │
│                                                           │
│ ✓ Skip pinned tabs                         [Edit][Delete]│
│   Type: Pinned | All pinned tabs                         │
│                                                           │
│ ☐ Skip YouTube                             [Edit][Delete]│
│   Type: Domain | Pattern: *.youtube.com                  │
│   Status: Disabled                                        │
│                                                           │
│ ─────────────────────────────────────────────────────────│
│ Quick Actions:                                            │
│   [Skip all pinned tabs] [Skip current tab]              │
└─────────────────────────────────────────────────────────┘
```

**Add Rule Dialog:**
- Rule type selector (URL, Domain, Regex, Title, Pinned)
- Pattern input with validation
- Match options (case sensitive, exact match)
- Test against current tabs (live preview)

---

#### Groups Tab

```
┌─────────────────────────────────────────────────────────┐
│ Tab Groups                                [+ New Group]  │
├─────────────────────────────────────────────────────────┤
│                                                           │
│ 🔵 Work Tabs (8 tabs)                      [Active][Edit]│
│    Interval: 5s | Pattern: Sequential                    │
│    github.com, jira.com, slack.com, ...                  │
│                                                           │
│ 🟢 Social Media (4 tabs)                   [Edit][✓]    │
│    Interval: 10s | Pattern: Random                       │
│    twitter.com, linkedin.com, ...                        │
│                                                           │
│ 🟡 Monitoring (6 tabs)                     [Edit][ ]    │
│    Interval: 2s | Pattern: Dashboard Flow                │
│    grafana.local, prometheus.local, ...                  │
│                                                           │
│ ─────────────────────────────────────────────────────────│
│ Rotation Mode: [Within Active Group ▼]                   │
│ Active Group: [Work Tabs ▼]                              │
└─────────────────────────────────────────────────────────┘
```

**Group Editor:**
- Group name and color picker
- Icon selector (emoji or presets)
- Tab matcher builder (domain, URL, regex, manual selection)
- Group settings (interval, pattern, skip rules)
- Live preview of matched tabs

---

#### Schedules Tab

```
┌─────────────────────────────────────────────────────────┐
│ Schedules                               [+ New Schedule] │
├─────────────────────────────────────────────────────────┤
│                                                           │
│ Visual Weekly Calendar                                   │
│ ┌─────────────────────────────────────────────────────┐ │
│ │     Mon   Tue   Wed   Thu   Fri   Sat   Sun         │ │
│ │ 08  ███████████████████████████████│    │   │  Business│
│ │ 12  │   │   │   │   │   │   │    └─Lunch │   │  Hours│
│ │ 17  ███████████████████████████████│    │   │         │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                           │
│ Active Schedules:                                         │
│                                                           │
│ ✓ Business Hours (Mon-Fri, 9AM-5PM)     [Edit][Delete]  │
│   → Enable rotation, Set interval: 5s                    │
│   Priority: 10                                            │
│                                                           │
│ ✓ Lunch Break (Mon-Fri, 12PM-1PM)       [Edit][Delete]  │
│   → Disable rotation                                     │
│   Priority: 20 (higher priority)                         │
│                                                           │
│ ☐ Weekend Monitoring (Sat-Sun)          [Edit][Delete]  │
│   → Set pattern: Monitoring, Interval: 30s               │
│   Status: Disabled                                        │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

**Schedule Editor:**
- Time range picker (start/end)
- Day selector (weekdays, weekends, specific days)
- Date range for one-time schedules
- Action builder (enable, set interval, change pattern, etc.)
- Priority slider
- Visual timeline preview

---

#### Import/Export Tab

```
┌─────────────────────────────────────────────────────────┐
│ Configuration Management                                 │
├─────────────────────────────────────────────────────────┤
│                                                           │
│ Export Configuration                                      │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Select sections to export:                          │ │
│ │ ☑ Basic Settings                                    │ │
│ │ ☑ Rotation Patterns (3)                             │ │
│ │ ☑ Skip Rules (4)                                    │ │
│ │ ☑ Tab Groups (3)                                    │ │
│ │ ☑ Schedules (2)                                     │ │
│ │ ☐ Window States (per-window settings)              │ │
│ │                                                      │ │
│ │ Format: ◉ JSON  ○ YAML                              │ │
│ │                                                      │ │
│ │ [Export to File] [Copy to Clipboard] [Get URL]     │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                           │
│ Import Configuration                                      │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ [Choose File] or drag & drop JSON/YAML file here   │ │
│ │                                                      │ │
│ │ Import Mode:                                         │ │
│ │ ◉ Merge with existing (recommended)                 │ │
│ │ ○ Replace all settings (destructive)                │ │
│ │                                                      │ │
│ │ [Preview Import] [Import Configuration]             │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                           │
│ Backups                                                   │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Auto-backup: [Enabled ▼]  Before each import        │ │
│ │                                                      │ │
│ │ Recent backups:                                      │ │
│ │ • 2026-01-11 14:30 - Pre-import backup  [Restore]   │ │
│ │ • 2026-01-10 09:15 - Manual backup      [Restore]   │ │
│ │ • 2026-01-08 16:45 - Pre-import backup  [Restore]   │ │
│ │                                                      │ │
│ │ [Create Manual Backup] [Clear Old Backups]          │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                           │
│ Templates                                                 │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Quick start with pre-configured setups:             │ │
│ │ [Developer Workflow] [Social Media] [Monitoring]    │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

### Context Menus

**Tab Context Menu (Right-click on tab):**
- Skip this tab in rotation
- Add to group →
  - Work Tabs
  - Social Media
  - Monitoring
  - + New Group
- Set as rotation start point

**Extension Icon Context Menu:**
- Enable/Disable (quick toggle)
- Pause for 5 minutes
- Change pattern →
- Change group →
- Open settings

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1-2)

**Goal:** Set up architecture for premium features

#### Tasks
1. **Type Definitions**
   - Create extended type definitions in `types.ts`
   - Add new interfaces for patterns, rules, groups, schedules
   - Version config schema

2. **Storage Migration**
   - Create migration script for v2.0.0
   - Add backward compatibility layer
   - Test migration with existing user data

3. **Core Modules Skeleton**
   - Create empty classes: RotationEngine, SkipRuleEngine, GroupManager, ScheduleManager, ConfigManager
   - Set up module exports and imports
   - Add basic initialization logic

4. **Testing Infrastructure**
   - Set up test files for new modules
   - Create mock data generators
   - Add integration test framework

**Deliverables:**
- ✅ Extended type definitions
- ✅ Migration scripts
- ✅ Core module files created
- ✅ Test infrastructure ready

---

### Phase 2: Skip Rules (Week 3)

**Goal:** Implement simplest premium feature first

#### Tasks
1. **SkipRuleEngine Implementation**
   - URL matching logic
   - Domain pattern matching
   - Regex support with error handling
   - Title matching
   - Pinned tab detection

2. **Storage Integration**
   - Save/load skip rules from storage
   - Rule CRUD operations
   - Rule validation

3. **Tab Filtering**
   - Integrate with `tab-switcher.ts`
   - Filter tabs before rotation
   - Handle edge cases (all tabs skipped)

4. **UI - Skip Rules Tab**
   - Create skip rules management page
   - Add rule form with validation
   - Rule list with enable/disable toggles
   - Delete confirmation dialog

5. **Context Menu**
   - Add "Skip this tab" context menu item
   - Quick rule creation from context menu

6. **Testing**
   - Unit tests for rule matching
   - Integration tests with tab switcher
   - UI tests for rule management

**Deliverables:**
- ✅ Fully functional skip rules
- ✅ UI for rule management
- ✅ Context menu integration
- ✅ 100% test coverage

---

### Phase 3: Custom Rotation Patterns (Week 4-5)

**Goal:** Enable custom tab rotation orders

#### Tasks
1. **RotationEngine Implementation**
   - Sequential pattern (default)
   - Reverse pattern
   - Random pattern with seeding
   - Pinned-first pattern
   - Custom order pattern

2. **Pattern Resolver**
   - Convert patterns to tab indices
   - Handle dynamic tab lists (tabs added/removed)
   - Cache pattern resolution results

3. **Storage Integration**
   - Save/load rotation patterns
   - Pattern CRUD operations
   - Set active pattern globally/per-window

4. **Tab Switcher Integration**
   - Modify `tab-switcher.ts` to use RotationEngine
   - Respect current pattern when switching
   - Handle pattern changes mid-rotation

5. **UI - Patterns Tab**
   - Pattern list view
   - Pattern creation wizard
   - Visual pattern editor (drag-and-drop would be Phase 4)
   - Pattern type selector

6. **Popup Enhancement**
   - Add pattern selector dropdown
   - Show current active pattern
   - Quick pattern switching

7. **Testing**
   - Unit tests for all pattern types
   - Edge case tests (empty tabs, single tab)
   - Integration tests with tab switcher

**Deliverables:**
- ✅ All pattern types working
- ✅ Pattern management UI
- ✅ Popup pattern selector
- ✅ Comprehensive tests

---

### Phase 4: Per-Window Intervals (Week 6)

**Goal:** Enable different intervals for different windows

#### Tasks
1. **WindowState Extension**
   - Already has `customDelayTime` in design
   - Add UI to set/clear per-window intervals

2. **Window Timer Manager Update**
   - Use `customDelayTime` from WindowState
   - Fallback to global `delayTime`
   - Update timer when interval changes

3. **UI - Options Page**
   - Add per-window interval section
   - Window list with interval overrides
   - Quick interval presets

4. **UI - Popup**
   - Show current window's interval
   - Quick interval adjustment
   - Indicator: "Global (10s)" vs "Custom (5s)"

5. **Testing**
   - Test per-window intervals
   - Test fallback to global
   - Test window creation/deletion

**Deliverables:**
- ✅ Per-window interval support
- ✅ UI for interval management
- ✅ Popup interval display
- ✅ Tests passing

---

### Phase 5: Tab Groups (Week 7-9)

**Goal:** Implement sophisticated tab grouping

#### Tasks
1. **GroupManager Implementation**
   - Group CRUD operations
   - Tab matcher evaluation (domain, URL, regex, manual)
   - Get tabs belonging to group
   - Active group management

2. **Group-Aware Rotation**
   - Within-group rotation mode
   - Between-groups rotation mode
   - Sequential-groups rotation mode
   - Independent group timers

3. **Storage Integration**
   - Save/load tab groups
   - Group settings per group
   - Active group state

4. **Tab Switcher Integration**
   - Check group rotation mode
   - Filter tabs by active group
   - Route to appropriate rotation logic

5. **UI - Groups Tab**
   - Group list view
   - Group creation/edit dialog
   - Tab matcher builder
   - Color and icon picker
   - Live preview of matched tabs

6. **UI - Popup**
   - Active group selector
   - Quick group switching
   - Group status indicator

7. **Context Menu**
   - "Add to group" submenu
   - Quick group assignment

8. **Chrome Tab Groups Integration** (Optional)
   - Sync with native Chrome tab groups
   - Auto-create groups from native groups
   - Bidirectional sync

9. **Testing**
   - Unit tests for group matching
   - Integration tests for all rotation modes
   - UI tests for group management

**Deliverables:**
- ✅ Full tab grouping functionality
- ✅ All rotation modes working
- ✅ Comprehensive UI
- ✅ Context menu integration
- ✅ Tests passing

---

### Phase 6: Advanced Scheduling (Week 10-11)

**Goal:** Time-based automation

#### Tasks
1. **ScheduleManager Implementation**
   - Schedule evaluation engine
   - Time range checking (with timezone awareness)
   - Day of week matching
   - Date range support
   - Priority-based schedule resolution

2. **Scheduled Actions**
   - Enable/disable action
   - Set interval action
   - Set pattern action
   - Set group action
   - Set mode action

3. **Background Worker Integration**
   - Schedule checker alarm (runs every minute)
   - Apply active schedule actions
   - Handle schedule conflicts (priority)
   - Manual override support

4. **Storage Integration**
   - Save/load schedules
   - Schedule CRUD operations
   - Last schedule check timestamp

5. **UI - Schedules Tab**
   - Visual weekly calendar
   - Schedule list view
   - Schedule creation wizard
   - Action builder
   - Priority management

6. **Testing**
   - Unit tests for schedule evaluation
   - Time zone tests
   - Priority conflict tests
   - Integration tests with actions

**Deliverables:**
- ✅ Schedule evaluation engine
- ✅ All scheduled actions working
- ✅ Visual schedule editor
- ✅ Background automation
- ✅ Tests passing

---

### Phase 7: Import/Export (Week 12)

**Goal:** Configuration portability

#### Tasks
1. **ConfigManager Implementation**
   - Export configuration to JSON
   - Import configuration from JSON
   - Configuration validation
   - Version migration support
   - Backup creation

2. **Export Features**
   - Full export
   - Selective export (choose sections)
   - YAML format support (optional)
   - Configuration URL generation (base64 encoded)

3. **Import Features**
   - Full import (replace)
   - Merge import
   - Import preview with diff
   - Validation with detailed errors
   - Automatic backup before import

4. **UI - Import/Export Tab**
   - Export section selector
   - Import file picker with drag-and-drop
   - Import mode selector
   - Preview dialog
   - Backup management

5. **Configuration Templates**
   - Create starter templates
   - Developer workflow template
   - Social media template
   - Monitoring template
   - Template gallery

6. **Testing**
   - Export/import round-trip tests
   - Validation tests
   - Merge logic tests
   - Template loading tests

**Deliverables:**
- ✅ Full import/export functionality
- ✅ Configuration templates
- ✅ Backup system
- ✅ UI for config management
- ✅ Tests passing

---

### Phase 8: Polish & Integration (Week 13-14)

**Goal:** Refinement and cross-feature integration

#### Tasks
1. **Cross-Feature Integration**
   - Groups + Schedules: Schedule group activation
   - Patterns + Groups: Per-group patterns
   - Skip Rules + Groups: Per-group skip rules
   - Schedules + Patterns: Scheduled pattern changes

2. **UI/UX Refinement**
   - Consistent styling across all new pages
   - Accessibility improvements (ARIA labels, keyboard nav)
   - Responsive design for different screen sizes
   - Animations and transitions
   - Help tooltips and onboarding

3. **Performance Optimization**
   - Lazy load heavy components
   - Cache pattern resolutions
   - Optimize storage reads/writes
   - Reduce memory footprint

4. **Documentation**
   - User guide for each premium feature
   - Video tutorials
   - FAQ section
   - Migration guide from v1.x

5. **Testing**
   - End-to-end tests for complete workflows
   - Performance benchmarks
   - Cross-browser testing
   - Load testing with many groups/rules/schedules

**Deliverables:**
- ✅ All features integrated seamlessly
- ✅ Polished UI/UX
- ✅ Complete documentation
- ✅ Performance optimized
- ✅ All tests passing

---

### Phase 9: Beta Testing (Week 15-16)

**Goal:** Real-world validation

#### Tasks
1. **Beta Release**
   - Create beta channel
   - Recruit beta testers
   - Set up feedback collection

2. **Bug Fixes**
   - Triage and fix reported issues
   - Performance tuning based on feedback
   - UX improvements

3. **Edge Case Handling**
   - Handle unusual tab configurations
   - Test with 100+ tabs
   - Test with 10+ windows
   - Test with many groups/schedules

4. **Migration Testing**
   - Test upgrade from v1.x with real user data
   - Ensure zero data loss
   - Backward compatibility verification

**Deliverables:**
- ✅ Beta release published
- ✅ User feedback collected
- ✅ Critical bugs fixed
- ✅ Production-ready code

---

### Phase 10: Launch (Week 17)

**Goal:** Public release of v2.0.0

#### Tasks
1. **Final QA**
   - Complete regression testing
   - Security audit
   - Privacy review
   - Performance validation

2. **Release Preparation**
   - Update changelog
   - Prepare release notes
   - Create marketing materials
   - Update Chrome Web Store listing

3. **Launch**
   - Publish to Chrome Web Store
   - Announce on social media
   - Email existing users
   - Monitor for issues

4. **Post-Launch**
   - Monitor error reports
   - Quick hotfix capability
   - User support

**Deliverables:**
- ✅ v2.0.0 released to production
- ✅ Zero critical bugs
- ✅ Positive user reception
- ✅ Support infrastructure ready

---

## Technical Considerations

### 1. Performance

**Concerns:**
- Multiple tab groups with independent timers could create many alarms
- Complex skip rules with regex could slow down tab filtering
- Large configuration files could slow down import/export

**Solutions:**
- Limit maximum number of independent group timers (e.g., 10)
- Cache compiled regex patterns
- Pre-compile skip rules at load time
- Lazy load configuration sections
- Use indexed structures for fast lookups
- Debounce storage writes

**Benchmarks:**
- Tab switching should remain < 50ms
- Skip rule evaluation < 10ms per tab
- Schedule evaluation < 100ms
- UI interactions < 16ms (60fps)

---

### 2. Storage Limits

**Chrome Storage Limits:**
- `chrome.storage.local`: 10MB total
- `chrome.storage.sync`: 100KB total (8KB per item)

**Strategy:**
- Use `storage.local` for all premium data
- Monitor storage usage
- Warn user at 80% capacity
- Provide cleanup tools
- Compress exported configurations

**Estimated Storage Usage:**
- Skip rules: ~500 bytes each × 50 rules = 25KB
- Rotation patterns: ~1KB each × 20 patterns = 20KB
- Tab groups: ~2KB each × 10 groups = 20KB
- Schedules: ~1KB each × 20 schedules = 20KB
- Total: ~85KB for typical usage (< 1% of limit)

---

### 3. Backward Compatibility

**Requirements:**
- v2.0 must not break existing v1.x users
- Automatic migration of v1.x settings
- Fallback to default behavior if premium features fail

**Migration Strategy:**
1. Detect v1.x data on first run of v2.0
2. Run migration script to convert old structure
3. Keep old fields for rollback capability
4. Add `configVersion` field to track schema version
5. Future migrations use version-specific migration functions

**Rollback Plan:**
- Keep v1.x compatible fields populated
- User can disable premium features
- Export configuration before major updates

---

### 4. Edge Cases

**Scenarios to Handle:**

1. **All tabs skipped by rules**
   - Warn user in UI
   - Provide "Reset skip rules" button
   - Log warning in diagnostics

2. **No tabs match active group**
   - Fall back to all tabs
   - Warn user that group is empty
   - Suggest adjusting group matchers

3. **Conflicting schedules**
   - Use priority system
   - Higher priority wins
   - Log conflicts in diagnostics
   - UI shows active schedule

4. **Invalid regex in skip rules**
   - Validate at creation time
   - Catch errors and disable rule
   - Show error in UI
   - Provide regex tester tool

5. **Service worker suspension during complex rotation**
   - Store rotation state in storage
   - Resume from last known state
   - Re-evaluate current pattern

6. **Tab created/closed during pattern execution**
   - Invalidate pattern cache
   - Re-resolve pattern on next switch
   - Handle index out of bounds gracefully

7. **Window closed with active timers**
   - Clean up window-specific timers
   - Remove window state from storage
   - Update UI if popup is open

8. **Import of incompatible configuration**
   - Validate schema before import
   - Show detailed error messages
   - Allow partial import (skip invalid sections)
   - Don't corrupt existing data

---

### 5. Security & Privacy

**Considerations:**

1. **Skip rules contain URLs**
   - Sanitize before logging
   - Don't send to analytics
   - Encrypt exported configs (optional)

2. **Tab titles may contain sensitive info**
   - Don't log full titles in diagnostics
   - Truncate or hash in logs
   - Clear option for paranoid users

3. **Configuration export**
   - Warn user about sensitive data
   - Option to exclude URLs/titles from export
   - Sanitize exported data

4. **Regex patterns could be malicious**
   - Timeout regex execution (prevent ReDoS)
   - Validate patterns before saving
   - Catch and handle regex errors

5. **Storage permissions**
   - Only request necessary permissions
   - Explain permission usage to users

**Privacy Policy Updates:**
- All data stored locally
- No data sent to external servers
- Export/import is user-initiated
- No tracking or analytics on premium features

---

### 6. Testing Strategy

**Unit Tests:**
- Each core module 100% coverage
- Test all pattern types
- Test all skip rule types
- Test schedule evaluation
- Test import/export round-trips

**Integration Tests:**
- Full rotation flows
- Cross-feature interactions
- Storage migrations
- Background worker behavior

**UI Tests:**
- User interactions
- Form validation
- Error handling
- Responsive design

**Performance Tests:**
- Benchmark tab switching speed
- Stress test with 100+ tabs
- Multiple groups with independent timers
- Large configuration import

**Manual Tests:**
- Real-world usage scenarios
- Beta tester feedback
- Cross-browser testing (Chrome, Edge, Brave)
- Different OS environments

---

### 7. Accessibility

**Requirements:**
- WCAG 2.1 Level AA compliance
- Keyboard navigation for all features
- Screen reader support
- Color contrast compliance
- Focus indicators

**Implementation:**
- ARIA labels on all interactive elements
- Semantic HTML
- Skip links for navigation
- Keyboard shortcuts documented
- High contrast mode support

---

### 8. Internationalization (Future)

**Preparation:**
- Externalize all UI strings
- Use Chrome i18n API
- Design UI for text expansion (RTL support later)
- Date/time formatting with locale awareness

**Initial Release:**
- English only
- Foundation for future translations

---

## Testing Strategy

### Test Coverage Goals

- **Unit Tests:** 90%+ coverage
- **Integration Tests:** All critical paths
- **UI Tests:** All user interactions
- **E2E Tests:** Complete workflows

### Test Files Structure

```
src/__tests__/
├── core/
│   ├── rotation-engine.test.ts
│   ├── skip-rule-engine.test.ts
│   ├── group-manager.test.ts
│   ├── schedule-manager.test.ts
│   └── config-manager.test.ts
├── integration/
│   ├── rotation-with-skip.test.ts
│   ├── groups-with-patterns.test.ts
│   ├── schedules-with-groups.test.ts
│   └── import-export.test.ts
├── ui/
│   ├── patterns-tab.test.ts
│   ├── skip-rules-tab.test.ts
│   ├── groups-tab.test.ts
│   ├── schedules-tab.test.ts
│   └── import-export-tab.test.ts
└── performance/
    ├── rotation-benchmark.test.ts
    ├── storage-benchmark.test.ts
    └── ui-responsiveness.test.ts
```

### Key Test Scenarios

1. **Skip Rules**
   - URL exact match
   - Domain wildcard match
   - Regex pattern match
   - Title match
   - Pinned tab skip
   - All tabs skipped error case

2. **Rotation Patterns**
   - Sequential forward/reverse
   - Random with seed consistency
   - Pinned-first logic
   - Custom order with missing tabs
   - Pattern change mid-rotation

3. **Tab Groups**
   - Domain matcher
   - URL matcher
   - Manual tab assignment
   - Within-group rotation
   - Between-groups rotation
   - Independent group timers

4. **Schedules**
   - Time range matching
   - Day of week matching
   - Priority resolution
   - Multiple schedules active
   - Schedule enable/disable
   - Timezone handling

5. **Import/Export**
   - Full export/import round-trip
   - Partial export
   - Merge import
   - Invalid config rejection
   - Version migration
   - Backup creation

---

## Summary

This comprehensive plan outlines a 17-week development roadmap to implement six premium features for AutoTabSwitcher v2.0.0:

1. **Custom Tab Sequences & Rotation Patterns** - Flexible rotation beyond simple sequential
2. **Skip Specific Tabs/Websites** - Fine-grained control over which tabs rotate
3. **Tab Grouping & Categorization** - Organize tabs into logical groups with independent settings
4. **Different Intervals per Window** - Per-window timing customization
5. **Advanced Scheduling** - Time-based automation for different work contexts
6. **Import/Export Configuration** - Configuration portability and backup

### Key Architectural Decisions

- **Additive approach:** Premium features extend existing architecture without breaking changes
- **Modular design:** Each feature is self-contained with clear interfaces
- **Storage-first:** All configuration persisted to survive service worker suspension
- **Performance-conscious:** Caching, optimization, and limits to maintain responsiveness
- **User-friendly:** Complex features with simple defaults and progressive disclosure

### Next Steps

1. **Review this plan** with stakeholders
2. **Prioritize features** if timeline needs adjustment
3. **Begin Phase 1** (Foundation) implementation
4. **Set up project tracking** (GitHub Projects, Jira, etc.)
5. **Create design mockups** for UI components
6. **Establish beta testing program**

### Success Metrics

- Zero breaking changes for existing users
- < 5% increase in service worker memory usage
- 95%+ positive feedback from beta testers
- All core features functional by Week 14
- Launch-ready by Week 17

---

**Document Version:** 1.0
**Last Updated:** 2026-01-11
**Author:** AutoTabSwitcher Development Team
