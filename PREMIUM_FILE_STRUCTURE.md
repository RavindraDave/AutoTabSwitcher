# Premium Features - File Structure Plan

This document outlines all new files that need to be created for the premium features implementation in AutoTabSwitcher v2.0.0.

## Directory Structure Overview

```
AutoTabSwitcher/
├── src/
│   ├── core/                           # Core business logic
│   │   ├── types.ts                    # ✏️ EXTEND - Add premium types
│   │   ├── storage.ts                  # ✏️ EXTEND - Add premium storage helpers
│   │   ├── constants.ts                # ✏️ EXTEND - Add premium constants
│   │   ├── rotation-engine.ts          # ✨ NEW - Feature 1
│   │   ├── skip-rule-engine.ts         # ✨ NEW - Feature 2
│   │   ├── group-manager.ts            # ✨ NEW - Feature 3
│   │   ├── session-manager.ts          # ✨ NEW - Feature 3 (Sessions)
│   │   ├── schedule-manager.ts         # ✨ NEW - Feature 5
│   │   ├── config-manager.ts           # ✨ NEW - Feature 6
│   │   ├── refresh-manager.ts          # ✨ NEW - Feature 7
│   │   └── pattern-resolver.ts         # ✨ NEW - Helper for rotation patterns
│   │
│   ├── background.ts                   # ✏️ EXTEND - Initialize premium features
│   │
│   ├── popup/                          # Popup UI
│   │   ├── index.ts                    # ✏️ EXTEND - Add premium UI elements
│   │   ├── index.html                  # ✏️ EXTEND - Add premium HTML
│   │   └── premium-controls.ts         # ✨ NEW - Premium popup controls
│   │
│   ├── options/                        # Options page
│   │   ├── options.ts                  # ✏️ EXTEND - Add navigation to premium tabs
│   │   ├── options.html                # ✏️ EXTEND - Add premium tabs
│   │   ├── patterns-tab.ts             # ✨ NEW - Rotation patterns UI
│   │   ├── skip-rules-tab.ts           # ✨ NEW - Skip rules UI
│   │   ├── groups-tab.ts               # ✨ NEW - Tab groups UI
│   │   ├── sessions-tab.ts             # ✨ NEW - Session management UI
│   │   ├── schedules-tab.ts            # ✨ NEW - Schedules UI
│   │   ├── refresh-tab.ts              # ✨ NEW - Auto-refresh settings UI
│   │   ├── import-export-tab.ts        # ✨ NEW - Import/export UI
│   │   └── components/                 # ✨ NEW - Reusable UI components
│   │       ├── pattern-editor.ts
│   │       ├── rule-editor.ts
│   │       ├── group-editor.ts
│   │       ├── session-editor.ts       # NEW - Session save/edit UI
│   │       ├── session-launcher.ts     # NEW - Session launch UI
│   │       ├── schedule-editor.ts
│   │       ├── visual-calendar.ts
│   │       ├── refresh-settings.ts     # NEW - Refresh configuration UI
│   │       └── config-preview.ts
│   │
│   ├── css/                            # Stylesheets
│   │   ├── premium.css                 # ✨ NEW - Premium feature styles
│   │   ├── patterns.css                # ✨ NEW - Pattern editor styles
│   │   ├── groups.css                  # ✨ NEW - Groups UI styles
│   │   ├── sessions.css                # ✨ NEW - Sessions UI styles
│   │   ├── schedules.css               # ✨ NEW - Schedule calendar styles
│   │   └── refresh.css                 # ✨ NEW - Refresh settings UI styles
│   │
│   ├── utils/                          # Utility functions
│   │   ├── validation.ts               # ✨ NEW - Validation helpers
│   │   ├── pattern-utils.ts            # ✨ NEW - Pattern manipulation
│   │   ├── time-utils.ts               # ✨ NEW - Time/date utilities
│   │   └── export-utils.ts             # ✨ NEW - Export formatting
│   │
│   └── __tests__/                      # Test files
│       ├── core/
│       │   ├── rotation-engine.test.ts       # ✨ NEW
│       │   ├── skip-rule-engine.test.ts      # ✨ NEW
│       │   ├── group-manager.test.ts         # ✨ NEW
│       │   ├── session-manager.test.ts       # ✨ NEW
│       │   ├── schedule-manager.test.ts      # ✨ NEW
│       │   ├── config-manager.test.ts        # ✨ NEW
│       │   ├── refresh-manager.test.ts       # ✨ NEW
│       │   └── pattern-resolver.test.ts      # ✨ NEW
│       │
│       ├── integration/
│       │   ├── rotation-with-skip.test.ts    # ✨ NEW
│       │   ├── groups-with-patterns.test.ts  # ✨ NEW
│       │   ├── sessions-workflow.test.ts     # ✨ NEW
│       │   ├── refresh-integration.test.ts   # ✨ NEW
│       │   ├── schedules-integration.test.ts # ✨ NEW
│       │   └── import-export.test.ts         # ✨ NEW
│       │
│       ├── ui/
│       │   ├── patterns-tab.test.ts          # ✨ NEW
│       │   ├── skip-rules-tab.test.ts        # ✨ NEW
│       │   ├── groups-tab.test.ts            # ✨ NEW
│       │   ├── sessions-tab.test.ts          # ✨ NEW
│       │   ├── schedules-tab.test.ts         # ✨ NEW
│       │   ├── refresh-tab.test.ts           # ✨ NEW
│       │   └── import-export-tab.test.ts     # ✨ NEW
│       │
│       └── performance/
│           ├── rotation-benchmark.test.ts    # ✨ NEW
│           └── storage-benchmark.test.ts     # ✨ NEW
│
├── docs/                                     # ✨ NEW - Documentation
│   ├── premium-features/
│   │   ├── rotation-patterns.md
│   │   ├── skip-rules.md
│   │   ├── tab-groups.md
│   │   ├── scheduling.md
│   │   ├── import-export.md
│   │   └── getting-started.md
│   │
│   └── api/
│       ├── rotation-engine.md
│       ├── skip-rule-engine.md
│       ├── group-manager.md
│       ├── schedule-manager.md
│       └── config-manager.md
│
├── templates/                                # ✨ NEW - Config templates
│   ├── developer-workflow.json
│   ├── social-media.json
│   ├── monitoring-dashboard.json
│   └── research-mode.json
│
├── PREMIUM_FEATURES_PLAN.md                  # ✅ CREATED - Master plan
├── PREMIUM_TYPES_REFERENCE.ts                # ✅ CREATED - Type definitions reference
└── PREMIUM_FILE_STRUCTURE.md                 # ✅ CREATED - This file
```

