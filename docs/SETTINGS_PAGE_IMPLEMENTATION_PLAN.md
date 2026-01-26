# Settings Page React Implementation Plan

## Confirmed Decisions

| Decision | Choice | Notes |
|----------|--------|-------|
| Navigation Pattern | **Sidebar** | Groups: General, Premium, System |
| Save Behavior | **Hybrid** | Auto-save for simple controls, explicit for complex forms |
| Search | **Future** | Architecture should support it, not in v1 |
| Popup Migration | **No** | Keep vanilla for performance |

---

## 1. Save Behavior Specification

### 1.1 Auto-Save Controls (Immediate)

These settings save instantly on change with subtle feedback:

| Setting | Control Type | Feedback |
|---------|--------------|----------|
| Enable on startup | Toggle | Toast: "Setting saved" |
| Operating mode | Radio cards | Toast: "Switched to {mode} mode" |
| Pause on activity | Toggle | Toast: "Setting saved" |
| Pause duration | Slider | Debounced save (500ms), toast |
| Skip pinned tabs | Toggle | Toast: "Setting saved" |
| Refresh enabled | Toggle | Toast: "Setting saved" |
| Refresh strategy | Dropdown | Toast: "Strategy updated" |

### 1.2 Explicit Save Controls (Require Button)

These require explicit "Save" or "Apply" action:

| Setting | Control Type | Reason |
|---------|--------------|--------|
| Default delay time | Number input | Critical setting, prevent accidents |
| Refresh rules | Rule list + editor | Complex CRUD operations |
| Skip rules | Rule list + editor | Complex CRUD operations |
| Session save | Modal form | Multi-field form |
| Import configuration | File upload + wizard | Destructive operation |

### 1.3 Save Feedback UX

```
┌─────────────────────────────────────────────────────────────┐
│                                              ┌───────────┐  │
│  Content Area                                │ ✓ Saved   │  │
│                                              └───────────┘  │
│                                              (toast, 2s)    │
└─────────────────────────────────────────────────────────────┘

For explicit save sections:
┌─────────────────────────────────────────────────────────────┐
│  Default Delay Time                                         │
│  ┌─────────────────────────┐                                │
│  │ 60                      │ seconds    [Save Changes]      │
│  └─────────────────────────┘            (enabled when dirty)│
│  ⚠️ Unsaved changes                                         │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Component Architecture

### 2.1 Directory Structure

```
src/settings/
├── index.html                 # Entry HTML for settings page
├── main.tsx                   # React entry point
├── App.tsx                    # Root component with providers
├── routes.tsx                 # Route definitions
│
├── components/
│   ├── layout/
│   │   ├── SettingsLayout.tsx    # Main layout wrapper
│   │   ├── Sidebar.tsx           # Navigation sidebar
│   │   ├── SidebarGroup.tsx      # Section group (General, Premium, etc.)
│   │   ├── SidebarItem.tsx       # Navigation item
│   │   ├── ContentArea.tsx       # Main content container
│   │   └── Header.tsx            # Page header with status
│   │
│   ├── common/
│   │   ├── Button.tsx
│   │   ├── Toggle.tsx            # Switch component
│   │   ├── Input.tsx             # Text/number input
│   │   ├── Select.tsx            # Dropdown
│   │   ├── Slider.tsx            # Range slider
│   │   ├── Card.tsx              # Section card wrapper
│   │   ├── Modal.tsx             # Dialog component
│   │   ├── Toast.tsx             # Notification toast
│   │   ├── Badge.tsx             # Status badges
│   │   ├── EmptyState.tsx        # Empty list placeholder
│   │   └── Skeleton.tsx          # Loading skeletons
│   │
│   ├── settings/
│   │   ├── SettingSection.tsx    # Card with title, description
│   │   ├── SettingRow.tsx        # Label + control layout
│   │   ├── SettingToggle.tsx     # Toggle with auto-save
│   │   ├── SettingInput.tsx      # Input with validation
│   │   ├── SettingSelect.tsx     # Select with auto-save
│   │   └── SaveBar.tsx           # Sticky save button bar
│   │
│   ├── premium/
│   │   ├── PremiumGate.tsx       # Wrapper for premium features
│   │   ├── PremiumBadge.tsx      # Active/locked indicator
│   │   ├── UpgradePrompt.tsx     # Activation CTA card
│   │   └── LicenseActivation.tsx # License key form
│   │
│   └── rules/
│       ├── RuleList.tsx          # CRUD list for rules
│       ├── RuleItem.tsx          # Single rule row
│       ├── RuleEditor.tsx        # Add/edit rule modal
│       └── RuleTest.tsx          # Test pattern against URL
│
├── sections/                  # Page sections (lazy loaded)
│   ├── general/
│   │   ├── BasicSettings.tsx
│   │   ├── ModeSettings.tsx
│   │   ├── ActivitySettings.tsx
│   │   └── ShortcutSettings.tsx
│   │
│   ├── premium/
│   │   ├── SessionManagement.tsx
│   │   ├── RefreshSettings.tsx
│   │   ├── SkipRules.tsx
│   │   └── BackupSettings.tsx
│   │
│   └── system/
│       ├── Diagnostics.tsx
│       └── About.tsx
│
├── hooks/
│   ├── useStorage.ts          # Chrome storage sync hook
│   ├── useAutoSave.ts         # Auto-save with debounce
│   ├── useExplicitSave.ts     # Track dirty state, save handler
│   ├── usePremiumAccess.ts    # Premium status hook
│   ├── useToast.ts            # Toast notifications
│   └── useSettings.ts         # Combined settings context
│
├── context/
│   ├── SettingsContext.tsx    # Global settings state
│   ├── ToastContext.tsx       # Toast notification state
│   └── PremiumContext.tsx     # Premium status
│
├── types/
│   └── index.ts               # TypeScript interfaces
│
├── utils/
│   ├── storage.ts             # Storage helpers
│   ├── validation.ts          # Input validation
│   └── constants.ts           # UI constants
│
├── styles/
│   ├── globals.css            # Global styles
│   ├── variables.css          # CSS custom properties
│   └── components/            # Component-specific styles
│
└── __tests__/
    ├── components/
    ├── hooks/
    └── sections/
