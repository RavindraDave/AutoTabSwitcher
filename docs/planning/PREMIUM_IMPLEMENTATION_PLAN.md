# Premium Features Implementation Plan
**Version:** 2.0
**Date:** 2026-01-30
**Status:** Active Development
**Branch:** `claude/plan-premium-features-ArQQ1`

---

## Executive Summary

This document provides a comprehensive implementation plan for completing the premium features in AutoTabSwitcher v2.0. Based on analysis of the PRD and current implementation status, we have **4 of 7 premium features completed** and need to implement 3 core features plus integration work.

### Current Status

**✅ Completed (4/7 features):**
1. **Feature 2: Skip Specific Tabs** - SkipRuleEngine (413 lines)
2. **Feature 3 (Partial): Session Management** - SessionManager (431 lines)
3. **Feature 6: Import/Export** - ConfigManager (481 lines)
4. **Feature 7: Smart Auto-Refresh** - RefreshManager (494 lines)

**⏳ Pending (3/7 features):**
1. **Feature 1: Custom Tab Sequences & Rotation Patterns** - RotationEngine ❌
2. **Feature 3 (Remaining): Tab Grouping & Categorization** - GroupManager ❌
3. **Feature 5: Advanced Scheduling** - ScheduleManager ❌

**🔧 Integration Work Needed:**
- Background service integration (hook managers into tab switching)
- Popup UI updates (show premium features)
- Type definitions (add missing types)
- Testing (unit, integration, manual)
- Documentation (user guides, API docs)

---

## Implementation Priority Analysis

### Priority Matrix

| Feature | User Demand | Revenue Potential | Implementation Cost | Dependencies | Priority |
|---------|-------------|-------------------|---------------------|--------------|----------|
| **Background Integration** | N/A | Critical | Low | None | **P0** 🔴 |
| **Feature 4: Per-Window Intervals** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | Very Low | Background | **P0** 🔴 |
| **Feature 1: Rotation Patterns** | ⭐⭐ | ⭐⭐ | Medium | Background | **P1** 🟡 |
| **Feature 3: Tab Grouping** | ⭐⭐⭐ | ⭐⭐⭐ | High | Background, Rotation | **P2** 🟢 |
| **Feature 5: Advanced Scheduling** | ⭐⭐ | ⭐⭐ | Medium | All features | **P3** 🔵 |
| **Testing & Documentation** | N/A | Critical | Medium | All features | **P1** 🟡 |

### Rationale

**P0 (Must have for MVP):**
- **Background Integration**: All premium features depend on this
- **Per-Window Intervals**: Easiest win, already partially implemented, high user value

**P1 (Should have for launch):**
- **Rotation Patterns**: Differentiator feature, medium complexity
- **Testing**: Essential for quality and stability

**P2 (Nice to have):**
- **Tab Grouping**: High complexity, requires rotation patterns first

**P3 (Can defer to v2.1):**
- **Advanced Scheduling**: Complex, niche audience, can be added post-launch

---

## Detailed Implementation Plan

### Phase 1: Foundation & Integration (Week 1-2) 🔴 CRITICAL

**Goal:** Get existing premium features working in the background service

#### Task 1.1: Type Definitions Extension
**Files:** `src/core/types.ts`
**Estimated Time:** 2 hours

Add missing type definitions:

```typescript
// Feature 1: Rotation Patterns
export interface RotationPattern {
  id: string;
  name: string;
  type: 'sequential' | 'reverse' | 'random' | 'pinned-first' | 'custom';
  description?: string;
  customOrder?: Array<number | string>; // For custom patterns
  options?: {
    shuffleDaily?: boolean;
    respectPinned?: boolean;
    loopMode?: 'circular' | 'bounce';
  };
  createdAt?: number;
  updatedAt?: number;
}

// Feature 3: Tab Groups
export interface TabGroup {
  id: string;
  name: string;
  color?: string;
  icon?: string;
  tabs: TabMatcher[];
  settings: {
    customDelayTime?: number;
    rotationPatternId?: string;
    skipRules?: string[];
    enabled?: boolean;
  };
  rotationMode?: 'within' | 'independent';
  createdAt?: number;
  updatedAt?: number;
}

export interface TabMatcher {
  type: 'url' | 'domain' | 'regex' | 'title' | 'manual';
  pattern?: string;
  tabIds?: number[];
}

export type GroupRotationMode =
  | 'within-group'
  | 'between-groups'
  | 'sequential-groups'
  | 'independent';

// Feature 5: Schedules
export interface Schedule {
  id: string;
  name: string;
  enabled: boolean;
  timeRange?: { start: string; end: string };
  daysOfWeek?: number[];
  dateRange?: { start: string; end: string };
  type: 'recurring' | 'one-time';
  actions: ScheduledAction[];
  priority?: number;
  createdAt?: number;
  updatedAt?: number;
}

export interface ScheduledAction {
  type: 'enable' | 'disable' | 'set-interval' | 'set-pattern' |
        'set-group' | 'set-mode' | 'launch-session';
  params?: {
    enabled?: boolean;
    delayTime?: number;
    patternId?: string;
    groupId?: string;
    switchingMode?: SwitchingMode;
    windowId?: number;
    sessionId?: string;
  };
}

// Extend StorageData
export interface StorageData {
  // ... existing fields ...

  // Premium features
  rotationPatterns?: { [patternId: string]: RotationPattern };
  activePattern?: string;
  windowPatterns?: { [windowId: number]: string };

  tabGroups?: TabGroup[];
  activeGroupId?: string;
  groupRotationMode?: GroupRotationMode;
  windowActiveGroups?: { [windowId: number]: string };

  schedules?: Schedule[];
  schedulesEnabled?: boolean;
  lastScheduleCheck?: number;
}
```

**Acceptance Criteria:**
- [ ] All types compile without errors
- [ ] Types match premium-features.md specification
- [ ] JSDoc comments added for each type

---

#### Task 1.2: Background Service Integration
**Files:** `src/background.ts`, `src/core/tab-switcher.ts`
**Estimated Time:** 6-8 hours

**Subtask 1.2.1: Import Premium Managers**

```typescript
// In src/background.ts
import { sessionManager } from './premium/SessionManager.js';
import { refreshManager } from './premium/RefreshManager.js';
import { skipRuleEngine } from './premium/SkipRuleEngine.js';
import { configManager } from './premium/ConfigManager.js';
import { canAccessPremium } from './core/premium-access.js';
```

**Subtask 1.2.2: Session Auto-Launch on Startup**

```typescript
// In src/background.ts
chrome.runtime.onStartup.addListener(async () => {
  try {
    if (await canAccessPremium()) {
      console.log('[Premium] Initializing premium features...');

      // Launch auto-start sessions
      await sessionManager.launchAutoStartSessions();
      console.log('[Premium] Auto-start sessions launched');

      // Initialize refresh manager
      await refreshManager.initialize();
      console.log('[Premium] Refresh manager initialized');
    }
  } catch (error) {
    console.error('[Premium] Startup error:', error);
  }
});

// Also on install/update
chrome.runtime.onInstalled.addListener(async () => {
  if (await canAccessPremium()) {
    await refreshManager.initialize();
  }
});
```

**Subtask 1.2.3: Skip Rules Integration**

```typescript
// In src/core/tab-switcher.ts
import { skipRuleEngine } from '../premium/SkipRuleEngine.js';
import { canAccessPremium } from './premium-access.js';

export async function getEligibleTabs(windowId: number): Promise<chrome.tabs.Tab[]> {
  let tabs = await chrome.tabs.query({ windowId });

  // Apply skip rules if premium
  if (await canAccessPremium()) {
    const skipRules = await skipRuleEngine.getAllRules();
    if (skipRules.length > 0) {
      const filteredTabs = await skipRuleEngine.filterTabs(tabs);
      console.log(`[Premium] Filtered ${tabs.length} tabs to ${filteredTabs.length} (${tabs.length - filteredTabs.length} skipped)`);
      tabs = filteredTabs;
    }
  }

  return tabs;
}
```