---

## Detailed File Descriptions

### Core Business Logic

#### ✨ `src/core/rotation-engine.ts`
**Purpose:** Handles all rotation pattern logic
**Dependencies:** `types.ts`, `storage.ts`, `pattern-resolver.ts`, `skip-rule-engine.ts`
**Size Estimate:** ~400 lines

**Key Classes/Functions:**
- `RotationEngine` class
  - `getNextTab(tabs, currentTab, pattern): Promise<Tab | null>`
  - `resolvePattern(tabs, pattern): Promise<number[]>`
  - `applySkipRules(tabs, rules): Promise<Tab[]>`
  - `getCurrentPattern(windowId?): Promise<RotationPattern>`

**Responsibilities:**
- Evaluate rotation patterns
- Determine next tab in sequence
- Cache pattern resolutions
- Handle dynamic tab changes

---

#### ✨ `src/core/skip-rule-engine.ts`
**Purpose:** Evaluates skip rules against tabs
**Dependencies:** `types.ts`, `storage.ts`
**Size Estimate:** ~300 lines

**Key Classes/Functions:**
- `SkipRuleEngine` class
  - `shouldSkip(tab, rules): Promise<boolean>`
  - `addRule(rule): Promise<void>`
  - `removeRule(ruleId): Promise<void>`
  - `updateRule(ruleId, updates): Promise<void>`
  - `getRules(): Promise<SkipRule[]>`
  - `validateRule(rule): Promise<ValidationResult>`
- `matchUrl(url, pattern, options): boolean`
- `matchDomain(url, domain): boolean`
- `matchRegex(text, pattern, options): boolean`
- `matchTitle(title, pattern, options): boolean`

