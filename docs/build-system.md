# Build System Documentation

## Premium Feature Protection

This document explains how the build system protects premium features from reverse engineering in free builds.

## Overview

The build system uses **build-time code exclusion** to completely remove premium features from free builds. This is more secure than runtime-only checks because:

1. **Premium code doesn't exist in free builds** - Impossible to access through reverse engineering
2. **Smaller bundle size** - Free builds are smaller without premium code
3. **Multi-layer protection** - Build-time + runtime checks + future server validation

## Build Types

### 1. Development Build (Default)
```bash
npm run build
npm run dev
```
- Premium features: **ENABLED** (for testing)
- Minification: **DISABLED** (for debugging)
- Source maps: **ENABLED** (for debugging)

### 2. Production Free Build
```bash
npm run build:free
```
- Premium features: **DISABLED** (removed via dead code elimination)
- Minification: **ENABLED** (via Terser)
- Premium code: **COMPLETELY REMOVED** from output

### 3. Production Premium Build
```bash
npm run build:premium
```
- Premium features: **ENABLED** (included in build)
- Minification: **ENABLED** (via Terser)
- Premium code: **INCLUDED** in output

## How It Works

### Step 1: Build Configuration Generation

During build, `scripts/generate-build-config.js` generates `src/core/build-config.ts`:

```typescript
// Free build
export const PREMIUM_FEATURES_AVAILABLE = false;

// Premium build
export const PREMIUM_FEATURES_AVAILABLE = true;
```

### Step 2: TypeScript Compilation

TypeScript compiles the code with the generated constant. Code still contains all branches.

### Step 3: Dead Code Elimination

Terser minifier analyzes the code and removes unreachable branches:

```typescript
// Source code
if (PREMIUM_FEATURES_AVAILABLE) {
  // Premium feature code
  showSessionManager();
} else {
  // Free version
  showUpgradePrompt();
}

// Free build output (after Terser)
showUpgradePrompt();

// Premium build output (after Terser)
showSessionManager();
```

The unreachable branch is **completely removed** from the output.

## Usage in Code

### 1. Build-Time Check (Recommended)

Use in modules that should be excluded entirely:

```typescript
import { PREMIUM_FEATURES_AVAILABLE } from './constants.js';

// This entire module can be excluded
if (!PREMIUM_FEATURES_AVAILABLE) {
  throw new Error('Premium features not available');
}

// Premium feature implementation
export class SessionManager {
  // ... premium code
}
```

### 2. Runtime License Check

Use in UI code that needs runtime validation:

```typescript
import { canAccessPremiumFeature, PremiumFeature } from './premium-access.js';

async function showSessionUI() {
  // Build-time + runtime check
  if (await canAccessPremiumFeature(PremiumFeature.SESSION_MANAGEMENT)) {
    // Show premium UI
  } else {
    // Show upgrade prompt
  }
}
```

### 3. Guard Functions

Use at the start of premium functions:

```typescript
import { requirePremiumLicense } from './premium-access.js';

export async function saveSession(session: SavedSession) {
  // Throws error if not premium
  await requirePremiumLicense();

  // Premium implementation
  // ...
}
```

## File Structure

```
AutoTabSwitcher/
├── src/
│   └── core/
│       ├── build-config.ts        # Auto-generated (default: dev)
│       ├── constants.ts            # Imports PREMIUM_FEATURES_AVAILABLE
│       └── premium-access.ts       # Access control helpers
├── scripts/
│   ├── generate-build-config.js   # Generates build config
│   └── minify.js                  # Terser minification
├── .env.development               # Dev environment
├── .env.production                # Free build environment
└── .env.production.premium        # Premium build environment
```

## Environment Variables

### BUILD_PREMIUM
- `true` - Include premium features
- `false` - Exclude premium features

### BUILD_TYPE
- `development` - Development build
- `production-free` - Free production build
- `production-premium` - Premium production build

## Build Process Flow

```
1. npm run build:free
   ↓
2. generate-build-config.js
   - Reads BUILD_PREMIUM=false
   - Generates build-config.ts with PREMIUM_FEATURES_AVAILABLE=false
   ↓
3. TypeScript compilation
   - Compiles all code (both branches)
   - Output to dist/
   ↓
4. Terser minification
   - Analyzes constant values
   - Removes unreachable code (dead code elimination)
   - Premium code branches removed
   ↓
5. Output: Free build without premium code
```

## Verification

To verify premium code is excluded from free builds:

```bash
# Build free version
npm run build:free

# Search for premium keywords in output
grep -r "SessionManager" dist/
grep -r "saveSession" dist/
grep -r "premium" dist/

# Should find minimal or no matches
```

Compare file sizes:

```bash
# Build both versions
npm run build:free
mv dist dist-free

npm run build:premium
mv dist dist-premium

# Compare sizes
du -sh dist-free/
du -sh dist-premium/

# Premium build should be larger
```

## Security Guarantees

### ✅ What This Protects Against

1. **Static analysis** - Premium code not in free builds
2. **Runtime patching** - No code to patch
3. **License key guessing** - Code doesn't exist to unlock
4. **Reverse engineering** - Nothing to reverse engineer

### ⚠️ What This Doesn't Protect Against

1. **Premium build leaks** - If premium build is leaked, it contains premium code
2. **License server bypass** - Need server-side validation (Phase 2)
3. **Local storage manipulation** - Need runtime checks
4. **Man-in-the-middle** - Need secure communication (Phase 2)

## Future Enhancements (Phase 2)

1. **Server-side license validation**
   - Verify license keys with licensing server
   - Prevent unauthorized activation
   - Track license usage

2. **Code obfuscation**
   - Additional protection for premium builds
   - Make reverse engineering harder

3. **Runtime integrity checks**
   - Detect tampering with extension files
   - Verify build signatures

4. **Feature flags**
   - Server-controlled feature rollout
   - A/B testing for premium features
   - Emergency kill switch

## Troubleshooting

### Premium features not working in development

Check `src/core/build-config.ts`:
```typescript
export const PREMIUM_FEATURES_AVAILABLE = true; // Should be true
```

### Build fails with "BUILD_PREMIUM not set"

The build scripts set this automatically. If running manually:
```bash
BUILD_PREMIUM=false npm run build
```

### Premium code still in free build

1. Verify build config was generated:
   ```bash
   cat src/core/build-config.ts
   # Should show PREMIUM_FEATURES_AVAILABLE = false
   ```

2. Check minification ran:
   ```bash
   # Should show minification output
   npm run build:free
   ```

3. Verify code uses the constant:
   ```typescript
   import { PREMIUM_FEATURES_AVAILABLE } from './constants.js';

   if (PREMIUM_FEATURES_AVAILABLE) {
     // This branch will be removed in free builds
   }
   ```

## Best Practices

1. **Always use the constant** - Don't hardcode true/false
2. **Test both builds** - Verify features work in premium, don't work in free
3. **Keep constants pure** - Don't modify PREMIUM_FEATURES_AVAILABLE at runtime
4. **Document premium code** - Comment which features are premium
5. **Use guard functions** - Fail-fast with requirePremium()

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Build Extension

on: [push, pull_request]

jobs:
  build-free:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: npm run build:free
      - uses: actions/upload-artifact@v2
        with:
          name: extension-free
          path: dist/

  build-premium:
    runs-on: ubuntu-latest
    # Only on main branch
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: npm run build:premium
      - uses: actions/upload-artifact@v2
        with:
          name: extension-premium
          path: dist/
```

## Support

For questions about the build system:
1. Check this documentation
2. Review `scripts/generate-build-config.js`
3. Review `scripts/minify.js`
4. Open an issue on GitHub