**Subtask 1.2.4: Refresh Manager Integration**

```typescript
// In src/core/tab-switcher.ts
import { refreshManager } from '../premium/RefreshManager.js';

export async function switchToNextTab(
  currentTabId: number,
  nextTabId: number,
  delayMs: number
): Promise<void> {
  const isPremium = await canAccessPremium();

  // Preemptive refresh if premium
  if (isPremium) {
    try {
      await refreshManager.schedulePreemptiveRefresh(nextTabId, delayMs);
    } catch (error) {
      console.error('[Premium] Preemptive refresh failed:', error);
    }
  }

  // Perform the tab switch
  await chrome.tabs.update(nextTabId, { active: true });

  // Post-switch refresh if premium
  if (isPremium) {
    try {
      await refreshManager.executePostSwitchRefresh(nextTabId);
    } catch (error) {
      console.error('[Premium] Post-switch refresh failed:', error);
    }
  }
}
```

**Acceptance Criteria:**
- [ ] Sessions auto-launch on Chrome startup
- [ ] Skip rules filter tabs correctly
- [ ] Refresh manager executes preemptive refreshes
- [ ] No errors in console during normal operation
- [ ] Premium features gracefully disabled when premium access is false

---

#### Task 1.3: Per-Window Intervals UI Exposure (Feature 4)
**Files:** `src/options/premium.html`, `src/options/premium.js`, `src/popup/index.html`, `src/popup/index.js`
**Estimated Time:** 4 hours

**Why This First?** Feature 4 is already partially implemented in the backend (`WindowState.customDelayTime`) but just needs UI exposure. It's a quick win with high user value.

**Subtask 1.3.1: Add Per-Window Intervals Section to Premium Options**

```html
<!-- In src/options/premium.html, add new section -->
<div class="feature-section">
  <h3>Per-Window Intervals</h3>
  <p class="feature-description">
    Set different rotation speeds for different browser windows.
    Perfect for multi-monitor setups!
  </p>

  <div class="window-intervals-container" id="window-intervals">
    <!-- Populated dynamically -->
  </div>

  <button class="btn btn-sm btn-outline-primary" id="refresh-windows">
    Refresh Window List
  </button>
</div>
```

**Subtask 1.3.2: Implement Window Intervals UI Logic**

```javascript
// In src/options/premium.js
async function loadWindowIntervals() {
  const windows = await chrome.windows.getAll({ windowTypes: ['normal'] });
  const settings = await getSettings();
  const container = document.getElementById('window-intervals');

  container.innerHTML = windows.map(win => `
    <div class="window-interval-item">
      <div class="window-info">
        <strong>Window ${win.id}</strong>
        ${win.focused ? '<span class="badge badge-primary">Current</span>' : ''}
      </div>
      <div class="interval-controls">
        <select class="form-control form-control-sm"
                data-window-id="${win.id}">
          <option value="">Use Global (${settings.delayTime / 1000}s)</option>
          <option value="2000">Very Fast (2s)</option>
          <option value="5000">Fast (5s)</option>
          <option value="10000">Normal (10s)</option>
          <option value="30000">Slow (30s)</option>
          <option value="60000">Very Slow (60s)</option>
          <option value="custom">Custom...</option>
        </select>
      </div>
    </div>
  `).join('');

  // Set current values
  windows.forEach(win => {
    const select = container.querySelector(`[data-window-id="${win.id}"]`);
    const customDelay = settings.windowStates?.[win.id]?.customDelayTime;
    if (customDelay) {
      const option = select.querySelector(`[value="${customDelay}"]`);
      if (option) {
        select.value = customDelay;
      } else {
        select.value = 'custom';
      }
    }
  });

  // Add change handlers
  container.querySelectorAll('select').forEach(select => {
    select.addEventListener('change', handleWindowIntervalChange);
  });
}

async function handleWindowIntervalChange(event) {
  const windowId = parseInt(event.target.dataset.windowId);
  const value = event.target.value;

  if (value === 'custom') {
    const customValue = prompt('Enter custom interval in seconds:');
    if (customValue) {
      await setWindowInterval(windowId, parseFloat(customValue) * 1000);
    }
  } else if (value === '') {
    await clearWindowInterval(windowId);
  } else {
    await setWindowInterval(windowId, parseInt(value));
  }
}
```