```

### 2.2 Key Component Specifications

#### SettingsLayout.tsx
```tsx
interface SettingsLayoutProps {
  children: React.ReactNode;
}

export function SettingsLayout({ children }: SettingsLayoutProps) {
  return (
    <div className="settings-layout">
      <Sidebar />
      <ContentArea>{children}</ContentArea>
      <ToastContainer />
    </div>
  );
}
```

#### Sidebar.tsx
```tsx
const navigation = [
  {
    group: 'General',
    items: [
      { id: 'basic', label: 'Basic Settings', icon: '⚙️', path: '/basic' },
      { id: 'mode', label: 'Operating Mode', icon: '🌐', path: '/mode' },
      { id: 'activity', label: 'Pause on Activity', icon: '⏸️', path: '/activity' },
      { id: 'shortcuts', label: 'Keyboard Shortcuts', icon: '⌨️', path: '/shortcuts' },
    ],
  },
  {
    group: 'Premium',
    badge: '✨',
    items: [
      { id: 'sessions', label: 'Session Management', icon: '💼', path: '/sessions', premium: true },
      { id: 'refresh', label: 'Smart Refresh', icon: '🔄', path: '/refresh', premium: true },
      { id: 'skip', label: 'Skip Rules', icon: '⏭️', path: '/skip', premium: true },
      { id: 'backup', label: 'Backup & Sync', icon: '💾', path: '/backup', premium: true },
    ],
  },
  {
    group: 'System',
    items: [
      { id: 'diagnostics', label: 'Diagnostics', icon: '🔧', path: '/diagnostics' },
      { id: 'about', label: 'About', icon: 'ℹ️', path: '/about' },
    ],
  },
];
```

#### useAutoSave.ts
```tsx
function useAutoSave<T>(
  key: string,
  value: T,
  options?: { debounceMs?: number; onSave?: () => void }
) {
  const { debounceMs = 300, onSave } = options ?? {};
  const { showToast } = useToast();
  const previousValue = useRef(value);

  useEffect(() => {
    if (previousValue.current === value) return;
    previousValue.current = value;

    const timer = setTimeout(async () => {
      await chrome.storage.local.set({ [key]: value });
      showToast('Setting saved', 'success');
      onSave?.();
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [key, value, debounceMs]);
}
```

#### useExplicitSave.ts
```tsx
function useExplicitSave<T>(key: string, initialValue: T) {
  const [value, setValue] = useState(initialValue);
  const [savedValue, setSavedValue] = useState(initialValue);
  const [isSaving, setIsSaving] = useState(false);
  const { showToast } = useToast();

  const isDirty = useMemo(() =>
    JSON.stringify(value) !== JSON.stringify(savedValue),
    [value, savedValue]
  );

  const save = useCallback(async () => {
    setIsSaving(true);
    try {
      await chrome.storage.local.set({ [key]: value });
      setSavedValue(value);
      showToast('Changes saved', 'success');
    } catch (error) {
      showToast('Failed to save', 'error');
    } finally {
      setIsSaving(false);
    }
  }, [key, value]);

  const reset = useCallback(() => {
    setValue(savedValue);
  }, [savedValue]);

  return { value, setValue, isDirty, isSaving, save, reset };
}
```

---

## 3. Implementation Phases

### Phase 1: Foundation (4-5 days)

**Goal:** Set up React infrastructure and layout components

**Tasks:**
```
□ Set up Vite + React + TypeScript
  ├── Install dependencies (react, react-dom, react-router-dom)
  ├── Configure vite.config.ts for Chrome extension
  ├── Set up TypeScript paths and aliases
  └── Configure build output to dist/settings/

□ Create entry point
  ├── src/settings/index.html
  ├── src/settings/main.tsx
  └── Update manifest.json with new options page

□ Build layout components
  ├── SettingsLayout.tsx
  ├── Sidebar.tsx (with responsive behavior)
  ├── SidebarGroup.tsx
  ├── SidebarItem.tsx
  └── ContentArea.tsx

□ Set up routing
  ├── Hash-based routing (extension compatible)
  ├── Route definitions for all sections
  └── 404/redirect handling

□ Create context providers
  ├── SettingsContext.tsx
  ├── ToastContext.tsx
  └── PremiumContext.tsx

□ Build common components
  ├── Button.tsx
  ├── Toggle.tsx
  ├── Input.tsx
  ├── Card.tsx
  ├── Toast.tsx
  └── Modal.tsx

□ Create core hooks
  ├── useStorage.ts
  ├── useAutoSave.ts
  ├── useExplicitSave.ts
  └── useToast.ts
```

**Deliverable:** Empty settings app with working navigation

---

### Phase 2: General Settings (5-6 days)

**Goal:** Migrate all General section functionality

**Tasks:**
```
□ Basic Settings section
  ├── Delay time input with validation
  ├── Enable on startup toggle
  ├── Explicit save for delay time
  └── Auto-save for startup toggle

□ Operating Mode section
  ├── Mode selection cards (Global/Window)
  ├── Mode preview component
  ├── Auto-save on mode change
  └── Theme switching based on mode

□ Pause on Activity section
  ├── Enable toggle (auto-save)
  ├── Duration slider with debounced save
  ├── Activity triggers display
  └── Impact summary

□ Keyboard Shortcuts section
  ├── Current shortcut display
  ├── Customize button → chrome://extensions/shortcuts
  └── How it works info

□ Testing
  ├── Unit tests for all hooks
  ├── Component tests for each section
  └── Integration tests with Chrome storage
```

**Deliverable:** Fully functional General settings

---

### Phase 3: Premium Settings (7-8 days)

**Goal:** Migrate all Premium section functionality

**Tasks:**
```
□ Premium infrastructure
  ├── PremiumGate.tsx component
  ├── PremiumBadge.tsx
  ├── UpgradePrompt.tsx
  ├── LicenseActivation.tsx
  └── usePremiumAccess.ts hook

□ Session Management section
  ├── Session list with cards
  ├── Save session modal
  ├── Restore session functionality
  ├── Auto-launch settings
  └── Delete confirmation

□ Smart Refresh section
  ├── Enable toggle (auto-save)
  ├── Strategy selector (auto-save)
  ├── Interval input (explicit save)
  ├── Preemptive offset (explicit save)
  └── Refresh rules list with editor

□ Skip Rules section
  ├── Skip pinned toggle (auto-save)
  ├── Skip rules list with editor
  ├── Rule statistics display
  └── Pattern testing tool

□ Backup & Sync section
  ├── Export options checkboxes
  ├── Export/copy buttons
  ├── Import wizard (file/text)
  ├── Backup list management
  └── Restore from backup

□ Rule Editor component (shared)
  ├── Rule type selector
  ├── Pattern input with validation
  ├── Action selector
  ├── Enable toggle
  ├── Preview/test functionality
  └── Save/cancel buttons

□ Testing
  ├── Premium gate behavior tests
  ├── CRUD operations for rules/sessions
  └── Import/export functionality
```

**Deliverable:** Fully functional Premium settings

---

### Phase 4: System & Polish (3-4 days)

**Goal:** Complete remaining sections and polish

**Tasks:**
```
□ Diagnostics section
  ├── System status display
  ├── Log viewer (from existing diagnostics.ts logic)
  ├── Export logs button
  ├── Clear logs button
  └── Extension state info

□ About section
  ├── Version info
  ├── Build type indicator
  ├── GitHub link
  ├── Support/feedback link
  └── Credits

□ Responsive design
  ├── Test on various widths
  ├── Implement collapsible sidebar (tablet)
  ├── Implement bottom tabs (mobile)
  └── Touch-friendly controls

□ Accessibility audit
  ├── Keyboard navigation
  ├── Screen reader testing
  ├── Focus management
  ├── ARIA labels
  └── Color contrast check

□ Performance optimization
  ├── Lazy loading for premium sections
  ├── Code splitting
  ├── Bundle size analysis
  └── Render performance check

□ Final testing
  ├── End-to-end tests
  ├── Cross-browser testing
  ├── Extension packaging test
  └── Regression testing
```

**Deliverable:** Complete, polished settings page

---

### Phase 5: Cleanup & Release (2 days)

**Goal:** Remove old code and release

**Tasks:**
```
□ Migration verification
  ├── Feature parity checklist
  ├── All settings sync correctly
  └── No data loss

□ Remove old files
  ├── src/options/options.html
  ├── src/options/options.ts
  ├── src/options/premium.html
  ├── src/options/premium.ts (if exists)
  └── Related CSS if not shared

□ Update manifest.json
  ├── Point options_page to new location
  └── Remove old file references

□ Documentation
  ├── Update README if needed
  ├── Document component library
  └── Update contribution guide

□ Release
  ├── Build production bundle
  ├── Test in packed extension
  └── Deploy
```

---

## 4. Build Configuration

### 4.1 Vite Configuration

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        settings: resolve(__dirname, 'src/settings/index.html'),
        // Keep other entry points if needed
      },
      output: {
        entryFileNames: 'settings/[name].js',
        chunkFileNames: 'settings/chunks/[name].[hash].js',
        assetFileNames: 'settings/assets/[name].[ext]',
      },
    },
    // Chrome extension compatibility
    target: 'chrome100',
    minify: 'terser',
    sourcemap: process.env.NODE_ENV === 'development',
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src/settings'),
      '@core': resolve(__dirname, 'src/core'),
      '@premium': resolve(__dirname, 'src/premium'),
    },
  },
});
```

### 4.2 Package.json Scripts

```json
{
  "scripts": {
    "dev:settings": "vite --config vite.settings.config.ts",
    "build:settings": "vite build --config vite.settings.config.ts",
    "build:all": "npm run build:ts && npm run build:settings && npm run build:assets",
    "test:settings": "jest --testPathPattern=settings"
  }
}
```

### 4.3 TypeScript Configuration

```json
// tsconfig.settings.json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/settings/*"],
      "@core/*": ["src/core/*"],
      "@premium/*": ["src/premium/*"]
    }
  },
  "include": ["src/settings/**/*"]
}
```

---

## 5. CSS Architecture

### 5.1 Design Tokens (variables.css)

```css
:root {
  /* Colors - Global Mode */
  --color-primary: #667eea;
  --color-primary-dark: #764ba2;
  --color-primary-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);

  /* Colors - Window Mode */
  --color-secondary: #20B2AA;
  --color-secondary-dark: #3CB371;
  --color-secondary-gradient: linear-gradient(135deg, #20B2AA 0%, #3CB371 100%);

  /* Neutrals */
  --color-bg: #f5f7fa;
  --color-surface: #ffffff;
  --color-border: #e2e8f0;
  --color-text: #2d3748;
  --color-text-muted: #718096;

  /* Semantic */
  --color-success: #4CAF50;
  --color-error: #f44336;
  --color-warning: #FF9800;
  --color-info: #2196F3;

  /* Spacing */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;

  /* Radii */
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;

  /* Shadows */
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.1);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.15);

  /* Sidebar */
  --sidebar-width: 220px;
  --sidebar-collapsed-width: 60px;

  /* Transitions */
  --transition-fast: 0.15s ease;
  --transition-normal: 0.3s ease;
}

/* Window Mode Theme Override */
body.window-mode {
  --color-primary: var(--color-secondary);
  --color-primary-dark: var(--color-secondary-dark);
  --color-primary-gradient: var(--color-secondary-gradient);
}
```

### 5.2 Component Styling Approach

Use **CSS Modules** for component isolation:

```tsx
// Toggle.module.css
.toggle {
  position: relative;
  width: 48px;
  height: 24px;
}

.toggle input:checked + .slider {
  background: var(--color-primary-gradient);
}

// Toggle.tsx
import styles from './Toggle.module.css';

export function Toggle({ checked, onChange }) {
  return (
    <label className={styles.toggle}>
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span className={styles.slider} />
    </label>
  );
}
```

---

## 6. Testing Strategy

### 6.1 Unit Tests

```typescript
// hooks/useAutoSave.test.ts
describe('useAutoSave', () => {
  it('should save after debounce period', async () => {
    const { result } = renderHook(() =>
      useAutoSave('testKey', 'testValue', { debounceMs: 100 })
    );

    await waitFor(() => {
      expect(chrome.storage.local.set).toHaveBeenCalledWith({ testKey: 'testValue' });
    });
  });

  it('should cancel pending save on value change', () => {
    // ...
  });
});
```

### 6.2 Component Tests

```typescript
// sections/BasicSettings.test.tsx
describe('BasicSettings', () => {
  it('should show validation error for invalid delay', async () => {
    render(<BasicSettings />);

    const input = screen.getByLabelText(/delay time/i);
    await userEvent.type(input, '1');

    expect(screen.getByText(/minimum.*5 seconds/i)).toBeInTheDocument();
  });

  it('should enable save button when value changes', async () => {
    render(<BasicSettings />);

    const input = screen.getByLabelText(/delay time/i);
    await userEvent.clear(input);
    await userEvent.type(input, '120');

    expect(screen.getByRole('button', { name: /save/i })).toBeEnabled();
  });
});
```

### 6.3 Integration Tests

```typescript
// integration/settings-sync.test.ts
describe('Settings Sync', () => {
  it('should reflect storage changes in UI', async () => {
    render(<App />);

    // Simulate external storage change
    act(() => {
      mockStorageChange({ delayTime: 120 });
    });

    await waitFor(() => {
      expect(screen.getByDisplayValue('120')).toBeInTheDocument();
    });
  });
});
```

---

## 7. Future Considerations (Search)

Architecture prepared for search feature:

```typescript
// types/search.ts
interface SearchableItem {
  id: string;
  section: string;
  label: string;
  description: string;
  keywords: string[];
  path: string;
}

// hooks/useSearch.ts (future implementation)
function useSearch(query: string): SearchableItem[] {
  const searchIndex = useSearchIndex(); // Build from navigation config

  return useMemo(() => {
    if (!query.trim()) return [];
    return searchIndex.filter(item =>
      item.label.toLowerCase().includes(query.toLowerCase()) ||
      item.keywords.some(k => k.includes(query.toLowerCase()))
    );
  }, [query, searchIndex]);
}
```

---

## 8. Estimated Timeline

| Phase | Duration | Cumulative |
|-------|----------|------------|
| Phase 1: Foundation | 4-5 days | Week 1 |
| Phase 2: General Settings | 5-6 days | Week 2 |
| Phase 3: Premium Settings | 7-8 days | Week 3-4 |
| Phase 4: System & Polish | 3-4 days | Week 4 |
| Phase 5: Cleanup & Release | 2 days | Week 4-5 |
| **Total** | **~21-25 days** | **~5 weeks** |

---

## 9. Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Chrome storage API differences | Use existing storage.ts wrapper, comprehensive tests |
| Extension routing issues | Hash-based routing, test in packed extension early |
| Premium feature gating bugs | Reuse existing premium-access.ts logic |
| Regression in settings sync | Keep old pages functional until full validation |
| Bundle size exceeds budget | Monitor with bundlesize, lazy load premium sections |

---

## 10. Success Criteria

- [ ] All existing settings functionality preserved
- [ ] Auto-save works for designated controls
- [ ] Explicit save works for complex forms
- [ ] Premium gating works correctly
- [ ] Responsive on all screen sizes
- [ ] Keyboard navigable
- [ ] Bundle size < 100KB gzipped (excluding React)
- [ ] All tests passing
- [ ] No console errors in production

---

*Document created: 2026-01-26*
*Status: Ready for implementation*
