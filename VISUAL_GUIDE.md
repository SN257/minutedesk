# Visual Guide: Responsive Features

## Desktop View (≥ 1024px)
```
┌────────────────────────────────────────────────────┐
│  ☰ Nexus  │  Dashboard / Current Page         │
├────────────────────────────────────────────────────┤
│                │                                    │
│  [Dashboard]   │                                    │
│  [Meetings]    │                                    │
│  [Boards]      │      Main Content Area            │
│  [Tasks]       │      (Full width with padding)    │
│  [Work Logs]   │                                    │
│  [Schedule]    │                                    │
│                │                                    │
│  [User Menu]   │                                    │
└────────────────────────────────────────────────────┘
    Sidebar         Main Content (ml-64)
    (w-64)
```

## Tablet View (768px - 1023px)
```
┌──────────────────────────────────────────────┐
│  ☰  │  Dashboard / Current      🔔 👤       │
├──────────────────────────────────────────────┤
│      │                                       │
│ [📊] │                                       │
│ [📅] │     Main Content Area                │
│ [📋] │     (2-3 column grids)               │
│ [✓]  │     (Medium padding)                 │
│ [📝] │                                       │
│      │                                       │
│ [👤] │                                       │
└──────────────────────────────────────────────┘
 Icons   Content
```

## Mobile View (< 768px)

### Menu Closed
```
┌──────────────────────────────┐
│ ☰  Dashboard    🔔 👤       │
├──────────────────────────────┤
│                              │
│                              │
│   Main Content               │
│   (Full width)               │
│   (Single column)            │
│   (Small padding)            │
│                              │
│                              │
└──────────────────────────────┘
```

### Menu Open
```
┌────────────┐┌────────────────┐
│ Nexus ││ [Dark Overlay] │
│     [X]    ││                │
│            ││                │
│ Dashboard  ││   Content      │
│ Meetings   ││   (Blurred)    │
│ Boards     ││                │
│ Tasks      ││                │
│ Work Logs  ││                │
│ Schedule   ││                │
│            ││                │
│ [User]     ││                │
└────────────┘└────────────────┘
Slide-in Menu  Main Content
(z-40)         (Backdrop blur)
```

### Notification Drawer Open (Mobile)
```
┌──────────────────────────────┐
│ [Dark Blur Overlay]          │
│                              │
│   ┌──────────────────────┐   │
│   │ 🔔 Notifications [X] │   │
│   │ ─────────────────── │   │
│   │                      │   │
│   │ 📅 Meeting           │   │
│   │   New meeting...     │   │
│   │                      │   │
│   │ ✓ Task               │   │
│   │   Task assigned...   │   │
│   │                      │   │
│   │ 👤 Assignment        │   │
│   │   You are now...     │   │
│   │                      │   │
│   └──────────────────────┘   │
│    Full-width drawer (z-50)  │
└──────────────────────────────┘
```

## Touch Targets (All Screens)

All interactive elements are minimum 44x44px:

```
┌──────────────────────────────┐
│ [      44px Button     ] ✓   │
│                              │
│ [Icon] 44x44px minimum       │
│                              │
│ [ Text Link with padding ]   │
└──────────────────────────────┘
```

## Responsive Behaviors

### Hamburger Menu Button
- **Visible**: < 1024px (mobile/tablet)
- **Hidden**: ≥ 1024px (desktop)
- **Action**: Opens slide-in sidebar
- **Class**: `block lg:hidden`

### Sidebar Toggle Button
- **Visible**: ≥ 1024px (desktop)
- **Hidden**: < 1024px (mobile/tablet)
- **Action**: Collapses/expands desktop sidebar
- **Class**: `hidden lg:block`

### Breadcrumbs
- **Desktop**: Full breadcrumb path
- **Tablet**: Simplified breadcrumb
- **Mobile**: Just current page name
- **Class**: `hidden md:block`

### New Meeting Button
- **Desktop**: "🔘 New Meeting"
- **Tablet**: "🔘 New Meeting"
- **Mobile**: "🔘" (icon only)
- **Class**: `<span className="hidden sm:inline">`

## Grid Layouts

### Dashboard Stats Cards
```
Mobile:    Tablet:        Desktop:
[Card 1]   [Card 1][Card 2]   [C1][C2][C3][C4]
[Card 2]   [Card 3][Card 4]
[Card 3]
[Card 4]

grid-cols-1 → sm:grid-cols-2 → lg:grid-cols-4
```

### Board View
```
Mobile:    Tablet:           Desktop:
[Board 1]  [Board 1][Board 2]  [Bd1][Bd2][Bd3][Bd4]
[Board 2]  [Board 3][Board 4]
[Board 3]

grid-cols-1 → sm:grid-cols-2 → lg:grid-cols-3 → xl:grid-cols-4
```

## Spacing Scale

```
Property      Mobile  Tablet  Desktop
────────────────────────────────────
Padding       p-3     p-4     p-6
Gap           gap-2   gap-3   gap-4
Text Size     text-sm text-base text-lg
Icon Size     w-5     w-6     w-6
Button Height h-10    h-12    h-14
```

## Animation Timings

```
Sidebar Slide:     300ms cubic-bezier(0.4, 0, 0.2, 1)
Notification:      300ms cubic-bezier(0.4, 0, 0.2, 1)
Overlay Fade:      300ms linear
Button Hover:      200ms ease
```

## Color Scheme

### Overlays
- Background: `bg-black/40` (40% opacity)
- Backdrop: `backdrop-blur-lg`

### Sidebar
- Desktop: `from-slate-800 to-slate-900`
- Mobile: Same gradient with slide animation

### Header
- Background: `bg-white/80`
- Backdrop: `backdrop-blur-xl`

## Keyboard Shortcuts

```
ESC     → Close mobile menu
ESC     → Close notification drawer
TAB     → Navigate through elements
ENTER   → Activate focused element
```

## State Management

```tsx
// Mobile menu state
const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

// When mobile menu opens
- Body scroll locked
- Overlay appears
- Sidebar slides in from left

// When mobile menu closes
- Body scroll restored
- Overlay fades out
- Sidebar slides out to left
```

## CSS Classes Quick Reference

### Visibility
```css
block lg:hidden    /* Show on mobile, hide on desktop */
hidden lg:block    /* Hide on mobile, show on desktop */
hidden sm:inline   /* Hide on mobile, inline on tablet+ */
```

### Layout
```css
lg:ml-64          /* Desktop: margin-left 64px (sidebar width) */
lg:ml-0           /* Desktop: no left margin */
translate-x-full  /* Hide off-screen right */
-translate-x-full /* Hide off-screen left */
```

### Responsive Grids
```css
grid-cols-1                  /* 1 column (mobile) */
sm:grid-cols-2              /* 2 columns (tablet) */
lg:grid-cols-4              /* 4 columns (desktop) */
```

### Touch Targets
```css
min-w-[44px] min-h-[44px]   /* Minimum touch size */
```

---

**Pro Tips:**
1. Always test on real devices, not just browser resize
2. Check both portrait and landscape orientations
3. Verify touch targets are easy to tap
4. Ensure text is readable without zooming
5. Test with slow network to see loading states
