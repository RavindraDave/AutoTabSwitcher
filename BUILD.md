# Build Scripts

This document describes the streamlined build system for AutoTabSwitcher.

## Quick Start

### Development Build (Fast, No Minification)
```bash
npm run build:dev
```
- Enables premium features for testing
- No minification (faster builds)
- Output: `dist/` directory

### Development with Watch Mode
```bash
npm run dev:watch
```
- Builds once, then watches for TypeScript changes
- Auto-recompiles on file changes
- Perfect for active development

### Production Builds

#### Free Version (No Premium Features)
```bash
npm run build:prod:free
```
- Excludes all premium features
- Fully minified and optimized
- Ready for Chrome Web Store distribution

#### Premium Version (All Features)
```bash
npm run build:prod:premium
```
- Includes all premium features
- Fully minified and optimized
- For licensed users

### Interactive Build
```bash
npm run build
```
- Prompts you to choose build type
- User-friendly interface
- Guides you through the build process

## Settings UI Development

### Run Settings UI Dev Server
```bash
npm run dev:settings
```
- Hot-reload development server for settings page
- Runs on http://localhost:5173 by default

## Testing

```bash
npm test              # Run main tests
npm run test:watch    # Watch mode
npm run test:coverage # With coverage report
npm run test:all      # Run all tests including settings
```

## Other Commands

```bash
npm run clean         # Remove dist folder
npm run typecheck     # Type-check without building
```

## Build Output

All builds output to the `dist/` directory, which contains:
- Compiled JavaScript files
- HTML files (popup, settings, onboarding)
- CSS files
- Assets (icons, images)
- manifest.json

## Internal Scripts (Don't call directly)

The following are internal helper scripts prefixed with `_internal:`:
- `_internal:compile` - TypeScript compilation + asset copying
- `_internal:build-settings` - Build settings UI with Vite
- `_internal:minify` - Minify JavaScript files

These are called automatically by the main build scripts.