**Responsibilities:**
- Evaluate skip rules
- URL/domain/regex/title matching
- Rule validation
- Performance: Compile regex patterns once

---

#### ✨ `src/core/group-manager.ts`
**Purpose:** Manages tab groups and group-based rotation
**Dependencies:** `types.ts`, `storage.ts`, `skip-rule-engine.ts`
**Size Estimate:** ~500 lines

**Key Classes/Functions:**
- `GroupManager` class
  - `getGroups(): Promise<TabGroup[]>`
  - `getGroup(groupId): Promise<TabGroup | null>`
  - `createGroup(group): Promise<string>`
  - `updateGroup(groupId, updates): Promise<void>`
  - `deleteGroup(groupId): Promise<void>`
  - `addTabToGroup(tabId, groupId): Promise<void>`
  - `removeTabFromGroup(tabId, groupId): Promise<void>`
  - `getGroupTabs(groupId): Promise<Tab[]>`
  - `getActiveGroup(windowId?): Promise<TabGroup | null>`
  - `setActiveGroup(groupId, windowId?): Promise<void>`
  - `evaluateTabForGroup(tab, group): Promise<boolean>`

**Responsibilities:**
- Group CRUD operations
- Tab matcher evaluation
- Active group tracking
- Group-aware tab filtering

---

#### ✨ `src/core/schedule-manager.ts`
**Purpose:** Time-based automation engine
**Dependencies:** `types.ts`, `storage.ts`, `time-utils.ts`
**Size Estimate:** ~450 lines

**Key Classes/Functions:**
- `ScheduleManager` class
  - `initialize(): Promise<void>`
  - `evaluateSchedules(): Promise<ScheduleEvaluationResult[]>`
  - `applyAction(action): Promise<void>`
  - `addSchedule(schedule): Promise<string>`
  - `updateSchedule(scheduleId, updates): Promise<void>`
  - `deleteSchedule(scheduleId): Promise<void>`
  - `getSchedules(): Promise<Schedule[]>`
  - `isScheduleActive(schedule, now?): boolean`
  - `getActiveSchedules(): Promise<Schedule[]>`
- `evaluateTimeRange(timeRange, now): boolean`
- `evaluateDaysOfWeek(days, now): boolean`
- `evaluateDateRange(dateRange, now): boolean`
- `resolveScheduleConflicts(schedules): Schedule[]`

**Responsibilities:**
- Schedule evaluation
- Time/date/day matching
- Priority-based conflict resolution
- Action application
- Chrome alarm integration for periodic checks

---

#### ✨ `src/core/config-manager.ts`
**Purpose:** Import/export functionality
**Dependencies:** `types.ts`, `storage.ts`, `validation.ts`, `export-utils.ts`
**Size Estimate:** ~600 lines

**Key Classes/Functions:**
- `ConfigManager` class
  - `exportConfig(options?): Promise<ConfigExport>`
  - `importConfig(config, options?): Promise<ImportResult>`
  - `validateConfig(config): Promise<ValidationResult>`
  - `createBackup(reason): Promise<ConfigBackup>`
  - `restoreBackup(backupId): Promise<void>`
  - `getBackups(): Promise<ConfigBackup[]>`
  - `deleteBackup(backupId): Promise<void>`
  - `getTemplates(): Promise<ConfigTemplate[]>`
  - `applyTemplate(templateId): Promise<void>`
- `sanitizeConfig(config, options): ConfigExport`
- `mergeConfigs(base, incoming): ConfigExport`
- `migrateConfig(config, fromVersion, toVersion): ConfigExport`

**Responsibilities:**
- Export configuration to JSON/YAML
- Import with validation
- Configuration merging
- Backup management
- Template system
- Version migration

---

#### ✨ `src/core/pattern-resolver.ts`
**Purpose:** Helper for resolving rotation patterns
**Dependencies:** `types.ts`
**Size Estimate:** ~200 lines

**Key Classes/Functions:**
- `PatternResolver` class
  - `resolveSequential(tabs): number[]`
  - `resolveReverse(tabs): number[]`
  - `resolveRandom(tabs, seed?): number[]`
  - `resolvePinnedFirst(tabs): number[]`
  - `resolveCustom(tabs, customOrder): number[]`
