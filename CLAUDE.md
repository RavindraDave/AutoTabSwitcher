# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AutoTabSwitcher is a Chrome Extension (Manifest V3) that automatically cycles through browser tabs at configurable intervals. It has a free tier and a premium tier with additional features (session management, skip rules, auto-refresh, tab groups, scheduling, rotation patterns). All state is persisted in `chrome.storage.local` — the MV3 service worker has no persistent memory.

## Build Commands

```bash
npm run build              # Interactive build (prompts for free/premium/dev — NOT usable in CI)
npm run build:dev          # Dev build (premium enabled, no minification, no Vite settings build)
npm run build:prod:free    # Production free build (premium tree-shaken, minified, includes Vite settings)
npm run build:prod:premium # Production premium build (all features, minified, includes Vite settings)
npm run dev:watch          # Dev build + TypeScript watch mode
npm run dev:settings       # Vite dev server for React settings page (port 5173)
npm run clean              # Remove dist/
npm run typecheck          # Type-check via tsconfig.build.json (must pass with 0 errors)
```

### Testing

```bash
npm test                             # Core tests (jest, node env)
npm run test:settings                # React settings tests (jest, jsdom env)
npm run test:all                     # Both suites
npm run test:coverage                # Core tests with coverage
npx jest path/to/file.test.ts        # Single test file
npx jest --testNamePattern="pattern" # Single test by name
```

Two jest configs exist:
- `jest.config.js` — core tests in `src/__tests__/`, node environment, Chrome APIs mocked via `src/__tests__/setup.ts`
- `jest.settings.config.js` — React settings tests, jsdom environment, CSS modules mocked via `identity-obj-proxy`

### Packaging for Chrome Web Store

```bash
npm run build:prod:free  # or build:prod:premium
cd dist && zip -r ../auto-tab-switcher.zip . -x "*.map" "*.DS_Store"
```

Load `dist/` (not `src/`) as an unpacked extension in `chrome://extensions/`.

## Architecture

### Two Compilation Pipelines

1. **TypeScript compiler** (`tsc --project tsconfig.build.json`) — compiles `src/background.ts`, `src/core/`, `src/popup/`, `src/options/`, `src/utils/`, `src/onboarding/`, `src/premium/` into `dist/`.
   - Excludes `src/settings/` (Vite handles this)
   - Excludes `src/**/*-hybrid.ts` — `timing-hybrid.ts` is loaded at runtime but compiled with special handling

2. **Vite** (`vite build --config vite.settings.config.ts`) — bundles the React settings app from `src/settings/` into `dist/settings/`. Only runs in `build:prod:*` builds.

### Premium Feature Toggle (Build-Time)

`src/core/build-config.ts` is **auto-generated** by `scripts/generate-build-config.js` — never edit it manually. The `PREMIUM_FEATURES_AVAILABLE` constant controls tree-shaking. Premium managers are dynamically imported in `background.ts` only when this flag is `true`. Always check `PREMIUM_FEATURES_AVAILABLE` before accessing premium code paths, and use `requirePremiumLicense()` at the start of premium functions.

### Source Layout

```
src/
  background.ts              # MV3 service worker entry point — event listeners, routing
  core/                      # Shared business logic (NO DOM dependencies)
    types.ts                 # All interfaces (StorageData is the central state shape)
    constants.ts             # Config constants and validation limits
    storage.ts               # chrome.storage helpers + migration logic
    badge-manager.ts         # Per-window badge (ON/Pause/OFF)
    tab-switcher.ts          # Tab switching (integrates SkipRuleEngine if premium)
    timing-hybrid.ts         # Hybrid timing: chrome.alarms (>=30s) / setInterval (<30s)
    window-timer-manager.ts  # Per-window alarm management (Window Mode)
    delay-calculator.ts      # Delay precedence: Group > Window > Global
    activity-tracker.ts      # Auto-pause on user activity
    manual-pause-tracker.ts  # Keyboard shortcut pause state (per-window or global)
    logger.ts                # 30-minute rolling diagnostic log buffer
    regex-validator.ts       # ReDoS-safe regex validation and caching
    premium-access.ts        # License check: canAccessPremium(), requirePremiumLicense()
    build-config.ts          # AUTO-GENERATED — do not edit
    context-menu-manager.ts  # Right-click context menu
    idle-auto-start.ts       # Start cycling when system goes idle
    statistics-tracker.ts    # Rotation metrics tracking
    switch-notifier.ts       # Visual notification before tab switch
  popup/                     # Popup UI (vanilla TypeScript, no framework)
    index.ts, settings.ts, shared/{validation,ui-helpers}.ts
  options/                   # Options/diagnostics pages (vanilla TypeScript)
  settings/                  # React settings app (bundled by Vite)
    main.tsx -> App.tsx      # Entry, uses react-router-dom
    sections/general/        # BasicSettings, ModeSettings, ActivitySettings, etc.
    sections/premium/        # SessionManagement, SkipRules, RefreshSettings, etc.
    sections/system/         # About, Diagnostics
    components/common/       # Button, Card, Toggle, Input, Modal, Toast, PremiumGate
    components/layout/       # SettingsLayout, Sidebar, ContentArea
    context/                 # PremiumContext, SettingsContext, ToastContext
    hooks/                   # useStorage, useAutoSave, useExplicitSave, useKeyboardNavigation
  premium/                   # Premium feature managers (tree-shaken in free builds)
    SessionManager.ts, RefreshManager.ts, SkipRuleEngine.ts,
    ConfigManager.ts, GroupManager.ts, RotationEngine.ts,
    ScheduleManager.ts, conflict-detector.ts
  utils/
    environment.ts           # isPacked() — detects CWS vs unpacked
    dom-safe.ts              # escapeHtml() and XSS-safe DOM helpers
  onboarding/                # First-run onboarding tour
```

