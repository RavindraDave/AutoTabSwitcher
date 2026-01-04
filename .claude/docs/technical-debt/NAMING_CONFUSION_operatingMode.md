# operatingMode vs windowMode vs switchingMode - Naming Confusion

**Status**: 🔴 TECHNICAL DEBT - Needs Refactoring
**Priority**: Medium
**Complexity**: High (affects 7 source files + 50+ tests)

---

## The Problem

We currently have **THREE** similar-sounding fields for mode control:

### 1. `windowMode` (LEGACY)
- **Type**: `'global' | 'current-window'`
- **Purpose**: Original mode system before refactoring
- **Used by**: Legacy fallback code
- **Stored in**: `chrome.storage.local`
- **Status**: ⚠️ Deprecated but still read for backward compatibility

### 2. `operatingMode` (CURRENT - Confusing Name)
- **Type**: `'global' | 'window'`
- **Purpose**: New enhanced mode system
- **Used by**: Current implementation (WindowTimerManager, badge, etc.)
- **Stored in**: `chrome.storage.local`
- **Status**: ✅ Active but poorly named

### 3. `switchingMode` (PROPOSED - Better Name)
- **Type**: `'global' | 'window'`
- **Purpose**: Same as `operatingMode` but clearer naming
- **Status**: 📋 Planned refactoring

---

## Why This Is Confusing

1. **"operating mode" vs "window mode"** - Too similar!
   - Both relate to window behavior
   - Easy to confuse which one to use

2. **Value mismatch**:
   - `windowMode: 'current-window'` vs `operatingMode: 'window'`
   - Inconsistent terminology

3. **Two sources of truth**:
   - Code must check both `operatingMode` and `windowMode` (fallback)
   - Migration logic needed

4. **Cognitive load**:
   - Developers must remember:
     - Which field is current vs legacy
     - Which values map to each other
     - When to use which field

---

## Current Workaround

### Backward Compatibility Pattern

```typescript
// CURRENT: Read with fallback
let operatingMode = data.operatingMode ?? 'global';
if (!data.operatingMode && data.windowMode) {
  operatingMode = data.windowMode === 'current-window' ? 'window' : 'global';
}
```

### Migration on Update

```typescript
// background.ts - runs on extension update
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'update') {
    await migrateToOperatingMode(); // Migrates windowMode → operatingMode
  }
});
```

---

## Recommended Solution

### Phase 1: Add switchingMode Type (✅ DONE)

```typescript
// types.ts
export type SwitchingMode = 'global' | 'window';

// Add to StorageData
interface StorageData {
  switchingMode?: SwitchingMode; // NEW clear name
  operatingMode?: SwitchingMode; // DEPRECATED but kept for migration
  windowMode?: WindowMode;       // LEGACY
}
```

### Phase 2: Add Helper Function (✅ DONE)

```typescript
// storage.ts
export function getSwitchingMode(data: StorageData): SwitchingMode {
  return data.switchingMode || data.operatingMode || DEFAULT_SWITCHING_MODE;
}
```

### Phase 3: Gradual Migration (TODO)

```typescript
// 1. Update all writes to use switchingMode
await chrome.storage.local.set({
  switchingMode: 'global' // NEW
});

// 2. Update all reads to use helper
const mode = getSwitchingMode(data); // Checks all three fields

// 3. Add migration
async function migrateToSwitchingMode() {
  const data = await chrome.storage.local.get(['switchingMode', 'operatingMode']);
  if (!data.switchingMode && data.operatingMode) {
    await chrome.storage.local.set({ switchingMode: data.operatingMode });
  }
}
```

### Phase 4: Deprecation Timeline

- **Version 1.2**: Add `switchingMode`, keep `operatingMode` working
- **Version 1.3**: Migrate all internal code to `switchingMode`
- **Version 1.4**: Add deprecation warnings when `operatingMode` is used
- **Version 2.0**: Remove `operatingMode` entirely (BREAKING CHANGE)

---

## Files Affected by Full Refactoring

### Source Files (7 files, ~105 references):
1. ✅ `src/core/types.ts` - Type definitions
2. ✅ `src/core/constants.ts` - DEFAULT_SWITCHING_MODE
3. ⏳ `src/core/storage.ts` - Storage helpers (partial)
4. ⏳ `src/core/tab-switcher.ts` - Tab switching logic
5. ⏳ `src/background.ts` - Service worker
6. ⏳ `src/core/badge-manager.ts` - Badge updates
7. ⏳ `src/popup/index.ts` - Popup UI
8. ⏳ `src/options/options.ts` - Options page

### Test Files (~50 references):
- `src/__tests__/mode-switcher.test.ts` - Most references
- `src/__tests__/badge-manager.test.ts`
- `src/__tests__/badge-integration.test.ts`
- Plus all integration tests

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| **Break existing users** | Medium | High | Migration function, keep operatingMode working |
| **Test failures** | High | Medium | Update all 50+ test references carefully |
| **Regression bugs** | Medium | High | Comprehensive testing before release |
| **User confusion** | Low | Low | Internal change, users don't see field names |

---

## Testing Strategy

```bash
# 1. Unit tests
npm test

# 2. Manual testing scenarios
- Fresh install → Enable Global mode → Verify switching works
- Update from old version → Verify migration works
- Legacy windowMode users → Verify fallback works
- Switch between Global/Window mode → Verify no issues

# 3. Backward compat testing
- Install v1.1 (with operatingMode)
- Update to v1.2 (with switchingMode)
- Verify mode preserved and switching still works
```

---

## Current Status (2026-01-03)

### ✅ Completed
- Created `SwitchingMode` type in types.ts
- Added `DEFAULT_SWITCHING_MODE` constant
- Created `getSwitchingMode()` helper function
- Added migration function `migrateToSwitchingMode()`
- Documented the confusion

### ⏳ In Progress
- Fix "Enable All Windows" initialization bug (higher priority)
- Add explicit `operatingMode: 'global'` on first enable

### 📋 TODO (Future PR)
- Complete full refactoring (7 source files)
- Update all 50+ test references
- Add deprecation warnings
- Create migration guide for developers

---

## Developer Notes

**If you need to add new code:**
1. **READ** mode: Use `getSwitchingMode(data)` helper
2. **WRITE** mode: Set both for now:
   ```typescript
   await chrome.storage.local.set({
     operatingMode: mode, // Current field (still working)
     switchingMode: mode, // Future field (prep for migration)
   });
   ```

**When debugging mode issues:**
- Check BOTH `operatingMode` AND `windowMode` in storage
- Use browser DevTools → Application → Storage → Extension Storage
- Look for mismatches between the two fields

---

## Related Files

- `.claude/docs/implementation/PRD.md` - Original requirements
- `.claude/docs/implementation/REFACTORING.md` - Refactoring documentation
- `src/core/types.ts` - Type definitions
- `src/core/constants.ts` - Default values
- `src/core/storage.ts` - Storage helpers

---

**Last Updated**: 2026-01-03
**Author**: Claude Code
**Status**: Living Document - Update as refactoring progresses