- `shuffleArray(array, seed?): any[]`
- `getTabIndex(tab, tabs): number`

**Responsibilities:**
- Convert patterns to tab index sequences
- Handle different pattern types
- Seeded randomization
- Custom order resolution

---

### UI Components - Options Page Tabs

#### ✨ `src/options/patterns-tab.ts`
**Purpose:** Rotation patterns management UI
**Size Estimate:** ~400 lines

**Key Functions:**
- `initPatternsTab(): void`
- `loadPatterns(): Promise<void>`
- `renderPatternList(patterns): void`
- `openPatternEditor(patternId?): void`
- `savePattern(pattern): Promise<void>`
- `deletePattern(patternId): Promise<void>`
- `setActivePattern(patternId): Promise<void>`

---

#### ✨ `src/options/skip-rules-tab.ts`
**Purpose:** Skip rules management UI
**Size Estimate:** ~350 lines

**Key Functions:**
- `initSkipRulesTab(): void`
- `loadSkipRules(): Promise<void>`
- `renderRuleList(rules): void`
- `openRuleEditor(ruleId?): void`
- `saveRule(rule): Promise<void>`
- `deleteRule(ruleId): Promise<void>`
- `toggleRule(ruleId): Promise<void>`
- `testRule(rule): Promise<Tab[]>`

---

#### ✨ `src/options/groups-tab.ts`
**Purpose:** Tab groups management UI
**Size Estimate:** ~500 lines

**Key Functions:**
- `initGroupsTab(): void`
- `loadGroups(): Promise<void>`
- `renderGroupList(groups): void`
- `openGroupEditor(groupId?): void`
- `saveGroup(group): Promise<void>`
- `deleteGroup(groupId): Promise<void>`
- `setActiveGroup(groupId): Promise<void>`
- `previewGroupTabs(group): Promise<Tab[]>`

---

#### ✨ `src/options/schedules-tab.ts`
**Purpose:** Schedules management UI with visual calendar
**Size Estimate:** ~600 lines

**Key Functions:**
- `initSchedulesTab(): void`
- `loadSchedules(): Promise<void>`
- `renderScheduleList(schedules): void`
- `renderVisualCalendar(schedules): void`
- `openScheduleEditor(scheduleId?): void`
- `saveSchedule(schedule): Promise<void>`
- `deleteSchedule(scheduleId): Promise<void>`
- `testSchedule(schedule): ScheduleEvaluationResult`

---

#### ✨ `src/options/import-export-tab.ts`
**Purpose:** Configuration import/export UI
**Size Estimate:** ~450 lines

**Key Functions:**
- `initImportExportTab(): void`
- `handleExport(options): Promise<void>`
- `downloadConfig(config, format): void`
- `copyConfigToClipboard(config): Promise<void>`
- `generateConfigUrl(config): string`
- `handleImport(file, options): Promise<void>`
- `previewImport(config): Promise<void>`
- `showImportDiff(current, incoming): void`
- `loadBackups(): Promise<void>`
- `restoreBackup(backupId): Promise<void>`

---

### UI Components - Reusable Components

#### ✨ `src/options/components/pattern-editor.ts`
**Purpose:** Modal editor for rotation patterns
**Size Estimate:** ~300 lines

**Features:**
- Pattern type selector
- Custom order drag-and-drop interface
- Pattern options configuration
- Live preview

---

#### ✨ `src/options/components/rule-editor.ts`
**Purpose:** Modal editor for skip rules
**Size Estimate:** ~250 lines

**Features:**
- Rule type selector
- Pattern input with validation
- Match options
- Live test against current tabs

---

#### ✨ `src/options/components/group-editor.ts`
**Purpose:** Modal editor for tab groups
**Size Estimate:** ~400 lines

**Features:**
- Group name, color, icon picker
- Tab matcher builder
- Group settings (interval, pattern, skip rules)
- Live preview of matched tabs

---

#### ✨ `src/options/components/schedule-editor.ts`
**Purpose:** Modal editor for schedules
**Size Estimate:** ~450 lines