### Operating Modes

- **Global Mode** (`switchingMode: 'global'`): Single timer via `toggleHybridTimer()` controls all windows.
- **Window Mode** (`switchingMode: 'window'`): `WindowTimerManager` creates per-window alarms (`window-timer-{id}`). Each window has independent state in `windowStates`.

The `switchingMode` field supersedes the legacy `operatingMode` and `windowMode` fields. Always use `getSwitchingMode(data)` from `storage.ts` for backward-compatible reads.

### Key Patterns

**Storage access:**
```typescript
import { getSetting, saveSetting, getSettings } from '../core/storage.js';
const value = await getSetting('key', defaultValue);
```

**Logging:**
```typescript
import { logger } from '../core/logger.js';
logger.info('ComponentName', 'Action', { details });
logger.error('ComponentName', 'Failed', {
  error: error instanceof Error ? error.message : String(error),
  errorType: error instanceof Error ? error.constructor.name : typeof error
});
```

**Import convention:** Use `.js` extension in imports even for `.ts` source files (ES module requirement for MV3 service worker).

## TypeScript Configuration

- `tsconfig.json` — IDE config (`noEmit: true`, includes all files including settings TSX)
- `tsconfig.build.json` — Compilation config (extends tsconfig.json, `noEmit: false`, excludes `src/settings/` and `*-hybrid.ts`)

`npm run typecheck` uses `tsconfig.build.json`. Both configs enable full strict mode including `noUncheckedIndexedAccess` and `noPropertyAccessFromIndexSignature`.

## Security Standards (Enforced by Pre-Commit Hooks)

### XSS Prevention
Never use inline event handlers (`onclick=`) or raw `innerHTML` with user data. Use `escapeHtml()` from `dom-safe.ts`, `textContent`, or data attributes with `addEventListener`. The CSP in manifest.json forbids inline scripts and `eval()`.

### ReDoS Protection
Never call `new RegExp(userInput)` directly. Always use `validateRegexPattern()` then `safeCompileRegex()` from `regex-validator.ts`. Max pattern length: 500 chars.

### Race Conditions
Before operating on tabs/windows, verify they still exist via `chrome.windows.get()` / `chrome.tabs.get()`. Wrap all async Chrome API calls in try/catch. Use `retryOperation()` for transient failures. Continue processing remaining items on partial failure.

### Input Validation
Validate against constants in `constants.ts`: `MAX_SESSION_NAME_LENGTH` (100), `MAX_SESSION_DESCRIPTION_LENGTH` (500), `MAX_RULE_PATTERN_LENGTH` (500), `MIN_REFRESH_INTERVAL` (5000ms), `MAX_REFRESH_INTERVAL` (3600000ms).

### Error Handling
Never swallow errors silently. Never assume error is an `Error` object — always use `error instanceof Error ? error.message : String(error)`. Include contextual data (IDs, state) in log calls.

### Chrome Extension CSP
No inline scripts, no `eval()` or `new Function()`, no inline event handlers. All scripts must be external files. The manifest enforces: `script-src 'self'; style-src 'self' 'unsafe-inline'`.

## Known Issues & Gotchas

- **`npm run lint` does not exist** — referenced in CI (`--if-present` avoids failure) and old docs, but no ESLint config or lint script is defined in package.json.
- **CI `npm run build` hangs** — the CI workflow calls the interactive build script which prompts for input. Non-interactive CI builds should use `build:prod:free` or `build:prod:premium` directly.
- **Delay precedence**: Group custom delay > Window custom delay > Global delay. See `delay-calculator.ts`.
- **Settings page duality**: Legacy vanilla-TS pages in `src/options/` and new React app in `src/settings/`. The React app is primary for new features; the manifest `options_ui` already points to `settings/index.html`.
- **Premium license validation is a stub** — currently accepts any non-empty string. Server-side verification is not implemented and blocks premium production release.

## Files Requiring Explicit Permission to Modify

- `src/manifest.json`
- `package.json`
- `tsconfig.json` / `tsconfig.build.json`
- `.github/workflows/*`
- `src/core/build-config.ts` (auto-generated)

## Git Conventions

Branches: `claude/<type>-<name>-<sessionId>` (e.g., `claude/fix-badge-flicker-abc123`)

Commit message format: `<type>: <subject>` — types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `security`, `perf`

Pre-commit hooks run: trailing whitespace fix, JSON/YAML validation, inline handler check, innerHTML check, unsafe regex check, TypeScript typecheck. Tests run on push (not commit).
