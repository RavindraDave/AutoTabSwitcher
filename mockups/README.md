# Design Mockups - Auto Tab Switcher

This folder contains design mockups for the new two-tier user interface.

## How to View

1. **Quick Comparison**: Open `index.html` in your browser to see all designs
2. **Individual Designs**:
   - `design-combined.html` - ⭐ **RECOMMENDED** - Combines modern gradient with animated countdown
   - `design-a-modern.html` - Modern gradient design with colorful headers
   - `design-b-minimal.html` - Clean minimal design with toggle switch
   - `design-c-bold.html` - Bold status-focused design with countdown
3. **Settings Page**: Open `settings-page.html` to see the full configuration interface

## Two-Tier Interface Concept

### Tier 1: Compact Popup (Default on Badge Click)
- Quick status overview
- One-click enable/disable toggle
- Essential info: mode, interval, countdown
- Button to access full settings

**Size**: ~280-320px wide, compact height
**Purpose**: Quick control and status check

### Tier 2: Settings Page (Advanced Configuration)
- Full configuration interface
- All settings: interval, window mode, pause settings
- Better organized with sections
- Save/Reset functionality

**Size**: ~500px wide, scrollable
**Purpose**: Detailed configuration

## Design Comparison

| Feature | Combined ⭐ | Design A | Design B | Design C |
|---------|------------|----------|----------|----------|
| **Style** | Modern gradient + countdown | Modern gradient | Minimal clean | Bold status |
| **Visual Impact** | Very High | High | Low | Very High |
| **Colors** | Gradient headers | Gradient headers | Subtle accents | Full-width colors |
| **Toggle Type** | Button | Button | iOS Switch | Button |
| **Countdown** | Animated ring | Text | Text | Ring/Circle |
| **Animation** | Ring + pulse | Smooth transitions | Pulsing dot | Ring pulse |
| **Best For** | Best overall experience | Vibrant UIs | Simplicity lovers | Status-focused users |

## What's Next?

Once you choose a design:
1. I'll implement the compact popup with your chosen design
2. Create the settings page
3. Update the manifest to use both popup types
4. Add routing logic (popup → settings page)
5. Implement countdown timer functionality
6. Test and commit

## Your Feedback Needed

Please let me know:
- Which design do you prefer? (A, B, or C)
- Any modifications you'd like?
- Should the countdown be live/updating or static?
- Any specific features you want added/removed?