**Features:**
- Time range picker
- Day selector (visual)
- Date range picker
- Action builder (multiple actions)
- Priority slider
- Visual timeline preview

---

#### ✨ `src/options/components/visual-calendar.ts`
**Purpose:** Weekly calendar visualization for schedules
**Size Estimate:** ~300 lines

**Features:**
- 7-day week view
- Hour blocks
- Color-coded schedules
- Hover tooltips with schedule details
- Click to edit schedule

---

#### ✨ `src/options/components/config-preview.ts`
**Purpose:** Configuration diff viewer for imports
**Size Estimate:** ~200 lines

**Features:**
- Side-by-side current vs. new config
- Highlight changes (additions, deletions, modifications)
- Collapsible sections
- Warning indicators for overwrites

---

### Popup UI Enhancements

#### ✨ `src/popup/premium-controls.ts`
**Purpose:** Premium feature controls in popup
**Size Estimate:** ~250 lines

**Key Functions:**
- `renderPatternSelector(patterns, activeId): void`
- `renderGroupSelector(groups, activeId): void`
- `renderIntervalOverride(currentInterval): void`
- `handlePatternChange(patternId): Promise<void>`
- `handleGroupChange(groupId): Promise<void>`
- `handleIntervalChange(delayTime): Promise<void>`
- `updateActiveSkippedCount(): Promise<void>`

---

### Utilities

#### ✨ `src/utils/validation.ts`
**Purpose:** Validation helper functions
**Size Estimate:** ~200 lines

**Key Functions:**
- `validateRotationPattern(pattern): ValidationResult`
- `validateSkipRule(rule): ValidationResult`
- `validateTabGroup(group): ValidationResult`
- `validateSchedule(schedule): ValidationResult`
- `validateConfig(config): ValidationResult`
- `validateUrl(url): boolean`
- `validateRegex(pattern): boolean`
- `validateTimeFormat(time): boolean`

---

#### ✨ `src/utils/pattern-utils.ts`
**Purpose:** Pattern manipulation utilities
**Size Estimate:** ~150 lines

**Key Functions:**
- `normalizePattern(pattern): RotationPattern`
- `clonePattern(pattern): RotationPattern`
- `comparePatterns(a, b): boolean`
- `generatePatternId(): string`
- `getDefaultPattern(): RotationPattern`

---

#### ✨ `src/utils/time-utils.ts`
**Purpose:** Time and date utilities
**Size Estimate:** ~250 lines

**Key Functions:**
- `parseTime(timeString): { hour: number; minute: number }`
- `formatTime(hour, minute): string`
- `isTimeInRange(now, start, end): boolean`
- `isDayOfWeek(now, days): boolean`
- `isDateInRange(now, start, end): boolean`
- `getNextOccurrence(schedule): Date`
- `formatDuration(ms): string`
- `getTimezoneOffset(timezone): number`

---

#### ✨ `src/utils/export-utils.ts`
**Purpose:** Export formatting utilities
**Size Estimate:** ~200 lines

**Key Functions:**
- `formatAsJson(config, pretty?): string`
- `formatAsYaml(config): string`
- `parseJson(text): ConfigExport`
- `parseYaml(text): ConfigExport`
- `sanitizeConfig(config): ConfigExport`
- `generateConfigUrl(config): string`
- `parseConfigUrl(url): ConfigExport`

---

### CSS Files

#### ✨ `src/css/premium.css`
**Purpose:** General premium feature styles
**Size Estimate:** ~300 lines

**Includes:**
- Premium badge/indicator styles
- Common premium component styles
- Premium popup enhancements
- Transitions and animations

---

#### ✨ `src/css/patterns.css`
**Purpose:** Pattern editor specific styles
**Size Estimate:** ~200 lines

**Includes:**
- Pattern list styles
- Drag-and-drop interface styles
- Pattern type badges
- Pattern preview styles

---

#### ✨ `src/css/groups.css`
**Purpose:** Groups UI specific styles
**Size Estimate:** ~250 lines

**Includes:**
- Group card styles
- Color picker styles
- Tab matcher builder styles
- Group preview styles

---

