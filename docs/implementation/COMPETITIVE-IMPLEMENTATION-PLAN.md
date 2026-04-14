# Competitive Implementation Plan

**Branch:** `claude/review-extension-competitors-umdEF`
**Created:** 2026-04-10
**Status:** In progress

This document captures the competitive analysis and phased implementation plan produced after reviewing AutoTabSwitcher against ~20 tab-rotation extensions on the Chrome Web Store. Future sessions on this branch should consult this file before making changes so work remains aligned with the strategy.

---

## Competitive Findings (Summary)

### Your unique strengths (keep/lean into)

1. **Hybrid timing below 30s** — real technical moat. Solves the #1 complaint across competitor reviews (Tab Turner, goRotate, Auto Tab Switcher are all stuck at ≥30s).
2. **Skip Rules with regex/domain/URL/title + ReDoS protection** — no competitor has rule-based exclusion.
3. **Tab Groups with per-group delays and rotation patterns** — unique.
4. **Schedule-based rotation** (time/day/date-range + actions) — unique.
5. **Session Management** (save/restore tab sets) — unique in the rotation niche.
6. **Resource-awareness** (pause on low battery / high CPU) — unique.
7. **Rotation statistics** (per-tab visits, cycles) — unique.
8. **Idle auto-start**, **conflict detection**, **4 rotation patterns** — unique.
9. **Import/Export with sanitization + auto-backup** — only Tabs Rotator has similar basic import/export.

### Critical gaps vs. competitors

| Missing Feature | Competitors | Impact |
|---|---|---|
| **Fullscreen/Kiosk Mode** | TabCycle, Tab Rotation, goRotate, Tab Revolver, Tabs Rotator | **P0** — #1 dashboard/signage use case; table-stakes |
| **Per-tab custom display time** | TabCycle, Tab Rotate, Tabs Rotator, Tab Rotate Dourado | **P0** — users want variable dwell per tab |
| **URL list rotation (pre-configured URLs)** | Tab Rotate (Sheedy), Tabs Rotator, Enterprise Tab Rotate | **P1** — opens kiosk admin use case |
| **Audio management** (mute inactive tabs) | Slideshow Tabs | **P1** — easy win |
| **Remote JSON config sync** | Tab Rotate, Tabs Rotator | **P2** — paid-tier differentiator |
| **Chrome Enterprise managed policy** | Enterprise Tab Rotate | **P2** — enterprise channel |
| **Page content monitoring (keyword triggers)** | Auto Refresh Plus | **P3** — premium differentiator |
| **Cross-browser (Firefox/Edge)** | Tab Turner | **P4** — market expansion |

### Monetization reality

Nearly ALL tab rotation extensions are **100% free**. No entrenched paid incumbent exists. Opportunity: position as "the professional tab rotator for teams running dashboards and kiosks" and monetize via team/enterprise features (remote config, managed policy, multi-monitor profiles).

### Differentiation thesis

Positioning: **"The professional tab rotator for dashboards, kiosks, and team operations centers"**

Taglines to own:
- "The only tab rotator with sub-30-second intervals that actually work"
- "Manage dashboards across a fleet of kiosks from one config"
- "Smart rotation: your dashboards, on your schedule, with rules"

---

## Phase 1 — Close Critical Gaps (Free tier)

### 1.1 Per-Tab Custom Display Time ✅ P0

**Why:** TabCycle's killer feature. Users want variable dwell times per tab.

**Design:**
- Store delays keyed by normalized URL (origin + pathname; ignore query/hash)
- Precedence: **Per-tab URL → Group → Window → Global**
- Context menu: "Set custom rotation time for this tab…"
- Settings page card: list/edit/delete per-tab delays

**Files to modify:**
- `src/core/types.ts` — add `tabDelays?: { [urlKey: string]: TabDelayEntry }` to `StorageData`
- `src/core/constants.ts` — add `MAX_TAB_DELAY_ENTRIES`
- `src/core/storage.ts` — getter/setter for tab delays
- `src/core/delay-calculator.ts` — add URL key lookup at top of precedence
- `src/core/tab-switcher.ts` — pass current tab URL to delay calculator
- `src/core/context-menu-manager.ts` — add "Set custom delay" menu item
- `src/core/url-normalizer.ts` — NEW: normalize URL to storage key
- `src/background.ts` — wire context menu handler to prompt-based delay setter
- `src/settings/sections/general/PerTabDelays.tsx` — NEW: list editor

**Storage shape:**
```typescript
interface TabDelayEntry {
  url: string;        // normalized URL
  delay: number;      // milliseconds
  label?: string;     // optional display name
  createdAt: number;
}
```

---

### 1.2 Smart Audio Management ✅ P1 (quick win)

**Why:** Slideshow Tabs owns this single feature. Easy to match.

**Design:**
- New setting: `audioManagement: 'off' | 'mute-inactive'`
- On tab switch: unmute target tab, mute all other tabs in the same window
- Respect existing user-muted tabs (record original mute state)
- Restore original mute state on disable