**Subtask 1.3.3: Show Per-Window Interval in Popup**

```javascript
// In src/popup/index.js
async function updateIntervalDisplay() {
  const settings = await getSettings();
  const currentWindow = await chrome.windows.getCurrent();
  const customDelay = settings.windowStates?.[currentWindow.id]?.customDelayTime;

  const displayTime = customDelay || settings.delayTime;
  const suffix = customDelay ? ' (Custom)' : ' (Global)';

  document.getElementById('interval-display').textContent =
    `${displayTime / 1000}s${suffix}`;
}
```

**Acceptance Criteria:**
- [ ] Window list shows all open windows
- [ ] Each window can have custom interval set
- [ ] Changes persist across browser restarts
- [ ] Popup shows current window's interval
- [ ] "Use Global" option clears custom interval

---

### Phase 2: Rotation Patterns (Week 3-4) 🟡 HIGH PRIORITY

**Goal:** Implement custom tab rotation patterns

#### Task 2.1: RotationEngine Implementation
**Files:** `src/premium/RotationEngine.ts`
**Estimated Time:** 12-16 hours

```typescript
// src/premium/RotationEngine.ts
import type { RotationPattern } from '../core/types.js';

export class RotationEngine {
  private patternCache: Map<string, number[]> = new Map();

  /**
   * Get the next tab index based on current pattern
   */
  async getNextTabIndex(
    tabs: chrome.tabs.Tab[],
    currentTabId: number,
    patternId: string = 'sequential'
  ): Promise<number> {
    const pattern = await this.getPattern(patternId);
    const sequence = await this.resolvePattern(tabs, pattern);

    // Find current position in sequence
    const currentIndex = tabs.findIndex(t => t.id === currentTabId);
    const sequencePosition = sequence.indexOf(currentIndex);

    if (sequencePosition === -1) {
      // Current tab not in sequence, start from beginning
      return sequence[0];
    }

    // Get next position (wrap around)
    const nextPosition = (sequencePosition + 1) % sequence.length;
    return sequence[nextPosition];
  }

  /**
   * Resolve pattern into array of tab indices
   */
  async resolvePattern(
    tabs: chrome.tabs.Tab[],
    pattern: RotationPattern
  ): Promise<number[]> {
    // Check cache
    const cacheKey = `${pattern.id}-${tabs.length}`;
    if (this.patternCache.has(cacheKey)) {
      return this.patternCache.get(cacheKey)!;
    }

    let sequence: number[];

    switch (pattern.type) {
      case 'sequential':
        sequence = this.resolveSequential(tabs, pattern);
        break;
      case 'reverse':
        sequence = this.resolveReverse(tabs, pattern);
        break;
      case 'random':
        sequence = this.resolveRandom(tabs, pattern);
        break;
      case 'pinned-first':
        sequence = this.resolvePinnedFirst(tabs, pattern);
        break;
      case 'custom':
        sequence = this.resolveCustom(tabs, pattern);
        break;
      default:
        sequence = this.resolveSequential(tabs, pattern);
    }

    // Cache result
    this.patternCache.set(cacheKey, sequence);

    return sequence;
  }

  private resolveSequential(
    tabs: chrome.tabs.Tab[],
    pattern: RotationPattern
  ): number[] {
    const indices = tabs.map((_, i) => i);

    if (pattern.options?.respectPinned) {
      // Pinned tabs first, then unpinned
      const pinned = tabs.filter(t => t.pinned).map((_, i) => i);
      const unpinned = tabs.filter(t => !t.pinned)
        .map((_, i) => i + pinned.length);
      return [...pinned, ...unpinned];
    }

    return indices;
  }

  private resolveReverse(
    tabs: chrome.tabs.Tab[],
    pattern: RotationPattern
  ): number[] {
    return this.resolveSequential(tabs, pattern).reverse();
  }

  private resolveRandom(
    tabs: chrome.tabs.Tab[],
    pattern: RotationPattern
  ): number[] {
    const indices = this.resolveSequential(tabs, pattern);

    // Use seeded random for consistency (shuffle once per day if shuffleDaily)
    const seed = pattern.options?.shuffleDaily
      ? new Date().toDateString()
      : pattern.id;

    return this.shuffleWithSeed(indices, seed);
  }

  private resolvePinnedFirst(
    tabs: chrome.tabs.Tab[],
    pattern: RotationPattern
  ): number[] {
    const pinned: number[] = [];
    const unpinned: number[] = [];

    tabs.forEach((tab, index) => {
      if (tab.pinned) {
        pinned.push(index);
      } else {
        unpinned.push(index);
      }
    });

    return [...pinned, ...unpinned];
  }

  private resolveCustom(
    tabs: chrome.tabs.Tab[],
    pattern: RotationPattern
  ): number[] {
    if (!pattern.customOrder || pattern.customOrder.length === 0) {
      return this.resolveSequential(tabs, pattern);
    }

    // Custom order can be indices or URL patterns
    const sequence: number[] = [];

    pattern.customOrder.forEach(item => {
      if (typeof item === 'number') {
        // Direct index reference
        if (item < tabs.length) {
          sequence.push(item);
        }
      } else {
        // URL pattern - find matching tab
        const matchIndex = tabs.findIndex(tab =>
          tab.url?.includes(item) || tab.title?.includes(item)
        );
        if (matchIndex !== -1) {
          sequence.push(matchIndex);
        }
      }
    });

    return sequence.length > 0 ? sequence : this.resolveSequential(tabs, pattern);
  }

  private shuffleWithSeed(array: number[], seed: string): number[] {
    // Simple seeded shuffle algorithm
    const arr = [...array];
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = ((hash << 5) - hash) + seed.charCodeAt(i);
      hash = hash & hash;
    }

    const random = () => {
      hash = (hash * 9301 + 49297) % 233280;
      return hash / 233280;
    };

    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }

    return arr;
  }

  /**
   * Get pattern by ID
   */
  private async getPattern(patternId: string): Promise<RotationPattern> {
    const settings = await chrome.storage.local.get('rotationPatterns');
    const patterns = settings.rotationPatterns || {};

    return patterns[patternId] || {
      id: 'sequential',
      name: 'Sequential',
      type: 'sequential',
      description: 'Rotate tabs from left to right'
    };
  }

  /**
   * Clear pattern cache (call when tabs change)
   */
  clearCache(): void {
    this.patternCache.clear();
  }

  /**
   * Save pattern
   */
  async savePattern(pattern: RotationPattern): Promise<void> {
    const settings = await chrome.storage.local.get('rotationPatterns');
    const patterns = settings.rotationPatterns || {};
    patterns[pattern.id] = pattern;
    await chrome.storage.local.set({ rotationPatterns: patterns });
    this.clearCache();
  }

  /**
   * Delete pattern
   */
  async deletePattern(patternId: string): Promise<void> {
    const settings = await chrome.storage.local.get('rotationPatterns');
    const patterns = settings.rotationPatterns || {};
    delete patterns[patternId];
    await chrome.storage.local.set({ rotationPatterns: patterns });
    this.clearCache();
  }

  /**
   * Get all patterns
   */
  async getAllPatterns(): Promise<RotationPattern[]> {
    const settings = await chrome.storage.local.get('rotationPatterns');
    const patterns = settings.rotationPatterns || {};
    return Object.values(patterns);
  }
}

// Singleton instance
export const rotationEngine = new RotationEngine();
```