#### ✨ `src/css/schedules.css`
**Purpose:** Schedule calendar specific styles
**Size Estimate:** ~300 lines

**Includes:**
- Visual calendar grid
- Time block styles
- Schedule overlay styles
- Day selector styles

---

### Test Files

**Total Test Files:** ~15 new files
**Estimated Total Test Lines:** ~3,500 lines

Each test file should include:
- Unit tests for all public methods
- Edge case tests
- Error handling tests
- Integration tests where applicable
- Performance benchmarks

---

### Documentation

#### 📚 `docs/premium-features/`

**User-facing documentation:**
- `rotation-patterns.md` - Guide to using rotation patterns
- `skip-rules.md` - Guide to skip rules
- `tab-groups.md` - Guide to tab groups
- `scheduling.md` - Guide to scheduling
- `import-export.md` - Guide to config management
- `getting-started.md` - Premium features quick start

#### 📚 `docs/api/`

**Developer-facing API documentation:**
- `rotation-engine.md` - RotationEngine API reference
- `skip-rule-engine.md` - SkipRuleEngine API reference
- `group-manager.md` - GroupManager API reference
- `schedule-manager.md` - ScheduleManager API reference
- `config-manager.md` - ConfigManager API reference

---

### Configuration Templates

#### 📋 `templates/`

Pre-configured templates for quick setup:

**`developer-workflow.json`**
- Groups: Code, Docs, Chat, Testing
- Pattern: Sequential within groups
- Schedule: Business hours (9-5)

**`social-media.json`**
- Groups: Twitter, LinkedIn, Facebook, Instagram
- Pattern: Random
- Interval: 10 seconds

**`monitoring-dashboard.json`**
- Groups: Metrics, Logs, Alerts, Infrastructure
- Pattern: Sequential
- Interval: 2 seconds
- Schedule: 24/7

**`research-mode.json`**
- Skip rules: Skip email, skip chat
- Pattern: Sequential
- Interval: 30 seconds
- Schedule: Focus hours

---

## Files to Extend (Existing)

### ✏️ `src/core/types.ts`
**Changes:**
- Add all premium type definitions from `PREMIUM_TYPES_REFERENCE.ts`
- Extend `StorageData` interface
- Add new enums and types

**Estimated Additions:** ~400 lines

---

### ✏️ `src/core/storage.ts`
**Changes:**
- Add helpers for premium settings
- `getRotationPatterns(): Promise<RotationPattern[]>`
- `saveRotationPattern(pattern): Promise<void>`
- `getSkipRules(): Promise<SkipRule[]>`
- `saveSkipRule(rule): Promise<void>`
- `getTabGroups(): Promise<TabGroup[]>`
- `saveTabGroup(group): Promise<void>`
- `getSchedules(): Promise<Schedule[]>`
- `saveSchedule(schedule): Promise<void>`

**Estimated Additions:** ~200 lines

---

### ✏️ `src/core/constants.ts`
**Changes:**
- Add premium feature constants
- `MAX_SKIP_RULES = 100`
- `MAX_TAB_GROUPS = 50`
- `MAX_SCHEDULES = 50`
- `MAX_ROTATION_PATTERNS = 30`
- `MAX_INDEPENDENT_TIMERS = 10`

**Estimated Additions:** ~30 lines

---

### ✏️ `src/background.ts`
**Changes:**
- Initialize premium feature managers
- Set up context menus for premium features
- Add schedule evaluation alarm
- Handle premium storage changes

**Estimated Additions:** ~150 lines

---

### ✏️ `src/popup/index.ts`
**Changes:**
- Add premium control rendering
- Pattern selector
- Group selector
- Interval override
- Active/skipped count

**Estimated Additions:** ~200 lines

---

### ✏️ `src/popup/index.html`
**Changes:**
- Add premium UI elements
- Pattern selector dropdown
- Group selector dropdown
- Interval override input
- Status indicators

**Estimated Additions:** ~50 lines

---

### ✏️ `src/options/options.ts`
**Changes:**
- Add navigation for premium tabs
- Initialize premium tab controllers
- Handle tab switching

**Estimated Additions:** ~100 lines

---