**Files to modify:**
- `src/core/types.ts` — add `audioManagement?: AudioManagementMode`
- `src/core/constants.ts` — add `DEFAULT_AUDIO_MANAGEMENT`
- `src/core/audio-manager.ts` — NEW: mute/unmute logic + state tracking
- `src/core/tab-switcher.ts` — call audio manager on switch
- `src/settings/sections/general/NotificationSettings.tsx` — add audio toggle
- `src/background.ts` — initialize/shutdown audio manager on enable/disable

---

### 1.3 Fullscreen/Kiosk Mode 🔥 P0

**Why:** #1 gap. Every top-rated competitor has it. Core dashboard/signage use case.

**Design:**
- "Kiosk Mode" toggle in popup + settings
- Uses `chrome.windows.update(windowId, { state: 'fullscreen' })`
- Optional injected content-script overlay showing: current tab name, countdown, pause btn, exit btn
- Overlay auto-hides on mouse-idle, reveals on movement
- ESC exits fullscreen and pauses rotation
- Gracefully skips overlay on restricted URLs (chrome://, web store)

**Files to modify:**
- `src/manifest.json` — add `"scripting"` permission (authorized)
- `src/core/types.ts` — add `kioskMode`, `kioskOverlayEnabled`, `kioskOverlayAutoHideMs`
- `src/core/constants.ts` — add kiosk defaults
- `src/core/kiosk-manager.ts` — NEW: enter/exit fullscreen, overlay lifecycle
- `src/core/kiosk-overlay.ts` — NEW: injected content script (CSP-safe DOM)
- `src/core/tab-switcher.ts` — notify overlay on each switch with tab name + countdown
- `src/background.ts` — wire kiosk toggle message handler; inject overlay per switch
- `src/popup/index.ts` + `src/popup/index.html` — add kiosk toggle button
- `src/settings/sections/general/KioskSettings.tsx` — NEW: kiosk settings card

**Security:** Content script must escape all user-controlled text via `escapeHtml()`. No inline event handlers. Overlay uses shadow DOM to avoid CSS collisions with host pages.

---

## Phase 2 — Premium Differentiators (future sessions)

### 2.1 URL List Rotation Mode (P1)
New operating mode `'urlList'` — user defines a list of URLs with per-URL display time, extension opens them in a window and rotates.

### 2.2 Remote JSON Config Sync (Premium, P2)
Fetch config from a URL every N minutes, validate schema, atomic swap. Unlocks kiosk fleet management. **Requires host permission** — use `optional_host_permissions` with runtime grant.

### 2.3 Multi-Monitor Profiles (Premium, P3)
Assign windows to monitors; each monitor has its own rotation profile.

### 2.4 Content-Triggered Rules (Premium, P3)
Extend skip rules with page-content matching (DOM text/selector). Actions: skip-rotation, pause, alert, jump-to-tab-X.

### 2.5 Chrome Enterprise Managed Policy (Premium, P2)
Declare managed storage schema; allow admin-pushed config that overrides user settings.

### 2.6 Analytics Dashboard (Premium, P3)
Build on existing `statistics-tracker.ts`. Charts for switches over time, top tabs, dwell time distribution. CSV export.

---

## Phase 3 — Strategic

- Cross-browser port (Firefox/Edge) — Manifest V3 makes this ~80% automatic.
- Templates marketplace — pre-configured rotations (Grafana wall, CI/CD, social, stock tracker) bundled as JSON files.
- Marketing landing page leaning into unique positioning.

---

## Progress Log

| Date | Item | Status | Notes |
|---|---|---|---|
| 2026-04-10 | Competitive analysis | ✅ Done | Research across 20+ competitors |
| 2026-04-10 | Plan document | ✅ Done | This file |
| 2026-04-10 | 1.1 Per-tab delays | ✅ Done | `tabDelays` storage + `delay-calculator` precedence + `PerTabDelays.tsx` settings UI + context menu entry. Tab-switcher reschedules hybrid/window timer after every switch when the URL has a custom delay; short-circuits when storage is empty. |
| 2026-04-14 | 1.2 Audio management | ✅ Done | `audio-manager.ts` mutes inactive tabs on switch and snapshots original state (`audioOriginalMuteStates`). Toggle in Notifications settings; background handles `audio-management-disabled` to restore; cleanup on `tabs.onRemoved`. |
| 2026-04-14 | 1.3 Kiosk mode | ✅ Done | `scripting` permission added. `kiosk-manager.ts` toggles fullscreen via `chrome.windows.update` and injects a shadow-DOM overlay via `chrome.scripting.executeScript` (func arg, textContent only). KioskSettings panel with master toggle, overlay toggle, auto-hide slider, "Enter Fullscreen Now" action. `kiosk-enter`/`kiosk-exit`/`kiosk-exit-all` messages wired in background. |

---

## Instructions for Future Sessions

1. **Read this file first** before making changes on this branch.
2. Update the Progress Log as you complete items.
3. Phase ordering is important — don't jump ahead without checking whether earlier items are blocked.
4. Manifest and permission changes are authorized for items marked **P0/P1** in this plan only. Other permission changes still require explicit user approval.
5. All new code must follow the security standards in `CLAUDE.md` (ReDoS-safe regex, `escapeHtml()` for user text, no inline handlers, contextual error logging).
6. Run `npm run typecheck` after each logical change.