**Acceptance Criteria:**
- [ ] All 5 pattern types work correctly
- [ ] Pattern cache improves performance
- [ ] Patterns persist across sessions
- [ ] Edge cases handled (empty tabs, single tab)
- [ ] Unit tests with 90%+ coverage

---

#### Task 2.2: Rotation Patterns UI
**Files:** `src/options/premium.html`, `src/options/premium.js`
**Estimated Time:** 8-10 hours

Create pattern management UI with:
- Pattern list view
- Create/edit pattern dialog
- Pattern type selector
- Pattern testing preview
- Quick pattern switcher in popup

**Acceptance Criteria:**
- [ ] Users can create/edit/delete patterns
- [ ] Pattern preview shows expected rotation order
- [ ] Validation prevents invalid patterns
- [ ] Popup allows quick pattern switching

---

### Phase 3: Tab Grouping (Week 5-7) 🟢 MEDIUM PRIORITY

**Goal:** Implement tab grouping and categorization

#### Task 3.1: GroupManager Implementation
**Files:** `src/premium/GroupManager.ts`
**Estimated Time:** 16-20 hours

Similar structure to RotationEngine, with:
- Group CRUD operations
- Tab matcher evaluation
- Group-aware rotation modes
- Integration with RotationEngine

**Acceptance Criteria:**
- [ ] Groups can be created with matchers
- [ ] Tab matching works for all matcher types
- [ ] Group rotation modes work correctly
- [ ] Groups integrate with rotation patterns