### ✏️ `src/options/options.html`
**Changes:**
- Add premium navigation tabs
- Add containers for premium tab content
- Link premium CSS files

**Estimated Additions:** ~100 lines

---

## Summary Statistics

### New Files
- **Core Logic:** 8 files (~3,200 lines)
  - rotation-engine, skip-rule-engine, group-manager, session-manager, schedule-manager, config-manager, refresh-manager, pattern-resolver
- **UI Components:** 16 files (~5,200 lines)
  - 7 tabs (patterns, skip-rules, groups, sessions, schedules, refresh, import-export)
  - 9 components (pattern-editor, rule-editor, group-editor, session-editor, session-launcher, schedule-editor, visual-calendar, refresh-settings, config-preview)
- **Utilities:** 4 files (~800 lines)
- **CSS:** 6 files (~1,350 lines)
  - premium, patterns, groups, sessions, schedules, refresh
- **Tests:** 21 files (~5,000 lines)
  - 8 core tests, 6 integration tests, 7 UI tests
- **Documentation:** 13 files (~N/A)
  - Added sessions and refresh docs
- **Templates:** 4 files (~N/A)

**Total New Files:** ~72 files
**Total New Code:** ~15,550 lines

### Modified Files
- **Core:** 3 files (~450 lines added)
- **Background:** 1 file (~200 lines added)
- **Popup:** 2 files (~300 lines added)
- **Options:** 2 files (~250 lines added)

**Total Modified Files:** 8 files
**Total Code Added:** ~1,200 lines

### Grand Total
**Total Files:** 80 files (72 new + 8 modified)
**Total Lines of Code:** ~16,750 lines

---

## Implementation Priority

### Phase 1 (Week 1-2): Foundation
- Extend `types.ts`, `storage.ts`, `constants.ts`
- Create empty class files for core modules
- Set up test infrastructure

### Phase 2 (Week 3): Skip Rules
- `skip-rule-engine.ts`
- `skip-rules-tab.ts`
- `rule-editor.ts`
- Tests

### Phase 3 (Week 4-5): Rotation Patterns
- `rotation-engine.ts`
- `pattern-resolver.ts`
- `patterns-tab.ts`
- `pattern-editor.ts`
- Popup pattern selector
- Tests

### Phase 4 (Week 6): Per-Window Intervals
- Extend popup and options UI
- Add interval override controls
- Tests

### Phase 5 (Week 7-9): Tab Groups
- `group-manager.ts`
- `groups-tab.ts`
- `group-editor.ts`
- Popup group selector
- Context menus
- Tests

### Phase 6 (Week 10-11): Schedules
- `schedule-manager.ts`
- `time-utils.ts`
- `schedules-tab.ts`
- `schedule-editor.ts`
- `visual-calendar.ts`
- Tests

### Phase 7 (Week 12): Import/Export
- `config-manager.ts`
- `export-utils.ts`
- `import-export-tab.ts`
- `config-preview.ts`
- Templates
- Tests

### Phase 8 (Week 13-14): Polish
- CSS refinement
- Documentation
- Cross-feature integration
- Performance optimization

---

## File Naming Conventions

- **Core modules:** `kebab-case.ts` (e.g., `rotation-engine.ts`)
- **UI components:** `kebab-case.ts` (e.g., `patterns-tab.ts`)
- **Test files:** `kebab-case.test.ts` (e.g., `rotation-engine.test.ts`)
- **CSS files:** `kebab-case.css` (e.g., `premium.css`)
- **Documentation:** `kebab-case.md` (e.g., `rotation-patterns.md`)
- **Templates:** `kebab-case.json` (e.g., `developer-workflow.json`)

---

## Code Style Guidelines

- **TypeScript:** Strict mode, no implicit any
- **Async/await:** Prefer over callbacks
- **Error handling:** Always use try/catch for async operations
- **Comments:** JSDoc for public APIs, inline for complex logic
- **Testing:** Aim for 90%+ coverage
- **Exports:** Named exports preferred over default
- **Constants:** UPPER_SNAKE_CASE for constants
- **Interfaces:** PascalCase with descriptive names

---

**Document Version:** 1.0
**Last Updated:** 2026-01-11
