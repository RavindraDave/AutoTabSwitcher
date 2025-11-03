# TypeScript Configuration

This project uses multiple TypeScript configurations to properly handle standard and hybrid implementation files while ensuring all code is type-checked.

## Configuration Files

### 1. `tsconfig.json` (Main Configuration)
**Purpose**: IDE type checking and code intelligence

**What it does**:
- Includes ALL TypeScript files (including hybrid files)
- Uses `noEmit: true` (no compilation, just type checking)
- Provides full code intelligence in VSCode/IDEs
- Does NOT exclude hybrid files (they're visible to IDE)

**Key settings**:
```json
{
  "compilerOptions": {
    "noEmit": true,  // No compilation, just checking
    "strict": true,  // Strict type checking
    // ... other compiler options
  },
  "include": ["src/**/*.ts"],
  "exclude": [
    "node_modules",
    "dist",
    "scripts",
    "src/**/*.test.ts",
    "src/**/__tests__/**"
    // Note: NO exclusion of hybrid files
  ]
}
```

### 2. `tsconfig.build.json` (Build Configuration)
**Purpose**: Compile standard (non-hybrid) files for distribution

**What it does**:
- Extends `tsconfig.json`
- Excludes hybrid files from compilation
- Compiles only standard implementation files
- Used by `npm run build`

**Key settings**:
```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "noEmit": false  // Enable compilation
  },
  "exclude": [
    // ... base exclusions
    "src/**/*-hybrid.ts"  // Exclude hybrid files from build
  ]
}
```

### 3. `tsconfig.hybrid.json` (Hybrid Type Check Configuration)
**Purpose**: Type-check hybrid files in isolation

**What it does**:
- Extends `tsconfig.json`
- Includes ONLY hybrid files
- Excludes standard files to avoid duplicate declarations
- Used by `npm run typecheck:hybrid`

**Key settings**:
```json
{
  "extends": "./tsconfig.json",
  "include": ["src/**/*-hybrid.ts"],
  "exclude": [
    // ... base exclusions
    "src/background.ts",      // Exclude standard files
    "src/popup/popup.ts"
  ]
}
```

## NPM Scripts

### Type Checking

```bash
# Check ALL files (standard + hybrid separately)
npm run typecheck

# Check standard files only
npm run typecheck:standard

# Check hybrid files only
npm run typecheck:hybrid
```

**How it works**:
- `typecheck` runs both `typecheck:standard` AND `typecheck:hybrid`
- Standard and hybrid are checked separately to avoid duplicate declaration errors
- Both must pass for the full typecheck to succeed

### Building

```bash
# Build the project (compiles standard files only)
npm run build

# Build for production (uses hybrid files)
npm run build:prod
```

**How it works**:
- `build` uses `tsconfig.build.json` to compile only standard files
- `build:prod` copies hybrid files over standard, then builds

### Development

```bash
# Watch mode for development
npm run watch

# Build and watch
npm run dev
```

## Why This Setup?

### Problem
We have two sets of implementation files:
- **Standard**: `background.ts`, `popup/popup.ts` (60s minimum delay)
- **Hybrid**: `background-hybrid.ts`, `popup/popup-hybrid.ts` (5s minimum delay)

These files have overlapping function names and constants because they're alternate implementations of the same functionality.

### Solution
1. **Main `tsconfig.json`**: Includes all files for IDE
   - ✅ IDEs see all files
   - ✅ Go-to-definition works across all files
   - ✅ Full code intelligence

2. **Separate type checking**: Check standard and hybrid separately
   - ✅ Avoids duplicate declaration errors
   - ✅ Ensures both implementations are type-safe
   - ✅ CI can verify all code

3. **Build config**: Compile only what's needed
   - ✅ Standard build gets standard files
   - ✅ Production build gets hybrid files
   - ✅ No duplicate code in output

## File Organization

```
src/
├── background.ts              # Standard implementation
├── background-hybrid.ts       # Hybrid implementation (alternate)
├── popup/
│   ├── popup.ts              # Standard implementation
│   └── popup-hybrid.ts       # Hybrid implementation (alternate)
└── utils/
    └── environment.ts        # Shared utilities (used by both)
```

**Key Points**:
- Standard and hybrid files are **mutually exclusive** at runtime
- Only ONE set is included in any build
- Both are type-checked to catch errors
- Shared code lives in `utils/` to avoid duplication

## Shared Utilities

To avoid code duplication between standard and hybrid files, common functionality is extracted to shared modules:

### `src/utils/environment.ts`
```typescript
export function isPacked(): boolean {
  return !chrome.runtime.getManifest().update_url;
}
```

**Used by**:
- `background-hybrid.ts` - Determine minimum delay
- `popup-hybrid.ts` - Adjust UI constraints

**Why shared**:
- Prevents duplicate `isPacked()` declarations
- Single source of truth for environment detection
- Both implementations can be type-checked together

## IDE Setup

### VSCode
VSCode automatically uses `tsconfig.json` for type checking. No additional configuration needed.

**Verify it's working**:
1. Open any `.ts` file
2. Hover over a variable/function
3. You should see type information
4. Errors should appear in Problems panel

### Other IDEs
Most TypeScript-aware IDEs (WebStorm, Sublime, etc.) will automatically use `tsconfig.json`.

## CI/CD Integration

### GitHub Actions Example

```yaml
- name: Type check
  run: npm run typecheck

- name: Build
  run: npm run build

- name: Test
  run: npm test
```

**What gets checked**:
- ✅ All standard files (`typecheck:standard`)
- ✅ All hybrid files (`typecheck:hybrid`)
- ✅ Build compiles successfully
- ✅ All tests pass

## Troubleshooting

### Issue: IDE shows errors in hybrid files
**Cause**: IDE is checking all files together, sees duplicates
**Solution**: This is expected. Run `npm run typecheck:hybrid` to verify they're actually OK

### Issue: Build fails with "Cannot find module './utils/environment'"
**Cause**: Utils directory not compiled
**Solution**: Ensure `tsconfig.build.json` includes the utils directory

### Issue: Duplicate declaration errors
**Cause**: Trying to check standard + hybrid together
**Solution**: Use `npm run typecheck` (checks them separately) instead of `tsc` directly

## Best Practices

1. **Always run `npm run typecheck`** before committing
   - Ensures both implementations are type-safe

2. **Use the correct config for each task**:
   - Type checking: Use npm scripts (`npm run typecheck`)
   - Building: Use npm scripts (`npm run build`)
   - Don't run `tsc` directly

3. **Keep shared code in `utils/`**:
   - Prevents duplication
   - Avoids type conflicts
   - Single source of truth

4. **Never manually edit `tsconfig.build.json`** without updating `tsconfig.json`
   - Build config extends main config
   - Changes to compiler options should go in main config

## Summary

| Config | Purpose | Includes | Excludes | noEmit |
|--------|---------|----------|----------|--------|
| `tsconfig.json` | IDE + type checking | All files | Tests | true |
| `tsconfig.build.json` | Build standard | Standard files | Hybrid, tests | false |
| `tsconfig.hybrid.json` | Type check hybrid | Hybrid files | Standard, tests | true |

**Key Takeaway**: The main `tsconfig.json` includes ALL files for IDE support, but type checking and building use specialized configs to handle the standard/hybrid split correctly.