---

#### Task 3.2: Tab Groups UI
**Files:** `src/options/premium.html`, `src/options/premium.js`
**Estimated Time:** 12-16 hours

**Acceptance Criteria:**
- [ ] Visual group builder with live preview
- [ ] Drag-and-drop tab assignment
- [ ] Color and icon picker
- [ ] Group templates

---

### Phase 4: Advanced Scheduling (Week 8-9) 🔵 LOWER PRIORITY

**Goal:** Time-based automation

#### Task 4.1: ScheduleManager Implementation
**Files:** `src/premium/ScheduleManager.ts`
**Estimated Time:** 12-16 hours

**Acceptance Criteria:**
- [ ] Schedule evaluation with timezone support
- [ ] Priority-based conflict resolution
- [ ] All scheduled actions work
- [ ] Background worker integration

---

#### Task 4.2: Scheduling UI
**Files:** `src/options/premium.html`, `src/options/premium.js`
**Estimated Time:** 16-20 hours

**Acceptance Criteria:**
- [ ] Visual weekly calendar
- [ ] Schedule creation wizard
- [ ] Action builder
- [ ] Schedule preview

---

### Phase 5: Testing & Documentation (Week 10) 🟡 CRITICAL

**Goal:** Ensure quality and usability

#### Task 5.1: Unit Testing
**Files:** `src/__tests__/premium/*.test.ts`
**Estimated Time:** 12-16 hours

Write tests for:
- RotationEngine (all pattern types)
- GroupManager (all matcher types)
- ScheduleManager (time evaluation)
- Integration tests for premium features

**Target:** 85%+ code coverage

---

#### Task 5.2: Integration Testing
**Estimated Time:** 8-10 hours

Test:
- Premium features with tab switching
- Cross-feature interactions
- Edge cases and error handling
- Performance with many tabs/groups/rules

---

#### Task 5.3: Documentation
**Files:** User guides, API docs
**Estimated Time:** 8-12 hours

Create:
- Premium features user guide
- Video tutorials
- API documentation
- Migration guide from free version

---

## Implementation Timeline

### Recommended Sequence

**Week 1-2: Foundation** (P0 - CRITICAL)
- ✅ Day 1-2: Type definitions (Task 1.1)
- ✅ Day 3-5: Background integration (Task 1.2)
- ✅ Day 6-8: Per-window intervals UI (Task 1.3)
- ✅ Day 9-10: Testing & bug fixes

**Week 3-4: Rotation Patterns** (P1 - HIGH)
- ✅ Day 1-4: RotationEngine implementation (Task 2.1)
- ✅ Day 5-8: Rotation patterns UI (Task 2.2)
- ✅ Day 9-10: Testing & refinement

**Week 5-7: Tab Grouping** (P2 - MEDIUM)
- ✅ Day 1-5: GroupManager implementation (Task 3.1)
- ✅ Day 6-10: Tab groups UI (Task 3.2)
- ✅ Day 11-15: Integration & testing

**Week 8-9: Scheduling** (P3 - LOWER)
- ✅ Day 1-4: ScheduleManager implementation (Task 4.1)
- ✅ Day 5-8: Scheduling UI (Task 4.2)
- ✅ Day 9-10: Testing

**Week 10: Polish & Launch** (P1 - CRITICAL)
- ✅ Day 1-4: Comprehensive testing (Task 5.1, 5.2)
- ✅ Day 5-7: Documentation (Task 5.3)
- ✅ Day 8-10: Bug fixes, final QA, launch prep

---

## MVP Definition (Minimum Viable Premium)

If time is limited, we can launch with:

**MVP Feature Set:**
1. ✅ Session Management (already done)
2. ✅ Smart Auto-Refresh (already done)
3. ✅ Skip Rules (already done)
4. ✅ Per-Window Intervals (Task 1.3 - 4 hours)
5. ✅ Import/Export (already done)
6. ⚠️ Basic Rotation Patterns (sequential, reverse, random only)

**Can Defer to v2.1:**
- Advanced rotation patterns (custom order, complex patterns)
- Tab grouping (high complexity)
- Advanced scheduling (niche feature)

**MVP Timeline:** 2 weeks (Foundation + basic rotation patterns)

---

## Risk Mitigation

### Technical Risks

**Risk 1: Performance with complex patterns**
- **Mitigation:** Pattern caching, limit pattern complexity, performance benchmarks

**Risk 2: Integration breaks existing features**
- **Mitigation:** Comprehensive regression testing, feature flags, gradual rollout

**Risk 3: Premium features conflict with each other**
- **Mitigation:** Clear priority rules, conflict detection, user warnings

### Timeline Risks

**Risk 1: Features take longer than estimated**
- **Mitigation:** MVP approach, defer non-critical features, parallel development

**Risk 2: Bug fixes delay launch**
- **Mitigation:** Early testing, beta program, hotfix capability

---

## Success Metrics

### Development Metrics
- ✅ All P0 tasks completed
- ✅ 85%+ code coverage
- ✅ Zero critical bugs
- ✅ Performance benchmarks met

### User Metrics (Post-Launch)
- ✅ 15% of users try premium features
- ✅ 12% conversion to paid
- ✅ 70% retention after 3 months
- ✅ 4.5+ star rating

---

## Next Steps

1. **Review this plan** with stakeholders
2. **Choose approach:** Full feature set (10 weeks) or MVP (2 weeks)
3. **Start Phase 1:** Background integration (highest priority)
4. **Set up tracking:** GitHub Projects or similar
5. **Begin implementation** following the task order

---

## Appendix: File Structure

```
src/
├── premium/
│   ├── SessionManager.ts       ✅ Done
│   ├── RefreshManager.ts       ✅ Done
│   ├── SkipRuleEngine.ts       ✅ Done
│   ├── ConfigManager.ts        ✅ Done
│   ├── RotationEngine.ts       ❌ TODO (Week 3-4)
│   ├── GroupManager.ts         ❌ TODO (Week 5-7)
│   └── ScheduleManager.ts      ❌ TODO (Week 8-9)
├── core/
│   ├── types.ts               🔧 Extend (Week 1)
│   ├── tab-switcher.ts        🔧 Integrate (Week 1)
│   └── premium-access.ts      ✅ Done
├── background.ts              🔧 Integrate (Week 1)
├── options/
│   ├── premium.html           🔧 Extend (ongoing)
│   ├── premium.js             🔧 Extend (ongoing)
│   └── premium.css            ✅ Done
└── __tests__/
    └── premium/
        ├── rotation-engine.test.ts    ❌ TODO
        ├── group-manager.test.ts      ❌ TODO
        └── schedule-manager.test.ts   ❌ TODO
```

---

**Document Version:** 1.0
**Last Updated:** 2026-01-30
**Author:** Claude Code Assistant
**Status:** Ready for Implementation
